// Tests for Hindi / Hinglish: app language switch, assistant names, understanding Hindi commands, Hindi replies and voice language.
const assert = require('assert');
const H = require('./asst-harness');
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };
const dev = /[ऀ-ॿ]/;
const body = A => { const c = A.d.body.cloneNode(true); c.querySelectorAll('script,style').forEach(e => e.remove()); return c.textContent.replace(/Saving…|Saved on this device only\. Sign in to sync across devices\./g, ''); };

(async () => {
  /* ---- switching the whole app ---- */
  let A = await H.open({});
  A.ev('applyTemplate()'); await H.sleep(100);
  const enText = body(A);
  ok('English is the default', A.ev('LANG') === 'en' && A.d.documentElement.lang === 'en');
  A.ev("setLang('hi')"); await H.sleep(80);
  ok('switching sets the page language', A.ev('LANG') === 'hi' && A.d.documentElement.lang === 'hi' && A.ev("JSON.parse(localStorage.getItem('pl.lang'))") === 'hi');
  ok('the app text turns into Hindi', dev.test(body(A)) && /आज/.test(body(A)));
  A.ev("setLang('en')"); await H.sleep(80);
  ok('switching back restores English', A.d.documentElement.lang === 'en' && /Today/.test(body(A)) && body(A).replace(/\s+/g, ' ') === enText.replace(/\s+/g, ' '));

  /* ---- language remembered on reload ---- */
  A = await H.open({ store: { 'pl.lang': '"hi"' } });
  A.ev('applyTemplate()'); await H.sleep(100);
  ok('Hindi is remembered', A.ev('LANG') === 'hi' && dev.test(body(A)));
  ok('Hindi uses a Devanagari-capable font stack', /Devanagari/.test(A.ev("getComputedStyle(document.body).fontFamily") + A.d.head.innerHTML));

  /* ---- names ---- */
  A.click('#asstfab'); await H.sleep(60);
  ok('default female voice is called अनु', /अनु/.test(body(A)) && A.ev('asstName()') === 'अनु');
  A.ev("ACFG.gender='male';saveAcfg()");
  ok('male voice is called आदि', A.ev('asstName()') === 'आदि');
  const B = await H.open({});
  ok('English names are Anu and Adi', A.ev('1') && B.ev('asstName()') === 'Anu' && (B.ev("ACFG.gender='male';asstName()") === 'Adi'));

  /* ---- gender forms in Hindi replies ---- */
  let r = await A.say('नमस्ते');
  ok('male Hindi replies use masculine verbs', !/[{|}]/.test(r.reply) && dev.test(r.reply));
  A.ev("ACFG.gender='female'");
  r = await A.say('सत्र कैसे दर्ज करूँ');
  ok('Hindi FAQ answers have no leftover markers', dev.test(r.reply) && !/[{}]/.test(r.reply));

  /* ---- understanding Hindi and Hinglish ---- */
  A.ev("S.plan.reminders=[];S.plan.tests=[]");
  r = await A.say('कल सुबह 6 बजे अलार्म लगाओ');
  ok('Hindi alarm', A.ev('S.plan.reminders.length') === 1 && A.ev('new Date(S.plan.reminders[0].at).getHours()') === 6 && A.ev('S.plan.reminders[0].kind') === 'alarm');
  ok('reply is Hindi', dev.test(r.reply));
  A.ev("S.plan.reminders=[]");
  await A.say('रात 11 बजे का अलार्म');
  ok('"रात 11 बजे का अलार्म" is 11 pm', A.ev('new Date(S.plan.reminders[0].at).getHours()') === 23);
  A.ev("S.plan.reminders=[]");
  await A.say('साढ़े 6 बजे अलार्म');
  ok('साढ़े 6 is 6:30', A.ev('new Date(S.plan.reminders[0].at).getMinutes()') === 30);
  A.ev("S.plan.reminders=[]");
  await A.say('सुबह 5:30 बजे जगा देना');
  ok('"जगा देना" does not become the label', A.ev('S.plan.reminders[0].kind') === 'alarm' && !/देना/.test(A.ev('S.plan.reminders[0].text')));
  A.ev("S.plan.reminders=[]");
  await A.say('आधे घंटे में याद दिलाओ चाय बनानी है');
  const rem = A.ev('S.plan.reminders[0]');
  ok('relative reminder keeps the whole task', rem && /चाय/.test(rem.text) && /बनानी/.test(rem.text) && Math.abs(rem.at - Date.now() - 30 * 60000) < 90000);
  A.ev("S.plan.reminders=[]");
  await A.say('kal subah 7 baje alarm laga do');
  ok('Hinglish alarm', A.ev('S.plan.reminders.length') === 1 && A.ev('new Date(S.plan.reminders[0].at).getHours()') === 7);
  await A.say('reminder hatao sab');
  ok('Hinglish cancel all', A.ev('S.plan.reminders.length') === 0);
  await A.say('अगले सोमवार को शाम 4 बजे ML का टेस्ट 60 अंक का');
  ok('Hindi test scheduled with marks', A.ev('S.plan.tests.length') === 1 && A.ev('S.plan.tests[0].marks') === 60 && A.ev('new Date(testStart(S.plan.tests[0])).getHours()') === 16);
  await A.say('मॉक टेस्ट में 100 में से 72 अंक मिले');
  ok('Hindi score recorded', A.ev('S.plan.tests.some(t=>t.score===72&&t.marks===100)') || A.ev('S.plan.tests.some(t=>t.score===72)'));
  r = await A.say('मुख्य रंग हरा करो');
  ok('Hindi accent colour', A.ev('LOOK.accent') !== null && dev.test(r.reply));
  r = await A.say('डार्क मोड चालू करो');
  ok('Hindi dark mode', dev.test(r.reply) && /dark/.test(A.ev('document.documentElement.getAttribute("data-theme")||document.documentElement.className')));

  /* ---- language and voice switching by chat ---- */
  r = await A.say('English mein bolo');
  ok('Hinglish switches to English', A.ev('LANG') === 'en' && /English/.test(r.reply));
  r = await A.say('switch to Hindi');
  ok('English switches to Hindi', A.ev('LANG') === 'hi');
  r = await A.say('भाषा अंग्रेज़ी करो');
  ok('"भाषा अंग्रेज़ी करो" switches to English', A.ev('LANG') === 'en');
  await A.say('हिंदी में बोलो');
  await A.say('आदि से बात करो');
  ok('"आदि से बात करो" picks the male voice', A.ev('ACFG.gender') === 'male');
  await A.say('अनु की आवाज़ चाहिए');
  ok('"अनु की आवाज़" picks the female voice', A.ev('ACFG.gender') === 'female');

  /* ---- English still works while Hindi mode is on ---- */
  A.ev("S.plan.reminders=[]");
  r = await A.say('remind me to call mom at 8 pm tomorrow');
  ok('English commands work in Hindi mode', A.ev('S.plan.reminders.length') === 1 && dev.test(r.reply));

  /* ---- voice ---- */
  const spoken = []; let recLang = null;
  const C = await H.open({ store: { 'pl.lang': '"hi"' }, before(w) {
    w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    w.speechSynthesis = { getVoices: () => [{ name: 'Google हिन्दी', lang: 'hi-IN' }, { name: 'Google US English', lang: 'en-US' }], addEventListener() {}, cancel() {}, speak(u) { spoken.push(u); setTimeout(() => u.onend && u.onend(), 5); } };
    w.SpeechRecognition = class { start() { recLang = this.lang; this.onstart && this.onstart(); } stop() {} abort() {} };
  } });
  C.ev('applyTemplate()'); await H.sleep(100);
  C.ev("speak('नमस्ते। आप कैसे हैं?')"); await H.sleep(60);
  ok('Hindi speech uses the Hindi language and voice', spoken.length >= 1 && spoken.every(u => u.lang === 'hi-IN') && /हिन्दी/.test(spoken[0].voice ? spoken[0].voice.name : ''));
  ok('the sentence splitter also splits on the Hindi full stop', spoken.length === 2);
  C.click('#asstfab'); await H.sleep(60);
  C.click('#as-mic'); await H.sleep(60);
  ok('speech recognition listens in Hindi', recLang === 'hi-IN');

  /* ---- no scripts errors anywhere ---- */
  ok('no script errors', A.errs.length === 0 && B.errs.length === 0 && C.errs.length === 0);
  console.log(n + ' hindi tests passed'); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
