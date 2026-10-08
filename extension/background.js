/* Abhyashify study timer: counts active time on the sites you chose.
   Only the site name (for example youtube.com) and minutes per day are kept, never page addresses, titles or content.
   Everything stays in this browser's extension storage until Abhyashify asks for it on its own page. */
const KEEP_DAYS = 60;
const MAX_STEP = 3 * 60 * 1000;      // one flush never adds more than 3 minutes, so a sleeping laptop cannot inflate the total
const IDLE_SECONDS = 300;

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const cleanHost = h => String(h || '').toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '').slice(0, 80);

async function load() {
  const s = await chrome.storage.local.get({ domains: [], usage: {}, cur: null, paused: false });
  return s;
}
const save = o => chrome.storage.local.set(o);

function matchDomain(domains, url) {
  let h;
  try { const u = new URL(url); if (!/^https?:$/.test(u.protocol)) return null; h = cleanHost(u.hostname); } catch (e) { return null; }
  for (const d of domains) if (h === d.host || h.endsWith('.' + d.host)) return d.host;
  return null;
}

function add(usage, host, ms, now) {
  if (!host || ms <= 0) return;
  const day = ymd(new Date(now));
  usage[day] = usage[day] || {};
  usage[day][host] = (usage[day][host] || 0) + ms;
}

function prune(usage) {
  const keep = ymd(new Date(Date.now() - KEEP_DAYS * 86400000));
  for (const d of Object.keys(usage)) if (d < keep) delete usage[d];
}

/* Which site (if any) is the person using right now? */
async function wanted(domains) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) return null;
  const host = matchDomain(domains, tab.url);
  if (!host) return null;
  let focused = true;
  try { const w = await chrome.windows.get(tab.windowId); focused = !!w.focused; } catch (e) {}
  const state = await chrome.idle.queryState(IDLE_SECONDS);
  if (state === 'locked') return null;
  if (state === 'idle' && !tab.audible) return null;       // a lecture playing out loud still counts
  if (!focused && !tab.audible) return null;
  return host;
}

let busy = Promise.resolve();
function recompute() {
  busy = busy.then(async () => {
    const s = await load(), now = Date.now();
    const next = s.paused ? null : await wanted(s.domains);
    const cur = s.cur;
    if (cur) {
      add(s.usage, cur.host, Math.min(now - cur.since, MAX_STEP), now);
    }
    const out = { usage: s.usage };
    if (!next) out.cur = null;
    else out.cur = { host: next, since: now };
    prune(s.usage);
    await save(out);
  }).catch(e => console.warn('abhyashify', e));
  return busy;
}

chrome.tabs.onActivated.addListener(recompute);
chrome.tabs.onUpdated.addListener((id, ch) => { if (ch.url || ch.audible !== undefined || ch.status === 'complete') recompute(); });
chrome.windows.onFocusChanged.addListener(recompute);
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener(recompute);
chrome.alarms.create('tick', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'tick') recompute(); });
chrome.runtime.onStartup.addListener(async () => { await save({ cur: null }); recompute(); });
chrome.runtime.onInstalled.addListener(async () => {
  const s = await load();
  if (!s.domains.length) {
    await save({ domains: [
      { host: 'youtube.com', label: 'YouTube', from: 'default' },
      { host: 'nptel.ac.in', label: 'NPTEL', from: 'default' },
      { host: 'gateoverflow.in', label: 'GATE Overflow', from: 'default' }
    ] });
  }
  recompute();
});

/* The JSON that the Abhyashify page imports (same shape the Android companion writes). */
async function exportJson() {
  await recompute();
  const s = await load();
  const label = new Map(s.domains.map(d => [d.host, d.label || d.host]));
  const days = [];
  for (let i = 0; i < 14; i++) {
    const date = ymd(new Date(Date.now() - i * 86400000));
    const u = s.usage[date] || {};
    const apps = [];
    for (const [host, ms] of Object.entries(u)) {
      const minutes = Math.floor(ms / 60000);
      if (minutes >= 1) apps.push({ package: 'web:' + host, label: label.get(host) || host, minutes });
    }
    if (apps.length) days.push({ date, study_minutes: apps.reduce((a, x) => a + x.minutes, 0), apps });
  }
  return { source: 'abhyashify-usage', origin: 'browser', generated: new Date().toISOString(), days };
}

async function setFromApp(list) {
  const s = await load();
  const mine = s.domains.filter(d => d.from !== 'app');
  const seen = new Set(mine.map(d => d.host));
  const fromApp = [];
  for (const t of (Array.isArray(list) ? list : []).slice(0, 40)) {
    const host = cleanHost(t && t.host);
    if (!host || !host.includes('.') || seen.has(host)) continue;
    seen.add(host);
    fromApp.push({ host, label: String((t && t.label) || host).slice(0, 40), from: 'app' });
  }
  await save({ domains: mine.concat(fromApp) });
}

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  (async () => {
    if (m && m.type === 'export') reply(await exportJson());
    else if (m && m.type === 'tools') { await setFromApp(m.tools); recompute(); reply({ ok: true }); }
    else if (m && m.type === 'state') { await recompute(); const s = await load(); reply(s); }
    else if (m && m.type === 'add') {
      const host = cleanHost(m.host);
      const s = await load();
      if (!host.includes('.')) return reply({ error: 'That does not look like a site name.' });
      if (s.domains.length >= 60) return reply({ error: 'That is plenty of sites.' });
      if (!s.domains.some(d => d.host === host)) s.domains.push({ host, label: host, from: 'me' });
      await save({ domains: s.domains }); recompute(); reply({ ok: true });
    }
    else if (m && m.type === 'remove') {
      const s = await load();
      await save({ domains: s.domains.filter(d => d.host !== m.host) }); recompute(); reply({ ok: true });
    }
    else if (m && m.type === 'pause') { await save({ paused: !!m.on }); await recompute(); reply({ ok: true }); }
    else if (m && m.type === 'clear') { await save({ usage: {}, cur: null }); reply({ ok: true }); }
    else reply(null);
  })();
  return true;
});
