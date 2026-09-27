# Tesseract.js (bundled for the Pantry's on-phone label reading)

Reads the words on food packages in your pantry photos, on your phone. Nothing is uploaded.

| File | From |
| --- | --- |
| `tesseract.esm.min.js`, `worker.min.js` | npm package `tesseract.js` 7.0.0 (Apache License 2.0) |
| `tesseract-core-simd-lstm.wasm.js` | npm package `tesseract.js-core` 7.0.0 (Apache License 2.0) — Tesseract OCR compiled to WebAssembly (the SIMD + LSTM build; Dugout already requires SIMD) |
| `eng.traineddata.gz` | npm package `@tesseract.js-data/eng` 1.0.0, `4.0.0_best_int` (Tesseract's English LSTM model, Apache License 2.0) |

Tesseract OCR: https://github.com/tesseract-ocr/tesseract — Tesseract.js: https://github.com/naptha/tesseract.js
(Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0)

The folder name carries the version: the service worker keeps these files in its long-lived cache, so an upgrade goes in a
new folder.
