const $ = id => document.getElementById(id);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ask = m => chrome.runtime.sendMessage(m);
async function paint() {
  const s = await ask({ type: 'state' });
  $('pause').checked = !!s.paused;
  const today = (s.usage || {})[ymd(new Date())] || {};
  $('list').innerHTML = '';
  for (const d of s.domains) {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = d.label && d.label !== d.host ? d.label + ' (' + d.host + ')' : d.host;
    const m = document.createElement('span'); m.className = 'm'; m.textContent = Math.floor((today[d.host] || 0) / 60000) + ' min today';
    const x = document.createElement('button'); x.textContent = '×'; x.title = 'Stop counting this site'; x.setAttribute('aria-label', 'Remove ' + d.host);
    x.onclick = async () => { await ask({ type: 'remove', host: d.host }); paint(); };
    li.append(name, m, x); $('list').append(li);
  }
}
$('add').onclick = async () => { const r = await ask({ type: 'add', host: $('host').value.trim().replace(/^https?:\/\//, '').split('/')[0] }); $('err').textContent = (r && r.error) || ''; if (!r || !r.error) $('host').value = ''; paint(); };
$('pause').onchange = async () => { await ask({ type: 'pause', on: $('pause').checked }); paint(); };
$('clr').onclick = async () => { if (confirm('Delete all counted time stored in this extension?')) { await ask({ type: 'clear' }); paint(); } };
$('dl').onclick = async () => {
  const data = await ask({ type: 'export' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'abhyashify-browser-usage.json'; a.click();
};
paint();
