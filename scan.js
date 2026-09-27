/* scan.js — reads your pantry and fridge photos for Diet → Pantry.

   On this phone (free, private, works offline after a one-time download of about 24 MB — 12 MB if you've used the Swing lab):
     - Tesseract OCR (vendor/tesseract-7.0.0) reads the words on packages; pantry.js turns them into foods
       ("SKIPPY Creamy PEANUT BUTTER" → Peanut butter).
     - MediaPipe's object detector (vendor/mediapipe-1.0.1) spots whole fruit and vegetables it knows: bananas, apples,
       oranges, broccoli and carrots.
   With Claude (optional): if you add your own Anthropic API key in Settings, your photos are sent to Anthropic's API,
   which recognizes almost everything (and roughly how much is left). "Ask Claude for meal ideas" sends only your pantry
   list and your daily targets. Nothing is sent anywhere unless you tap one of those buttons. */

const SCAN = (() => {
  const TS = 'vendor/tesseract-7.0.0/', MP = 'vendor/mediapipe-1.0.1/', SDK = 'vendor/anthropic-sdk-0.128.0/anthropic.mjs';
  const MODEL = 'claude-opus-5';
  const ON_PHONE = [[TS + 'tesseract.esm.min.js', 63175], [TS + 'worker.min.js', 111269], [TS + 'tesseract-core-simd-lstm.wasm.js', 3899472],
    [TS + 'eng.traineddata.gz', 2952873], [MP + 'vision_bundle.mjs', 155393], [MP + 'vision_wasm_internal.js', 323377],
    [MP + 'vision_wasm_internal.wasm', 11756954], [MP + 'efficientdet_lite0.tflite', 4602795]];
  const oops = (code, detail) => Object.assign(new Error(code), { code, detail });
  const abs = p => new URL(p, location.href).href;
  const cancelled = signal => { if (signal && signal.aborted) throw oops('cancelled'); };

  // Needs WebAssembly with SIMD (iOS 16.4+, Chrome/Android from 2021 on) — same as the Swing lab.
  function supported() {
    try { return typeof WebAssembly === 'object' && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])) ? '' : 'old'; } catch (e) { return 'old'; }
  }

  // A photo → a canvas, turned the right way up, at most maxSide pixels on its long side.
  async function loadImage(file, maxSide) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const sc = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * sc)); cv.height = Math.max(1, Math.round(img.naturalHeight * sc));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv;
    } catch (e) { throw oops('image'); } finally { URL.revokeObjectURL(url); }
  }
  // Part of a canvas, enlarged so its long side is `side` pixels (small labels read better bigger).
  function crop(cv, x, y, w, h, side) {
    const sc = side / Math.max(w, h), out = document.createElement('canvas');
    out.width = Math.round(w * sc); out.height = Math.round(h * sc);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cv, x, y, w, h, 0, 0, out.width, out.height);
    return out;
  }
  // The whole photo plus four overlapping quarters.
  const views = (cv, side) => {
    const w = cv.width * 0.58, h = cv.height * 0.58;
    return [crop(cv, 0, 0, cv.width, cv.height, side), ...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => crop(cv, i * (cv.width - w), j * (cv.height - h), w, h, side))];
  };

  // Downloads what's missing the first time (the service worker keeps it), reporting progress 0–1.
  async function download(files, onProgress) {
    const total = files.reduce((t, [, b]) => t + b, 0);
    let got = 0;
    for (const [f] of files) {
      let res;
      try { res = await fetch(f); } catch (e) { throw oops('offline'); }
      if (!res.ok) throw oops('offline');
      if (res.body && res.body.getReader) {
        const rd = res.body.getReader();
        for (;;) { const { done, value } = await rd.read(); if (done) break; got += value.length; onProgress(Math.min(1, got / total)); }
      } else { got += (await res.arrayBuffer()).byteLength; onProgress(Math.min(1, got / total)); }
    }
  }

  /* ---------- On this phone ---------- */
  let reader = null, spotter = null, ready = null;
  function loadOnPhone(onProgress) {
    if (ready) return ready;
    ready = (async () => {
      await download(ON_PHONE, onProgress);
      const T = (await import(abs(TS + 'tesseract.esm.min.js'))).default;
      // One engine file (SIMD + LSTM) serves every phone Dugout supports.
      reader = await T.createWorker('eng', 1, { workerPath: abs(TS + 'worker.min.js'), corePath: abs(TS + 'tesseract-core-simd-lstm.wasm.js'),
        langPath: abs(TS).replace(/\/$/, ''), workerBlobURL: false, cacheMethod: 'none', gzip: true }, { debug_file: '/dev/null' });   // no log chatter in the console
      await reader.setParameters({ tessedit_pageseg_mode: '11' });          // sparse text: words anywhere in the picture
      const vision = await import(abs(MP + 'vision_bundle.mjs'));
      spotter = await vision.ObjectDetector.createFromOptions({ wasmLoaderPath: abs(MP + 'vision_wasm_internal.js'), wasmBinaryPath: abs(MP + 'vision_wasm_internal.wasm') },
        { baseOptions: { modelAssetPath: abs(MP + 'efficientdet_lite0.tflite'), delegate: 'CPU' }, runningMode: 'IMAGE', scoreThreshold: 0.4, maxResults: 30 });
    })().catch(e => { ready = null; throw e.code ? e : oops('model', e && e.message); });
    return ready;
  }
  const SHAPES = { banana: 'bananas', apple: 'apples', orange: 'oranges', broccoli: 'broccoli', carrot: 'carrots' };

  // photos → [{ id, how: 'label' | 'shape', n }] (n = how many times it was seen)
  async function onPhone(files, { onProgress = () => {}, signal } = {}) {
    if (supported()) throw oops('old');
    await loadOnPhone(f => onProgress('download', f));
    const found = new Map(), words = [];
    const add = (id, how) => { const x = found.get(id) || { id, how, n: 0 }; x.n++; if (how === 'label') x.how = 'label'; found.set(id, x); };
    for (let p = 0; p < files.length; p++) {
      cancelled(signal);
      const cv = await loadImage(files[p], 2000), parts = views(cv, 1600);
      for (let v = 0; v < parts.length; v++) {
        cancelled(signal);
        onProgress('read', (p + v / parts.length) / files.length);
        const { data } = await reader.recognize(parts[v]);
        const text = (data.words || []).filter(w => w.confidence >= 55).map(w => w.text).join(' ') || data.text || '';
        words.push(text);
        PANTRY.findInText(text, { strict: true }).forEach(id => add(id, 'label'));
        for (const det of spotter.detect(parts[v]).detections || []) {
          const c = (det.categories || [])[0], id = c && SHAPES[c.categoryName];
          if (id) add(id, 'shape');
        }
      }
    }
    onProgress('read', 1);
    return { items: [...found.values()], text: words.join('\n') };
  }

  /* ---------- With Claude (your API key) ---------- */
  let sdk = null;
  async function claude(key) {
    if (!sdk) {
      try { sdk = (await import(abs(SDK))).default; } catch (e) { throw oops('offline'); }
    }
    return new sdk({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 180000 });
  }
  function aiError(e) {
    const A = sdk;
    if (!A) return e && e.code ? e : oops('ai', e && e.message);
    if (e instanceof A.APIUserAbortError) return oops('cancelled');
    if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return oops('badkey');
    if (e instanceof A.RateLimitError) return oops('busy');
    if (e instanceof A.InternalServerError) return oops('busy');
    if (e instanceof A.APIConnectionError) return oops('offline');
    if (e instanceof A.BadRequestError) return oops(/credit balance/i.test(e.message) ? 'credit' : 'ai', e.message);
    if (e instanceof A.APIError) return oops('ai', e.message);
    return e && e.code ? e : oops('ai', e && e.message);
  }
  // One request with a JSON answer that must match `schema`. It streams, so a long answer can't time out and
  // onText(answer so far) can show progress. Medium effort: quick and cheap, and plenty for this.
  async function ask(key, system, content, schema, { signal, onText } = {}) {
    const client = await claude(key);
    let msg;
    try {
      const stream = client.beta.messages.stream({
        model: MODEL, max_tokens: 16000, thinking: { type: 'adaptive' },
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',          // if Claude declines, another model answers instead
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
        system, messages: [{ role: 'user', content }]
      }, { signal });
      if (onText) stream.on('text', (delta, soFar) => onText(soFar));
      msg = await stream.finalMessage();
    } catch (e) { throw aiError(e); }
    if (msg.stop_reason === 'refusal') throw oops('refused');
    if (msg.stop_reason === 'max_tokens') throw oops('ai', 'The answer was cut off');
    // After a fallback the answer starts over, so only read what came after the last switch.
    const from = msg.content.map(b => b.type).lastIndexOf('fallback') + 1;
    const text = msg.content.slice(from).filter(b => b.type === 'text').map(b => b.text).join('');
    try { return JSON.parse(text); } catch (e) { throw oops('ai', 'The answer could not be read'); }
  }
  // Settings → Claude AI: does Anthropic accept this key? (Listing models is free.)
  async function checkKey(key) {
    const client = await claude(key);
    try { await client.models.list({ limit: 1 }); } catch (e) { throw aiError(e); }
  }
  const countKey = (text, k) => (text.match(new RegExp(`"${k}"\\s*:`, 'g')) || []).length;

  const SHELVES = PANTRY_CATS.map(([k]) => k);
  const SCAN_SCHEMA = { type: 'object', additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'shelf', 'amount', 'sure'], properties: {
      id: { type: 'string', enum: [...PANTRY_ITEMS.map(it => it.id), 'other'] },
      name: { type: 'string' }, shelf: { type: 'string', enum: SHELVES }, amount: { type: 'string' }, sure: { type: 'boolean' } } } } } };
  const catalog = () => PANTRY_ITEMS.map(it => `${it.id}: ${it.name}`).join('\n');

  // photos → { items: [{ id, name, cat, amount, sure }] }
  async function withClaude(files, key, { onProgress = () => {}, signal } = {}) {
    const content = [];
    for (let p = 0; p < files.length; p++) {
      cancelled(signal);
      onProgress('prepare', p / files.length);
      const cv = await loadImage(files[p], 2048);           // sharp enough for small labels (Claude reads up to 2576 px; bigger costs more)
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.85).split(',')[1] } });
    }
    content.push({ type: 'text', text: `List the food and drinks you can see in ${files.length > 1 ? 'these photos' : 'this photo'}.

For each one give:
- id: the matching id from the list below, or "other" if nothing fits
- name: what it is, short and plain (for example "Greek yogurt", "Black beans")
- shelf: protein, dairy, grain, fruit, veg, can (cans, jars, sauces, spreads), spice (spices, baking), snack or other
- amount: roughly how much is left, in a few words ("about 8 eggs", "2 cans", "half a bag"), or "" if you can't tell
- sure: true if you can clearly see what it is, false if it's a guess (partly hidden, blurry, unlabeled)

List each food once even if it shows up in several photos. Skip empty containers, cooked leftovers you can't identify, and anything that isn't food.

Ids:
${catalog()}` });
    onProgress('ask', 0);
    const out = await ask(key, 'You look at photos of a kitchen — pantry shelves, fridge, freezer, counter — for a meal-planning app used by a young baseball player. You identify the food carefully and never invent items you cannot see.',
      content, SCAN_SCHEMA, { signal, onText: t => onProgress('ask', countKey(t, 'id')) });
    const items = (out.items || []).filter(x => x && typeof x.name === 'string').map(x => ({
      id: PANTRY_BY_ID[x.id] ? x.id : 'other', name: String(x.name).slice(0, 60), cat: SHELVES.includes(x.shelf) ? x.shelf : 'other',
      amount: String(x.amount || '').slice(0, 40), sure: x.sure !== false }));
    return { items };
  }

  const IDEAS_SCHEMA = { type: 'object', additionalProperties: false, required: ['ideas'], properties: {
    ideas: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['name', 'meal', 'minutes', 'servings', 'uses', 'missing', 'cal', 'pro', 'carb', 'fat', 'why', 'steps'], properties: {
        name: { type: 'string' }, meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre', 'post'] },
        minutes: { type: 'integer' }, servings: { type: 'integer' }, uses: { type: 'array', items: { type: 'string' } },
        missing: { type: 'array', items: { type: 'string' } }, cal: { type: 'integer' }, pro: { type: 'integer' }, carb: { type: 'integer' },
        fat: { type: 'integer' }, why: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } } } } } } };

  // Meal ideas from your pantry list (text only — no photos). ctx: { have: [names], cal, pro, day, meal }
  async function ideas(key, ctx, { onProgress = () => {}, signal } = {}) {
    const text = `What's in my kitchen: ${ctx.have.join(', ')}. (I also have salt, pepper, cooking oil and cooking spray.)
My daily targets: about ${ctx.cal} calories and ${ctx.pro} g of protein. Today is a ${ctx.day} day.${ctx.meal ? ` I want ideas for ${ctx.meal}.` : ''}

Suggest 5 meals I can make. Use what I have — at most 2 extra ingredients per meal, listed in "missing" (empty if none).
- name: a short, appetizing name
- meal: breakfast, lunch, dinner, snack, pre (1–2 hours before training or a game) or post (after)
- minutes: hands-on time; servings: how many it makes
- uses: the ingredients from my kitchen it uses
- cal, pro, carb, fat: your best estimate per serving (whole numbers; grams for pro, carb, fat)
- why: one sentence on why it's good for a ballplayer today
- steps: 3–6 short, clear steps a teenager can follow`;
    onProgress('ideas', 0);
    const out = await ask(key, 'You are a sports nutritionist and practical home cook helping a young baseball player decide what to make from what is in their kitchen. Your meals are realistic, filling and high in protein, and your numbers are honest estimates.',
      [{ type: 'text', text }], IDEAS_SCHEMA, { signal, onText: t => onProgress('ideas', countKey(t, 'name')) });
    const int = v => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0), strs = a => (Array.isArray(a) ? a.map(String).filter(Boolean).slice(0, 12) : []);
    return (out.ideas || []).slice(0, 6).map(x => ({ name: String(x.name || 'Meal idea').slice(0, 80), meal: x.meal, minutes: int(x.minutes), servings: Math.max(1, int(x.servings)),
      uses: strs(x.uses), missing: strs(x.missing), cal: int(x.cal), pro: int(x.pro), carb: int(x.carb), fat: int(x.fat), why: String(x.why || '').slice(0, 300), steps: strs(x.steps) }));
  }

  return { supported, onPhone, withClaude, ideas, checkKey, loadImage, MODEL };
})();
