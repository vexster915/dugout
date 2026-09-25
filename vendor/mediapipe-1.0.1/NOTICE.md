# MediaPipe (bundled for the Swing lab)

These files run body tracking (pose estimation) **on your phone** for Dugout's swing analysis.
Your videos are never uploaded anywhere.

| File | From |
| --- | --- |
| `vision_bundle.mjs`, `vision_wasm_internal.js`, `vision_wasm_internal.wasm` | npm package `@mediapipe/tasks-vision` 1.0.1 (Google, Apache License 2.0) |
| `pose_landmarker_full.task` | MediaPipe Pose Landmarker (full, float16) model, https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task |

MediaPipe: https://github.com/google-ai-edge/mediapipe — licensed under the Apache License, Version 2.0
(https://www.apache.org/licenses/LICENSE-2.0). Model card (BlazePose GHUM 3D):
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf

The folder name carries the version: to upgrade, add a new folder and point `swing.js` at it (the service worker
keeps these big files in their own long-lived cache, so a new folder name is what makes phones download new ones).
