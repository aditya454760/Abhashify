// More wizard tests: generator properties, study-tool tracking, phone usage import, rebuilding on a date change,
// and creating a new course while signed in.
const assert = require('assert');
const H = require('./asst-harness');
const { makeBackend, makeFake } = require('./fake-firebase');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../../docs/index.html', 'utf8');
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; console.log('ok -', name); };
const sleep = H.sleep;
const txt = (A, sel) => { const e = A.d.querySelector(sel || 'body'); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script,style').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' '); };
const wz = (A, sel) => { const e = A.d.querySelectorAll('#wiz ' + sel)[0]; if (!e) throw new Error('missing in wizard: ' + sel); e.dispatchEvent(new A.w.MouseEvent('click', { bubbles: true })); };
const setv = (A, sel, v, ev) => { const e = A.d.querySelector(sel); if (!e) throw new Error('missing ' + sel); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new A.w.Event(ev || 'change', { bubbles: true })); };
const setVis = (A, v) => { Object.defineProperty(A.d, 'visibilityState', { value: v, configurable: true }); A.d.dispatchEvent(new A.w.Event('visibilitychange')); };

// click through the whole wizard for one exam
async function runWizard(A, o) {
  wz(A, `[data-wz=fam][data-v=${o.fam}]`); wz(A, `[data-wz=var][data-v=${o.vr}]`); await sleep(10);
  for (const [g, nm] of (o.picks || [])) wz(A, `[data-wz=pick][data-g="${g}"][data-n="${nm}"]`);
  wz(A, '[data-wz=next]'); await sleep(10);   // -> perms
  wz(A, '[data-wz=next]'); await sleep(10);   // -> tools
  wz(A, '[data-wz=next]'); await sleep(10);   // -> when
  setv(A, '#wiz [data-wf=dDate]', A.ev(`ymd(addDays(new Date(),${o.days}))`)); setv(A, '#wiz [data-wf=confirmed]', true);
  wz(A, '[data-wz=next]'); await sleep(10);   // -> comfort
  if (o.hw) setv(A, '#wiz [data-wf=hw]', String(o.hw));
  if (o.he) setv(A, '#wiz [data-wf=he]', String(o.he));
  wz(A, '[data-wz=next]'); await sleep(30);   // -> plan
}

(async () => {
  /* ---- the generator across many random setups ---- */
  let A = await H.open({});
  const res = A.ev(`(()=>{
    let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
    const pick=a=>a[Math.floor(rnd()*a.length)];
    const out={runs:0,thrown:0,overlap:0,tile:0,bounds:0,limit:0,noSubj:0,hours:0,errs:[]};
    const per=['early','morning','afternoon','evening','night'];
    for(let i=0;i<300;i++){
      const ns=1+Math.floor(rnd()*14),subs=[];for(let k=0;k<ns;k++)subs.push({name:'S'+k,w:1+Math.floor(rnd()*5),c:1+Math.floor(rnd()*5)});
      const D=8+Math.floor(rnd()*700),ps=per.filter(()=>rnd()<.5);if(!ps.length)ps.push(pick(per));
      const off=[0,1,2,3,4,5,6].filter(()=>rnd()<.15);
      const cfg={start:ymd(new Date()),end:ymd(addDays(new Date(),D)),subjects:subs,hw:.5+Math.floor(rnd()*20)/2,he:.5+Math.floor(rnd()*20)/2,off,periods:ps,sess:pick([45,60,90,120]),cover:Math.floor(rnd()*3),mock:{m:pick([60,120,180]),marks:100},mocks:rnd()<.8,alarm:true};
      cfg.hw=Math.min(cfg.hw,14);cfg.he=Math.min(cfg.he,14);
      out.runs++;let g;
      try{g=genPlan(cfg)}catch(e){out.thrown++;if(!/too many|Leave at least/.test(e.message))out.errs.push(e.message);continue}
      const P=g.plan;
      if(P.blocks.length>280||P.subjects.length>60)out.limit++;
      // phases tile the dates
      let cur=cfg.start;for(const p of g.phases){if(p.from!==cur)out.tile++;cur=ymd(addDays(parseYmd(p.to),1))}
      if(cur!==cfg.end)out.tile++;
      for(const p of g.phases)for(let d=0;d<7;d++){
        const bl=P.blocks.filter(b=>b.ph===p.id&&b.days.includes(d)).sort((a,b)=>toMin(a.st)-toMin(b.st));
        for(let k=0;k<bl.length;k++){
          const s=toMin(bl[k].st),e=s+bl[k].m;
          if(s<0||e>1440||bl[k].m<5)out.bounds++;
          if(k&&s<toMin(bl[k-1].st)+bl[k-1].m)out.overlap++;
          if(off.includes(d))out.hours++;
        }
      }
      if(P.blocks.some(b=>!P.subjects.find(s=>s.id===b.s)))out.noSubj++;
    }
    return JSON.stringify(out)})()`);
  const R = JSON.parse(res);
  console.log(res);
  ok('300 random setups: no unexpected errors', R.errs.length === 0);
  ok('no blocks overlap, none leave the day, none on a rest day', R.overlap === 0 && R.bounds === 0 && R.hours === 0);
  ok('phases always tile the dates from start to the end date', R.tile === 0);
  ok('plans stay within the stored limits (280 blocks)', R.limit === 0);
  ok('every block refers to a subject that exists', R.noSubj === 0);
  ok('only the "too many sessions" case is refused', R.thrown < R.runs);
  // short horizons
  for (const [D, cover] of [[8, 0], [14, 0], [20, 1], [29, 0], [45, 2]]) {
    const r = A.ev(`(()=>{const g=genPlan({start:ymd(new Date()),end:ymd(addDays(new Date(),${D})),subjects:[{name:'A',w:4,c:2},{name:'B',w:3,c:3},{name:'C',w:5,c:3}],hw:4,he:6,off:[],periods:['morning','evening'],sess:90,cover:${cover},mock:{m:180,marks:100},mocks:true,alarm:true});return JSON.stringify({ph:g.phases.map(p=>p.id),n:g.plan.blocks.length,w:g.warnings.length})})()`);
    const o = JSON.parse(r);
    ok(`${D} days (cover ${cover}) still gives a plan: ${o.ph.join('+')}`, o.n > 0 && o.ph.length >= 1 && (D < 28 ? !o.ph.includes('learn') : true));
  }
  ok('the end date has to be after the start', (() => { try { A.ev(`genPlan({start:ymd(new Date()),end:ymd(new Date()),subjects:[{name:'A'}],hw:2,he:2,periods:['morning']})`); return false } catch (e) { return /after the start/.test(e.message) } })());
  ok('too many sessions is explained, not stored', (() => { try { A.ev(`genPlan({start:ymd(new Date()),end:ymd(addDays(new Date(),400)),subjects:Array.from({length:30},(_,i)=>({name:'S'+i,w:3,c:3})),hw:14,he:14,off:[],periods:['early','morning','afternoon','evening','night'],sess:45,cover:0,mock:{m:60,marks:100},mocks:true})`); return false } catch (e) { return /too many|separate weekly sessions/.test(e.message) } })());
  ok('more subjects than weekly sessions: the lowest-priority ones are named in a warning', (() => { const g = JSON.parse(A.ev(`(()=>{const g=genPlan({start:ymd(new Date()),end:ymd(addDays(new Date(),90)),subjects:Array.from({length:12},(_,i)=>({name:'S'+i,w:1+(i%5),c:3})),hw:.5,he:.5,off:[0,1,2,3,4],periods:['morning'],sess:60,cover:0,mock:{m:60,marks:100},mocks:false});return JSON.stringify({w:g.warnings,n:g.plan.blocks.length})})()`)); return g.w.some(x => /do not fit/.test(x)) && g.n <= 6 * 3 })());

  /* ---- study tools: opening, tracking, logging ---- */
  A = await H.open({});
  A.ev(`S.plan=Object.assign(defaultPlan(),{subjects:[{id:'ml',name:'Machine Learning',w:4,c:3},{id:'la',name:'Linear Algebra',w:3,c:3}],tools:[{id:'yt',name:'YouTube',url:'https://www.youtube.com',pkg:'com.google.android.youtube'},{id:'nptel',name:'NPTEL',url:'https://nptel.ac.in',pkg:''}]});render(false);openLink=function(h){window.__opened=h};0`);
  ok('the Today screen lists the tools', A.d.querySelectorAll('#view .tool').length === 2);
  ok('with tracking off, the card offers to turn it on', !!A.d.querySelector('[data-act=trackon]'));
  A.ev("openTool('nptel')");
  ok('with tracking off, opening a tool only opens it', A.ev('__opened') === 'https://nptel.ac.in' && A.ev("lsGet('pl.toolrun',null)") === null);
  A.click('[data-act=trackon]'); await sleep(10);
  ok('turning tracking on is remembered on this device', A.ev('trackOn()') === true && A.ev("localStorage.getItem('pl.track')") === 'true');
  ok('the card stops offering once it is on', !A.d.querySelector('#view [data-act=trackon]'));
  A.ev(`S.plan.blocks.push({id:'nowb',days:[dow(new Date())],st:fromMin(Math.max(0,new Date().getHours()*60+new Date().getMinutes()-5)),m:90,s:'ml',k:'theory',sh:0,al:false,t:''})`);
  A.ev("openTool('yt')");
  const tr = A.ev("lsGet('pl.toolrun',null)");
  ok('opening with tracking on starts a tool run, tied to the block that is on now', A.ev('__opened') === 'https://www.youtube.com' && tr && tr.tid === 'yt' && tr.s === 'ml' && tr.b === 'nowb');
  setVis(A, 'visible'); await sleep(300);
  ok('staying on the page (never left) logs nothing', A.ev('S.logs.length') === 0 && A.ev("lsGet('pl.toolrun',null)") !== null);
  setVis(A, 'hidden');
  ok('leaving the page marks the run as away', A.ev("lsGet('pl.toolrun',null).hid") === 1);
  A.ev("(()=>{const t=lsGet('pl.toolrun',null);t.t0-=47*60000;lsSet('pl.toolrun',t)})()");
  setVis(A, 'visible'); await sleep(400);
  ok('coming back logs the time without asking', A.ev('S.logs.length') === 1 && A.ev('S.logs[0].tool') === 'yt' && A.ev('S.logs[0].src') === 'tool' && Math.abs(A.ev('S.logs[0].m') - 47) <= 1);
  ok('the log gets the subject of the block', A.ev('S.logs[0].s') === 'ml' && A.ev('S.logs[0].b') === 'nowb');
  ok('the run is cleared', A.ev("lsGet('pl.toolrun',null)") === null);
  ok('Today shows what was logged, with undo', /Logged 47m in YouTube/.test(txt(A, '#view')) && !!A.d.querySelector('[data-act=toolundo]'));
  A.d.querySelector('[data-act=toolsubj]').value = 'la'; A.d.querySelector('[data-act=toolsubj]').dispatchEvent(new A.w.Event('change', { bubbles: true })); await sleep(10);
  ok('the subject can be corrected in one tap', A.ev('S.logs[0].s') === 'la');
  ok('the report shows time by tool', (A.ev("tab='report';render(false)"), /Study tools this week/.test(txt(A, '#view')) && /YouTube/.test(txt(A, '#view'))));
  A.ev("tab='today';render(false)");
  A.click('[data-act=toolundo]'); await sleep(10);
  ok('undo removes the log', A.ev('S.logs.length') === 0);
  // too short, too long, timer running
  const quick = async (back, mutate) => { A.ev("openTool('yt')"); setVis(A, 'hidden'); A.ev(`(()=>{const t=lsGet('pl.toolrun',null);if(t){t.t0-=${back}*60000;lsSet('pl.toolrun',t)}})()`); if (mutate) mutate(); setVis(A, 'visible'); await sleep(400); };
  await quick(1);
  ok('under 2 minutes is not logged', A.ev('S.logs.length') === 0 && A.ev("lsGet('pl.toolrun',null)") === null);
  await quick(600);
  ok('over 8 hours is not logged (probably forgot to come back)', A.ev('S.logs.length') === 0);
  A.ev("run={b:null,s:'ml',t0:Date.now(),st:'10:00',ps:null,pm:null};0");
  A.ev("openTool('yt')");
  ok('while a session timer runs, no second run is started', A.ev("lsGet('pl.toolrun',null)") === null);
  A.ev("run=null;0");
  A.ev("setTrack(false)"); await quick(30);
  ok('tracking off after a run started: nothing is logged', A.ev('S.logs.length') === 0);
  A.ev("setTrack(true)");
  // reload while away: the run survives in storage
  A.ev("openTool('yt')"); setVis(A, 'hidden');
  A.ev("(()=>{const t=lsGet('pl.toolrun',null);t.t0-=20*60000;lsSet('pl.toolrun',t)})()");
  const store = {}; for (const k of ['pl.plan', 'pl.toolrun', 'pl.track', 'pl.device', 'pl.mode']) { const v = A.ev(`localStorage.getItem('${k}')`); if (v != null) store[k] = v; }
  store['pl.mode'] = '"local"';
  const B = await H.open({ store }); await sleep(1700);
  ok('if the browser was closed meanwhile, the run is logged on the next start', B.ev('S.logs.length') === 1 && B.ev('S.logs[0].tool') === 'yt' || (await sleep(800), B.ev('S.logs.length') === 1));
  // links
  A.ev(`Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile',configurable:true});0`);
  const hrefY = A.ev("toolHref(S.plan.tools[0])"), hrefN = A.ev("toolHref(S.plan.tools[1])");
  ok('on Android a known app opens through an intent link, falling back to the website', hrefY === 'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=' + encodeURIComponent('https://www.youtube.com') + ';end');
  ok('a tool with no app is just its link', hrefN === 'https://nptel.ac.in');
  ok('adding a tool checks the link', (() => { for (const bad of ['', 'x', 'javascript:alert(1)', 'ftp://a.b']) { try { A.ev(`addTool('A',${JSON.stringify(bad)},[])`); if (bad !== 'x' && bad !== '') return false; } catch (e) { } } return true })());
  ok('javascript: links are refused', (() => { try { A.ev(`addTool('A','javascript:alert(1)',[])`); return false } catch (e) { return true } })());

  /* ---- notifications when the page is in the background ---- */
  A.ev(`window.__n=[];Object.defineProperty(window,'Notification',{value:Object.assign(function(t,o){__n.push([t,o&&o.body])},{permission:'granted',requestPermission:async()=>'granted'}),configurable:true});0`);
  setVis(A, 'visible');
  ok('no banner while the page is open', (A.ev("notify('Hi','x','t')"), A.ev('__n.length') === 0));
  setVis(A, 'hidden'); const sent = await A.w.eval("notify('Time to study','06:30','t')");
  ok('a banner appears when the page is in the background and notifications are allowed', sent === true && A.ev('__n.length') === 1);
  A.ev(`window.Notification.permission='denied'`);
  ok('and none when they are blocked', (await A.w.eval("notify('x','y','z')")) === false);
  setVis(A, 'visible');

  /* ---- importing the Android companion's usage file ---- */
  A = await H.open({});
  A.ev(`S.plan=Object.assign(defaultPlan(),{subjects:[{id:'ml',name:'ML',w:3,c:3}],tools:[{id:'yt',name:'YouTube',url:'https://www.youtube.com',pkg:'com.google.android.youtube'}]});render(false);0`);
  const d1 = A.ev('ymd(addDays(new Date(),-2))'), d2 = A.ev('ymd(addDays(new Date(),-1))');
  const usage = { source: 'abhyashify-usage', generated: '2026-10-08T00:00:00Z', days: [{ date: d1, study_minutes: 95, apps: [{ package: 'com.google.android.youtube', label: 'YouTube', minutes: 60 }, { package: 'org.example.notes', label: 'Notes', minutes: 35 }] }, { date: d2, study_minutes: 20, apps: [{ package: 'com.google.android.youtube', label: 'YouTube', minutes: 20 }] }] };
  let r1 = A.ev(`JSON.stringify(importUsage(${JSON.stringify(usage)}))`);
  ok('usage import adds one entry per app per day', JSON.parse(r1).apps === 3 && JSON.parse(r1).days === 2 && A.ev('S.logs.length') === 3);
  ok('known apps map to their tool, unknown ones keep their label', A.ev("S.logs.filter(l=>l.tool==='yt').length") === 2 && A.ev("S.logs.some(l=>l.tool==='Notes')"));
  ok('entries are marked as phone time, filled from midnight and stacked', A.ev("S.logs.every(l=>l.src==='phone')") && A.ev(`S.logs.filter(l=>l.d==='${d1}').map(l=>l.st+'/'+l.m).join()`) === '00:00/60,01:00/35');
  usage.days[1].apps[0].minutes = 25;
  A.ev(`importUsage(${JSON.stringify(usage)})`);
  ok('importing again updates instead of duplicating', A.ev('S.logs.length') === 3 && A.ev(`S.logs.find(l=>l.d==='${d2}').m`) === 25);
  ok('a file that is not a usage file is refused', (() => { for (const bad of [{}, { source: 'x', days: [] }, null, { source: 'abhyashify-usage' }]) { try { A.ev(`importUsage(${JSON.stringify(bad)})`); return false } catch (e) { } } return true })());
  ok('phone time counts towards the day but not the time-of-day chart', (() => { const r = A.ev(`(()=>{const w=weekReport(VS(),weekStart(new Date()),new Date());return JSON.stringify({a:w.actH.reduce((x,y)=>x+y,0)})})()`); return JSON.parse(r).a === 0 })());
  // through the file input
  A.ev("toolsSheet()"); await sleep(30);
  ok('the tools sheet explains the import', /Import the usage file/.test(txt(A, '#sheet')));
  const inp = A.d.getElementById('usef');
  Object.defineProperty(inp, 'files', { value: [new A.w.File([JSON.stringify(usage)], 'u.json', { type: 'application/json' })], configurable: true });
  inp.dispatchEvent(new A.w.Event('change', { bubbles: true })); await sleep(200);
  ok('picking the file imports it', /Imported 3 entries over 2 days/.test(txt(A, '#toast')));
  A.ev('closeSheet(true)');

  /* ---- cloud records stay inside the security rules ---- */
  const chk = A.ev(`(()=>{CL={uid:'u1',email:'a@b'};const l=ensureT({id:'x',d:'2026-10-01',st:'10:00',m:30,b:null,s:'ml',ps:null,pm:null,q:0,mid:null,mu:0,t0:Date.now(),t1:Date.now()+1800000,dev:'d-abc',src:'tool',tz:330,tool:'yt'});
    const d=logDoc(l),back=docLog('x',d);CL=null;return JSON.stringify({keys:Object.keys(d),src:d.source,dev:d.device,back:{tool:back.tool,src:back.src,dev:back.dev}})})()`);
  const cd = JSON.parse(chk);
  ok('a tool session is stored with only the fields and values the rules allow', cd.keys.every(k => ['uid', 's', 'e', 'subj', 'block', 'planStart', 'sheets', 'device', 'source', 'mid', 'mu', 'tz'].includes(k)) && ['manual', 'timer', 'phone', 'laptop', 'tablet'].includes(cd.src) && cd.dev.length <= 64);
  ok('and comes back with its tool', cd.back.tool === 'yt' && cd.back.src === 'tool' && cd.back.dev === 'd-abc');

  /* ---- rebuilding the timetable when the exam date changes ---- */
  A = await H.open({});
  A.click('[data-act=wiz]'); await sleep(20);
  await runWizard(A, { fam: 'gate', vr: 'da', days: 120 });
  wz(A, '[data-wz=next]'); await sleep(60);
  ok('wizard done for the rebuild test', A.ev('S.plan.setup&&S.plan.setup.fam') === 'gate');
  A.ev(`S.plan.blocks.push({id:'mine',days:[1],st:'21:30',m:30,s:S.plan.subjects[0].id,k:'other',sh:0,al:false,t:'Gym',man:true});S.plan.tests.find(t=>t.gen).score=70;S.plan.tests.find(t=>t.gen).marks=100;0`);
  const scoredId = A.ev('S.plan.tests.find(t=>t.score!=null).id'), genBefore = A.ev('S.plan.blocks.filter(b=>b.ph).length');
  const newEx = A.ev('ymd(addDays(new Date(),200))');
  A.ev('settingsForm()'); await sleep(20);
  ok('Settings offers to rebuild when a plan came from the setup', !!A.d.querySelector('#sheet [name=reb]') && /Set up the course again/.test(txt(A, '#sheet')));
  setv(A, '#sheet [name=ex]', newEx);
  A.d.getElementById('sf').dispatchEvent(new A.w.Event('submit', { bubbles: true, cancelable: true })); await sleep(100);
  ok('the new date is saved', A.ev('S.plan.exam') === newEx);
  ok('the generated blocks follow the new date', A.ev('S.plan.phases[S.plan.phases.length-1].to') === A.ev(`ymd(addDays(parseYmd('${newEx}'),-1))`) && A.ev('S.plan.phases[0].from') === A.ev('ymd(new Date())'));
  ok('blocks I added myself are kept', A.ev("S.plan.blocks.some(b=>b.id==='mine')"));
  ok('a test with a score is kept', A.ev(`S.plan.tests.some(t=>t.id==='${scoredId}')`));
  ok('old generated blocks are gone (no duplicates)', A.ev('S.plan.blocks.filter(b=>b.ph).length') <= genBefore * 2 && A.ev('new Set(S.plan.blocks.filter(b=>b.ph).map(b=>b.id)).size') === A.ev('S.plan.blocks.filter(b=>b.ph).length'));
  ok('the toast says the timetable was rebuilt', /Timetable rebuilt/.test(txt(A, '#toast')));
  // a date too close is refused and nothing changes
  const before = A.ev('JSON.stringify(S.plan.phases)');
  A.ev('settingsForm()'); await sleep(20);
  setv(A, '#sheet [name=ex]', A.ev('ymd(addDays(new Date(),2))'));
  A.d.getElementById('sf').dispatchEvent(new A.w.Event('submit', { bubbles: true, cancelable: true })); await sleep(100);
  ok('a date under a week away is refused when rebuilding, and the plan is untouched', /at least a week/.test(txt(A, '#sferr')) && A.ev('JSON.stringify(S.plan.phases)') === before && A.ev('S.plan.exam') === newEx);
  A.ev('closeSheet(true)');
  // "not sure" date shows a placeholder note
  A.ev("S.plan.setup.dateKind='typical';render(false)");
  ok('a placeholder date is flagged on the Today screen', /placeholder/.test(txt(A, '#view')));

  /* ---- Set up again (redo) warns and replaces ---- */
  A.ev('openWizard()'); await sleep(20);
  ok('running the setup again warns what will be replaced', A.ev('W.ctx') === 'redo' && /replaces your current subjects/.test(txt(A, '#wiz')) && !A.d.querySelector('#wiz [data-wz=skip]'));
  A.ev('closeWizard()');

  /* ---- skip: build my own ---- */
  const E = await H.open({});
  E.click('[data-act=wiz]'); await sleep(20); wz(E, '[data-wz=skip]'); await sleep(30);
  ok('skipping the setup gives the old empty start', E.ev('W') === null && E.ev('S.plan.subjects.length') === 1 && E.ev('tab') === 'plan');
  const F = await H.open({});
  F.click('[data-act=blank]'); await sleep(30);
  ok('"Start empty" still works', F.ev('S.plan.subjects.length') === 1);

  /* ---- discarding the wizard ---- */
  const G = await H.open({});
  G.click('[data-act=wiz]'); await sleep(20); wz(G, '[data-wz=fam][data-v=jee]'); await sleep(10);
  wz(G, '[data-wz=close]'); await sleep(10);
  ok('closing mid-way asks once more before discarding', G.ev('W') !== null && /Discard/.test(txt(G, '#wiz')));
  wz(G, '[data-wz=close]'); await sleep(10);
  ok('the second tap discards it', G.ev('W') === null && G.ev('S.plan.subjects.length') === 0 && !!G.d.querySelector('[data-act=wiz]'));

  /* ---- signed in: a new course gets the full setup ---- */
  const be = makeBackend();
  const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(e.message)); vc.on('error', e => errs.push('console.error ' + e));
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} }); w.scrollTo = () => {}; } });
  const fb = makeFake(be, 'A'); fb._user = { uid: 'u-1', email: 'a@x.test' };
  dom.window.__fbResolve(fb);
  const C = { w: dom.window, d: dom.window.document, ev: c => dom.window.eval(c), click: sel => { const el = dom.window.document.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) } };
  await sleep(200); C.click('[data-act=signin]'); await sleep(600);
  ok('signed in with an empty course: the front page offers the setup', !!C.d.querySelector('[data-act=wiz]'));
  C.click('[data-act=wiz]'); await sleep(20);
  await runWizard(C, { fam: 'upsc', vr: 'cse', picks: [[0, 'Geography']], days: 300, hw: 5, he: 7 });
  const plan0 = C.ev('W.draft.plan');
  ok('UPSC full course: optional subject and its phases', plan0.subjects.some(s => s.name === 'Geography') && C.ev('W.draft.phases.length') === 3);
  C.ev("W.courseName='UPSC 2027'");
  wz(C, '[data-wz=next]'); await sleep(500);
  ok('onboarding in a signed-in course saves the plan and renames the course', C.ev('S.plan.setup.fam') === 'upsc' && C.ev('CL.name') === 'UPSC 2027');
  const cid1 = C.ev('CL.cid');
  const doc1 = be.docs.get('courses/' + cid1);
  ok('the course document in the database holds the plan, within the limits', doc1 && doc1.plan.blocks.length > 20 && doc1.plan.blocks.length <= 300 && doc1.name === 'UPSC 2027' && doc1.plan.setup.fam === 'upsc' && doc1.plan.tools.length === 0);
  // a second course via the account sheet
  C.click('[data-act=acct]'); await sleep(30); C.click('[data-act=newcourse]'); await sleep(30);
  ok('"New course" opens the setup, not a name box', C.ev('W&&W.ctx') === 'newcourse' && !C.d.querySelector('#sheet:not([hidden]) input[name=n]'));
  await runWizard(C, { fam: 'ssc', vr: 'cgl', days: 150 });
  ok('a new course asks for its name on the last step', !!C.d.querySelector('#wiz [data-wf=courseName]') && C.d.querySelector('#wiz [data-wf=courseName]').value === 'SSC CGL');
  setv(C, '#wiz [data-wf=courseName]', 'SSC CGL 2027', 'input');
  wz(C, '[data-wz=next]'); await sleep(900);
  const cid2 = C.ev('CL.cid');
  ok('the new course is opened with its plan', cid2 !== cid1 && C.ev('S.plan.setup.fam') === 'ssc' && C.ev('CL.name') === 'SSC CGL 2027' && C.ev('S.plan.blocks.length') > 10);
  ok('the first course is untouched', be.docs.get('courses/' + cid1).plan.setup.fam === 'upsc');
  ok('both courses are listed', C.ev('CL.courses.length') === 2);
  C.click('[data-act=acct]'); await sleep(30); C.click('[data-act=newcourse]'); await sleep(30);
  wz(C, '[data-wz=skip]'); await sleep(40);
  ok('skipping in a new course falls back to the plain name box', !!C.d.querySelector('#sheet input[name=n]'));
  ok('no script errors in the signed-in run', errs.length === 0 || (console.log(errs), false));
  ok('no script errors', A.errs.length === 0 && E.errs.length === 0 && G.errs.length === 0 || (console.log(A.errs, E.errs, G.errs), false));
  console.log('\n' + n + ' wizard (part 2) tests passed');
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
