/* ---------- language: English and Hindi ----------
   The screens are written in English. When Hindi is on, every piece of text that lands on the page is
   looked up in HI (exact text) or PAT (patterns with numbers or names in them) and swapped, and swapped
   back when English is chosen. Text I write in code for the assistant uses H(english, hindi) directly. */
let LANG=lsGet('pl.lang',null)||((navigator.language||'').toLowerCase().startsWith('hi')?'hi':'en');
if(LANG!=='hi')LANG='en';
const HG=s=>s.indexOf('{')<0?s:s.replace(/\{([^|}]*)\|([^}]*)\}/g,(m,a,b)=>(typeof ACFG!=='undefined'&&ACFG.gender==='male')?a:b);  // {masculine|feminine} forms follow the assistant's voice
const H=(en,hi)=>LANG==='hi'?HG(hi):en;
const LOC=()=>LANG==='hi'?'hi-IN':undefined;
const HI={};   // filled by i18n-hi.js
const PAT=[];  // [RegExp, template or function]
const SEPS=[' · ',' / ',', ',': '];
function periodHi(h24){return h24>=4&&h24<12?'सुबह':h24>=12&&h24<16?'दोपहर':h24>=16&&h24<20?'शाम':'रात'}
function units(c){
  return c.replace(/\b(\d{1,2}):(\d{2}) ?(AM|PM|am|pm)\b/g,(m,h,mi,ap)=>{let x=+h%12;if(/p/i.test(ap))x+=12;return periodHi(x)+' '+h+':'+mi})
          .replace(/\b(\d+)h\b/g,'$1 घं').replace(/\b(\d+)m\b/g,'$1 मि');
}
function trCore(core){
  if(Object.prototype.hasOwnProperty.call(HI,core))return HI[core];
  for(let i=0;i<PAT.length;i++){
    const m=core.match(PAT[i][0]);
    if(m){const f=PAT[i][1];return typeof f==='function'?f.apply(null,m.slice(1)):core.replace(PAT[i][0],f)}
  }
  for(const sep of SEPS){
    if(core.includes(sep)){
      const parts=core.split(sep),out=parts.map(trCore);
      if(out.some((o,i)=>o!==parts[i]))return out.join(sep);
    }
  }
  return units(core);
}
function tr(s){
  if(LANG!=='hi'||typeof s!=='string'||!/[A-Za-z]/.test(s))return s;
  const core=s.trim();if(!core)return s;
  const i=s.indexOf(core);
  return s.slice(0,i)+HG(trCore(core))+s.slice(i+core.length);
}
const L=s=>LANG==='hi'?tr(String(s)):s;            // translate a known English word or phrase when Hindi is on
const FD=m=>LANG==='hi'?units(fmtDur(m)):fmtDur(m);  // durations: 2h 30m / 2 घं 30 मि
const TR_ATTRS=['aria-label','placeholder','title','alt'];
const TR_ORIG=new WeakMap(),TR_AORIG=new WeakMap();
function trText(n){
  const v=n.data;let o=TR_ORIG.get(n);
  if(!o||o.shown!==v){o={en:v,shown:v};TR_ORIG.set(n,o)}
  const out=LANG==='hi'?tr(o.en):o.en;
  if(out!==v){o.shown=out;n.data=out}
}
function trAttrs(el){
  for(const a of TR_ATTRS){
    if(!el.hasAttribute(a))continue;
    const v=el.getAttribute(a);let m=TR_AORIG.get(el);if(!m){m={};TR_AORIG.set(el,m)}
    let o=m[a];if(!o||o.shown!==v){o={en:v,shown:v};m[a]=o}
    const out=LANG==='hi'?tr(o.en):o.en;
    if(out!==v){o.shown=out;el.setAttribute(a,out)}
  }
}
const trSkip=el=>el.nodeType===1&&(el.getAttribute('translate')==='no'||/^(SCRIPT|STYLE|TEXTAREA)$/.test(el.tagName));
function trTree(root){
  if(!root)return;
  if(root.nodeType===3){if(!(root.parentNode&&root.parentNode.closest&&root.parentNode.closest('[translate=no]')))trText(root);return}
  if(root.nodeType!==1||trSkip(root)||(root.closest&&root.closest('[translate=no]')&&root!==document.body))return;
  trAttrs(root);
  for(let c=root.firstChild;c;c=c.nextSibling){
    if(c.nodeType===3)trText(c);
    else if(c.nodeType===1&&!trSkip(c))trTree(c);
  }
}
let trObs=null;
function trStart(){
  if(trObs||!window.MutationObserver)return;
  trObs=new MutationObserver(list=>{
    for(const m of list){
      if(m.type==='characterData'){const p=m.target.parentNode;if(p&&p.closest&&!p.closest('[translate=no]'))trText(m.target)}
      else if(m.type==='attributes'){if(!m.target.closest('[translate=no]'))trAttrs(m.target)}
      else m.addedNodes.forEach(n=>{if(n.nodeType===3){const p=n.parentNode;if(p&&p.closest&&!p.closest('[translate=no]'))trText(n)}else trTree(n)});
    }
  });
  trObs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:TR_ATTRS});
}
function applyLangToPage(){
  document.documentElement.lang=LANG==='hi'?'hi':'en';
  trTree(document.body);
}
const langSeg=()=>`<div class="seg" translate="no" role="group" aria-label="Language / भाषा">${[['en','English'],['hi','हिन्दी']].map(([k,l])=>`<button type="button" data-act="lang" data-v="${k}" aria-pressed="${LANG===k}">${l}</button>`).join('')}</div>`;
function setLang(l){
  l=l==='hi'?'hi':'en';if(l===LANG)return;
  LANG=l;lsSet('pl.lang',LANG);
  ACFG.lang=LANG==='hi'?'hi-IN':'en-IN';ACFG.voiceName='';saveAcfg();
  stopSpeaking();
  applyLangToPage();
  try{render(false)}catch(e){}
  document.querySelectorAll('[data-act=lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===LANG)));
  if(typeof asstOpen!=='undefined'&&asstOpen)paintAssistant();
  const fab=document.getElementById('asstfab');if(fab)fab.setAttribute('aria-label','Open assistant');
  applyLangToPage();
}
