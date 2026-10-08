
/* ---------- timetable generator (pure: no DOM, no state) ----------
   genPlan(cfg) turns the answers from the setup wizard into a plan: subjects, weekly study blocks that apply to
   a date range each (learn, revise, final stretch), dated mock tests, and a list of honest warnings.
   cfg = { start:'YYYY-MM-DD', end:'YYYY-MM-DD', subjects:[{id,name,w,c}], hw, he (hours per weekday / weekend day),
           off:[0-6] (Mon=0), periods:['morning','evening'...], sess (longest session, minutes), brk (break, minutes),
           cover:0|1|2 (nothing / about half / most of the syllabus done), mock:{m,marks}, mocks:bool, alarm:bool, lead }  */
const PERIODS=[
 {id:'early',name:'Early morning',sub:'5 to 8',a:300,b:480},
 {id:'morning',name:'Morning',sub:'8 to 12',a:480,b:720},
 {id:'afternoon',name:'Afternoon',sub:'12 to 5',a:720,b:1020},
 {id:'evening',name:'Evening',sub:'5 to 9',a:1020,b:1260},
 {id:'night',name:'Night',sub:'9 to 11:30',a:1260,b:1410}
];
const MIX_ID='mix';
const r5=n=>Math.round(n/5)*5;
function slugify(name,taken){
  let b=String(name||'subject').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,22)||'subject',id=b,i=2;
  while(taken&&taken.has(id))id=b+'-'+(i++);
  if(taken)taken.add(id);
  return id;
}
/* largest-remainder split of N sessions across items by priority p; returns {id:count} */
function shareOut(items,N){
  const out={},sum=items.reduce((a,x)=>a+x.p,0)||1,rem=[];let used=0;
  for(const x of items){const q=x.p/sum*N;out[x.id]=Math.floor(q);used+=out[x.id];rem.push([q-out[x.id],x.id])}
  rem.sort((a,b)=>b[0]-a[0]);
  for(let i=0;used<N&&rem.length;i++,used++)out[rem[i%rem.length][1]]++;
  // everyone gets at least one session a week while there are enough sessions
  if(N>=items.length){
    for(const x of items){
      while(out[x.id]<1){
        const big=Object.keys(out).sort((a,b)=>out[b]-out[a])[0];
        if(out[big]<=1)break;out[big]--;out[x.id]++;
      }
    }
  }
  return out;
}
/* smooth weighted round robin: same subject spread as evenly as possible through the week */
function spread(counts){
  const ids=Object.keys(counts).filter(k=>counts[k]>0),tot=ids.reduce((a,k)=>a+counts[k],0),cur={},seq=[];
  ids.forEach(k=>{cur[k]=0});
  for(let i=0;i<tot;i++){
    let best=null;
    for(const k of ids){cur[k]+=counts[k];if(best===null||cur[k]>cur[best])best=k}
    cur[best]-=tot;seq.push(best);
  }
  return seq;
}
/* place sessions for one day inside the chosen parts of the day. Returns {slots:[{st,m,mock}], lost} */
function daySlots(minutes,cfg,mockMin){
  const wins=PERIODS.filter(p=>(cfg.periods||[]).includes(p.id)).map(p=>({a:p.a,b:p.b}));
  if(!wins.length)wins.push({a:480,b:1260});
  const brk=cfg.brk==null?10:cfg.brk,slots=[];let floor=0,lost=0;
  const put=(st,m,mock)=>{slots.push({st:fromMin(st),m,mock:!!mock});floor=st+m+brk};
  if(mockMin){const st=Math.max(wins[0].a,floor);put(st,mockMin,true);minutes=Math.max(0,minutes-mockMin)}
  if(minutes>0){
    const mx=Math.max(30,cfg.sess||90);
    let n=Math.max(1,Math.ceil(minutes/mx)),sz=r5(minutes/n);
    while(n>1&&sz<30){n--;sz=r5(minutes/n)}
    let left=minutes;
    while(left>=15){
      const want=Math.min(sz,left);
      let done=false;
      for(const w of wins){const s=Math.max(w.a,floor);if(s+want<=w.b){put(s,want);left-=want;done=true;break}}
      if(done)continue;
      for(const w of wins){const s=Math.max(w.a,floor),room=Math.floor((w.b-s)/5)*5;if(room>=30){const m=Math.min(want,room);put(s,m);left-=m;done=true;break}}
      if(done)continue;
      const s=Math.max(floor,wins[wins.length-1].b),room=Math.floor((1425-s)/5)*5;
      if(room>=30){const m=Math.min(want,room);put(s,m);left-=m;continue}
      lost+=left;break;
    }
  }
  return {slots,lost};
}
function bestMockDay(off){
  for(const d of [6,5,4,3,2,1,0])if(!off.includes(d))return d;
  return 6;
}
function phaseSplit(D,cover){
  const F=D>=28?Math.min(28,Math.max(10,Math.round(D*0.2))):Math.max(1,Math.round(D*0.5));
  const R=Math.max(0,D-F);
  let L=cover===0?Math.round(R*0.65):cover===1?Math.round(R*0.35):0;
  if(L<14)L=0;
  return {L,V:R-L,F};
}
const FOCUS={
 learn:['Learn the syllabus','Mostly new theory, with practice at the end of each topic.','पाठ्यक्रम सीखना','ज़्यादातर नया सिद्धांत, हर टॉपिक के अंत में अभ्यास।'],
 revise:['Revise and practise','Revision and problem practice, with regular mock tests.','रिवीज़न और अभ्यास','रिवीज़न और सवालों का अभ्यास, नियमित मॉक टेस्ट के साथ।'],
 final:['Final stretch','Weekly mock tests, then fixing the weak spots they show.','अंतिम चरण','हर हफ़्ते मॉक टेस्ट, फिर उनमें दिखी कमज़ोरियों पर काम।']
};
function genPlan(cfg){
  const warn=[],start=parseYmd(cfg.start),end=parseYmd(cfg.end);
  const D=Math.round((end-start)/864e5);
  if(!(D>=1))throw new Error('The end date must be after the start date.');
  const taken=new Set(),subjects=cfg.subjects.map(s=>({id:s.id||slugify(s.name,taken),name:s.name,w:s.w||3,c:s.c||3}));
  subjects.forEach(s=>taken.add(s.id));
  const mocks=cfg.mocks!==false;
  if(mocks&&!subjects.some(s=>s.id===MIX_ID))subjects.push({id:MIX_ID,name:'Revision & full mocks',w:3,c:3});
  const study=subjects.filter(s=>s.id!==MIX_ID),hasMix=subjects.some(s=>s.id===MIX_ID);
  if(!study.length)throw new Error('Add at least one subject.');
  const off=(cfg.off||[]).filter(d=>d>=0&&d<=6);
  if(off.length>=7)throw new Error('Leave at least one day for studying.');
  const mock=cfg.mock||{m:180,marks:100},mockDay=bestMockDay(off);
  const capOf=(d,isMockDay,withMock)=>{
    if(off.includes(d))return 0;
    let c=Math.round((d>=5?cfg.he:cfg.hw)*60/5)*5;
    if(withMock&&isMockDay)c=Math.max(c,mock.m+60);
    return c;
  };
  // phases
  const {L,V,F}=phaseSplit(D,cfg.cover||0);
  const phases=[];let cur=start;
  const addPh=(id,days)=>{
    if(days<=0)return;
    const from=ymd(cur),to=ymd(addDays(cur,days-1));
    phases.push({id,name:FOCUS[id][0],note:H(FOCUS[id][1],FOCUS[id][3]),from,to,days});
    cur=addDays(cur,days);
  };
  addPh('learn',L);addPh('revise',V);addPh('final',F);
  if((cfg.cover||0)===0&&D<120&&D>=1)warn.push(H('Only about '+Math.round(D/7)+' weeks for a full syllabus from scratch. The plan puts learning first and keeps a short revision window. Add hours or cut optional topics if it feels tight.','शुरू से पूरे पाठ्यक्रम के लिए सिर्फ़ लगभग '+Math.round(D/7)+' हफ़्ते हैं। प्लान में पहले सीखना रखा है और रिवीज़न का समय कम है। ज़्यादा लगे तो घंटे बढ़ाएँ या वैकल्पिक टॉपिक कम करें।'));
  const blocks=[],tests=[];let lostTotal=0;
  const droppedAll=new Set();
  for(const ph of phases){
    const withMock=mocks&&ph.id!=='learn';
    const slotsByDay=[];let N=0;
    for(let d=0;d<7;d++){
      const isMock=withMock&&d===mockDay,cap=capOf(d,isMock,withMock);
      if(!cap){slotsByDay.push([]);continue}
      const r=daySlots(cap,cfg,isMock?mock.m:0);lostTotal+=r.lost;slotsByDay.push(r.slots);
    }
    const free=[];  // study slots (not the mock slot)
    slotsByDay.forEach((sl,d)=>sl.forEach(x=>{if(!x.mock)free.push({d,x})}));
    N=free.length;
    const mixN=hasMix?(ph.id==='final'?Math.max(2,Math.round(N*0.18)):ph.id==='revise'?Math.max(1,Math.round(N*0.1)):0):0;
    const sN=Math.max(0,N-mixN);
    // subjects ranked by priority; when there are fewer sessions than subjects the lowest drop out of the weekly template
    const pri=study.map(s=>({id:s.id,p:Math.max(1,s.w)*(6-Math.min(5,Math.max(1,s.c)))})).sort((a,b)=>b.p-a.p);
    let items=pri;
    if(sN<pri.length){items=pri.slice(0,sN);pri.slice(sN).forEach(x=>droppedAll.add(x.id))}
    const counts=sN>0?shareOut(items,sN):{};
    if(mixN)counts[MIX_ID]=mixN;
    const seq=spread(counts);
    // put the sequence into the day slots in day order, then untangle same-subject repeats within a day
    const asg=free.map((f,i)=>({d:f.d,x:f.x,s:seq[i]})).filter(a=>a.s);
    for(let pass=0;pass<4;pass++){
      let moved=false;
      for(let i=0;i<asg.length;i++){
        const a=asg[i];
        if(!asg.some((b,j)=>j!==i&&b.d===a.d&&b.s===a.s))continue;
        for(let j=0;j<asg.length;j++){
          const b=asg[j];
          if(b.d===a.d||b.s===a.s)continue;
          const aOk=!asg.some((z,k)=>k!==j&&k!==i&&z.d===b.d&&z.s===a.s),bOk=!asg.some((z,k)=>k!==i&&k!==j&&z.d===a.d&&z.s===b.s);
          if(aOk&&bOk){const t=a.s;a.s=b.s;b.s=t;moved=true;break}
        }
      }
      if(!moved)break;
    }
    // kinds per subject, in week order
    const seen={};
    asg.sort((a,b)=>a.d-b.d||toMin(a.x.st)-toMin(b.x.st));
    for(const a of asg){
      const c=counts[a.s]||1,i=seen[a.s]=(seen[a.s]||0)+1;let k;
      if(a.s===MIX_ID)k='revision';
      else if(ph.id==='learn')k=(i<=Math.max(1,Math.round(c*0.6)))?'theory':'practice';
      else k=(i<=Math.ceil(c/2))?'revision':'practice';
      const t=a.s===MIX_ID?'Mock review & weak topics':'';
      blocks.push({id:uid(),days:[a.d],st:a.x.st,m:a.x.m,s:a.s,k,sh:(k==='practice'&&a.x.m>=45)?1:0,al:cfg.alarm!==false,t,from:ph.from,to:ph.to,ph:ph.id});
    }
    if(withMock){
      const mk=slotsByDay[mockDay].find(x=>x.mock);
      if(mk)blocks.push({id:uid(),days:[mockDay],st:mk.st,m:mk.m,s:MIX_ID,k:'mock',sh:0,al:cfg.alarm!==false,t:'Mock test day (test or review)',from:ph.from,to:ph.to,ph:ph.id});
      // dated mock tests: every week in the final stretch, every second week while revising
      const md=[];
      for(let t=parseYmd(ph.from);t<=parseYmd(ph.to);t=addDays(t,1))if(dow(t)===mockDay)md.push(t);
      md.forEach((t,i)=>{
        if(ph.id==='revise'&&i%2===0)return;
        if(ymd(t)>ymd(addDays(end,-3))||tests.length>=80)return;
        tests.push({id:uid(),title:'Mock test '+(tests.length+1),kind:'mock',subj:'',date:ymd(t),st:mk?mk.st:'09:00',m:mock.m,marks:mock.marks,al:cfg.alarm!==false,score:null,gen:1});
      });
    }
  }
  if(droppedAll.size)warn.push(H(droppedAll.size+' subject(s) do not fit in the weekly sessions: '+[...droppedAll].map(id=>(subjects.find(s=>s.id===id)||{}).name).join(', ')+'. Add study hours, or drop a subject.',droppedAll.size+' विषय हफ़्ते के सत्रों में फ़िट नहीं हुए: '+[...droppedAll].map(id=>(subjects.find(s=>s.id===id)||{}).name).join(', ')+'। पढ़ाई के घंटे बढ़ाएँ या कोई विषय हटाएँ।'));
  if(lostTotal>0)warn.push(H('Some hours did not fit inside the parts of the day you chose, so a few sessions are shorter than your target. Pick another part of the day to get them back.','चुने हुए समय में कुछ घंटे नहीं समा पाए, इसलिए कुछ सत्र लक्ष्य से छोटे हैं। वे घंटे वापस पाने के लिए दिन का कोई और हिस्सा चुनें।'));
  if(mocks&&capOf(mockDay,false,false)<mock.m+60&&phases.some(p=>p.id!=='learn'))warn.push(H('Your '+DAYS_LONG[mockDay]+' hours were short for a full '+fmtDur(mock.m)+' paper, so that day is longer in the revision and final stretch.',DAYS_LONG[mockDay]+' के घंटे '+fmtDur(mock.m)+' के पूरे पेपर के लिए कम थे, इसलिए रिवीज़न और अंतिम चरण में उस दिन को लंबा किया है।'));
  if(blocks.length>280)throw new Error(H('That makes '+blocks.length+' separate weekly sessions, more than the app can store (280). Choose a longer sitting, fewer hours or fewer subjects.',blocks.length+' अलग साप्ताहिक सत्र बन रहे हैं, जो ऐप के सीमा (280) से ज़्यादा है। लंबी बैठक, कम घंटे या कम विषय चुनें।'));
  const weekMin=ph=>blocks.filter(b=>b.ph===ph.id).reduce((a,b)=>a+b.m,0);
  phases.forEach(p=>{p.weekMin=weekMin(p)});
  let totalMin=0;
  for(const ph of phases){
    for(let t=parseYmd(ph.from);t<=parseYmd(ph.to);t=addDays(t,1))totalMin+=blocks.filter(b=>b.ph===ph.id&&b.days.includes(dow(t))).reduce((a,b)=>a+b.m,0);
  }
  const plan=Object.assign(defaultPlan(),{exam:cfg.end,examName:cfg.examName||'',buffer:phases.length&&phases[phases.length-1].id==='final'?phases[phases.length-1].days:21,lead:cfg.lead==null?5:cfg.lead,subjects,blocks,tests,phases:phases.map(p=>({id:p.id,name:p.name,from:p.from,to:p.to}))});
  return {plan,phases,warnings:warn,totalMin,days:D,studyDays:D};
}

(function(){
  const put=(en,hi)=>{if(!Object.prototype.hasOwnProperty.call(HI,en))HI[en]=hi};
  for(const k in FOCUS)put(FOCUS[k][0],FOCUS[k][2]);
  put('Mock review & weak topics','मॉक की समीक्षा और कमज़ोर टॉपिक');
  put('Mock test day (test or review)','मॉक टेस्ट का दिन (टेस्ट या समीक्षा)');
  PAT.push([/^Mock test (\d+)$/,'मॉक टेस्ट $1']);
  for(const p of PERIODS){put(p.name,{early:'तड़के सुबह',morning:'सुबह',afternoon:'दोपहर',evening:'शाम',night:'रात'}[p.id])}
  put('5 to 8','5 से 8');put('8 to 12','8 से 12');put('12 to 5','12 से 5');put('5 to 9','5 से 9');put('9 to 11:30','9 से 11:30');
})();
