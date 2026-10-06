
/* ---------- toast ---------- */
let toastT=null;
function toast(msg){
  const e=document.getElementById('toast');e.textContent=msg;e.classList.remove('hide');e.hidden=false;
  clearTimeout(toastT);toastT=setTimeout(()=>{e.classList.add('hide');toastT=setTimeout(()=>{e.hidden=true},200)},2400);
}

/* ---------- bottom sheets ---------- */
const sheetEl=document.getElementById('sheet');let closeT=null;
function openSheet(title,body,onSubmit){
  clearTimeout(closeT);sheetEl.classList.remove('out');
  sheetEl.innerHTML=`<div class="scrim" data-act="close"></div><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="gz"><div class="grab"></div><div class="ph"><h2>${esc(title)}</h2><button type="button" class="icb" data-act="close" aria-label="Close">${ic('x')}</button></div></div><form id="sf">${body}<p class="err" id="sferr" role="alert"></p></form></div>`;
  sheetEl.hidden=false;document.body.classList.add('lock');
  const f=document.getElementById('sf'),panel=sheetEl.querySelector('.panel'),gz=sheetEl.querySelector('.gz');
  f.addEventListener('submit',async e=>{
    e.preventDefault();const btn=f.querySelector('button[type=submit]');if(btn)btn.disabled=true;
    try{await onSubmit(new FormData(f))}catch(err){document.getElementById('sferr').textContent=err&&err.message?err.message:'Something went wrong.';if(btn)btn.disabled=false}
  });
  let y0=null,dy=0;
  gz.addEventListener('touchstart',e=>{y0=e.touches[0].clientY;dy=0;panel.style.animation='none'},{passive:true});
  gz.addEventListener('touchmove',e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);panel.style.transform=`translateY(${dy}px)`},{passive:true});
  gz.addEventListener('touchend',()=>{
    if(y0===null)return;y0=null;panel.style.transition='transform .18s';
    if(dy>90){panel.style.transform='translateY(100%)';closeSheet(true)}else panel.style.transform='';
  });
}
function closeSheet(quick){
  if(sheetEl.hidden)return;
  clearTimeout(closeT);
  if(!quick)sheetEl.classList.add('out');
  closeT=setTimeout(()=>{sheetEl.hidden=true;sheetEl.innerHTML='';sheetEl.classList.remove('out');document.body.classList.remove('lock')},quick?180:170);
}
const need=(v,msg)=>{if(!v)throw new Error(msg);return v};
const switchRow=(label,name,on)=>`<label class="switch"><span>${label}</span><input type="checkbox" name="${name}"${on?' checked':''}></label>`;

function blockForm(b){
  b=b||{id:'',days:[planDay],st:'06:30',m:90,s:S.plan.subjects[0]?S.plan.subjects[0].id:'',k:'theory',sh:0,al:true,t:''};
  const body=`<div class="stack" style="gap:8px"><span class="kick">Days</span><div class="days">${DAYS.map((d,i)=>`<label><input type="checkbox" name="day" value="${i}"${b.days.includes(i)?' checked':''}>${d}</label>`).join('')}</div></div>
    <div class="grid2"><label class="field">Start<input type="time" name="st" value="${b.st}" required></label><label class="field">Minutes<input type="number" name="m" min="5" max="600" step="5" value="${b.m}" required inputmode="numeric"></label></div>
    <div class="presets">${[45,60,90,120,180].map(n=>`<button type="button" class="pre" data-fill="m" data-val="${n}">${fmtDur(n)}</button>`).join('')}</div>
    <div class="grid2"><label class="field">Subject<select name="s">${subjOpts(b.s)}</select></label><label class="field">Type<select name="k">${kindOpts(KINDS,b.k)}</select></label></div>
    <div class="grid2"><label class="field">Practice sheets<input type="number" name="sh" min="0" max="20" value="${b.sh||0}" inputmode="numeric"></label><label class="field">Name (optional)<input type="text" name="t" value="${esc(b.t||'')}" maxlength="60"></label></div>
    ${switchRow('Ring an alarm for this block','al',b.al)}
    <button class="btn lg" type="submit">${b.id?'Save block':'Add block'}</button>
    ${b.id?`<button class="btn lg danger" type="button" data-act="delblock" data-b="${b.id}">Delete block</button>`:''}`;
  openSheet(b.id?'Edit block':'New block',body,fd=>{
    const days=fd.getAll('day').map(Number);need(days.length,'Pick at least one day.');need(S.plan.subjects.length,'Add a subject first.');
    const nb={id:b.id||uid(),days,st:fd.get('st'),m:Math.max(5,+fd.get('m')||60),s:fd.get('s'),k:fd.get('k'),sh:Math.max(0,+fd.get('sh')||0),al:fd.get('al')==='on',t:(fd.get('t')||'').trim()};
    const i=S.plan.blocks.findIndex(x=>x.id===nb.id);if(i<0)S.plan.blocks.push(nb);else S.plan.blocks[i]=nb;
    mark('plan');closeSheet();render(false);toast(b.id?'Block saved':'Block added');
  });
}
function subjForm(s){
  s=s||{id:'',name:'',w:3,c:3};
  const sel=v=>[1,2,3,4,5].map(n=>`<option${n===v?' selected':''}>${n}</option>`).join('');
  openSheet(s.id?'Edit subject':'New subject',`<label class="field">Name<input type="text" name="name" value="${esc(s.name)}" required maxlength="40"></label>
    <div class="grid2"><label class="field">Importance (marks it carries)<select name="w">${sel(s.w)}</select></label><label class="field">Confidence (5 is strong)<select name="c">${sel(s.c)}</select></label></div>
    <button class="btn lg" type="submit">${s.id?'Save subject':'Add subject'}</button>${s.id?`<button class="btn lg danger" type="button" data-act="delsubj" data-s="${esc(s.id)}">Delete subject</button>`:''}`,fd=>{
    const ns={id:s.id||uid(),name:need((fd.get('name')||'').trim(),'Enter a name.'),w:+fd.get('w'),c:+fd.get('c')};
    const i=S.plan.subjects.findIndex(x=>x.id===ns.id);if(i<0)S.plan.subjects.push(ns);else S.plan.subjects[i]=ns;
    mark('plan');closeSheet();render(false);toast('Subject saved');
  });
}
function logForm(bid,dsArg){
  const now=new Date(),ds=dsArg||ymd(now),b=bid?S.plan.blocks.find(x=>x.id===bid):(run&&run.b?S.plan.blocks.find(x=>x.id===run.b):null);
  const fromRun=run&&(!bid||run.b===bid)&&ds===ymd(now)?run:null;
  const mins=fromRun?Math.max(1,Math.round((Date.now()-fromRun.t0)/60000)):(b?b.m:30);
  const st=fromRun?fromRun.st:(b?b.st:fromMin(Math.max(0,now.getHours()*60+now.getMinutes()-mins)));
  const subj=fromRun?fromRun.s:(b?b.s:(S.plan.subjects[0]||{}).id);
  const mats=S.materials.filter(m=>!(m.total>0&&m.done>=m.total));
  openSheet(b||fromRun?'Log session':'Log extra session',`<div class="grid2"><label class="field">Minutes studied<input type="number" name="m" min="1" max="720" value="${mins}" required inputmode="numeric"></label><label class="field">Started at<input type="time" name="st" value="${st}" required></label></div>
    <div class="presets">${[25,45,60,90,120].map(n=>`<button type="button" class="pre" data-fill="m" data-val="${n}">${fmtDur(n)}</button>`).join('')}</div>
    <label class="field">Subject<select name="s">${subjOpts(subj)}</select></label>
    <div class="grid2"><label class="field">Practice sheets attempted<input type="number" name="q" min="0" max="50" value="0" inputmode="numeric"></label>
    <label class="field">Material worked on<select name="mid"><option value="">None</option>${mats.map(m=>`<option value="${m.id}">${esc(m.title)}</option>`).join('')}</select></label></div>
    <label class="field">Pages or questions finished<input type="number" name="mu" min="0" value="0" inputmode="numeric"></label>
    <button class="btn lg" type="submit">Save log</button>`,fd=>{
    need(S.plan.subjects.length,'Add a subject first.');
    const mid=fd.get('mid')||null,mu=Math.max(0,+fd.get('mu')||0);
    const m=Math.min(720,Math.max(1,+fd.get('m')||1)),st=fd.get('st'),t0=new Date(ds+'T'+st+':00').getTime();
    need(!isNaN(t0),'Enter a valid start time.');
    S.logs.push({id:uid(),d:ds,b:b?b.id:(fromRun?fromRun.b:null),s:fd.get('s'),st,ps:b?b.st:(fromRun?fromRun.ps:null),pm:b?b.m:null,m,q:Math.max(0,+fd.get('q')||0),mid,mu,
      t0,t1:t0+m*60000,dev:deviceId(),src:fromRun?'timer':'manual',tz:tzOff()});
    if(mid&&mu){const m=S.materials.find(x=>x.id===mid);if(m){m.done=m.total>0?Math.min(m.total,m.done+mu):m.done+mu;mark('materials')}}
    if(S.logs.length>1800)S.logs=S.logs.slice(-1800);
    if(fromRun){run=null;lsSet('pl.run',null)}
    mark('logs');closeSheet();render(false);toast('Session logged');
  });
}
function matForm(m){
  const isNew=!m;m=m||{id:'',title:'',subj:(S.plan.subjects[0]||{}).id,kind:'theory',unit:'pages',total:0,done:0};
  const body=
    `<label class="field">Title<input type="text" name="title" value="${esc(m.title)}" maxlength="120" required></label>
    <label class="field">Link or file name (optional)<input type="text" name="file" value="${esc(m.file||'')}" maxlength="300" placeholder="Paste a Google Drive link to open it from here"></label>
    <div class="grid2"><label class="field">Subject<select name="subj">${subjOpts(m.subj)}</select></label><label class="field">Kind<select name="kind">${kindOpts(MKINDS,m.kind)}</select></label></div>
    <div class="grid2"><label class="field">Counted in<select name="unit">${['pages','chapters','questions','sheets','lectures'].map(u=>`<option${u===m.unit?' selected':''}>${u}</option>`).join('')}</select></label>
    <label class="field">Total<input type="number" name="total" min="0" value="${m.total||''}" inputmode="numeric"></label></div>
    ${isNew?'':`<label class="field">Finished so far<input type="number" name="done" min="0" value="${m.done}" inputmode="numeric"></label>`}
    <button class="btn lg" type="submit" id="matsave">${isNew?'Add':'Save'}</button>
    ${isNew?'':`<button class="btn lg soft" type="button" data-act="matdone" data-m="${m.id}">${ic('check')}Mark complete</button><button class="btn lg danger" type="button" data-act="delmat" data-m="${m.id}">Delete</button>`}`;
  openSheet(isNew?'Add material':'Update material',body,fd=>{
    const subj=fd.get('subj'),kind=fd.get('kind'),unit=fd.get('unit'),total=Math.max(0,+fd.get('total')||0),file=(fd.get('file')||'').trim()||null;
    need(S.plan.subjects.length,'Add a subject first.');
    const title=need((fd.get('title')||'').trim(),'Enter a title.');
    if(!isNew){
      m.title=title;m.subj=subj;m.kind=kind;m.unit=unit;m.total=total;m.file=file;m.done=Math.max(0,+fd.get('done')||0);
      if(m.total>0)m.done=Math.min(m.done,m.total);mark('materials');closeSheet();render(false);toast('Saved');return;
    }
    S.materials.push({id:uid(),title,subj,kind,unit,total,done:0,file,asset:null,added:ymd(new Date())});
    mark('materials');closeSheet();render(false);toast('Added');
  });
}
function settingsForm(){
  const p=S.plan;
  openSheet('Settings',`${CL?`<label class="field">Course name<input type="text" name="cn" value="${esc(CL.name||'')}" maxlength="80" required></label>`:''}<div class="stack" style="gap:8px"><span class="kick">Appearance</span><div class="seg" id="themeseg">${[['auto','Auto'],['light','Light'],['dark','Dark']].map(([k,l])=>`<button type="button" data-act="theme" data-v="${k}" aria-pressed="${theme===k}">${l}</button>`).join('')}</div></div>
    <div class="grid2"><label class="field">Exam name<input type="text" name="en" value="${esc(p.examName)}" maxlength="30" placeholder="GATE DA"></label><label class="field">Exam date<input type="date" name="ex" value="${esc(p.exam)}"></label></div>
    <div class="grid2"><label class="field">Alarm minutes early<input type="number" name="lead" min="0" max="60" value="${p.lead}" inputmode="numeric"></label><label class="field">Revision buffer (days)<input type="number" name="buf" min="0" max="120" value="${p.buffer}" inputmode="numeric"></label></div>
    <button class="btn lg" type="submit">Save settings</button>
    <button class="btn lg ghost" type="button" data-act="exportcsv">${ic('upload')}Export schedule for Google Calendar (CSV)</button>
    <p class="small muted">Import the file in Google Calendar on a computer. Your calendar's own notifications then work when this page is closed.</p>
    ${installBtn()}
    <button class="btn lg ghost" type="button" data-act="exportjson">${ic('upload')}Download a backup (JSON)</button>`,fd=>{
    if(CL){const cn=(fd.get('cn')||'').trim();if(cn&&cn!==CL.name){CL.name=cn;const c=CL.courses.find(x=>x.id===CL.cid);if(c)c.name=cn;FB.updateDoc(courseRef(),{name:cn,updatedAt:FB.serverTimestamp()}).catch(()=>toast('Could not rename the course.'))}}
    p.examName=(fd.get('en')||'').trim();p.exam=fd.get('ex')||'';p.lead=Math.max(0,+fd.get('lead')||0);p.buffer=Math.max(0,+fd.get('buf')||0);
    mark('plan');closeSheet();render(false);toast('Settings saved');
  });
}
function saveFile(name,data,type){
  try{
    const a=document.createElement('a'),u=URL.createObjectURL(new Blob([data],{type:type||'text/plain'}));
    a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);toast('Saved '+name);
  }catch(e){toast('The file could not be saved.')}
}
function csvQ(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function calendarCsv(){
  const rows=[['Subject','Start Date','Start Time','End Date','End Time','All Day Event','Description','Private']];
  const t12=m=>{const h=Math.floor(m/60)%24,mm=m%60;return (h%12||12)+':'+pad(mm)+' '+(h<12?'AM':'PM')};
  const us=d=>pad(d.getMonth()+1)+'/'+pad(d.getDate())+'/'+d.getFullYear();
  const start=new Date(),end=S.plan.exam?parseYmd(S.plan.exam):addDays(start,90);
  for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate());d<=end&&rows.length<600;d=addDays(d,1)){
    for(const b of blocksOn(S.plan,d)){
      const s=toMin(b.st),e=s+b.m;
      rows.push([blockTitle(b),us(d),t12(s),us(d),t12(e),'False',b.sh?`${b.sh} practice sheet(s)`:'','True']);
    }
  }
  return rows.map(r=>r.map(csvQ).join(',')).join('\n');
}

/* ---------- template ---------- */
function applyTemplate(){
  const subs=[['prob','Probability & Statistics',5,3],['la','Linear Algebra',4,3],['calc','Calculus & Optimization',3,3],['py','Python & DSA',3,3],['db','Databases & Warehousing',2,3],['ml','Machine Learning',5,3],['ai','Artificial Intelligence',4,3],['ga','General Aptitude',3,3],['mix','Revision & full mocks',3,3]];
  S.plan=Object.assign(defaultPlan(),{exam:'2027-02-06',examName:'GATE DA',subjects:subs.map(([id,name,w,c])=>({id,name,w,c}))});
  const B=(days,st,m,s,k,sh)=>S.plan.blocks.push({id:uid(),days,st,m,s,k,sh:sh||0,al:true,t:''});
  B([0],'06:30',90,'prob','theory');B([0],'19:30',60,'prob','practice',1);
  B([1],'06:30',90,'la','theory');B([1],'19:30',60,'la','practice',1);
  B([2],'06:30',90,'calc','theory');B([2],'19:30',60,'calc','practice',1);
  B([3],'06:30',90,'ml','theory');B([3],'19:30',60,'ml','practice',1);
  B([4],'06:30',90,'ai','theory');B([4],'19:30',60,'py','practice',1);
  B([5],'07:00',120,'db','theory');B([5],'15:00',60,'ga','practice',1);
  B([6],'07:00',120,'prob','revision');B([6],'16:00',180,'mix','mock');
  mark('plan');render();
}

/* ---------- timer, alarms ---------- */
function startRun(bid){
  const b=bid?S.plan.blocks.find(x=>x.id===bid):null,n=new Date();
  run={b:b?b.id:null,s:b?b.s:(S.plan.subjects[0]||{}).id,t0:Date.now(),st:pad(n.getHours())+':'+pad(n.getMinutes()),ps:b?b.st:null,pm:b?b.m:null};
  lsSet('pl.run',run);selIdx=dow(n);tab='today';render();toast('Timer started');
}
function tickTimer(){
  if(!run)return;
  const s=Math.floor((Date.now()-run.t0)/1000),txt=pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60);
  for(const id of ['clock','mclock']){const el=document.getElementById(id);if(el)el.textContent=txt}
}
function beep(){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    for(let i=0;i<3;i++){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=880;o.connect(g);g.connect(audioCtx.destination);
      const t=audioCtx.currentTime+i*.25;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.start(t);o.stop(t+.22)}
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
}
async function keepAwake(){try{if(navigator.wakeLock&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}}catch(e){}}
let ringTimer=null;
function ring(b,late){
  const el=document.getElementById('alarm');
  el.innerHTML=`<div class="alarm-card" role="alertdialog" aria-label="Study alarm"><span class="alarm-ring">${ic('bell')}</span><span class="kick">${late?'Missed alarm':'Time to study'}</span><h2>${esc(blockTitle(b))}</h2><div class="big">${b.st}</div><p class="muted">${fmtDur(b.m)}${b.sh?' · '+sheetsLabel(b.sh):''}</p>
    <button class="btn lg" type="button" data-act="alarmstart" data-b="${b.id}">${ic('play')}Start now</button>
    <div class="grid2" style="width:100%"><button class="btn ghost" type="button" data-act="snooze" data-b="${b.id}">Snooze 5 min</button><button class="btn ghost" type="button" data-act="dismiss">Dismiss</button></div></div>`;
  el.hidden=false;beep();clearInterval(ringTimer);let n=0;ringTimer=setInterval(()=>{if(++n>40)return stopRing();beep()},2200);
}
function stopRing(){clearInterval(ringTimer);document.getElementById('alarm').hidden=true}
function alarmTick(){
  tickTimer();
  const now=new Date(),ds=ymd(now),nm=now.getHours()*60+now.getMinutes();
  for(const b of blocksOn(S.plan,now)){
    if(!b.al)continue;
    const key=ds+'|'+b.id,at=toMin(b.st)-(S.plan.lead||0);
    const sz=snoozes[key];
    if(sz){if(Date.now()>=sz){delete snoozes[key];ring(b,false)}continue}
    if(fired[key])continue;
    if(nm>=at&&nm<=at+5&&armed&&document.getElementById('alarm').hidden){fired[key]=1;lsSet('pl.fired',fired);ring(b,nm>at+1)}
  }
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const fill=e.target.closest('[data-fill]');
  if(fill){const inp=document.querySelector('#sf input[name='+fill.dataset.fill+']');if(inp){inp.value=fill.dataset.val;inp.dispatchEvent(new Event('input',{bubbles:true}))}return}
  const t=e.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act,d=t.dataset;
  switch(a){
    case 'tab':if(tab!==d.v){tab=d.v;render();window.scrollTo({top:0,behavior:'instant'})}break;
    case 'sel':selIdx=+d.v;render(false);break;
    case 'pday':planDay=+d.v;render(false);break;
    case 'close':closeSheet();break;
    case 'tpl':applyTemplate();toast('Template added');break;
    case 'blank':S.plan.subjects=[{id:uid(),name:'Subject 1',w:3,c:3}];mark('plan');tab='plan';render();break;
    case 'start':startRun(d.b);break;
    case 'stop':logForm(run&&run.b);break;
    case 'log':logForm(d.b,d.d);break;
    case 'addblock':blockForm();break;
    case 'editblock':blockForm(S.plan.blocks.find(b=>b.id===d.b));break;
    case 'delblock':
      if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Tap again to delete';break}
      S.plan.blocks=S.plan.blocks.filter(b=>b.id!==d.b);mark('plan');closeSheet();render(false);toast('Block deleted');break;
    case 'addsubj':subjForm();break;
    case 'editsubj':subjForm(S.plan.subjects.find(s=>s.id===d.s));break;
    case 'delsubj':
      if(S.plan.blocks.some(b=>b.s===d.s)||S.materials.some(m=>m.subj===d.s)){document.getElementById('sferr').textContent='Move or delete this subject’s blocks and materials first.';break}
      if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Tap again to delete';break}
      S.plan.subjects=S.plan.subjects.filter(s=>s.id!==d.s);mark('plan');closeSheet();render(false);break;
    case 'addmat':matForm();break;
    case 'editmat':matForm(S.materials.find(m=>m.id===d.m));break;
    case 'step':{const m=S.materials.find(x=>x.id===d.m);if(m){m.done=m.total>0?Math.min(m.total,m.done+stepOf(m)):m.done+stepOf(m);mark('materials');render(false);if(m.total>0&&m.done>=m.total)toast('Completed: '+m.title)}break}
    case 'matdone':{const m=S.materials.find(x=>x.id===d.m);if(m){if(!m.total)m.total=Math.max(1,m.done);m.done=m.total;mark('materials');closeSheet();render(false);toast('Marked complete')}break}
    case 'delmat':{
      if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Tap again to delete';break}
      const m=S.materials.find(x=>x.id===d.m);S.materials=S.materials.filter(x=>x.id!==d.m);mark('materials');
      if(m&&m.asset&&ASSETS){try{await ASSETS.delete(m.asset)}catch(err){}}
      closeSheet();render(false);break}
    case 'filter':matFilter=d.v;render(false);break;
    case 'order':matOrder=!matOrder;render(false);break;
    case 'wk':if(t.disabled)break;weekOffset=Math.min(0,weekOffset+(+d.v));render(false);break;
    case 'copyrep':{
      try{await navigator.clipboard.writeText(reportText());toast('Report copied')}catch(err){toast('Copy was blocked by the browser')}
      break}
    case 'settings':settingsForm();break;
    case 'theme':theme=d.v;lsSet('pl.theme',theme);applyTheme();document.querySelectorAll('#themeseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===theme));break;
    case 'exportcsv':saveFile('prep-schedule.csv',calendarCsv(),'text/csv');break;
    case 'exportjson':saveFile('prep-ledger-backup.json',JSON.stringify(backupData(),null,1),'application/json');break;
    case 'arm':
      if(!armed){armed=true;beep();keepAwake();toast('Alarms on. Keep this page open.')}
      else{armed=false;try{wakeLock&&wakeLock.release()}catch(err){}wakeLock=null;toast('Alarms off')}
      paintHeader();if(tab==='today')render(false);break;
    case 'testsound':beep();break;
    case 'alarmstart':stopRing();startRun(d.b);break;
    case 'snooze':snoozes[ymd(new Date())+'|'+d.b]=Date.now()+5*60000;stopRing();toast('Snoozed for 5 minutes');break;
    case 'dismiss':stopRing();break;
    case 'install':await installApp();break;
    case 'signin':await signIn();break;
    case 'local':lsSet('pl.mode','local');enterLocal();break;
    case 'acct':accountSheet();break;
    case 'course':if(d.c!==CL.cid){closeSheet();await openCourse(d.c)}else closeSheet();break;
    case 'newcourse':courseForm();break;
    case 'importjson':{const f=document.getElementById('impf');if(f)f.click();break}
    case 'signout':await signOutNow();break;
    case 'delcourse':
      if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Tap again to delete everything in this course';break}
      t.disabled=true;
      try{await deleteCourseData();closeSheet();toast('Course deleted')}catch(err){console.error(err);t.disabled=false;toast('Could not delete: '+(err&&err.code||'error'))}
      break;
  }
});
document.addEventListener('change',e=>{
  const f=e.target;
  if(f&&f.id==='impf'&&f.files&&f.files[0]){
    const file=f.files[0];f.value='';
    if(file.size>5e6){toast('That file is too large for a backup.');return}
    const r=new FileReader();
    r.onload=()=>{try{importBackup(JSON.parse(String(r.result)))}catch(err){toast('That file is not a Prep Ledger backup.')}};
    r.readAsText(file);
  }
});

/* ---------- account, backup, import ---------- */
function backupData(){return {app:'prep-ledger',version:2,course:CL?CL.name:null,plan:S.plan,materials:S.materials.map(m=>({id:m.id,title:m.title,subj:m.subj,kind:m.kind,unit:m.unit,total:m.total,done:m.done,file:m.file||null})),logs:S.logs}}
function importBackup(o){
  if(!o||typeof o!=='object'||!o.plan||!Array.isArray(o.materials)||!Array.isArray(o.logs))throw new Error('bad');
  let addedM=0,addedL=0;
  if(!S.plan.subjects.length&&!S.plan.blocks.length){S.plan=Object.assign(defaultPlan(),{exam:o.plan.exam||'',examName:o.plan.examName||'',buffer:+o.plan.buffer||21,lead:+o.plan.lead||5,
    subjects:(o.plan.subjects||[]).slice(0,60),blocks:(o.plan.blocks||[]).slice(0,300)});mark('plan')}
  const haveM=new Set(S.materials.map(m=>m.id)),haveL=new Set(S.logs.map(l=>l.id));
  for(const m of o.materials){if(!m||!m.id||haveM.has(m.id)||!m.title)continue;
    S.materials.push({id:String(m.id),title:String(m.title).slice(0,160),subj:m.subj||null,kind:m.kind||'theory',unit:m.unit||'pages',total:Math.max(0,+m.total||0),done:Math.max(0,+m.done||0),file:/^https?:\/\//i.test(m.file||'')?m.file:null,asset:null});addedM++}
  for(const l of o.logs){if(!l||!l.id||haveL.has(l.id)||!l.d||!l.st)continue;
    const x=ensureT({id:String(l.id),d:l.d,st:l.st,m:Math.min(720,Math.max(1,+l.m||1)),b:l.b||null,s:l.s||null,ps:l.ps||null,pm:l.pm||null,q:+l.q||0,mid:l.mid||null,mu:+l.mu||0,t0:+l.t0||0,t1:+l.t1||0,dev:l.dev||deviceId(),src:l.src||'manual',tz:l.tz==null?tzOff():l.tz});
    if(!(x.t0>0))continue;x.t1=x.t0+x.m*60000;S.logs.push(x);addedL++}
  if(addedM)mark('materials');if(addedL)mark('logs');
  closeSheet();render(false);toast(`Imported ${addedM} materials and ${addedL} sessions`);
}
function courseForm(){
  openSheet('New course',`<label class="field">Course name<input type="text" name="n" maxlength="80" placeholder="GATE DA 2027" required></label><button class="btn lg" type="submit">Create course</button>`,async fd=>{
    const name=need((fd.get('n')||'').trim(),'Enter a name.');
    const id=await createCourse(name);CL.courses.push({id,name});closeSheet();await openCourse(id);toast('Course created');
  });
}
/* ---------- install as an app ---------- */
let installEv=null;
const isStandalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function installBtn(){
  if(isStandalone())return '';
  if(installEv)return `<button class="btn lg soft" type="button" data-act="install">${ic('upload')}Install Prep Ledger as an app</button>`;
  if(isIOS())return `<p class="small muted">To install on iPhone or iPad: tap the Share button, then <b>Add to Home Screen</b>.</p>`;
  return '';
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEv=e;if(GATE==='signin')render(false)});
window.addEventListener('appinstalled',()=>{installEv=null;toast('Prep Ledger is installed');if(GATE==='signin')render(false)});
async function installApp(){
  if(!installEv)return;
  installEv.prompt();
  try{await installEv.userChoice}catch(e){}
  installEv=null;
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(e=>console.warn('sw',e));
}
function accountSheet(){
  const imp=`<input type="file" id="impf" accept=".json,application/json" hidden>
    ${installBtn()}
    <button class="btn lg ghost" type="button" data-act="exportjson">${ic('upload')}Export all my data (JSON)</button>
    <button class="btn lg ghost" type="button" data-act="importjson">${ic('upload')}Import a backup (JSON)</button>`;
  if(!CL){
    openSheet('Account',`<p class="muted">You are using Prep Ledger on this device only. Sign in to keep your plan and progress in sync on your phone, tablet and laptop.</p>
      ${FB?`<button class="btn lg" type="button" data-act="signin">Sign in with Google</button>`:'<p class="small muted">Sign-in is not available right now.</p>'}${imp}`,()=>{});
    return;
  }
  const cs=(CL.courses.length?CL.courses:[{id:CL.cid,name:CL.name}]).map(c=>`<button type="button" class="item" data-act="course" data-c="${esc(c.id)}" style="grid-template-columns:1fr auto"><span class="t">${esc(c.name)}</span>${c.id===CL.cid?ic('check'):''}</button>`).join('');
  openSheet('Account',`<div class="stack" style="gap:2px"><span class="kick">Signed in as</span><span class="t">${esc(CL.email)}</span><span class="small muted">This device: ${esc(deviceLabel())}. ${esc(saveText())}</span></div>
    <div class="stack" style="gap:0"><span class="kick" style="margin-bottom:4px">Courses</span>${cs}</div>
    <button class="btn lg soft" type="button" data-act="newcourse">${ic('plus')}New course</button>
    ${imp}
    <button class="btn lg danger" type="button" data-act="delcourse">Delete this course and my data</button>
    <button class="btn lg ghost" type="button" data-act="signout">Sign out</button>
    <p class="small muted">Your data is stored in your account. Only you can read it. Study time from all your devices in the same course is merged, and overlapping time is counted once.</p>`,()=>{});
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheetEl.hidden)closeSheet()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&armed)keepAwake()});

/* ---------- boot ---------- */
(async function boot(){
  applyTheme();
  FB=await Promise.race([window.FBReady,new Promise(r=>setTimeout(()=>r(null),10000))]);
  setInterval(tickTimer,1000);setInterval(alarmTick,5000);
  setInterval(()=>{paintHeader();if(!GATE&&tab==='today'&&sheetEl.hidden&&document.getElementById('alarm').hidden)render(false)},60000);
  if(!FB){lsSet('pl.mode','local');enterLocal();toast('Cloud sync is unavailable. Working on this device only.');return}
  FB.onAuthStateChanged(FB.auth,user=>{
    if(user)startCloud(user).catch(e=>{console.error(e);GATE='signin';render();toast('Could not load your account: '+(e&&e.code||'error'))});
    else{stopCloud();if(lsGet('pl.mode',null)==='local')enterLocal();else{GATE='signin';render()}}
  });
})();
