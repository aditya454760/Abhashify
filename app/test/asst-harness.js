const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../../docs/index.html', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
exports.sleep = sleep;
exports.open = async function (opts) {
  opts = opts || {};
  const errs = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message)); vc.on('error', e => errs.push('console.error ' + e));
  const store = opts.store || {};
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} }); w.scrollTo = () => {};
      Object.keys(store).forEach(k => w.localStorage.setItem(k, store[k]));
      if (opts.before) opts.before(w);
    } });
  dom.window.__fbResolve(null);
  await sleep(150);
  const w = dom.window, d = w.document;
  const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })) };
  return { w, d, errs, ev: c => w.eval(c), click, say: t => w.eval('brain(' + JSON.stringify(t) + ')') };
};
