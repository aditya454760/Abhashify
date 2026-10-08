
/* ---------- course setup wizard ----------
   exam -> exact paper -> subjects (+ optional ones) -> permissions -> study tools -> date -> comfortable hours -> timetable.
   Everything here is text in H(english, hindi). The overlay has its own click handling (data-wz) so it never clashes
   with the rest of the app. */
let W=null;
const WSTEPS=['exam','variant','subjects','perms','tools','when','comfort','plan'];
const MIXNAME='Revision & full mocks';
const FAM=id=>id==='other'?{id:'other',name:'Other',hi:'अन्य',v:[],tools:'yt,drive,tg'}:EXAMS.find(f=>f.id===id);
const wvCustom=()=>({id:'custom',name:(W.cName||'').trim()||'My exam',hi:'',when:'',wm:[],hrs:[3,5],mk:[180,100],s:[],o:[]});
const wVar=()=>{if(!W||!W.fam)return null;if(W.fam==='other'||W.vr==='custom')return wvCustom();const f=FAM(W.fam);return f&&f.v.find(v=>v.id===W.vr)||null};
const wFmt=ds=>parseYmd(ds).toLocaleDateString(LOC(),{day:'numeric',month:'short',year:'numeric'});
const wDays=(a,b)=>Math.round((parseYmd(b)-parseYmd(a))/864e5);

function openWizard(o){
  o=o||{};
  const ctx=o.ctx||(CL&&o.newCourse?'newcourse':(S.plan.subjects.length||S.plan.blocks.length)?'redo':'onboard');
  W={ctx,step:'exam',fam:null,vr:null,cName:'',cSubs:'',base:[],picks:[],gx:[],offB:{},conf:{},extra:[],cover:0,
     whenMode:'date',dDate:'',dMonth:'',dTarget:'',start:ymd(new Date()),confirmed:false,
     hw:null,he:null,off:[],periods:['morning','evening'],sess:90,alarms:true,mocks:true,
     toolSel:new Set(),toolCustom:[],draft:null,draftErr:'',phSel:null,daySel:dow(new Date()),courseName:'',leave:false,busy:false};
  let el=document.getElementById('wiz');
  if(!el){el=document.createElement('div');el.id='wiz';document.body.appendChild(el)}
  el.hidden=false;document.body.classList.add('lock');
  closeSheet(true);
  wizPaint();
}
function closeWizard(){
  const el=document.getElementById('wiz');if(el){el.hidden=true;el.innerHTML=''}
  document.body.classList.remove('lock');W=null;
}
const wInfo=(en,hi)=>`<p class="muted">${H(en,hi)}</p>`;
const wOpt=(wz,attrs,on,main,sub)=>`<button type="button" class="wz-opt" data-wz="${wz}" ${attrs||''} aria-pressed="${!!on}"><span class="wz-ot">${main}</span>${sub?`<span class="small muted">${sub}</span>`:''}</button>`;
const wSwitch=(label,wf,on)=>`<label class="switch"><span>${label}</span><input type="checkbox" data-wf="${wf}"${on?' checked':''}></label>`;

/* ----- step: exam ----- */
function stExam(){
  let h=wInfo('Pick what you are preparing for. I will load its subjects, then ask a few questions and build your timetable.','चुनें कि आप किसकी तैयारी कर रहे हैं। मैं उसके विषय जोड़ दूँगा, कुछ सवाल पूछूँगा और आपका टाइम-टेबल बना दूँगा।');
  if(W.ctx==='redo')h+=`<p class="note">${ic('spark')}<span>${H('This replaces your current subjects, timetable and tests. Your logged sessions and materials stay.','इससे आपके मौजूदा विषय, टाइम-टेबल और टेस्ट बदल जाएँगे। दर्ज किए सत्र और सामग्री बनी रहेगी।')}</span></p>`;
  h+=`<div class="wz-grid">`+EXAMS.map(f=>wOpt('fam',`data-v="${f.id}"`,W.fam===f.id,esc(L(f.name)),esc(L(f.d)))).join('')+wOpt('fam','data-v="other"',W.fam==='other',H('Other','अन्य'),H('Anything not listed. You type the subjects.','जो सूची में नहीं है। विषय आप खुद लिखें।'))+`</div>`;
  h+=`<div class="stack" style="gap:8px"><span class="kick">${H('Language','भाषा')}</span>${langSeg()}</div>`;
  if(W.ctx!=='redo')h+=`<button class="btn ghost" type="button" data-wz="skip">${W.ctx==='newcourse'?H('Skip the setup and create an empty course','सेटअप छोड़ें और खाली कोर्स बनाएँ'):H('Skip the setup and build my own plan','सेटअप छोड़ें और अपना प्लान खुद बनाएँ')}</button>`;
  return h;
}

/* ----- step: exact paper (branch / stage) ----- */
function stVariant(){
  const f=FAM(W.fam);
  if(W.fam==='other')return stCustom(true);
  let h=wInfo('Which one exactly? Each has its own subjects.','ठीक-ठीक कौन-सा? हर एक के अपने विषय हैं।');
  h+=`<div class="wz-list">`+f.v.map(v=>wOpt('var',`data-v="${v.id}"`,W.vr===v.id,esc(L(v.name)),esc(v.when?L(v.when):''))).join('')+wOpt('var','data-v="custom"',W.vr==='custom',H('Other (my own paper or branch)','अन्य (मेरा अपना पेपर या शाखा)'),H('You type the name and the subjects.','नाम और विषय आप खुद लिखें।'))+`</div>`;
  if(W.vr==='custom')h+=stCustom(false);
  return h;
}
function stCustom(top){
  return `<section class="card wz-card">${top?wInfo('Tell me what you are preparing for. I will use your subjects and ask the same questions as for the listed exams.','बताइए आप किसकी तैयारी कर रहे हैं। मैं आपके विषयों के साथ वही सवाल पूछूँगा जो सूची वाली परीक्षाओं के लिए पूछता हूँ।'):''}
    <label class="field">${H('Exam or goal name','परीक्षा या लक्ष्य का नाम')}<input type="text" data-wf="cName" value="${esc(W.cName)}" maxlength="30" placeholder="${H('For example: State Police exam','जैसे: राज्य पुलिस परीक्षा')}"></label>
    <label class="field">${H('Subjects, one per line','विषय, हर पंक्ति में एक')}<textarea data-wf="cSubs" rows="6" placeholder="${H('Maths\nReasoning\nGeneral Knowledge','गणित\nतर्कशक्ति\nसामान्य ज्ञान')}">${esc(W.cSubs)}</textarea></label></section>`;
}

/* ----- step: subjects ----- */
function wizInitSubs(){
  const v=wVar();
  W.base=W.vr==='custom'||W.fam==='other'
    ?W.cSubs.split('\n').map(x=>x.trim().slice(0,40)).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,40).map(n=>({name:n,w:3}))
    :v.s.filter(s=>s.name!==MIXNAME).map(s=>({name:s.name,w:s.w}));
  W.picks=v.o.map(()=>[]);W.gx=v.o.map(()=>[]);W.offB={};W.conf={};W.extra=[];
  W.hw=null;W.he=null;W.draft=null;
}
function wizSubjects(){
  const v=wVar(),out=[],seen=new Set();
  const push=(name,w)=>{const k=name.toLowerCase();if(!name||seen.has(k)||name===MIXNAME)return;seen.add(k);out.push({name,w:w||3,c:W.conf[name]||3})};
  W.base.forEach(b=>{if(!W.offB[b.name])push(b.name,b.w)});
  v.o.forEach((g,gi)=>{(W.picks[gi]||[]).forEach(n=>{const s=g.l.find(x=>x.name===n);push(n,s?s.w:3)});(W.gx[gi]||[]).forEach(n=>push(n,3))});
  W.extra.forEach(n=>push(n,3));
  return out;
}
function wizSubErr(){
  const v=wVar();
  for(let gi=0;gi<v.o.length;gi++){
    const g=v.o[gi],n=(W.picks[gi]||[]).length+(W.gx[gi]||[]).length;
    if(n<g.min)return H('Choose '+(g.min===g.n?g.n:'at least '+g.min)+' for: '+L(g.q),L(g.q)+': '+(g.min===g.n?g.n+' चुनें':'कम से कम '+g.min+' चुनें'));
  }
  if(!wizSubjects().length)return H('Add at least one subject.','कम से कम एक विषय जोड़ें।');
  return '';
}
function stSubjects(){
  const v=wVar();
  let h=wInfo('Untick anything you do not need, say how strong you feel in each subject, or add your own. Weaker and more important subjects get more time.','जो ज़रूरी नहीं उसे हटाएँ, हर विषय में अपनी मज़बूती बताएँ, या अपना विषय जोड़ें। कमज़ोर और ज़्यादा ज़रूरी विषयों को ज़्यादा समय मिलेगा।');
  v.o.forEach((g,gi)=>{
    const sel=W.picks[gi],gx=W.gx[gi],cnt=sel.length+gx.length,full=cnt>=g.n;
    const hint=g.min===g.n?H('Choose '+g.n,g.n+' चुनें'):g.min>0?H('Choose up to '+g.n+' (at least '+g.min+')','अधिकतम '+g.n+' चुनें (कम से कम '+g.min+')'):H('Optional. Choose up to '+g.n,'वैकल्पिक। अधिकतम '+g.n+' चुनें');
    h+=`<section class="card wz-card"><div class="stack" style="gap:2px"><h3>${esc(L(g.q))}</h3><p class="small muted">${hint} · ${cnt}/${g.n}</p></div><div class="wz-chips">`+
      g.l.map(s=>{const on=sel.includes(s.name);return `<button type="button" class="wz-chip" data-wz="pick" data-g="${gi}" data-n="${esc(s.name)}" aria-pressed="${on}"${!on&&full&&g.n>1?' disabled':''}>${esc(L(s.name))}</button>`}).join('')+
      gx.map((n,i)=>`<button type="button" class="wz-chip" data-wz="gxdel" data-g="${gi}" data-i="${i}" aria-pressed="true">${esc(n)} ×</button>`).join('')+`</div>
      <div class="wz-add"><input type="text" data-wf="gx${gi}" maxlength="40" placeholder="${H('Other: type yours','अन्य: अपना लिखें')}" aria-label="${H('Other','अन्य')}"><button class="btn sm soft" type="button" data-wz="gxadd" data-g="${gi}">${H('Add','जोड़ें')}</button></div></section>`;
  });
  const rate=(name,c)=>`<div class="seg wz-rate" role="group" aria-label="${H('How strong are you in','आपकी मज़बूती')} ${esc(name)}">`+[[2,'Weak','कमज़ोर'],[3,'OK','ठीक'],[4,'Strong','मज़बूत']].map(([n,e,hh])=>`<button type="button" data-wz="conf" data-n="${esc(name)}" data-v="${n}" aria-pressed="${(W.conf[name]||3)===n}">${H(e,hh)}</button>`).join('')+`</div>`;
  h+=`<section class="card wz-card"><div class="stack" style="gap:2px"><h3>${H('Your subjects','आपके विषय')}</h3><p class="small muted">${H('How strong do you feel in each?','हर विषय में आप कितने मज़बूत हैं?')}</p></div>`;
  const rows=[];
  W.base.forEach(b=>{
    const off=!!W.offB[b.name];
    rows.push(`<div class="wz-sub${off?' off':''}"><label class="wz-chk"><input type="checkbox" data-wz="boff" data-n="${esc(b.name)}"${off?'':' checked'}><span>${esc(L(b.name))}</span></label>${off?'':rate(b.name)}</div>`);
  });
  v.o.forEach((g,gi)=>{
    (W.picks[gi]||[]).forEach(n=>rows.push(`<div class="wz-sub"><span class="t">${esc(L(n))}</span>${rate(n)}</div>`));
    (W.gx[gi]||[]).forEach(n=>rows.push(`<div class="wz-sub"><span class="t">${esc(n)}</span>${rate(n)}</div>`));
  });
  W.extra.forEach((n,i)=>rows.push(`<div class="wz-sub"><span class="row between" style="gap:8px"><span class="t">${esc(n)}</span><button class="icb sm" type="button" data-wz="exdel" data-i="${i}" aria-label="${H('Remove','हटाएँ')}">${ic('x')}</button></span>${rate(n)}</div>`));
  h+=(rows.join('')||`<p class="small muted">${H('No subjects yet. Add one below.','अभी कोई विषय नहीं। नीचे जोड़ें।')}</p>`);
  h+=`<div class="wz-add"><input type="text" data-wf="exadd" maxlength="40" placeholder="${H('Add a subject of your own','अपना विषय जोड़ें')}" aria-label="${H('Add a subject','विषय जोड़ें')}"><button class="btn sm soft" type="button" data-wz="exadd">${H('Add','जोड़ें')}</button></div></section>`;
  h+=`<section class="card wz-card"><div class="stack" style="gap:2px"><h3>${H('Where are you in the syllabus?','पाठ्यक्रम में आप कहाँ हैं?')}</h3><p class="small muted">${H('This decides how much of the plan is learning and how much is revision.','इससे तय होता है कि प्लान में कितना सीखना और कितना रिवीज़न होगा।')}</p></div><div class="seg" role="group">`+
    [[0,'Starting fresh','शुरू से'],[1,'About half done','लगभग आधा हो चुका'],[2,'Most of it done','ज़्यादातर हो चुका']].map(([n,e,hh])=>`<button type="button" data-wz="cover" data-v="${n}" aria-pressed="${W.cover===n}">${H(e,hh)}</button>`).join('')+`</div></section>`;
  const err=wizSubErr();
  if(err)h+=`<p class="err" role="alert" style="display:block">${esc(err)}</p>`;
  return h;
}

/* ----- step: permissions (right after the course is decided) ----- */
function stPerms(){
  return wInfo('Your course is set. So you do not have to hunt for settings later, allow these now. Each one is asked only once; the browser remembers your answer and you can change it any time.','आपका कोर्स तय हो गया। बाद में सेटिंग ढूँढनी न पड़े, इसलिए अभी अनुमति दे दें। हर एक सिर्फ़ एक बार पूछी जाएगी; ब्राउज़र आपका जवाब याद रखेगा और आप कभी भी बदल सकते हैं।')+
    `<div class="perms" id="wizperms">${PERM_INFO.map(permRow).join('')}</div>
    <button class="btn" type="button" id="permallbtn" data-act="permall"${PERM_INFO.some(p=>permStatus(p.k)==='ask')?'':' hidden'}>${ic('check')}${H('Allow all of these','इन सबकी अनुमति दें')}</button>
    <p class="small muted">${H('You can skip this and continue. Nothing here is needed to make the timetable.','आप इसे छोड़कर आगे बढ़ सकते हैं। टाइम-टेबल बनाने के लिए इनमें से कुछ ज़रूरी नहीं।')}</p>`;
}

/* ----- step: study tools ----- */
function wizToolList(){
  const f=FAM(W.fam)||{tools:'yt,drive,tg'};
  return f.tools.split(',').map(id=>TOOLS.find(t=>t.id===id)).filter(Boolean);
}
function wizToolsPaint(){
  const el=document.getElementById('wiztools');if(!el)return;
  el.innerHTML=wizToolsHtml();
}
function wizToolsHtml(){
  const sug=wizToolList();
  let h=`<div class="wz-chips">`+sug.map(t=>`<button type="button" class="wz-chip" data-wz="tool" data-t="${t.id}" aria-pressed="${W.toolSel.has(t.id)}">${esc(L(t.name))}</button>`).join('')+
    W.toolCustom.map((t,i)=>`<button type="button" class="wz-chip" data-wz="tooldel" data-i="${i}" aria-pressed="true">${esc(t.name)} ×</button>`).join('')+`</div>`;
  h+=`<div class="grid2"><label class="field">${H('Name','नाम')}<input type="text" data-wf="tn" maxlength="40" placeholder="${H('My YouTube playlist','मेरी YouTube प्लेलिस्ट')}"></label><label class="field">${H('Link','लिंक')}<input type="url" data-wf="tu" maxlength="300" placeholder="https://"></label></div>
    <button class="btn sm soft" type="button" data-wz="tooladd">${ic('plus')}${H('Add this tool','यह टूल जोड़ें')}</button><p class="err" id="wzterr" role="alert"></p>`;
  h+=trackOn()
    ?`<p class="note">${ic('check')}<span>${H('Automatic tracking is on. Opening any of these from Abhyashify logs the time until you come back.','अपने-आप ट्रैकिंग चालू है। इनमें से किसी को Abhyashify से खोलने पर लौटने तक का समय दर्ज होगा।')}</span></p>`
    :`<div class="note" style="flex-wrap:wrap">${ic('spark')}<span>${H('Automatic tracking is off. Turn it on once and I will log the time you spend in these without asking again.','अपने-आप ट्रैकिंग बंद है। एक बार चालू कर दें तो मैं बिना दोबारा पूछे इनमें बिताया समय दर्ज करूँगा।')}</span><button class="btn sm" type="button" data-act="trackon">${H('Turn on','चालू करें')}</button></div>`;
  return h;
}
function stTools(){
  return wInfo('Which apps, websites or YouTube channels do you study with? Pick them once. They appear on your Today screen as one-tap buttons, and when you open one from there, the time you spend is logged as study time automatically, with no questions asked each time.','आप किन ऐप, वेबसाइट या YouTube चैनल से पढ़ते हैं? एक बार चुन लें। वे आपकी "आज" स्क्रीन पर एक-टैप बटन बनकर दिखेंगे, और वहाँ से खोलने पर आपका बिताया समय अपने-आप पढ़ाई के समय में दर्ज होगा, हर बार पूछे बिना।')+
    `<div id="wiztools" class="stack" style="gap:12px">${wizToolsHtml()}</div>
    <p class="small muted">${H('A web page cannot see what happens inside other apps. It sees only that you left to open a tool from here and came back. For time spent in apps you open yourself, use the Android companion app and import its file later (Plan → Study tools and permissions).','वेब पेज दूसरे ऐप के अंदर क्या होता है यह नहीं देख सकता। वह सिर्फ़ यह देखता है कि आप यहाँ से कोई टूल खोलने गए और लौट आए। जिन ऐप को आप खुद खोलते हैं उनका समय Android साथी ऐप से मिलेगा; उसकी फ़ाइल बाद में इंपोर्ट करें (प्लान → पढ़ाई के टूल और अनुमतियाँ)।')}</p>`;
}

/* ----- step: exam date ----- */
function wizTypical(){
  const v=wVar();if(!v||!v.wm||!v.wm.length)return null;
  const st=parseYmd(W.start),min=addDays(st,45);let best=null;
  for(let y=st.getFullYear();y<=st.getFullYear()+2;y++)for(const m of v.wm){const d=new Date(y,m-1,1);if(d>=min&&(!best||d<best))best=d}
  return best;
}
function wizEnd(){
  const st=W.start,out={end:'',kind:W.whenMode,err:'',warn:''};
  if(!st||isNaN(parseYmd(st)))return Object.assign(out,{err:H('Pick the day you start studying.','पढ़ाई शुरू करने का दिन चुनें।')});
  if(W.whenMode==='date'||W.whenMode==='target'){
    const v=W.whenMode==='date'?W.dDate:W.dTarget;
    if(!v)return Object.assign(out,{err:W.whenMode==='date'?H('Enter your exam date.','अपनी परीक्षा की तारीख़ भरें।'):H('Enter the date you want to finish by.','जिस तारीख़ तक पूरा करना है वह भरें।')});
    out.end=v;
  }else if(W.whenMode==='month'){
    if(!W.dMonth)return Object.assign(out,{err:H('Pick the month and year of your exam.','अपनी परीक्षा का महीना और साल चुनें।')});
    out.end=W.dMonth+'-01';
    out.warn=H('You gave a month, so I plan up to the 1st of it. That keeps you a little ahead of the real date.','आपने महीना बताया है, इसलिए मैं उसकी 1 तारीख़ तक प्लान बना रहा हूँ। इससे आप असली तारीख़ से थोड़ा आगे रहेंगे।');
  }else{
    const d=wizTypical();
    if(!d)return Object.assign(out,{err:H('There is no usual month for this one. Choose one of the other options.','इसका कोई तय महीना नहीं है। दूसरा विकल्प चुनें।')});
    out.end=ymd(d);
    out.warn=H('This is only a placeholder from when the exam is usually held, not an official date. Check the official notice and change it in Settings when it is announced.','यह सिर्फ़ उस समय का अनुमान है जब परीक्षा आम तौर पर होती है, आधिकारिक तारीख़ नहीं। आधिकारिक सूचना देखें और घोषणा होने पर सेटिंग में बदल दें।');
  }
  if(isNaN(parseYmd(out.end)))return Object.assign(out,{err:H('That date does not look right.','यह तारीख़ सही नहीं लग रही।')});
  const n=wDays(st,out.end);
  if(n<7)return Object.assign(out,{err:H('The date must be at least a week after you start.','तारीख़ शुरू करने के दिन से कम से कम एक हफ़्ता आगे होनी चाहिए।')});
  if(n>1460)return Object.assign(out,{err:H('That is more than four years away. Pick a nearer date.','यह चार साल से ज़्यादा दूर है। नज़दीक की तारीख़ चुनें।')});
  if(n<30)out.warn=(out.warn?out.warn+' ':'')+H('That is under a month, so the plan will be a revision sprint.','यह एक महीने से कम है, इसलिए प्लान रिवीज़न की दौड़ जैसा होगा।');
  out.days=n;return out;
}
function stWhen(){
  const v=wVar(),typ=wizTypical(),e=wizEnd();
  let h=wInfo('I need an end date to build the timetable up to. Tell me whichever you know and I will check it with you.','टाइम-टेबल बनाने के लिए मुझे अंतिम तारीख़ चाहिए। जो भी आपको पता हो बताइए, मैं आपके साथ उसे जाँच लूँगा।');
  h+=`<label class="field">${H('Start studying from','पढ़ाई शुरू करने का दिन')}<input type="date" data-wf="start" value="${esc(W.start)}" min="${ymd(new Date())}"></label>`;
  h+=`<div class="wz-list">`+
    wOpt('wm','data-v="date"',W.whenMode==='date',H('I know the exam date','मुझे परीक्षा की तारीख़ पता है'))+
    (W.whenMode==='date'?`<input class="wz-in" type="date" data-wf="dDate" value="${esc(W.dDate)}" aria-label="${H('Exam date','परीक्षा की तारीख़')}">`:'')+
    wOpt('wm','data-v="month"',W.whenMode==='month',H('I only know the month and year','मुझे सिर्फ़ महीना और साल पता है'))+
    (W.whenMode==='month'?`<input class="wz-in" type="month" data-wf="dMonth" value="${esc(W.dMonth)}" aria-label="${H('Exam month','परीक्षा का महीना')}">`:'')+
    wOpt('wm','data-v="target"',W.whenMode==='target',H('I have my own target to finish by','मेरा खुद का पूरा करने का लक्ष्य है'),H('For example a course-completion date.','जैसे कोर्स पूरा करने की तारीख़।'))+
    (W.whenMode==='target'?`<input class="wz-in" type="date" data-wf="dTarget" value="${esc(W.dTarget)}" aria-label="${H('Target date','लक्ष्य की तारीख़')}">`:'')+
    (typ?wOpt('wm','data-v="typical"',W.whenMode==='typical',H('I am not sure yet','मुझे अभी पक्का नहीं पता'),H('Use the usual time: '+(v.when||''),'आम समय इस्तेमाल करें: '+L(v.when||''))):'')+
  `</div>`;
  if(v.when&&W.whenMode!=='typical')h+=`<p class="small muted">${H('Usually: ','आम तौर पर: ')}${esc(L(v.when))} ${H('This is only a guide and changes every year. Check the official notice.','यह सिर्फ़ एक अंदाज़ा है और हर साल बदलता है। आधिकारिक सूचना देखें।')}</p>`;
  if(e.err)h+=`<p class="err" role="alert" style="display:block">${esc(e.err)}</p>`;
  else{
    const wk=Math.round(e.days/7);
    h+=`<section class="card wz-card"><span class="kick">${H('Please check','कृपया जाँच लें')}</span><p><b>${esc(wFmt(e.end))}</b> ${H(e.kind==='target'?'is your target date':'is your exam date','आपकी '+(e.kind==='target'?'लक्ष्य तारीख़ है':'परीक्षा की तारीख़ है'))}.</p>
      <p class="muted">${H('The timetable runs from '+wFmt(W.start)+' to '+wFmt(e.end)+': '+e.days+' days, about '+wk+' weeks.',wFmt(W.start)+' से '+wFmt(e.end)+' तक टाइम-टेबल चलेगा: '+e.days+' दिन, लगभग '+wk+' हफ़्ते।')}</p>
      ${e.warn?`<p class="small" style="color:var(--warn)">${esc(e.warn)}</p>`:''}
      <label class="switch"><span>${H('Yes, plan up to this date','हाँ, इसी तारीख़ तक प्लान बनाएँ')}</span><input type="checkbox" data-wf="confirmed"${W.confirmed?' checked':''}></label></section>`;
  }
  return h;
}

/* ----- step: when do you like to study ----- */
function stComfort(){
  const v=wVar();
  if(W.hw==null){W.hw=v.hrs[0];W.he=v.hrs[1]}
  const wkMin=[0,1,2,3,4,5,6].reduce((a,d)=>a+(W.off.includes(d)?0:(d>=5?W.he:W.hw)*60),0);
  let h=wInfo('Now tell me what suits you. I will fit the timetable into the times you pick. You can change every block afterwards.','अब बताइए आपके लिए क्या ठीक रहेगा। मैं टाइम-टेबल आपके चुने समय में बिठा दूँगा। बाद में हर ब्लॉक बदल सकते हैं।');
  h+=`<div class="grid2"><label class="field">${H('Hours on weekdays','सोम-शुक्र के घंटे')}<input type="number" data-wf="hw" min="0.5" max="14" step="0.5" value="${W.hw}" inputmode="decimal"></label><label class="field">${H('Hours on Saturday and Sunday','शनि-रवि के घंटे')}<input type="number" data-wf="he" min="0.5" max="14" step="0.5" value="${W.he}" inputmode="decimal"></label></div>
    <p class="small muted" id="wzwk">${H('About '+fmtDur(wkMin)+' a week.','हफ़्ते में लगभग '+FD(wkMin)+'।')}</p>`;
  h+=`<div class="stack" style="gap:8px"><span class="kick">${H('Which part of the day suits you? Pick all that apply','दिन का कौन-सा हिस्सा ठीक रहेगा? जितने चाहें चुनें')}</span><div class="wz-chips">`+PERIODS.map(p=>`<button type="button" class="wz-chip" data-wz="per" data-v="${p.id}" aria-pressed="${W.periods.includes(p.id)}">${esc(L(p.name))} · ${esc(L(p.sub))}</button>`).join('')+`</div></div>`;
  h+=`<div class="stack" style="gap:8px"><span class="kick">${H('Rest day (optional)','आराम का दिन (वैकल्पिक)')}</span><div class="days">`+DAYS.map((d,i)=>`<label><input type="checkbox" data-wz="off" data-v="${i}"${W.off.includes(i)?' checked':''}>${esc(L(d))}</label>`).join('')+`</div></div>`;
  h+=`<div class="stack" style="gap:8px"><span class="kick">${H('Longest single sitting','एक बार में सबसे लंबा समय')}</span><div class="seg">`+[45,60,90,120].map(n=>`<button type="button" data-wz="sess" data-v="${n}" aria-pressed="${W.sess===n}">${FD(n)}</button>`).join('')+`</div></div>`;
  h+=wSwitch(H('Weekly mock tests in the later phases','बाद के चरणों में हर हफ़्ते मॉक टेस्ट'),'mocks',W.mocks)+wSwitch(H('Ring an alarm before each block','हर ब्लॉक से पहले अलार्म बजाएँ'),'alarms',W.alarms);
  if(!W.periods.length)h+=`<p class="err" role="alert" style="display:block">${H('Pick at least one part of the day.','दिन का कम से कम एक हिस्सा चुनें।')}</p>`;
  return h;
}
function wizComfortErr(){
  if(!W.periods.length)return 1;
  if(!(W.hw>=0.5&&W.hw<=14&&W.he>=0.5&&W.he<=14))return 1;
  if(W.off.length>=7)return 1;
  return 0;
}

/* ----- step: the timetable ----- */
function wizExamName(){
  const f=FAM(W.fam),v=wVar();
  if(W.fam==='other'||W.vr==='custom')return (W.cName||'').trim().slice(0,30)||'My exam';
  let n=v.name.replace(/\s*\([^)]*\)/g,'').replace(/:\s*/g,' ').replace(/\s+/g,' ').trim();
  if(f.pf)n=f.pf+' '+n;
  return n.slice(0,30);
}
function wizGenerate(){
  const v=wVar(),e=wizEnd();
  W.draftErr='';W.draft=null;
  try{
    W.draft=genPlan({start:W.start,end:e.end,subjects:wizSubjects(),hw:W.hw,he:W.he,off:W.off,periods:W.periods,sess:W.sess,brk:10,cover:W.cover,
      mock:{m:v.mk[0],marks:v.mk[1]},mocks:W.mocks,alarm:W.alarms,lead:5,examName:wizExamName()});
    W.draft.dateKind=e.kind;W.phSel=W.draft.phases[0]?W.draft.phases[0].id:null;
    if(!W.courseName)W.courseName=wizExamName();
  }catch(err){W.draftErr=err.message}
}
function wBlockRow(b){
  const subj=W.draft.plan.subjects;
  return `<div class="wz-blk" data-id="${b.id}"><input type="time" data-wb="${b.id}" data-f="st" value="${b.st}" aria-label="${H('Start','शुरू')}">
    <input type="number" data-wb="${b.id}" data-f="m" min="5" max="600" step="5" value="${b.m}" inputmode="numeric" aria-label="${H('Minutes','मिनट')}">
    <select data-wb="${b.id}" data-f="s" aria-label="${H('Subject','विषय')}">${subj.map(s=>`<option value="${esc(s.id)}"${s.id===b.s?' selected':''}>${esc(L(s.name))}</option>`).join('')}</select>
    <button class="icb sm" type="button" data-wz="blkdel" data-id="${b.id}" aria-label="${H('Remove this block','यह ब्लॉक हटाएँ')}">${ic('x')}</button>
    <span class="small muted wz-bk">${esc(L(KINDS[b.k]))}${b.k==='mock'?'':b.t?' · '+esc(L(b.t)):''}</span></div>`;
}
function stPlan(){
  if(W.draftErr)return `<p class="err" role="alert" style="display:block">${esc(W.draftErr)}</p>`;
  const d=W.draft;if(!d)return '';
  const P=d.plan,e=wizEnd();
  let h=`<section class="card wz-card"><div class="stack" style="gap:3px"><h3>${esc(P.examName)}</h3><p class="muted">${H(wFmt(W.start)+' to '+wFmt(P.exam)+' · '+d.days+' days',wFmt(W.start)+' से '+wFmt(P.exam)+' · '+d.days+' दिन')}</p>
    <p class="muted">${H('About '+fmtDur(Math.round(d.totalMin/Math.max(1,d.days/7)))+' a week · '+d.plan.subjects.filter(s=>s.id!==MIX_ID).length+' subjects · '+P.tests.length+' mock tests scheduled','हफ़्ते में लगभग '+FD(Math.round(d.totalMin/Math.max(1,d.days/7)))+' · '+d.plan.subjects.filter(s=>s.id!==MIX_ID).length+' विषय · '+P.tests.length+' मॉक टेस्ट तय')}</p></div>`;
  h+=d.phases.map(p=>`<div class="wz-ph"><b>${esc(L(p.name))}</b><span class="small muted">${esc(phDate(p.from))} to ${esc(phDate(p.to))} · ${H(p.days+' days',p.days+' दिन')} · ${H(fmtDur(p.weekMin)+' a week',FD(p.weekMin)+' प्रति हफ़्ता')}</span><span class="small muted">${esc(p.note)}</span></div>`).join('')+`</section>`;
  if(e.warn)h+=`<p class="note">${ic('spark')}<span>${esc(e.warn)}</span></p>`;
  d.warnings.forEach(w=>{h+=`<p class="note">${ic('spark')}<span>${esc(w)}</span></p>`});
  h+=`<section class="card wz-card"><div class="stack" style="gap:2px"><h3>${H('Follow it as it is, or change it','जैसा है वैसा अपनाएँ, या बदलें')}</h3><p class="small muted">${H('Change the time, minutes or subject of any block, remove one, or add your own. You can also edit everything later in the Plan tab.','किसी भी ब्लॉक का समय, मिनट या विषय बदलें, कोई हटाएँ या अपना जोड़ें। यह सब बाद में प्लान टैब में भी बदल सकते हैं।')}</p></div>`;
  if(d.phases.length>1)h+=`<div class="seg" role="group" aria-label="${H('Phase','चरण')}">`+d.phases.map(p=>`<button type="button" data-wz="phase" data-v="${p.id}" aria-pressed="${p.id===W.phSel}">${esc(L(p.name))}</button>`).join('')+`</div>`;
  h+=`<div class="seg" role="group" aria-label="${H('Day','दिन')}">`+DAYS.map((x,i)=>`<button type="button" data-wz="day" data-v="${i}" aria-pressed="${i===W.daySel}">${esc(L(x))}</button>`).join('')+`</div>`;
  const bl=P.blocks.filter(b=>b.days.includes(W.daySel)&&(!d.phases.length||b.ph===W.phSel)).sort((a,b)=>toMin(a.st)-toMin(b.st));
  h+=`<div class="stack" style="gap:8px">`+(bl.length?bl.map(wBlockRow).join(''):`<p class="small muted">${H('A free day.','खाली दिन।')}</p>`)+`</div>
    <button class="btn sm soft" type="button" data-wz="blkadd">${ic('plus')}${H('Add a block on this day','इस दिन एक ब्लॉक जोड़ें')}</button></section>`;
  if(P.tests.length)h+=`<p class="small muted">${H('Mock tests: '+P.tests.slice(0,4).map(t=>phDate(t.date)).join(', ')+(P.tests.length>4?' and '+(P.tests.length-4)+' more':'')+'. Each one rings an alarm and asks for your score afterwards.','मॉक टेस्ट: '+P.tests.slice(0,4).map(t=>phDate(t.date)).join(', ')+(P.tests.length>4?' और '+(P.tests.length-4)+' और':'')+'। हर एक पर अलार्म बजेगा और बाद में आपका स्कोर पूछा जाएगा।')}</p>`;
  if(W.ctx==='newcourse')h+=`<label class="field">${H('Name of this course','इस कोर्स का नाम')}<input type="text" data-wf="courseName" value="${esc(W.courseName)}" maxlength="80"></label>`;
  return h;
}
function wizAddBlock(){
  const P=W.draft.plan,per=PERIODS.filter(p=>W.periods.includes(p.id))[0]||PERIODS[1];
  const ph=W.draft.phases.find(p=>p.id===W.phSel)||W.draft.phases[0];
  P.blocks.push({id:uid(),days:[W.daySel],st:fromMin(per.a),m:60,s:P.subjects[0].id,k:'theory',sh:0,al:W.alarms,t:'',from:ph?ph.from:undefined,to:ph?ph.to:undefined,ph:ph?ph.id:undefined});
}

/* ----- frame ----- */
const WTITLES={exam:['Choose your exam','अपनी परीक्षा चुनें'],variant:['Which one exactly?','ठीक-ठीक कौन-सा?'],subjects:['Your subjects','आपके विषय'],perms:['Allow once, use everywhere','एक बार अनुमति, हर जगह उपयोग'],tools:['What do you study with?','आप किससे पढ़ते हैं?'],when:['Your exam date','आपकी परीक्षा की तारीख़'],comfort:['When do you like to study?','आप कब पढ़ना पसंद करते हैं?'],plan:['Your timetable','आपका टाइम-टेबल']};
function wizValid(){
  switch(W.step){
    case 'exam':return false;
    case 'variant':return W.fam==='other'?!!(W.cName.trim()&&W.cSubs.trim()):W.vr==='custom'?!!(W.cName.trim()&&W.cSubs.trim()):!!W.vr;
    case 'subjects':return !wizSubErr();
    case 'when':return !wizEnd().err&&W.confirmed;
    case 'comfort':return !wizComfortErr();
    case 'plan':return !!W.draft&&!W.busy;
    default:return true;
  }
}
function wizPaint(keep){
  const el=document.getElementById('wiz');if(!el||!W)return;
  const i=WSTEPS.indexOf(W.step),body=document.getElementById('wzbody'),sc=keep&&body?body.scrollTop:0;
  const f=FAM(W.fam);
  const title=W.step==='variant'&&f&&W.fam!=='other'?L(f.name):H(...WTITLES[W.step]);
  const html={exam:stExam,variant:stVariant,subjects:stSubjects,perms:stPerms,tools:stTools,when:stWhen,comfort:stComfort,plan:stPlan}[W.step]();
  const showNext=!(W.step==='exam'||(W.step==='variant'&&W.fam!=='other'&&W.vr!=='custom'));
  el.innerHTML=`<div class="wz" role="dialog" aria-modal="true" aria-label="${H('Course setup','कोर्स सेटअप')}">
    <header class="wz-h">${i>0?`<button class="icb" type="button" data-wz="back" aria-label="${H('Back','पीछे')}">${ic('chev','flip')}</button>`:'<span style="width:40px"></span>'}
      <div class="wz-t"><span class="kick">${H('Step '+(i+1)+' of '+WSTEPS.length,'चरण '+(i+1)+' / '+WSTEPS.length)}</span><b>${esc(title)}</b></div>
      <button class="icb${W.leave?' leave':''}" type="button" data-wz="close" aria-label="${W.leave?H('Tap again to discard the setup','सेटअप रद्द करने के लिए दोबारा दबाएँ'):H('Close','बंद करें')}">${W.leave?`<span class="small">${H('Discard?','रद्द करें?')}</span>`:ic('x')}</button></header>
    <div class="wz-bar"><i style="width:${Math.round((i+1)/WSTEPS.length*100)}%"></i></div>
    <div class="wz-b" id="wzbody"><div class="wz-in-b">${html}</div></div>
    ${showNext?`<footer class="wz-f"><button class="btn lg" type="button" data-wz="next"${wizValid()?'':' disabled'}>${W.step==='plan'?(W.busy?H('Saving…','सहेज रहा हूँ…'):H('Use this timetable','यह टाइम-टेबल अपनाएँ')):W.step==='perms'||W.step==='tools'?H('Continue','आगे बढ़ें'):H('Next','आगे')}</button></footer>`:''}</div>`;
  const nb=document.getElementById('wzbody');if(nb)nb.scrollTop=sc;
}
function wizGo(step){
  W.step=step;W.leave=false;
  if(step==='perms')refreshPerms().then(permRepaint);
  if(step==='plan')wizGenerate();
  wizPaint();const b=document.getElementById('wzbody');if(b)b.scrollTop=0;
}
function wizNext(){
  const i=WSTEPS.indexOf(W.step);
  if(!wizValid())return;
  if(W.step==='variant'){wizInitSubs();W.confirmed=false}
  if(W.step==='plan'){wizApply();return}
  wizGo(WSTEPS[i+1]);
}
function wizBack(){
  const i=WSTEPS.indexOf(W.step);if(i<=0)return;
  let s=WSTEPS[i-1];
  if(W.step==='subjects'&&W.fam==='other')s='variant';
  wizGo(s);
}
async function wizApply(){
  if(!W.draft||W.busy)return;
  W.busy=true;wizPaint(true);
  const P=W.draft.plan,e=wizEnd(),v=wVar(),f=FAM(W.fam);
  const tools=[];
  for(const id of W.toolSel){const t=TOOLS.find(x=>x.id===id);if(t)tools.push({id:t.id,name:t.name,url:t.url,pkg:t.pkg})}
  for(const t of W.toolCustom)tools.push(t);
  P.tools=tools;
  P.setup={fam:W.fam,famName:f.name,variant:W.vr||'custom',variantName:v.name,picks:(v.o||[]).map((g,gi)=>({q:g.q,sel:(W.picks[gi]||[]).concat(W.gx[gi]||[])})),
    mock:{m:v.mk[0],marks:v.mk[1]},dateKind:e.kind,cover:W.cover,hw:W.hw,he:W.he,off:W.off,periods:W.periods,sess:W.sess,mocks:W.mocks,alarms:W.alarms,made:ymd(new Date())};
  const name=(W.courseName||P.examName||'My course').trim().slice(0,80);
  try{
    if(W.ctx==='newcourse'&&CL){
      const id=await createCourse(name,P);CL.courses.push({id,name});
      if(W.alarms)setArmed(true);
      closeWizard();await openCourse(id);
    }else{
      S.plan=P;mark('plan');
      if(CL&&name&&(CL.name==='My course'||W.ctx==='redo')&&name!==CL.name){
        CL.name=name;const c=CL.courses.find(x=>x.id===CL.cid);if(c)c.name=name;
        FB.updateDoc(courseRef(),{name,updatedAt:FB.serverTimestamp()}).catch(()=>{});
      }
      if(W.alarms)setArmed(true);
      closeWizard();
    }
    planPh=null;tab='today';selIdx=dow(new Date());render();
    toast(H('Your timetable is ready. Tap the Plan tab to change anything.','आपका टाइम-टेबल तैयार है। कुछ बदलना हो तो प्लान टैब खोलें।'));
  }catch(err){
    console.error(err);W.busy=false;wizPaint(true);toast(H('Could not create the course: '+((err&&err.code)||'error'),'कोर्स नहीं बन सका: '+((err&&err.code)||'त्रुटि')));
  }
}

/* change the exam date later: rebuild the generated part of the timetable from the answers saved in plan.setup */
function rebuildPlan(end){
  const p=S.plan,su=p.setup;if(!su)throw new Error('This course was not made by the setup.');
  const today=ymd(new Date());
  if(!(wDays(today,end)>=7))throw new Error('The date must be at least a week from today to rebuild the timetable.');
  const subs=p.subjects.filter(s=>s.id!==MIX_ID).map(s=>({id:s.id,name:s.name,w:s.w,c:s.c}));
  const g=genPlan({start:today,end,subjects:subs,hw:su.hw,he:su.he,off:su.off||[],periods:su.periods,sess:su.sess,brk:10,cover:su.cover||0,
    mock:su.mock||{m:180,marks:100},mocks:su.mocks!==false,alarm:su.alarms!==false,lead:p.lead,examName:p.examName});
  p.blocks=p.blocks.filter(b=>b.man||!b.ph).concat(g.plan.blocks);
  p.tests=(p.tests||[]).filter(t=>t.score!=null||!t.gen||t.date<today).concat(g.plan.tests);
  p.phases=g.plan.phases;p.buffer=g.plan.buffer;
  if(!p.subjects.some(s=>s.id===MIX_ID)){const m=g.plan.subjects.find(s=>s.id===MIX_ID);if(m)p.subjects.push(m)}
  planPh=null;
}

/* ----- events ----- */
document.addEventListener('click',e=>{
  const t=e.target.closest('#wiz [data-wz]');if(!t||!W)return;
  const a=t.dataset.wz,d=t.dataset,v=wVar();
  switch(a){
    case 'close':
      if(W.step==='exam'||W.leave){closeWizard();break}
      W.leave=true;wizPaint(true);break;
    case 'back':wizBack();break;
    case 'next':wizNext();break;
    case 'skip':{
      const ctx=W.ctx;closeWizard();
      if(ctx==='newcourse'&&CL)emptyCourseForm();
      else{S.plan.subjects=[{id:uid(),name:'Subject 1',w:3,c:3}];mark('plan');tab='plan';render()}
      break}
    case 'fam':W.fam=d.v;W.vr=null;wizGo('variant');break;
    case 'var':W.vr=d.v;
      if(d.v==='custom')wizPaint(true);
      else{wizInitSubs();W.confirmed=false;wizGo('subjects')}
      break;
    case 'pick':{
      const gi=+d.g,g=v.o[gi],sel=W.picks[gi],i=sel.indexOf(d.n);
      if(i>=0)sel.splice(i,1);
      else if(g.n===1){sel.length=0;W.gx[gi]=[];sel.push(d.n)}
      else if(sel.length+W.gx[gi].length<g.n)sel.push(d.n);
      wizPaint(true);break}
    case 'gxadd':{
      const gi=+d.g,g=v.o[gi],inp=document.querySelector('#wiz [data-wf=gx'+gi+']'),n=(inp&&inp.value||'').trim().slice(0,40);
      if(!n)break;
      if(g.n===1){W.picks[gi].length=0;W.gx[gi]=[n]}
      else if(W.picks[gi].length+W.gx[gi].length<g.n&&!W.gx[gi].includes(n))W.gx[gi].push(n);
      wizPaint(true);break}
    case 'gxdel':W.gx[+d.g].splice(+d.i,1);wizPaint(true);break;
    case 'exadd':{
      const inp=document.querySelector('#wiz [data-wf=exadd]'),n=(inp&&inp.value||'').trim().slice(0,40);
      if(n&&!wizSubjects().some(s=>s.name.toLowerCase()===n.toLowerCase()))W.extra.push(n);
      wizPaint(true);break}
    case 'exdel':W.extra.splice(+d.i,1);wizPaint(true);break;
    case 'conf':W.conf[d.n]=+d.v;wizPaint(true);break;
    case 'boff':W.offB[d.n]=!t.checked;wizPaint(true);break;
    case 'cover':W.cover=+d.v;wizPaint(true);break;
    case 'tool':if(W.toolSel.has(d.t))W.toolSel.delete(d.t);else W.toolSel.add(d.t);wizToolsPaint();break;
    case 'tooldel':W.toolCustom.splice(+d.i,1);wizToolsPaint();break;
    case 'tooladd':{
      const n=document.querySelector('#wiz [data-wf=tn]'),u=document.querySelector('#wiz [data-wf=tu]');
      try{addTool(n.value,u.value,W.toolCustom);wizToolsPaint()}
      catch(err){const x=document.getElementById('wzterr');if(x)x.textContent=err.message}
      break}
    case 'wm':W.whenMode=d.v;W.confirmed=false;wizPaint(true);break;
    case 'per':{const i=W.periods.indexOf(d.v);if(i>=0)W.periods.splice(i,1);else W.periods.push(d.v);wizPaint(true);break}
    case 'off':{const n=+d.v,i=W.off.indexOf(n);if(i>=0)W.off.splice(i,1);else W.off.push(n);wizPaint(true);break}
    case 'sess':W.sess=+d.v;wizPaint(true);break;
    case 'phase':W.phSel=d.v;wizPaint(true);break;
    case 'day':W.daySel=+d.v;wizPaint(true);break;
    case 'blkdel':W.draft.plan.blocks=W.draft.plan.blocks.filter(b=>b.id!==d.id);wizPaint(true);break;
    case 'blkadd':wizAddBlock();wizPaint(true);break;
  }
});
function wizFieldEvent(e){
  const t=e.target;if(!W||!t||!t.closest||!t.closest('#wiz'))return;
  const wf=t.dataset&&t.dataset.wf,wb=t.dataset&&t.dataset.wb;
  if(t.dataset&&t.dataset.wz==='boff'&&e.type==='change')return;
  if(wb){
    const b=W.draft&&W.draft.plan.blocks.find(x=>x.id===wb);if(!b)return;
    if(t.dataset.f==='st'&&/^\d\d:\d\d$/.test(t.value))b.st=t.value;
    else if(t.dataset.f==='m')b.m=Math.min(600,Math.max(5,Math.round(+t.value||60)));
    else if(t.dataset.f==='s')b.s=t.value;
    return;
  }
  if(!wf)return;
  if(wf==='cName'||wf==='cSubs'){W[wf]=t.value;const nb=document.querySelector('#wiz [data-wz=next]');if(nb)nb.disabled=!wizValid();return}
  if(wf==='courseName'){W.courseName=t.value;return}
  if(e.type!=='change')return;
  if(wf==='start'){W.start=t.value;W.confirmed=false;wizPaint(true)}
  else if(wf==='dDate'||wf==='dTarget'||wf==='dMonth'){W[wf]=t.value;W.confirmed=false;wizPaint(true)}
  else if(wf==='confirmed'){W.confirmed=t.checked;const nb=document.querySelector('#wiz [data-wz=next]');if(nb)nb.disabled=!wizValid()}
  else if(wf==='hw'||wf==='he'){W[wf]=Math.min(14,Math.max(0.5,+t.value||0.5));wizPaint(true)}
  else if(wf==='mocks'||wf==='alarms')W[wf]=t.checked;
}
document.addEventListener('input',wizFieldEvent);
document.addEventListener('change',wizFieldEvent);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&W&&sheetEl.hidden){if(W.step==='exam'||W.leave)closeWizard();else{W.leave=true;wizPaint(true)}}});
