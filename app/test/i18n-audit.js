// Drives the app in Hindi and lists every piece of text that still looks English. Usage: node i18n-audit.js [en]
const H = require('./asst-harness');
const { makeBackend, makeFake } = require('./fake-firebase');
(async () => {
  const seen = new Map();
  const A = await H.open({ store: { 'pl.lang': JSON.stringify(process.argv[2] === 'en' ? 'en' : 'hi') }, before: w => { w.__seen = seen; } });
  const hook = w => { const orig = w.tr; w.tr = function (s) { const o = orig(s); if (typeof s === 'string' && /[A-Za-z]/.test(s)) w.__seen.set(s.trim(), o.trim()); return o; }; };
  hook(A.w);
  const run = async (code) => { try { await A.w.eval(code); } catch (e) { console.log('!! ' + code.slice(0, 60) + ' -> ' + e.message); } await H.sleep(30); };
  const closeS = () => run("closeSheet(true)");
  await run("render(false)");
  await run("applyLangToPage()");
  // onboarding
  await run("S.plan=defaultPlan();render(false)");
  await run("applyTemplate();");
  for (const t of ['today', 'plan', 'materials', 'report']) { await run(`tab='${t}';render(false)`); }
  await run("tab='today';render(false)");
  // data
  await run(`const today=ymd(new Date());
    S.logs.push(ensureT({id:'l1',d:today,st:'07:00',m:45,b:null,s:'ml',ps:null,pm:null,q:2,mid:null,mu:0,dev:'d1',src:'manual',tz:330}));
    S.logs.push(ensureT({id:'l2',d:ymd(addDays(new Date(),-1)),st:'09:00',m:60,b:null,s:'la',ps:null,pm:null,q:1,mid:null,mu:0,dev:'d1',src:'timer',tz:330}));
    S.materials.push({id:'m1',title:'Bishop PRML',subj:'ml',kind:'theory',unit:'pages',total:700,done:120,file:null,asset:null});
    S.materials.push({id:'m2',title:'GATE sheet',subj:'la',kind:'sheet',unit:'sheets',total:10,done:10,file:null,asset:null});
    S.materials.push({id:'m3',title:'Lecture playlist',subj:'ml',kind:'notes',unit:'lectures',total:0,done:0,file:'https://x.test',asset:null});
    render(false)`);
  for (const t of ['today', 'plan', 'materials', 'report']) { await run(`tab='${t}';render(false)`); await run("window.scrollTo(0,0)"); }
  await run("selIdx=0;render(false)"); await run("selIdx=6;render(false)"); await run("selIdx=3;render(false)");
  await run("tab='today';selIdx=dow(new Date());render(false)");
  // sheets
  const sheets = ["blockForm()", "blockForm(S.plan.blocks[0])", "subjForm()", "subjForm(S.plan.subjects[0])", "logForm()", "logForm(S.plan.blocks[0])", "matForm()", "matForm(S.materials[0])", "matForm(S.materials[1])", "settingsForm()", "reminderForm()", "testForm()", "accountSheet()", "installHelp()", "courseForm()"];
  for (const c of sheets) { await run(c); await run("sheetEl.querySelector('form')&&sheetEl.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))"); await closeS(); }
  // empty-field error toasts
  await run("tab='plan';render(false)");
  await run("toast('Block saved');toast('Subject saved');toast('Session logged');toast('Template added');toast('Report copied');toast('Alarms on. Keep this page open.');toast('Alarms off');toast('Settings saved');toast('Deleted');toast('Saved')");
  // tests and reminders
  await run("const nowt=new Date();S.plan.tests.push({id:'t1',title:'Mock 1',kind:'mock',subj:'',date:ymd(addDays(nowt,2)),st:'10:00',m:180,marks:100,score:null,al:true});S.plan.tests.push({id:'t2',title:'Quiz',kind:'test',subj:'ml',date:ymd(addDays(nowt,-3)),st:'10:00',m:60,marks:50,score:35,al:true});S.plan.tests.push({id:'t3',title:'Old',kind:'test',subj:'',date:ymd(addDays(nowt,-5)),st:'10:00',m:60,marks:50,score:null,al:true});S.plan.tests.push({id:'t4',title:'Mock 0',kind:'mock',subj:'',date:ymd(addDays(nowt,-9)),st:'10:00',m:180,marks:100,score:61,al:true});S.plan.reminders.push({id:'r1',text:'Drink water',at:Date.now()+3600000,kind:'reminder',rep:'daily',done:false});S.plan.reminders.push({id:'r2',text:'Wake',at:Date.now()+86400000,kind:'alarm',rep:'',done:false});render(false)");
  for (const t of ['today', 'plan', 'report']) { await run(`tab='${t}';render(false)`); }
  await run("testForm(S.plan.tests[0])"); await closeS(); await run("reminderForm(S.plan.reminders[0])"); await closeS(); await run("scoreForm(S.plan.tests[0])"); await closeS(); await run("scoreForm(S.plan.tests[1])"); await closeS();
  await run("armed=true;ringReminder(S.plan.reminders[0])"); await run("stopRing()"); await run("ringTest(S.plan.tests[0])"); await run("stopRing()");
  await run("ring(S.plan.blocks[0],false)"); await run("stopRing()"); await run("ring(S.plan.blocks[0],true)"); await run("stopRing()");
  await run("startRun(S.plan.blocks[0])"); await run("render(false)"); await run("tickTimer()");
  await run("startTest(S.plan.tests[0])"); await run("render(false)");
  await run("tab='today';render(false)");
  // assistant
  await run("openAssistant()"); await H.sleep(50);
  for (const t of ['hello', 'help', 'set alarm 6 am tomorrow']) await run(`asstSend(${JSON.stringify(t)},false)`), await H.sleep(120);
  await run("asstView='cfg';paintAssistant()"); await run("closeAssistant()");
  // gate + account with fake firebase
  const be = makeBackend(); const vc = null;
  const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../../docs/index.html', 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, virtualConsole: new VirtualConsole(), beforeParse(w) { w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} }); w.scrollTo = () => {}; w.localStorage.setItem('pl.lang', JSON.stringify(process.argv[2] === 'en' ? 'en' : 'hi')); } });
  const w2 = dom.window; w2.__seen = seen; hook(w2); const fb = makeFake(be, 'A'); w2.__fbResolve(fb); await H.sleep(300);
  const r2 = async c => { try { await w2.eval(c); } catch (e) { console.log('!! ' + c.slice(0, 50) + ' ' + e.message); } await H.sleep(30); };
  w2.document.querySelector('[data-act=signin]').dispatchEvent(new w2.MouseEvent('click', { bubbles: true })); await H.sleep(600);
  await r2("applyTemplate()"); await r2("accountSheet()"); await r2("closeSheet(true)"); await r2("courseForm()"); await r2("closeSheet(true)"); await r2("signOutNow()"); await H.sleep(400);
  await r2("accountSheet()");
  const unt = [...seen.entries()].filter(([k, v]) => k === v).map(([k]) => k);
  const done = [...seen.entries()].filter(([k, v]) => k !== v).length;
  console.log('translated:', done, ' untranslated:', unt.length);
  unt.sort(); unt.forEach(k => console.log(JSON.stringify(k)));
  console.log('errors', A.errs);
  process.exit(0);
})();
