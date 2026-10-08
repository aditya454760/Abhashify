/* ---------- tests, mock tests and reminders (stored inside the course plan) ---------- */
const PT=()=>S.plan.tests||(S.plan.tests=[]);
const PR=()=>S.plan.reminders||(S.plan.reminders=[]);
const TKINDS={mock:'Mock test',test:'Test'};
const REPS={'':'Does not repeat',daily:'Every day',weekdays:'Every weekday',weekly:'Every week'};
const testStart=t=>{const d=new Date(t.date+'T'+(t.st||'09:00')+':00').getTime();return isNaN(d)?0:d};
const timeTxt=d=>LANG==='hi'?periodHi(d.getHours())+' '+(d.getHours()%12||12)+':'+pad(d.getMinutes()):d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
function whenTxt(ms){
  const d=new Date(ms),t0=parseYmd(ymd(new Date())),d0=parseYmd(ymd(d)),diff=Math.round((d0-t0)/864e5);
  const day=diff===0?H('Today','आज'):diff===1?H('Tomorrow','कल'):diff===-1?H('Yesterday','बीता कल'):d.toLocaleDateString(LOC(),{weekday:'short',day:'numeric',month:'short'});
  return day+', '+timeTxt(d);
}
function nextAt(at,rep){
  const d=new Date(at);let guard=0;
  do{d.setDate(d.getDate()+(rep==='weekly'?7:1));guard++}while(guard<400&&(d.getTime()<=Date.now()||(rep==='weekdays'&&(d.getDay()===0||d.getDay()===6))));
  return d.getTime();
}
const pctTxt=t=>t.score!=null&&t.marks>0?Math.round(t.score/t.marks*100)+'%':'';
const toLocalInput=ms=>{const d=new Date(ms);return {date:ymd(d),time:pad(d.getHours())+':'+pad(d.getMinutes())}};

function reminderForm(r){
  const now=Date.now()+3600000;
  const f=r?toLocalInput(r.at):toLocalInput(now-now%900000+900000);
  r=r||{id:'',text:'',kind:'reminder',rep:''};
  openSheet(r.id?'Edit reminder':'New reminder or alarm',`<label class="field">What for<input type="text" name="tx" value="${esc(r.text)}" maxlength="120" placeholder="Revise ML notes" required></label>
    <div class="grid2"><label class="field">Date<input type="date" name="d" value="${f.date}" required></label><label class="field">Time<input type="time" name="t" value="${f.time}" required></label></div>
    <div class="grid2"><label class="field">Type<select name="k"><option value="reminder"${r.kind==='reminder'?' selected':''}>Reminder</option><option value="alarm"${r.kind==='alarm'?' selected':''}>Alarm</option></select></label>
    <label class="field">Repeat<select name="rep">${Object.entries(REPS).map(([k,v])=>`<option value="${k}"${(r.rep||'')===k?' selected':''}>${v}</option>`).join('')}</select></label></div>
    <p class="small muted">It rings on this screen while the page is open and alarms are turned on.</p>
    <button class="btn lg" type="submit">${r.id?'Save':'Add'}</button>${r.id?`<button class="btn lg danger" type="button" data-act="delrem" data-r="${r.id}">Delete</button>`:''}`,fd=>{
    const at=new Date(fd.get('d')+'T'+fd.get('t')+':00').getTime();need(!isNaN(at),'Enter a valid date and time.');
    const nr={id:r.id||uid(),text:need((fd.get('tx')||'').trim(),'Say what it is for.').slice(0,120),at,kind:fd.get('k')==='alarm'?'alarm':'reminder',rep:fd.get('rep')||null,done:false};
    const i=PR().findIndex(x=>x.id===nr.id);if(i<0)PR().push(nr);else PR()[i]=nr;
    mark('plan');closeSheet();render(false);toast('Saved for '+whenTxt(at));
  });
}
function testForm(t){
  const nowT=new Date(Date.now()+86400000);
  t=t||{id:'',title:'',kind:'mock',subj:'',date:ymd(nowT),st:'10:00',m:180,marks:100,al:true,score:null};
  openSheet(t.id?'Edit test':'New test or mock test',`<label class="field">Name<input type="text" name="ti" value="${esc(t.title)}" maxlength="80" placeholder="Full mock 1" required></label>
    <div class="grid2"><label class="field">Type<select name="k">${Object.entries(TKINDS).map(([k,v])=>`<option value="${k}"${t.kind===k?' selected':''}>${v}</option>`).join('')}</select></label>
    <label class="field">Subject<select name="s"><option value="">All subjects</option>${subjOpts(t.subj)}</select></label></div>
    <div class="grid2"><label class="field">Date<input type="date" name="d" value="${esc(t.date)}" required></label><label class="field">Start<input type="time" name="st" value="${esc(t.st)}" required></label></div>
    <div class="grid2"><label class="field">Minutes<input type="number" name="m" min="10" max="360" value="${t.m}" inputmode="numeric"></label><label class="field">Total marks<input type="number" name="mk" min="1" max="1000" value="${t.marks}" inputmode="numeric"></label></div>
    <div class="presets">${[60,90,120,180].map(n=>`<button type="button" class="pre" data-fill="m" data-val="${n}">${fmtDur(n)}</button>`).join('')}</div>
    ${t.id?`<label class="field">Marks scored (leave empty if not taken)<input type="number" name="sc" min="0" step="0.25" value="${t.score==null?'':t.score}" inputmode="decimal"></label>`:''}
    ${switchRow('Ring an alarm before it starts','al',t.al)}
    <button class="btn lg" type="submit">${t.id?'Save':'Add'}</button>${t.id?`<button class="btn lg danger" type="button" data-act="deltest" data-t="${t.id}">Delete</button>`:''}`,fd=>{
    const nt={id:t.id||uid(),title:need((fd.get('ti')||'').trim(),'Give it a name.').slice(0,80),kind:fd.get('k')==='test'?'test':'mock',subj:fd.get('s')||'',date:fd.get('d'),st:fd.get('st'),
      m:Math.min(360,Math.max(10,+fd.get('m')||180)),marks:Math.min(1000,Math.max(1,+fd.get('mk')||100)),al:fd.get('al')==='on',score:t.score??null};
    need(testStart(nt)>0,'Enter a valid date and time.');
    if(t.id){const v=fd.get('sc');nt.score=v===''||v===null?null:Math.min(nt.marks,Math.max(0,+v||0))}
    const i=PT().findIndex(x=>x.id===nt.id);if(i<0)PT().push(nt);else PT()[i]=nt;
    mark('plan');closeSheet();render(false);toast('Saved');
  });
}
function scoreForm(t){
  openSheet('How did it go?',`<p class="muted">${esc(t.title)}</p><div class="grid2"><label class="field">Marks scored<input type="number" name="sc" min="0" step="0.25" inputmode="decimal" required autofocus></label><label class="field">Out of<input type="number" name="mk" min="1" value="${t.marks}" inputmode="numeric"></label></div>
    <button class="btn lg" type="submit">Save score</button>`,fd=>{
    const mk=Math.max(1,+fd.get('mk')||t.marks),sc=Math.max(0,+fd.get('sc'));need(fd.get('sc')!==''&&!isNaN(sc),'Enter your marks.');
    t.marks=mk;t.score=Math.min(mk,sc);mark('plan');closeSheet();render(false);toast('Scored '+pctTxt(t));
  });
}
function startTest(t){
  run={b:null,s:t.subj||(S.plan.subjects[0]||{}).id,t0:Date.now(),st:pad(new Date().getHours())+':'+pad(new Date().getMinutes()),ps:null,pm:t.m,tid:t.id};
  lsSet('pl.run',run);selIdx=dow(new Date());tab='today';render();toast('Test timer started');
}

/* ---------- views ---------- */
function reminderRow(r){
  const late=!r.done&&r.at<Date.now()-10*60000,ic2=r.kind==='alarm'?'bell':'clock';
  return `<button type="button" class="item" data-act="editrem" data-r="${r.id}" style="grid-template-columns:auto 1fr auto"><span class="tile-ic" style="--c:var(--accent);width:34px;height:34px">${ic(ic2)}</span>
    <span class="stack" style="gap:2px;min-width:0"><span class="t">${esc(r.text)}</span><span class="small muted">${esc(whenTxt(r.at))}${r.rep?' · '+REPS[r.rep].toLowerCase():''}</span></span>
    ${r.done?'<span class="st good">Done</span>':late?'<span class="st bad">Missed</span>':ic('chev')}</button>`;
}
function testRow(t){
  const at=testStart(t),late=t.score==null&&at+t.m*60000<Date.now();
  return `<button type="button" class="item" data-act="edittest" data-t="${t.id}" style="grid-template-columns:auto 1fr auto"><span class="tile-ic" style="--c:var(--accent);width:34px;height:34px">${ic('target')}</span>
    <span class="stack" style="gap:2px;min-width:0"><span class="t">${esc(t.title)}</span><span class="small muted">${esc(whenTxt(at))} · ${fmtDur(t.m)}${t.subj?' · '+esc(subjName(t.subj)):''}</span></span>
    ${t.score!=null?`<span class="st ${tone(t.score/t.marks*100)}">${pctTxt(t)}</span>`:late?'<span class="st warn">Add score</span>':ic('chev')}</button>`;
}
function vUpcoming(){
  const now=Date.now(),lim=now+7*864e5;
  const rs=PR().filter(r=>!r.done&&r.at<=lim&&r.at>=now-864e5).map(r=>({at:r.at,h:reminderRow(r)}));
  const ts=PT().filter(t=>t.score==null&&testStart(t)<=lim+7*864e5&&testStart(t)+t.m*60000>=now-864e5).map(t=>({at:testStart(t),h:testRow(t)}));
  const all=rs.concat(ts).sort((a,b)=>a.at-b.at).slice(0,4);
  if(!all.length)return '';
  return `<section class="card" style="gap:2px"><div class="sec-h" style="margin-bottom:4px"><h3>Coming up</h3><button class="btn sm soft" type="button" data-act="tab" data-v="plan">All</button></div>${all.map(x=>x.h).join('')}</section>`;
}
function vTestsPlan(){
  const ts=PT().slice().sort((a,b)=>testStart(a)-testStart(b)),up=ts.filter(t=>t.score==null),past=ts.filter(t=>t.score!=null).reverse();
  const rs=PR().slice().sort((a,b)=>a.at-b.at);
  let h=`<section class="card" style="gap:2px"><div class="sec-h" style="margin-bottom:4px"><div class="stack" style="gap:2px"><h3>Tests and mock tests</h3><p class="small muted">Schedule them, time yourself, then record the score.</p></div><button class="btn sm soft" type="button" data-act="addtest">${ic('plus')}Add</button></div>`;
  h+=up.length?up.map(testRow).join(''):`<p class="small muted" style="padding:6px 0">No test scheduled.</p>`;
  if(up.some(t=>testStart(t)<=Date.now()+864e5&&t.score==null))h+=`<div class="row" style="margin-top:6px">`+`<button class="btn sm" type="button" data-act="starttest" data-t="${up.find(t=>testStart(t)<=Date.now()+864e5).id}" style="flex:1">${ic('play')}Start the test timer</button></div>`;
  if(past.length)h+=`<div class="kick" style="margin-top:10px">Taken</div>`+past.slice(0,5).map(testRow).join('');
  h+=`</section><section class="card" style="gap:2px"><div class="sec-h" style="margin-bottom:4px"><div class="stack" style="gap:2px"><h3>Reminders and alarms</h3><p class="small muted">One-off or repeating.</p></div><button class="btn sm soft" type="button" data-act="addrem">${ic('plus')}Add</button></div>`;
  h+=rs.length?rs.map(reminderRow).join(''):`<p class="small muted" style="padding:6px 0">None yet. You can also ask the assistant.</p>`;
  return h+`</section>`;
}
function vMockCard(){
  const sc=PT().filter(t=>t.score!=null&&t.marks>0).sort((a,b)=>testStart(a)-testStart(b));
  if(!sc.length)return '';
  const ps=sc.map(t=>t.score/t.marks*100),avg=ps.reduce((a,b)=>a+b,0)/ps.length,last=ps[ps.length-1],prev=ps.length>1?ps[ps.length-2]:null;
  const bars=sc.slice(-8).map((t,i,a)=>{const p=t.score/t.marks*100;return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0"><div style="height:80px;width:100%;display:flex;align-items:flex-end"><i style="display:block;width:100%;height:${Math.max(4,p)}%;border-radius:8px 8px 3px 3px;background:var(--accent);opacity:${i===a.length-1?1:.55}"></i></div><span class="small muted">${Math.round(p)}%</span></div>`}).join('');
  return `<section class="card"><div class="sec-h"><h3>Test scores</h3><span class="small muted">${sc.length} taken · average ${Math.round(avg)}%</span></div><div style="display:flex;gap:8px">${bars}</div>
    <p class="small muted">${prev===null?'Latest':'Latest is '+(last>=prev?'up ':'down ')+Math.abs(Math.round(last-prev))+' points on the one before. Latest'}: ${esc(sc[sc.length-1].title)}, ${Math.round(last)}%.</p></section>`;
}

/* ---------- alarms for reminders and tests ---------- */
function ringItem(o){
  const el=document.getElementById('alarm');
  el.innerHTML=`<div class="alarm-card" role="alertdialog" aria-label="${esc(o.kicker)}"><span class="alarm-ring">${ic('bell')}</span><span class="kick">${esc(o.kicker)}</span><h2>${esc(o.title)}</h2><div class="big">${esc(o.time)}</div>${o.sub?`<p class="muted">${esc(o.sub)}</p>`:''}${o.main||''}
    <div class="grid2" style="width:100%">${o.side}</div></div>`;
  el.hidden=false;beep();clearInterval(ringTimer);let n=0;ringTimer=setInterval(()=>{if(++n>40)return stopRing();beep()},2200);
  if(window.AsstSpeak&&o.say)AsstSpeak(o.say);
  notify(o.title,(o.kicker||'')+(o.time?' · '+o.time:''),'x|'+o.title);
}
function ringReminder(r){
  ringItem({kicker:r.kind==='alarm'?'Alarm':'Reminder',title:r.text,time:timeTxt(new Date(r.at)),sub:r.rep?REPS[r.rep]:'',say:r.kind==='alarm'?'Alarm. '+r.text:'Reminder. '+r.text,
    main:`<button class="btn lg" type="button" data-act="remdone" data-r="${r.id}">${ic('check')}Done</button>`,
    side:`<button class="btn ghost" type="button" data-act="rsnooze" data-r="${r.id}">Snooze 10 min</button><button class="btn ghost" type="button" data-act="dismiss">Dismiss</button>`});
}
function ringTest(t){
  ringItem({kicker:TKINDS[t.kind]+' starting',title:t.title,time:t.st,sub:fmtDur(t.m)+(t.subj?' · '+subjName(t.subj):''),say:TKINDS[t.kind]+' time. '+t.title,
    main:`<button class="btn lg" type="button" data-act="starttest" data-t="${t.id}">${ic('play')}Start the timer</button>`,
    side:`<button class="btn ghost" type="button" data-act="tsnooze" data-t="${t.id}">Snooze 10 min</button><button class="btn ghost" type="button" data-act="dismiss">Dismiss</button>`});
}
function extraAlarms(){
  if(!armed||!document.getElementById('alarm').hidden)return;
  const now=Date.now();
  for(const r of PR()){
    if(r.done)continue;
    const key='r|'+r.id+'|'+r.at,sz=snoozes[key];
    if(sz){if(now>=sz){delete snoozes[key];ringReminder(r);return}continue}
    if(fired[key])continue;
    if(now>=r.at&&now<=r.at+10*60000){fired[key]=1;lsSet('pl.fired',fired);ringReminder(r);return}
  }
  for(const t of PT()){
    if(!t.al||t.score!=null)continue;
    const key='t|'+t.id+'|'+t.date+t.st,sz=snoozes[key],at=testStart(t)-(S.plan.lead||0)*60000;
    if(sz){if(now>=sz){delete snoozes[key];ringTest(t);return}continue}
    if(fired[key])continue;
    if(now>=at&&now<=at+10*60000){fired[key]=1;lsSet('pl.fired',fired);ringTest(t);return}
  }
}
function finishReminder(r){
  if(r.rep){r.at=nextAt(r.at,r.rep)}else r.done=true;
  mark('plan');
}
function setArmed(on){
  if(on&&!armed){armed=true;beep();keepAwake()}
  else if(!on&&armed){armed=false;try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}
  paintHeader();
}
