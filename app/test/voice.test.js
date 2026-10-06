// Tests for custom voices: cloned voice (online) with a stand-in ElevenLabs, saved phrases offline, fallbacks, removal.
const assert = require('assert');
const H = require('./asst-harness');
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };

function world(opts) {
  opts = opts || {};
  const calls = [], played = [], spoken = [];
  const st = { calls, played, spoken, tts: opts.tts || 200, add: opts.add || 200, online: true };
  return { st, before(w) {
    w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    w.speechSynthesis = { getVoices: () => [{ name: 'Device Voice', lang: 'en-US' }], addEventListener() {}, cancel() {}, speak(u) { spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 2); } };
    w.CV_PLAY = (buf, mime, rate) => { played.push({ bytes: buf.byteLength, mime, rate }); return new Promise(r => setTimeout(r, st.playMs || 3)); };
    Object.defineProperty(w.navigator, 'onLine', { get: () => st.online, configurable: true });
    w.fetch = async (url, init) => {
      init = init || {};
      calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body });
      if (/\/voices\/add$/.test(url)) return st.add === 200 ? { ok: true, status: 200, json: async () => ({ voice_id: 'vid-' + (calls.length) }) } : { ok: false, status: st.add, json: async () => ({}) };
      if (/\/text-to-speech\//.test(url)) return st.tts === 200 ? { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(1200).buffer } : { ok: false, status: st.tts };
      if (init.method === 'DELETE') return { ok: true, status: 200 };
      return { ok: false, status: 404 };
    };
  } };
}
const openCfg = async (A) => { A.click('#asstfab'); await H.sleep(40); A.click('[data-asa=cfg]'); await H.sleep(40); };
const give = (A, files) => { const el = A.d.getElementById('cv-files'); Object.defineProperty(el, 'files', { value: files, configurable: true }); };
const file = (A, name, size) => new A.w.File([new Uint8Array(size || 2000)], name, { type: 'audio/wav' });
const change = (A, sel, set) => { const el = A.d.querySelector(sel); set(el); el.dispatchEvent(new A.w.Event('change', { bubbles: true })); };

(async () => {
  const W = world(); const st = W.st;
  const A = await H.open({ before: W.before });
  A.click('[data-act=tpl]'); await H.sleep(100);
  await openCfg(A);
  ok('settings show a custom voice section for Anu', /Custom voice for Anu/.test(A.d.getElementById('as-cfg').textContent) && !!A.d.getElementById('cv-files'));
  ok('the permission box starts unticked', !A.d.querySelector('[data-cv=consent]').checked);

  /* creating without permission or key is refused */
  give(A, [file(A, 'a.wav')]);
  A.click('[data-cv-act=create]'); await H.sleep(30);
  ok('no request without permission', st.calls.length === 0 && /agreed|permission/i.test(A.d.getElementById('as-cfg').textContent));
  change(A, '[data-cv=consent]', e => e.checked = true);
  A.click('[data-cv-act=create]'); await H.sleep(30);
  ok('no request without a key', st.calls.length === 0 && /Paste your ElevenLabs key/.test(A.d.getElementById('as-cfg').textContent));
  change(A, '#cv-key', e => e.value = '  sk-test  ');
  ok('the key is saved trimmed, on the device only', A.ev('ACFG.elKey') === 'sk-test' && /sk-test/.test(A.ev("localStorage.getItem('pl.asst')")));
  give(A, [file(A, 'a.wav'), file(A, 'b.wav')]);
  A.d.querySelector('[data-cv=label]').value = 'Rahul'; A.d.querySelector('[data-cv=label]').dispatchEvent(new A.w.Event('input', { bubbles: true }));
  give(A, [file(A, 'a.wav'), file(A, 'b.wav')]);
  A.click('[data-cv-act=create]'); await H.sleep(60);
  const add = st.calls.find(c => /\/voices\/add$/.test(c.url));
  ok('the voice is created with the key and the recordings', add && add.method === 'POST' && add.headers['xi-api-key'] === 'sk-test' && add.body.getAll('files').length === 2 && /Rahul/.test(add.body.get('name')));
  ok('the permission time and name are stored', A.ev("ACFG.cv.female.voiceId").startsWith('vid-') && A.ev('ACFG.cv.female.consentAt') > 0 && A.ev('ACFG.cv.female.label') === 'Rahul');
  ok('the recordings are not kept', !/a\.wav/.test(A.ev("localStorage.getItem('pl.asst')")));
  ok('the male voice has no clone', !A.ev("ACFG.cv.male&&ACFG.cv.male.voiceId"));
  ok('the section now shows the ready voice', /cloned voice is ready/.test(A.d.getElementById('as-cfg').textContent) && /Rahul/.test(A.d.getElementById('as-cfg').textContent));

  /* speaking uses the clone, then the saved clip */
  const ttsCount = () => st.calls.filter(c => /text-to-speech/.test(c.url)).length;
  A.ev("speak('Alarm set for six. Have a good day.')"); await H.sleep(80);
  ok('two sentences are fetched and played in the cloned voice', ttsCount() === 2 && st.played.length === 2 && st.spoken.length === 0);
  const tts = st.calls.find(c => /text-to-speech/.test(c.url));
  ok('the request carries the voice id, key and model', /text-to-speech\/vid-/.test(tts.url) && tts.headers['xi-api-key'] === 'sk-test' && /multilingual/.test(tts.body));
  A.ev("speak('Alarm set for six. Have a good day.')"); await H.sleep(80);
  ok('the same sentences come from the saved clips, with no new requests', ttsCount() === 2 && st.played.length === 4);
  A.ev("ACFG.rate=1.2"); A.ev("speak('Alarm set for six.')"); await H.sleep(50);
  ok('the speed setting applies to the cloned voice', st.played[st.played.length - 1].rate === 1.2);
  A.ev("ACFG.rate=1");

  /* offline */
  st.online = false;
  A.ev("speak('Alarm set for six.')"); await H.sleep(50);
  ok('a saved sentence still plays offline in the cloned voice', st.played.length === 6 && st.spoken.length === 0);
  A.ev("speak('A brand new sentence.')"); await H.sleep(60);
  ok('an unsaved sentence falls back to the device voice offline', st.spoken.length === 1 && /brand new/.test(st.spoken[0]) && ttsCount() === 2);
  ok('and the reason is shown in plain words', /No internet/.test(A.ev('CV_STATUS')));
  st.online = true;

  /* errors */
  st.tts = 401; A.ev("CV_TOLD=false;CV_STATUS=''");
  A.ev("speak('Another new sentence.')"); await H.sleep(60);
  ok('a rejected key falls back to the device voice and says so', st.spoken.length === 2 && /rejected the key/.test(A.ev('CV_STATUS')));
  st.tts = 429; A.ev("speak('Yet another sentence.')"); await H.sleep(60);
  ok('quota errors fall back too', st.spoken.length === 3 && /quota or plan/.test(A.ev('CV_STATUS')));
  st.tts = 200;

  /* Anu and Adi are separate */
  A.ev("ACFG.gender='male'");
  A.ev("speak('Alarm set for six.')"); await H.sleep(50);
  ok('the other assistant voice does not use this clone', st.spoken.length === 4 && st.played.length === 6);
  A.ev("ACFG.gender='female'");

  /* stop in the middle */
  const before = st.played.length;
  st.playMs = 60; A.ev("speak('First sentence here. Second sentence here. Third sentence here.')"); await H.sleep(30); A.ev('stopSpeaking()'); await H.sleep(200); st.playMs = 0;
  ok('stopping cancels the rest of the sentences', st.played.length - before <= 1);

  /* saved phrases for offline */
  const before2 = ttsCount();
  await openCfg(A);
  A.click('[data-cv-act=warm]'); await H.sleep(300);
  ok('"save common phrases" fetches the phrase list once', ttsCount() - before2 >= 15 && /phrases are saved/.test(A.d.getElementById('as-cfg').textContent));
  st.online = false; const p0 = st.played.length;
  A.ev("speak(cvPhrases()[1])"); await H.sleep(50);
  ok('a saved phrase plays offline', st.played.length === p0 + 1);
  st.online = true;

  /* switch off, then remove */
  change(A, '[data-cv=on]', e => e.checked = false);
  const s0 = st.spoken.length; A.ev("speak('Alarm set for six.')"); await H.sleep(40);
  ok('turning it off uses the device voice', st.spoken.length === s0 + 1);
  change(A, '[data-cv=on]', e => e.checked = true);
  A.click('[data-cv-act=remove]'); await H.sleep(80);
  ok('removing deletes it on ElevenLabs and clears it here', st.calls.some(c => c.method === 'DELETE' && /\/voices\/vid-/.test(c.url)) && !A.ev('ACFG.cv.female.voiceId'));
  const s1 = st.spoken.length; A.ev("speak('Alarm set for six.')"); await H.sleep(40);
  ok('after removal the device voice is used and the saved clips are gone', st.spoken.length === s1 + 1);

  /* cloning errors */
  st.add = 402; A.ev("CVUI.consent=true");
  await openCfg(A);
  give(A, [file(A, 'a.wav')]); change(A, '[data-cv=consent]', e => e.checked = true); give(A, [file(A, 'a.wav')]);
  A.click('[data-cv-act=create]'); await H.sleep(60);
  ok('a plan error is explained', /paid ElevenLabs plan/.test(A.d.getElementById('as-cfg').textContent) && !A.ev('ACFG.cv.female.voiceId'));
  give(A, [file(A, 'big.wav', 11 * 1048576)]); A.click('[data-cv-act=create]'); await H.sleep(30);
  ok('files over 10 MB are refused', /under 10 MB/.test(A.d.getElementById('as-cfg').textContent));

  /* Hindi */
  A.ev("setLang('hi')"); await H.sleep(60);
  await openCfg(A);
  ok('the section is in Hindi', /कस्टम आवाज़/.test(A.d.getElementById('as-cfg').textContent) && /अनुमति|हामी/.test(A.d.getElementById('as-cfg').textContent));
  ok('no script errors', A.errs.length === 0);
  console.log(n + ' voice tests passed'); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
