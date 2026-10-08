
/* ---------- permissions, study tools and automatic tracking ----------
   What a web page can and cannot do, so nobody is promised more than this does:
   - It can ask once for notifications, storage that the browser will not clear, and the microphone. After a "yes" the browser remembers.
   - It cannot see other apps or other sites. What it CAN do is notice that you left to open a study tool from here
     and came back, and log that time (after you agreed once). Time spent in apps you opened some other way comes from the
     Android companion's usage file (import it below) or, on a computer, from a browser extension. */
const PTOOLS=()=>S.plan.tools||(S.plan.tools=[]);
const trackOn=()=>lsGet('pl.track',false)===true;
function setTrack(on){lsSet('pl.track',!!on)}
const toolName=v=>{const t=PTOOLS().find(x=>x.id===v);return t?t.name:(v||'')};
const PERM={store:null};

/* ----- permissions ----- */
function permStatus(k){
  if(k==='notif')return typeof Notification==='undefined'?'na':Notification.permission==='default'?'ask':Notification.permission;
  if(k==='store')return !(navigator.storage&&navigator.storage.persist)?'na':PERM.store===true?'granted':PERM.store===false?'ask':'ask';
  if(k==='mic')return !(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)?'na':(lsGet('pl.perm.mic',null)||'ask');
  if(k==='track')return trackOn()?'granted':'ask';
  return 'na';
}
async function refreshPerms(){
  try{if(navigator.storage&&navigator.storage.persisted)PERM.store=await navigator.storage.persisted()}catch(e){}
  try{
    if(navigator.permissions&&navigator.permissions.query){
      const r=await navigator.permissions.query({name:'microphone'});
      if(r.state==='granted'||r.state==='denied')lsSet('pl.perm.mic',r.state);
    }
  }catch(e){}
}
async function askPerm(k){
  try{
    if(k==='notif'){if(typeof Notification==='undefined')return;await Notification.requestPermission()}
    else if(k==='store'){if(navigator.storage&&navigator.storage.persist)PERM.store=await navigator.storage.persist()}
    else if(k==='mic'){
      const st=await navigator.mediaDevices.getUserMedia({audio:true});
      st.getTracks().forEach(t=>t.stop());lsSet('pl.perm.mic','granted');
    }else if(k==='track')setTrack(true);
  }catch(e){if(k==='mic')lsSet('pl.perm.mic','denied')}
  permRepaint();
}
async function askAllPerms(){
  for(const k of ['notif','store','mic','track'])if(permStatus(k)==='ask')await askPerm(k);
}
const PERM_INFO=[
 {k:'notif',t:'Notifications',d:'Shows a banner with sound when a study block, reminder or mock test starts, even while you are in another tab or app. If your phone shuts this page down to save battery, a banner cannot appear. The calendar export in Settings is the reliable way for a locked phone.'},
 {k:'store',t:'Keep my data on this device',d:'Asks the browser not to clear your plan and logs when it is short of space.'},
 {k:'mic',t:'Microphone',d:'Lets you talk to the assistant. It listens only while you hold the mic button on.'},
 {k:'track',t:'Track my study tools',d:'Once you agree here, opening a study tool from Abhyashify starts a timer that stops when you come back, and the time is logged as study time. It never asks again. You can switch it off at any time. Abhyashify cannot see anything you do inside those tools.'}
];
const STATUS_TXT={granted:['Allowed','good'],denied:['Blocked in browser settings','bad'],ask:['Not asked yet','warn'],na:['Not available here','']};
function permRow(p){
  const st=permStatus(p.k),[txt,tone]=STATUS_TXT[st]||STATUS_TXT.na;
  const act=st==='ask'?`<button class="btn sm" type="button" data-act="perm" data-k="${p.k}">Allow</button>`:
    (p.k==='track'&&st==='granted')?`<button class="btn sm ghost" type="button" data-act="trackoff">Turn off</button>`:'';
  return `<div class="perm"><div class="stack" style="gap:3px;min-width:0"><span class="t">${p.t}</span><span class="small muted">${p.d}</span>${st==='denied'?`<span class="small" style="color:var(--bad)">${H('Allow it from the lock icon next to the address, or in the browser settings for this site.','पता-पट्टी के ताले के आइकन से, या इस साइट की ब्राउज़र सेटिंग से इसे अनुमति दें।')}</span>`:''}</div>
    <div class="stack" style="gap:6px;align-items:flex-end"><span class="st ${tone}">${txt}</span>${act}</div></div>`;
}
function permRepaint(){
  const w=document.getElementById('wizperms');if(w)w.innerHTML=PERM_INFO.map(permRow).join('');
  const t=document.getElementById('toolperms');if(t)t.innerHTML=PERM_INFO.map(permRow).join('');
  const all=document.getElementById('permallbtn');if(all)all.hidden=!PERM_INFO.some(p=>permStatus(p.k)==='ask');
  const tl=document.getElementById('wiztools');if(tl&&typeof wizToolsPaint==='function')wizToolsPaint();
  if(tab==='today'&&!GATE&&sheetEl.hidden&&!document.getElementById('wiz'))try{render(false)}catch(e){}
}

/* ----- notifications that appear when the page is in the background ----- */
async function notify(title,body,tag){
  try{
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return false;
    if(document.visibilityState==='visible')return false;
    const opt={body:body||'',tag:tag||'abhyashify',icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200],requireInteraction:true};
    const reg=navigator.serviceWorker&&navigator.serviceWorker.getRegistration?await navigator.serviceWorker.getRegistration():null;
    if(reg&&reg.showNotification){await reg.showNotification(title,opt);return true}
    new Notification(title,opt);return true;
  }catch(e){return false}
}

/* ----- opening a tool and logging the time ----- */
function toolHref(t){
  if(/android/i.test(navigator.userAgent)&&t.pkg){
    try{
      const u=new URL(t.url);
      return 'intent://'+u.host+u.pathname+u.search+'#Intent;scheme='+u.protocol.replace(':','')+';package='+t.pkg+';S.browser_fallback_url='+encodeURIComponent(t.url)+';end';
    }catch(e){}
  }
  return t.url;
}
function openLink(href){
  const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
}
function blockNow(){
  const now=new Date(),nm=now.getHours()*60+now.getMinutes();
  return blocksOn(S.plan,now).find(b=>nm>=toMin(b.st)-15&&nm<=toMin(b.st)+b.m+30)||null;
}
function openTool(id){
  const t=PTOOLS().find(x=>x.id===id);if(!t)return;
  if(trackOn()&&!run){
    const b=blockNow();
    lsSet('pl.toolrun',{tid:t.id,t0:Date.now(),s:b?b.s:null,b:b?b.id:null,ps:b?b.st:null,pm:b?b.m:null,hid:0});
  }
  openLink(toolHref(t));
  if(!trackOn())return;
  toast(H('Opening '+t.name+'. Come back here when you are done and the time is logged.',t.name+' खुल रहा है। पढ़ाई के बाद यहाँ लौटें, समय अपने-आप दर्ज हो जाएगा।'));
}
let lastAuto=null;
function finishToolRun(){
  if(GATE)return;
  const tr=lsGet('pl.toolrun',null);if(!tr||!tr.hid)return;
  if(document.visibilityState!=='visible')return;
  lsSet('pl.toolrun',null);
  const m=Math.round((Date.now()-tr.t0)/60000);
  const nm=toolName(tr.tid);
  if(!trackOn())return;
  if(m<2){toast(H('You were in '+nm+' for under 2 minutes, so it was not logged.',nm+' में 2 मिनट से कम रहे, इसलिए दर्ज नहीं किया।'));return}
  if(m>480){toast(H('That was over 8 hours in '+nm+', which looks like you forgot to come back. It was not logged. Use Log session to add the real time.',nm+' में 8 घंटे से ज़्यादा हो गए, शायद लौटना भूल गए। दर्ज नहीं किया। असली समय "सत्र दर्ज करें" से जोड़ें।'));return}
  const d=new Date(tr.t0),log=ensureT({id:uid(),d:ymd(d),st:pad(d.getHours())+':'+pad(d.getMinutes()),m,b:tr.b||null,s:tr.s||null,ps:tr.ps||null,pm:tr.pm||null,q:0,mid:null,mu:0,t0:tr.t0,t1:tr.t0+m*60000,dev:deviceId(),src:'tool',tz:tzOff(),tool:tr.tid});
  S.logs.push(log);if(S.logs.length>1800)S.logs=S.logs.slice(-1800);
  mark('logs');lastAuto={id:log.id,tid:tr.tid,m,at:Date.now()};
  toast(H('Logged '+fmtDur(m)+' in '+nm+'.','आज '+nm+' में '+FD(m)+' दर्ज हुआ।'));
  render(false);
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){const tr=lsGet('pl.toolrun',null);if(tr&&!tr.hid){tr.hid=1;lsSet('pl.toolrun',tr)}}
  else setTimeout(finishToolRun,200);
});
window.addEventListener('pageshow',()=>setTimeout(finishToolRun,400));

/* ----- cards on the Today and Report screens ----- */
function vToolsCard(){
  const ts=PTOOLS();if(!ts.length)return '';
  const on=trackOn();
  let last='';
  if(lastAuto&&Date.now()-lastAuto.at<30*60000&&S.logs.some(l=>l.id===lastAuto.id)){
    const lg=S.logs.find(l=>l.id===lastAuto.id);
    last=`<div class="note" style="flex-wrap:wrap">${ic('check')}<span>Logged ${esc(fmtDur(lastAuto.m))} in ${esc(toolName(lastAuto.tid))}.</span>
      <select data-act="toolsubj" aria-label="Subject for this time" style="min-height:34px">${'<option value="">Other</option>'+subjOpts(lg.s)}</select>
      <button class="btn sm ghost" type="button" data-act="toolundo">Undo</button></div>`;
  }
  return `<section class="card"><div class="stack" style="gap:2px"><h3>Study tools</h3><p class="small muted">${on?'Tap one to open it. The time until you come back is logged as study time. No need to tell me.':'Tap one to open it. Turn on tracking and the time will be logged for you.'}</p></div>
    <div class="tools">${ts.map(t=>`<button type="button" class="tool" data-act="toolopen" data-t="${esc(t.id)}">${ic('open')}<span>${esc(t.name)}</span></button>`).join('')}</div>
    ${on?'':`<button class="btn sm soft" type="button" data-act="trackon">${ic('check')}Turn on automatic tracking</button>`}${last}</section>`;
}
function vDateNote(){
  const su=S.plan.setup;
  if(!su||su.dateKind!=='typical'||!S.plan.exam)return '';
  return `<section class="card flat aboutapp">${ic('spark')}<p class="small muted">Your exam date (${esc(parseYmd(S.plan.exam).toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric'}))}) is a placeholder based on when this exam is usually held, not the official date. Change it in Settings once the official date is announced and the timetable will stretch or shrink to fit.</p></section>`;
}
function vToolReport(r){
  const ds=new Set(r.days.map(d=>d.ds)),by={};
  for(const l of LG())if(l.tool&&ds.has(l.d))by[l.tool]=(by[l.tool]||0)+l.m;
  const ents=Object.entries(by).sort((a,b)=>b[1]-a[1]);if(!ents.length)return '';
  const mx=ents[0][1];
  return `<section class="card"><h3>Study tools this week</h3>`+ents.map(([k,m])=>`<div class="stack" style="gap:6px"><div class="row between"><span class="t">${esc(toolName(k))}</span><span class="small muted">${fmtDur(m)}</span></div><div class="meter"><i data-w="${pct(m,mx)}"></i></div></div>`).join('')+`<p class="small muted">Time logged automatically when you opened these from Abhyashify, plus anything imported from your phone.</p></section>`;
}

/* ----- the Study tools and permissions sheet ----- */
function toolsBody(){
  const ts=PTOOLS();
  return `<div class="stack" style="gap:2px"><h3>Permissions</h3><p class="small muted">Each one is asked once. After that the browser remembers your answer.</p></div>
    <div class="perms" id="toolperms">${PERM_INFO.map(permRow).join('')}</div>
    <button class="btn ghost" type="button" id="permallbtn" data-act="permall"${PERM_INFO.some(p=>permStatus(p.k)==='ask')?'':' hidden'}>Allow all of these</button>
    <div class="stack" style="gap:2px"><h3>My study tools</h3><p class="small muted">Apps, sites and YouTube channels you study with. They show on the Today screen as one-tap buttons.</p></div>
    <div class="stack" style="gap:0">${ts.length?ts.map(t=>`<div class="item" style="grid-template-columns:1fr auto"><span class="stack" style="gap:2px;min-width:0"><span class="t">${esc(t.name)}</span><span class="small muted" style="overflow-wrap:anywhere">${esc(t.url)}</span></span><button class="btn sm danger" type="button" data-act="tooldel" data-t="${esc(t.id)}" aria-label="Remove ${esc(t.name)}">${ic('x')}</button></div>`).join(''):'<p class="small muted">None yet.</p>'}</div>
    <div class="grid2"><label class="field">Name<input type="text" id="tn" maxlength="40" placeholder="My YouTube playlist"></label><label class="field">Link<input type="url" id="tu" maxlength="300" placeholder="https://"></label></div>
    <button class="btn soft" type="button" data-act="tooladd">${ic('plus')}Add this tool</button>
    <div class="stack" style="gap:2px"><h3>Time on your computer</h3><p class="small muted">${EXT.seen?'The Abhyashify browser extension is connected. It counts time only on the sites you chose above, and the totals arrive here by themselves.':'On a laptop, the Abhyashify browser extension counts the time you spend on your study sites and sends the totals here by itself. It is in the extension folder of the project (see the README). It is not installed in this browser yet.'}</p></div>
    ${EXT.seen?`<button class="btn ghost" type="button" data-act="extsync">Get the latest from the extension</button>`:''}
    <div class="stack" style="gap:2px"><h3>Time from your phone</h3><p class="small muted">The Android companion app measures the time you spend in the study apps you chose and exports a file. Import it here and it is added to your logs, one entry per app per day. Days are filled from midnight because the file has totals, not start times.</p></div>
    <input type="file" id="usef" accept=".json,application/json" hidden>
    <button class="btn ghost" type="button" data-act="usagepick">${ic('upload')}Import the usage file (JSON)</button>`;
}
function toolsSheet(){
  openSheet('Study tools and permissions',toolsBody(),()=>{});
  refreshPerms().then(permRepaint);
}
function refreshToolsSheet(){
  const f=document.getElementById('sf');if(!f)return;
  f.innerHTML=toolsBody()+'<p class="err" id="sferr" role="alert"></p>';
}
function addTool(name,url,list){
  name=(name||'').trim();url=(url||'').trim();
  if(!name)throw new Error('Give the tool a name.');
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  let u;try{u=new URL(url)}catch(e){throw new Error('That link does not look right.')}
  if(!/^https?:$/.test(u.protocol)||!u.hostname.includes('.'))throw new Error('That link does not look right.');
  const arr=list||PTOOLS();
  if(arr.length>=40)throw new Error('That is plenty of tools. Remove one first.');
  const known=TOOLS.find(t=>{try{return new URL(t.url).hostname.replace(/^www\./,'')===u.hostname.replace(/^www\./,'')}catch(e){return false}});
  const id='t'+uid();
  arr.push({id,name:name.slice(0,40),url:u.href,pkg:known?known.pkg:''});
  return id;
}
const hostOf=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'')}catch(e){return ''}};
function importUsage(o){
  if(!o||o.source!=='abhyashify-usage'||!Array.isArray(o.days))throw new Error('bad');
  let days=0,apps=0;const by=new Map(S.logs.map(l=>[l.id,l]));
  for(const d of o.days){
    if(!d||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))continue;
    const base=parseYmd(d.date).getTime();let off=0,any=false;
    for(const a of (d.apps||[])){
      const mins=Math.round(+a.minutes||0);if(!a.package||mins<1)continue;
      const m=Math.min(720,mins);if(off+m>23*60)break;
      const id='ph-'+d.date+'-'+String(a.package).replace(/[^a-z0-9._]/gi,'').slice(0,60);
      const known=PTOOLS().find(t=>(t.pkg&&t.pkg===a.package)||(/^web:/.test(a.package)&&hostOf(t.url)===String(a.package).slice(4)));
      const rec=ensureT({id,d:d.date,st:fromMin(off),m,b:null,s:null,ps:null,pm:null,q:0,mid:null,mu:0,t0:base+off*60000,t1:base+(off+m)*60000,dev:o.origin==='browser'?'laptop':'phone',src:'phone',tz:tzOff(),tool:known?known.id:String(a.label||a.package).slice(0,40)});
      off+=m;any=true;apps++;
      const old=by.get(id);
      if(old)Object.assign(old,rec);else{S.logs.push(rec);by.set(id,rec)}
    }
    if(any)days++;
  }
  if(S.logs.length>1800)S.logs=S.logs.slice(-1800);
  if(apps)mark('logs');
  return {days,apps};
}

/* ----- browser extension bridge (desktop Chrome / Edge) -----
   The extension's content script talks to this page through window messages. The page only imports what passes importUsage's checks,
   and only after the person turned tracking on once. */
const EXT={seen:false,version:'',last:0};
function extSend(o){try{window.postMessage(Object.assign({src:'abhyashify-app'},o),location.origin)}catch(e){}}
function extPushTools(){
  const list=PTOOLS().map(t=>({host:hostOf(t.url),label:t.name})).filter(t=>t.host&&t.host.includes('.'));
  extSend({type:'tools',tools:list});
}
function extAsk(){if(EXT.seen&&trackOn()){extPushTools();extSend({type:'getUsage'})}}
window.addEventListener('message',e=>{
  if(e.source!==window||e.origin!==location.origin)return;
  const m=e.data;if(!m||m.src!=='abhyashify-ext')return;
  if(m.type==='hello'){EXT.seen=true;EXT.version=String(m.version||'').slice(0,12);if(document.getElementById('toolperms'))refreshToolsSheet();extAsk()}
  else if(m.type==='usage'&&trackOn()){
    try{
      const before=S.logs.length,sig=JSON.stringify(S.logs.filter(l=>/^ph-/.test(l.id)).map(l=>l.id+l.m));
      const x=importUsage(m.data);EXT.last=Date.now();
      const after=JSON.stringify(S.logs.filter(l=>/^ph-/.test(l.id)).map(l=>l.id+l.m));
      if(after!==sig){render(false);if(EXT.manual)toast(H('Got '+x.apps+' entries from the browser extension.',"ब्राउज़र एक्सटेंशन से "+x.apps+" प्रविष्टियाँ मिलीं।"))}
      else if(EXT.manual)toast(H('Nothing new from the browser extension yet.','ब्राउज़र एक्सटेंशन से अभी कुछ नया नहीं।'));
      EXT.manual=false;
    }catch(err){EXT.manual=false}
  }
});
extSend({type:'ping'});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)extAsk()});
setInterval(()=>{if(!document.hidden)extAsk()},5*60000);
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act,d=t.dataset;
  switch(a){
    case 'toolsheet':toolsSheet();break;
    case 'perm':await askPerm(d.k);if(document.getElementById('toolperms'))refreshToolsSheet();break;
    case 'permall':await askAllPerms();if(document.getElementById('toolperms'))refreshToolsSheet();break;
    case 'trackon':setTrack(true);extAsk();toast(H('Automatic tracking is on.','अपने-आप ट्रैकिंग चालू है।'));if(document.getElementById('toolperms'))refreshToolsSheet();permRepaint();break;
    case 'trackoff':setTrack(false);toast(H('Automatic tracking is off.','अपने-आप ट्रैकिंग बंद है।'));if(document.getElementById('toolperms'))refreshToolsSheet();permRepaint();break;
    case 'toolopen':openTool(d.t);break;
    case 'toolundo':if(lastAuto){S.logs=S.logs.filter(l=>l.id!==lastAuto.id);lastAuto=null;mark('logs');render(false);toast(H('Removed.','हटा दिया।'))}break;
    case 'tooldel':S.plan.tools=PTOOLS().filter(x=>x.id!==d.t);mark('plan');if(EXT.seen)extPushTools();refreshToolsSheet();if(tab==='today')render(false);break;
    case 'tooladd':{
      try{addTool(document.getElementById('tn').value,document.getElementById('tu').value);mark('plan');if(EXT.seen)extPushTools();refreshToolsSheet();if(tab==='today')render(false);toast(H('Added.','जोड़ दिया।'))}
      catch(err){const el=document.getElementById('sferr');if(el)el.textContent=err.message}
      break}
    case 'extsync':EXT.manual=true;if(!trackOn()){toast(H('Turn on automatic tracking first.','पहले अपने-आप ट्रैकिंग चालू करें।'));break}extPushTools();extSend({type:'getUsage'});break;
    case 'usagepick':{const f=document.getElementById('usef');if(f)f.click();break}
  }
});
document.addEventListener('change',e=>{
  const f=e.target;
  if(f&&f.dataset&&f.dataset.act==='toolsubj'&&lastAuto){const l=S.logs.find(x=>x.id===lastAuto.id);if(l){l.s=f.value||null;mark('logs');render(false)}return}
  if(f&&f.id==='usef'&&f.files&&f.files[0]){
    const file=f.files[0];f.value='';
    if(file.size>2e6){toast('That file is too large.');return}
    const r=new FileReader();
    r.onload=()=>{
      try{const x=importUsage(JSON.parse(String(r.result)));render(false);toast(x.apps?H('Imported '+x.apps+' entries over '+x.days+' days.',x.days+' दिनों की '+x.apps+' प्रविष्टियाँ जोड़ीं।'):H('No study time found in that file.','उस फ़ाइल में पढ़ाई का समय नहीं मिला।'))}
      catch(err){toast(H('That is not a usage file from the Abhyashify Android app.','यह Abhyashify Android ऐप की उपयोग फ़ाइल नहीं है।'))}
    };
    r.readAsText(file);
  }
});
