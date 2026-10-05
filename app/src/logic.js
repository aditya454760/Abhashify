//#LOGIC-START
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_LONG=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const KINDS={theory:'Theory',practice:'Practice',revision:'Revision',mock:'Mock test',other:'Sport / other'};
const MKINDS={theory:'Theory / book',sheet:'Practice sheet',notes:'Notes / slides',mock:'Mock paper'};
const BLOCK_MAT={theory:['theory','notes'],practice:['sheet'],revision:['notes','theory','sheet'],mock:['mock'],other:[]};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseYmd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dow=d=>(d.getDay()+6)%7;
const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const fromMin=n=>pad(Math.floor(n/60)%24)+':'+pad(n%60);
const addDays=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x};
const weekStart=d=>addDays(d,-dow(d));
const uid=()=>Math.random().toString(36).slice(2,9);
const fmtDur=m=>{m=Math.round(m);if(m<=0)return '0m';const h=Math.floor(m/60),r=m%60;return h?(r?h+'h '+r+'m':h+'h'):r+'m'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function blocksOn(plan,date){
  const w=dow(date);
  return plan.blocks.filter(b=>b.days.includes(w)).sort((a,b)=>toMin(a.st)-toMin(b.st));
}
function addHours(arr,start,len){
  while(len>0){const h=Math.floor(start/60)%24,room=60-(start%60),take=Math.min(room,len);arr[h]+=take;start+=take;len-=take}
}

function weekReport(S,ws,now){
  const today=ymd(now),nowMin=now.getHours()*60+now.getMinutes();
  const days=[],bySub={},planH=new Array(24).fill(0),actH=new Array(24).fill(0),sessions=[];
  let tp=0,td=0,ta=0,shD=0,shT=0,shA=0,bDue=0,bHit=0,tN=0,tOn=0,tSum=0;
  const sub=id=>bySub[id]||(bySub[id]={p:0,a:0,sh:0,shA:0});
  for(let i=0;i<7;i++){
    const d=addDays(ws,i),ds=ymd(d);let p=0,due=0,a=0;
    for(const b of blocksOn(S.plan,d)){
      p+=b.m;shT+=b.sh||0;addHours(planH,toMin(b.st),b.m);
      if(ds<today||(ds===today&&toMin(b.st)<=nowMin)){
        due+=b.m;shD+=b.sh||0;bDue++;sub(b.s).p+=b.m;sub(b.s).sh+=b.sh||0;
        const done=S.logs.filter(l=>l.d===ds&&l.b===b.id).reduce((x,l)=>x+l.m,0);
        if(done>=b.m*0.8)bHit++;
      }
    }
    for(const l of S.logs){
      if(l.d!==ds)continue;
      a+=l.m;shA+=l.q||0;sub(l.s).a+=l.m;sub(l.s).shA+=l.q||0;addHours(actH,toMin(l.st),l.m);
      if(l.ps){const diff=toMin(l.st)-toMin(l.ps);tN++;if(Math.abs(diff)<=30)tOn++;tSum+=diff;sessions.push({d:ds,s:l.s,ps:l.ps,st:l.st,diff})}
    }
    days.push({ds,label:DAYS[i],p,due,a});tp+=p;td+=due;ta+=a;
  }
  const hoursPct=td?ta/td*100:null,sheetsPct=shD?shA/shD*100:null,timingPct=tN?tOn/tN*100:null;
  let w=0,sc=0;
  if(hoursPct!==null){w+=.5;sc+=.5*Math.min(100,hoursPct)}
  if(sheetsPct!==null){w+=.25;sc+=.25*Math.min(100,sheetsPct)}
  if(timingPct!==null){w+=.25;sc+=.25*timingPct}
  return {days,bySub,planH,actH,sessions,tp,td,ta,shD,shT,shA,bDue,bHit,tN,tOn,
    avgShift:tN?tSum/tN:null,hoursPct,sheetsPct,timingPct,score:w?Math.round(sc/w):null};
}

function planner(S,today){
  const plan=S.plan,subj=Object.fromEntries(plan.subjects.map(s=>[s.id,s]));
  const exam=plan.exam?parseYmd(plan.exam):null;
  const daysLeft=exam?Math.max(1,Math.round((exam-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/864e5)):90;
  const contentDays=Math.max(7,daysLeft-(plan.buffer||0));
  const bpw={};
  for(const b of plan.blocks){if(b.k==='theory'||b.k==='practice')bpw[b.s]=(bpw[b.s]||0)+b.days.length}
  const theory={};
  for(const m of S.materials){if(m.kind==='theory'&&m.total>0){const t=theory[m.subj]||(theory[m.subj]={d:0,n:0});t.d+=Math.min(m.done,m.total);t.n+=m.total}}
  const out=[];
  for(const m of S.materials){
    const known=m.total>0,remaining=known?Math.max(0,m.total-m.done):null;
    if(known&&remaining===0)continue;
    const sb=subj[m.subj]||{w:3,c:3},frac=known?remaining/m.total:1;
    let bonus=0;
    if(m.kind==='sheet'){const t=theory[m.subj];bonus=(t&&t.d/t.n<.5)?-6:1}
    if(m.kind==='mock')bonus=daysLeft<45?3:-3;
    const score=sb.w*(6-sb.c)*(.4+frac)+bonus;
    const sessionsLeft=Math.max(1,Math.round((bpw[m.subj]||0.7)*contentDays/7));
    out.push({m,score,remaining,sessionsLeft,chunk:known?Math.max(1,Math.ceil(remaining/sessionsLeft)):null});
  }
  return out.sort((a,b)=>b.score-a.score);
}
function nextFor(order,block){
  const kinds=BLOCK_MAT[block.k]||[];
  return order.find(o=>o.m.subj===block.s&&kinds.includes(o.m.kind))||order.find(o=>o.m.subj===block.s&&block.k!=='other')||null;
}
//#LOGIC-END