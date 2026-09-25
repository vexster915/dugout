/* swing.js — the Swing lab's analysis engine.

   1. Tracking (in the browser, section 4): MediaPipe Pose Landmarker (vendor/…) finds 33 body points in every frame
      of your video, on the phone. Nothing is uploaded.
   2. Analysis (plain math, no browser needed — tested with made-up swings):
      - builds a "hitter frame" — toward the pitcher (P), toward the plate (F) and up (U) — so the same measurements
        work from the side, front or back. Directions the camera sees flat come from the video; depth comes from the
        model's 3D estimate.
      - finds the swing's phases: stance, load, stride, foot plant, swing start, contact (peak hand speed), finish
      - measures ~30 things (stride, head movement, hip-shoulder separation, sequence, extension…), each with how
        reliable it is from this camera angle, then scores the swing, finds the biggest problems and picks drills.

   Landmarks (MediaPipe numbering): 0 nose, 7/8 ears, 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips,
   25/26 knees, 27/28 ankles, 29/30 heels, 31/32 toes — odd = the person's left side. */

const SWING = (() => {
  const VERSION = 1;
  const IN = 39.3701;                       // inches per meter
  const deg = r => (r * 180) / Math.PI;
  const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const med = a => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); if (!b.length) return NaN; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // Angle at joint b between a-b and c-b, in degrees (180 = straight).
  const jointAngle = (a, b, c) => { const u = sub(a, b), v = sub(c, b); return deg(Math.acos(clampN(dot(u, v) / ((len(u) * len(v)) || 1), -1, 1))); };

  // Savitzky–Golay (quadratic) smoothing and first derivative over about 0.1 s of real time: 7 points at 60 fps,
  // 13 at 120; 5 at ~30 fps and a light 3-point average below that. Edges repeat the end values.
  const sgKernels = w => {
    if (w === 3) return [[0.25, 0.5, 0.25], [-0.5, 0, 0.5]];
    const m = (w - 1) / 2, den = (2 * m - 1) * (2 * m + 1) * (2 * m + 3), s2 = (m * (m + 1) * (2 * m + 1)) / 3;
    const js = Array.from({ length: w }, (_, i) => i - m);
    return [js.map(j => (3 * (3 * m * m + 3 * m - 1) - 15 * j * j) / den), js.map(j => j / s2)];
  };
  let SGW = 7, SGK = sgKernels(7);
  const conv = (a, k) => { const h = (k.length - 1) / 2; return a.map((_, i) => k.reduce((s, w, j) => s + w * a[clampN(i + j - h, 0, a.length - 1)], 0)); };
  const smooth = a => (a.length >= SGW + 2 ? conv(a, SGK[0]) : a.slice());
  const deriv = (a, dt) => (a.length >= SGW + 2 ? conv(a, SGK[1]).map(v => v / dt) : a.map((v, i) => (i ? (v - a[i - 1]) / dt : 0)));
  // Running median: removes one-frame glitches but leaves smooth motion untouched.
  const medFilt = (a, w) => { const h = (w - 1) >> 1; return a.map((_, i) => { const b = []; for (let j = i - h; j <= i + h; j++) b.push(a[clampN(j, 0, a.length - 1)]); b.sort((x, y) => x - y); return b[h]; }); };
  // Outlier-only filter (Hampel): a sample far from its neighbors' median is replaced by that median; everything else
  // is left exactly as it was.
  const despike = (a, floor) => a.map((v, i) => {
    const b = []; for (let j = i - 2; j <= i + 2; j++) b.push(a[clampN(j, 0, a.length - 1)]);
    const m = med(b), mad = med(b.map(x => Math.abs(x - m)));
    return Math.abs(v - m) > Math.max(floor, 4.4 * mad) ? m : v;
  });
  const unwrap = a => { const o = a.slice(); for (let i = 1; i < o.length; i++) { while (o[i] - o[i - 1] > 180) o[i] -= 360; while (o[i] - o[i - 1] < -180) o[i] += 360; } return o; };
  // Index of the largest value in [from, to], refined between frames with a parabola (returns a fractional index).
  function peakAt(a, from = 0, to = a.length - 1) {
    let best = -1, bv = -Infinity;
    for (let i = Math.max(0, from); i <= Math.min(a.length - 1, to); i++) if (a[i] > bv) { bv = a[i]; best = i; }
    if (best <= 0 || best >= a.length - 1) return { i: best, x: best, v: bv };
    const y0 = a[best - 1], y1 = a[best], y2 = a[best + 1], d = y0 - 2 * y1 + y2;
    const off = d ? clampN((0.5 * (y0 - y2)) / d, -0.5, 0.5) : 0;
    return { i: best, x: best + off, v: y1 };
  }

  const LM = { nose: 0, lEar: 7, rEar: 8, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28, lHeel: 29, rHeel: 30, lToe: 31, rToe: 32 };
  const TRACK_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];   // saved for the stick-figure replay

  /* ======================= 1. Clean up the tracked frames ======================= */
  // frames: [{ t: seconds in the video, lm: 33 × [x, y, visibility] (0–1 image coords), w: 33 × [x, y, z] meters } | null]

  // Seen from the side, the body model sometimes swaps your left and right arm or leg for a few frames. Put them back:
  // if trading a pair (elbow, wrist… or knee, ankle, foot) matches the frame before far better, trade it.
  const SWAP_GROUPS = [[[13, 14], [15, 16], [17, 18], [19, 20], [21, 22]], [[25, 26], [27, 28], [29, 30], [31, 32]]];
  function fixSwaps(frames) {
    let prev = null;
    return frames.map(f => {
      if (!f) return f;
      let g = f;
      if (prev) {
        for (const group of SWAP_GROUPS) {
          let same = 0, swap = 0;
          for (const [a, b] of group) {
            const d = (x, y) => Math.hypot(g.lm[x][0] - prev.lm[y][0], g.lm[x][1] - prev.lm[y][1]);
            same += d(a, a) + d(b, b); swap += d(a, b) + d(b, a);
          }
          if (swap < 0.5 * same && same > 0.04 * group.length) {
            g = { t: g.t, lm: g.lm.slice(), w: g.w.slice() };
            for (const [a, b] of group) { [g.lm[a], g.lm[b]] = [g.lm[b], g.lm[a]]; [g.w[a], g.w[b]] = [g.w[b], g.w[a]]; }
          }
        }
      }
      prev = g;
      return g;
    });
  }
  // speed: how many times slower than real life the video plays (slow motion) — smoothing depends on real time.
  function prepare(frames, speed = 1) {
    frames = fixSwaps(frames);
    const n = frames.length, ok = frames.filter(Boolean).length;
    if (n < 12 || ok / n < 0.6) return { error: 'nobody' };
    const ts = frames.filter(Boolean).map(f => f.t), dtv = ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / (ts.length - 1) : 1 / 30;
    const dtReal = dtv / speed;
    SGW = dtReal <= 1 / 45 ? clampN(2 * Math.round(0.055 / dtReal) + 1, 7, 15) : dtReal <= 1 / 24 ? 5 : 3;
    SGK = sgKernels(SGW);
    const idx = frames.map((f, i) => (f ? i : -1)).filter(i => i >= 0);
    // Fill missing frames and low-visibility points by interpolating over time.
    const P = [], W = [], V = [];
    for (let i = 0; i < n; i++) { P.push([]); W.push([]); V.push([]); }
    for (let j = 0; j < 33; j++) {
      const good = idx.filter(i => frames[i].lm[j][2] >= 0.3);
      const use = good.length >= Math.max(4, idx.length * 0.3) ? good : idx;     // rarely seen → trust the model's guess
      for (let i = 0; i < n; i++) {
        let k = use.findIndex(x => x >= i);
        let a, b;
        if (k === -1) a = b = use[use.length - 1]; else if (use[k] === i || k === 0) a = b = use[k]; else { a = use[k - 1]; b = use[k]; }
        const f = a === b ? 0 : (i - a) / (b - a), fa = frames[a], fb = frames[b];
        P[i][j] = [fa.lm[j][0] + (fb.lm[j][0] - fa.lm[j][0]) * f, fa.lm[j][1] + (fb.lm[j][1] - fa.lm[j][1]) * f];
        W[i][j] = [0, 1, 2].map(c => fa.w[j][c] + (fb.w[j][c] - fa.w[j][c]) * f);
        V[i][j] = frames[i] ? frames[i].lm[j][2] : 0;
      }
    }
    // Smooth every coordinate over time (one-frame glitches are removed first).
    for (let j = 0; j < 33; j++) {
      for (let c = 0; c < 2; c++) { const s = smooth(despike(P.map(p => p[j][c]), 0.02)); s.forEach((v, i) => { P[i][j][c] = v; }); }
      for (let c = 0; c < 3; c++) { const s = smooth(despike(W.map(w => w[j][c]), 0.06)); s.forEach((v, i) => { W[i][j][c] = v; }); }
    }
    const times = frames.map((f, i) => (f ? f.t : NaN));
    // Uniform sampling is assumed (the tracker samples at a fixed step); fill any missing times.
    const known = times.map((t, i) => [i, t]).filter(([, t]) => Number.isFinite(t));
    const step = known.length > 1 ? (known[known.length - 1][1] - known[0][1]) / (known[known.length - 1][0] - known[0][0]) : 1 / 30;
    const t0 = known[0][1] - known[0][0] * step;
    return { n, P, W, V, t: times.map((_, i) => t0 + i * step), dt: step, detected: ok / n };
  }

  /* ======================= 2. The hitter frame ======================= */
  // Which way is the pitcher, which way is the plate, and which camera angle is this?
  // stance: frame numbers of your stance before the swing (the first part of the clip if unknown).
  function orient(D, opts, stance) {
    const { P, W, V, n } = D, bats = opts.bats === 'L' ? 'L' : 'R';
    const S = bats === 'R' ? { sh: [LM.lSh, LM.rSh], el: [LM.lEl, LM.rEl], wr: [LM.lWr, LM.rWr], hip: [LM.lHip, LM.rHip], kn: [LM.lKn, LM.rKn], an: [LM.lAn, LM.rAn], heel: [LM.lHeel, LM.rHeel], toe: [LM.lToe, LM.rToe] }
      : { sh: [LM.rSh, LM.lSh], el: [LM.rEl, LM.lEl], wr: [LM.rWr, LM.lWr], hip: [LM.rHip, LM.lHip], kn: [LM.rKn, LM.lKn], an: [LM.rAn, LM.lAn], heel: [LM.rHeel, LM.lHeel], toe: [LM.rToe, LM.lToe] };
    // [lead, back] index pairs. Look at the stance to decide.
    const early = stance && stance.length >= 3 ? stance : Array.from({ length: Math.max(3, Math.floor(n * 0.25)) }, (_, i) => i).filter(i => i < n);
    const aspect = opts.aspect || 16 / 9;
    const p2 = (i, j) => [P[i][j][0] * aspect, P[i][j][1], 0];
    const torso2 = med(early.map(i => len(sub(mid(p2(i, LM.lSh), p2(i, LM.rSh)), mid(p2(i, LM.lHip), p2(i, LM.rHip))))));
    const shW2 = med(early.map(i => len(sub(p2(i, LM.lSh), p2(i, LM.rSh)))));
    const ratio = shW2 / (torso2 || 1);
    const leadCloser = med(early.map(i => W[i][S.sh[0]][2] - W[i][S.sh[1]][2])) + med(early.map(i => W[i][S.hip[0]][2] - W[i][S.hip[1]][2]));
    const face = med(early.map(i => (V[i][LM.nose] + V[i][2] + V[i][5]) / 3));
    let view = opts.view && opts.view !== 'auto' ? opts.view : ratio > 0.5 ? 'side' : leadCloser < 0 ? 'front' : leadCloser > 0 ? 'back' : face > 0.6 ? 'front' : 'back';
    const auto = !(opts.view && opts.view !== 'auto');
    // Horizontal (x, z) body direction toward the pitcher: lead minus back, from hips, shoulders and feet.
    const lead = early.map(i => [S.hip, S.sh, S.an].reduce((acc, [a, b]) => add(acc, sub(W[i][a], W[i][b])), [0, 0, 0]));
    const Lv = [med(lead.map(v => v[0])), 0, med(lead.map(v => v[2]))];
    // The chest faces the plate: forward = up × right, with right = right shoulder − left shoulder (camera coords, y down).
    const R = [0, 1, 2].map(c => med(early.map(i => W[i][LM.rSh][c] - W[i][LM.lSh][c] + W[i][LM.rHip][c] - W[i][LM.lHip][c])));
    const fwd = [-R[2], 0, R[0]];
    let Ph, Fh;
    const warnings = [];
    if (view === 'side') {
      const sx = Math.sign(Lv[0] || (p2(early[0], S.an[0])[0] - p2(early[0], S.an[1])[0])) || 1;
      Ph = [sx, 0, 0]; Fh = [0, 0, Math.sign(fwd[2]) || -1];
    } else {
      Ph = view === 'front' ? [0, 0, -1] : [0, 0, 1];
      Fh = [Math.sign(fwd[0]) || 1, 0, 0];
      if (dot(Lv, Ph) < 0 && Math.abs(Lv[2]) > 0.1) warnings.push('flip');
    }
    return { view, auto, bats, S, Ph, Fh, aspect, ratio, warnings };
  }

  // Hitter-frame coordinates (meters, relative to the hip center, scaled to your height):
  // a = toward the pitcher, b = toward the plate, c = up. Flat-to-camera directions come from the video (sharper),
  // depth comes from the model's 3D points.
  function hitterCoords(D, O, heightM, stance) {
    const { P, W, n } = D, { Ph, Fh, aspect, view } = O;
    const setup = stance && stance.length >= 3 ? stance : Array.from({ length: Math.max(3, Math.floor(n * 0.2)) }, (_, i) => i).filter(i => i < n);
    const hm2 = i => { const l = P[i][LM.lHip], r = P[i][LM.rHip]; return [((l[0] + r[0]) / 2) * aspect, (l[1] + r[1]) / 2]; };
    const sm2 = i => { const l = P[i][LM.lSh], r = P[i][LM.rSh]; return [((l[0] + r[0]) / 2) * aspect, (l[1] + r[1]) / 2]; };
    const torsoW = med(setup.map(i => len(sub(mid(W[i][LM.lSh], W[i][LM.rSh]), mid(W[i][LM.lHip], W[i][LM.rHip])))));
    // Torso length on screen, corrected for leaning toward or away from the camera.
    const frac = med(setup.map(i => { const v = norm(sub(mid(W[i][LM.lSh], W[i][LM.rSh]), mid(W[i][LM.lHip], W[i][LM.rHip]))); return Math.sqrt(Math.max(0.25, 1 - v[2] * v[2])); }));
    const torso2 = med(setup.map(i => Math.hypot(sm2(i)[0] - hm2(i)[0], sm2(i)[1] - hm2(i)[1]))) / (frac || 1);
    const torsoM = 0.29 * heightM;
    const kW = torsoM / (torsoW || 0.5), k2 = torsoM / (torso2 || 0.3);
    const sx = view === 'side' ? Math.sign(Ph[0]) : Math.sign(Fh[0]);
    // Perspective: a point nearer the camera than the hips looks bigger. Camera distance = meters per image unit ×
    // focal length; phones' main (1×) lens is about 0.78 × the long side of the frame.
    const focal = 0.78 * Math.max(aspect, 1), camDist = Math.max(1.5, k2 * focal);
    const C = [];
    for (let i = 0; i < n; i++) {
      const hw = mid(W[i][LM.lHip], W[i][LM.rHip]), h2 = hm2(i), row = [];
      for (let j = 0; j < 33; j++) {
        const w = sub(W[i][j], hw), persp = 1 + clampN((w[2] * kW) / camDist, -0.3, 0.3);
        const a = dot(w, Ph) * kW, b = dot(w, Fh) * kW;
        const dx = (P[i][j][0] * aspect - h2[0]) * k2 * sx * persp, up = -(P[i][j][1] - h2[1]) * k2 * persp;
        row.push(view === 'side' ? [dx, b, up] : [a, dx, up]);
      }
      C.push(row);
    }
    return { C, torsoM, kW, k2, camDist };
  }

  /* ======================= 3. Measure the swing ======================= */
  // Target ranges: [good low, good high], [ok low, ok high]. Reliability of each measurement from each camera angle.
  const R3 = (side, front, back) => ({ side, front, back });
  const DEF = {
    stance_width: { cat: 'setup', label: 'Stance width', unit: '× shoulders', good: [1.15, 2.0], ok: [0.9, 2.4], rel: R3('high', 'med', 'med'), fault: 'stance', w: 0.6 },
    knee_setup: { cat: 'setup', label: 'Knee bend in your stance', unit: '°', good: [132, 166], ok: [120, 173], rel: R3('med', 'high', 'high'), fault: 'stance', w: 0.6 },
    hinge_setup: { cat: 'setup', label: 'Forward tilt in your stance', unit: '°', good: [6, 32], ok: [1, 42], rel: R3('med', 'high', 'high'), fault: 'posture', w: 0.5 },
    load_hands: { cat: 'stride', label: 'Hands load back', unit: 'in', good: [1.5, 9], ok: [0.5, 13], rel: R3('high', 'med', 'med'), fault: 'load', w: 0.6 },
    coil: { cat: 'stride', label: 'Shoulder coil in the load', unit: '°', good: [4, 28], ok: [1, 38], rel: R3('med', 'med', 'med'), fault: 'load', w: 0.5 },
    stride_len: { cat: 'stride', label: 'Stride length', unit: 'in', good: null, ok: null, rel: R3('high', 'low', 'low'), fault: 'overstride', w: 0.8 },
    stride_dir: { cat: 'stride', label: 'Stride direction', unit: '°', good: [-12, 12], ok: [-22, 22], rel: R3('low', 'high', 'high'), w: 0.9 },
    weight_fp: { cat: 'stride', label: 'Weight at foot plant', unit: '% forward', good: [33, 62], ok: [24, 72], rel: R3('high', 'low', 'low'), fault: 'lunge', w: 1 },
    sep_fp: { cat: 'rotation', label: 'Hip-shoulder separation at foot plant', unit: '°', good: [12, 50], ok: [5, 62], rel: R3('med', 'med', 'med'), fault: 'no_sep', w: 1 },
    sep_max: { cat: 'rotation', label: 'Most hip-shoulder separation', unit: '°', good: [18, 60], ok: [9, 70], rel: R3('med', 'med', 'med'), fault: 'no_sep', w: 0.8 },
    early_open: { cat: 'rotation', label: 'Shoulders open at foot plant', unit: '°', good: [-40, 5], ok: [-50, 15], rel: R3('med', 'med', 'med'), fault: 'early_open', w: 1 },
    sequence: { cat: 'rotation', label: 'Swing sequence (hips → shoulders → hands)', unit: 'ms', rel: R3('med', 'med', 'med'), fault: 'sequence', w: 1.2 },
    speed_gain: { cat: 'rotation', label: 'Shoulders rotate faster than hips', unit: '×', good: [1.12, 3], ok: [0.95, 4], rel: R3('med', 'med', 'med'), fault: 'sequence', w: 0.6 },
    hip_open_contact: { cat: 'rotation', label: 'Hips open at contact', unit: '°', good: [40, 105], ok: [25, 120], rel: R3('med', 'med', 'med'), fault: 'sequence', w: 0.6 },
    hip_speed: { cat: 'rotation', label: 'Peak hip rotation speed', unit: '°/s', info: true, rel: R3('med', 'med', 'med') },
    sh_speed: { cat: 'rotation', label: 'Peak shoulder rotation speed', unit: '°/s', info: true, rel: R3('med', 'med', 'med') },
    head_drift: { cat: 'head', label: 'Head movement toward the pitcher', unit: 'in', good: [-2.5, 4.5], ok: [-4, 7.5], rel: R3('high', 'low', 'low'), fault: 'head', w: 1.1 },
    head_drop: { cat: 'head', label: 'Head up or down', unit: 'in', good: [-3.5, 2.5], ok: [-6, 4], rel: R3('high', 'high', 'high'), fault: 'head', w: 0.9 },
    head_lateral: { cat: 'head', label: 'Head toward or away from the plate', unit: 'in', good: [-2.5, 2.5], ok: [-4.5, 4.5], rel: R3('low', 'high', 'high'), fault: 'head', w: 0.8 },
    posture_change: { cat: 'head', label: 'Spine angle change to contact', unit: '°', good: [-7, 12], ok: [-14, 20], rel: R3('med', 'high', 'high'), fault: 'posture', w: 0.8 },
    tilt_contact: { cat: 'head', label: 'Shoulder tilt at contact', unit: '°', good: [8, 42], ok: [0, 52], rel: R3('med', 'high', 'high'), fault: 'collapse', w: 0.5 },
    front_block: { cat: 'legs', label: 'Front leg firms up (foot plant → contact)', unit: '°', good: [6, 60], ok: [-3, 70], rel: R3('med', 'high', 'high'), fault: 'block', w: 0.9 },
    lead_knee_contact: { cat: 'legs', label: 'Front knee at contact', unit: '°', good: [148, 181], ok: [133, 181], rel: R3('med', 'high', 'high'), fault: 'block', w: 0.6 },
    back_collapse: { cat: 'legs', label: 'Hips drop from foot plant to contact', unit: 'in', good: [-10, 1.5], ok: [-12, 3], rel: R3('high', 'high', 'high'), fault: 'collapse', w: 0.8 },
    hands_close: { cat: 'hands', label: 'Hands stay close to your body early in the swing', unit: '× start', good: [0, 1.1], ok: [0, 1.2], rel: R3('med', 'high', 'high'), fault: 'cast', w: 1 },
    back_elbow_mid: { cat: 'hands', label: 'Back elbow halfway through the swing', unit: '°', good: [30, 118], ok: [30, 138], rel: R3('med', 'high', 'high'), fault: 'cast', w: 0.7 },
    extension: { cat: 'hands', label: 'Arm extension after contact', unit: '°', good: [154, 181], ok: [140, 181], rel: R3('med', 'med', 'med'), fault: 'extension', w: 0.9 },
    swing_time: { cat: 'hands', label: 'Swing time (swing start → contact)', unit: 'ms', good: [60, 195], ok: [60, 245], rel: R3('high', 'high', 'high'), fault: 'slow', w: 0.7 },
    hand_speed: { cat: 'hands', label: 'Peak hand speed', unit: 'mph', info: true, rel: R3('med', 'low', 'low') },
    finish_balance: { cat: 'finish', label: 'Balanced finish (head over your feet)', unit: '×', good: [-0.36, 0.36], ok: [-0.56, 0.56], rel: R3('high', 'low', 'low'), fault: 'balance', w: 0.8 },
    back_foot_step: { cat: 'finish', label: 'Back foot stays put after contact', unit: 'in', good: [0, 5], ok: [0, 9], rel: R3('med', 'med', 'med'), fault: 'balance', w: 0.5 }
  };
  const CATS = { setup: ['Setup', 0.06], stride: ['Load & stride', 0.16], rotation: ['Rotation & sequence', 0.24], head: ['Head & posture', 0.18],
    legs: ['Lower half', 0.12], hands: ['Hands & bat path', 0.16], finish: ['Finish', 0.08] };

  // Where is the swing, and is it slow motion? Finds the hands' fastest moment on video (2D wrists only; later passes
  // smooth over a window matched to the peak itself, so jitter can't fool it at any frame rate) and how wide that
  // peak is. A swing's peak is about 0.15 s wide (at half height) in real time, so the width tells the playback speed.
  function handPeak(D, aspect) {
    let at = 0;
    const width = win => {
      const k = sgKernels(win), sm = a => conv(conv(a, k[0]), k[0]);
      const hx = sm(D.P.map(p => ((p[LM.lWr][0] + p[LM.rWr][0]) / 2) * aspect)), hy = sm(D.P.map(p => (p[LM.lWr][1] + p[LM.rWr][1]) / 2));
      const vx = conv(hx, k[1]), vy = conv(hy, k[1]), v = vx.map((x, i) => Math.hypot(x, vy[i]));
      const pk = peakAt(v, 2, v.length - 3);
      let a0 = pk.i, a1 = pk.i;
      while (a0 > 0 && v[a0 - 1] > pk.v / 2) a0--;
      while (a1 < v.length - 1 && v[a1 + 1] > pk.v / 2) a1++;
      at = pk.i;
      return a1 - a0 + 1;                                                      // in frames
    };
    let win = clampN(2 * Math.round(D.n / 60) + 1, 5, 41), w = 0;
    for (let pass = 0; pass < 3; pass++) {
      w = width(win);
      const next = clampN(2 * Math.round(w / 6) + 1, 5, 41);
      if (next === win) break;
      win = next;
    }
    return { i: at, w: w * D.dt };
  }
  const speedFromWidth = w => (w < 0.33 ? 1 : w < 0.76 ? 4 : 8);        // normal, 4× or 8× slow motion
  // Very high frame rates (slow motion) are averaged down to about 120 frames per real second.
  function bin(frames, k) {
    const out = [];
    for (let s0 = 0; s0 + k <= frames.length; s0 += k) {
      const g = frames.slice(s0, s0 + k).filter(Boolean);
      if (!g.length) { out.push(null); continue; }
      const avg = key => g[0][key].map((row, j) => row.map((_, c) => g.reduce((t, f) => t + f[key][j][c], 0) / g.length));
      out.push({ t: g.reduce((t, f) => t + f.t, 0) / g.length, lm: avg('lm'), w: avg('w') });
    }
    return out;
  }

  function analyze(frames, opts = {}) {
    let D = prepare(frames);
    if (D.error) return D;
    const hp0 = handPeak(D, opts.aspect || 16 / 9);
    let speed = Number(opts.speed) || 0, swingAt = hp0.i;
    const speedAuto = !speed;
    if (!speed) speed = speedFromWidth(hp0.w);
    const k = Math.floor((speed / D.dt) / 120 + 0.05);        // e.g. 240 real fps → average every 2 frames
    if (k >= 2 || speed > 1) { D = prepare(k >= 2 ? bin(frames, k) : frames, speed); if (D.error) return D; if (k >= 2) swingAt = Math.floor(swingAt / k); }
    const n = D.n, dtR = D.dt / speed, fr = s => Math.max(1, Math.round(s / dtR));        // real seconds → frames
    // Your stance: roughly 1.6 to 0.6 s before the hands' fastest moment (anything earlier — walking in, a practice
    // swing — is ignored).
    const stance = Array.from({ length: n }, (_, i) => i).filter(i => i >= swingAt - fr(1.6) && i <= swingAt - fr(0.6));
    const O = orient(D, opts, stance);
    const heightM = ((opts.heightIn || 69) * 2.54) / 100;
    const H = hitterCoords(D, O, heightM, stance);
    const { C } = H, S = O.S;
    const J = (i, j) => C[i][j];
    const head = i => { const f = [LM.nose, LM.lEar, LM.rEar].map(j => [J(i, j), Math.max(0.05, D.V[i][j] || 0.05)]); const tw = f.reduce((s, [, w]) => s + w, 0); return f.reduce((acc, [p, w]) => add(acc, mul(p, w / tw)), [0, 0, 0]); };
    const L = { sh: i => J(i, S.sh[0]), bsh: i => J(i, S.sh[1]), el: i => J(i, S.el[0]), bel: i => J(i, S.el[1]), wr: i => J(i, S.wr[0]), bwr: i => J(i, S.wr[1]),
      hip: i => J(i, S.hip[0]), bhip: i => J(i, S.hip[1]), kn: i => J(i, S.kn[0]), bkn: i => J(i, S.kn[1]), an: i => J(i, S.an[0]), ban: i => J(i, S.an[1]) };
    const hands = i => mid(L.wr(i), L.bwr(i));
    const rng = Array.from({ length: n }, (_, i) => i);

    // Speed of a moving point: directions the camera sees flat count fully; the depth direction (the model's
    // guess, noisier) is smoothed twice more first.
    const depthAxis = O.view === 'side' ? 1 : 0;
    const speedOf = vecs => {
      const d = [0, 1, 2].map(c => { let s = vecs.map(v => v[c]); if (c === depthAxis) s = smooth(smooth(s)); return deriv(s, D.dt); });
      return rng.map(i => Math.hypot(d[0][i], d[1][i], d[2][i]));
    };
    // Hand speed relative to the planted back foot (video time). Contact ≈ peak hand speed.
    const hRel = rng.map(i => sub(hands(i), L.ban(i)));
    const hv = speedOf(hRel);
    // Contact ≈ the FIRST big hand-speed peak — the follow-through (bat wrapping around) can be fast too, but it comes after.
    const margin = Math.min(3, Math.floor(n / 10));
    const top = peakAt(hv, margin, n - 1 - margin);
    let pk = top;
    for (let i = Math.max(margin + 1, top.i - fr(0.45)); i < top.i; i++) if (hv[i] >= 0.7 * top.v && hv[i] >= hv[i - 1] && hv[i] >= hv[i + 1]) { pk = peakAt(hv, i - 1, i + 1); break; }
    const iC = pk.i;
    // A real swing stands out from the jitter and moves the hands a long way (about half a meter or more).
    let travel = 0;
    for (let i = Math.max(0, iC - fr(0.6)); i < iC; i++) travel = Math.max(travel, len(sub(hRel[iC], hRel[i])));
    if (iC < 4 || pk.v < 2 * med(hv) || travel < 0.28) return { error: 'noswing' };
    // Both hands on the bat: through contact your wrists stay close together (walking, jumping, waving or throwing
    // don't look like that).
    const apart = med(rng.slice(Math.max(0, iC - fr(0.08)), iC + 1).map(i => len(sub(L.wr(i), L.bwr(i))) / (len(mid(L.sh(i), L.bsh(i))) || 0.3)));
    if (apart > 0.6) return { error: 'noswing', reason: 'hands' };

    // Stride: lead ankle relative to the back ankle.
    const aRel = rng.map(i => sub(L.an(i), L.ban(i)));
    const av = speedOf(aRel).map(v => v * speed);                                   // real m/s
    const sp = peakAt(av, Math.max(0, iC - fr(1.5)), iC);
    const hasStride = sp.v > 0.35 && Math.abs(aRel[Math.min(n - 1, iC)][0] - aRel[Math.max(0, iC - fr(1.2))][0]) > 0.02;
    let iFP, iSS;
    if (hasStride) {
      iSS = sp.i; while (iSS > 0 && av[iSS - 1] > 0.15 * sp.v) iSS--;
      // Foot plant from the foot's position (no smoothing lag): ~all the way to its landing spot and back on the ground.
      let base = rng.filter(i => i <= iSS - fr(0.08) && i >= iSS - fr(0.7));
      if (base.length < 3) base = [0, 1, 2].filter(i => i < n);
      const aS = [0, 1, 2].map(c => { const sm = c === depthAxis ? smooth(smooth(aRel.map(v => v[c]))) : aRel.map(v => v[c]); return sm; });
      const b0 = [0, 1, 2].map(c => med(base.map(i => aS[c][i])));
      // Progress along the stride's direction (so depth jitter across it doesn't count) and height off the ground.
      const u0 = [aS[0][iC] - b0[0], aS[1][iC] - b0[1]], total = Math.hypot(u0[0], u0[1]) || 1e-6;
      const prog = i => ((aS[0][i] - b0[0]) * u0[0] + (aS[1][i] - b0[1]) * u0[1]) / (total * total);
      const lift = i => aS[2][i] - b0[2], maxLift = Math.max(0, ...rng.slice(iSS, iC + 1).map(lift));
      // With a real leg lift, the foot coming back down (sharp on video) marks the plant — the planted foot can still
      // drift a little afterwards. With a slide step or toe tap, it's when the foot has (nearly) reached its spot.
      // From the front or back, forward progress is depth (the model's smoothed guess, which lags), so it needs less.
      const lifted = maxLift > 0.03;
      const need = lifted ? 0.7 : depthAxis === 0 ? 0.85 : 0.9, down = Math.max(0.01, 0.12 * maxLift);
      iFP = sp.i;
      while (iFP < iC && !(prog(iFP) >= need && lift(iFP) <= down)) iFP++;
    } else { let s0 = iC; while (s0 > 0 && hv[s0 - 1] > 0.25 * pk.v) s0--; iFP = Math.max(0, s0 - 1); iSS = Math.max(0, iFP - fr(0.3)); }
    // Load: hands farthest back (toward the catcher) around the stride. Swing start: hand speed passes 25% of its peak.
    const hA = smooth(hRel.map(v => v[0]));
    let iL = Math.max(0, iSS - fr(0.3));
    for (let i = iL; i <= Math.min(iC - 1, iFP + fr(0.08)); i++) if (hA[i] < hA[iL]) iL = i;
    let iS = iC; while (iS > iL && hv[iS - 1] > 0.25 * pk.v) iS--;
    const iSetEnd = Math.max(2, Math.min(iSS, iL) - fr(0.1));
    const setup = rng.filter(i => i <= iSetEnd && i >= iSetEnd - fr(1.0));
    const shortSetup = setup.length < 3;
    const setupIdx = shortSetup ? [0, 1, 2].filter(i => i < n) : setup;
    const iF = Math.min(n - 1, iC + fr(0.35));
    const atSetup = f => { const v = setupIdx.map(f); return Array.isArray(v[0]) ? [0, 1, 2].map(c => med(v.map(x => x[c]))) : med(v); };

    // Rotation: how far the hips and shoulders have opened toward the pitcher (0 = square in your stance).
    // A body segment never changes length, so its depth part is rebuilt from its length and the parts the camera sees
    // flat; the model's depth guess (smoothed) only decides which side it points to.
    const openAng = (ja, jb) => {
      const v = rng.map(i => sub(C[i][ja], C[i][jb])), Lseg = med(rng.map(i => len(sub(D.W[i][ja], D.W[i][jb])))) * H.kW;
      const dep = smooth(smooth(v.map(x => x[depthAxis])));
      return rng.map(i => {
        const x = v[i].slice(), flat = depthAxis === 1 ? x[0] : x[1];
        const mag = Math.sqrt(Math.max(0, Lseg * Lseg - flat * flat - x[2] * x[2]));
        // Rebuilt depth is sharp when the segment points toward/away from the camera, but touchy when it's nearly flat
        // to it — there the model's own (smoothed) depth is better. Blend by how flat the segment looks.
        const r = Math.abs(flat) / (Lseg || 1), w = clampN((0.95 - r) / 0.3, 0, 1);
        x[depthAxis] = w * (dep[i] >= 0 ? 1 : -1) * mag + (1 - w) * dep[i];
        return deg(Math.atan2(-x[1], x[0]));
      });
    };
    const hipRaw = medFilt(unwrap(openAng(S.hip[0], S.hip[1])), SGW >= 13 ? 5 : 3), shRaw = medFilt(unwrap(openAng(S.sh[0], S.sh[1])), SGW >= 13 ? 5 : 3);
    const h0 = atSetup(i => hipRaw[i]), s0 = atSetup(i => shRaw[i]);
    const angSmooth = a => (SGW >= 7 ? smooth(a) : a);
    const hipO = angSmooth(hipRaw.map(v => v - h0)), shO = angSmooth(shRaw.map(v => v - s0));
    const sep = rng.map(i => hipO[i] - shO[i]);
    const hipV = deriv(hipO, D.dt).map(v => v * speed), shV = deriv(shO, D.dt).map(v => v * speed);
    const hvR = hv.map(v => v * speed);

    const knee = (hip, kn, an) => i => jointAngle(hip(i), kn(i), an(i));
    const leadKnee = knee(L.hip, L.kn, L.an), backKnee = knee(L.bhip, L.bkn, L.ban);
    const leadElbow = i => jointAngle(L.sh(i), L.el(i), L.wr(i)), backElbow = i => jointAngle(L.bsh(i), L.bel(i), L.bwr(i));
    const sm = i => mid(L.sh(i), L.bsh(i));
    const hinge = i => { const v = sm(i); return deg(Math.atan2(v[1], v[2])); };        // forward tilt toward the plate
    const feetW = i => Math.hypot(aRel[i][0], aRel[i][1]);
    const toIn = m => m * IN;

    const M = {};
    const shW = atSetup(i => len(sub(L.sh(i), L.bsh(i))));
    M.stance_width = atSetup(feetW) / (shW || 0.4);
    M.knee_setup = (atSetup(leadKnee) + atSetup(backKnee)) / 2;
    M.hinge_setup = atSetup(hinge);
    M.load_hands = toIn(atSetup(i => hA[i]) - hA[iL]);
    M.coil = -Math.min(...shO.slice(Math.max(0, iSS - fr(0.3)), iFP + 1));
    const strideM = aRel[iFP][0] - atSetup(i => aRel[i][0]);
    M.stride_len = toIn(strideM);
    const dA = strideM, dB = aRel[iFP][1] - atSetup(i => aRel[i][1]);
    M.stride_dir = hasStride && Math.abs(dA) > 0.06 ? deg(Math.atan2(-dB, dA)) : null;
    const hipFromBack = i => -L.ban(i)[0], spanA = i => aRel[i][0];
    M.weight_fp = 100 * clampN(hipFromBack(iFP) / (spanA(iFP) || 1e-6), -0.5, 1.5);
    M.sep_fp = sep[iFP];
    M.sep_max = Math.max(...sep.slice(iL, iC + 1));
    M.early_open = shO[iFP];
    const hp = peakAt(hipV, iL, Math.min(n - 1, iC + fr(0.05))), spk = peakAt(shV, iL, Math.min(n - 1, iC + fr(0.05))), hdp = peakAt(hvR, iL, Math.min(n - 1, iC + fr(0.03)));
    const ms = x => x * dtR * 1000;
    // Hips → shoulders: the time shift that best lines up the two rotation-speed curves (each scaled to its own peak).
    // Using the whole curve is much steadier than comparing two single peak frames.
    const lagOf = (a, b, from, to, maxLag) => {
      const pa = Math.max(1e-6, ...a.slice(from, to + 1)), pb = Math.max(1e-6, ...b.slice(from, to + 1)), sc = [];
      for (let Lg = -maxLag; Lg <= maxLag; Lg++) {
        let s = 0;
        for (let i = from; i <= to; i++) { const j = i + Lg; if (j >= from && j <= to) s += Math.max(0, a[i] / pa) * Math.max(0, b[j] / pb); }
        sc.push(s);
      }
      const k = sc.indexOf(Math.max(...sc));
      const d = k > 0 && k < sc.length - 1 ? sc[k - 1] - 2 * sc[k] + sc[k + 1] : 0;
      return k - maxLag + (d ? clampN((0.5 * (sc[k - 1] - sc[k + 1])) / d, -0.5, 0.5) : 0);
    };
    M.sequence = { hipToSh: ms(lagOf(hipV, shV, iL, Math.min(n - 1, iC + fr(0.05)), fr(0.15))), shToHands: ms(hdp.x - spk.x) };
    M.hip_speed = hp.v; M.sh_speed = spk.v;
    M.speed_gain = hp.v > 50 ? spk.v / hp.v : null;
    M.hip_open_contact = hipO[iC];
    // Head: forward/sideways measured from the planted back foot; up/down from the front foot (the back heel lifts).
    const headRel = i => sub(head(i), L.ban(i)), hd0 = atSetup(headRel), hdC = headRel(iC);
    const headUp = i => head(i)[2] - L.an(i)[2];
    M.head_drift = toIn(hdC[0] - hd0[0]);
    M.head_drop = toIn(headUp(iC) - atSetup(headUp));
    M.head_lateral = toIn(hdC[1] - hd0[1]);
    M.posture_change = hinge(iC) - M.hinge_setup;
    M.tilt_contact = (() => { const v = sub(L.sh(iC), L.bsh(iC)); return deg(Math.atan2(v[2], Math.hypot(v[0], v[1]))); })();
    M.front_block = leadKnee(iC) - leadKnee(iFP);
    M.lead_knee_contact = leadKnee(iC);
    M.back_collapse = toIn(L.an(iC)[2] - L.an(iFP)[2]);      // hip center height above the planted front foot: FP minus contact
    const iMid = Math.round(iS + (iC - iS) * 0.5);
    // How far the hands are from your body (the spine line, hips → shoulders) halfway through the swing vs at its start.
    const handR = i => { const u = norm(sm(i)), h = hands(i); return len(sub(h, mul(u, dot(h, u)))); };
    const iQ = Math.round(iS + (iC - iS) * 0.6);
    M.hands_close = handR(iQ) / (handR(iS) || 1e-6);
    M.back_elbow_mid = backElbow(iMid);
    M.extension = Math.max(...rng.slice(iC, Math.min(n - 1, iC + fr(0.13)) + 1).map(backElbow));
    M.swing_time = ms(iC - iS);
    M.hand_speed = hdp.v * 2.23694;
    const feetMidA = i => (aRel[i][0]) / 2, headA = i => headRel(i)[0];
    M.finish_balance = (headA(iF) - feetMidA(iF)) / (Math.max(0.2, feetW(iF)));
    M.back_foot_step = toIn(len(sub(aRel[iF], aRel[iC])));

    /* ---------- Grade every measurement ---------- */
    const view = O.view, lowFps = dtR > 0.02;
    const status = (v, d) => (v == null || !Number.isFinite(v) ? 'na' : v >= d.good[0] && v <= d.good[1] ? 'good' : v >= d.ok[0] && v <= d.ok[1] ? 'ok' : 'work');
    const strideGood = [0, 0.2 * heightM * IN], strideOk = [-1.5, 0.27 * heightM * IN];
    const metrics = Object.entries(DEF).map(([key, d]) => {
      const v = M[key];
      let rel = d.rel[view] || 'med', st, value = v;
      if ((key === 'sequence' || key === 'swing_time' || key === 'speed_gain') && lowFps && rel === 'high') rel = 'med';
      if (key === 'sequence') {
        value = v;
        st = v.hipToSh < -25 ? 'work' : v.hipToSh < 5 ? 'ok' : v.hipToSh > 130 ? 'ok' : v.shToHands < -30 ? 'ok' : 'good';
      } else if (key === 'stride_len') {
        st = v == null ? 'na' : v <= 2 ? 'info' : v >= strideGood[0] && v <= strideGood[1] ? 'good' : v >= strideOk[0] && v <= strideOk[1] ? 'ok' : 'work';
      } else if (d.info) st = v == null || !Number.isFinite(v) ? 'na' : 'info';
      else st = status(v, d);
      if (rel === 'low' && st !== 'na' && st !== 'info') st = 'check';
      return { key, cat: d.cat, label: d.label, unit: d.unit, value, status: st, rel, target: key === 'stride_len' ? [strideGood, strideOk] : d.good ? [d.good, d.ok] : null };
    });
    const byKey = Object.fromEntries(metrics.map(m => [m.key, m]));
    const pts = { good: 100, ok: 68, work: 30 };
    const cats = {};
    for (const [c, [name, w]] of Object.entries(CATS)) {
      const ms2 = metrics.filter(m => m.cat === c && pts[m.status] != null);
      const tw = ms2.reduce((s, m) => s + (DEF[m.key].w || 0.5) * (m.rel === 'high' ? 1 : 0.7), 0);
      cats[c] = { name, weight: w, score: ms2.length ? Math.round(ms2.reduce((s, m) => s + pts[m.status] * (DEF[m.key].w || 0.5) * (m.rel === 'high' ? 1 : 0.7), 0) / tw) : null };
    }
    const scored = Object.values(cats).filter(c => c.score != null);
    const score = Math.round(scored.reduce((s, c) => s + c.score * c.weight, 0) / (scored.reduce((s, c) => s + c.weight, 0) || 1));

    /* ---------- Problems, strengths and drills ---------- */
    const sevOf = (m, strong) => (m.status === 'work' ? (strong ? 3 : 2) : m.status === 'ok' ? 1 : 0);
    const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
    const faults = [];
    const addF = (id, sev, evidence, key) => { if (sev > 0) faults.push({ id, sev, evidence, key }); };
    const m = byKey;
    if (m.head_drift.status === 'work' || m.head_drop.status === 'work' || m.head_lateral.status === 'work') {
      const parts = [];
      if (m.head_drift.status === 'work') parts.push(`${f1(Math.abs(M.head_drift))} in ${M.head_drift > 0 ? 'toward the pitcher' : 'back toward the catcher'}`);
      if (m.head_drop.status === 'work') parts.push(`${f1(Math.abs(M.head_drop))} in ${M.head_drop < 0 ? 'down' : 'up'}`);
      if (m.head_lateral.status === 'work') parts.push(`${f1(Math.abs(M.head_lateral))} in ${M.head_lateral > 0 ? 'toward the plate' : 'away from the plate'}`);
      addF('head', Math.abs(M.head_drift) > 10 || Math.abs(M.head_drop) > 8 ? 3 : 2, `Your head moved ${parts.join(' and ')} between your stance and contact. Good hitters keep it within about 3–4 inches.`, 'head_drift');
    }
    if (m.weight_fp.status === 'work' && M.weight_fp > 70) addF('lunge', M.weight_fp > 85 ? 3 : 2, `${Math.round(M.weight_fp)}% of the way to your front foot when it landed — your weight got out in front before the swing started. Aim for about 40–60%.`, 'weight_fp');
    else if (m.head_drift.status === 'work' && M.head_drift > 7.5 && m.weight_fp.status !== 'check' && M.weight_fp > 60) addF('lunge', 2, `Your head drifted ${f1(M.head_drift)} in forward and your weight was ${Math.round(M.weight_fp)}% of the way to your front foot when it landed — you're lunging toward the pitcher.`, 'head_drift');
    if (m.early_open.status === 'work') addF('early_open', M.early_open > 30 ? 3 : 2, `Your shoulders had already turned ${Math.round(M.early_open)}° open when your front foot landed. They should still be closed — about where they were in your stance.`, 'early_open');
    // Separation at the exact moment of foot plant is touchy, so it only counts when the peak separation is also low.
    if (m.sep_max.status === 'work' || (m.sep_fp.status === 'work' && m.sep_max.status === 'ok')) addF('no_sep', m.sep_max.status === 'work' ? 2 : 1, `Only ${Math.round(M.sep_max)}° of separation between your hips and shoulders at most (${Math.round(M.sep_fp)}° when your front foot landed). Strong hitters get about 20–45°.`, 'sep_max');
    if (m.sequence.status === 'work') addF('sequence', 3, `Your shoulders reached top speed ${Math.round(-M.sequence.hipToSh)} ms before your hips. The hips should lead.`, 'sequence');
    else if (m.sequence.status === 'ok' && M.sequence.hipToSh < 6 && m.sequence.rel !== 'low') addF('sequence', 1, `Your hips and shoulders peaked almost together (${Math.round(M.sequence.hipToSh)} ms apart) — they're turning as one piece. Hips should peak about 20–60 ms first.`, 'sequence');
    if (m.hands_close.status === 'work' || m.back_elbow_mid.status === 'work' || (m.hands_close.status === 'ok' && m.back_elbow_mid.status === 'ok')) {
      const far = Math.round((M.hands_close - 1) * 100);
      addF('cast', M.hands_close > 1.35 || M.back_elbow_mid > 155 ? 3 : m.hands_close.status === 'work' || m.back_elbow_mid.status === 'work' ? 2 : 1,
        `Halfway to contact your hands were ${far > 0 ? `${far}% farther from your body than when the swing started` : 'already moving out'} and your back elbow was ${Math.round(M.back_elbow_mid)}° open — the hands are pushing out early instead of staying inside the ball.`, 'hands_close');
    }
    if (m.extension.status === 'work') addF('extension', 2, `Your arms only reached ${Math.round(M.extension)}° after contact. Full extension is about 160–180°.`, 'extension');
    if (m.front_block.status === 'work' || m.lead_knee_contact.status === 'work') addF('block', 2, `Your front knee ${M.front_block < 0 ? `bent another ${Math.round(-M.front_block)}°` : `only straightened ${Math.round(M.front_block)}°`} from foot plant to contact (${Math.round(M.lead_knee_contact)}° at contact). It should firm up.`, 'front_block');
    if (m.back_collapse.status === 'work' || (m.back_collapse.status === 'ok' && M.head_drop <= -3.5)) addF('collapse', m.back_collapse.status === 'work' ? 2 : 1, `Your hips dropped ${f1(M.back_collapse)} in from foot plant to contact${M.head_drop <= -3.5 ? ` and your head dropped ${f1(-M.head_drop)} in` : ''} — you're sinking under the ball instead of staying tall.`, 'back_collapse');
    if (M.stride_dir != null && m.stride_dir.status === 'work') addF(M.stride_dir > 0 ? 'stride_open' : 'stride_closed', 2, `Your stride went ${Math.round(Math.abs(M.stride_dir))}° ${M.stride_dir > 0 ? 'away from' : 'toward'} the plate. Straight at the pitcher (within about 10°) is best.`, 'stride_dir');
    if (m.stride_len.status === 'work' && M.stride_len > 0) addF('overstride', 2, `Your stride was ${f1(M.stride_len)} in — long for your height. A shorter stride keeps your head and eyes steady.`, 'stride_len');
    if (m.posture_change.status === 'work') addF('posture', 2, `Your spine angle changed ${Math.round(Math.abs(M.posture_change))}° by contact — you ${M.posture_change < 0 ? 'stood up (pulled off)' : 'tipped over the plate'}.`, 'posture_change');
    if (m.finish_balance.status === 'work' || (m.back_foot_step.status === 'work' && m.back_foot_step.rel !== 'low')) addF('balance', 1, m.finish_balance.status === 'work' ? `At your finish your head was well outside your feet — you were falling ${M.finish_balance > 0 ? 'forward' : 'back'}.` : `Your back foot moved ${f1(M.back_foot_step)} in after contact to catch your balance.`, 'finish_balance');
    if (m.swing_time.status === 'work' && M.swing_time > DEF.swing_time.good[1]) addF('slow', M.swing_time > 300 ? 2 : 1, `${Math.round(M.swing_time)} ms from swing start to contact. Under about 190 ms gives you more time to see the pitch.`, 'swing_time');
    if (m.load_hands.status === 'work' && M.load_hands < 0.5 && M.coil < 2) addF('load', 1, `Your hands moved back only ${f1(Math.max(0, M.load_hands))} in and your shoulders barely coiled — there's no real load.`, 'load_hands');
    if (m.stance_width.status === 'work' || m.knee_setup.status === 'work') addF('stance', 1, m.knee_setup.status === 'work' ? `Your knees were at ${Math.round(M.knee_setup)}° in your stance (${M.knee_setup > 166 ? 'too straight' : 'very deep'}).` : `Your feet were ${f1(M.stance_width)}× shoulder width apart (${M.stance_width < 1.15 ? 'narrow' : 'wide'}).`, 'stance_width');
    const IMPORTANCE = { sequence: 1.3, early_open: 1.25, lunge: 1.25, head: 1.2, no_sep: 1.1, cast: 1.1, block: 1, extension: 0.9, collapse: 0.9, stride_open: 0.9, stride_closed: 0.9, posture: 0.85, overstride: 0.8, slow: 0.7, balance: 0.7, load: 0.6, stance: 0.5 };
    faults.forEach(f => { f.rank = f.sev * (IMPORTANCE[f.id] || 0.8); });
    faults.sort((a, b) => b.rank - a.rank);

    const GOOD_TEXT = {
      head_drift: () => `Your head stays still toward the pitcher (${f1(Math.abs(M.head_drift))} in)`,
      head_drop: () => `Your eye level stays steady (${f1(Math.abs(M.head_drop))} in up or down)`,
      sep_fp: () => `Good hip-shoulder separation at foot plant (${Math.round(M.sep_fp)}°)`,
      sep_max: () => `Good hip-shoulder stretch (${Math.round(M.sep_max)}°)`,
      sequence: () => `Your hips lead the swing (${Math.round(M.sequence.hipToSh)} ms before the shoulders)`,
      early_open: () => 'Your front shoulder stays closed until your foot lands',
      weight_fp: () => `Your weight is centered when your foot lands (${Math.round(M.weight_fp)}%)`,
      hands_close: () => 'Your hands stay close to your body early in the swing',
      extension: () => `Full extension after contact (${Math.round(M.extension)}°)`,
      front_block: () => 'Your front leg firms up to stop your forward move',
      back_collapse: () => 'You stay tall through contact',
      stride_dir: () => 'You stride straight at the pitcher',
      swing_time: () => `A quick swing (${Math.round(M.swing_time)} ms to contact)`,
      finish_balance: () => 'You finish balanced',
      posture_change: () => 'Your spine angle holds through contact',
      stance_width: () => 'An athletic, balanced stance'
    };
    const strengths = metrics.filter(x => x.status === 'good' && GOOD_TEXT[x.key] && x.rel !== 'low')
      .sort((a, b) => (DEF[b.key].w || 0.5) - (DEF[a.key].w || 0.5)).slice(0, 4).map(x => GOOD_TEXT[x.key]());

    const drills = pickDrills(faults);
    const otherViews = [];
    const lows = metrics.filter(x => x.status === 'check').map(x => x.label.toLowerCase());
    if (lows.length) otherViews.push(`${view === 'side' ? 'Film from the front or back' : 'Film from the side'} to check: ${lows.join(', ')}.`);

    // Confidence in the whole analysis.
    let confidence = D.detected >= 0.9 && dtR <= 0.021 ? 'high' : D.detected >= 0.75 && dtR <= 0.042 ? 'medium' : 'low';
    if (shortSetup && confidence === 'high') confidence = 'medium';
    const notes = [];
    if (shortSetup) notes.push('The video starts after your swing had already begun — start filming a couple of seconds before the pitch so your stance is measured.');
    if (dtR > 0.03) notes.push('This video has few frames per second, so fast moments (hip and shoulder timing) are rough. Film in 60 fps or slow motion for the best results.');
    if (O.warnings.includes('flip')) notes.push('The camera angle or batting side may be set wrong — double-check them if the results look off.');
    if (!hasStride) notes.push('No stride was detected (a no-stride or toe-tap swing), so foot plant is estimated from when your swing started.');

    // Time series for the charts (ms from contact), and a compact stick figure for the replay.
    const keep = rng.filter(i => i >= Math.max(0, iSS - fr(0.4)) && i <= iF);
    const tr = i => Math.round((i - iC) * dtR * 1000);
    const r1 = v => Math.round(v * 10) / 10;
    const headPath = keep.map(i => { const hr = sub(headRel(i), hd0); return view === 'side' ? [r1(toIn(hr[0])), r1(toIn(hr[2]))] : [r1(toIn(hr[1])), r1(toIn(hr[2]))]; });
    const series = { t: keep.map(tr), hip: keep.map(i => r1(hipO[i])), sh: keep.map(i => r1(shO[i])), hipV: keep.map(i => Math.round(hipV[i])), shV: keep.map(i => Math.round(shV[i])),
      hand: keep.map(i => r1(hvR[i] * 2.23694)), head: headPath };
    const q = v => Math.round(v * 1000) / 1000;
    const shown = rng.filter(i => i >= Math.max(0, iSetEnd - fr(0.5)) && i <= iF);
    const track = { t: shown.map(tr), aspect: O.aspect, pts: shown.map(i => TRACK_JOINTS.map(j => [q(D.P[i][j][0]), q(D.P[i][j][1])])) };
    const ev = { setup: setupIdx[setupIdx.length - 1], load: iL, strideStart: iSS, footPlant: iFP, swingStart: iS, contact: iC, finish: iF };
    const evT = Object.fromEntries(Object.entries(ev).map(([k, i]) => [k, D.t[i]]));
    const timing = { loadMs: Math.round((iL - Math.min(iL, iSS)) * dtR * 1000), strideMs: hasStride ? Math.round((iFP - iSS) * dtR * 1000) : null,
      fpToContactMs: Math.round((iC - iFP) * dtR * 1000), swingMs: Math.round((iC - iS) * dtR * 1000), fps: Math.round(1 / dtR) };
    return { version: VERSION, view, viewAuto: O.auto, bats: O.bats, speed, speedAuto, confidence, detected: Math.round(D.detected * 100), heightIn: opts.heightIn || null,
      score, cats, metrics, faults, strengths, drills, otherViews, notes, events: ev, eventTimes: evT, timing, series, track, hasStride };
  }

  // Up to 5 drills for your top problems: the most targeted drills first, alternating alone and partner drills.
  function pickDrills(faults) {
    if (typeof DRILLS === 'undefined') return [];
    const out = [], used = new Set();
    for (const f of faults.slice(0, 3)) {
      const list = DRILLS.filter(d => d.fixes.includes(f.id) && !used.has(d.id)).sort((a, b) => a.fixes.length - b.fixes.length || (a.who === 'solo' ? -1 : 1));
      const pick = [list.find(d => d.who === 'solo'), list.find(d => d.who === 'partner')].filter(Boolean).slice(0, f.sev >= 2 ? 2 : 1);
      for (const d of pick) { used.add(d.id); out.push({ id: d.id, fault: f.id }); }
    }
    return out.slice(0, 5);
  }

  /* ======================= 4. Tracking your video (browser only) ======================= */
  // The body model runs on the phone: the video is played (muted, off screen) and every frame is handed to MediaPipe.
  const MP = 'vendor/mediapipe-1.0.1/';
  const MP_FILES = [['vision_bundle.mjs', 155393], ['vision_wasm_internal.js', 323377], ['vision_wasm_internal.wasm', 11756954], ['pose_landmarker_full.task', 9398198]];
  const MAX_FRAMES = 720;                 // frames measured per swing (e.g. 12 s of 60 fps)
  const oops = (code, detail) => Object.assign(new Error(code), { code, detail });
  let model = null, modelMs = 40, loadingModel = null, checked = false;
  let ts = 0;                              // the model needs ever-increasing timestamps (ms), across every video

  // Can this browser run it? (WebAssembly with SIMD — iOS 16.4+, Chrome/Android from 2021 on.)
  function supported() {
    if (typeof WebAssembly !== 'object' || typeof HTMLVideoElement === 'undefined') return 'old';
    try { if (!WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]))) return 'old'; } catch (e) { return 'old'; }
    return '';
  }

  async function makeModel(delegate) {
    const vision = await import('./' + MP + 'vision_bundle.mjs');
    const m = await vision.PoseLandmarker.createFromOptions({ wasmLoaderPath: MP + 'vision_wasm_internal.js', wasmBinaryPath: MP + 'vision_wasm_internal.wasm' }, {
      baseOptions: { modelAssetPath: MP + 'pose_landmarker_full.task', delegate }, runningMode: 'VIDEO', numPoses: 2,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
    });
    m.delegate = delegate;
    return m;
  }
  // Milliseconds per frame (the first run also warms the model up).
  function timeModel(ctx, cv, v) {
    const times = [];
    for (let i = 0; i < 3; i++) { const a = performance.now(); detectAll(ctx, cv, v, ++ts); times.push(performance.now() - a); }
    return Math.max(8, Math.min(times[1], times[2]));
  }

  // Downloads the model files the first time (about 21 MB; the service worker keeps them), then starts the model.
  function loadModel(onProgress = () => {}, delegate = 'GPU') {
    if (model) return Promise.resolve(model);
    if (loadingModel) return loadingModel;
    loadingModel = (async () => {
      const total = MP_FILES.reduce((t, [, b]) => t + b, 0);
      let got = 0;
      for (const [f] of MP_FILES) {
        let res;
        try { res = await fetch(MP + f); } catch (e) { throw oops('offline'); }
        if (!res.ok) throw oops('offline');
        if (res.body && res.body.getReader) {
          const rd = res.body.getReader();
          for (;;) { const { done, value } = await rd.read(); if (done) break; got += value.length; onProgress(Math.min(1, got / total)); }
        } else { got += (await res.arrayBuffer()).byteLength; onProgress(Math.min(1, got / total)); }
      }
      if (delegate === 'GPU') { try { model = await makeModel('GPU'); } catch (e) { model = null; } }
      if (!model) model = await makeModel('CPU');
      return model;
    })().catch(e => { loadingModel = null; throw e.code ? e : oops('model', e && e.message); });
    return loadingModel;
  }

  const waitFor = (el, ev, ms, bad) => new Promise((resolve, reject) => {
    const t = setTimeout(() => { el.removeEventListener(ev, ok); resolve(false); }, ms);
    const ok = () => { clearTimeout(t); el.removeEventListener('error', fail); resolve(true); };
    const fail = () => { clearTimeout(t); el.removeEventListener(ev, ok); reject(bad); };
    el.addEventListener(ev, ok, { once: true });
    if (bad) el.addEventListener('error', fail, { once: true });
  });
  // Jump to time t and wait until that frame can be drawn.
  const seek = async (v, t) => {
    if (Math.abs(v.currentTime - t) < 1e-4 && v.readyState >= 2) return;
    const shown = 'requestVideoFrameCallback' in v ? new Promise(r => { v.requestVideoFrameCallback(() => r()); setTimeout(r, 400); }) : null;
    const p = waitFor(v, 'seeked', 4000);
    v.currentTime = t;
    await p;
    if (shown) await shown;
  };

  // Opens the video file in a player on the page (iPhones only decode, and keep playing, videos that are on screen).
  // host() gives the element to show it in (the progress screen); without one it's a tiny dot in the corner.
  async function openVideo(file, host) {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    const place = () => {
      const h = host && host();
      if (h && h.isConnected) {
        if (v.parentNode !== h) { h.prepend(v); v.style.cssText = ''; v.className = 'sw-video'; }
      } else if (v.parentNode !== document.body) {
        document.body.appendChild(v);
        v.className = ''; v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1';
      }
    };
    place();
    const close = () => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* already gone */ } v.remove(); URL.revokeObjectURL(url); };
    try {
      const loaded = waitFor(v, 'loadeddata', 20000, oops('video'));
      v.src = url;
      if (!(await loaded) || !v.videoWidth) throw oops('video');
    } catch (e) { close(); throw e.code ? e : oops('video'); }
    return { v, close, place, w: v.videoWidth, h: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : null };
  }

  // One frame → everyone the model sees clearly: [{ lm: 33 × [x, y, visibility], w: 33 × [x, y, z], hip, size }].
  // Shaky "people" it half-sees (in trees, shadows) are skipped.
  const BODY = [11, 12, 23, 24, 25, 26, 27, 28];
  function detectAll(ctx, cv, v, ts) {
    ctx.drawImage(v, 0, 0, cv.width, cv.height);
    const r = model.detectForVideo(cv, ts), L = r.landmarks || [], Wl = r.worldLandmarks || [], out = [];
    for (let i = 0; i < Math.min(L.length, Wl.length); i++) {
      const p = L[i], vis = q => (q.visibility == null ? 1 : q.visibility);
      const quality = BODY.reduce((acc, j) => acc + vis(p[j]), 0) / BODY.length;
      if (quality < 0.35) continue;
      const ys = p.map(q => q.y);
      out.push({ lm: p.map(q => [q.x, q.y, vis(q)]), w: Wl[i].map(q => [q.x, q.y, q.z]), hip: [(p[23].x + p[24].x) / 2, (p[23].y + p[24].y) / 2], size: (Math.max(...ys) - Math.min(...ys)) * quality });
    }
    return out;
  }

  // Joins each frame's people into tracks (the same person from frame to frame: a hip can't jump across the picture),
  // then picks the hitter: the track with the fastest hands that are together on a bat. A coach, catcher or someone
  // walking past can't take over. times[i], cands[i] = detectAll() result (or null). Returns the chosen track's
  // person per frame (null where it wasn't seen), plus where its swing is.
  function pickHitter(times, cands, aspect) {
    const tracks = [];
    for (let i = 0; i < cands.length; i++) {
      const cs = cands[i] || [], used = new Set();
      const live = tracks.filter(tk => times[i] - times[tk.last] < 0.6).sort((a, b) => b.n - a.n);
      for (const tk of live) {
        let best = -1, bd = Infinity;
        cs.forEach((c, j) => { if (!used.has(j)) { const d = Math.hypot(c.hip[0] - tk.hip[0], c.hip[1] - tk.hip[1]); if (d < bd) { bd = d; best = j; } } });
        if (best >= 0 && bd <= 0.12 + (times[i] - times[tk.last])) { used.add(best); tk.at[i] = cs[best]; tk.hip = cs[best].hip; tk.last = i; tk.n++; tk.size += cs[best].size; }
      }
      cs.forEach((c, j) => { if (!used.has(j)) tracks.push({ at: { [i]: c }, hip: c.hip, last: i, n: 1, size: c.size }); });
    }
    const xy = (c, j) => [c.lm[j][0] * aspect, c.lm[j][1]];
    const swing = (tk, strict) => {
      const idx = Object.keys(tk.at).map(Number).sort((a, b) => a - b);
      const body = Math.max(0.1, med(idx.map(i => Math.abs(tk.at[i].lm[0][1] - (tk.at[i].lm[27][1] + tk.at[i].lm[28][1]) / 2))));
      const apart = c => { const sh = mid([...xy(c, 11), 0], [...xy(c, 12), 0]), hp = mid([...xy(c, 23), 0], [...xy(c, 24), 0]); return Math.hypot(xy(c, 15)[0] - xy(c, 16)[0], xy(c, 15)[1] - xy(c, 16)[1]) / Math.max(1e-3, Math.hypot(sh[0] - hp[0], sh[1] - hp[1])); };
      const rel = c => { const h = mid([...xy(c, 15), 0], [...xy(c, 16), 0]), f = mid([...xy(c, 27), 0], [...xy(c, 28), 0]); return [h[0] - f[0], h[1] - f[1]]; };
      let best = { v: 0, t: null };
      for (let k = 1; k < idx.length; k++) {
        const a = tk.at[idx[k - 1]], b = tk.at[idx[k]], dt = times[idx[k]] - times[idx[k - 1]];
        if (dt <= 0 || dt > 0.4 || (strict && (apart(a) > 0.7 || apart(b) > 0.7))) continue;
        const ra = rel(a), rb = rel(b), v = Math.hypot(rb[0] - ra[0], rb[1] - ra[1]) / body / dt;
        if (v > best.v) best = { v, t: (times[idx[k]] + times[idx[k - 1]]) / 2, k };
      }
      return best;
    };
    const total = cands.filter(c => c && c.length).length;
    const keep = tracks.filter(tk => tk.n >= Math.max(3, 0.2 * total));
    let scored = keep.map(tk => ({ tk, sw: swing(tk, true) }));
    if (!scored.some(x => x.sw.v > 0)) scored = keep.map(tk => ({ tk, sw: swing(tk, false) }));      // wrists too blurry to tell
    if (!scored.length) return null;
    // The swing decides; if nobody swings, the biggest, most-seen person.
    scored.sort((a, b) => b.sw.v - a.sw.v || b.tk.size - a.tk.size);
    const top = scored[0], alt = scored.slice().sort((a, b) => b.tk.size - a.tk.size)[0];
    const pick = top.sw.v > 0 ? top : alt;
    return { at: pick.tk.at, swingAt: pick.sw.t, speed: pick.sw.v, idx: Object.keys(pick.tk.at).map(Number).sort((a, b) => a - b) };
  }

  // For the live picture: the person closest to the one shown last (or the biggest); null if nobody's there.
  const nearest = (cs, last) => (cs && cs.length ? cs.reduce((b, c) => (last ? Math.hypot(c.hip[0] - last.hip[0], c.hip[1] - last.hip[1]) < Math.hypot(b.hip[0] - last.hip[0], b.hip[1] - last.hip[1]) : c.size > b.size) ? c : b, cs[0]) : null);
  const showLive = (cs, st, onPose) => { const c = nearest(cs, st.last); if (c) st.last = c; onPose(c ? c.lm : null); };

  // Plays [t0, t1] at `rate`, calling onFrame(mediaTime, presentedFrames) for each frame the browser shows.
  // (Falls back to stepping through with seeks where frame callbacks don't exist.)
  function playRange(vid, t0, t1, rate, onFrame, signal, step) {
    const v = vid.v;
    if (!('requestVideoFrameCallback' in v)) {
      return (async () => {
        for (let t = t0; t <= t1 + 1e-6; t += step) {
          if (signal && signal.aborted) throw oops('cancelled');
          await seek(v, t);
          onFrame(t, 0);
          await new Promise(r => setTimeout(r, 0));
        }
      })();
    }
    return new Promise((resolve, reject) => {
      let over = false, lastT = -1, lastSeen = Date.now();
      const stop = err => {
        if (over) return;
        over = true; clearInterval(dog); v.pause(); v.removeEventListener('ended', onEnd);
        if (err) reject(err); else resolve();
      };
      const onEnd = () => stop();
      const tick = (now, meta) => {
        if (over) return;
        if (signal && signal.aborted) { stop(oops('cancelled')); return; }
        const t = meta.mediaTime;
        if (t > lastT + 1e-6) {
          lastT = t; lastSeen = Date.now();
          try { onFrame(t, meta.presentedFrames); } catch (e) { stop(e); return; }
        }
        if (t >= t1 - 1e-6) { stop(); return; }
        v.requestVideoFrameCallback(tick);
      };
      // If the phone paused the video (app in the background), start it again; if nothing moves for 12 s, give up.
      const dog = setInterval(() => {
        if (over) return;
        if (signal && signal.aborted) { stop(oops('cancelled')); return; }
        if (typeof document !== 'undefined' && document.hidden) { lastSeen = Date.now(); return; }
        vid.place();                                      // the progress screen was redrawn: move the player back in
        if (v.paused && !v.ended) v.play().catch(() => {});
        if (Date.now() - lastSeen > 12000) stop(lastT >= 0 ? null : oops('video'));
      }, 1000);
      v.addEventListener('ended', onEnd);
      seek(v, t0).then(() => {
        try { v.playbackRate = rate; } catch (e) { v.playbackRate = rate < 0.5 ? 0.5 : 1; }
        v.requestVideoFrameCallback(tick);
        return v.play();
      }).catch(e => stop(e && e.code ? e : oops('video')));
    });
  }

  // Tracks the body through the swing. Returns frames on an even time grid (null where nobody was found) for analyze().
  // onPose(points) gets each frame's body points (or null) as they're found, to draw them live.
  async function track(file, { onProgress = () => {}, onPose = () => {}, signal, delegate, host } = {}) {
    if (supported()) throw oops('old');
    await loadModel(f => onProgress('model', f), delegate);
    if (signal && signal.aborted) throw oops('cancelled');
    const vid = await openVideo(file, host);
    try {
      const { v } = vid, dur = vid.duration || 60;
      const sc = Math.min(1, 640 / Math.max(vid.w, vid.h));
      const cv = document.createElement('canvas');
      cv.width = Math.max(2, Math.round(vid.w * sc)); cv.height = Math.max(2, Math.round(vid.h * sc));
      const ctx = cv.getContext('2d');
      let tsBase = ts + 1000;
      const stamp = t => (ts = Math.max(ts + 1, Math.round(t * 1000) + tsBase));

      // How long the model takes per frame. Some phones' graphics path is slower than their processor: the first
      // time, try both and keep the faster one.
      await seek(v, Math.min(0.05, dur / 2));
      modelMs = timeModel(ctx, cv, v);
      if (!checked && model.delegate === 'GPU' && modelMs > 120) {
        try {
          const cpu = await makeModel('CPU'), gpu = model;
          model = cpu;
          const cpuMs = timeModel(ctx, cv, v);
          if (cpuMs < modelMs) { gpu.close(); modelMs = cpuMs; } else { cpu.close(); model = gpu; }
        } catch (e) { /* keep the GPU one */ }
      }
      checked = true;
      tsBase = ts + 1000;

      // The video's frame rate: play a moment without doing any work and look at the frame times.
      const probe = [];
      await playRange(vid, 0, Math.min(dur, 0.6), 1, (t, pf) => probe.push([t, pf]), signal, 1 / 30).catch(e => { if (e.code === 'cancelled') throw e; });
      const gaps = [];
      for (let i = 1; i < probe.length; i++) { const dpf = probe[i][1] - probe[i - 1][1], dt = probe[i][0] - probe[i - 1][0]; if (dt > 0) gaps.push(dpf > 0 ? dt / dpf : dt); }
      let frameDt = med(gaps);
      if (!Number.isFinite(frameDt) || frameDt <= 0.002 || frameDt > 0.2) frameDt = 1 / 30;
      const common = [24, 25, 30, 48, 50, 60, 90, 100, 120, 240].find(r => Math.abs(1 / frameDt / r - 1) < 0.04);
      if (common) frameDt = 1 / common;                       // 59.9 → 60 (frame times are rounded)

      // 1) Long clip: a quick pass over everything to find the swing (the fastest hands).
      let t0 = 0, t1 = dur;
      if (dur > 6) {
        const times = [], cands = [], live = { last: null };
        await playRange(vid, 0, dur, clampN(0.1 / (1.2 * modelMs / 1000), 0.0625, 1), t => {
          const cs = detectAll(ctx, cv, v, stamp(t));
          times.push(t); cands.push(cs);
          showLive(cs, live, onPose);
          onProgress('find', Math.min(1, t / dur));
        }, signal, 0.1);
        tsBase = ts + 1000;
        const hit = pickHitter(times, cands, cv.width / cv.height);
        if (!hit) throw oops('nobody');
        const T = hit.swingAt != null ? hit.swingAt : times[hit.idx[Math.floor(hit.idx.length / 2)]];
        // Slow motion stretches the swing out: take a longer window. (How long the hands stay fast, on video.)
        const fastFor = (() => {
          if (hit.swingAt == null) return 0;
          const idx = hit.idx, sp = [];
          for (let k = 1; k < idx.length; k++) {
            const a = hit.at[idx[k - 1]], b = hit.at[idx[k]], dt = times[idx[k]] - times[idx[k - 1]], A = cv.width / cv.height;
            const h = c => [((c.lm[15][0] + c.lm[16][0]) / 2 - (c.lm[27][0] + c.lm[28][0]) / 2) * A, (c.lm[15][1] + c.lm[16][1]) / 2 - (c.lm[27][1] + c.lm[28][1]) / 2];
            sp.push([(times[idx[k]] + times[idx[k - 1]]) / 2, dt > 0 && dt <= 0.4 ? Math.hypot(h(b)[0] - h(a)[0], h(b)[1] - h(a)[1]) / dt : 0]);
          }
          const pk = sp.reduce((m, x) => (x[1] > m[1] ? x : m), [0, 0]);
          const fast = sp.filter(x => x[1] > pk[1] / 2 && Math.abs(x[0] - pk[0]) < 3);
          return fast.length ? Math.max(...fast.map(x => x[0])) - Math.min(...fast.map(x => x[0])) + 0.1 : 0;
        })();
        const slowish = fastFor > 0.45;
        t0 = Math.max(0, T - (slowish ? 14 : 5)); t1 = Math.min(dur, T + (slowish ? 6 : 2));
      }

      // 2) The swing window, frame by frame (every k-th frame if there are too many), played slowly enough for the
      // model to keep up.
      const k = Math.max(1, Math.ceil((t1 - t0) / frameDt / MAX_FRAMES)), step = frameDt * k;
      const n = Math.max(1, Math.floor((t1 - t0) / step + 1e-6) + 1);
      const rate = clampN(step / (1.35 * modelMs / 1000), 0.0625, 1);
      const cands = new Array(n).fill(null), times = Array.from({ length: n }, (_, i) => t0 + i * step), offs = [];
      const live = { last: null };
      let done = 0;
      await playRange(vid, t0, t1, rate, t => {
        const idx = Math.round((t - t0) / step);
        if (idx < 0 || idx >= n || cands[idx] || Math.abs(t - (t0 + idx * step)) > frameDt * 0.51) return;
        offs.push(t - (t0 + idx * step)); times[idx] = t;
        cands[idx] = detectAll(ctx, cv, v, stamp(t));
        showLive(cands[idx], live, onPose);
        onProgress('track', ++done / n);
      }, signal, step);
      // Frames the video moved past while the model was still busy (slower phones): go back for each one.
      const off = offs.length ? med(offs) : 0;
      tsBase = ts + 1000;
      for (let idx = 0; idx < n; idx++) {
        if (cands[idx]) continue;
        if (signal && signal.aborted) throw oops('cancelled');
        const t = t0 + idx * step + off;
        await seek(v, clampN(t + frameDt * 0.1, 0, dur));
        times[idx] = t;
        cands[idx] = detectAll(ctx, cv, v, stamp(t));
        showLive(cands[idx], live, onPose);
        onProgress('track', ++done / n);
      }
      const hit = pickHitter(times, cands, cv.width / cv.height);
      if (!hit) throw oops('nobody');
      const frames = times.map((t, i) => (hit.at[i] ? { t, lm: hit.at[i].lm, w: hit.at[i].w } : null));
      const got = frames.filter(Boolean).length;
      if (!got) throw oops('nobody');
      // Missing frames are simply gaps (the analysis fills them in); trim empty ends.
      let a = 0, b = n - 1;
      while (a < b && !frames[a]) a++;
      while (b > a && !frames[b]) b--;
      return { frames: frames.slice(a, b + 1).map((f, i) => f || null), aspect: cv.width / cv.height, fps: Math.round(1 / step), frameDt, step, window: [t0, t1],
        video: vid, delegate: model.delegate, modelMs: Math.round(modelMs) };
    } catch (e) { vid.close(); throw e; }
  }

  // Still pictures of the key moments (stance, load, foot plant, contact, finish) with your tracked skeleton drawn on,
  // cropped to you. Small JPEGs saved with the report.
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]];
  async function keyframes(tr, report, labels) {
    const { v } = tr.video, frames = tr.frames.filter(Boolean);
    if (!frames.length || !report || !report.eventTimes) return [];
    const xs = [], ys = [];
    frames.forEach(f => TRACK_JOINTS.forEach(j => { if (f.lm[j][2] > 0.3) { xs.push(f.lm[j][0]); ys.push(f.lm[j][1]); } }));
    const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
    let x0 = q(xs, 0.01), x1 = q(xs, 0.99), y0 = q(ys, 0.01), y1 = q(ys, 0.99);
    const padY = (y1 - y0) * 0.16, padX = padY * v.videoHeight / v.videoWidth;
    x0 = Math.max(0, x0 - padX); x1 = Math.min(1, x1 + padX); y0 = Math.max(0, y0 - padY); y1 = Math.min(1, y1 + padY * 0.6);
    // Keep the picture between tall (1:2) and wide (4:3) by taking in more of the video around you — never stretched.
    const fit = (lo, hi, want) => { const c = (lo + hi) / 2, h = Math.min(0.5, want / 2); let a = c - h, b = c + h; if (a < 0) { b -= a; a = 0; } if (b > 1) { a -= b - 1; b = 1; } return [Math.max(0, a), Math.min(1, b)]; };
    let asp = ((x1 - x0) * v.videoWidth) / ((y1 - y0) * v.videoHeight);
    if (asp < 0.5) [x0, x1] = fit(x0, x1, (0.5 * (y1 - y0) * v.videoHeight) / v.videoWidth);
    else if (asp > 4 / 3) [y0, y1] = fit(y0, y1, ((x1 - x0) * v.videoWidth) / (4 / 3) / v.videoHeight);
    const sw = (x1 - x0) * v.videoWidth, sh = (y1 - y0) * v.videoHeight;
    if (sw < 8 || sh < 8) return [];
    const H = 320, W = Math.round((H * sw) / sh);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const out = [];
    for (const [key, label] of labels) {
      const t = report.eventTimes[key];
      if (!Number.isFinite(t)) continue;
      await seek(v, clampN(t, 0, (tr.video.duration || t) - 0.001));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(v, x0 * v.videoWidth, y0 * v.videoHeight, sw, sh, 0, 0, W, H);
      const f = frames.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b), frames[0]);
      const P = j => [((f.lm[j][0] - x0) / (x1 - x0)) * W, ((f.lm[j][1] - y0) / (y1 - y0)) * H];
      const leadSide = report.bats === 'L' ? 0 : 1;             // right-handed hitters lead with their left side (odd points)
      ctx.lineCap = 'round'; ctx.lineWidth = 3;
      for (const [a, b] of BONES) {
        const lead = a % 2 === leadSide && b % 2 === leadSide;
        ctx.strokeStyle = lead ? 'rgba(255,149,0,0.95)' : 'rgba(90,200,250,0.95)';
        const pa = P(a), pb = P(b);
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      }
      const hd = P(0); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hd[0], hd[1], 7, 0, Math.PI * 2); ctx.stroke();
      let img = '';
      try { img = cv.toDataURL('image/jpeg', 0.72); } catch (e) { img = ''; }
      if (img) out.push({ key, label, img });
    }
    return out;
  }

  return { analyze, prepare, orient, supported, loadModel, track, openVideo, keyframes, DEF, CATS, LM, TRACK_JOINTS, BONES, VERSION, _math: { smooth, deriv, peakAt, jointAngle, unwrap } };
})();
