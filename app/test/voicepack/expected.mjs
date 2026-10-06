// Independent Piper-style phoneme ids (same eSpeak build the page uses), read from stdin as {map, voice, texts}.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), rt = path.join(here, '../../../docs/voice/runtime/');
const { default: ESpeakNg } = await import(rt + 'espeak-ng.js');
const mod = await WebAssembly.compile(fs.readFileSync(rt + 'espeak-ng.wasm'));
const inp = JSON.parse(fs.readFileSync(0, 'utf8')), res = [];
for (const text of inp.texts) {
  const clauses = []; text.replace(/([^.,;:!?।]+)([.,;:!?।]*)/g, (m, b, e) => { if (b.trim()) clauses.push([b.trim(), e ? ({ '।': '.' }[e.slice(-1)] || e.slice(-1)) : '']); });
  const e = await ESpeakNg({ arguments: ['--phonout', 'o', '-q', '--ipa', '-v', inp.voice, '-f', 'in.txt'], preRun: [m => m.FS.writeFile('in.txt', clauses.map(c => c[0]).join('\n'))], instantiateWasm: (im, ok) => { WebAssembly.instantiate(mod, im).then(i => ok(i, mod)); return {}; } });
  const lines = e.FS.readFile('o', { encoding: 'utf8' }).replace(/\(\w+\)/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  let ph = ''; if (lines.length === clauses.length) lines.forEach((l, i) => ph += l + clauses[i][1] + (i < lines.length - 1 ? ' ' : '')); else ph = lines.join(', ') + (clauses[clauses.length - 1][1] || '');
  const ids = [...inp.map['^']]; for (const ch of ph.normalize('NFD')) if (inp.map[ch]) { ids.push(...inp.map[ch], ...inp.map['_']); } ids.push(...inp.map['$']);
  res.push(ids);
}
console.log(JSON.stringify(res));
