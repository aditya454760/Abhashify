// Tests for the in-app assistant: language understanding, actions, undo, UI, voice (with fake speech APIs) and Smart mode (with a fake fetch).
const assert = require('assert');
const H = require('./asst-harness');
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };
const text = A => A.d.getElementById('as-msgs') ? A.d.getElementById('as-msgs').textContent : '';

function speechFakes(script, voices) {
  const spoken = []; const state = { starts: 0, spoken, script };
  return { state, before(w) {
    class Utt { constructor(t) { this.text = t; } }
    w.SpeechSynthesisUtterance = Utt;
    w.speechSynthesis = { getVoices: () => voices || [], addEventListener() {}, cancel() {}, speak(u) { spoken.push(u); setTimeout(() => u.onend && u.onend(), 5); } };
    w.SpeechRecognition = class { start() { state.starts++; this.onstart && this.onstart(); const phrase = state.script.shift(); setTimeout(() => { if (phrase) this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: phrase }], { isFinal: true })] }); this.onend && this.onend(); }, 15); } abort() {} };
  } };
}
const V = (name, lang) => ({ name, lang });

(async () => {
  /* ---- panel, chat, undo ---- */
  let A = await H.open({});
  A.ev('applyTemplate()'); await H.sleep(100);
  ok('assistant button is visible', !A.d.getElementById('asstfab').hidden);
  A.click('#asstfab'); await H.sleep(50);
  ok('panel opens and the button hides', !A.d.getElementById('asst').hidden && A.d.getElementById('asstfab').hidden);
  ok('welcome text is shown', /study assistant/i.test(text(A)));
  A.d.getElementById('as-text').value = 'remind me to revise ML at 8 pm tomorrow';
  A.d.getElementById('as-form').dispatchEvent(new A.w.Event('submit', { cancelable: true, bubbles: true })); await H.sleep(80);
  ok('reply appears in the chat', /Reminder set/.test(text(A)) && /revise/.test(text(A)));
  ok('reminder is stored in the plan', A.ev('S.plan.reminders.length') === 1 && A.ev('S.plan.reminders[0].at') > Date.now());
  ok('undo chip appears after a change', !!A.d.querySelector('.as-chip.undo'));
  A.click('.as-chip.undo'); await H.sleep(80);
  ok('undo removes the reminder', A.ev('S.plan.reminders.length') === 0 && /Undone/.test(text(A)));
  A.d.getElementById('as-text').value = '<img src=x onerror=alert(1)> **bold**';
  A.d.getElementById('as-form').dispatchEvent(new A.w.Event('submit', { cancelable: true, bubbles: true })); await H.sleep(80);
  ok('user text is escaped in the chat', !A.d.querySelector('#as-msgs img') && /<img/.test(text(A)));
  ok('history is saved', JSON.parse(A.w.localStorage.getItem('pl.chat')).length >= 4);

  /* ---- look ---- */
  await A.say('make accent green'); await A.say('background sunrise');
  const st = A.d.documentElement.style;
  ok('accent variable set and clamped for contrast', /^hsl\(/.test(st.getPropertyValue('--accent')) && +st.getPropertyValue('--accent').match(/(\d+)%\)$/)[1] <= 42);
  ok('gradient background applied', /gradient/.test(st.getPropertyValue('--bgimg')) && st.getPropertyValue('--bg') !== '');
  await A.say('dark mode');
  ok('dark mode lightens the accent', +st.getPropertyValue('--accent').match(/(\d+)%\)$/)[1] >= 66 && A.d.documentElement.getAttribute('data-theme') === 'dark');
  const r1 = await A.say('background #ffffff');
  ok('a light background flips the theme to light', A.d.documentElement.getAttribute('data-theme') === 'light' && /light mode/.test(r1.reply));
  await A.say('reset the look');
  const both = await A.say('make accent teal and background aurora');
  ok('accent and background can be changed in one sentence', A.ev('LOOK.accent') === '#0F8B8D' && A.ev('LOOK.bg') === 'aurora' && /teal/.test(both.reply) && /aurora/.test(both.reply));
  await A.say('reset the look');
  ok('reset clears the custom colours', st.getPropertyValue('--accent') === '' && st.getPropertyValue('--bg') === '');
  const r2 = await A.say('background nonsensecolour');
  ok('unknown background is refused politely', /Which background|do not know/.test(r2.reply));

  /* ---- tests, scores, timer ---- */
  await A.say('schedule a mock test tomorrow at 10 am for 3 hours');
  ok('mock test saved', A.ev('S.plan.tests.length') === 1 && A.ev('S.plan.tests[0].kind') === 'mock' && A.ev('S.plan.tests[0].m') === 180);
  await A.say('I scored 72 out of 100 in the mock test');
  ok('score recorded', A.ev('S.plan.tests[0].score') === 72 && A.ev('S.plan.tests[0].marks') === 100);
  A.click('[data-act=tab][data-v=report]'); await H.sleep(50);
  ok('report shows the mock test card', /72/.test(A.d.getElementById('view').textContent) && /[Mm]ock/.test(A.d.getElementById('view').textContent));

  /* ---- confirmation before replacing the schedule ---- */
  const before = A.ev('S.plan.blocks.length');
  const c1 = await A.say('make a new schedule for 4 hours a day');
  ok('asks before replacing the schedule', /Go ahead/.test(c1.reply) && A.ev('S.plan.blocks.length') === before);
  const c2 = await A.say('no');
  ok('"no" keeps the schedule', A.ev('S.plan.blocks.length') === before);
  await A.say('make a new schedule for 4 hours a day'); await A.say('yes');
  ok('"yes" replaces it', A.ev('S.plan.blocks.length') > 0 && A.ev('S.plan.subjects.length') === 9);
  await A.say('undo');
  ok('undo restores the old blocks', A.ev('S.plan.blocks.length') === before);

  /* ---- reminders ring ---- */
  A.ev("S.plan.reminders.push({id:'rr1',text:'Drink water',at:Date.now()-60000,kind:'reminder',rep:'',done:false});armed=true;alarmTick()"); await H.sleep(50);
  ok('a due reminder rings on screen', !A.d.getElementById('alarm').hidden && /Drink water/.test(A.d.getElementById('alarm').textContent));
  ok('no page errors so far', A.errs.length === 0);

  /* ---- settings view and voices ---- */
  const FX = speechFakes([], [V('Microsoft Heera - English (India)', 'en-IN'), V('Microsoft Ravi - English (India)', 'en-IN'), V('Google US English', 'en-US')]);
  let B = await H.open({ before: FX.before });
  B.ev('applyTemplate()'); await H.sleep(100);
  B.click('#asstfab'); await H.sleep(30); B.click('[data-asa=cfg]'); await H.sleep(30);
  ok('settings view shows voice and Smart mode', /Voice/.test(B.d.getElementById('as-cfg').textContent) && /Smart mode/.test(B.d.getElementById('as-cfg').textContent));
  B.click('[data-asa=gender][data-v=male]'); await H.sleep(30);
  ok('male voice picked automatically', FX.state.spoken.length >= 1 && B.ev('pickVoice().v.name') === 'Microsoft Ravi - English (India)');
  B.click('[data-asa=gender][data-v=female]'); await H.sleep(30);
  ok('female voice picked automatically', B.ev('pickVoice().v.name') === 'Microsoft Heera - English (India)');
  ok('settings are saved on the device', JSON.parse(B.w.localStorage.getItem('pl.asst')).gender === 'female');
  const FX2 = speechFakes([], [V('Microsoft Heera - English (India)', 'en-IN')]);
  let C = await H.open({ before: FX2.before, store: { 'pl.asst': JSON.stringify({ gender: 'male' }) } });
  ok('with no male voice the pitch is lowered instead', C.ev('pickVoice().shifted') === true && C.ev('pickVoice().pitch') < 1);

  /* ---- voice chat loop ---- */
  FX.state.script.push('dark mode', 'what can you do');
  B.click('[data-asa=back]'); await H.sleep(20);
  B.click('#as-mic'); await H.sleep(900);
  ok('speech recognition started', FX.state.starts >= 1);
  ok('spoken command was carried out', B.d.documentElement.getAttribute('data-theme') === 'dark');
  ok('the reply was spoken aloud', FX.state.spoken.some(u => /dark mode/i.test(u.text)));
  ok('it kept listening for the next sentence', /alarms/i.test(text(B)) && FX.state.spoken.some(u => /alarms/i.test(u.text)));
  await H.sleep(1500);
  ok('it stops after silence', B.ev('voiceChat') === false);
  B.click('[data-asa=close]'); await H.sleep(30);
  ok('closing the panel stops everything', B.d.getElementById('asst').hidden && !B.ev('listening'));
  const D = await H.open({});
  D.ev('applyTemplate()'); D.click('#asstfab'); await H.sleep(30); D.click('#as-mic'); await H.sleep(50);
  ok('no speech API: a clear message instead of a crash', /not supported/.test(text(D)) && D.errs.length === 0);

  /* ---- Smart mode (fake network) ---- */
  const calls = [];
  const mkFetch = handler => w => { w.fetch = async (url, o) => { calls.push({ url, o }); return handler(url, o); }; };
  const jr = (obj, ok_ = true, status = 200) => ({ ok: ok_, status, json: async () => obj });
  const tomorrow9 = () => { const d = new Date(Date.now() + 86400000), p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 09:00`; };
  const E = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'gemini', key: 'KEY123' }) }, before: mkFetch((u) => jr({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify({ reply: 'Done, I set it.', actions: [{ type: 'set_reminder', at: tomorrow9(), text: 'Revise graphs' }, { type: 'delete_everything' }, { type: 'set_accent', color: 'purple' }] }) + '\n```' }] } }] })) });
  E.ev('applyTemplate()'); await H.sleep(100);
  const s1 = await E.w.eval('respond("remind me to revise graphs tomorrow morning")');
  ok('Gemini request goes to the right place with the key in a header', /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent/.test(calls[0].url) && calls[0].o.headers['x-goog-api-key'] === 'KEY123' && !/KEY123/.test(calls[0].url));
  ok('the system prompt carries the app state but not the key', /Current data/.test(calls[0].o.body) && !/KEY123/.test(calls[0].o.body));
  ok('Smart mode actions run through the executor', E.ev('S.plan.reminders.length') === 1 && E.ev('LOOK.accent') !== null);
  ok('unknown actions are ignored', !/delete_everything/.test(JSON.stringify(s1)));
  const calls0 = calls.length;
  const F = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'anthropic', key: 'sk-ant-x' }) }, before: mkFetch(() => jr({ content: [{ type: 'text', text: '{"reply":"Hello there","actions":[]}' }] })) });
  const s2 = await F.w.eval('respond("hi")');
  const ac = calls[calls.length - 1];
  ok('Anthropic request uses the browser-access header and a small model', ac.url === 'https://api.anthropic.com/v1/messages' && ac.o.headers['anthropic-dangerous-direct-browser-access'] === 'true' && /haiku/.test(ac.o.body) && s2.reply === 'Hello there');
  const G = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'gemini', key: 'bad' }) }, before: mkFetch(() => jr({ error: { message: 'API key not valid' } }, false, 400)) });
  G.ev('applyTemplate()'); await H.sleep(50);
  const s3 = await G.w.eval('respond("dark mode")');
  ok('a bad key falls back to the built-in brain with a note', /built-in/.test(s3.reply) && G.d.documentElement.getAttribute('data-theme') === 'dark');
  const Hh = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'gemini', key: 'k' }) }, before: mkFetch(() => { throw new TypeError('Failed to fetch'); }) });
  const s4 = await Hh.w.eval('respond("how do I log a session")');
  ok('offline: falls back and still answers', /Could not reach/.test(s4.reply) && /Log time/.test(s4.reply));
  const I = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'gemini', key: 'k' }) }, before: mkFetch(() => jr({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Replacing.', actions: [{ type: 'new_schedule', mode: 'template' }] }) }] } }] })) });
  I.ev('applyTemplate()'); await H.sleep(50);
  const b0 = I.ev('S.plan.blocks.length');
  const s5 = await I.w.eval('respond("redo my whole schedule")');
  await H.sleep(400);
  ok('Smart mode: a "template" request opens the setup wizard and leaves the schedule alone', I.ev('S.plan.blocks.length') === b0 && !!I.d.getElementById('wiz'));
  const J = await H.open({ store: { 'pl.asst': JSON.stringify({ provider: 'gemini', key: 'k' }) }, before: mkFetch(() => jr({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Replacing.', actions: [{ type: 'new_schedule', mode: 'custom', subjects: [{ name: 'Maths', hours: 5 }] }] }) }] } }] })) });
  J.ev('applyTemplate()'); await H.sleep(50);
  const bj = J.ev('S.plan.blocks.length');
  const s6 = await J.w.eval('respond("redo my whole schedule with maths")');
  ok('Smart mode still has to ask before replacing the schedule with a custom one', /Go ahead/.test(s6.reply) && J.ev('S.plan.blocks.length') === bj && J.ev('PENDING') !== null);
  const K = await H.open({});
  for (const q of ['set up my course', 'make me a timetable', 'I want to change my exam']) {
    const r = await K.w.eval('respond(' + JSON.stringify(q) + ')');
    await H.sleep(400);
    ok('"' + q + '" opens the setup wizard', !!K.d.getElementById('wiz') && /set/i.test(r.reply || ''));
    K.ev('closeWizard && closeWizard(true)');
  }
  const kb1 = await K.w.eval('respond("which apps can you track")');
  ok('the knowledge base answers about study tools', /tool|app/i.test(kb1.reply) && /consent|permission|once|ask/i.test(kb1.reply));
  const kb2 = await K.w.eval('respond("what permissions do you need")');
  ok('the knowledge base answers about permissions', /notification/i.test(kb2.reply));

  console.log('\n' + n + ' assistant tests passed');
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message, e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); });
