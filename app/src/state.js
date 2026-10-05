
/* ---------- state ---------- */
const defaultPlan=()=>({exam:'',examName:'',buffer:21,lead:5,subjects:[],blocks:[]});
let S={plan:defaultPlan(),materials:[],logs:[]};
let FB=null,CL=null,GATE='loading';   // FB: firebase functions, CL: signed-in cloud session, GATE: 'loading' | 'signin' | null
const ASSETS=null;
let saveState='loading';
const lsGet=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const deviceId=()=>{let d=lsGet('pl.device',null);if(!d){d='d-'+uid()+uid();lsSet('pl.device',d)}return d};
const tzOff=()=>-new Date().getTimezoneOffset();
const deviceLabel=()=>/iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Android|iPhone|Mobile/i.test(navigator.userAgent)?'phone':'laptop or desktop';
const docData=k=>k==='plan'?S.plan:{items:S[k]};

/* ---------- overlap: the same course counts overlapping time once ---------- */
const ensureT=l=>{
  if(!(l.t0>0)){const t=new Date(l.d+'T'+(l.st||'00:00')+':00').getTime();l.t0=isNaN(t)?0:t;l.t1=l.t0+(l.m||0)*60000}
  return l;
};
let _eff=null;
function effLogs(){
  if(_eff)return _eff;
  const raw=S.logs.map(l=>ensureT(Object.assign({},l)));
  const per=Overlap.effectiveMinutes(raw.map(l=>({s:l.t0,e:l.t1})));
  _eff={logs:raw.map((l,i)=>Object.assign(l,{mRaw:l.m,m:per[i]}))};
  return _eff;
}
const LG=()=>effLogs().logs;
const VS=()=>({plan:S.plan,materials:S.materials,logs:LG()});

/* ---------- saving: this device only, or the signed-in account ---------- */
const dirty=new Set();let flushT=null,writing=0;
function mark(k){
  dirty.add(k);_eff=null;saveState='saving';paintSave();clearTimeout(flushT);
  flushT=setTimeout(CL?cloudFlush:localFlush,CL?0:300);
}
function localFlush(){
  for(const k of [...dirty])lsSet('pl.'+k,docData(k));
  dirty.clear();saveState='local';paintSave();
}
function loadLocal(){
  const p=lsGet('pl.plan',null),m=lsGet('pl.materials',null),l=lsGet('pl.logs',null);
  S.plan=Object.assign(defaultPlan(),p||{});S.materials=(m&&m.items)||[];S.logs=(l&&l.items)||[];_eff=null;saveState='local';
}
function paintSave(){const el=document.getElementById('savestat');if(el)el.textContent=saveText()}
const saveText=()=>{
  if(CL&&saveState==='saving'&&!navigator.onLine)return 'Offline. Changes will sync when you reconnect.';
  return ({loading:'Loading…',saving:'Saving…',cloud:'Synced to '+(CL?CL.email:'your account'),local:'Saved on this device only. Sign in to sync across devices.',error:'Could not save. Check your connection and try again.'}[saveState]);
};

/* ---------- cloud: Firestore layout (see docs/ARCHITECTURE.md) ----------
   courses/{cid}                          name, ownerUid, members, plan
   courses/{cid}/people/{uid}/sessions    one document per study session
   courses/{cid}/people/{uid}/materials   one document per material */
const SYN={plan:'',logs:new Map(),mats:new Map()};
const RAW={course:null,sessions:null,materials:null};
const cref=(...p)=>FB.doc(FB.db,...p);
const ccol=(...p)=>FB.collection(FB.db,...p);
const courseRef=()=>cref('courses',CL.cid);
const sessCol=()=>ccol('courses',CL.cid,'people',CL.uid,'sessions');
const matCol=()=>ccol('courses',CL.cid,'people',CL.uid,'materials');

function logDoc(l){
  const t1=l.t1>l.t0?l.t1:l.t0+60000;
  return {uid:CL.uid,s:l.t0,e:Math.min(t1,l.t0+43200000),subj:l.s||null,block:l.b||null,planStart:l.ps||null,sheets:l.q||0,
    device:l.dev||deviceId(),source:l.src||'manual',mid:l.mid||null,mu:l.mu||0,tz:l.tz==null?tzOff():l.tz};
}
function docLog(id,x){
  const t=new Date(x.s);
  return {id,d:ymd(t),st:fromMin(t.getHours()*60+t.getMinutes()),m:Math.max(1,Math.round((x.e-x.s)/60000)),b:x.block||null,s:x.subj||null,ps:x.planStart||null,pm:null,
    q:x.sheets||0,mid:x.mid||null,mu:x.mu||0,t0:x.s,t1:x.e,dev:x.device,src:x.source,tz:x.tz};
}
const matDoc=m=>({title:String(m.title||'Untitled').slice(0,160),subj:m.subj||null,kind:m.kind||'theory',unit:m.unit||'pages',total:+m.total||0,done:+m.done||0,file:m.file||null});
const docMat=(id,x)=>({id,title:x.title,subj:x.subj||null,kind:x.kind,unit:x.unit||'pages',total:x.total||0,done:x.done||0,file:x.file||null,asset:null});

async function cloudFlush(){
  if(!CL)return;
  const ks=[...dirty];dirty.clear();
  const jobs=[];
  try{
    if(ks.includes('plan')){
      const js=JSON.stringify(S.plan);
      if(js!==SYN.plan){SYN.plan=js;jobs.push(FB.updateDoc(courseRef(),{plan:JSON.parse(js),updatedAt:FB.serverTimestamp()}))}
    }
    if(ks.includes('logs')){
      const seen=new Set();
      for(const l of S.logs){
        ensureT(l);seen.add(l.id);
        const d=logDoc(l),js=JSON.stringify(d);
        if(SYN.logs.get(l.id)!==js){SYN.logs.set(l.id,js);jobs.push(FB.setDoc(FB.doc(sessCol(),l.id),Object.assign({},d)))}
      }
      for(const id of [...SYN.logs.keys()])if(!seen.has(id)){SYN.logs.delete(id);jobs.push(FB.deleteDoc(FB.doc(sessCol(),id)))}
    }
    if(ks.includes('materials')){
      const seen=new Set();
      for(const m of S.materials){
        seen.add(m.id);
        const d=matDoc(m),js=JSON.stringify(d);
        if(SYN.mats.get(m.id)!==js){SYN.mats.set(m.id,js);jobs.push(FB.setDoc(FB.doc(matCol(),m.id),Object.assign({updatedAt:FB.serverTimestamp()},d)))}
      }
      for(const id of [...SYN.mats.keys()])if(!seen.has(id)){SYN.mats.delete(id);jobs.push(FB.deleteDoc(FB.doc(matCol(),id)))}
    }
  }catch(e){console.error(e);saveState='error';paintSave();return}
  if(!jobs.length){saveState='cloud';paintSave();return}
  writing++;
  Promise.all(jobs).then(()=>{if(!dirty.size)saveState='cloud'}).catch(e=>{
    console.error(e);saveState='error';
    toast('A change could not be saved, so it was undone.');
    SYN.plan='';SYN.logs=new Map();SYN.mats=new Map();
  }).finally(()=>{writing--;paintSave();if(!writing&&!dirty.size)applyRaw()});
}
let firstApply=true;
function applyRaw(){
  if(!CL||!RAW.course||!RAW.sessions||!RAW.materials)return;
  if(writing||dirty.size)return;
  S.plan=Object.assign(defaultPlan(),RAW.course.plan||{});
  CL.name=RAW.course.name||'My course';
  S.logs=RAW.sessions.slice().sort((a,b)=>a.t0-b.t0);
  S.materials=RAW.materials.slice().sort((a,b)=>a.title.localeCompare(b.title));
  SYN.plan=JSON.stringify(S.plan);
  SYN.logs=new Map(S.logs.map(l=>[l.id,JSON.stringify(logDoc(l))]));
  SYN.mats=new Map(S.materials.map(m=>[m.id,JSON.stringify(matDoc(m))]));
  _eff=null;
  if(saveState!=='error')saveState='cloud';
  GATE=null;
  const first=firstApply;firstApply=false;
  render(first);
}
function subscribe(){
  CL.unsubs.forEach(u=>u());CL.unsubs=[];
  RAW.course=RAW.sessions=RAW.materials=null;firstApply=true;
  const onErr=e=>{console.error(e);saveState='error';paintSave();toast('Sync problem: '+(e&&e.code?e.code:'see console'))};
  CL.unsubs.push(FB.onSnapshot(courseRef(),s=>{RAW.course=s.exists()?s.data():{};applyRaw()},onErr));
  CL.unsubs.push(FB.onSnapshot(sessCol(),s=>{RAW.sessions=s.docs.map(d=>docLog(d.id,d.data()));applyRaw()},onErr));
  CL.unsubs.push(FB.onSnapshot(matCol(),s=>{RAW.materials=s.docs.map(d=>docMat(d.id,d.data()));applyRaw()},onErr));
}

async function listCourses(){
  const key='pl.courses.'+CL.uid;
  try{
    const s=await FB.getDocs(FB.query(ccol('courses'),FB.where('ownerUid','==',CL.uid)));
    const list=s.docs.map(d=>({id:d.id,name:(d.data().name||'My course')}));
    lsSet(key,list);return list;
  }catch(e){console.error(e);return lsGet(key,[])}
}
async function createCourse(name){
  const id='c'+uid()+uid();
  await FB.setDoc(cref('courses',id),{name:String(name||'My course').slice(0,80),ownerUid:CL.uid,members:[],plan:defaultPlan(),updatedAt:FB.serverTimestamp()});
  return id;
}
async function openCourse(cid){
  CL.cid=cid;lsSet('pl.course.'+CL.uid,cid);
  GATE='loading';render();
  subscribe();
  CL.courses=await listCourses();
}
async function startCloud(user){
  stopCloud();
  CL={uid:user.uid,email:user.email||'',name:'',cid:null,unsubs:[],courses:[]};
  GATE='loading';render();
  FB.setDoc(cref('users',CL.uid),{email:CL.email,lastSeen:FB.serverTimestamp()},{merge:true}).catch(()=>{});
  CL.courses=await listCourses();
  let cid=lsGet('pl.course.'+CL.uid,null);
  if(!CL.courses.some(c=>c.id===cid))cid=CL.courses[0]&&CL.courses[0].id;
  if(!cid){cid=await createCourse('My course');CL.courses=[{id:cid,name:'My course'}]}
  await openCourse(cid);
}
function stopCloud(){
  if(CL){CL.unsubs.forEach(u=>u());CL=null}
  RAW.course=RAW.sessions=RAW.materials=null;
  SYN.plan='';SYN.logs=new Map();SYN.mats=new Map();writing=0;
}
async function signIn(){
  const prov=new FB.GoogleAuthProvider();
  try{await FB.signInWithPopup(FB.auth,prov)}
  catch(e){
    if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')){try{await FB.signInWithRedirect(FB.auth,prov)}catch(e2){toast('Sign-in failed: '+(e2.code||e2.message))}}
    else if(!e||(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request'))toast('Sign-in failed: '+((e&&(e.code||e.message))||'unknown error'));
  }
}
async function signOutNow(){
  try{CL&&CL.unsubs.forEach(u=>u());await FB.signOut(FB.auth)}catch(e){}
  try{await FB.terminate(FB.db);await FB.clearIndexedDbPersistence(FB.db)}catch(e){}
  lsSet('pl.mode',null);
  location.reload();
}
async function deleteCourseData(){
  const cid=CL.cid;CL.unsubs.forEach(u=>u());CL.unsubs=[];
  for(const sub of ['sessions','materials','usage']){
    const s=await FB.getDocs(ccol('courses',cid,'people',CL.uid,sub));
    for(let i=0;i<s.docs.length;i+=400){const b=FB.writeBatch(FB.db);s.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}
  }
  await FB.deleteDoc(cref('courses',cid));
  CL.courses=CL.courses.filter(c=>c.id!==cid);
  let next=CL.courses[0]&&CL.courses[0].id;
  if(!next){next=await createCourse('My course');CL.courses=[{id:next,name:'My course'}]}
  lsSet('pl.courses.'+CL.uid,CL.courses);
  await openCourse(next);
}
function enterLocal(){
  GATE=null;loadLocal();firstApply=true;render();
}
