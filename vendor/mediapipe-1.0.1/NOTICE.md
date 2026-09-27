# MediaPipe (bundled for the Swing lab and the Pantry)

These files run body tracking (pose estimation) for Dugout's swing analysis, and spot fruit and vegetables in Pantry
photos, **on your phone**. Your videos and photos are never uploaded anywhere.

| File | From |
| --- | --- |
| `vision_bundle.mjs`, `vision_wasm_internal.js`, `vision_wasm_internal.wasm` | npm package `@mediapipe/tasks-vision` 1.0.1 (Google, Apache License 2.0) |
| `pose_landmarker_full.task` | MediaPipe Pose Landmarker (full, float16) model, https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task |
| `efficientdet_lite0.tflite` | MediaPipe Object Detector EfficientDet-Lite0 (int8, COCO), https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite — spots fruit and vegetables in Pantry photos |

MediaPipe: https://github.com/google-ai-edge/mediapipe — licensed under the Apache License, Version 2.0
(https://www.apache.org/licenses/LICENSE-2.0). Model card (BlazePose GHUM 3D):
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf

The folder name carries the version: to upgrade, add a new folder and point `swing.js` and `scan.js` at it (the service worker
keeps these big files in their own long-lived cache, so a new folder name is what makes phones download new ones).

**Privacy:** this version of MediaPipe tries to send anonymous usage statistics (which task ran, timings) to
`odml.pa.googleapis.com`. Dugout's Content-Security-Policy (`connect-src` in `index.html`, which only allows Dugout itself
and — for the optional Claude features — `api.anthropic.com`) blocks that request, so nothing about you, your videos or
your photos leaves the phone. (The blocked attempt shows up as an error in the browser console.)
