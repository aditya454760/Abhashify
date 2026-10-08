const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), assert = require('assert');
const { makeBackend, makeFake } = require('./fake-firebase');
const html = fs.readFileSync(__dirname + '/../../docs/index.html', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
function open(be, label, user, noFb) {
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(label + ' ' + e.message)); vc.on('error', e => errs.push(label + ' console.error ' + e));
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} }); w.scrollTo = () => {}; } });
  const fb = makeFake(be, label); if (user) fb._user = user;
  dom.window.__fbResolve(noFb ? null : fb);
  return { w: dom.window, d: dom.window.document, fb, ev: c => dom.window.eval(c), click: sel => { const el = dom.window.document.querySelector(sel); if (!el) throw new Error(label + ' missing ' + sel); el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) } };
}
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };
const mk = (id, day, h, m, mins) => `S.logs.push(ensureT({id:'${id}',d:'${day}',st:'${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}',m:${mins},b:null,s:'ml',ps:null,pm:null,q:0,mid:null,mu:0,dev:'dev-${id}',src:'manual',tz:330}));mark('logs')`;
(async () => {
  const be = makeBackend();
  const A = open(be, 'A'); await sleep(200);
  ok('signed-out user sees the sign-in screen', A.d.getElementById('view').textContent.includes('Sign in with Google'));
  A.click('[data-act=signin]'); await sleep(500);
  ok('signing in creates a course and shows onboarding', /Set up your course/.test(A.d.getElementById('view').textContent));
  ok('course doc created for the right owner', [...be.docs.entries()].some(([k, v]) => k.startsWith('courses/') && k.split('/').length === 2 && v.ownerUid === 'u-aditya' && Array.isArray(v.members)));
  A.ev('applyTemplate()'); await sleep(300);
  ok('template saved to the course plan', [...be.docs.values()].some(v => v.plan && v.plan.subjects && v.plan.subjects.length === 9));
  // log a session through the real form
  const today = A.ev('ymd(new Date())');
  A.click('[data-act=log][data-b=""]'); await sleep(50);
  A.d.querySelector('#sf [name=m]').value = '30'; A.d.querySelector('#sf [name=st]').value = '07:00';
  A.d.getElementById('sf').dispatchEvent(new A.w.Event('submit', { cancelable: true, bubbles: true })); await sleep(400);
  const sess = [...be.docs.entries()].filter(([k]) => k.includes('/sessions/'));
  ok('session written under people/{uid}/sessions', sess.length === 1 && sess[0][0].includes('/people/u-aditya/sessions/'));
  ok('session has epoch times and device info', sess[0][1].e - sess[0][1].s === 30 * 60000 && /^d-/.test(sess[0][1].device) && sess[0][1].source === 'manual');
  // second device, same account
  const B = open(be, 'B'); await sleep(200); B.click('[data-act=signin]'); await sleep(600);
  ok('device B loads the same course and plan', B.ev('S.plan.subjects.length') === 9);
  ok('device B sees the session from device A', B.ev('S.logs.length') === 1);
  // overlapping log from device B (same time) in the same course
  B.ev(mk('b1', today, 7, 0, 30)); await sleep(400);
  ok('device A receives the overlapping session live', A.ev('S.logs.length') === 2);
  ok('overlap counted once (30 min, not 60)', Math.round(A.ev('LG().reduce((x,l)=>x+l.m,0)')) === 30);
  ok('raw minutes are still kept for the note', Math.round(A.ev('LG().reduce((x,l)=>x+l.mRaw,0)')) === 60);
  B.ev(mk('b2', today, 8, 0, 20)); await sleep(300);
  ok('non-overlapping time adds up (50 min)', Math.round(A.ev('LG().reduce((x,l)=>x+l.m,0)')) === 50);
  // delete on B reaches A
  B.ev("S.logs=S.logs.filter(l=>l.id!=='b2');mark('logs')"); await sleep(400);
  ok('a deletion on B reaches A', A.ev('S.logs.length') === 2);
  // material progress
  A.ev("S.materials.push({id:'m1',title:'Bishop PRML',subj:'ml',kind:'theory',unit:'pages',total:700,done:10,file:null,asset:null});mark('materials')"); await sleep(400);
  ok('material syncs to device B', B.ev("S.materials.length===1&&S.materials[0].title==='Bishop PRML'"));
  // a second course never merges with the first
  const c1 = A.ev('CL.cid');
  A.ev("(async()=>{const id=await createCourse('DSA');CL.courses.push({id,name:'DSA'});await openCourse(id)})()"); await sleep(600);
  ok('a new course starts empty (no time shared across courses)', A.ev('S.logs.length') === 0 && A.ev('CL.cid') !== c1);
  A.ev("S.plan.subjects=[{id:'x',name:'Trees',w:3,c:3}];mark('plan')"); await sleep(200);
  A.ev("S.logs.push(ensureT({id:'z1',d:'" + today + "',st:'07:00',m:30,b:null,s:'x',ps:null,pm:null,q:0,mid:null,mu:0,dev:'d1',src:'manual',tz:330}));mark('logs')"); await sleep(300);
  ok('same hour in a different course counts in full', Math.round(A.ev('LG().reduce((x,l)=>x+l.m,0)')) === 30);
  // writes the "rules" would refuse are undone, not silently kept
  A.ev("S.logs.push(ensureT({id:'bad1',d:'" + today + "',st:'09:00',m:30,b:null,s:'x',ps:null,pm:null,q:0,mid:null,mu:0,dev:'d1',src:'hacker',tz:330}));mark('logs')"); await sleep(500);
  ok('a rejected write is reverted in the UI', !A.ev("S.logs.some(l=>l.id==='bad1')"));
  // another person cannot read or write this data
  const C = open(be, 'C', { uid: 'u-other', email: 'other@example.com' }); await sleep(200); C.click('[data-act=signin]'); await sleep(600);
  ok('another account starts with its own empty course', C.ev('S.logs.length') === 0 && C.ev('CL.cid') !== c1);
  let blocked = false; try { await C.fb.setDoc(C.fb.doc(C.fb.db, 'courses', c1, 'people', 'u-aditya', 'sessions', 'evil'), { uid: 'u-aditya', s: 1, e: 2, device: 'x', source: 'manual' }) } catch (e) { blocked = e.code === 'permission-denied' }
  ok('another account cannot write into this account', blocked);
  // no Firebase at all: the app still works on this device only
  const L = open(be, 'L', null, true); await sleep(300);
  ok('without Firebase the app opens in this-device mode', /Set up your course/.test(L.d.getElementById('view').textContent) && L.ev('CL')===null);
  L.ev('applyTemplate()'); await sleep(600);
  ok('local mode saves to this device', JSON.parse(L.w.localStorage.getItem('pl.plan')).subjects.length === 9);
  const real = errs.filter(e => !/bad source/.test(e));
  ok('no unexpected script errors', real.length === 0 || (console.log(real), false));
  console.log(n + ' sync tests passed'); process.exit(0);
})().catch(e => { console.log('FAIL', e.message, errs); process.exit(1); });
