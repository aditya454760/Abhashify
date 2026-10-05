
/* ---------- local-only state ---------- */
let run=lsGet('pl.run',null);
let armed=false,wakeLock=null,audioCtx=null,snoozes={},fired=lsGet('pl.fired',{});
let tab='today',weekOffset=0,matFilter='left',matOrder=true;
let selIdx=dow(new Date()),planDay=dow(new Date());
let theme=lsGet('pl.theme','auto');
function applyTheme(){const r=document.documentElement;if(theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',theme)}

/* ---------- UI helpers ---------- */
const ic=(n,c)=>`<svg class="ic${c?' '+c:''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const subjName=id=>(S.plan.subjects.find(s=>s.id===id)||{name:'Other'}).name;
const cvar=id=>{const i=Math.max(0,S.plan.subjects.findIndex(s=>s.id===id));return `--c:hsl(${(i*47+215)%360} 58% var(--sl))`};
const subjChip=id=>`<span class="chip" style="${cvar(id)}"><span class="dot"></span>${esc(subjName(id))}</span>`;
const subjOpts=sel=>S.plan.subjects.map(s=>`<option value="${esc(s.id)}"${s.id===sel?' selected':''}>${esc(s.name)}</option>`).join('');
const kindOpts=(o,sel)=>Object.entries(o).map(([k,v])=>`<option value="${k}"${k===sel?' selected':''}>${esc(v)}</option>`).join('');
const blockTitle=b=>b.t||(subjName(b.s)+' · '+KINDS[b.k]);
const endTime=b=>fromMin(toMin(b.st)+b.m);
const loggedFor=(ds,bid)=>LG().filter(l=>l.d===ds&&l.b===bid).reduce((x,l)=>x+l.m,0);
const pct=(a,b)=>b>0?Math.max(0,Math.min(100,a/b*100)):0;
const KIC={theory:'book',practice:'target',revision:'spark',mock:'clock',other:'play'};
const tone=p=>p===null||p===undefined?'':p>=85?'good':p>=60?'warn':'bad';
const unitN=(n,u)=>n+' '+(n===1?String(u||'unit').replace(/s$/,''):(u||'units'));
const sheetsLabel=n=>n+(n===1?' sheet':' sheets');

function ringSvg(p,size,sw,cls){
  const r=(size-sw)/2,C=2*Math.PI*r,c=size/2;
  return `<svg class="rsvg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="rt" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>
    <circle class="rf ${cls||''}" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}" data-off="${(C*(1-Math.max(0,Math.min(100,p))/100)).toFixed(2)}" transform="rotate(-90 ${c} ${c})"/></svg>`;
}
function animateIn(anim){
  const go=()=>{
    document.querySelectorAll('#view .rf[data-off]').forEach(e=>{e.style.strokeDashoffset=e.dataset.off});
    document.querySelectorAll('#view .meter i[data-w]').forEach(e=>{e.style.width=e.dataset.w+'%'});
  };
  if(anim)requestAnimationFrame(()=>requestAnimationFrame(go));else go();
}
function blockStatus(b,ds,today,nowMin){
  const done=loggedFor(ds,b.id);
  if(done>=b.m*.8)return 'done';
  if(ds===today&&run&&run.b===b.id)return 'live';
  const s=toMin(b.st);
  if(ds<today||(ds===today&&nowMin>=s+b.m))return done>0?'partial':'missed';
  if(ds===today&&nowMin>=s)return 'due';
  return 'later';
}
const STCHIP={
  done:()=>`<span class="st good">${ic('check')}Done</span>`,
  live:()=>`<span class="st acc"><span class="pulse"></span>Running</span>`,
  missed:()=>`<span class="st bad">${ic('x')}Missed</span>`,
  partial:()=>`<span class="st warn">${ic('clock')}Partly done</span>`,
  due:()=>`<span class="st warn">${ic('clock')}Due now</span>`,
  later:()=>`<span class="st">Planned</span>`,
};
function blockCard(b,ds,today,nowMin,order){
  const done=loggedFor(ds,b.id),st=blockStatus(b,ds,today,nowMin),nx=nextFor(order,b),isToday=ds===today;
  const meta=`${fmtDur(b.m)}${b.sh?' · '+sheetsLabel(b.sh):''}${done?' · '+fmtDur(done)+' logged':''}`;
  let acts='';
  if(st!=='done'&&st!=='live'){
    if(isToday)acts=`<button class="btn sm" type="button" data-act="start" data-b="${b.id}">${ic('play')}Start</button><button class="btn sm soft" type="button" data-act="log" data-b="${b.id}" data-d="${ds}">Log time</button>`;
    else if(ds<today)acts=`<button class="btn sm soft" type="button" data-act="log" data-b="${b.id}" data-d="${ds}">Log it now</button>`;
  }
  return `<article class="blk${st==='done'?' done':''}" style="${cvar(b.s)}">
    <div class="tm"><b>${b.st}</b><span>${endTime(b)}</span></div>
    <div class="bd"><div class="tt"><h3>${esc(blockTitle(b))}</h3></div>${STCHIP[st]()}
      <span class="bs">${meta}</span>
      ${nx&&st!=='done'?`<span class="dn">${ic(KIC[b.k]||'book')}<span>${esc(nx.m.title)}${nx.chunk?` · ${esc(unitN(nx.chunk,nx.m.unit))}`:''}</span></span>`:''}</div>
    ${acts?`<div class="ba">${acts}</div>`:''}</article>`;
}

/* ---------- header, tabs, mini timer ---------- */
function paintHeader(){
  const c=document.getElementById('count');
  if(S.plan.exam){
    const d=Math.round((parseYmd(S.plan.exam)-parseYmd(ymd(new Date())))/864e5);
    c.hidden=false;c.textContent=(S.plan.examName||'Exam')+' · '+(d>=0?d+' days':'done');
  }else c.hidden=true;
  const ac=document.getElementById('acct');if(ac)ac.innerHTML=CL?esc((CL.email||'?').charAt(0).toUpperCase()):ic('user');
  if(ac)ac.setAttribute('aria-label',CL?'Account: '+CL.email:'Account');
  const b=document.getElementById('bell');b.setAttribute('aria-pressed',armed);b.setAttribute('aria-label',armed?'Alarms on. Tap to turn off':'Alarms off. Tap to turn on');
}
function paintTabs(){
  const T=[['today','Today','today'],['plan','Plan','plan'],['materials','Materials','book'],['report','Report','report']];
  document.getElementById('tabs').innerHTML=T.map(([k,l,i])=>`<button type="button" data-act="tab" data-v="${k}"${tab===k?' aria-current="page"':''}>${ic(i)}${l}</button>`).join('');
}
function paintMini(){
  const m=document.getElementById('mini');
  if(!run||tab==='today'){m.hidden=true;m.dataset.k='';return}
  const key=String(run.t0);
  if(m.hidden||m.dataset.k!==key){
    m.dataset.k=key;
    m.innerHTML=`<span class="pulse" style="background:var(--accent-ink);opacity:.9"></span><div class="mi"><b>${esc(run.s?subjName(run.s):'Extra session')}</b><span class="clk" id="mclock">00:00:00</span></div><button class="btn sm stopb" type="button" data-act="stop">${ic('stop')}Stop</button>`;
    m.hidden=false;
  }
}
function paintGate(){
  const v=document.getElementById('view');v.className='view enter';
  if(GATE==='loading'){v.innerHTML='<div class="sk"><i style="height:150px"></i><i style="height:78px"></i><i style="height:92px"></i></div>';return}
  v.innerHTML=`<section class="card" style="gap:16px;margin-top:8vh"><span class="tile-ic" style="--c:var(--accent)">${ic('today')}</span>
    <div class="stack"><h1>Prep Ledger</h1><p class="muted">Plan your study blocks, get alarms, log your hours and see how you did each week. Sign in and your progress follows you across phone, tablet and laptop.</p></div>
    <button class="btn lg" type="button" data-act="signin">Sign in with Google</button>
    <button class="btn lg ghost" type="button" data-act="local">Continue on this device only</button>
    <p class="small muted">Your data is private to your account. Only you can read it.</p></section>`;
}
function render(anim){
  if(anim===undefined)anim=true;
  _eff=null;
  document.body.classList.toggle('gate',!!GATE);
  paintHeader();
  if(GATE){document.getElementById('mini').hidden=true;paintGate();return}
  paintTabs();paintMini();
  const v=document.getElementById('view');
  v.className='view';
  v.innerHTML=({today:vToday,plan:vPlan,materials:vMaterials,report:vReport}[tab])()+`<p class="foot" id="savestat">${esc(saveText())}</p>`;
  if(anim){void v.offsetWidth;v.classList.add('enter')}
  animateIn(anim);tickTimer();
}

/* ---------- views ---------- */
function onboarding(){
  return `<div class="card" style="gap:14px"><span class="tile-ic" style="--c:var(--accent)">${ic('spark')}</span><div class="stack"><h2>Set up your schedule</h2>
    <p class="muted">Prep Ledger rings an alarm for each study block, logs the hours you actually put in, checks them against your plan every week, and keeps track of what you have finished in your books and sheets.</p></div>
    <button class="btn lg" type="button" data-act="tpl">Start with the GATE DA 2027 template</button>
    <button class="btn lg ghost" type="button" data-act="blank">Start empty and build my own</button>
    <p class="small muted">The template sets the exam date to 6 February 2027 and adds a weekly timetable with nine subjects. Change anything afterwards.</p></div>`;
}
function vToday(){
  if(!S.plan.subjects.length&&!S.plan.blocks.length)return onboarding();
  const now=new Date(),today=ymd(now),nowMin=now.getHours()*60+now.getMinutes(),ws=weekStart(now);
  const sd=addDays(ws,selIdx),ds=ymd(sd),isToday=ds===today;
  const blocks=blocksOn(S.plan,sd),order=planner(S,now);
  const planned=blocks.reduce((x,b)=>x+b.m,0),logged=LG().filter(l=>l.d===ds).reduce((x,l)=>x+l.m,0);
  const hr=now.getHours(),greet=hr<5?'Late night':hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const dateTxt=sd.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  let h=`<div class="stack" style="gap:2px"><h1>${isToday?greet:DAYS_LONG[selIdx]}</h1><p class="muted">${isToday?dateTxt:sd.toLocaleDateString(undefined,{day:'numeric',month:'long'})+(ds<today?' · past':' · upcoming')}</p></div>`;

  h+=`<div class="strip" role="group" aria-label="Days of this week">`+DAYS.map((n,i)=>{
    const d=addDays(ws,i),k=ymd(d),bl=blocksOn(S.plan,d),P=bl.reduce((x,b)=>x+b.m,0),L=LG().filter(l=>l.d===k).reduce((x,l)=>x+l.m,0);
    return `<button type="button" class="dayb" data-act="sel" data-v="${i}" aria-pressed="${i===selIdx}" aria-label="${DAYS_LONG[i]} ${d.getDate()}"><small>${n}</small><span class="dayn${k===today?' today':''}${P?'':' off'}" style="--p:${P?pct(L,P):0}"><span>${d.getDate()}</span></span></button>`;
  }).join('')+`</div>`;

  const sts=blocks.map(b=>blockStatus(b,ds,today,nowMin)),doneN=sts.filter(s=>s==='done').length;
  let ringP=pct(logged,planned),center=`<b>${fmtDur(logged)}</b><span>of ${fmtDur(planned)}</span>`,cls=planned&&logged>=planned?'good':'',txt='',heroCls='';
  if(isToday&&run){
    const el=(Date.now()-run.t0)/60000;heroCls=' run';ringP=run.pm?pct(el,run.pm):100;cls='';
    center=`<span class="clk" id="clock">00:00:00</span><span>${run.pm?'of '+fmtDur(run.pm):'in progress'}</span>`;
    txt=`<span class="kick">Session running</span><h2>${esc(run.s?subjName(run.s):'Extra session')}</h2><p class="muted small">Started ${run.st}${run.pm?' · planned '+fmtDur(run.pm):''}</p>
      <button class="btn stopb" type="button" data-act="stop">${ic('stop')}Stop and log</button>`;
  }else if(isToday){
    const nb=blocks.find((b,i)=>sts[i]==='due'||sts[i]==='later'),ni=nb?blocks.indexOf(nb):-1;
    if(!blocks.length)txt=`<span class="kick">Free day</span><h2>Nothing scheduled</h2><p class="muted small">Log an extra session if you study anyway.</p>`;
    else if(nb)txt=`<span class="kick">${sts[ni]==='due'?'Due now':'Up next'}</span><h2>${esc(blockTitle(nb))}</h2><p class="muted small">${nb.st} · ${fmtDur(nb.m)}${sts[ni]==='later'?' · in '+fmtDur(toMin(nb.st)-nowMin):''}</p>
      <button class="btn" type="button" data-act="start" data-b="${nb.id}">${ic('play')}Start now</button>`;
    else if(doneN===blocks.length)txt=`<span class="kick">Day complete</span><h2>All blocks done</h2><p class="muted small">${fmtDur(logged)} logged today. Rest well.</p>`;
    else txt=`<span class="kick">Day wrapped up</span><h2>${doneN} of ${blocks.length} blocks done</h2><p class="muted small">Log a missed block below to keep the report honest.</p>`;
  }else if(ds<today)txt=`<span class="kick">Review</span><h2>${doneN} of ${blocks.length} blocks done</h2><p class="muted small">${fmtDur(logged)} logged of ${fmtDur(planned)} planned.</p>`;
  else txt=`<span class="kick">Planned</span><h2>${blocks.length?blocks.length+(blocks.length>1?' blocks':' block'):'Free day'}</h2><p class="muted small">${planned?fmtDur(planned)+' of study planned.':'Nothing scheduled.'}</p>`;
  h+=`<section class="card hero${heroCls}"><div class="hero-ring">${ringSvg(ringP,112,10,cls)}<div class="hero-ringl">${center}</div></div><div class="hero-tx">${txt}</div></section>`;

  if(blocks.length){
    h+=`<div class="stack" style="gap:10px"><div class="sec-h"><h3>Schedule</h3><span class="small muted">${blocks.length} ${blocks.length>1?'blocks':'block'}</span></div><div class="blist">`+blocks.map(b=>blockCard(b,ds,today,nowMin,order)).join('')+`</div></div>`;
  }
  if(isToday)h+=`<button class="btn lg soft" type="button" data-act="log" data-b="" data-d="${ds}">${ic('plus')}Log an extra session</button>`;

  const seen=new Set(),nextUp=order.filter(o=>!seen.has(o.m.subj)&&seen.add(o.m.subj)).slice(0,4);
  if(isToday&&nextUp.length)h+=`<section class="card"><div class="stack"><h3>Study next</h3><p class="small muted">Ordered by importance, your confidence, what is left and what needs to come first.</p></div>`+
    nextUp.map((o,i)=>`<div class="item" style="${cvar(o.m.subj)};grid-template-columns:auto 1fr"><span class="num">${i+1}</span><div class="stack" style="gap:3px;min-width:0"><span class="t">${esc(o.m.title)}</span><span class="small muted">${subjChip(o.m.subj)}${o.chunk?` <span style="margin-left:4px">about ${esc(unitN(o.chunk,o.m.unit))} per session</span>`:''}</span></div></div>`).join('')+`</section>`;
  if(isToday&&S.plan.blocks.length)h+=`<section class="card"><div class="row"><span class="tile-ic" style="--c:var(--accent)">${ic('bell')}</span><div class="grow"><h3>Alarms</h3><p class="small muted">${armed?'On. The alarm rings on this screen at the start of each block.':'Turn on to hear an alarm for each block while this page is open.'}</p></div></div>
    <div class="row"><button class="btn sm ${armed?'ghost':''}" type="button" data-act="arm" style="flex:1">${armed?'Turn off':'Turn on alarms'}</button>${armed?`<button class="btn sm soft" type="button" data-act="testsound" style="flex:1">Test sound</button>`:''}</div></section>`;
  return h;
}

function vPlan(){
  let h=`<div class="sec-h"><h1>Plan</h1><button class="btn sm" type="button" data-act="addblock">${ic('plus')}Add block</button></div>`;
  if(!S.plan.subjects.length&&!S.plan.blocks.length)return h+onboarding();
  h+=`<div class="seg" role="group" aria-label="Day">`+DAYS.map((d,i)=>`<button type="button" data-act="pday" data-v="${i}" aria-pressed="${i===planDay}">${d}</button>`).join('')+`</div>`;
  const bl=S.plan.blocks.filter(b=>b.days.includes(planDay)).sort((a,b)=>toMin(a.st)-toMin(b.st));
  h+=`<div class="stack" style="gap:10px"><div class="sec-h"><h3>${DAYS_LONG[planDay]}</h3><span class="small muted">${fmtDur(bl.reduce((x,b)=>x+b.m,0))} planned</span></div><div class="blist">`+
    (bl.length?bl.map(b=>`<button type="button" class="blk pl" style="${cvar(b.s)}" data-act="editblock" data-b="${b.id}"><div class="tm"><b>${b.st}</b><span>${endTime(b)}</span></div>
      <div class="bd"><h3>${esc(blockTitle(b))}</h3><span class="bs">${fmtDur(b.m)}${b.sh?' · '+sheetsLabel(b.sh):''} · ${b.al?'alarm '+(S.plan.lead||0)+' min early':'no alarm'}</span></div>${ic('chev')}</button>`).join(''):
      `<div class="card flat empty">${ic('plan')}<p class="muted">Free day. Tap Add block to schedule something.</p></div>`)+`</div></div>`;

  const by={};let tot=0;for(const b of S.plan.blocks){const m=b.m*b.days.length;by[b.s]=(by[b.s]||0)+m;tot+=m}
  const ents=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  if(ents.length)h+=`<section class="card"><div class="sec-h"><h3>Week at a glance</h3><span class="small muted">${fmtDur(tot)}</span></div>
    <div class="stackbar">`+ents.map(([id,m])=>`<i style="${cvar(id)};flex:${m} 1 0"></i>`).join('')+`</div>
    <div class="legend">`+ents.map(([id,m])=>`<span class="chip" style="${cvar(id)}"><span class="dot"></span>${esc(subjName(id))} · ${fmtDur(m)}</span>`).join('')+`</div></section>`;

  const pips=n=>`<span class="pips">${[1,2,3,4,5].map(i=>`<i${i<=n?' class="on"':''}></i>`).join('')}</span>`;
  h+=`<section class="card"><div class="sec-h"><div class="stack" style="gap:2px"><h3>Subjects</h3><p class="small muted">Importance and confidence decide what the planner puts first.</p></div><button class="btn sm soft" type="button" data-act="addsubj">${ic('plus')}Add</button></div>`+
    S.plan.subjects.map(s=>`<button type="button" class="item" data-act="editsubj" data-s="${esc(s.id)}" style="${cvar(s.id)};grid-template-columns:1fr auto"><span class="stack" style="gap:6px"><span class="t">${subjChip(s.id)}</span><span class="small muted row" style="gap:14px"><span class="row" style="gap:6px">Importance ${pips(s.w)}</span><span class="row" style="gap:6px">Confidence ${pips(s.c)}</span></span></span>${ic('chev')}</button>`).join('')+`</section>`;
  h+=`<button class="btn lg ghost" type="button" data-act="settings">${ic('sliders')}Exam date, appearance, exports</button>`;
  h+=`<section class="card flat aboutapp">${ic('spark')}<p class="small muted">A web page cannot see what you do in other apps, so this app counts what you log or time here. For alarms that ring when this page is closed, export the schedule to your calendar from Settings. Automatic tracking of other apps is done by the Android companion app.</p></section>`;
  return h;
}

function matPct(m){return m.total>0?pct(m.done,m.total):(m.done>0?100:0)}
const stepOf=m=>m.unit==='pages'?10:1;
function vMaterials(){
  const order=planner(S,new Date()),rank=new Map(order.map((o,i)=>[o.m.id,i+1]));
  const total=S.materials.length,doneN=S.materials.filter(m=>m.total>0&&m.done>=m.total).length;
  const avg=total?S.materials.reduce((x,m)=>x+matPct(m),0)/total:0;
  let list=S.materials.slice();
  if(matFilter==='left')list=list.filter(m=>!(m.total>0&&m.done>=m.total));
  if(matFilter==='done')list=list.filter(m=>m.total>0&&m.done>=m.total);
  if(matOrder&&matFilter!=='done')list.sort((a,b)=>(rank.get(a.id)||999)-(rank.get(b.id)||999));
  let h=`<div class="sec-h"><h1>Materials</h1><button class="btn sm" type="button" data-act="addmat">${ic('plus')}Add</button></div>`;
  if(!total)return h+`<div class="card empty">${ic('book')}<h3>Nothing here yet</h3><p class="muted">Add books, PDFs, practice sheets or images. Set how many pages or questions each has, then update your progress as you go.</p><button class="btn" type="button" data-act="addmat">${ic('upload')}Add your first material</button></div>`;
  h+=`<section class="card hero" style="gap:16px"><div class="hero-ring" style="width:84px;height:84px">${ringSvg(avg,84,8,tone(avg)==='good'?'good':'')}<div class="hero-ringl"><b style="font-size:1.05rem">${Math.round(avg)}%</b></div></div>
    <div class="hero-tx"><h2>${doneN} of ${total} complete</h2><p class="muted small">${total-doneN} left. The list below is ordered by what to study next.</p></div></section>`;
  h+=`<div class="seg" role="group" aria-label="Filter">`+[['left','Left'],['done','Done'],['all','All']].map(([k,l])=>`<button type="button" data-act="filter" data-v="${k}" aria-pressed="${matFilter===k}">${l}</button>`).join('')+
    `<button type="button" data-act="order" aria-pressed="${matOrder}">${ic('spark','sm')} Suggested order</button></div>`;
  h+=`<section class="card" style="gap:2px">`+(list.length?list.map(m=>{
    const p=matPct(m),o=order.find(x=>x.m.id===m.id),isImg=(m.type||'').startsWith('image/'),fin=m.total>0&&m.done>=m.total;
    const icon=isImg?'image':m.kind==='sheet'?'target':m.kind==='mock'?'clock':m.kind==='notes'?'file':'book';
    return `<div class="item" style="${cvar(m.subj)};grid-template-columns:auto 1fr auto"><span class="tile-ic">${ic(icon)}</span>
      <button type="button" class="item-main" data-act="editmat" data-m="${m.id}"><span class="t">${matOrder&&rank.get(m.id)&&!fin?`<span class="num" style="margin-right:6px">${rank.get(m.id)}</span>`:''}${esc(m.title)}</span>
      <span class="small muted">${esc(subjName(m.subj))} · ${m.total>0?`${m.done}/${m.total} ${esc(m.unit||'units')}`:'total not set'}${o&&o.chunk?` · ~${o.chunk} per session`:''}</span>
      <span class="meter ${fin?'good':''}"><i data-w="${p}"></i></span></button>
      <div class="stack" style="align-items:flex-end">${/^https?:\/\//i.test(m.file||'')?`<a class="icb sm" href="${esc(m.file)}" target="_blank" rel="noopener noreferrer" aria-label="Open link">${ic('open','sm')}</a>`:''}${fin?`<span class="st good">${ic('check')}</span>`:`<button class="btn sm soft" type="button" data-act="step" data-m="${m.id}" aria-label="Add ${stepOf(m)} ${esc(m.unit||'units')}">+${stepOf(m)}</button>`}</div></div>`;
  }).join(''):`<div class="empty">${ic('check')}<p class="muted">Nothing here.</p></div>`)+`</section>`;
  return h;
}

function vReport(){
  const now=new Date(),ws=addDays(weekStart(now),weekOffset*7),r=weekReport(VS(),ws,now),we=addDays(ws,6);
  const f=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short'});
  let h=`<div class="wk"><button class="icb" type="button" data-act="wk" data-v="-1" aria-label="Previous week" style="transform:rotate(180deg)">${ic('chev')}</button>
    <div class="mid"><h1 style="font-size:1.35rem">Weekly report</h1><p class="small muted">${f(ws)} to ${f(we)}${weekOffset===0?' · so far':''}</p></div>
    <button class="icb" type="button" data-act="wk" data-v="1" aria-label="Next week"${weekOffset>=0?' disabled style="opacity:.35"':''}>${ic('chev')}</button></div>`;
  if(!S.plan.blocks.length&&!S.logs.length)return h+`<div class="card empty">${ic('report')}<p class="muted">Add a schedule and log a session. The report compares your hours, sheets and start times with the plan.</p></div>`;
  const sc=r.score;
  h+=`<section class="card"><div class="scorebox"><div class="hero-ring" style="width:116px;height:116px">${ringSvg(sc||0,116,11,tone(sc))}<div class="hero-ringl"><b style="font-size:1.7rem">${sc===null?'–':sc}</b><span>discipline</span></div></div>
    <p class="small muted">Half hours studied, a quarter practice sheets attempted, a quarter starting within 30 minutes of the plan.</p></div></section>`;
  const tile=(k,v,pc,sub)=>`<div class="tile"><span class="kick">${k}</span><span class="v">${v}</span><div class="meter ${tone(pc)}"><i data-w="${Math.min(100,pc||0)}"></i></div><span class="small muted">${sub}</span></div>`;
  h+=`<div class="tiles">`+tile('Hours',fmtDur(r.ta),r.hoursPct,'of '+fmtDur(r.td)+' due')+tile('Sheets',r.shA+' / '+r.shD,r.sheetsPct,'attempted of due')+tile('On time',r.tN?r.tOn+' / '+r.tN:'–',r.timingPct,r.tN?'sessions on plan':'no timed sessions')+`</div>`;
  const wkDays=new Set(r.days.map(d=>d.ds)),saved=LG().filter(l=>wkDays.has(l.d)).reduce((x,l)=>x+(l.mRaw-l.m),0);
  if(saved>=1)h+=`<p class="note">${ic('spark')}<span>${fmtDur(saved)} of overlapping time (for example the same hour logged on two devices) was counted once.</span></p>`;
  h+=`<p class="small muted" style="margin-top:-6px">Full week plan: ${fmtDur(r.tp)} and ${r.shT} sheets. Blocks completed: ${r.bHit} of ${r.bDue} due.</p>`;
  h+=`<section class="card"><h3>Hours per day</h3>${dayChart(r)}<p class="small muted">Dashed outline is planned, solid is logged.</p></section>`;
  const rows=Object.entries(r.bySub).filter(([,v])=>v.p||v.a||v.sh||v.shA);
  if(rows.length)h+=`<section class="card"><h3>By subject</h3>`+rows.map(([id,v])=>`<div class="stack" style="gap:7px"><div class="row between">${subjChip(id)}<span class="small muted">${fmtDur(v.a)} / ${fmtDur(v.p)}${v.sh||v.shA?' · '+v.shA+'/'+v.sh+' sheets':''}</span></div><div class="meter ${tone(v.p?pct(v.a,v.p):null)}"><i data-w="${pct(v.a,v.p)}"></i></div></div>`).join('')+`</section>`;
  h+=`<section class="card"><h3>Study time of day</h3>${hourChart(r)}<p class="small muted">Dashed is when the plan puts study, solid is when you studied.${r.avgShift!==null?` Sessions started ${Math.abs(Math.round(r.avgShift))} minutes ${r.avgShift>=0?'later':'earlier'} than planned on average.`:''}</p></section>`;
  if(r.sessions.length)h+=`<section class="card"><h3>Planned and actual start</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Day</th><th>Subject</th><th>Plan</th><th>Actual</th><th>Shift</th></tr></thead><tbody>`+
    r.sessions.map(s=>`<tr><td>${DAYS[dow(parseYmd(s.d))]}</td><td>${esc(subjName(s.s))}</td><td>${s.ps}</td><td>${s.st}</td><td>${s.diff>0?'+':''}${s.diff}m</td></tr>`).join('')+`</tbody></table></div></section>`;
  const tips=coach(r);
  if(tips.length)h+=`<section class="card"><h3>What to change</h3>`+tips.map(t=>`<p class="note">${ic('spark')}<span>${esc(t)}</span></p>`).join('')+`</section>`;
  h+=`<button class="btn lg ghost" type="button" data-act="copyrep">Copy report as text</button>`;
  return h;
}
function coach(r){
  const t=[];
  if(r.hoursPct!==null&&r.hoursPct<75){
    const gap=Object.entries(r.bySub).map(([id,v])=>[id,v.p-v.a]).sort((a,b)=>b[1]-a[1])[0];
    t.push(`You are ${fmtDur(r.td-r.ta)} behind the plan so far.${gap&&gap[1]>0?` The biggest gap is ${subjName(gap[0])}, ${fmtDur(gap[1])} short.`:''}`);
  }
  if(r.sheetsPct!==null&&r.sheetsPct<75)t.push(`${r.shD-r.shA} practice sheets are still owed this week. Do them before starting new theory.`);
  if(r.avgShift!==null&&r.avgShift>20)t.push(`You start about ${Math.round(r.avgShift)} minutes late on average. Move the alarm earlier or shift those blocks to a time you actually keep.`);
  const best=r.actH.reduce((b,v,i)=>v>r.actH[b]?i:b,0);
  if(r.actH[best]>0)t.push(`Most of your study this week happened around ${pad(best)}:00. Put the hardest subject there.`);
  if(!t.length&&r.td)t.push('You are on plan. Keep the same blocks next week.');
  return t;
}
function dayChart(r){
  const W=340,H=170,L=26,B=22,T=10,iw=W-L-6,ih=H-B-T;
  const max=Math.max(1,Math.ceil(Math.max(...r.days.map(d=>Math.max(d.p,d.a)))/60));
  const y=v=>T+ih-(v/60)/max*ih,bw=iw/7*0.62;
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Planned and logged hours per day">`;
  for(let g=0;g<=max;g++){const yy=T+ih-g/max*ih;s+=`<line class="axis" x1="${L}" x2="${W-6}" y1="${yy}" y2="${yy}"/><text x="${L-4}" y="${yy+3}" text-anchor="end">${g}h</text>`}
  r.days.forEach((d,i)=>{
    const x=L+iw/7*i+(iw/7-bw)/2;
    if(d.a>0)s+=`<rect class="b-act" x="${x}" y="${y(d.a)}" width="${bw}" height="${Math.max(0,T+ih-y(d.a))}" rx="4"/>`;
    if(d.p>0)s+=`<rect class="b-plan" x="${x}" y="${y(d.p)}" width="${bw}" height="${Math.max(0,T+ih-y(d.p))}" rx="4"/>`;
    s+=`<text x="${x+bw/2}" y="${H-7}" text-anchor="middle">${d.label}</text>`;
  });
  return s+`</svg>`;
}
function hourChart(r){
  const lo=5,hi=23,n=hi-lo+1,W=340,H=120,L=6,B=18,T=6,iw=W-L-6,ih=H-B-T,bw=iw/n;
  const max=Math.max(60,...r.planH.slice(lo,hi+1),...r.actH.slice(lo,hi+1));
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Minutes studied by hour of day">`;
  s+=`<line class="axis" x1="${L}" x2="${W-6}" y1="${T+ih}" y2="${T+ih}"/>`;
  for(let h=lo;h<=hi;h++){
    const x=L+(h-lo)*bw+1,w=bw-2,ph=r.planH[h]/max*ih,ah=r.actH[h]/max*ih;
    if(r.actH[h]>0)s+=`<rect class="b-act" x="${x}" y="${T+ih-ah}" width="${w}" height="${ah}" rx="2"/>`;
    if(r.planH[h]>0)s+=`<rect class="b-plan" x="${x}" y="${T+ih-ph}" width="${w}" height="${ph}" rx="2"/>`;
    if((h-lo)%3===0)s+=`<text x="${x+w/2}" y="${H-5}" text-anchor="middle">${pad(h)}</text>`;
  }
  return s+`</svg>`;
}
function reportText(){
  const now=new Date(),ws=addDays(weekStart(now),weekOffset*7),r=weekReport(VS(),ws,now);
  const L=[`Weekly report, week of ${ymd(ws)}`,`Hours: ${fmtDur(r.ta)} of ${fmtDur(r.td)} due (full week plan ${fmtDur(r.tp)})`,`Sheets: ${r.shA} of ${r.shD} due`,
    `Started within 30 min of plan: ${r.tOn} of ${r.tN} sessions`,`Discipline score: ${r.score===null?'n/a':r.score}`,''];
  for(const [id,v] of Object.entries(r.bySub))L.push(`${subjName(id)}: ${fmtDur(v.a)} of ${fmtDur(v.p)}, sheets ${v.shA} of ${v.sh}`);
  return L.join('\n');
}
