/* ---------- look: accent colour and background, on top of light/dark ---------- */
const ACCENTS={indigo:'#4349C9',blue:'#1D6FD8',teal:'#0F8B8D',green:'#1F8A57',lime:'#5B8A12',yellow:'#B8860B',gold:'#B8860B',orange:'#D9631A',red:'#C23B35',pink:'#C93C7C',magenta:'#B5389E',purple:'#7A3FC4',violet:'#6A45D1',brown:'#8A5A3C',grey:'#58677A',gray:'#58677A',slate:'#4A5B6A',cyan:'#0E87A8',navy:'#26407A',maroon:'#8E2B3A'};
// Each background has a light and a dark version. tone 'dark' means it only makes sense in dark mode.
const BGS={
  default:{label:'Default',l:{bg:'#F2F4F3'},d:{bg:'#0E1217'}},
  paper:{label:'Paper',l:{bg:'#F7F1E5'},d:{bg:'#17140F'}},
  mint:{label:'Mint',l:{bg:'#E9F4EE'},d:{bg:'#0C1511'}},
  sky:{label:'Sky',l:{bg:'#E8F1FB'},d:{bg:'#0B131C'}},
  blush:{label:'Blush',l:{bg:'#FBEDEE'},d:{bg:'#1A1113'}},
  lavender:{label:'Lavender',l:{bg:'#EFEBFA'},d:{bg:'#13101E'}},
  slate:{label:'Slate',l:{bg:'#E4E8EC'},d:{bg:'#0A0D11'}},
  sunrise:{label:'Sunrise',l:{bg:'#FBEFE4',img:'linear-gradient(170deg,#FFE9D6 0%,#FBEFE4 38%,#F3EEF8 100%)'},d:{bg:'#18110F',img:'linear-gradient(170deg,#2A1A12 0%,#18110F 45%,#14111C 100%)'}},
  aurora:{label:'Aurora',l:{bg:'#E8F3F1',img:'linear-gradient(165deg,#D8F1EA 0%,#E8F3F1 40%,#E6E8FA 100%)'},d:{bg:'#0B1416',img:'linear-gradient(165deg,#0D2420 0%,#0B1416 45%,#15122B 100%)'}},
  midnight:{label:'Midnight',tone:'dark',d:{bg:'#0A1020',img:'linear-gradient(180deg,#0F1A36 0%,#0A1020 60%)'}},
  black:{label:'Black',tone:'dark',d:{bg:'#000000'}}
};
let LOOK=Object.assign({accent:null,bg:null},lsGet('pl.look',{}));
const isDarkNow=()=>theme==='dark'||(theme==='auto'&&!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches));
const hexOk=h=>typeof h==='string'&&/^#[0-9a-f]{6}$/i.test(h);
function h2rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16))}
function rgb2hsl([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}
  return [h,s*100,l*100]}
const lumOf=hex=>{const [r,g,b]=h2rgb(hex).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
function parseColour(s){
  s=String(s||'').trim().toLowerCase();
  if(ACCENTS[s])return ACCENTS[s];
  let m=s.match(/^#?([0-9a-f]{6})$/);if(m)return '#'+m[1];
  m=s.match(/^#?([0-9a-f]{3})$/);if(m)return '#'+m[1].split('').map(c=>c+c).join('');
  return null;
}
function applyLook(){
  const st=document.documentElement.style,dark=isDarkNow();
  const vars=['--accent','--accent-soft','--accent-ink','--bg','--bgimg'];
  vars.forEach(v=>st.removeProperty(v));
  if(LOOK.accent&&hexOk(LOOK.accent)){
    const [h,s0,l0]=rgb2hsl(h2rgb(LOOK.accent)),s=Math.min(s0,88);
    // keep the colour readable: darker on light screens, lighter on dark ones
    const l=dark?Math.max(l0,66):Math.min(l0,42);
    st.setProperty('--accent',`hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`);
    st.setProperty('--accent-soft',dark?`hsl(${h.toFixed(0)} 38% 20%)`:`hsl(${h.toFixed(0)} 70% 94%)`);
    st.setProperty('--accent-ink',dark?'#0E1217':'#FFFFFF');
  }
  const bg=resolveBg(LOOK.bg,dark);
  if(bg){st.setProperty('--bg',bg.bg);if(bg.img)st.setProperty('--bgimg',bg.img)}
  const meta=document.querySelector('meta[name=theme-color]');
  if(meta)meta.setAttribute('content',bg?bg.bg:(LOOK.accent&&hexOk(LOOK.accent)?LOOK.accent:'#4349C9'));
}
function resolveBg(key,dark){
  if(!key)return null;
  if(BGS[key]){const b=BGS[key];return dark?(b.d||null):(b.l||b.d||null)}
  if(hexOk(key))return {bg:key};
  return null;
}
// Returns a note when the theme had to change so the text stays readable.
function setLook(p){
  let note='';
  if('accent' in p){const c=p.accent?parseColour(p.accent):null;if(p.accent&&!c)return {err:'I do not know the colour "'+p.accent+'". Try a name like green or orange, or a hex code like #1D6FD8.'};LOOK.accent=c}
  if('bg' in p){
    let k=p.bg;
    if(k&&!BGS[k]){const c=parseColour(k);if(!c)return {err:'I do not know the background "'+k+'". Pick one of: '+Object.keys(BGS).join(', ')+', or give a hex code.'};k=c}
    LOOK.bg=k||null;
    let wantDark=null;
    if(k&&BGS[k]&&BGS[k].tone==='dark')wantDark=true;
    else if(k&&hexOk(k)){wantDark=lumOf(k)<.3}
    if(wantDark!==null&&wantDark!==isDarkNow()){
      theme=wantDark?'dark':'light';lsSet('pl.theme',theme);
      note=wantDark?' I switched to dark mode so the text stays readable on it.':' I switched to light mode so the text stays readable on it.';
    }
  }
  lsSet('pl.look',LOOK);applyTheme();
  return {note};
}
function resetLook(){LOOK={accent:null,bg:null};lsSet('pl.look',LOOK);applyLook()}
if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyLook())}catch(e){}

/* swatches in Settings */
const PICK_ACC=['indigo','blue','teal','green','orange','red','pink','purple'];
function lookPickers(){
  const acc=PICK_ACC.map(k=>`<button type="button" class="sw" style="background:${ACCENTS[k]}" data-act="lookacc" data-v="${k}" aria-label="${k} accent" aria-pressed="${LOOK.accent===ACCENTS[k]}"></button>`).join('')+`<button type="button" class="btn sm ghost" data-act="lookacc" data-v="">Default</button>`;
  const dk=isDarkNow();
  const bgs=Object.keys(BGS).filter(k=>k!=='default').map(k=>{const r=resolveBg(k,dk)||resolveBg(k,!dk);return `<button type="button" class="sw bgsw" style="background:${r.img||r.bg}" data-act="lookbg" data-v="${k}" aria-label="${BGS[k].label} background" aria-pressed="${LOOK.bg===k}"></button>`}).join('')+`<button type="button" class="btn sm ghost" data-act="lookbg" data-v="">Default</button>`;
  return `<div class="stack" id="lookpick" style="gap:8px"><span class="kick">Accent colour</span><div class="sw-row">${acc}</div><span class="kick" style="margin-top:6px">Background</span><div class="sw-row">${bgs}</div></div>`;
}
function paintLookPickers(){const e=document.getElementById('lookpick');if(e)e.outerHTML=lookPickers()}
