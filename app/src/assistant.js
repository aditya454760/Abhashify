/* ---------- assistant: settings, chat history ---------- */
let ACFG=Object.assign({gender:'female',rate:1,lang:'en-IN',voiceName:'',speak:false,provider:'',key:'',model:''},lsGet('pl.asst',{}));
let CHAT=lsGet('pl.chat',[]);
let PENDING=null,LASTSNAP=null;
ACFG.lang=LANG==='hi'?'hi-IN':'en-IN';
const saveAcfg=()=>lsSet('pl.asst',ACFG);
const asstName=()=>ACFG.gender==='male'?H('Adi','आदि'):H('Anu','अनु');
const saveChat=()=>lsSet('pl.chat',CHAT.slice(-40));

/* ---------- reading dates, times and durations out of a sentence ---------- */
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const WD3=['mon','tue','wed','thu','fri','sat','sun'];
const NUMW={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,ninety:90};
const UNITS='hours?|hrs?|minutes?|mins?|marks?|days?|am|pm|o\'?clock|questions?|pages?|sheets?|weeks?';
function normText(s){
  let t=' '+String(s||'').toLowerCase().replace(/[“”"]/g,'').replace(/\s+/g,' ')+' ';
  t=t.replace(/\ba\.?\s?m\.?(?=\W)/g,'am').replace(/\bp\.?\s?m\.?(?=\W)/g,'pm');
  t=t.replace(/\bhalf an? hour\b/g,'30 minutes').replace(/\ban hour and a half\b/g,'90 minutes').replace(/\b(an|a|one) hour\b/g,'1 hour').replace(/\bquarter of an hour\b/g,'15 minutes');
  t=t.replace(new RegExp('\\b('+Object.keys(NUMW).join('|')+')(?=\\s+('+UNITS+')\\b)','g'),w=>NUMW[w]);
  t=t.replace(/\btmrw\b|\btmr\b|\btomorow\b/g,'tomorrow').replace(/\bmins\b/g,'minutes');
  return t;
}
function nextWeekday(now,wd,strict){
  const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let add=(wd-dow(d)+7)%7;if(add===0&&strict)add=7;
  d.setDate(d.getDate()+add);return d;
}
function parseWhen(raw,nowArg){
  const now=nowArg||new Date();
  let t=normText(raw);
  const o={date:null,h:null,m:0,rel:null,rep:null,dur:null,marks:null,when:null,hasTime:false,hasDate:false,vague:null};
  let m;
  const cut=re=>{const r=t.match(re);if(r)t=t.replace(re,' ');return r};
  // repeats
  if(cut(/\b(every ?day|daily|each day|everyday|every morning|every night|every evening)\b/))o.rep='daily';
  else if(cut(/\b(every weekday|on weekdays|weekdays|monday to friday|mon(?:day)? ?(?:-|to) ?fri(?:day)?)\b/))o.rep='weekdays';
  else if(m=cut(/\bevery (mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/)){o.rep='weekly';o.date=nextWeekday(now,WD3.indexOf(m[1]),false)}
  // "in 20 minutes", "in 2 hours"
  if(m=cut(/\bin (\d+(?:\.\d+)?|an?) ?(minutes?|hours?|hrs?|days?|weeks?)\b/)){
    const n=m[1][0]==='a'?1:parseFloat(m[1]),u=m[2][0];
    o.rel=u==='m'?n:u==='h'?n*60:u==='d'?n*1440:n*10080;
  }
  // explicit dates
  const mon='(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
  if(m=cut(/\b(\d{4})-(\d{2})-(\d{2})\b/)){o.date=new Date(+m[1],+m[2]-1,+m[3])}
  else if(m=cut(new RegExp('\\b(3[01]|[12]\\d|0?[1-9])(?:st|nd|rd|th)?(?: of)? (?!marks?\\b)'+mon+'(?:,? (\\d{4}))?\\b'))){o.date=new Date(m[3]?+m[3]:now.getFullYear(),MONTHS.indexOf(m[2]),+m[1])}
  else if(m=cut(new RegExp('\\b'+mon+' (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?\\b'))){o.date=new Date(m[3]?+m[3]:now.getFullYear(),MONTHS.indexOf(m[1]),+m[2])}
  else if(m=cut(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b(?!\s*(?:hours?|marks?))/)){const y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):now.getFullYear();o.date=new Date(y,+m[2]-1,+m[1])}
  if(o.date&&!m3(o.date))o.date=null;
  if(o.date&&o.date<new Date(now.getFullYear(),now.getMonth(),now.getDate())&&!/\b\d{4}\b/.test(raw))o.date=new Date(o.date.getFullYear()+1,o.date.getMonth(),o.date.getDate());
  // day words
  if(!o.date){
    if(cut(/\bday after tomorrow\b/))o.date=addDays(now,2);
    else if(cut(/\btomorrow\b/))o.date=addDays(now,1);
    else if(cut(/\b(today|tonight|this evening|this afternoon|this morning)\b/)){o.date=new Date(now.getFullYear(),now.getMonth(),now.getDate())}
    else if(m=cut(/\b(?:(next|this|on) )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/)){o.date=nextWeekday(now,WD3.indexOf(m[2]),m[1]==='next')}
  }
  // clock time
  let h=null,mi=0,mer=null;
  if(m=cut(/\b(\d{1,2})[:.](\d{2}) ?(am|pm)?(?! ?(?:hours?|hrs?|marks?|minutes?))/)){h=+m[1];mi=+m[2];mer=m[3]||null}
  else if(m=cut(/\b(\d{1,2}) ?(am|pm)\b/)){h=+m[1];mer=m[2]}
  else if(m=cut(/\b(\d{1,2}) o'?clock\b/)){h=+m[1]}
  else if(m=cut(new RegExp('\\b(?:at|by|around|@|wake me up at|alarm for|alarm at|for) ?(\\d{1,2})(?!\\d)(?! ?(?:'+UNITS+'|%|/))'))){h=+m[1]}
  else if(cut(/\bnoon\b/)){h=12;mer='pm'}
  else if(cut(/\bmidnight\b/)){h=0;mer='am'}
  else if(cut(/\b(?:in the |this )?morning\b/)){h=7;mer='am';o.vague='morning'}
  else if(cut(/\b(?:in the |this )?afternoon\b/)){h=3;mer='pm';o.vague='afternoon'}
  else if(cut(/\b(?:in the |this )?evening\b/)){h=6;mer='pm';o.vague='evening'}
  else if(cut(/\b(?:at )?night\b/)){h=9;mer='pm';o.vague='night'}
  if(h!==null&&h<=24&&mi<60){
    if(mer==='pm'&&h<12)h+=12;
    if(mer==='am'&&h===12)h=0;
    if(!mer&&h<=12&&h!==0){
      // no am/pm said: pick the sensible one
      if(!o.date||sameDay(o.date,now)){
        const base=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        const cand=[h%12,h%12+12].filter(x=>base.getTime()+x*3600000+mi*60000>now.getTime());
        h=cand.length?cand[0]:h%12;
      }else h=h>=5&&h<=11?h:h===12?12:h+12;
    }
    o.h=h;o.m=mi;o.hasTime=true;
  }
  // how long
  if(m=cut(/\b(\d+(?:\.\d+)?) ?(?:hours?|hrs?|h)\b(?: ?(?:and )?(\d+) ?(?:minutes?|m)\b)?/)){o.dur=Math.round(parseFloat(m[1])*60+(m[2]?+m[2]:0))}
  else if(m=cut(/\b(\d+) ?minutes?\b/)){o.dur=+m[1]}
  if(m=cut(/\b(\d+) ?marks?\b/))o.marks=+m[1];
  else if(m=cut(/\bout of (\d+)\b/))o.marks=+m[1];
  // put the pieces together
  if(o.rel!==null){o.when=new Date(now.getTime()+o.rel*60000);o.hasTime=true;o.hasDate=true}
  else{
    o.hasDate=!!o.date;
    if(o.hasTime){
      let d=o.date?new Date(o.date):new Date(now.getFullYear(),now.getMonth(),now.getDate());
      d.setHours(o.h,o.m,0,0);
      if(!o.date&&d.getTime()<=now.getTime())d.setDate(d.getDate()+1);
      else if(o.date&&sameDay(o.date,now)&&d.getTime()<=now.getTime()&&o.rep)d.setDate(d.getDate()+1);
      o.when=d;
    }else if(o.date){o.when=new Date(o.date)}
  }
  o.rest=t.replace(/\s+/g,' ').trim();
  return o;
}
const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const m3=d=>d instanceof Date&&!isNaN(d.getTime());
const fmtLocal=d=>ymd(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes());

/* ---------- finding a subject in a sentence ---------- */
function findSubject(text){
  const t=normText(text),words=t.split(/[^a-z0-9&]+/).filter(Boolean);
  let best=null,bs=0;
  for(const s of S.plan.subjects){
    const nm=normText(s.name).trim(),toks=nm.split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!['and','the'].includes(x));
    let sc=0;
    if(nm&&t.includes(' '+nm+' '))sc+=10;
    for(const w of words){
      if(w===String(s.id).toLowerCase()&&w.length>=2)sc+=6;
      for(const k of toks){if(w.length>=4&&(k.startsWith(w)||w.startsWith(k)))sc+=4;else if(w===k)sc+=4}
    }
    const initials=nm.split(/[^a-z0-9]+/).filter(x=>x&&!['and','the','of'].includes(x)).map(x=>x[0]).join('');
    if(initials.length>=2&&words.includes(initials))sc+=5;
    if(sc>bs){bs=sc;best=s}
  }
  return bs>=4?best:null;
}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const restoreCase=(label,orig)=>{const m=new Map();String(orig||'').split(/\s+/).forEach(w=>{const k=w.replace(/^[^\w\u0900-\u097F]+|[^\w\u0900-\u097F]+$/g,'');if(k&&k!==k.toLowerCase())m.set(k.toLowerCase(),k)});return String(label||'').split(' ').map(w=>m.get(w)||w).join(' ').replace(/\b(ml|ai|dsa|gate|pdf|da|cs|it|os|dbms|sql|nlp|dl)\b/g,x=>x.toUpperCase())};
function cleanLabel(rest,drop){
  let t=' '+rest+' ';
  t=t.replace(/\b(please|can you|could you|would you|kindly|hey|hi|abhyashify|assistant)\b/g,' ');
  t=t.replace(/\b(set|create|add|make|schedule|put|book|plan|give)( me)?( a| an| the| my| new)*\b/g,' ');
  t=t.replace(/\b(remind me|remind|reminder|alarm|wake me up|wake me|mock test|mock|test|cancel|delete|remove|clear)\b/g,' ');
  t=t.replace(/\b(for|to|about|of|on|at|by|that|me|my|a|an|the|every|each|called|named|titled|it|is|and)\b/g,w=>w);
  t=t.replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'').replace(/\s+/g,' ');
  t=t.replace(/^(to|for|about|that|of|on|at|a|an|the|me|my)\s+/,'').replace(/\s+(to|for|about|that|of|on|at|a|an|the|and)$/,'');
  t=t.replace(/^(to|for|about|that|of|on|at|a|an|the|me|my)\s+/,'');
  t=t.trim();if(/^(for|to|a|an|the|me|my|at|on|in|it|and|of|about|that)$/.test(t))t='';
  return t;
}

/* ---------- doing things: every action goes through here, from the built-in brain or from the AI ---------- */
const MUTATES=new Set(['set_reminder','cancel_reminder','schedule_test','record_score','cancel_test','set_theme','set_accent','set_background','reset_look','add_block','new_schedule','clear_schedule','add_subject','add_material','set_exam','log_session']);
const NEEDS_SURE=new Set(['new_schedule','clear_schedule']);
const snap=()=>({plan:JSON.stringify(S.plan),mats:JSON.stringify(S.materials),logs:JSON.stringify(S.logs),look:JSON.stringify(LOOK),theme});
function undoLast(){
  const s=LASTSNAP;if(!s)return H('There is nothing to undo.','वापस करने के लिए कुछ नहीं है।');
  const cur=snap();
  S.plan=Object.assign(defaultPlan(),JSON.parse(s.plan));S.materials=JSON.parse(s.mats);S.logs=JSON.parse(s.logs);
  LOOK=JSON.parse(s.look);theme=s.theme;lsSet('pl.look',LOOK);lsSet('pl.theme',theme);applyTheme();
  if(cur.plan!==s.plan)mark('plan');if(cur.mats!==s.mats)mark('materials');if(cur.logs!==s.logs)mark('logs');
  LASTSNAP=null;render(false);return H('Undone. Everything is back as it was before my last change.','वापस कर दिया। सब कुछ मेरे पिछले बदलाव से पहले जैसा हो गया है।');
}
function parseLocal(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime():NaN}
function parseDay(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3]);return isNaN(d)?null:ymd(d)}
function parseHM(s){const m=String(s||'').match(/^(\d{1,2}):(\d{2})$/);if(!m||+m[1]>23||+m[2]>59)return null;return pad(+m[1])+':'+m[2]}
function subjectFrom(v){
  if(!v)return null;v=String(v);
  return S.plan.subjects.find(s=>s.id===v)||S.plan.subjects.find(s=>s.name.toLowerCase()===v.toLowerCase())||findSubject(v);
}
function dayList(v){
  const out=new Set();
  for(const x of [].concat(v||[])){
    if(typeof x==='number'&&x>=0&&x<=6)out.add(x);
    else{const i=WD3.indexOf(String(x).toLowerCase().slice(0,3));if(i>=0)out.add(i);else if(/^[0-6]$/.test(String(x)))out.add(+x)}
  }
  return [...out].sort((a,b)=>a-b);
}
const dayNames=a=>a.length===7?H('every day','हर दिन'):a.join(',')==='0,1,2,3,4'?H('Monday to Friday','सोमवार से शुक्रवार'):a.map(i=>L(DAYS[i])).join(', ');
function tokensOf(s){return normText(s).split(/[^a-z0-9\u0900-\u097F]+/).filter(w=>w.length>=3&&!['the','and','for','mock','test','reminder','alarm','all'].includes(w))}
function bestMatch(list,textOf,q){
  const qs=tokensOf(q);if(!qs.length)return null;
  let best=null,bs=0;
  for(const it of list){const ts=tokensOf(textOf(it));let sc=0;for(const w of qs)if(ts.some(x=>x===w||(w.length>=4&&(x.startsWith(w)||w.startsWith(x)))))sc++;if(sc>bs){bs=sc;best=it}}
  return bs?best:null;
}
function buildSchedule(o){
  const subs=S.plan.subjects;if(!subs.length)throw new Error(H('There are no subjects yet.','अभी कोई विषय नहीं है।'));
  const hours=Math.min(14,Math.max(1,+o.hours||4)),start=parseHM(o.start)||'06:00',days=dayList(o.days);const ds=days.length?days:[0,1,2,3,4,5,6];
  const D=Math.round(hours*60),blocks=[],weights=Object.fromEntries(subs.map(s=>[s.id,Math.max(.5,s.w*(6-s.c))]));
  const slots=[];
  for(const d of ds){
    if(d===6&&D>=240&&ds.length>=5){
      slots.push({d,st:start,m:Math.min(120,D-30),k:'revision'},{d,st:'16:00',m:180,k:'mock',fixed:true});continue;
    }
    let rem=D,t=toMin(start),idx=0;
    while(rem>=30&&t<23*60){
      let m=Math.min(90,rem);if(rem-m>0&&rem-m<30)m=rem;
      slots.push({d,st:fromMin(t),m,k:idx%2===0?'theory':'practice'});
      rem-=m;t+=m+15;idx++;
      if(idx===2&&t<19*60)t=19*60;
    }
  }
  const total=slots.filter(s=>!s.fixed).reduce((x,s)=>x+s.m,0),sw=Object.values(weights).reduce((a,b)=>a+b,0),got={};
  const mixId=(subs.find(s=>s.id==='mix')||subs[0]).id;
  let lastDay=-1,prev=null;
  for(const s of slots){
    if(s.d!==lastDay){lastDay=s.d;prev=null}
    if(s.fixed){s.s=mixId;blocks.push(s);continue}
    let pick=null,bd=-1e9;
    for(const sub of subs){
      if(sub.id===prev&&subs.length>1)continue;
      if(s.k==='revision'&&sub.id!=='mix'&&subs.some(x=>x.id==='mix')){}
      const deficit=weights[sub.id]/sw*total-(got[sub.id]||0);
      if(deficit>bd){bd=deficit;pick=sub}
    }
    s.s=pick.id;got[pick.id]=(got[pick.id]||0)+s.m;prev=pick.id;blocks.push(s);
  }
  return {blocks:blocks.map(b=>({id:uid(),days:[b.d],st:b.st,m:b.m,s:b.s,k:b.k,sh:b.k==='practice'?1:0,al:true,t:''})),got,hours,ds,start};
}

const AX={
  set_reminder(a){
    const at=parseLocal(a.at);if(isNaN(at))throw new Error(H('I need a date and time for that.','इसके लिए मुझे तारीख़ और समय चाहिए।'));
    if(at<Date.now()-60000)throw new Error(H('That time has already passed.','वह समय बीत चुका है।'));
    if(PR().length>=200)throw new Error(H('You have too many reminders. Delete a few first.','आपके पास बहुत ज़्यादा रिमाइंडर हैं। पहले कुछ हटाएँ।'));
    const kind=a.kind==='alarm'?'alarm':'reminder',rep=['daily','weekdays','weekly'].includes(a.repeat)?a.repeat:null;
    const text=String(a.text||'').trim().slice(0,120)||(kind==='alarm'?'Alarm':'Reminder');
    PR().push({id:uid(),text,at,kind,rep,done:false});mark('plan');
    const was=armed;setArmed(true);
    const shown=(text==='Alarm'||text==='Reminder')?L(text):text,rp=rep?' ('+L(REPS[rep]).toLowerCase()+')':'';
    return {msg:H(`${kind==='alarm'?'Alarm':'Reminder'} set for ${whenTxt(at)}${rp}: ${shown}.${was?'':' I turned your alarm bell on. Keep this page open so it can ring.'}`,
      `${kind==='alarm'?'अलार्म':'रिमाइंडर'} ${whenTxt(at)}${rp} के लिए सेट हो गया: ${shown}।${was?'':' मैंने आपकी अलार्म की घंटी चालू कर दी है। इसे बजने देने के लिए यह पेज खुला रखें।'}`)};
  },
  cancel_reminder(a){
    const q=String(a.match||'').trim().toLowerCase(),list=PR().filter(r=>!r.done);
    if(!list.length)return {msg:H('You have no active reminders or alarms.','आपका कोई चालू रिमाइंडर या अलार्म नहीं है।')};
    let del;
    if(!q||q==='all'||q==='everything')del=list;
    else{const m=bestMatch(list,r=>r.text,q)||list.find(r=>q.includes(whenTxt(r.at).toLowerCase().split(', ')[1]||'zzz'));del=m?[m]:[]}
    if(!del.length)throw new Error(H('I could not find one that matches "'+q+'".','"'+q+'" से मेल खाता कोई नहीं मिला।'));
    const ids=new Set(del.map(r=>r.id));S.plan.reminders=PR().filter(r=>!ids.has(r.id));mark('plan');
    return {msg:del.length===1?H('Removed: '+del[0].text+' ('+whenTxt(del[0].at)+').','हटा दिया: '+del[0].text+' ('+whenTxt(del[0].at)+')।'):H('Removed '+del.length+' reminders and alarms.',del.length+' रिमाइंडर और अलार्म हटा दिए।')};
  },
  schedule_test(a){
    const date=parseDay(a.date),time=parseHM(a.time)||'10:00';if(!date)throw new Error(H('I need a date for the test.','टेस्ट के लिए मुझे तारीख़ चाहिए।'));
    const kind=a.kind==='test'?'test':'mock',sub=a.subject?subjectFrom(a.subject):null;
    const m=Math.min(360,Math.max(10,Math.round(+a.minutes||(kind==='mock'?180:60)))),marks=Math.min(1000,Math.max(1,Math.round(+a.marks||100)));
    const title=String(a.title||'').trim().slice(0,80)||(sub&&kind==='mock'&&/mock/i.test(sub.name)?L(sub.name):sub?H(sub.name+' '+TKINDS[kind].toLowerCase(),L(sub.name)+' '+L(TKINDS[kind])):H('Full '+TKINDS[kind].toLowerCase(),'पूरा '+L(TKINDS[kind])));
    const t={id:uid(),title,kind,subj:sub?sub.id:'',date,st:time,m,marks,al:true,score:null};
    if(testStart(t)<Date.now()-60000)throw new Error(H('That time has already passed.','वह समय बीत चुका है।'));
    if(PT().length>=200)throw new Error(H('You have too many tests. Delete a few first.','आपके पास बहुत ज़्यादा टेस्ट हैं। पहले कुछ हटाएँ।'));
    PT().push(t);mark('plan');const was=armed;setArmed(true);
    return {msg:H(`${TKINDS[kind]} scheduled: ${t.title}, ${whenTxt(testStart(t))}, ${fmtDur(m)}, ${marks} marks.${was?'':' I turned your alarm bell on so it can ring while this page is open.'}`,
      `${L(TKINDS[kind])} तय हो गया: ${t.title}, ${whenTxt(testStart(t))}, ${FD(m)}, ${marks} अंक।${was?'':' मैंने आपकी अलार्म की घंटी चालू कर दी है, ताकि पेज खुला रहने पर यह बज सके।'}`)};
  },
  record_score(a){
    const score=+a.score;if(isNaN(score)||score<0)throw new Error(H('I need the marks you scored.','मुझे आपके मिले हुए अंक चाहिए।'));
    const all=PT().slice().sort((x,y)=>testStart(x)-testStart(y));if(!all.length)throw new Error(H('You have no tests yet. Schedule one first.','आपका अभी कोई टेस्ट नहीं है। पहले एक तय करें।'));
    let t=a.match&&!/^(last|latest|recent|previous|my)$/i.test(a.match)?bestMatch(all,x=>x.title+' '+TKINDS[x.kind]+' '+(x.subj?subjName(x.subj):''),a.match):null;
    if(!t)t=all.filter(x=>testStart(x)<=Date.now()+3600000).pop()||all[all.length-1];
    if(+a.marks>0)t.marks=Math.min(1000,Math.round(+a.marks));
    t.score=Math.min(t.marks,score);mark('plan');
    return {msg:H(`Saved ${t.score} out of ${t.marks} (${pctTxt(t)}) for ${t.title}.`,`${t.title} के लिए ${t.marks} में से ${t.score} (${pctTxt(t)}) सहेज लिए।`)};
  },
  cancel_test(a){
    const all=PT(),q=String(a.match||'');if(!all.length)return {msg:H('You have no tests.','आपका कोई टेस्ट नहीं है।')};
    const up=all.filter(t=>t.score==null).sort((x,y)=>testStart(x)-testStart(y));
    const t=(q&&bestMatch(all,x=>x.title,q))||(/all/.test(q)?null:up[0]);
    if(/\ball\b/.test(q)){const n=up.length;S.plan.tests=all.filter(x=>x.score!=null);mark('plan');return {msg:H('Removed '+n+' upcoming tests.','आने वाले '+n+' टेस्ट हटा दिए।')}}
    if(!t)throw new Error(H('I could not find that test.','वह टेस्ट मुझे नहीं मिला।'));
    S.plan.tests=all.filter(x=>x.id!==t.id);mark('plan');return {msg:H('Removed '+t.title+'.',t.title+' हटा दिया।')};
  },
  start_test(a){
    const up=PT().filter(t=>t.score==null).sort((x,y)=>testStart(x)-testStart(y));
    const t=(a.match&&bestMatch(up,x=>x.title,a.match))||up.find(x=>testStart(x)<=Date.now()+864e5)||up[0];
    if(!t)throw new Error(H('There is no test to start. Ask me to schedule one first.','शुरू करने के लिए कोई टेस्ट नहीं है। पहले मुझसे एक तय करवाएँ।'));
    startTest(t);return {msg:H(`Started the timer for ${t.title} (${fmtDur(t.m)}). Stop it when you finish and I will ask for your score.`,`${t.title} (${FD(t.m)}) का टाइमर शुरू हो गया। ख़त्म होने पर इसे रोकें, मैं आपसे आपका स्कोर {पूछूँगा|पूछूँगी}।`),close:true};
  },
  set_theme(a){
    const m=['auto','light','dark'].includes(a.mode)?a.mode:null;if(!m)throw new Error(H('Pick auto, light or dark.','अपने-आप, हल्का या गहरा चुनें।'));
    theme=m;lsSet('pl.theme',theme);applyTheme();return {msg:m==='auto'?H('Theme now follows your device setting.','थीम अब आपके डिवाइस की सेटिंग के अनुसार चलेगी।'):H('Switched to '+m+' mode.',m==='dark'?'गहरा मोड चालू हो गया।':'हल्का मोड चालू हो गया।')};
  },
  set_accent(a){const r=setLook({accent:a.color});if(r.err)throw new Error(r.err);return {msg:H('Accent colour changed to '+a.color+'.'+r.note,'मुख्य रंग बदलकर '+colName(a.color)+' कर दिया।'+r.note)}},
  set_background(a){
    const v=String(a.background||a.color||'').toLowerCase().trim();
    const alias={cream:'paper',beige:'paper',yellow:'paper',pink:'blush',purple:'lavender',violet:'lavender',green:'mint',blue:'sky',gray:'slate',grey:'slate',gradient:'sunrise',orange:'sunrise',night:'midnight',dark:'midnight',teal:'aurora',white:'#FFFFFF',red:'blush'};
    const key=BGS[v]?v:alias[v]||v;
    const r=setLook({bg:key});if(r.err)throw new Error(r.err);return {msg:H('Background changed to '+v+'.'+r.note,'पृष्ठभूमि बदलकर '+colName(v)+' कर दी।'+r.note)};
  },
  reset_look(){resetLook();return {msg:H('Colours and background are back to the default.','रंग और पृष्ठभूमि पहले जैसे डिफ़ॉल्ट हो गए।')}},
  add_block(a){
    const sub=subjectFrom(a.subject);if(!sub)throw new Error(H('Which subject is it for? You have: '+S.plan.subjects.map(s=>s.name).join(', ')+'.','यह किस विषय के लिए है? आपके विषय: '+S.plan.subjects.map(s=>L(s.name)).join(', ')+'।'));
    const days=dayList(a.days);if(!days.length)throw new Error(H('Which days should it repeat on?','यह किन दिनों में दोहराया जाए?'));
    const st=parseHM(a.time);if(!st)throw new Error(H('What time should it start?','यह किस समय शुरू हो?'));
    const k=KINDS[a.kind]&&a.kind!=='other'?a.kind:(KINDS[a.kind]?a.kind:'theory'),m=Math.min(600,Math.max(5,Math.round(+a.minutes||90)));
    if(S.plan.blocks.length>=300)throw new Error(H('You have too many blocks.','आपके पास बहुत ज़्यादा ब्लॉक हैं।'));
    S.plan.blocks.push({id:uid(),days,st,m,s:sub.id,k,sh:Math.max(0,Math.min(20,Math.round(+a.sheets||0))),al:a.alarm!==false,t:''});mark('plan');
    return {msg:H(`Added a ${KINDS[k].toLowerCase()} block for ${sub.name}: ${dayNames(days)} at ${st} for ${fmtDur(m)}.`,`${L(sub.name)} के लिए ${L(KINDS[k])} ब्लॉक जोड़ दिया: ${dayNames(days)}, ${st} बजे से, ${FD(m)} के लिए।`)};
  },
  new_schedule(a){
    const hasSubs=S.plan.subjects.length>0;
    if(a.mode==='template'||!hasSubs){
      const T=gateTemplate(),keep={tests:S.plan.tests||[],reminders:S.plan.reminders||[]};
      S.plan=Object.assign(T,keep);mark('plan');
      return {msg:H('Loaded the GATE DA 2027 template: nine subjects and a weekly timetable. Your tests and reminders are untouched. Change anything in the Plan tab.','GATE DA 2027 टेम्पलेट लग गया: नौ विषय और साप्ताहिक समय-सारणी। आपके टेस्ट और रिमाइंडर जैसे थे वैसे हैं। कुछ भी बदलना हो तो योजना टैब में बदलें।')};
    }
    const r=buildSchedule(a);S.plan.blocks=r.blocks;mark('plan');
    const top=Object.entries(r.got).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([id,m])=>H(subjName(id)+' '+fmtDur(m)+'/week',L(subjName(id))+' '+FD(m)+'/हफ़्ता')).join(', ');
    return {msg:H(`New schedule built: about ${r.hours} hours a day, ${dayNames(r.ds)}, starting at ${r.start}. More time goes to the subjects that carry more marks and where you are less confident (${top}). Sunday afternoon is a 3-hour mock when you study that day.`,
      `नई समय-सारणी बन गई: रोज़ लगभग ${r.hours} घंटे, ${dayNames(r.ds)}, ${r.start} बजे से शुरू। ज़्यादा अंकों वाले और कम आत्मविश्वास वाले विषयों को ज़्यादा समय मिला है (${top})। जिस दिन आप पढ़ते हैं, उस रविवार की दोपहर बाद 3 घंटे का मॉक रखा गया है।`)};
  },
  clear_schedule(){const n=S.plan.blocks.length;S.plan.blocks=[];mark('plan');return {msg:H('Removed all '+n+' blocks from your schedule.','आपकी समय-सारणी से सभी '+n+' ब्लॉक हटा दिए।')}},
  add_subject(a){
    const name=String(a.name||'').trim().slice(0,40);if(!name)throw new Error(H('What is the subject called?','विषय का नाम क्या है?'));
    if(S.plan.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase()))throw new Error(H(name+' is already in your subjects.',name+' आपके विषयों में पहले से है।'));
    if(S.plan.subjects.length>=60)throw new Error(H('You have too many subjects.','आपके पास बहुत ज़्यादा विषय हैं।'));
    const w=Math.min(5,Math.max(1,Math.round(+a.importance||3))),c=Math.min(5,Math.max(1,Math.round(+a.confidence||3)));
    S.plan.subjects.push({id:uid(),name,w,c});mark('plan');return {msg:H(`Added the subject ${name} (importance ${w}, confidence ${c}).`,`विषय ${name} जोड़ दिया (महत्व ${w}, आत्मविश्वास ${c})।`)};
  },
  add_material(a){
    const title=String(a.title||'').trim().slice(0,120);if(!title)throw new Error(H('What is the material called?','सामग्री का नाम क्या है?'));
    const sub=subjectFrom(a.subject)||S.plan.subjects[0];if(!sub)throw new Error(H('Add a subject first.','पहले एक विषय जोड़ें।'));
    const kind=MKINDS[a.kind]?a.kind:'theory',unit=['pages','chapters','questions','sheets','lectures'].includes(a.unit)?a.unit:(kind==='sheet'?'questions':'pages');
    S.materials.push({id:uid(),title,subj:sub.id,kind,unit,total:Math.max(0,Math.round(+a.total||0)),done:0,file:null,asset:null,added:ymd(new Date())});mark('materials');
    return {msg:H(`Added ${title} under ${sub.name}${+a.total>0?' ('+a.total+' '+unit+')':''}.`,`${title} को ${L(sub.name)} के तहत जोड़ दिया${+a.total>0?' ('+a.total+' '+L(unit)+')':''}।`)};
  },
  set_exam(a){
    const d=parseDay(a.date);if(!d)throw new Error(H('I need the exam date.','मुझे परीक्षा की तारीख़ चाहिए।'));
    S.plan.exam=d;if(a.name)S.plan.examName=String(a.name).trim().slice(0,30);mark('plan');
    const left=Math.round((parseYmd(d)-parseYmd(ymd(new Date())))/864e5),ds=parseYmd(d).toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric'});
    return {msg:H(`Exam set to ${ds}${left>=0?', '+left+' days from now':''}.`,`परीक्षा की तारीख़ ${ds}${left>=0?' तय की, यानी अब से '+left+' दिन बाद':' तय की'}।`)};
  },
  log_session(a){
    const sub=subjectFrom(a.subject)||S.plan.subjects[0];if(!sub)throw new Error(H('Add a subject first.','पहले एक विषय जोड़ें।'));
    const m=Math.round(+a.minutes);if(!(m>=1&&m<=720))throw new Error(H('How many minutes did you study? (1 to 720)','आपने कितने मिनट पढ़ा? (1 से 720)'));
    const now=new Date(),d=parseDay(a.date)||ymd(now);let st=parseHM(a.time);
    if(!st)st=d===ymd(now)?fromMin(Math.max(0,now.getHours()*60+now.getMinutes()-m)):'09:00';
    const t0=new Date(d+'T'+st+':00').getTime();if(isNaN(t0))throw new Error(H('That date does not look right.','यह तारीख़ सही नहीं लग रही।'));
    S.logs.push({id:uid(),d,b:null,s:sub.id,st,ps:null,pm:null,m,q:0,mid:null,mu:0,t0,t1:t0+m*60000,dev:deviceId(),src:'manual',tz:tzOff()});
    if(S.logs.length>1800)S.logs=S.logs.slice(-1800);mark('logs');
    const day=d===ymd(now)?H('today','आज'):parseYmd(d).toLocaleDateString(LOC(),{weekday:'long',day:'numeric',month:'short'});
    return {msg:H(`Logged ${fmtDur(m)} of ${sub.name} on ${day} from ${st}.`,`${day} ${st} बजे से ${L(sub.name)} के ${FD(m)} दर्ज कर दिए।`)};
  },
  start_timer(a){
    if(run)throw new Error(H('A timer is already running.','एक टाइमर पहले से चल रहा है।'));
    const sub=subjectFrom(a.subject);startRun(null);if(sub){run.s=sub.id;lsSet('pl.run',run);render(false)}
    return {msg:H('Timer started'+(sub?' for '+sub.name:'')+'. Say "stop the timer" when you finish.','टाइमर शुरू हो गया'+(sub?' ('+L(sub.name)+')':'')+'। पढ़ाई पूरी होने पर "टाइमर रोको" कहें।'),close:true};
  },
  stop_timer(){if(!run)throw new Error(H('No timer is running.','कोई टाइमर नहीं चल रहा।'));logForm(run.b);return {msg:H('Review the details and tap Save log.','ब्योरा देख लें और लॉग सहेजें दबाएँ।'),close:true}},
  navigate(a){
    const to=String(a.to||'');
    if(['today','plan','materials','report'].includes(to)){tab=to;render();window.scrollTo({top:0})}
    else if(to==='settings')settingsForm();else if(to==='account')accountSheet();else throw new Error(H('I can open Today, Plan, Materials, Report, Settings or Account.','मैं आज, योजना, सामग्री, रिपोर्ट, सेटिंग्स या खाता खोल {सकता|सकती} हूँ।'));
    const nm={today:'आज',plan:'योजना',materials:'सामग्री',report:'रिपोर्ट',settings:'सेटिंग्स',account:'खाता'}[to];
    return {msg:H('Opened '+to+'.',nm+' खोल दिया।'),close:true};
  },
  set_language(a){
    const l=a.lang==='hi'||/hindi|हिंदी|हिन्दी/i.test(String(a.lang||''))?'hi':'en';setLang(l);
    return {msg:H('Okay, I will talk in English now.','ठीक है, अब मैं हिन्दी में बात {करूँगा|करूँगी}।')};
  },
  set_voice(a){
    const g=a.gender==='male'?'male':'female';ACFG.gender=g;ACFG.voiceName='';saveAcfg();
    const sub=document.getElementById('as-sub');if(sub)sub.textContent=modeLabel();
    return {msg:H(`Okay, this is ${asstName()} now, with a ${g} voice.`,`ठीक है, अब मैं ${asstName()} हूँ, ${g==='male'?'पुरुष':'महिला'} आवाज़ में।`)};
  },
  alarms_on(a){setArmed(a.on!==false);return {msg:armed?H('Alarms are on. Keep this page open for them to ring.','अलार्म चालू हैं। बजने के लिए यह पेज खुला रखें।'):H('Alarms are off.','अलार्म बंद हैं।')}},
  async create_course(a){
    if(!CL)throw new Error(H('Separate courses need sign-in so each one keeps its own data. Sign in from the Account button, then ask me again.','अलग-अलग कोर्स के लिए साइन इन ज़रूरी है, ताकि हर कोर्स का अपना डेटा रहे। खाता बटन से साइन इन करें, फिर मुझसे दोबारा कहें।'));
    const name=String(a.name||'').trim().slice(0,80);if(!name)throw new Error(H('What should the course be called?','कोर्स का नाम क्या रखें?'));
    const id=await createCourse(name);CL.courses.push({id,name});await openCourse(id);
    return {msg:H(`Created the course "${name}" and switched to it. Ask me to load the GATE DA template or build a schedule for it.`,`"${name}" कोर्स बना दिया और उसी पर आ गया। मुझसे GATE DA टेम्पलेट लगाने या इसकी समय-सारणी बनाने को कहें।`)};
  },
  async open_course(a){
    if(!CL)throw new Error(H('Sign in to switch between courses.','कोर्स बदलने के लिए साइन इन करें।'));
    const c=bestMatch(CL.courses,x=>x.name,a.name||'');if(!c)throw new Error(H('I could not find that course. You have: '+CL.courses.map(x=>x.name).join(', ')+'.','वह कोर्स मुझे नहीं मिला। आपके कोर्स: '+CL.courses.map(x=>x.name).join(', ')+'।'));
    await openCourse(c.id);return {msg:H('Switched to '+c.name+'.',c.name+' पर आ गया।')};
  }
};
const SPEC_TYPES=new Set([...Object.keys(AX)]);
async function runActions(list,opts){
  opts=opts||{};const msgs=[],errs=[];let close=false;
  list=(Array.isArray(list)?list:[]).filter(a=>a&&SPEC_TYPES.has(a.type)).slice(0,6);
  if(!opts.confirmed&&list.some(a=>NEEDS_SURE.has(a.type))&&(S.plan.blocks.length||list.some(a=>a.type==='new_schedule'&&a.mode==='template'&&S.plan.subjects.length))){
    PENDING={actions:list};
    const n=S.plan.blocks.length;
    return {msgs:[H(`This will replace your ${n} schedule block${n===1?'':'s'}. Your subjects, materials, tests and reminders stay. Go ahead? (yes or no)`,`इससे आपके ${n} ब्लॉक बदल जाएँगे। आपके विषय, सामग्री, टेस्ट और रिमाइंडर वैसे ही रहेंगे। आगे बढ़ूँ? (हाँ या नहीं)`)],pending:true,close:false};
  }
  const before=snap();let changed=false;
  for(const a of list){
    try{
      const r=await AX[a.type](a.args||a);
      if(r&&r.msg)msgs.push(r.msg);if(r&&r.close)close=true;
      if(MUTATES.has(a.type))changed=true;
    }catch(e){errs.push(e&&e.message?e.message:H('That did not work.','यह नहीं हो सका।'))}
  }
  if(changed&&JSON.stringify(snap())!==JSON.stringify(before)){LASTSNAP=before;render(false)}
  return {msgs:msgs.concat(errs),close,changed};
}

/* ---------- how the app works: answers to questions ---------- */
const KB=[
 {k:'log logging record add session time studied hours manually extra missed',a:'To record study time, tap **Log time** on a block, or **Log an extra session** on the Today tab. Enter the minutes, when you started, the subject, any practice sheets, and optionally the material and how many pages you finished. You can also tell me, for example "I studied probability for 90 minutes today".'},
 {k:'timer stopwatch start stop running session clock',a:'Tap **Start** on a block (or "Start now" on Today) to run a timer. When you finish, tap **Stop and log** and check the details. A running timer shows as a bar above the tabs on other screens.'},
 {k:'alarm alarms ring bell sound notification closed background',a:'Alarms ring on screen at the start of each block (a few minutes early, as set in Settings). Turn them on with the bell icon at the top. They only ring while this page is open, because a web page cannot wake your phone by itself. For alarms that work with the page closed, export your schedule from Settings and import it into Google Calendar.'},
 {k:'not ringing wont ring silent no sound alarm problem fix',a:'If an alarm did not ring: check that the bell icon is on, the page was still open, and your volume is up. Browsers only allow sound after you have tapped something on the page, so tap the bell once after opening the app. Keeping the screen on helps; the app asks for that when alarms are on.'},
 {k:'block blocks schedule timetable plan add edit change delete slot',a:'Your weekly schedule is made of blocks. Open the **Plan** tab, pick a day and tap **Add block**. Choose the days, start time, minutes, subject and type, and whether it rings an alarm. Tap any block to edit or delete it. You can also ask me to add one or to build a whole new schedule.'},
 {k:'subject subjects importance confidence weight',a:'Each subject has an **importance** (how many marks it carries) and a **confidence** (how strong you feel, 5 is strong). The planner puts important and weak subjects first. Edit them in the Plan tab under Subjects.'},
 {k:'material materials book pdf notes sheet progress pages chapters questions finished complete order suggested',a:'In the **Materials** tab add books, notes, practice sheets or mock papers, with how many pages or questions they have. Update your progress with the +buttons or when you log a session. "Suggested order" sorts them by what to study next.'},
 {k:'study next order suggested planner priority which first how decides',a:'"Study next" is ordered by how much the subject matters, how unsure you are about it, how much of the material is left, and what must come first (theory before practice sheets). Mock papers move up as the exam gets closer than 45 days.'},
 {k:'report score weekly week performance calculated percentage how',a:'The weekly report score is half **hours studied vs planned**, a quarter **practice sheets attempted**, and a quarter **starting within 30 minutes of the planned time**. It also shows hours per day, by subject, time of day, and tips on what to change.'},
 {k:'overlap overlapping duplicate twice counted once same course devices merge',a:'If two sessions in the same course overlap in time (for example the same hour logged on your phone and your laptop), the overlap is counted once. Sessions in different courses are never merged. The report mentions how much time was counted once.'},
 {k:'sync devices phone laptop tablet account google sign login cloud',a:'Sign in with Google (Account button, top right) and your plan, materials and logs sync live across your phone, tablet and laptop. Without signing in, data stays on this device only.'},
 {k:'course courses separate new switch multiple',a:'Each course has its own plan, materials and logs. When you are signed in, open the Account sheet to switch courses or create a new one, or ask me to create one.'},
 {k:'install app home screen download phone desktop icon',a:'To install: in Chrome or Edge use the install icon in the address bar or the browser menu, then Install app. On iPhone use Safari, Share, Add to Home Screen. There is also an Install card on the Today tab.'},
 {k:'offline internet connection works without network',a:'After the first visit the app opens offline. When you are signed in, changes made offline are saved on your device and sync when you reconnect.'},
 {k:'backup export import download csv json calendar restore',a:'Settings has **Export schedule (CSV)** for Google Calendar and **Download a backup (JSON)**. The Account sheet can export all your data and import a backup, which is also how you bring over data from an older version.'},
 {k:'privacy safe secure security data private who can see encrypted',a:'Your data is stored in your own account and only you can read it. Study minutes of people sharing a course are visible to each other, but reading progress is private. Data is encrypted in transit and at rest, though not end-to-end encrypted. You can export or delete everything from the Account sheet.'},
 {k:'delete remove account course data erase wipe',a:'Open the Account sheet and use **Delete this course and my data** to remove a course and everything in it. Signing out clears the local copy on this device.'},
 {k:'exam date countdown days left settings name',a:'Set the exam name and date in **Settings** (Plan tab, then "Exam date, appearance, exports"). The countdown shows at the top of the app. You can also tell me the date.'},
 {k:'test tests mock tests papers score marks scheduled',a:'Add tests and mock tests under **Plan, Tests and mock tests**, or ask me, for example "schedule a mock test on Sunday at 10 am for 3 hours". Start the test timer when it begins, and when you stop it I ask for your score. Scores show in the Report tab with a trend.'},
 {k:'reminder reminders remind repeat daily',a:'Add reminders under **Plan, Reminders and alarms**, or ask me, for example "remind me to revise ML tomorrow at 6 pm" or "every day at 9 pm remind me to log my hours". Like alarms, they ring while this page is open.'},
 {k:'theme color colour dark light mode accent background look appearance wallpaper change',a:'Ask me, for example "dark mode", "make the accent green" or "background mint". You can also pick them in Settings. Say "reset the look" to go back to the default.'},
 {k:'voice speak talk listen microphone mic male female speaking hear',a:'Tap the microphone in this chat to talk to me, and I answer out loud. Open the gear icon to choose a female or male voice, the speed and the language. Voice recognition uses your browser (Chrome or Edge work best).'},
 {k:'assistant ai smart mode key api gemini claude model',a:'I understand common requests on my own, with no key and no cost. For free-form questions and requests you can switch on **Smart mode** in the gear menu by pasting your own AI key (a free Google Gemini key works). The key stays on this device.'},
 {k:'android usage tracker other apps phone apps study time track',a:'A web page cannot see which other apps you use. A separate Android companion app measures time in the study apps you choose and gives you JSON. Reading that JSON into the weekly report is not built yet.'},
 {k:'what is abhyashify about app purpose',a:'Abhyashify is a study planner for GATE DA 2027. It builds your weekly schedule, rings alarms, logs your study time, tracks your materials and tests, and gives a weekly report that compares what you did with the plan.'},
 {k:'sign out logout switch account',a:'Open the Account sheet (top right) and tap **Sign out**. That also clears the local copy on this device.'},
];
function askKB(q){
  const stop=new Set(['how','do','i','the','a','an','to','is','it','what','can','you','me','my','of','in','on','and','does','are','where','when','why','which','this','that','with','for','about','tell','explain','please','app']);
  const qs=normText(q).split(/[^a-z0-9]+/).filter(w=>w&&!stop.has(w));
  let best=null,bs=0;
  for(const e of KB){
    const ks=e.k.split(' ');let sc=0;
    for(const w of qs)if(ks.some(x=>x===w||(w.length>=4&&x.length>=4&&(x.startsWith(w.slice(0,4))&&Math.abs(x.length-w.length)<=3))))sc++;
    if(sc>bs){bs=sc;best=e}
  }
  return bs>=1?(LANG==='hi'&&KB_HI[KB.indexOf(best)]?HG(KB_HI[KB.indexOf(best)]):best.a):null;
}

/* ---------- questions about your own data ---------- */
function studiedIn(from,to){return LG().filter(l=>l.d>=from&&l.d<=to).reduce((x,l)=>x+l.m,0)}
function dataAnswer(t){
  const now=new Date(),today=ymd(now),ws=weekStart(now);
  if(/\bhow (many|much)\b.*\b(hours?|time|minutes?|long)\b/.test(t)&&/\b(studi|log|did i|have i|spent)/.test(t)){
    let m,label;
    if(/\byesterday\b/.test(t)){const y=ymd(addDays(now,-1));m=studiedIn(y,y);label=H('yesterday','बीते कल')}
    else if(/\blast week\b/.test(t)){const a=addDays(ws,-7);m=studiedIn(ymd(a),ymd(addDays(a,6)));label=H('last week','पिछले हफ़्ते')}
    else if(/\bthis month\b/.test(t)){const a=ymd(new Date(now.getFullYear(),now.getMonth(),1));m=studiedIn(a,today);label=H('this month','इस महीने')}
    else if(/\btoday\b/.test(t)){m=studiedIn(today,today);label=H('today','आज')}
    else{m=studiedIn(ymd(ws),ymd(addDays(ws,6)));label=H('this week','इस हफ़्ते')}
    return m?H(`You have logged ${fmtDur(m)} ${label}.`,`आपने ${label} ${FD(m)} दर्ज किए हैं।`):H(`Nothing logged ${label} yet.`,`${label} अभी कुछ दर्ज नहीं हुआ।`);
  }
  if(/\b(days? left|how many days|countdown|when is (the |my )?(exam|gate))\b/.test(t)){
    if(!S.plan.exam)return H('No exam date is set. Tell me the date, for example "my exam is on 6 February 2027".','परीक्षा की तारीख़ तय नहीं है। मुझे तारीख़ बताएँ, जैसे "मेरी परीक्षा 6 फ़रवरी 2027 को है"।');
    const d=Math.round((parseYmd(S.plan.exam)-parseYmd(today))/864e5);
    const exd=parseYmd(S.plan.exam).toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric'});return d>=0?H(`${S.plan.examName||'The exam'} is on ${exd}, which is ${d} days away.`,`${S.plan.examName||'परीक्षा'} ${exd} को है, यानी ${d} दिन बाक़ी हैं।`):H('The exam date has passed.','परीक्षा की तारीख़ बीत चुकी है।');
  }
  if(/\b(what|which)\b.*\b(next|now|should i (study|do)|to study|on today|today)\b|\bwhat'?s (next|on today)\b/.test(t)&&!/\b(test|mock|reminder|alarm)s?\b/.test(t)){
    const blocks=blocksOn(S.plan,now),nm=now.getHours()*60+now.getMinutes(),nb=blocks.find(b=>toMin(b.st)+b.m>nm);
    const order=planner(S,now),seen=new Set(),nx=order.filter(o=>!seen.has(o.m.subj)&&seen.add(o.m.subj)).slice(0,2);
    let s=nb?H(`Next block: ${blockTitle(nb)} at ${nb.st} for ${fmtDur(nb.m)}.`,`अगला ब्लॉक: ${L(blockTitle(nb))}, ${nb.st} बजे, ${FD(nb.m)} के लिए।`):blocks.length?H('You have no more blocks today.','आज अब कोई ब्लॉक नहीं बचा।'):H('Nothing is scheduled today.','आज कुछ तय नहीं है।');
    if(nx.length)s+=H(' Study next: ',' आगे पढ़ें: ')+nx.map(o=>L(o.m.title)+(o.chunk?H(' (about ',' (लगभग ')+unitN(o.chunk,o.m.unit)+')':'')).join(H(', then ',', फिर '))+H('.','।');
    return s;
  }
  if(/\b(my (score|report)|how am i doing|how('?s| is) my (week|progress))\b/.test(t)){
    const r=weekReport(VS(),ws,now);
    return r.score===null?H('There is not enough data yet for a score this week. Log a session and ask again.','इस हफ़्ते स्कोर के लिए अभी पर्याप्त डेटा नहीं है। एक सत्र दर्ज करें और फिर पूछें।'):H(`Your score this week is ${r.score}. You studied ${fmtDur(r.ta)} of ${fmtDur(r.td)} due so far, with ${r.shA} of ${r.shD} sheets attempted.`,`इस हफ़्ते आपका स्कोर ${r.score} है। अब तक देय ${FD(r.td)} में से आपने ${FD(r.ta)} पढ़ा, और ${r.shD} में से ${r.shA} शीट हल कीं।`);
  }
  if(/\b(when|what|which|show|list|any|upcoming)\b.*\b(tests?|mock)/.test(t)||/\b(my )?(tests?|mocks?)\b.*\b(coming|upcoming|scheduled)\b/.test(t)){
    const up=PT().filter(x=>x.score==null).sort((a,b)=>testStart(a)-testStart(b));
    if(!up.length){const done=PT().filter(x=>x.score!=null);return done.length?H('No upcoming tests. Your last score was '+pctTxt(done[done.length-1])+'.','कोई आने वाला टेस्ट नहीं है। आपका पिछला स्कोर '+pctTxt(done[done.length-1])+' था।'):H('You have no tests scheduled. Ask me to schedule one.','आपका कोई टेस्ट तय नहीं है। मुझसे एक तय करने को कहें।')}
    return H('Upcoming: ','आने वाले: ')+up.slice(0,5).map(x=>`${x.title}, ${whenTxt(testStart(x))} (${FD(x.m)})`).join('; ')+H('.','।');
  }
  if(/\b(reminders?|alarms?)\b/.test(t)&&/\b(what|which|show|list|any|do i have|my|upcoming)\b/.test(t)&&!/\b(set|create|add|remind me|cancel|delete|remove|turn)\b/.test(t)){
    const rs=PR().filter(r=>!r.done).sort((a,b)=>a.at-b.at);
    return rs.length?H('Active: ','चालू: ')+rs.slice(0,6).map(r=>`${(r.text==='Alarm'||r.text==='Reminder')?L(r.text):r.text} (${whenTxt(r.at)}${r.rep?', '+L(REPS[r.rep]).toLowerCase():''})`).join('; ')+H('.','।'):H('You have no reminders or alarms set.','आपका कोई रिमाइंडर या अलार्म सेट नहीं है।');
  }
  return null;
}

/* ---------- the built-in brain: turns a sentence into actions ---------- */
let AWAIT=null;
const DAYRE='(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)';
function extractDays(t){
  const set=new Set(),all=[0,1,2,3,4,5,6];
  const idx=w=>WD3.indexOf(w.slice(0,3));
  if(/\b(every ?day|daily|all days|all week|whole week|seven days)\b/.test(t))all.forEach(d=>set.add(d));
  if(/\bweekdays?\b/.test(t))[0,1,2,3,4].forEach(d=>set.add(d));
  if(/\bweekends?\b/.test(t))[5,6].forEach(d=>set.add(d));
  let m,rg=new RegExp('\\b'+DAYRE+' ?(?:-|to|through|till|until) ?'+DAYRE+'\\b','g');
  while(m=rg.exec(t)){let a=idx(m[1]),b=idx(m[2]);for(let i=a;;i=(i+1)%7){set.add(i);if(i===b)break}}
  const ex=new Set();
  const exRe=new RegExp('\\b(?:except|excluding|but not|without|no|off on|leave out|skip)\\s+((?:'+DAYRE+'(?:\\s*(?:,|and|&)\\s*)?)+)','g');
  while(m=exRe.exec(t)){const sub=m[1].match(new RegExp(DAYRE,'g'))||[];sub.forEach(w=>ex.add(idx(w)));t=t.replace(m[0],' ')}
  let sg=new RegExp('\\b'+DAYRE+'\\b','g');
  while(m=sg.exec(t))set.add(idx(m[1]));
  ex.forEach(d=>set.delete(d));
  if(!set.size&&ex.size)all.forEach(d=>{if(!ex.has(d))set.add(d)});
  return [...set].sort((a,b)=>a-b);
}
const ex_=(type,o)=>Object.assign({type},o);
async function doActs(list,lead,opts){
  const r=await runActions(list,opts);
  return {reply:[lead].concat(r.msgs).filter(Boolean).join(' '),close:r.close,pending:r.pending};
}
function pickColourWord(t){
  const hex=t.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/);if(hex)return hex[0];
  const names=Object.keys(ACCENTS).concat(Object.keys(BGS),['cream','beige','white','night','gradient']);
  const ws=t.split(/[^a-z#0-9]+/);
  for(const w of ws)if(names.includes(w)&&w!=='default'&&w!=='dark'&&w!=='light')return w;
  return null;
}
function nameAfter(t,words){
  const m=t.match(new RegExp('\\b(?:'+words+')\\s+(?:is |as |to |being )?(.+?)(?:\\s+(?:with|and|importance|confidence|having|that|which)\\b.*)?$'));
  return m?m[1].replace(/^(a|an|the|new)\s+/,'').replace(/[.?!]+$/,'').trim():'';
}
async function brain(text){
  const originalText=text;text=hiNorm(text);
  const t=normText(text).trim(),T=' '+t+' ',now=new Date();
  if(!t)return {reply:H('I did not catch that.','मैं समझ नहीं पाया।')};
  // answering my own question (yes/no) or filling a missing detail
  if(PENDING){
    if(/^(yes|yeah|yep|yup|sure|ok|okay|do it|confirm|go ahead|please do|haan|ha)\b/.test(t)){const p=PENDING;PENDING=null;return doActs(p.actions,'',{confirmed:true})}
    PENDING=null;
    if(/^(no|nope|nah|cancel|don'?t|dont|stop|never ?mind|nahi)\b/.test(t))return {reply:H('Okay, I left everything as it was.','ठीक है, मैंने सब कुछ जैसा था वैसा ही रहने दिया।')};
  }
  if(AWAIT){
    const a=AWAIT;AWAIT=null;
    if(a.kind==='when'){
      const pw=parseWhen(text);
      if(pw.when&&(pw.hasTime||pw.hasDate)){
        const d=a.draft,w=pw.when;
        if(d.type==='set_reminder'){if(!pw.hasTime){w.setHours(9,0,0,0)}return doActs([ex_('set_reminder',Object.assign({},d,{at:fmtLocal(w),repeat:d.repeat||pw.rep}))],'')}
        if(d.type==='schedule_test'){return doActs([ex_('schedule_test',Object.assign({},d,{date:ymd(w),time:pw.hasTime?pad(w.getHours())+':'+pad(w.getMinutes()):'10:00',minutes:d.minutes||pw.dur}))],'')}
      }
    }else if(a.kind==='coursename'){
      const nm=text.replace(/^(call it|name it|it'?s|its|called|named)\s+/i,'').replace(/[.?!]+$/,'').trim();
      if(nm&&nm.length<=80&&!/^(no|cancel|never ?mind)/i.test(nm))return doActs([ex_('create_course',{name:nm})],'');
    }
  }
  if(/^(undo|revert|take (that|it) back|go back)\b/.test(t))return {reply:undoLast()};
  {const lm=t.match(/\b(?:switch|change|speak|talk|reply|answer|set|use)\b.*\b(hindi|english)\b/)||t.match(/\blanguage\b.*\b(hindi|english)\b/)||t.match(/\b(hindi|english) (?:language|mode)\b/);
   if(lm&&!/\b(voice|accent)\b/.test(t))return doActs([ex_('set_language',{lang:lm[1]==='hindi'?'hi':'en'})],'');
   const vm=t.match(/\b(male|female) voice\b|\b(?:switch to|talk to|speak to|use|call you|be) (adi|anu)\b|\bvoice (?:to )?(male|female)\b/);
   if(vm)return doActs([ex_('set_voice',{gender:(vm[1]||vm[3]||(vm[2]==='adi'?'male':'female'))})],'');}
  if(!PENDING&&/^(yes|no)$/.test(t))return {reply:H('Okay.','ठीक है।')};
  if(/^(thanks|thank you|thx|ty|thanks a lot)\b/.test(t))return {reply:H('Anytime. Good luck with the prep.','कभी भी। तैयारी के लिए शुभकामनाएँ।')};
  if(/^(hi|hello|hey|hii+|namaste|yo|good (morning|afternoon|evening))\b[\s!.]*$/.test(t))return {reply:H('Hi! I can set alarms and reminders, schedule tests and mock tests, build a new study schedule, change the colours, or answer questions about the app. What would you like?','नमस्ते! मैं '+asstName()+' हूँ। मैं अलार्म और रिमाइंडर लगा {सकता|सकती} हूँ, टेस्ट और मॉक टेस्ट तय कर {सकता|सकती} हूँ, नई समय-सारणी बना {सकता|सकती} हूँ, रंग बदल {सकता|सकती} हूँ, और ऐप के बारे में सवालों के जवाब दे {सकता|सकती} हूँ। बताइए, क्या करूँ?'),chips:true};
  if(/\b(what can you do|help me|^help\b|your (features|abilities|skills)|how can you help|what do you do)\b/.test(t))return {reply:H('I can: set alarms and reminders (one-off or repeating); schedule tests and mock tests and record your scores; build a new weekly schedule or add a block; add subjects and materials; log a session or start the timer; change dark/light mode, accent colour and background; answer how the app works; and tell you your hours, score, countdown and what to study next. I can also talk: tap the microphone.','मैं ये कर {सकता|सकती} हूँ: अलार्म और रिमाइंडर लगाना (एक बार या दोहराने वाले); टेस्ट और मॉक टेस्ट तय करना और आपके स्कोर दर्ज करना; नई साप्ताहिक समय-सारणी बनाना या ब्लॉक जोड़ना; विषय और सामग्री जोड़ना; सत्र दर्ज करना या टाइमर चलाना; गहरा/हल्का मोड, मुख्य रंग और पृष्ठभूमि बदलना; ऐप कैसे चलता है यह बताना; और आपके घंटे, स्कोर, उलटी गिनती और आगे क्या पढ़ना है यह बताना। मैं बात भी कर {सकता|सकती} हूँ: माइक्रोफ़ोन दबाइए।'),chips:true};

  /* look and theme */
  const lookTalk=/\b(theme|dark mode|light mode|night mode|colou?rs?|accent|background|wallpaper|appearance|look)\b/.test(t)||/\b(make|turn|switch|change|set|use|go)\b.*\b(dark|light)\b/.test(t);
  if(lookTalk&&!/^(how|what|where|can i|can you tell)\b/.test(t)){
    if(/\b(reset|default|original|restore|normal)\b/.test(t))return doActs([ex_('reset_look',{})],'');
    const col=pickColourWord(t);
    if(/\b(background|wallpaper)\b/.test(t)&&/\b(accent|colou?rs?|buttons?|primary)\b/.test(t)){
      const aw=(t.match(/\b(?:accent|colou?rs?|buttons?|primary)\b(?: colou?r)?(?: to| as| is| be)?\s+(.*)$/)||[])[1],bw=(t.match(/\b(?:background|wallpaper)\b(?: to| as| is| be)?\s+(.*)$/)||[])[1];
      const ac=aw&&pickColourWord(aw),bc=bw&&pickColourWord(bw);
      if(ac&&bc&&ac!==bc){return doActs([ex_('set_accent',{color:ac}),ex_('set_background',{background:bc})],'')}
    }
    if(/\b(theme|background|wallpaper)\b/.test(t)&&!/\b(accent|button)\b/.test(t)&&col&&BGS[col]&&col!=='default'&&!ACCENTS[col])return doActs([ex_('set_background',{background:col})],'');
    if(/\b(background|wallpaper)\b/.test(t)){
      if(col)return doActs([ex_('set_background',{background:col})],'');
      return {reply:H('Which background? Try: '+Object.keys(BGS).join(', ')+', or a hex code such as #102030.','कौन-सी पृष्ठभूमि? ये आज़माएँ: '+Object.keys(BGS).map(k=>L(BGS[k].label)).join(', ')+', या #102030 जैसा हेक्स कोड।'),chips:false};
    }
    if(/\b(accent|colou?r|button|primary)\b/.test(t)&&col)return doActs([ex_('set_accent',{color:col})],'');
    if(col&&/\b(make|turn|change|set|switch)\b/.test(t)&&!/\b(dark|light) mode\b/.test(t))return doActs([ex_('set_accent',{color:col})],'');
    if(/\b(auto|system|device)\b/.test(t))return doActs([ex_('set_theme',{mode:'auto'})],'');
    if(/\bdark\b|\bnight\b/.test(t))return doActs([ex_('set_theme',{mode:'dark'})],'');
    if(/\blight\b|\bbright\b|\bday\b/.test(t))return doActs([ex_('set_theme',{mode:'light'})],'');
    return {reply:H('I can switch dark, light or auto mode, change the accent colour (for example "make it green") and the background (for example "background mint"). Which one?','मैं गहरा, हल्का या अपने-आप मोड बदल {सकता|सकती} हूँ, मुख्य रंग बदल {सकता|सकती} हूँ (जैसे "हरा करो") और पृष्ठभूमि भी (जैसे "बैकग्राउंड मिंट करो")। कौन-सा करूँ?')};
  }

  /* tests and mock tests */
  if(/\b(mock|mocks|tests?|test paper|practice paper)\b/.test(t)&&!/^(how|why|what is|what are|does|can i|where)\b/.test(t)){
    const hasNum=/\d/.test(t);
    if(/\b(scored|score was|my score|got|result|secured|obtained)\b/.test(t)&&hasNum){
      let sc=null,mk=null,m;
      if(m=t.match(/(\d+(?:\.\d+)?) ?(?:out of|\/) ?(\d+)/)){sc=+m[1];mk=+m[2]}
      else if(m=t.match(/(?:scored|got|secured|obtained|score (?:was|is)|result (?:was|is))\D{0,12}(\d+(?:\.\d+)?)/))sc=+m[1];
      if(sc!==null)return doActs([ex_('record_score',{score:sc,marks:mk,match:cleanLabel(t.replace(/\d+(?:\.\d+)?/g,' '))})],'');
    }
    if(/\b(start|begin|take|launch)\b/.test(t)&&!/\b(schedule|set|add|book|plan)\b/.test(t))return doActs([ex_('start_test',{match:cleanLabel(t)})],'');
    if(/\b(cancel|delete|remove|drop|clear)\b/.test(t))return doActs([ex_('cancel_test',{match:/\ball\b/.test(t)?'all':cleanLabel(t)})],'');
    const dq=dataAnswer(t);if(dq&&!/\b(schedule|set|add|create|book|plan|arrange)\b/.test(t)&&!(/\d/.test(t)&&/\b(am|pm|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at)\b/.test(t)))return {reply:dq};
    const pw0=parseWhen(text);
    if(/\b(schedule|set|add|create|book|plan|put|arrange|need|want|have|take|new|fix)\b/.test(t)||(pw0.when&&(pw0.hasTime||pw0.hasDate)&&!/\b(when|list|show|upcoming|what)\b|\bnext (tests?|mocks?)\b/.test(t))){
      const pw=pw0,kind=/\bmock/.test(t)?'mock':'test',sub=findSubject(pw.rest);
      let label=cleanLabel(pw.rest);
      if(sub){const st=new Set(tokensOf(sub.name).concat([String(sub.id).toLowerCase()]));if(tokensOf(label).every(w=>[...st].some(x=>x.startsWith(w.slice(0,4))||w.startsWith(x.slice(0,4)))))label=''}
      label=label.replace(/\b(paper|exam)\b/g,'').trim();
      const draft={type:'schedule_test',title:label?cap(label):'',subject:sub?sub.id:'',kind,minutes:pw.dur,marks:pw.marks};
      if(!pw.when){AWAIT={kind:'when',draft};return {reply:H(`When should the ${kind==='mock'?'mock test':'test'} be? For example "Sunday at 10 am" or "12 October, 4 pm".`,`${kind==='mock'?'मॉक टेस्ट':'टेस्ट'} कब रखें? जैसे "रविवार सुबह 10 बजे" या "12 अक्टूबर, शाम 4 बजे"।`)}}
      return doActs([ex_('schedule_test',Object.assign(draft,{date:ymd(pw.when),time:pw.hasTime?pad(pw.when.getHours())+':'+pad(pw.when.getMinutes()):'10:00'}))],'');
    }
  }

  /* reminders and alarms */
  if(/\b(remind|reminders?|alarms?|wake me)\b/.test(t)){
    if(/\b(cancel|delete|remove|clear|stop|turn off|disable)\b/.test(t)&&!/\b(bell|alarms? (?:on|off))\b/.test(t)){
      const lab=cleanLabel(parseWhen(text).rest);
      return doActs([ex_('cancel_reminder',{match:/\b(all|every|everything)\b/.test(t)?'all':lab})],'');
    }
    if(/\b(turn|switch) (the )?(bell|alarms?) (on|off)\b|\b(enable|disable) (the )?(alarms?|bell)\b/.test(t))return doActs([ex_('alarms_on',{on:/\b(on|enable)\b/.test(t)})],'');
    const dq=dataAnswer(t);if(dq)return {reply:dq};
    const pwr=parseWhen(text);
    if(/\b(set|create|add|make|remind|wake|new|put|give|schedule)\b/.test(t)||(pwr.when&&(pwr.hasTime||pwr.hasDate)&&!/\b(what|which|how|when|why|show|list|any|do i have)\b/.test(t))){
      const pw=pwr,isAlarm=/\b(alarm|wake me)\b/.test(t)&&!/\bremind/.test(t);
      let label=restoreCase(cleanLabel(pw.rest),originalText);
      if(!label&&/\bwake me\b/.test(t))label=H('Wake up','उठना');
      const draft={type:'set_reminder',text:label,kind:isAlarm?'alarm':'reminder',repeat:pw.rep};
      if(!pw.when||(!pw.hasTime&&!pw.hasDate)){AWAIT={kind:'when',draft};return {reply:H(`What time should I ${isAlarm?'set the alarm':'remind you'}? For example "6 pm" or "tomorrow at 7:30 am".`,`${isAlarm?'अलार्म':'याद दिलाना'} किस समय रखूँ? जैसे "शाम 6 बजे" या "कल सुबह 7:30 बजे"।`)}}
      let w=pw.when;if(!pw.hasTime){w=new Date(w);w.setHours(9,0,0,0)}
      return doActs([ex_('set_reminder',Object.assign(draft,{at:fmtLocal(w),text:label||(isAlarm?'Alarm':'Reminder')}))],'');
    }
  }

  /* blocks and schedules */
  if(/\b(add|create|put|schedule|set up|make|insert)\b/.test(t)&&/\b(block|slot|session|class)\b/.test(t)&&!/\b(log|logged)\b/.test(t)&&!/\bstart\b/.test(t)){
    const pw=parseWhen(text),sub=findSubject(text),days=extractDays(t);
    const kind=/\bmock\b/.test(t)?'mock':/\brevision|revise\b/.test(t)?'revision':/\bpractice|practise|problems|questions\b/.test(t)?'practice':'theory';
    if(!sub)return {reply:H('Which subject is the block for? You have: '+S.plan.subjects.map(s=>s.name).join(', ')+'.','यह ब्लॉक किस विषय के लिए है? आपके विषय: '+S.plan.subjects.map(s=>L(s.name)).join(', ')+'।')};
    if(!pw.hasTime)return {reply:H('What time should the block start? For example "at 6 am".','ब्लॉक किस समय शुरू हो? जैसे "सुबह 6 बजे"।')};
    return doActs([ex_('add_block',{subject:sub.id,days:days.length?days:[dow(pw.when||now)],time:pad(pw.h)+':'+pad(pw.m),minutes:pw.dur||90,kind,sheets:kind==='practice'?1:0})],'');
  }
  if(/\b(schedule|timetable|routine|study plan|plan)\b/.test(t)&&/\b(new|make|create|build|generate|prepare|design|set up|setup|replace|reset|redo|fresh|load|use|start with|apply)\b/.test(t)&&!/^(how|what is|why)\b/.test(t)){
    if(/\b(clear|empty|blank|delete|remove)\b/.test(t)&&!/\b(new|build|make|create)\b/.test(t))return doActs([ex_('clear_schedule',{})],'');
    const pw=parseWhen(text),template=/\b(gate|template|default|standard)\b/.test(t);
    const hm=t.match(/(\d+(?:\.\d+)?) ?(?:hours?|hrs?)(?: ?(?:a|per|every|each) ?day| daily)?/);
    const days=extractDays(t);
    return doActs([ex_('new_schedule',{mode:template?'template':'generate',hours:hm?+hm[1]:(pw.dur?pw.dur/60:4),start:pw.hasTime?pad(pw.h)+':'+pad(pw.m):'06:00',days:days.length?days:null})],'');
  }

  /* subjects, materials, exam */
  if(/\b(add|create|new)\b.*\bsubject\b/.test(t)){
    const name=nameAfter(text.toLowerCase().replace(/\s+/g,' '),'subject|called|named');
    const imp=(t.match(/importance (?:of |is |to )?(\d)/)||[])[1],conf=(t.match(/confidence (?:of |is |to )?(\d)/)||[])[1];
    if(!name)return {reply:H('What is the subject called?','विषय का नाम क्या है?')};
    return doActs([ex_('add_subject',{name:cap(name),importance:imp,confidence:conf})],'');
  }
  if(/\b(add|create|new|upload)\b.*\b(book|pdf|material|notes|sheet|paper|lecture|lectures|playlist|resource|course material|textbook)\b/.test(t)&&!/\b(mock test|reminder|alarm)\b/.test(t)){
    const sub=findSubject(text),tot=t.match(/(\d+) ?(pages?|chapters?|questions?|sheets?|lectures?|videos?)/);
    const kind=/\b(sheet|questions|problems|practice)\b/.test(t)?'sheet':/\b(notes|slides)\b/.test(t)?'notes':/\b(mock|paper)\b/.test(t)?'mock':'theory';
    let title=nameAfter(text.replace(/\s+/g,' '),'book|pdf|material|notes|sheet|paper|textbook|called|named|titled');
    title=title.replace(/\s+(for|in|on|with)\b.*$/i,'').replace(/\b\d+ ?(pages?|chapters?|questions?|sheets?|lectures?|videos?)\b/gi,'').trim();
    if(!title)return {reply:H('What is the material called?','सामग्री का नाम क्या है?')};
    const unit=tot?(tot[2].replace(/s$/,'')==='video'?'lectures':tot[2].replace(/s$/,'')+'s'):undefined;
    return doActs([ex_('add_material',{title,subject:sub?sub.id:null,kind,total:tot?+tot[1]:0,unit})],'');
  }
  if(/\b(exam|gate)\b/.test(t)&&/\b(date|on|is|set|change)\b/.test(t)&&/\d/.test(t)&&!/\b(how|when is)\b/.test(t)){
    const pw=parseWhen(text);
    if(pw.when&&pw.hasDate)return doActs([ex_('set_exam',{date:ymd(pw.when)})],'');
  }

  /* courses */
  if(/\bcourse\b/.test(t)){
    if(/\b(new|create|add|start|make)\b/.test(t)&&!/\b(material|how)\b/.test(t)){
      const nm=nameAfter(text.replace(/\s+/g,' '),'called|named|titled|course for|course on|course');
      if(!nm||/^(new|a|another|one)$/i.test(nm)){AWAIT={kind:'coursename'};return {reply:H('What should the course be called?','कोर्स का नाम क्या रखें?')}}
      return doActs([ex_('create_course',{name:cap(nm)})],'');
    }
    if(/\b(switch|open|go to|change to|move to)\b/.test(t)){const nm=nameAfter(text,'course|to');return doActs([ex_('open_course',{name:nm})],'')}
    if(/\b(list|which|what|my|show)\b/.test(t))return {reply:CL?H('Your courses: ','आपके कोर्स: ')+CL.courses.map(c=>c.name).join(', ')+H('.','।'):H('You are using one plan on this device. Sign in to keep several courses.','आप इस डिवाइस पर एक ही योजना इस्तेमाल कर रहे हैं। कई कोर्स रखने के लिए साइन इन करें।')};
  }

  /* timer, logging, navigation */
  if(/\b(stop|end|finish|pause)\b.*\b(timer|session|studying|study)\b/.test(t))return doActs([ex_('stop_timer',{})],'');
  if(/\b(start|begin)\b.*\b(timer|stopwatch|studying|study session|session|study)\b/.test(t)&&!/\b(block|mock|test)\b/.test(t))return doActs([ex_('start_timer',{subject:findSubject(text)?findSubject(text).id:null})],'');
  if(/\b(studied|studying|revised|practi[sc]ed|worked on|spent|read|did)\b/.test(t)&&/\d ?(hours?|minutes?)|\bhour\b/.test(t)&&!/\bhow (many|much)\b/.test(t)||/\blog\b/.test(t)&&/\d ?(hours?|minutes?)/.test(t)){
    const pw=parseWhen(text),sub=findSubject(text);
    return doActs([ex_('log_session',{subject:sub?sub.id:null,minutes:pw.dur,date:pw.date?ymd(pw.date):null,time:pw.hasTime?pad(pw.h)+':'+pad(pw.m):null})],'');
  }
  if(/\b(turn|switch) (the )?(bell|alarms?) (on|off)\b|\b(enable|disable) (the )?(alarms?|bell)\b/.test(t))return doActs([ex_('alarms_on',{on:/\b(on|enable)\b/.test(t)})],'');
  const nav=t.match(/\b(open|go to|show me|take me to|switch to|show)\b.*\b(today|plan|materials|report|settings|account)\b/);
  if(nav&&!/\b(how|what)\b/.test(t))return doActs([ex_('navigate',{to:nav[2]})],'');

  /* questions about your own data, then about the app */
  const dq=dataAnswer(t);if(dq)return {reply:dq};
  const kb=askKB(text);if(kb)return {reply:kb};
  return {reply:H('I am not sure I understood that. Try something like "set an alarm for 6 am tomorrow", "schedule a mock test on Sunday at 10", "remind me to revise ML at 8 pm", "make a schedule for 5 hours a day", "dark mode", or "how do I log a session?"'+(ACFG.provider&&ACFG.key?'':' For free-form requests, switch on Smart mode in the gear menu.'),'मैं ठीक से समझ नहीं पाया। कुछ ऐसा कहें: "कल सुबह 6 बजे का अलार्म लगाओ", "रविवार को 10 बजे मॉक टेस्ट तय करो", "रात 8 बजे ML दोहराने की याद दिलाओ", "रोज़ 5 घंटे की समय-सारणी बनाओ", "डार्क मोड", या "सत्र कैसे दर्ज करूँ?"'+(ACFG.provider&&ACFG.key?'':' खुले-ढंग के अनुरोधों के लिए गियर मेन्यू में स्मार्ट मोड चालू करें।')),chips:true};
}

/* ---------- optional smart mode: your own AI key, called straight from this device ---------- */
const AI_PROVIDERS={gemini:{label:'Google Gemini (free key)',model:'gemini-2.5-flash'},anthropic:{label:'Anthropic Claude',model:'claude-haiku-4-5-20251001'}};
const aiReady=()=>!!(ACFG.provider&&AI_PROVIDERS[ACFG.provider]&&ACFG.key);
const ACTION_DOC=`Action types (all fields optional unless marked; dates are YYYY-MM-DD, times are 24-hour HH:MM, in the user's local time):
set_reminder {at:"YYYY-MM-DD HH:MM" (required), text, kind:"reminder"|"alarm", repeat:"daily"|"weekdays"|"weekly"}
cancel_reminder {match: words from its text, or "all"}
schedule_test {title, subject (name), date (required), time, minutes, marks, kind:"mock"|"test"}
record_score {score (required), marks, match: words from the test title}
cancel_test {match}
start_test {match}
set_theme {mode:"auto"|"light"|"dark"}
set_accent {color: a name like green or a hex code}
set_background {background: one of ${Object.keys(BGS).join(', ')} or a hex code}
reset_look {}
add_block {subject (name), days:["mon",...], time (required), minutes, kind:"theory"|"practice"|"revision"|"mock"|"other", sheets}
new_schedule {mode:"generate"|"template", hours (study hours per day), start (HH:MM), days:["mon",...]}  (replaces the weekly blocks; the app asks the user to confirm)
clear_schedule {}  (the app asks the user to confirm)
add_subject {name (required), importance:1-5, confidence:1-5}
add_material {title (required), subject, kind:"theory"|"sheet"|"notes"|"mock", total, unit:"pages"|"chapters"|"questions"|"sheets"|"lectures"}
set_exam {date (required), name}
log_session {subject, minutes (required), date, time}
start_timer {subject}   stop_timer {}
create_course {name}   open_course {name}
navigate {to:"today"|"plan"|"materials"|"report"|"settings"|"account"}
alarms_on {on:true|false}
set_language {lang:"en"|"hi"}   set_voice {gender:"male"|"female"}`;
function stateSummary(){
  const now=new Date(),ws=weekStart(now),r=weekReport(VS(),ws,now);
  return JSON.stringify({
    exam:S.plan.exam?{name:S.plan.examName,date:S.plan.exam}:null,
    subjects:S.plan.subjects.map(s=>({name:s.name,importance:s.w,confidence:s.c})),
    blocks_per_week:S.plan.blocks.length,
    todays_blocks:blocksOn(S.plan,now).map(b=>blockTitle(b)+' '+b.st+' '+fmtDur(b.m)),
    upcoming_tests:PT().filter(t=>t.score==null).slice(0,6).map(t=>({title:t.title,when:t.date+' '+t.st,minutes:t.m})),
    past_test_scores:PT().filter(t=>t.score!=null).slice(-5).map(t=>({title:t.title,percent:Math.round(t.score/t.marks*100)})),
    reminders:PR().filter(r=>!r.done).slice(0,8).map(r=>({text:r.text,at:ymd(new Date(r.at))+' '+timeTxt(new Date(r.at))})),
    this_week:{score:r.score,hours_logged:Math.round(r.ta/6)/10,hours_due:Math.round(r.td/6)/10},
    theme:theme,accent:LOOK.accent,background:LOOK.bg,course:CL?CL.name:null,signed_in:!!CL
  });
}
function aiSystem(){
  const now=new Date();
  return `Your name is ${asstName()} (${ACFG.gender==='male'?'a male':'a female'} voice). The app language is ${LANG==='hi'?'Hindi: write "reply" in Hindi using Devanagari script, in a friendly spoken style, and use '+(ACFG.gender==='male'?'masculine':'feminine')+' verb forms for yourself':'English'}. The student may write in English, Hindi or Hinglish.\nYou are the assistant inside Abhyashify, a study-planner web app used by a student preparing for GATE DA 2027 (Data Science and AI). Be warm, brief and practical.
Reply with ONE JSON object and nothing else: {"reply": string, "actions": [ ... ]}.
- "reply" is plain text, at most 3 short sentences, no markdown (it may be read aloud). When you quiz the student, ask one question at a time and check their answer.
- "actions" is a list (often empty) of things for the app to do. Use only the action types below. You cannot delete courses, materials or account data; tell the user to do that in the app.
- If a detail you need is missing, ask for it in "reply" and send no actions. Never invent facts about the app; if unsure, say so.
- Now: ${now.toLocaleString([],{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} (${ymd(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}, local time).
App areas: Today (schedule, timer, coming up), Plan (blocks, subjects, tests and mock tests, reminders), Materials, Report. Alarms ring only while the page is open and the bell is on.
${ACTION_DOC}
Current data (JSON): ${stateSummary()}`;
}
function aiMessages(userText){
  const turns=[];
  for(const m of CHAT.slice(-10)){const role=m.r==='u'?'user':'assistant';if(turns.length&&turns[turns.length-1].role===role)turns[turns.length-1].text+='\n'+m.t;else turns.push({role,text:m.t})}
  if(turns.length&&turns[turns.length-1].role==='user'&&turns[turns.length-1].text.trim()===userText.trim())turns.pop();
  while(turns.length&&turns[0].role!=='user')turns.shift();
  turns.push({role:'user',text:userText});
  const merged=[];for(const t of turns){if(merged.length&&merged[merged.length-1].role===t.role)merged[merged.length-1].text+='\n'+t.text;else merged.push(Object.assign({},t))}
  return merged;
}
async function aiCall(system,msgs){
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),30000),model=(ACFG.model||AI_PROVIDERS[ACFG.provider].model).trim();
  try{
    let res,data,text;
    if(ACFG.provider==='gemini'){
      res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',signal:ctl.signal,
        headers:{'content-type':'application/json','x-goog-api-key':ACFG.key},
        body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:msgs.map(m=>({role:m.role==='user'?'user':'model',parts:[{text:m.text}]})),generationConfig:{responseMimeType:'application/json',temperature:.3,maxOutputTokens:900}})});
      data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(aiErr(res.status,data&&data.error&&data.error.message));
      text=data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts.map(p=>p.text||'').join('');
    }else{
      res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ctl.signal,
        headers:{'content-type':'application/json','x-api-key':ACFG.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model,max_tokens:900,system,messages:msgs.map(m=>({role:m.role,content:m.text}))})});
      data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(aiErr(res.status,data&&data.error&&data.error.message));
      text=data.content&&data.content.map(c=>c.text||'').join('');
    }
    if(!text)throw new Error('The AI sent back nothing.');
    return text;
  }catch(e){
    if(e&&e.name==='AbortError')throw new Error('The AI took too long to answer.');
    if(e&&e.name==='TypeError')throw new Error('Could not reach the AI. Check your connection.');
    throw e;
  }finally{clearTimeout(to)}
}
const aiErr=(s,m)=>s===401||s===403||s===400&&/api key|API_KEY/i.test(m||'')?'The AI key was rejected. Check it in the gear menu.':s===429?'The AI is rate-limited right now. Try again in a minute.':'The AI returned an error ('+s+')'+(m?': '+String(m).slice(0,120):'')+'.';
function parseAI(text){
  let s=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  try{const j=JSON.parse(a>=0&&b>a?s.slice(a,b+1):s);return {reply:typeof j.reply==='string'?j.reply:'',actions:Array.isArray(j.actions)?j.actions:[]}}
  catch(e){return {reply:s.slice(0,600),actions:[]}}
}
async function respond(text){
  if(PENDING){const t0=normText(text).trim();if(/^(yes|yeah|yep|yup|sure|ok|okay|do it|confirm|go ahead|please do|haan|ha|no|nope|nah|cancel|don'?t|dont|stop|never ?mind|nahi)\b/.test(t0))return brain(text);PENDING=null}
  if(aiReady()){
    try{
      const raw=await aiCall(aiSystem(),aiMessages(text)),j=parseAI(raw);
      if(!j.actions.length)return {reply:j.reply||'Okay.'};
      const r=await runActions(j.actions);
      const lead=j.reply&&j.reply.length>110&&r.msgs.length?j.reply:'';
      return {reply:[lead].concat(r.msgs).filter(Boolean).join(' ')||j.reply||'Done.',close:r.close,pending:r.pending};
    }catch(e){
      const r=await brain(text);r.reply=(e&&e.message?e.message:'Smart mode failed.')+' I used my built-in answer instead.\n'+r.reply;return r;
    }
  }
  return brain(text);
}

/* ---------- voice: listening and speaking ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition,SYN_=window.speechSynthesis;
let VOICES=[],rec=null,listening=false,voiceChat=false,speakingNow=false,noSpeech=0,speakGen=0;
function loadVoices(){try{VOICES=SYN_?SYN_.getVoices():[]}catch(e){VOICES=[]}}
if(SYN_){loadVoices();try{SYN_.addEventListener('voiceschanged',loadVoices)}catch(e){SYN_.onvoiceschanged=loadVoices}}
const FEM=/female|woman|zira|hazel|susan|heera|aria|jenny|samantha|karen|moira|tessa|veena|fiona|victoria|natasha|libby|sonia|emma|neerja|swara|priya|lekha|kalpana|amy|joanna|ivy|salli|kimberly|nicole|raveena|aditi|kajal|siri|allison|ava|serena|catherine|zoe|google uk english female/i;
const MAL=/\bmale\b|\bdavid\b|\bmark\b|george|ravi\b|hemant|james|daniel|\balex\b|fred|oliver|\bguy\b|ryan|prabhat|rishi|thomas|brian|matthew|joey|justin|kevin|arthur|google uk english male|\bpaul\b|\bhenry\b|\bgordon\b/i;
function genderOf(v){const n=v.name||'';if(MAL.test(n)&&!/female/i.test(n))return 'male';if(FEM.test(n))return 'female';return null}
function voicePool(){
  const l=(ACFG.lang||'en-IN').toLowerCase(),base=l.slice(0,2);
  const same=VOICES.filter(v=>(v.lang||'').toLowerCase().replace('_','-')===l),near=VOICES.filter(v=>(v.lang||'').toLowerCase().startsWith(base));
  return same.length?same.concat(near.filter(v=>!same.includes(v))):near.length?near:VOICES;
}
function pickVoice(){
  if(ACFG.voiceName){const v=VOICES.find(x=>x.name===ACFG.voiceName);if(v)return {v,pitch:1,shifted:false}}
  const pool=voicePool(),hit=pool.find(v=>genderOf(v)===ACFG.gender);
  if(hit)return {v:hit,pitch:1,shifted:false};
  return {v:pool[0]||null,pitch:ACFG.gender==='male'?.75:1.18,shifted:true};
}
function speechText(s){
  return String(s||'').replace(/\*\*/g,'').replace(/https?:\/\/\S+/g,'').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'').replace(/\s*\n\s*/g,'. ').replace(/\s+/g,' ').trim();
}
function stopSpeaking(){speakGen++;speakingNow=false;try{SYN_&&SYN_.cancel()}catch(e){}if(typeof cvStopAudio==='function')cvStopAudio()}
function speak(text,done){
  const clean=speechText(text).slice(0,600);if(!clean){done&&done();return}
  const useC=cvUsable(ACFG.gender);
  if(!useC&&(!SYN_||!window.SpeechSynthesisUtterance)){done&&done();return}
  stopSpeaking();const gen=speakGen,pv=pickVoice();
  const parts=clean.match(/[^.!?।]+[.!?।]*/g)||[clean];
  if(useC){speakCustom(parts,gen,done,cvCfg(ACFG.gender),ACFG.gender);return}
  speakingNow=true;paintMic();
  parts.forEach((p,i)=>{
    const u=new SpeechSynthesisUtterance(p.trim());
    if(pv.v){u.voice=pv.v;u.lang=pv.v.lang}else u.lang=ACFG.lang;
    u.rate=Math.min(1.6,Math.max(.6,+ACFG.rate||1));u.pitch=pv.pitch;
    if(i===parts.length-1){const fin=()=>{if(gen!==speakGen)return;speakingNow=false;paintMic();done&&done()};u.onend=fin;u.onerror=fin}
    try{SYN_.speak(u)}catch(e){}
  });
}
window.AsstSpeak=t=>{if(ACFG.speak)speak(t)};
function stopListening(){try{rec&&(rec.onend=null,rec.abort())}catch(e){}rec=null;listening=false;paintMic()}
function startListening(){
  if(!SR){asstAdd('a',H('Voice input is not supported in this browser. Chrome, Edge or Safari work. You can still type, and I can read my answers aloud.','इस ब्राउज़र में आवाज़ से बोलना काम नहीं करता। Chrome, Edge या Safari चलते हैं। आप फिर भी लिख सकते हैं, और मैं जवाब बोलकर सुना {सकता|सकती} हूँ।'));voiceChat=false;paintMic();return}
  stopSpeaking();stopListening();
  const r=new SR();rec=r;r.lang=ACFG.lang||'en-IN';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  let finalT='',err=null;const box=document.getElementById('as-text');
  r.onstart=()=>{listening=true;paintMic()};
  r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const x=e.results[i];if(x.isFinal)finalT+=x[0].transcript;else interim+=x[0].transcript}if(box)box.value=(finalT+' '+interim).trim()};
  r.onerror=e=>{err=e.error};
  r.onend=()=>{
    if(rec!==r)return;rec=null;listening=false;paintMic();
    if(err==='not-allowed'||err==='service-not-allowed'){voiceChat=false;paintMic();asstAdd('a',H('The microphone is blocked. Allow microphone access for this site in your browser settings, then tap the mic again.','माइक्रोफ़ोन बंद है। ब्राउज़र की सेटिंग्स में इस साइट को माइक्रोफ़ोन की अनुमति दें, फिर माइक दोबारा दबाएँ।'));return}
    if(err==='network'){voiceChat=false;paintMic();asstAdd('a',H('Voice recognition needs an internet connection. You can type instead.','आवाज़ पहचानने के लिए इंटरनेट चाहिए। आप इसके बजाय लिख सकते हैं।'));return}
    const txt=finalT.trim();
    if(txt){noSpeech=0;asstSend(txt,true)}
    else if(voiceChat){noSpeech++;if(noSpeech>=2){voiceChat=false;noSpeech=0;paintMic();asstAdd('a',H('I stopped listening because I did not hear anything. Tap the microphone to talk again.','कुछ सुनाई नहीं दिया, इसलिए मैंने सुनना बंद कर दिया। फिर बात करने के लिए माइक्रोफ़ोन दबाएँ।'))}else setTimeout(()=>{if(voiceChat&&!listening&&!speakingNow)startListening()},250)}
  };
  try{r.start()}catch(e){voiceChat=false;paintMic()}
}
function toggleMic(){
  if(voiceChat||listening){voiceChat=false;noSpeech=0;stopListening();stopSpeaking();paintMic();return}
  voiceChat=true;noSpeech=0;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}startListening();
}

/* ---------- assistant panel ---------- */
const suggestions=()=>LANG==='hi'?['कल सुबह 6 बजे का अलार्म लगाओ','रविवार को 10 बजे मॉक टेस्ट तय करो','रोज़ 5 घंटे की समय-सारणी बनाओ','आगे मुझे क्या पढ़ना चाहिए?','डार्क मोड और मुख्य रंग हरा करो','सत्र कैसे दर्ज करूँ?']:['Set an alarm for 6 am tomorrow','Schedule a mock test on Sunday at 10','Make a schedule for 5 hours a day','What should I study next?','Make it dark with a green accent','How do I log a session?'];
let asstOpen=false,asstView='chat',asstBusy=false,asstChips=true;
const asEl=()=>document.getElementById('asst');
const fmtMsg=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
function asstAdd(role,text){
  CHAT.push({r:role,t:role==='a'?HG(String(text||'')):String(text||''),ts:Date.now()});if(CHAT.length>80)CHAT=CHAT.slice(-80);saveChat();
  paintChat();
}
function modeLabel(){return asstName()+' · '+(aiReady()?H('Smart mode','स्मार्ट मोड'):H('Built-in','बिल्ट-इन'))+' · '+(ACFG.gender==='male'?H('male voice','पुरुष आवाज़'):H('female voice','महिला आवाज़'))}
function paintMic(){
  const b=document.getElementById('as-mic');if(!b)return;
  const on=listening||voiceChat;
  b.classList.toggle('on',on);b.classList.toggle('talk',speakingNow);
  b.setAttribute('aria-pressed',on?'true':'false');
  b.setAttribute('aria-label',on?'Stop voice chat':'Start voice chat');
  const st=document.getElementById('as-state');
  if(st)st.textContent=listening?H('Listening…','{सुन रहा|सुन रही} हूँ…'):speakingNow?H('Speaking…','{बोल रहा|बोल रही} हूँ…'):asstBusy?H('Thinking…','{सोच रहा|सोच रही} हूँ…'):voiceChat?H('Voice chat on','आवाज़ वाली बातचीत चालू'):'';
}
function paintChat(){
  const box=document.getElementById('as-msgs');if(!box||asstView!=='chat')return;
  const stick=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  let h='';
  if(!CHAT.length)h+=`<div class="as-hello" translate="no"><span class="logo">${ic('spark')}</span><b>${H("Hi, I'm "+asstName()+", your study assistant",'नमस्ते, मैं '+asstName()+' हूँ, आपकी पढ़ाई की सहायक')}</b><p class="muted small">${H('I can set alarms, reminders and tests, build schedules, change the look of the app and answer questions about it. Type, or tap the mic and talk.','मैं अलार्म, रिमाइंडर और टेस्ट लगा {सकता|सकती} हूँ, समय-सारणी बना {सकता|सकती} हूँ, ऐप का रंग-रूप बदल {सकता|सकती} हूँ और उसके बारे में सवालों के जवाब दे {सकता|सकती} हूँ। लिखिए, या माइक दबाकर बोलिए।')}</p></div>`;
  h+=CHAT.slice(-40).map(m=>`<div class="as-m ${m.r==='u'?'u':'a'}" translate="no">${fmtMsg(m.t)}</div>`).join('');
  if(asstBusy)h+='<div class="as-m a dots" translate="no" aria-label="Thinking"><i></i><i></i><i></i></div>';
  box.innerHTML=h;
  if(stick||asstBusy)box.scrollTop=box.scrollHeight;
  const ch=document.getElementById('as-chips');
  if(ch){
    const list=[];
    if(LASTSNAP)list.push({t:H('Undo my last change','मेरा पिछला बदलाव वापस करें'),v:'undo',cls:'undo'});
    if(asstChips&&!asstBusy)suggestions().forEach(x=>list.push({t:x,v:x}));
    ch.innerHTML=list.map(c=>`<button type="button" class="as-chip ${c.cls||''}" data-asa="chip" data-v="${esc(c.v)}">${esc(c.t)}</button>`).join('');
  }
  paintMic();
}
async function asstSend(text,fromVoice){
  text=String(text||'').trim();if(!text||asstBusy)return;
  const box=document.getElementById('as-text');if(box)box.value='';
  asstChips=false;asstAdd('u',text);asstBusy=true;paintChat();
  let r;
  try{r=await respond(text)}catch(e){r={reply:'Something went wrong: '+(e&&e.message?e.message:'unknown error')}}
  asstBusy=false;
  asstChips=!!r.chips;
  const reply=r.reply||(r.msgs&&r.msgs.length?r.msgs.join(' '):'Done.');
  asstAdd('a',reply);
  const talk=voiceChat||fromVoice||ACFG.speak;
  const after=()=>{if(voiceChat&&asstOpen&&!listening)setTimeout(()=>{if(voiceChat&&!listening&&!speakingNow)startListening()},300)};
  if(talk&&SYN_)speak(reply,after);else after();
  if(r.close&&!voiceChat)setTimeout(closeAssistant,900);
}
function openAssistant(view){
  const el=asEl();if(!el)return;
  asstView=view||'chat';asstOpen=true;el.hidden=false;document.body.classList.add('lock');
  paintAssistant();
  const fab=document.getElementById('asstfab');if(fab)fab.hidden=true;
  setTimeout(()=>{const b=document.getElementById('as-text');if(b&&asstView==='chat'&&!('ontouchstart' in window))b.focus()},60);
}
function closeAssistant(){
  const el=asEl();if(!el||!asstOpen)return;
  asstOpen=false;voiceChat=false;noSpeech=0;stopListening();stopSpeaking();
  el.hidden=true;el.innerHTML='';document.body.classList.remove('lock');
  const fab=document.getElementById('asstfab');if(fab)fab.hidden=!!GATE;
}
function paintAssistant(){
  const el=asEl();if(!el)return;
  const cfg=asstView==='cfg';
  el.innerHTML=`<div class="as-scrim" data-asa="close"></div><section class="as-panel" role="dialog" aria-modal="true" aria-label="Assistant">
    <header class="as-head"><div class="as-title"><span class="logo">${ic('spark')}</span><div><b translate="no">${cfg?H('Assistant settings','सहायक की सेटिंग्स'):asstName()}</b><small id="as-sub" translate="no">${esc(modeLabel())}</small></div></div>
      <div class="as-tools">${cfg?`<button type="button" class="icb" data-asa="back" aria-label="Back to chat">${ic('chev','flip')}</button>`:`<button type="button" class="icb" data-asa="speak" aria-pressed="${ACFG.speak}" aria-label="Read answers aloud">${ic(ACFG.speak?'volume':'volume-off')}</button><button type="button" class="icb" data-asa="cfg" aria-label="Assistant settings">${ic('sliders')}</button>`}
      <button type="button" class="icb" data-asa="close" aria-label="Close assistant">${ic('x')}</button></div></header>
    ${cfg?`<div class="as-cfg" id="as-cfg">${cfgHtml()}</div>`:`<div class="as-body" id="as-msgs" aria-live="polite"></div><div class="as-chips" id="as-chips"></div>
    <div class="as-state" id="as-state" aria-live="polite"></div>
    <form class="as-in" id="as-form" autocomplete="off"><input id="as-text" type="text" placeholder="Ask or tell me something…" maxlength="400" aria-label="Message"><button type="button" class="icb as-mic" id="as-mic" data-asa="mic" aria-pressed="false" aria-label="Start voice chat">${ic('mic')}</button><button type="submit" class="icb as-send" aria-label="Send">${ic('send')}</button></form>`}
  </section>`;
  if(!cfg)paintChat();
}
function cfgHtml(){
  const base=(ACFG.lang||'en-IN').slice(0,2).toLowerCase();
  const vs=VOICES.filter(v=>(v.lang||'').toLowerCase().startsWith(base));
  const pv=pickVoice();
  const prov=ACFG.provider||'';
  const voiceNote=!SYN_?H('This browser cannot speak answers aloud. Chrome, Edge or Safari can.','यह ब्राउज़र जवाब बोलकर नहीं सुना सकता। Chrome, Edge या Safari सुना सकते हैं।')
    :pv.shifted&&VOICES.length?H('This device has no '+ACFG.gender+' voice for this language, so I shift the pitch of the one it has. Pick a specific voice below to change that.','इस डिवाइस में इस भाषा की '+(ACFG.gender==='male'?'पुरुष':'महिला')+' आवाज़ नहीं है, इसलिए मैं उपलब्ध आवाज़ की पिच बदल {देता|देती} हूँ। इसे बदलने के लिए नीचे कोई ख़ास आवाज़ चुनें।')
    :pv.v?H('Using: ','इस्तेमाल हो रही है: ')+esc(pv.v.name)
    :H('No voices were found yet. Some browsers load them a moment after the page opens.','अभी कोई आवाज़ नहीं मिली। कुछ ब्राउज़र पेज खुलने के थोड़ी देर बाद आवाज़ें लोड करते हैं।');
  return `<div class="stack" style="gap:8px"><span class="kick">${H('Language','भाषा')}</span>
      <div class="seg" translate="no">${[['en','English'],['hi','हिन्दी']].map(([k,l])=>`<button type="button" data-asa="lang" data-v="${k}" aria-pressed="${LANG===k}">${l}</button>`).join('')}</div>
      <p class="small muted">${H('The app, my replies and voice chat all follow this language. You can also type or say "switch to Hindi" or "switch to English".','ऐप, मेरे जवाब और आवाज़ वाली बातचीत, सब इसी भाषा में चलते हैं। आप "हिन्दी में बोलो" या "switch to English" भी कह सकते हैं।')}</p></div>
    <div class="stack" style="gap:8px"><span class="kick">${H('Voice','आवाज़')}</span>
      <div class="seg" translate="no">${[['female',H('Female · Anu','महिला · अनु')],['male',H('Male · Adi','पुरुष · आदि')]].map(([k,l])=>`<button type="button" data-asa="gender" data-v="${k}" aria-pressed="${ACFG.gender===k}">${l}</button>`).join('')}</div>
      <p class="small muted">${voiceNote}</p></div>
    <label class="switch"><span>${H('Read answers aloud','जवाब बोलकर सुनाएँ')}</span><input type="checkbox" data-cfg="speak"${ACFG.speak?' checked':''}></label>
    <label class="field">${H('Speed','गति')} ${(+ACFG.rate||1).toFixed(1)}×<input type="range" data-cfg="rate" min="0.7" max="1.4" step="0.1" value="${+ACFG.rate||1}"></label>
    <label class="field">${H('Voice','आवाज़')}<select data-cfg="voiceName"><option value="">${H('Automatic','अपने-आप')} (${ACFG.gender==='male'?H('male','पुरुष'):H('female','महिला')})</option>${vs.map(v=>`<option value="${esc(v.name)}"${ACFG.voiceName===v.name?' selected':''}>${esc(v.name)}${genderOf(v)?' · '+(genderOf(v)==='male'?H('male','पुरुष'):H('female','महिला')):''}</option>`).join('')}</select></label>
    <button type="button" class="btn ghost" data-asa="testvoice">${ic('volume')}${H('Test the voice','आवाज़ सुनकर देखें')}</button>
    ${cvHtml()}
    <div class="stack" style="gap:8px;margin-top:6px"><span class="kick">${H('Smart mode (optional)','स्मार्ट मोड (वैकल्पिक)')}</span>
      <p class="small muted">${H('Without a key I use my built-in understanding, which handles the common requests and needs no account. For free-form requests, paste your own AI key. It is stored only on this device and sent only to the provider you choose. In Smart mode your messages and a short summary of your schedule go to that provider.','बिना API key के मैं अपनी बिल्ट-इन समझ से काम {करता|करती} हूँ, जो आम अनुरोध सँभाल लेती है और जिसके लिए कोई खाता नहीं चाहिए। खुले-ढंग के अनुरोधों के लिए अपनी AI key चिपकाएँ। वह सिर्फ़ इसी डिवाइस पर रहती है और सिर्फ़ आपके चुने प्रदाता को भेजी जाती है। स्मार्ट मोड में आपके संदेश और आपकी समय-सारणी का छोटा सार उसी प्रदाता को जाता है।')}</p>
      <label class="field">${H('Provider','प्रदाता')}<select data-cfg="provider"><option value="">${H('Off (built-in)','बंद (बिल्ट-इन)')}</option>${Object.keys(AI_PROVIDERS).map(k=>`<option value="${k}"${prov===k?' selected':''}>${esc(LANG==='hi'&&k==='gemini'?'Google Gemini (मुफ़्त की)':AI_PROVIDERS[k].label)}</option>`).join('')}</select></label>
      ${prov?`<label class="field">${H('API key','API key')}<input type="password" data-cfg="key" value="${esc(ACFG.key)}" autocomplete="off" spellcheck="false" placeholder="${H('Paste your key','अपनी key चिपकाएँ')}"></label>
      <label class="field">${H('Model (optional)','मॉडल (वैकल्पिक)')}<input type="text" data-cfg="model" value="${esc(ACFG.model)}" placeholder="${esc(AI_PROVIDERS[prov].model)}" spellcheck="false"></label>
      <p class="small muted">${prov==='gemini'?H('Get a free key at aistudio.google.com/apikey.','aistudio.google.com/apikey पर मुफ़्त की पाएँ।'):H('Get a key at console.anthropic.com. Usage is billed to you.','console.anthropic.com पर की पाएँ। इस्तेमाल का ख़र्च आपके खाते से लगेगा।')}</p>
      <button type="button" class="btn ghost danger" data-asa="rmkey">${H('Remove my key','मेरी की हटाएँ')}</button>`:''}</div>
    <button type="button" class="btn ghost" data-asa="clear">${H('Clear this conversation','यह बातचीत साफ़ करें')}</button>`;
}
function cfgChange(t){
  const k=t.dataset.cfg;if(!k)return;
  let v=t.type==='checkbox'?t.checked:t.value;
  if(k==='rate')v=Math.min(1.4,Math.max(.7,+v||1));
  if(k==='key'||k==='model')v=String(v).trim();
  if(k==='lang'){ACFG.voiceName=''}
  if(k==='provider'){ACFG.model=''}
  ACFG[k]=v;saveAcfg();
  if(k==='provider'||k==='lang'||k==='speak'){const c=document.getElementById('as-cfg');if(c)c.innerHTML=cfgHtml()}
  const sub=document.getElementById('as-sub');if(sub)sub.textContent=modeLabel();
  if(k==='rate'){const l=t.closest('label');if(l&&l.firstChild)l.firstChild.textContent='Speed '+(+v).toFixed(1)+'× '}
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-asa]');if(!t||!asEl()||!asEl().contains(t))return;
  const a=t.dataset.asa;
  if(a==='close')closeAssistant();
  else if(a==='cfg'){voiceChat=false;stopListening();stopSpeaking();asstView='cfg';paintAssistant()}
  else if(a==='back'){asstView='chat';paintAssistant()}
  else if(a==='speak'){ACFG.speak=!ACFG.speak;saveAcfg();if(!ACFG.speak)stopSpeaking();t.setAttribute('aria-pressed',ACFG.speak);t.innerHTML=ic(ACFG.speak?'volume':'volume-off')}
  else if(a==='mic')toggleMic();
  else if(a==='chip')asstSend(t.dataset.v,false);
  else if(a==='gender'){ACFG.gender=t.dataset.v;ACFG.voiceName='';saveAcfg();const c=document.getElementById('as-cfg');if(c)c.innerHTML=cfgHtml();const sub=document.getElementById('as-sub');if(sub)sub.textContent=modeLabel();speak(H('Hello, I am '+asstName()+'. This is my voice.','नमस्ते, मैं '+asstName()+' हूँ। यह मेरी आवाज़ है।'))}
  else if(a==='testvoice')speak(H('Hello! I am '+asstName()+', your study assistant. This is how I sound.','नमस्ते! मैं '+asstName()+' हूँ, आपकी पढ़ाई की सहायक। मेरी आवाज़ ऐसी है।'));
  else if(a==='lang'){setLang(t.dataset.v);const sub=document.getElementById('as-sub');if(sub)sub.textContent=modeLabel()}
  else if(a==='rmkey'){ACFG.key='';ACFG.provider='';ACFG.model='';saveAcfg();const c=document.getElementById('as-cfg');if(c)c.innerHTML=cfgHtml();const sub=document.getElementById('as-sub');if(sub)sub.textContent=modeLabel();toast(H('Key removed','की हटा दी गई'))}
  else if(a==='clear'){CHAT=[];saveChat();PENDING=null;asstChips=true;asstView='chat';paintAssistant()}
});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.cfg&&asEl()&&asEl().contains(e.target))cfgChange(e.target)});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.cfg==='rate'&&asEl()&&asEl().contains(e.target)){const l=e.target.closest('label');if(l&&l.firstChild)l.firstChild.textContent='Speed '+(+e.target.value).toFixed(1)+'× '}});
document.addEventListener('submit',e=>{if(e.target.id==='as-form'){e.preventDefault();const b=document.getElementById('as-text');asstSend(b?b.value:'',false)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&asstOpen)closeAssistant()});
