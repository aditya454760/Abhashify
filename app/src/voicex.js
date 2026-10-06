/* ---------- custom voices: a cloned voice (online) and a trained voice pack (offline) ----------
   Order when the assistant speaks: a saved clip of the cloned voice -> the cloned voice (online) -> the offline voice pack
   -> the device's own voice. Each sentence is tried on its own, so a failure never silences the assistant. */
const CV_API='https://api.elevenlabs.io/v1';
ACFG.cv=ACFG.cv||{};if(typeof ACFG.elKey!=='string')ACFG.elKey='';if(!ACFG.elModel)ACFG.elModel='eleven_multilingual_v2';
let CV_AUDIO=null,CV_STATUS='',CV_TOLD=false;
const CVUI={consent:false,label:'',busy:'',msg:''};
const cvCfg=g=>(ACFG.cv&&ACFG.cv[g||ACFG.gender])||{};
const cvSave=(g,p)=>{ACFG.cv=ACFG.cv||{};ACFG.cv[g]=Object.assign({},ACFG.cv[g]||{},p);saveAcfg()};
const cvPackMeta=(g,l)=>{const c=cvCfg(g);return c.pack&&c.pack[l||LANG]||null};
const cvUsable=g=>{const c=cvCfg(g);return (c.on!==false&&!!c.voiceId)||(c.packOn!==false&&!!cvPackMeta(g))};

/* small storage for saved clips and voice packs (IndexedDB, with a memory fallback when it is blocked) */
const CVDB=(()=>{
  const mem={clips:new Map(),packs:new Map()};let dbp=null,idx=null,puts=0;
  const open=()=>dbp||(dbp=new Promise(res=>{try{const q=indexedDB.open('abhyashify-voice',1);q.onupgradeneeded=()=>{const d=q.result;d.createObjectStore('clips');d.createObjectStore('packs')};q.onsuccess=()=>res(q.result);q.onerror=()=>res(null);q.onblocked=()=>res(null)}catch(e){res(null)}}));
  const req=(store,mode,f)=>open().then(d=>d?new Promise(res=>{try{const t=d.transaction(store,mode);const r=f(t.objectStore(store));t.oncomplete=()=>res(r?r.result:undefined);t.onerror=()=>res(undefined);t.onabort=()=>res(undefined)}catch(e){res(undefined)}}):null);
  const api={
    async get(s,k){const r=await req(s,'readonly',o=>o.get(k));return r===null?mem[s].get(k):r},
    async put(s,k,v){const r=await req(s,'readwrite',o=>o.put(v,k));if(r===null)mem[s].set(k,v)},
    async del(s,k){const r=await req(s,'readwrite',o=>o.delete(k));if(r===null)mem[s].delete(k)},
    async keys(s){const r=await req(s,'readonly',o=>o.getAllKeys());return r===null?[...mem[s].keys()]:(r||[])},
    async clear(s){const r=await req(s,'readwrite',o=>o.clear());if(r===null)mem[s].clear()},
    async stamp(key){ // remember when a clip was last used, and drop the oldest ones past 400
      if(!idx)idx=(await api.get('packs','\u0000clip-index'))||{};
      idx[key]=Date.now();
      if(++puts%10===0||Object.keys(idx).length>400){
        const ks=Object.keys(idx);
        if(ks.length>400){ks.sort((a,b)=>idx[a]-idx[b]).slice(0,ks.length-360).forEach(k=>{delete idx[k];api.del('clips',k)})}
        api.put('packs','\u0000clip-index',idx);
      }
    }
  };
  return api;
})();

/* ---- why the cloned voice could not be used, in plain words ---- */
function cvFail(e){
  const s=e&&e.status;
  CV_STATUS=s==='nokey'?H('No ElevenLabs key is saved.','ElevenLabs की key सेव नहीं है।')
    :s==='offline'||(e&&e.name==='TypeError')?H('No internet, so I used a saved or device voice.','इंटरनेट नहीं है, इसलिए मैंने सेव की हुई या डिवाइस की आवाज़ इस्तेमाल की।')
    :s===401?H('ElevenLabs rejected the key.','ElevenLabs ने key स्वीकार नहीं की।')
    :s===402||s===429||s===403?H('The ElevenLabs quota or plan does not allow this right now.','ElevenLabs का कोटा या प्लान अभी इसकी अनुमति नहीं देता।')
    :s===404?H('That cloned voice no longer exists on ElevenLabs.','वह क्लोन की हुई आवाज़ अब ElevenLabs पर नहीं है।')
    :H('The cloned voice did not respond ('+(s||'error')+').','क्लोन की हुई आवाज़ ने जवाब नहीं दिया ('+(s||'error')+')।');
  if(!CV_TOLD){CV_TOLD=true;try{toast(CV_STATUS)}catch(x){}}
  cvRepaint();
}
function cvRepaint(){const c=document.getElementById('as-cfg');if(c&&typeof cfgHtml==='function'){const keep=document.activeElement&&document.activeElement.id;c.innerHTML=cfgHtml();if(keep){const el=document.getElementById(keep);if(el)try{el.focus()}catch(e){}}}}

/* ---- ElevenLabs ---- */
async function cvFetchEl(text,c){
  const r=await fetch(CV_API+'/text-to-speech/'+encodeURIComponent(c.voiceId)+'?output_format=mp3_44100_64',{method:'POST',headers:{'xi-api-key':ACFG.elKey,'Content-Type':'application/json',Accept:'audio/mpeg'},
    body:JSON.stringify({text,model_id:ACFG.elModel||'eleven_multilingual_v2',voice_settings:{stability:.5,similarity_boost:.8}})});
  if(!r.ok){const e=new Error('http '+r.status);e.status=r.status;throw e}
  return {buf:await r.arrayBuffer(),mime:'audio/mpeg'};
}
async function cvClip(text,c,g){
  const key=[g,c.voiceId||'',ACFG.elModel||'',text].join('|');
  if(c.voiceId){
    const hit=await CVDB.get('clips',key);
    if(hit&&hit.buf){CVDB.stamp(key);return hit}
    if(!ACFG.elKey){cvFail({status:'nokey'});return null}
    if(navigator.onLine===false){cvFail({status:'offline'});return null}
    try{const o=await cvFetchEl(text,c);o.t=Date.now();await CVDB.put('clips',key,o);CVDB.stamp(key);CV_STATUS='';return o}
    catch(e){cvFail(e)}
  }
  return null;
}

/* ---- playing audio ---- */
const cvPlayReal=(buf,mime,rate)=>new Promise(res=>{
  try{
    const url=URL.createObjectURL(new Blob([buf],{type:mime||'audio/mpeg'})),a=new Audio(url);CV_AUDIO=a;a.playbackRate=rate||1;
    const end=()=>{try{URL.revokeObjectURL(url)}catch(e){}if(CV_AUDIO===a)CV_AUDIO=null;res()};a._end=end;a.onended=end;a.onerror=end;
    const p=a.play();if(p&&p.catch)p.catch(end);
  }catch(e){res()}
});
const cvPlay=(buf,mime,rate)=>(window.CV_PLAY||cvPlayReal)(buf,mime,rate);
function cvStopAudio(){try{if(CV_AUDIO){const a=CV_AUDIO;CV_AUDIO=null;a.pause();a._end&&a._end()}}catch(e){}}

function speakDeviceOne(p){
  return new Promise(res=>{
    if(!SYN_||!window.SpeechSynthesisUtterance){res();return}
    const pv=pickVoice(),u=new SpeechSynthesisUtterance(String(p).trim());
    if(pv.v){u.voice=pv.v;u.lang=pv.v.lang}else u.lang=ACFG.lang;
    u.rate=Math.min(1.6,Math.max(.6,+ACFG.rate||1));u.pitch=pv.pitch;u.onend=u.onerror=()=>res();
    try{SYN_.speak(u)}catch(e){res()}
  });
}
async function speakCustom(parts,gen,done,c,g){
  parts=parts.map(p=>p.trim()).filter(Boolean);
  const jobs=[],job=i=>i<parts.length?(jobs[i]||(jobs[i]=cvClip(parts[i],c,g))):null;
  speakingNow=true;paintMic();
  for(let i=0;i<parts.length;i++){
    let o=null;
    if(c.voiceId&&c.on!==false){job(i);job(i+1);o=await job(i);if(gen!==speakGen)return}
    if(!o&&window.CVPack&&cvCfg(g).packOn!==false&&cvPackMeta(g)){try{o=await window.CVPack.synth(parts[i],g,LANG)}catch(e){o=null}if(gen!==speakGen)return}
    if(o)await cvPlay(o.buf,o.mime,+ACFG.rate||1);else await speakDeviceOne(parts[i]);
    if(gen!==speakGen)return;
  }
  speakingNow=false;paintMic();done&&done();
}

/* ---- making and removing a cloned voice ---- */
async function cvCreate(files){
  const g=ACFG.gender;
  const say=m=>{CVUI.busy='';CVUI.msg=m;cvRepaint()};
  if(!CVUI.consent)return say(H('Please confirm that the person agreed to this first.','पहले पुष्टि करें कि उस व्यक्ति ने इसके लिए हामी भरी है।'));
  if(!ACFG.elKey)return say(H('Paste your ElevenLabs key first.','पहले अपनी ElevenLabs key चिपकाएँ।'));
  if(!files.length)return say(H('Choose one or more recordings of that person speaking.','उस व्यक्ति की बोलती हुई एक या ज़्यादा रिकॉर्डिंग चुनें।'));
  if(files.length>5||files.some(f=>f.size>10*1048576))return say(H('Use up to 5 recordings, each under 10 MB.','ज़्यादा से ज़्यादा 5 रिकॉर्डिंग लें, हर एक 10 MB से छोटी।'));
  CVUI.busy=H('Creating the voice…','आवाज़ बन रही है…');CVUI.msg='';cvRepaint();
  const fd=new FormData();fd.append('name','Abhyashify '+(CVUI.label||asstName()));fd.append('description','Voice for the Abhyashify study assistant, used with the speaker\'s permission.');files.forEach(f=>fd.append('files',f,f.name||'voice.wav'));
  try{
    const r=await fetch(CV_API+'/voices/add',{method:'POST',headers:{'xi-api-key':ACFG.elKey},body:fd});
    if(!r.ok){
      const s=r.status;
      return say(s===401?H('ElevenLabs rejected the key.','ElevenLabs ने key स्वीकार नहीं की।'):s===402||s===403?H('Cloning a voice needs a paid ElevenLabs plan, or your plan has no voice slots left.','आवाज़ क्लोन करने के लिए ElevenLabs का पेड प्लान चाहिए, या आपके प्लान में आवाज़ की जगह नहीं बची।'):s===422?H('ElevenLabs could not use those recordings. Try clear speech without background noise.','ElevenLabs उन रिकॉर्डिंग का इस्तेमाल नहीं कर सका। बिना शोर की साफ़ आवाज़ आज़माएँ।'):H('ElevenLabs returned an error ('+s+').','ElevenLabs से गड़बड़ी आई ('+s+')।'));
    }
    const j=await r.json();
    if(!j||!j.voice_id)return say(H('ElevenLabs did not return a voice.','ElevenLabs ने कोई आवाज़ नहीं लौटाई।'));
    cvSave(g,{voiceId:j.voice_id,label:CVUI.label.trim(),consentAt:Date.now(),on:true});
    CVUI.consent=false;CVUI.label='';CV_STATUS='';CV_TOLD=false;
    say(H('Voice created. Tap "Test the voice" to hear it.','आवाज़ बन गई। सुनने के लिए "आवाज़ सुनकर देखें" दबाएँ।'));
  }catch(e){say(H('Could not reach ElevenLabs. Check your internet.','ElevenLabs तक नहीं पहुँच सका। इंटरनेट जाँचें।'))}
}
async function cvRemove(){
  const g=ACFG.gender,c=cvCfg(g);let warn='';
  if(c.voiceId&&ACFG.elKey){try{const r=await fetch(CV_API+'/voices/'+encodeURIComponent(c.voiceId),{method:'DELETE',headers:{'xi-api-key':ACFG.elKey}});if(!r.ok&&r.status!==404)warn=H(' It could not be deleted on ElevenLabs, so remove it there yourself.',' ElevenLabs से हटाया नहीं जा सका, इसे वहाँ ख़ुद हटा दें।')}catch(e){warn=H(' It could not be deleted on ElevenLabs (no connection), so remove it there yourself.',' ElevenLabs से हटाया नहीं जा सका (कनेक्शन नहीं), इसे वहाँ ख़ुद हटा दें।')}}
  else if(c.voiceId)warn=H(' Remove it on elevenlabs.io too.',' elevenlabs.io से भी हटा दें।');
  const keys=await CVDB.keys('clips');for(const k of keys)if(String(k).startsWith(g+'|'+(c.voiceId||'\u0001')+'|'))await CVDB.del('clips',k);
  cvSave(g,{voiceId:'',label:'',consentAt:0});CV_STATUS='';
  CVUI.msg=H('Cloned voice removed from this device.','क्लोन की हुई आवाज़ इस डिवाइस से हटा दी गई।')+warn;cvRepaint();
}

/* ---- common phrases saved on the device, so they still sound right offline ---- */
const cvPhrases=()=>[
  H('Hello! I am '+asstName()+', your study assistant. This is how I sound.','नमस्ते! मैं '+asstName()+' हूँ, आपकी पढ़ाई की सहायक। मेरी आवाज़ ऐसी है।'),
  H('Okay.','ठीक है।'),H('Done.','हो गया।'),H('Undone. I put it back the way it was.','वापस कर दिया। सब पहले जैसा है।'),
  H('Your timer has started.','आपका टाइमर शुरू हो गया।'),H('Timer stopped.','टाइमर रुक गया।'),
  H('Time is up. Take a short break.','समय पूरा हुआ। थोड़ा आराम कर लें।'),H('Time to start studying.','पढ़ाई शुरू करने का समय हो गया।'),
  H('Your alarm is ringing.','आपका अलार्म बज रहा है।'),H('Your reminder.','आपका रिमाइंडर।'),
  H('You are welcome.','आपका स्वागत है।'),H('Good morning.','सुप्रभात।'),H('Good evening.','शुभ संध्या।'),
  H('I did not understand that.','मैं यह समझ नहीं {पाया|पाई}।'),H('What time should I set it for?','किस समय के लिए लगाऊँ?'),
  H('You have no reminders or alarms set.','आपका कोई रिमाइंडर या अलार्म सेट नहीं है।'),H('You have no tests scheduled.','आपका कोई टेस्ट तय नहीं है।'),
  H('Great work today. Keep it up.','आज बहुत अच्छा काम किया। ऐसे ही लगे रहिए।')
].map(s=>HG(s));
async function cvWarm(){
  const g=ACFG.gender,c=cvCfg(g);if(!c.voiceId)return;
  if(!ACFG.elKey)return cvFail({status:'nokey'});
  if(navigator.onLine===false)return cvFail({status:'offline'});
  const list=cvPhrases();let n=0;
  for(let i=0;i<list.length;i++){
    CVUI.busy=H('Saving phrases… ','वाक्य सेव हो रहे हैं… ')+(i+1)+'/'+list.length;cvRepaint();
    const o=await cvClip(speechText(list[i]),c,g);if(o)n++;else break;
  }
  CVUI.busy='';CVUI.msg=H(n+' phrases are saved on this device and will play offline.',n+' वाक्य इस डिवाइस पर सेव हैं और बिना इंटरनेट के चलेंगे।');cvRepaint();
}

/* ---- the settings block ---- */
function cvHtml(){
  const g=ACFG.gender,c=cvCfg(g),nm=asstName(),who=g==='male'?H('Adi','आदि'):H('Anu','अनु');
  const packs=window.CVPack&&window.CVPack.html?window.CVPack.html(g):'';
  const status=CV_STATUS?`<p class="small" style="color:var(--bad,#b3261e)" role="status">${esc(CV_STATUS)}</p>`:'';
  const msg=CVUI.msg?`<p class="small" role="status">${esc(CVUI.msg)}</p>`:'';
  const busy=CVUI.busy?`<p class="small muted" role="status">${esc(CVUI.busy)}</p>`:'';
  const dis=CVUI.busy?' disabled':'';
  return `<div class="stack" style="gap:8px;margin-top:6px"><span class="kick">${H('Custom voice for '+who+' (optional)','कस्टम आवाज़: '+who+' (वैकल्पिक)')}</span>
    <p class="small muted">${H('Give '+who+' the voice of someone you know. Only do this with that person\'s clear permission. Online, it uses a cloned voice from ElevenLabs. The sentences it speaks are saved on this device so they also play offline. For fully offline use, add a trained voice pack below.','जिसे आप जानते हैं, उसकी आवाज़ '+who+' को दें। यह सिर्फ़ उस व्यक्ति की साफ़ अनुमति से करें। इंटरनेट पर यह ElevenLabs की क्लोन आवाज़ इस्तेमाल करता है। जो वाक्य बोले जाते हैं वे इस डिवाइस पर सेव होते हैं ताकि बिना इंटरनेट भी चलें। पूरी तरह ऑफ़लाइन के लिए नीचे प्रशिक्षित वॉइस पैक जोड़ें।')}</p>
    <label class="field">${H('ElevenLabs key','ElevenLabs key')}<input type="password" id="cv-key" data-cvkey value="${esc(ACFG.elKey)}" autocomplete="off" spellcheck="false" placeholder="${H('Paste your key','अपनी key चिपकाएँ')}"></label>
    ${c.voiceId?`<p class="small"><b translate="no">${esc(c.label||nm)}</b> · ${H('cloned voice is ready','क्लोन आवाज़ तैयार है')}${c.consentAt?' · '+H('permission confirmed','अनुमति की पुष्टि हुई')+' '+esc(new Date(c.consentAt).toLocaleDateString(LOC())):''}</p>
      <label class="switch"><span>${H('Use it for '+who,who+' के लिए इस्तेमाल करें')}</span><input type="checkbox" data-cv="on"${c.on!==false?' checked':''}></label>
      <button type="button" class="btn ghost" data-cv-act="warm"${dis}>${H('Save common phrases for offline','आम वाक्य ऑफ़लाइन के लिए सेव करें')}</button>
      <button type="button" class="btn ghost danger" data-cv-act="remove"${dis}>${H('Remove this cloned voice','यह क्लोन आवाज़ हटाएँ')}</button>`
    :`<label class="switch"><span>${H('The person agreed to their voice being used for this','उस व्यक्ति ने इसके लिए अपनी आवाज़ के इस्तेमाल की हामी भरी है')}</span><input type="checkbox" data-cv="consent"${CVUI.consent?' checked':''}></label>
      <label class="field">${H('Whose voice is it?','यह किसकी आवाज़ है?')}<input type="text" data-cv="label" value="${esc(CVUI.label)}" maxlength="40" placeholder="${H('Name of the person','व्यक्ति का नाम')}"></label>
      <label class="field">${H('Recordings (1 to 5 files, 1 to 3 minutes of clear speech in total)','रिकॉर्डिंग (1 से 5 फ़ाइल, कुल 1 से 3 मिनट की साफ़ आवाज़)')}<input type="file" id="cv-files" accept="audio/*" multiple></label>
      <p class="small muted">${H('The recordings are sent to ElevenLabs to make the voice and are not kept in this app. Cloning needs a paid ElevenLabs plan.','रिकॉर्डिंग आवाज़ बनाने के लिए ElevenLabs को भेजी जाती हैं और इस ऐप में नहीं रखी जातीं। क्लोनिंग के लिए ElevenLabs का पेड प्लान चाहिए।')}</p>
      <button type="button" class="btn ghost" data-cv-act="create"${dis}>${H('Create the voice','आवाज़ बनाएँ')}</button>`}
    ${busy}${msg}${status}${packs}</div>`;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-cv-act]');if(!t||!asEl()||!asEl().contains(t))return;
  const a=t.dataset.cvAct;
  if(a==='create'){const f=document.getElementById('cv-files');cvCreate(f?[...f.files]:[])}
  else if(a==='remove')cvRemove();
  else if(a==='warm')cvWarm();
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t||!asEl()||!asEl().contains(t))return;
  if(t.dataset&&t.dataset.cvkey!==undefined){ACFG.elKey=String(t.value).trim();saveAcfg();CV_TOLD=false;CV_STATUS=''}
  else if(t.dataset&&t.dataset.cv==='on'){cvSave(ACFG.gender,{on:t.checked})}
  else if(t.dataset&&t.dataset.cv==='consent'){CVUI.consent=t.checked}
  else if(t.dataset&&t.dataset.cv==='label'){CVUI.label=t.value}
});
document.addEventListener('input',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.cv==='label'&&asEl()&&asEl().contains(t))CVUI.label=t.value});
