// Tests for the course setup wizard, the timetable generator, permissions and study-tool tracking.
const assert = require('assert');
const H = require('./asst-harness');
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };
const txt = (A, sel) => { const e = A.d.querySelector(sel || 'body'); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script,style').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' '); };
const wz = (A, sel) => { const e = A.d.querySelectorAll('#wiz ' + sel)[0];   // querySelectorAll: jsdom's querySelector mishandles '&' in attribute values
  if (!e) throw new Error('missing in wizard: ' + sel + ' | ' + A.d.querySelector('#wiz').innerHTML.slice(2000, 3500)); e.dispatchEvent(new A.w.MouseEvent('click', { bubbles: true })); };
const setv = (A, sel, v, ev) => { const e = A.d.querySelector(sel); if (!e) throw new Error('missing ' + sel); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new A.w.Event(ev || 'change', { bubbles: true })); };
const next = A => wz(A, '[data-wz=next]');
const nextOff = A => A.d.querySelector('#wiz [data-wz=next]').disabled;
const ymdOf = (A, off) => A.ev(`ymd(addDays(new Date(),${off}))`);
const step = A => A.ev('W&&W.step');
const toExam = async A => { for (let i = 0; i < 8 && step(A) !== 'exam'; i++) { wz(A, '[data-wz=back]'); await sleep(5); } };
const sleep = H.sleep;

(async () => {
  /* ---- front page ---- */
  let A = await H.open({});
  const front = txt(A, '#view');
  ok('the front page no longer offers the GATE DA template', !/GATE/.test(front) || /GATE, UPSC/.test(front));
  ok('no template button is left on the page', !A.d.querySelector('[data-act=tpl]') && !/DA 2027 template/.test(front));
  ok('the front page has Set up my course and an empty option', !!A.d.querySelector('[data-act=wiz]') && !!A.d.querySelector('[data-act=blank]'));
  A.click('[data-act=wiz]'); await sleep(50);
  ok('the wizard opens on the exam list', step(A) === 'exam' && !A.d.getElementById('wiz').hidden);
  const wt = txt(A, '#wiz');
  for (const [id, nm] of [['jee', 'JEE'], ['neet', 'NEET'], ['gate', 'GATE'], ['upsc', 'UPSC'], ['ssc', 'SSC'], ['nda', 'NDA'], ['cds', 'CDS'], ['cat', 'CAT'], ['clat', 'CLAT'], ['ca', 'CA'], ['bank', 'Banking'], ['rail', 'Railways'], ['other', 'Other']])
    ok('exam list has ' + nm, !!A.d.querySelector('#wiz [data-wz=fam][data-v=' + id + ']') && wt.includes(nm));

  /* ---- variants ---- */
  wz(A, '[data-wz=fam][data-v=gate]'); await sleep(20);
  const gv = txt(A, '#wiz');
  for (const nm of ['CS (Computer Science', 'DA (Data Science', 'ECE', 'EE (Electrical', 'ME (Mechanical', 'CE (Civil', 'XE', 'XL', 'Other (my own paper'])
    ok('GATE has ' + nm, gv.includes(nm));
  wz(A, '[data-wz=back]'); await sleep(10);
  wz(A, '[data-wz=fam][data-v=jee]'); await sleep(10);
  const jv = txt(A, '#wiz');
  ok('JEE has Main, Advanced and the architecture papers', ['JEE Main (B.E.', 'JEE Advanced', 'Paper 2A (B.Arch)', 'Paper 2B (B.Planning)', 'AAT'].every(x => jv.includes(x)));
  wz(A, '[data-wz=back]'); await sleep(10);

  /* ---- GATE DA: preloaded subjects ---- */
  wz(A, '[data-wz=fam][data-v=gate]'); wz(A, '[data-wz=var][data-v=da]'); await sleep(20);
  ok('picking the paper goes to subjects', step(A) === 'subjects');
  const st = txt(A, '#wiz');
  ok('GATE DA subjects are preloaded', ['Probability & Statistics', 'Linear Algebra', 'Machine Learning', 'General Aptitude'].every(x => st.includes(x)));
  ok('no optional group for DA, so Next is allowed', !nextOff(A));
  // mark a subject as weak, remove one, add my own
  wz(A, '[data-wz=conf][data-n="Machine Learning"][data-v="2"]'); await sleep(10);
  ok('weak is remembered for a subject', A.ev("W.conf['Machine Learning']") === 2);
  wz(A, '[data-wz=boff][data-n="Calculus & Optimization"]'); await sleep(10);
  ok('a subject can be unticked', A.ev("wizSubjects().every(s=>s.name!=='Calculus & Optimization')"));
  setv(A, '#wiz [data-wf=exadd]', 'Computer Networks revision', 'input'); wz(A, '[data-wz=exadd]'); await sleep(10);
  ok('a subject of my own can be added', A.ev("wizSubjects().some(s=>s.name==='Computer Networks revision')"));
  ok('the mock-test pseudo subject is not listed for rating', !/Revision & full mocks/.test(txt(A, '#wiz')));

  /* ---- optional subjects must be chosen: GATE XE needs two ---- */
  await toExam(A);
  wz(A, '[data-wz=fam][data-v=gate]'); wz(A, '[data-wz=var][data-v=xe]'); await sleep(20);
  ok('XE asks which optional sections are yours', /Choose your two optional sections/.test(txt(A, '#wiz')));
  ok('Next is blocked until two are chosen', nextOff(A));
  wz(A, '[data-wz=pick][data-g="0"][data-n="Materials Science"]'); await sleep(5);
  ok('one of two is not enough', nextOff(A));
  wz(A, '[data-wz=pick][data-g="0"][data-n="Thermodynamics"]'); await sleep(5);
  ok('two chosen unlocks Next', !nextOff(A));
  ok('a third cannot be added', A.d.querySelector('#wiz [data-wz=pick][data-n="Solid Mechanics"]').disabled);
  setv(A, '#wiz [data-wf=gx0]', 'My own section', 'input'); wz(A, '[data-wz=gxadd][data-g="0"]'); await sleep(5);
  ok('an Other entry cannot push past the limit', A.ev('W.gx[0].length') === 0);
  wz(A, '[data-wz=pick][data-g="0"][data-n="Thermodynamics"]'); await sleep(5);
  setv(A, '#wiz [data-wf=gx0]', 'My own section', 'input'); wz(A, '[data-wz=gxadd][data-g="0"]'); await sleep(5);
  ok('an Other entry counts as one of the choices', A.ev("wizSubjects().some(s=>s.name==='My own section')") && !nextOff(A));

  /* ---- UPSC optional (one, required) ---- */
  await toExam(A);
  ok('back from variants returns to the exam list', step(A) === 'exam');
  wz(A, '[data-wz=fam][data-v=upsc]'); wz(A, '[data-wz=var][data-v=cse]'); await sleep(20);
  ok('UPSC lists optional subjects', /Anthropology/.test(txt(A, '#wiz')) && /Public Administration/.test(txt(A, '#wiz')) && nextOff(A));
  wz(A, '[data-wz=pick][data-g="0"][data-n="Geography"]'); await sleep(5);
  wz(A, '[data-wz=pick][data-g="0"][data-n="Sociology"]'); await sleep(5);
  ok('single choice replaces the previous one', A.ev('JSON.stringify(W.picks[0])') === '["Sociology"]');

  /* ---- Other family and Other paper ---- */
  await toExam(A);
  wz(A, '[data-wz=fam][data-v=other]'); await sleep(20);
  ok('Other asks for a name and subjects', /Exam or goal name/.test(txt(A, '#wiz')) && /Subjects, one per line/.test(txt(A, '#wiz')));
  ok('Other is blocked until filled', nextOff(A));
  setv(A, '#wiz [data-wf=cName]', 'State Police', 'input'); setv(A, '#wiz [data-wf=cSubs]', 'Maths\nReasoning\n\nHindi\nMaths', 'input');
  ok('Other unlocks when filled', !nextOff(A));
  next(A); await sleep(20);
  ok('typed subjects become the list, blank lines and repeats dropped', step(A) === 'subjects' && A.ev("wizSubjects().map(s=>s.name).join()") === 'Maths,Reasoning,Hindi');
  await toExam(A);
  wz(A, '[data-wz=fam][data-v=ssc]'); await sleep(10);
  ok('every family has an Other paper', /Other \(my own paper or branch\)/.test(txt(A, '#wiz')));
  wz(A, '[data-wz=var][data-v=custom]'); await sleep(10);
  ok('Other paper shows the typing fields', /Exam or goal name/.test(txt(A, '#wiz')));

  /* ---- full run: GATE DA ---- */
  await toExam(A);
  wz(A, '[data-wz=fam][data-v=gate]'); wz(A, '[data-wz=var][data-v=da]'); await sleep(20);
  wz(A, '[data-wz=conf][data-n="Machine Learning"][data-v="2"]'); wz(A, '[data-wz=boff][data-n="Calculus & Optimization"]');
  setv(A, '#wiz [data-wf=exadd]', 'Computer Networks revision', 'input'); wz(A, '[data-wz=exadd]'); await sleep(10);
  next(A); await sleep(20);
  ok('permissions come right after the course is decided', step(A) === 'perms' && /Allow once, use everywhere/.test(txt(A, '#wiz')));
  const ptxt = txt(A, '#wiz');
  ok('permissions are explained: notifications, storage, microphone, tool tracking', ['Notifications', 'Keep my data on this device', 'Microphone', 'Track my study tools'].every(x => ptxt.includes(x)));
  // stand-ins for the browser prompts
  A.ev(`window.__asked=[];
    window.Notification={permission:'default',requestPermission:async()=>{__asked.push('notif');window.Notification.permission='granted';return 'granted'}};
    Object.defineProperty(navigator,'storage',{value:{persist:async()=>{__asked.push('store');return true},persisted:async()=>false},configurable:true});
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{__asked.push('mic');return {getTracks:()=>[{stop(){}}]}}},configurable:true});0`);
  A.ev('permRepaint()');
  A.click('#permallbtn'); await sleep(200);
  ok('Allow all asks for each permission once', A.ev('JSON.stringify(__asked)') === '["notif","store","mic"]');
  ok('tracking consent is given by Allow all', A.ev('trackOn()') === true);
  ok('each row now says Allowed', (txt(A, '#wizperms').match(/Allowed/g) || []).length === 4);
  ok('Allow all disappears once everything is allowed', A.d.getElementById('permallbtn').hidden);
  next(A); await sleep(20);
  ok('study tools step follows', step(A) === 'tools' && /What do you study with/.test(txt(A, '#wiz')));
  ok('GATE suggests NPTEL, GATE Overflow and YouTube', ['NPTEL', 'GATE Overflow', 'YouTube'].every(x => txt(A, '#wiztools').includes(x)));
  wz(A, '[data-wz=tool][data-t=yt]'); wz(A, '[data-wz=tool][data-t=nptel]');
  setv(A, '#wiz [data-wf=tn]', 'Gate Smashers', 'input'); setv(A, '#wiz [data-wf=tu]', 'not a link', 'input'); wz(A, '[data-wz=tooladd]'); await sleep(5);
  ok('a bad link is refused', /does not look right/.test(txt(A, '#wzterr')) && A.ev('W.toolCustom.length') === 0);
  setv(A, '#wiz [data-wf=tu]', 'https://www.youtube.com/@GateSmashers', 'input'); wz(A, '[data-wz=tooladd]'); await sleep(5);
  ok('my own tool is added, and a known site picks up its app', A.ev('W.toolCustom.length') === 1 && A.ev('W.toolCustom[0].pkg') === 'com.google.android.youtube');
  ok('tracking shows as on in the tools step', /Automatic tracking is on/.test(txt(A, '#wiztools')));
  next(A); await sleep(20);
  ok('date step', step(A) === 'when');
  ok('Next is blocked until a date is given and confirmed', nextOff(A) && /Enter your exam date/.test(txt(A, '#wiz')));
  // a date in the past / too close
  setv(A, '#wiz [data-wf=dDate]', ymdOf(A, 3));
  ok('a date under a week away is refused', /at least a week/.test(txt(A, '#wiz')) && nextOff(A));
  setv(A, '#wiz [data-wf=dDate]', ymdOf(A, 365 * 5));
  ok('a date over four years away is refused', /more than four years/.test(txt(A, '#wiz')));
  // month only
  wz(A, '[data-wz=wm][data-v=month]'); await sleep(5);
  const monthTarget = A.ev(`(()=>{const d=addDays(new Date(),200);return d.getFullYear()+'-'+pad(d.getMonth()+1)})()`);
  setv(A, '#wiz [data-wf=dMonth]', monthTarget);
  ok('a month is accepted and explained as the 1st', /1st of it/.test(txt(A, '#wiz')) && /Please check/.test(txt(A, '#wiz')));
  ok('the end date from a month is the first of that month', A.ev('wizEnd().end') === monthTarget + '-01');
  ok('the exam date has to be confirmed', nextOff(A));
  setv(A, '#wiz [data-wf=confirmed]', true);
  ok('confirming unlocks Next', !nextOff(A));
  wz(A, '[data-wz=wm][data-v=typical]'); await sleep(5);
  ok('not sure: uses the usual month and says it is not official', /placeholder/.test(txt(A, '#wiz')) && /February|Feb/.test(txt(A, '#wiz')) && A.ev('parseYmd(wizEnd().end).getMonth()') === 1);
  wz(A, '[data-wz=wm][data-v=target]'); await sleep(5);
  setv(A, '#wiz [data-wf=dTarget]', ymdOf(A, 150));
  ok('own target date works', /is your target date/.test(txt(A, '#wiz')));
  wz(A, '[data-wz=wm][data-v=date]'); await sleep(5);
  const examDate = ymdOf(A, 180);
  setv(A, '#wiz [data-wf=dDate]', examDate); setv(A, '#wiz [data-wf=confirmed]', true);
  ok('exam date confirmed', !nextOff(A) && A.ev('wizEnd().end') === examDate && A.ev('wizEnd().days') === 180);
  next(A); await sleep(20);
  ok('comfort step asks hours, part of day, rest day, sitting length', step(A) === 'comfort' && ['Hours on weekdays', 'Which part of the day', 'Rest day', 'Longest single sitting'].every(x => txt(A, '#wiz').includes(x)));
  ok('defaults come from the exam', A.ev('W.hw') === 4 && A.ev('W.he') === 7);
  setv(A, '#wiz [data-wf=hw]', '3'); setv(A, '#wiz [data-wf=he]', '6');
  wz(A, '[data-wz=per][data-v=morning]'); wz(A, '[data-wz=per][data-v=evening]'); wz(A, '[data-wz=per][data-v=early]'); await sleep(5);
  ok('parts of the day toggle', A.ev("JSON.stringify(W.periods)") === '["early"]');
  ok('with no part of the day, Next is blocked', (wz(A, '[data-wz=per][data-v=early]'), nextOff(A)));
  wz(A, '[data-wz=per][data-v=morning]'); wz(A, '[data-wz=per][data-v=evening]');
  wz(A, '[data-wz=sess][data-v="60"]');
  wz(A, '[data-wz=off][data-v="3"]'); await sleep(5);
  ok('a rest day can be set', A.ev('JSON.stringify(W.off)') === '[3]');
  next(A); await sleep(50);
  ok('timetable step shows a plan', step(A) === 'plan' && !!A.ev('W.draft'));

  /* ---- the generated plan ---- */
  const D = A.ev('W.draft'), P = D.plan;
  const mins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m };
  ok('the plan runs up to the confirmed date', P.exam === examDate && P.examName === 'GATE DA');
  ok('it has learn, revise and final phases that tile the dates exactly', D.phases.length === 3 && D.phases[0].from === ymdOf(A, 0) && D.phases[2].to === ymdOf(A, 179) && D.phases.every((p, i) => i === 0 || A.ev(`ymd(addDays(parseYmd('${D.phases[i - 1].to}'),1))`) === p.from));
  ok('every block carries its phase dates', P.blocks.every(b => b.from && b.to && b.ph));
  ok('no block lands on the rest day', P.blocks.every(b => !b.days.includes(3)));
  let bad = 0, overlap = 0, outside = 0, ex = 0;
  const win = { morning: [480, 720], evening: [1020, 1260] };
  for (const ph of D.phases) for (let d = 0; d < 7; d++) {
    const bl = P.blocks.filter(b => b.ph === ph.id && b.days.includes(d)).sort((a, b) => mins(a.st) - mins(b.st));
    for (let i = 1; i < bl.length; i++) if (mins(bl[i].st) < mins(bl[i - 1].st) + bl[i - 1].m) overlap++;
    for (const b of bl) { const s = mins(b.st), e = s + b.m; if (b.k !== 'mock' && !Object.values(win).some(([a, z]) => s >= a && e <= z)) outside++; }
    const tot = bl.reduce((a, b) => a + b.m, 0), want = (d >= 5 ? 6 : 3) * 60;
    if (d === 3) { if (tot) bad++; continue }
    const isMockDay = ph.id !== 'learn' && d === 6;
    if (!isMockDay && Math.abs(tot - want) > 30) { bad++; console.log('day total off', ph.id, d, tot, want); }
  }
  ok('blocks never overlap', overlap === 0);
  ok('study blocks stay inside the chosen parts of the day', outside === 0);
  ok('each day adds up to the hours asked for', bad === 0);
  ok('no session is longer than the chosen sitting', P.blocks.every(b => b.k === 'mock' || b.m <= 60));
  const subs = P.subjects.filter(s => s.id !== 'mix');
  ok('subjects follow my choices (removed one gone, own one in)', !subs.some(s => s.name === 'Calculus & Optimization') && subs.some(s => s.name === 'Computer Networks revision'));
  const learn = D.phases[0];
  const cnt = id => P.blocks.filter(b => b.ph === learn.id && b.s === id).length;
  const ml = subs.find(s => s.name === 'Machine Learning').id, ps = subs.find(s => s.name === 'Probability & Statistics').id, la = subs.find(s => s.name === 'Linear Algebra').id;
  ok('a weak, important subject gets more weekly sessions', cnt(ml) > cnt(la) && cnt(ps) >= cnt(la));
  ok('every subject appears each week in the learning phase', subs.every(s => cnt(s.id) >= 1));
  ok('learning phase has theory then practice, not revision of nothing', P.blocks.filter(b => b.ph === learn.id).every(b => b.k === 'theory' || b.k === 'practice'));
  ok('the later phases have revision and a mock day', P.blocks.some(b => b.ph === 'final' && b.k === 'revision') && P.blocks.some(b => b.ph === 'final' && b.k === 'mock'));
  ok('the same subject is not repeated on a day (where possible)', (() => { let rep = 0; for (const ph of D.phases) for (let d = 0; d < 7; d++) { const bl = P.blocks.filter(b => b.ph === ph.id && b.days.includes(d) && b.k !== 'mock'); const ids = bl.map(b => b.s); rep += ids.length - new Set(ids).size } return rep <= 3 })());
  ok('dated mock tests exist from the revise phase on, on one weekday, with the exam length', P.tests.length >= 6 && P.tests.every(t => A.ev(`dow(parseYmd('${t.date}'))`) === 6 && t.m === 180 && t.marks === 100 && t.date >= D.phases[1].from && t.date < examDate));
  ok('mock tests are weekly in the final stretch', (() => { const f = P.tests.filter(t => t.date >= D.phases[2].from).map(t => t.date); return f.length >= 3 && f.every((d, i) => i === 0 || A.ev(`wDays('${f[i - 1]}','${d}')`) === 7) })());
  ok('the saved plan fits the security-rule limits', P.blocks.length <= 300 && P.subjects.length <= 60);
  ok('the preview names the phases and dates', /Learn the syllabus/.test(txt(A, '#wiz')) && /Final stretch/.test(txt(A, '#wiz')) && /Follow it as it is, or change it/.test(txt(A, '#wiz')));

  /* ---- editing the preview ---- */
  wz(A, '[data-wz=day][data-v="0"]'); await sleep(5);
  const first = P.blocks.find(b => b.ph === A.ev('W.phSel') && b.days.includes(0));
  const rows0 = A.d.querySelectorAll('#wiz .wz-blk').length;
  ok('blocks of the chosen day and phase are listed to edit', rows0 === A.ev(`W.draft.plan.blocks.filter(b=>b.ph===W.phSel&&b.days.includes(0)).length`) && rows0 >= 2);
  setv(A, `#wiz [data-wb="${first.id}"][data-f=st]`, '09:15'); setv(A, `#wiz [data-wb="${first.id}"][data-f=m]`, '50');
  ok('changing the time and minutes changes the draft', A.ev(`W.draft.plan.blocks.find(b=>b.id==='${first.id}').st`) === '09:15' && A.ev(`W.draft.plan.blocks.find(b=>b.id==='${first.id}').m`) === 50);
  wz(A, `[data-wz=blkdel][data-id="${first.id}"]`); await sleep(5);
  ok('a block can be removed', A.d.querySelectorAll('#wiz .wz-blk').length === rows0 - 1);
  wz(A, '[data-wz=blkadd]'); await sleep(5);
  ok('a block can be added', A.d.querySelectorAll('#wiz .wz-blk').length === rows0);
  wz(A, '[data-wz=phase][data-v=final]'); await sleep(5);
  ok('the other phases can be viewed', A.ev('W.phSel') === 'final' && A.d.querySelectorAll('#wiz .wz-blk').length >= 1);

  /* ---- accept ---- */
  A.ev('W.phSel="learn"');
  const blocksBefore = A.ev('W.draft.plan.blocks.length');
  next(A); await sleep(100);
  ok('the wizard closes after using the timetable', A.ev('W') === null && A.d.getElementById('wiz').hidden);
  ok('the plan is now the course plan', A.ev('S.plan.exam') === examDate && A.ev('S.plan.blocks.length') === blocksBefore && A.ev('S.plan.subjects.length') > 5);
  ok('setup answers are saved with the plan for later rebuilds', A.ev('S.plan.setup.fam') === 'gate' && A.ev('S.plan.setup.hw') === 3 && A.ev('S.plan.setup.dateKind') === 'date');
  ok('study tools were saved', A.ev('S.plan.tools.length') === 3 && A.ev('S.plan.tools.map(t=>t.id).includes("yt")'));
  ok('alarms are switched on', A.ev('armed') === true);
  ok('the plan was written to this device', A.ev("(JSON.parse(localStorage.getItem('pl.plan'))||{}).exam") === examDate || (await sleep(500), A.ev("(JSON.parse(localStorage.getItem('pl.plan'))||{}).exam") === examDate));
  ok('Today shows the study tools card', /Study tools/.test(txt(A, '#view')) && A.d.querySelectorAll('#view .tool').length === 3);
  ok('header counts days to the date', /GATE DA · 180 days/.test(txt(A, '#count')));
  A.ev("tab='plan';render(false)");
  ok('Plan tab shows the phase buttons and only that phase\'s blocks', !!A.d.querySelector('[data-act=pph]') && /Learn the syllabus/.test(txt(A, '#view')));
  const todayBlocks = A.ev('blocksOn(S.plan,new Date()).length'), dowN = A.ev('dow(new Date())');
  ok('today\'s schedule only includes blocks of the phase that is live', A.ev('blocksOn(S.plan,new Date()).every(b=>b.ph==="learn")') && (dowN === 3 ? todayBlocks === 0 : todayBlocks >= 1));
  A.ev(`planPh='final';render(false)`);
  ok('another phase can be opened in the Plan tab', /Final stretch/.test(txt(A, '#view')) && A.d.querySelector('[data-act=pph][aria-pressed=true]').dataset.v === 'final');
  A.ev(`document.querySelector('[data-act=addblock]').click()`); await sleep(20);
  ok('a block added by hand while a phase is open belongs to that phase', (() => { A.ev(`document.querySelector('#sf button[type=submit]')&&0`); return A.ev('phaseTag().ph') === 'final'; })());
  A.ev('closeSheet(true)');

  /* ---- planner uses only the live phase's weekly sessions ---- */
  A.ev(`S.materials.push({id:'mm',title:'Book',subj:'${ml}',kind:'theory',unit:'pages',total:300,done:0,file:null,asset:null})`);
  const o1 = A.ev(`planner(S,new Date())[0].sessionsLeft`);
  const mlN = A.ev(`S.plan.blocks.filter(b=>b.ph==='learn'&&b.s==='${ml}'&&['theory','practice','revision'].includes(b.k)).length`), cd = 180 - A.ev('S.plan.buffer');
  ok('the planner counts one phase\'s sessions, not all three', o1 === Math.max(1, Math.round(mlN * cd / 7)));

  /* ---- Hindi ---- */
  A.ev("tab='today';render(false);setLang('hi')"); await sleep(50);
  A.ev("openWizard()"); await sleep(30);
  ok('the wizard follows the language', /\p{Script=Devanagari}/u.test(txt(A, '#wiz')) && /अपनी परीक्षा चुनें/.test(txt(A, '#wiz')));
  wz(A, '[data-wz=fam][data-v=neet]'); await sleep(10);
  ok('exam names and papers have Hindi', /नीट यूजी/.test(txt(A, '#wiz')) && /नीट पीजी/.test(txt(A, '#wiz')));
  wz(A, '[data-wz=var][data-v=ug]'); await sleep(10);
  ok('subjects have Hindi', /भौतिकी/.test(txt(A, '#wiz')) && /वनस्पति विज्ञान/.test(txt(A, '#wiz')));
  A.ev("closeWizard();setLang('en')");

  /* ---- no script errors ---- */
  ok('no script errors', A.errs.length === 0 || (console.log(A.errs), false));
  console.log('\n' + n + ' wizard tests passed');
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
