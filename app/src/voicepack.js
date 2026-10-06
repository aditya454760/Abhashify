/* ---------- offline voice packs: a trained Piper-style voice that runs inside the browser ----------
   A pack is two files made by training: voice.onnx and voice.onnx.json. They are stored on this device (IndexedDB)
   and run in a worker with ONNX Runtime Web and eSpeak NG, both served from this site, so nothing needs the internet. */
const CVPack=(()=>{
  let worker=null,seq=0,idle=null;const pend=new Map(),loaded=new Set();
  const LANGS=[['en','English'],['hi','हिन्दी']];
  const wk=()=>{
    if(worker)return worker;
    worker=new Worker(new URL('voice/runtime/worker.mjs',document.baseURI),{type:'module'});
    worker.onmessage=e=>{const m=e.data,p=pend.get(m.id);if(!p)return;pend.delete(m.id);m.error?p.rej(new Error(m.error)):p.res(m)};
    worker.onerror=e=>{pend.forEach(p=>p.rej(new Error(e.message||'worker error')));pend.clear();try{worker.terminate()}catch(x){}worker=null;loaded.clear()};
    return worker;
  };
  const call=(msg,transfer)=>new Promise((res,rej)=>{
    const id=++seq;pend.set(id,{res,rej});
    try{wk().postMessage(Object.assign({id},msg),transfer||[])}catch(e){pend.delete(id);rej(e)}
    clearTimeout(idle);idle=setTimeout(()=>{if(!pend.size&&worker){try{worker.terminate()}catch(e){}worker=null;loaded.clear()}},90000);
  });
  function pcmToWav(pcm,rate){
    let mx=.01;for(let i=0;i<pcm.length;i++){const a=Math.abs(pcm[i]);if(a>mx)mx=a}
    const k=32767/mx,n=pcm.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
    w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
    for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(pcm[i]*k))),true);
    return b;
  }
  async function ensure(g,lang,meta){
    const key=g+'|'+lang+'|'+meta.t;
    if(loaded.has(key))return key;
    const rec=await CVDB.get('packs',g+'|'+lang);
    if(!rec||!rec.model)throw new Error('missing');
    const copy=rec.model.slice(0);
    await call({type:'load',key,model:copy,config:rec.config},[copy]);
    loaded.add(key);return key;
  }
  async function synth(text,g,lang){
    const meta=cvPackMeta(g,lang);if(!meta)return null;
    try{
      const key=await ensure(g,lang,meta);
      const r=await call({type:'synth',key,text});
      if(!r.pcm||!r.pcm.length)return null;
      return {buf:pcmToWav(r.pcm,r.rate),mime:'audio/wav'};
    }catch(e){
      CV_STATUS=H('The offline voice could not run ('+(e.message||'error')+'), so I used the device voice.','ऑफ़लाइन आवाज़ चल नहीं सकी ('+(e.message||'error')+'), इसलिए मैंने डिवाइस की आवाज़ इस्तेमाल की।');
      cvRepaint();return null;
    }
  }
  const mb=n=>(n/1048576).toFixed(n>10485760?0:1)+' MB';
  async function add(g,lang,files){
    const say=m=>{CVUI.busy='';CVUI.msg=m;cvRepaint()};
    if(!CVUI.packOk)return say(H('Please tick the box that says you may use this voice.','पहले वह बॉक्स चुनें जो कहता है कि आप इस आवाज़ का इस्तेमाल कर सकते हैं।'));
    const onnx=files.find(f=>/\.onnx$/i.test(f.name)),js=files.find(f=>/\.json$/i.test(f.name));
    if(!onnx||!js)return say(H('Choose both files: the .onnx file and the .onnx.json file.','दोनों फ़ाइलें चुनें: .onnx और .onnx.json।'));
    if(onnx.size>250*1048576)return say(H('That model is over 250 MB. Use a "medium" or "low" quality voice.','वह मॉडल 250 MB से बड़ा है। "medium" या "low" क्वालिटी की आवाज़ लें।'));
    let cfg;try{cfg=JSON.parse(await js.text())}catch(e){return say(H('The .json file is not valid.','.json फ़ाइल सही नहीं है।'))}
    if(!cfg||!cfg.phoneme_id_map||!cfg.audio||!cfg.audio.sample_rate)return say(H('That does not look like a Piper voice config.','यह Piper आवाज़ का कॉन्फ़िग नहीं लगता।'));
    if(cfg.phoneme_type&&cfg.phoneme_type!=='espeak')return say(H('Only voices that use eSpeak phonemes are supported.','सिर्फ़ वही आवाज़ें चलती हैं जो eSpeak फ़ोनीम इस्तेमाल करती हैं।'));
    CVUI.busy=H('Checking the voice…','आवाज़ जाँची जा रही है…');CVUI.msg='';cvRepaint();
    const model=await onnx.arrayBuffer(),t=Date.now(),key=g+'|'+lang+'|'+t,copy=model.slice(0);
    try{await call({type:'load',key,model:copy,config:cfg},[copy]);loaded.add(key);
      const probe=await call({type:'synth',key,text:lang==='hi'?'नमस्ते':'hello'});
      if(!probe.pcm||!probe.pcm.length)throw new Error('no audio');
    }catch(e){return say(H('That voice could not be loaded ('+(e.message||'error')+').','वह आवाज़ लोड नहीं हो सकी ('+(e.message||'error')+')।'))}
    await CVDB.put('packs',g+'|'+lang,{model,config:cfg,name:CVUI.label||onnx.name.replace(/\.onnx$/i,''),t});
    const c=cvCfg(g),pack=Object.assign({},c.pack||{});
    pack[lang]={name:(CVUI.label||onnx.name.replace(/\.onnx$/i,'')).trim(),size:onnx.size,sr:cfg.audio.sample_rate,voice:(cfg.espeak&&cfg.espeak.voice)||'',t};
    cvSave(g,{pack,packOn:true});CVUI.packOk=false;
    say(H('Offline voice added. It works without internet.','ऑफ़लाइन आवाज़ जुड़ गई। यह बिना इंटरनेट चलती है।'));
  }
  async function remove(g,lang){
    await CVDB.del('packs',g+'|'+lang);
    const c=cvCfg(g),pack=Object.assign({},c.pack||{});const m=pack[lang];delete pack[lang];
    if(m){try{await call({type:'drop',key:g+'|'+lang+'|'+m.t});loaded.delete(g+'|'+lang+'|'+m.t)}catch(e){}}
    cvSave(g,{pack});CVUI.msg=H('Offline voice removed from this device.','ऑफ़लाइन आवाज़ इस डिवाइस से हटा दी गई।');cvRepaint();
  }
  function html(g){
    const c=cvCfg(g),who=g==='male'?H('Adi','आदि'):H('Anu','अनु');
    const dis=CVUI.busy?' disabled':'';
    return `<div class="stack" style="gap:8px;margin-top:8px"><span class="kick">${H('Offline voice pack for '+who,'ऑफ़लाइन वॉइस पैक: '+who)}</span>
      <p class="small muted">${H('A voice trained for '+who+' that runs on this device with no internet. Add one per language. You need two files for each: voice.onnx and voice.onnx.json (see the voice kit in the project).','एक प्रशिक्षित आवाज़ जो इस डिवाइस पर बिना इंटरनेट चलती है। हर भाषा के लिए एक जोड़ें। हर एक के लिए दो फ़ाइलें चाहिए: voice.onnx और voice.onnx.json (प्रोजेक्ट का वॉइस किट देखें)।')}</p>
      <label class="switch"><span>${H('I may use this voice (it is mine, its owner agreed, or its licence allows it)','मैं इस आवाज़ का इस्तेमाल कर सकता/सकती हूँ (यह मेरी है, मालिक ने हामी भरी है, या लाइसेंस इजाज़त देता है)')}</span><input type="checkbox" data-cv="packok"${CVUI.packOk?' checked':''}></label>
      ${LANGS.map(([l,nm])=>{const m=c.pack&&c.pack[l];return m
        ?`<div class="small"><b translate="no">${nm}</b> · <span translate="no">${esc(m.name)}</span> · ${mb(m.size)} <button type="button" class="btn ghost danger" data-cv-act="packrm" data-lang="${l}"${dis}>${H('Remove','हटाएँ')}</button></div>`
        :`<label class="field"><span translate="no">${nm}</span><input type="file" id="cvp-${l}" accept=".onnx,.json,application/json" multiple></label><button type="button" class="btn ghost" data-cv-act="packadd" data-lang="${l}"${dis}>${H('Add the '+(l==='hi'?'Hindi':'English')+' voice',(l==='hi'?'हिन्दी':'अंग्रेज़ी')+' आवाज़ जोड़ें')}</button>`}).join('')}
      ${c.pack&&Object.keys(c.pack).length?`<label class="switch"><span>${H('Use the offline voice when the cloned voice is not available','क्लोन आवाज़ न मिलने पर ऑफ़लाइन आवाज़ इस्तेमाल करें')}</span><input type="checkbox" data-cv="packon"${c.packOn!==false?' checked':''}></label>`:''}</div>`;
  }
  return {synth,html,add,remove,has:(g,l)=>!!cvPackMeta(g,l),pcmToWav};
})();
window.CVPack=CVPack;
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-cv-act]');if(!t||!asEl()||!asEl().contains(t))return;
  const a=t.dataset.cvAct,l=t.dataset.lang;
  if(a==='packadd'){const f=document.getElementById('cvp-'+l);CVPack.add(ACFG.gender,l,f?[...f.files]:[])}
  else if(a==='packrm')CVPack.remove(ACFG.gender,l);
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t||!t.dataset||!asEl()||!asEl().contains(t))return;
  if(t.dataset.cv==='packok')CVUI.packOk=t.checked;
  else if(t.dataset.cv==='packon')cvSave(ACFG.gender,{packOn:t.checked});
});
