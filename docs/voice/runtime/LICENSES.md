# Third-party files in this folder

These files let the assistant speak with an offline voice pack. They are loaded only when a voice pack is installed.

| File | What it is | Licence |
|---|---|---|
| `ort.wasm.bundle.min.mjs`, `ort-wasm-simd-threaded.wasm`, `ort-wasm-simd-threaded.mjs` | ONNX Runtime Web 1.30.0 (npm: `onnxruntime-web`) | MIT, © Microsoft Corporation. The file header carries the notice. |
| `espeak-ng.js`, `espeak-ng.wasm` | eSpeak NG compiled to WebAssembly (npm: `espeak-ng` 1.0.2) | GPL-3.0-or-later. Full text in `LICENSE-espeak-ng.txt`. Source: https://github.com/espeak-ng/espeak-ng and the npm package's build notes. |
| `worker.mjs` | The worker that connects the two (generated from `app/src/voicepack-worker.mjs`) | Part of Abhyashify |

The app talks to eSpeak NG only through this separate worker file. If you redistribute this folder, keep the licence file and give recipients the source of eSpeak NG as the GPL requires.
