/* Offline voice pack worker: text -> phonemes (eSpeak NG) -> ids -> Piper-style VITS model (ONNX Runtime Web, WASM) -> audio.
   Runs off the main thread so the page stays responsive while a sentence is being made. */
import * as ort from './ort.wasm.bundle.min.mjs';
import ESpeakNg from './espeak-ng.js';

ort.env.wasm.numThreads = 1;            // GitHub Pages cannot send the headers that multi-threading needs
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = new URL('./', import.meta.url).href;

let espeakModule = null;
const sessions = new Map();             // pack key -> { session, cfg, inputs }

async function espeakCompiled() {
  if (!espeakModule) {
    const r = await fetch(new URL('./espeak-ng.wasm', import.meta.url));
    espeakModule = await WebAssembly.compile(await r.arrayBuffer());
  }
  return espeakModule;
}
/* eSpeak instance per call (the build cannot be called twice), but the compiled module is reused, so this is quick. */
async function espeak(text, voice) {
  const mod = await espeakCompiled();
  const e = await ESpeakNg({
    arguments: ['--phonout', 'out', '-q', '--ipa', '-v', voice, '-f', 'in.txt'],
    preRun: [m => m.FS.writeFile('in.txt', text)],
    instantiateWasm: (imports, ok) => { WebAssembly.instantiate(mod, imports).then(i => ok(i, mod)); return {}; }
  });
  return e.FS.readFile('out', { encoding: 'utf8' });
}

const TERM = { '.': '.', '।': '.', '?': '?', '!': '!', ',': ',', ';': ';', ':': ':' };
/* Like Piper: phonemes per clause, the clause's punctuation kept as a symbol, then NFD and one id per symbol. */
export async function toIds(text, cfg) {
  const voice = (cfg.espeak && cfg.espeak.voice) || 'en-us';
  const map = cfg.phoneme_id_map;
  const clauses = [];
  String(text).replace(/\s+/g, ' ').trim().replace(/([^.,;:!?।]+)([.,;:!?।]*)/g, (m, body, end) => { if (body.trim()) clauses.push([body.trim(), end ? TERM[end[end.length - 1]] : '']); });
  if (!clauses.length) return [];
  const raw = (await espeak(clauses.map(c => c[0]).join('\n'), voice)).replace(/\(\w+\)/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  let ph = '';
  if (raw.length === clauses.length) raw.forEach((l, i) => { ph += l + clauses[i][1] + (i < raw.length - 1 ? ' ' : ''); });
  else { ph = raw.join(', ') + (clauses[clauses.length - 1][1] || ''); }   // line count differs: keep the words, join with commas
  ph = ph.normalize('NFD');
  const ids = [].concat(map['^'] || []);
  for (const ch of ph) { const v = map[ch]; if (v) { ids.push(...v); ids.push(...(map['_'] || [])); } }
  ids.push(...(map['$'] || []));
  return ids;
}

async function load(m) {
  if (sessions.has(m.key)) return;
  const session = await ort.InferenceSession.create(new Uint8Array(m.model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  sessions.set(m.key, { session, cfg: m.config });
}
async function synth(m) {
  const s = sessions.get(m.key); if (!s) throw new Error('voice pack not loaded');
  const cfg = s.cfg, ids = await toIds(m.text, cfg);
  if (ids.length < 3) return { pcm: new Float32Array(0), rate: (cfg.audio && cfg.audio.sample_rate) || 22050, ids };
  const inf = cfg.inference || {};
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, inf.length_scale ?? 1, inf.noise_w ?? 0.8]), [3])
  };
  if ((cfg.num_speakers || 1) > 1 && s.session.inputNames.includes('sid')) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await s.session.run(feeds);
  const pcm = out[s.session.outputNames[0]].data;
  return { pcm: Float32Array.from(pcm), rate: (cfg.audio && cfg.audio.sample_rate) || 22050, ids };
}

self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'load') { await load(m); self.postMessage({ id: m.id, ok: true }); }
    else if (m.type === 'drop') { sessions.delete(m.key); self.postMessage({ id: m.id, ok: true }); }
    else if (m.type === 'ids') { self.postMessage({ id: m.id, ids: await toIds(m.text, m.config) }); }
    else if (m.type === 'synth') { const r = await synth(m); self.postMessage({ id: m.id, pcm: r.pcm, rate: r.rate, ids: r.ids }, [r.pcm.buffer]); }
  } catch (err) { self.postMessage({ id: m.id, error: String((err && err.message) || err) }); }
};
