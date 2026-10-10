/* block.js — the 12-week plan: add muscle, power and bat speed (Plan → 12-week plan). Used by app.js, section 7c.

   You answer questions about yourself — position, how you hit and throw, age, height, weight, lifting experience, how much
   weight you want to add, the days and time you have, gym or home, your hitting setup, sore spots and your current test
   numbers — and it does three things:

   1. Analysis   how much weight you can realistically add in 12 weeks for your frame and experience (and how much of it
                 can be muscle), the calories, protein, carbs, fat and water to get there, your week-by-week weight
                 targets, where your power and speed stand against strong high-school marks, and what changes for your
                 position, height, build, age and sore spots.
   2. 12 weeks   three 4-week phases. Build (weeks 1–4): more sets of 8–12 to add muscle and learn the lifts. Strength
                 (5–8): heavier sets of 5–8, jumps right after heavy leg lifts. Power (9–12): heavy sets of 4–6, more
                 speed and game-speed hitting. Weeks 4 and 8 are lighter so you recover and grow; week 12 is a test week.
                 Every lift starts with a mobility drill, a jump and a rotational med ball throw while you're fresh, and
                 ends with stretches you hold. Off days are hitting sessions (drills picked for the phase and your Swing
                 lab priorities) with mobility and sprints; the rest day has an optional 10-minute stretch.
   3. Each week  the same exercises all phase long so the weights can climb (Dugout suggests the next weight), with
                 sets and reps that change week to week.

   Like the other data files, you never need to edit this. It reads builder.js (picking exercises) and drills.js. */

const BLOCK = (() => {
  const WEEKS = 12;
  const PHASES = [
    { n: 1, name: 'Build', weeks: '1–4', goal: 'Add muscle and learn the lifts: more sets of 8–12 reps with 2 good reps left in the tank. Eat big every day.',
      hit: 'Swing mechanics: tee and dry-swing drills for the problems that cost you the most.' },
    { n: 2, name: 'Strength', weeks: '5–8', goal: 'Heavier sets of 5–8 reps on the big lifts, still plenty of muscle-building work, and a jump right after your heavy leg lift.',
      hit: 'Bat speed: heavy and light bat swings and swings with intent, plus front toss if you have a partner.' },
    { n: 3, name: 'Power', weeks: '9–12', goal: 'Heavy sets of 4–6, more explosive work and sprinting. Turn the muscle and strength you built into speed.',
      hit: 'Game speed: timing, pitch recognition and hard contact.' }
  ];
  const SORE = [['shoulder', 'Shoulder'], ['elbow', 'Elbow'], ['back', 'Lower back'], ['knee', 'Knees']];
  const SETUP = [['tee', 'Tee + net'], ['partner', 'Tee + a partner to toss'], ['cage', 'Cage, machine or live pitching']];
  const GAINS = [5, 8, 10, 12, 15];
  // Strong high-school marks (rough guides — same as the Baseball tests).
  const MARKS = { exitvelo: 90, batspeed: 70, sixty: 7.0, vertical: 28, broad: 108 };

  const r5 = v => Math.round(v / 5) * 5, r50 = v => Math.round(v / 50) * 50, clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

  // Clean, complete answers. Height in inches and weight in pounds (app.js converts from kg / cm).
  function answersOf(a = {}) {
    const B = BUILDER, q = { ...a };
    if (!B.POSITIONS.some(([k]) => k === q.pos)) q.pos = 'infield';
    if (!['R', 'L', 'S'].includes(q.bats)) q.bats = 'R';
    if (!['R', 'L'].includes(q.throws)) q.throws = 'R';
    q.sex = q.sex === 'female' ? 'female' : 'male';
    q.age = clamp(Math.round(num(q.age) || 16), 12, 25);
    q.heightIn = clamp(num(q.heightIn) || 70, 54, 84);
    q.weightLb = clamp(num(q.weightLb) || 160, 80, 330);
    q.gain = GAINS.includes(Number(q.gain)) ? Number(q.gain) : 10;
    if (!B.EXPERIENCE.some(([k]) => k === q.exp)) q.exp = 'some';
    q.days = [...new Set((Array.isArray(q.days) ? q.days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((x, y) => x - y);
    if (q.days.length < 3 || q.days.length > 5) q.days = q.days.length > 5 ? q.days.slice(0, 5) : [0, 2, 4];
    q.minutes = [45, 60, 75].includes(Number(q.minutes)) ? Number(q.minutes) : 60;
    q.where = q.where === 'home' ? 'home' : 'gym';
    if (!B.HOME_EQUIP.some(([k]) => k === q.homeEquip)) q.homeEquip = 'none';
    if (!SETUP.some(([k]) => k === q.setup)) q.setup = 'tee';
    q.hits = q.hits !== false && q.hits !== 'no';
    q.medball = q.medball !== false && q.medball !== 'no';            // a 4–8 lb med ball and a wall (home)
    if (!B.SEASONS.some(([k]) => k === q.season)) q.season = 'offseason';
    q.sore = (Array.isArray(q.sore) ? q.sore : []).filter(k => SORE.some(([s]) => s === k));
    q.tests = Object.fromEntries(Object.keys(MARKS).concat('mbthrow').map(k => [k, num((q.tests || {})[k])]).filter(([, v]) => v > 0));
    q.faults = (Array.isArray(q.faults) ? q.faults : []).filter(f => typeof f === 'string').slice(0, 4);
    q.seed = Number(q.seed) || 0;
    return q;
  }

  /* ---------- 1. Analysis ---------- */
  function analyze(answers) {
    const a = answersOf(answers), h = a.heightIn, w = a.weightLb;
    const bmi = (703 * w) / (h * h);
    const frame = bmi < 19.5 ? 'lean' : bmi < 24.5 ? 'average' : 'big';
    const tall = h >= 74, short = h <= 67;
    // Realistic total weight gain per week (lb): newer lifters and lean frames can gain faster; bigger and experienced
    // lifters slower (or the gain is mostly fat). Younger athletes and in-season players slower.
    let [lo, hi] = { new: [0.75, 1.25], some: [0.5, 1.0], exp: [0.35, 0.75] }[a.exp];
    const f = (frame === 'lean' ? 1.15 : frame === 'big' ? 0.75 : 1) * (a.age < 15 ? 0.8 : 1) * (a.season === 'inseason' ? 0.5 : a.season === 'preseason' ? 0.8 : 1);
    lo *= f; hi *= f;
    const range = [Math.max(2, Math.round(lo * WEEKS)), Math.max(3, Math.round(hi * WEEKS))];
    const target = clamp(a.gain, range[0], range[1]), pace = target / WEEKS;
    const muscle = { new: [0.5, 0.7], some: [0.4, 0.6], exp: [0.3, 0.5] }[a.exp];
    // Calories: resting burn (Mifflin-St Jeor) × training, plus a surplus sized to the pace.
    const kg = w * 0.45359237, cm = h * 2.54;
    const bmr = 10 * kg + 6.25 * cm - 5 * a.age + (a.sex === 'female' ? -161 : 5);
    const activity = ({ 3: 1.6, 4: 1.7, 5: 1.8 })[a.days.length] + (a.season === 'offseason' ? 0 : 0.1);
    const maintain = bmr * activity, surplus = clamp(r50(pace * 500), 250, 650);
    const cal = r50(maintain + surplus), pro = r5(clamp(w, 100, 230)), fat = r5((cal * 0.27) / 9), carb = Math.max(0, r5((cal - pro * 4 - fat * 9) / 4));
    const water = Math.round((w / 2 + 24) / 4) * 4;
    const weights = Array.from({ length: WEEKS + 1 }, (_, k) => Math.round((w + pace * k) * 10) / 10);

    // Power and speed against strong high-school marks → what gets extra work.
    const t = a.tests, gaps = [];
    if (t.exitvelo && t.exitvelo < MARKS.exitvelo - 8) gaps.push('exit velocity');
    if (t.batspeed && t.batspeed < MARKS.batspeed - 7) gaps.push('bat speed');
    if (t.sixty && t.sixty > MARKS.sixty + 0.3) gaps.push('sprint speed');
    if (t.vertical && t.vertical < MARKS.vertical - 5) gaps.push('vertical jump');
    if (t.broad && t.broad < MARKS.broad - 12) gaps.push('broad jump');
    const speedFirst = gaps.includes('sprint speed') || a.pos === 'outfield' || a.pos === 'infield';
    const swingPower = gaps.includes('exit velocity') || gaps.includes('bat speed') || !t.exitvelo;

    const P = BUILDER.label(BUILDER.POSITIONS, a.pos);
    const notes = {
      body: [
        `${fmtHeight(h)}, ${w} lb — a BMI of ${bmi.toFixed(1)}, ${frame === 'lean' ? 'a lean frame: you have the most room to add muscle, but you have to eat more than feels normal' : frame === 'big' ? 'a bigger frame: gain slowly so it stays muscle, and keep moving well' : 'an average frame: steady gains, as long as you eat and sleep'}.`,
        tall ? 'You\'re tall: long levers make heavy barbell lifts harder, so the plan leans on trap bar, dumbbell and single-leg lifts, and on extra hip and hamstring mobility.' : short ? 'Shorter levers are an advantage for strength — expect the big lifts to climb fast.' : '',
        a.age < 16 ? `At ${a.age} you're still growing: part of your gain will come from growth itself. Form first, no max-out lifts, and 9–10 hours of sleep.` : `At ${a.age}, sleep 8–10 hours — most of the muscle is built while you sleep.`
      ].filter(Boolean),
      gain: [
        `Realistic for you: about ${range[0]}–${range[1]} lb in 12 weeks${a.gain > range[1] ? ` — ${a.gain} lb would mean mostly fat, so the plan aims for ${target} lb` : a.gain < range[0] ? ` — you could go a bit faster, but ${a.gain} lb is a clean, lean target` : ''}.`,
        `That's about ${pace.toFixed(2)} lb a week: ${w} lb now → ${weights[WEEKS]} lb by week 12. Weigh in 2–3 mornings a week; Dugout checks you're on pace.`,
        `With hard training and enough protein, roughly ${Math.round(muscle[0] * 100)}–${Math.round(muscle[1] * 100)}% of what you gain can be muscle${a.exp === 'new' ? ' — new lifters build it fastest' : ''}. Gaining faster than the plan mostly adds fat, which costs speed.`
      ],
      food: [
        `Eat about ${cal.toLocaleString('en-US')} calories a day (${Math.round(maintain).toLocaleString('en-US')} to stay the same, plus ${surplus} to grow) with ${pro} g protein, ${carb} g carbs and ${fat} g fat, and about ${water} oz of water.`,
        'Protein at every meal (25–40 g), carbs around training, and a big snack before bed (Greek yogurt, milk, a PB&J). Food first — no risky supplements.',
        'If your weight stalls for 2 weeks, add 250 calories a day. Gaining more than 1.5 lb a week for 2 weeks? Take 200 off.'
      ],
      training: [
        `${a.days.length} lifting days a week: ${a.days.length === 3 ? 'three full-body lifts' : a.days.length === 4 ? 'two lower-body and two upper-body lifts' : 'two lower, two upper and a total-body power and speed day'} of about ${a.minutes} minutes${a.where === 'home' ? ', at home' : ''}.`,
        ...posNotes(a.pos),
        a.exp === 'new' ? 'New to lifting: simpler lifts and sets that stop 2–3 reps short of failure. The first weeks are about learning the movements — the weight will come fast.' : a.exp === 'exp' ? 'Experienced: heavier strength sets in phases 2 and 3, and a jump right after your heavy leg lift.' : 'Some experience: sets of 8–12 to start, then 5–8, then 4–6 as the weeks go on.',
        ...a.sore.map(k => ({ shoulder: 'Shoulder: no overhead pressing, dips or plyo push-ups; extra arm care. Pain (not just soreness) means stop and see a trainer.', elbow: 'Elbow: no dips or plyo push-ups and extra forearm and arm-care work. Keep throwing volume in check.', back: 'Lower back: no heavy hinges or ab wheel — hip thrusts, single-leg work and anti-rotation core instead.', knee: 'Knees: no depth jumps, tuck jumps or jumping lunges; seated and box jumps instead, plus single-leg strength.' })[k]),
        a.season === 'inseason' ? 'You\'re in season: games come first. The plan uses fewer sets, and the realistic gain is about half — 12 weeks in the off-season is when this works best.' : ''
      ].filter(Boolean),
      power: [
        gaps.length ? `Your biggest gaps against strong high-school marks: ${gaps.join(', ')} — they get extra work.` : Object.keys(t).length ? 'Your test numbers are solid — the plan keeps building all of them.' : 'No test numbers yet: test in week 1 (exit velo, bat speed, 60, vertical and broad jump, rotational med ball throw) so week 12 shows what you gained.',
        swingPower ? 'Rotational power gets priority: a med ball throw on every lifting day, heavy and light bat swings in phase 2, hitting with intent all 12 weeks.' : 'Rotational med ball throws on every lifting day keep your bat speed climbing as you get stronger.',
        speedFirst ? 'Sprints on hitting days from week 5: acceleration first, then top speed.' : 'Sprints on hitting days from week 5 keep you fast while you add size.'
      ],
      hitting: a.hits ? [
        `${a.bats === 'S' ? 'Switch hitter: split your swings between both sides, a little more on your weaker side' : `Hitting ${a.bats === 'L' ? 'left' : 'right'}-handed`} — ${SETUP.find(([k]) => k === a.setup)[1].toLowerCase()}.`,
        a.faults.length ? `From your Swing lab: ${a.faults.map(id => (typeof SWING_FAULTS !== 'undefined' && SWING_FAULTS[id] ? SWING_FAULTS[id].name.toLowerCase() : id)).join(', ')} — drills for these come first.` : 'Film a swing in the Swing lab (Baseball tab) and the hitting days pick drills for what it finds.',
        ...PHASES.map(ph => `Weeks ${ph.weeks}: ${ph.hit}`)
      ] : ['No hitting days (pitcher): off days are arm care, mobility and sprint work instead.'],
      flex: ['Every session starts with a moving mobility drill and ends with 1–2 stretches you hold for what you trained. Hitting days add hip and upper-back mobility — your swing comes from rotation.',
        'Rest day: an optional 10-minute stretch. Flexibility is built with small daily doses, not one long session a week.']
    };
    return { a, bmi, frame, tall, range, target, pace, weights, cal, pro, carb, fat, water, maintain: Math.round(maintain), surplus, gaps, swingPower, speedFirst, notes, position: P };
  }
  const fmtHeight = h => `${Math.floor(h / 12)}′${Math.round(h % 12)}″`;
  const posNotes = pos => ({
    pitcher: ['Pitcher: arm care in every lift, no heavy overhead pressing, extra rows and single-leg strength for your drive and landing legs.'],
    twoway: ['Two-way: a pitcher\'s arm care and pressing rules, plus position-player speed and hitting.'],
    catcher: ['Catcher: hips, adductors and legs for the crouch — goblet squats, lateral lunges, Copenhagen planks — and extra hip mobility.'],
    infield: ['Infield: side-to-side strength and quickness, rotational power and quick feet.'],
    outfield: ['Outfield: hamstring strength (Nordics), acceleration and top speed, and jumps.']
  })[pos] || [];

  /* ---------- 2. The weeks ---------- */
  const phaseOf = w => Math.min(3, Math.ceil(w / 4));
  const kindOf = w => (w === 12 ? 'test' : w === 4 || w === 8 ? 'deload' : 'normal');
  // Lifting days by how many you train.
  const LIFTS = { 3: ['fbA', 'fbB', 'fbC'], 4: ['lowA', 'upA', 'lowB', 'upB'], 5: ['lowA', 'upA', 'pow', 'lowB', 'upB'] };
  const TITLES = { fbA: 'Full Body A — Squat + Press', fbB: 'Full Body B — Hinge + Pull', fbC: 'Full Body C — Power + Size', lowA: 'Lower A — Squat + Jump', upA: 'Upper A — Press + Row',
    lowB: 'Lower B — Hinge + Jump', upB: 'Upper B — Pull + Arms', pow: 'Power & Speed', hit: 'Hitting + Mobility', hitrun: 'Hitting, Speed + Mobility', arm: 'Arm Care, Speed + Mobility' };

  function slotsFor(kind, a, ph) {
    const { S: S0, FIN } = BUILDER, contrast = ph >= 2 && a.exp !== 'new' && a.days.length >= 4, gym = a.where === 'gym';
    // Main lifts at the gym are loaded ones (no push-ups as the big press); moving mobility drills to start.
    const S = (slot, role, pri, alt, like) => ({ ...S0(slot, role, pri, alt, like), ...(role === 'main' && gym ? { skip: x => x.equip === 'bw' } : {}) });
    const MOVE = like => S('mob', 'prep', 1, null, `${like}+move`);
    const lowerStart = [S('warm', 'prep', 1), MOVE('hip'), S('plyo', 'power', 1), S('power', 'power', 1, null, 'throw')];
    const upperStart = [S('warmarm', 'prep', 1), MOVE('upper'), S('power', 'power', 1, null, 'throw')];
    const jump = contrast ? [{ ...S('plyo', 'power', 2), contrast: true, skip: x => x.tags.includes('low') }] : [];
    const finLow = [FIN('hip+hold'), FIN('hip+hold', 2)], finUp = [FIN('upper+hold'), FIN('upper+hold', 2)], finBoth = [FIN('hip+hold'), FIN('upper+hold', 2)];
    const armCare = a.pos === 'pitcher' || a.pos === 'twoway' ? [S('arm', 'acc', 1)] : [];
    return ({
      lowA: [...lowerStart, S('squat', 'main', 1, ['single']), ...jump, S('single', 'acc', 1), S('ham', 'acc', 1), S('add', 'acc', 2), S('calf', 'acc', 2), S('core', 'acc', 3), ...finLow],
      lowB: [...lowerStart, S('hinge', 'main', 1), ...jump, S('single', 'acc', 1), S('squat', 'acc', 2, ['single']), S('ham', 'acc', 2), S('rot', 'acc', 2), S('calf', 'acc', 3), ...finLow],
      upA: [...upperStart, S('push', 'main', 1), S('pull', 'main', 1), S('push', 'acc', 2), S('pull', 'acc', 1), S('arm', 'acc', 1), S('extra', 'acc', 2), S('core', 'acc', 3), ...finUp],
      upB: [...upperStart, S('pull', 'main', 1), S('push', 'main', 1), S('pull', 'acc', 1), S('extra', 'acc', 1), S('extra', 'acc', 2), S('arm', 'acc', 1), S('grip', 'acc', 3), ...finUp],
      fbA: [...lowerStart, S('squat', 'main', 1, ['single']), ...jump, S('push', 'main', 1), S('pull', 'acc', 1), S('single', 'acc', 2), S('extra', 'acc', 2), ...armCare, S('core', 'acc', 3), ...finBoth],
      fbB: [...lowerStart, S('hinge', 'main', 1), ...jump, S('pull', 'main', 1), S('push', 'acc', 1), S('single', 'acc', 2), S('ham', 'acc', 2), S('arm', 'acc', 2), S('extra', 'acc', 3), ...finBoth],
      fbC: [...lowerStart, S('single', 'main', 1), S('push', 'main', 1), S('pull', 'acc', 1), S('ham', 'acc', 2), S('extra', 'acc', 2), S('rot', 'acc', 2), ...armCare, ...finBoth],
      pow: [S('warm', 'prep', 1), MOVE('hip'), S('drill', 'speed', 1), S('speed', 'speed', 1), S('speed', 'speed', 2), S('plyo', 'power', 1), S('power', 'power', 1, null, 'throw'), S('power', 'power', 2), S('single', 'acc', 2), S('core', 'acc', 2), ...finBoth],
      hit: [MOVE('hip'), MOVE('upper'), ...armCare, ...finBoth],
      hitrun: [MOVE('hip'), MOVE('upper'), S('drill', 'speed', 1), S('speed', 'speed', 1), S('speed', 'speed', 2), ...armCare, ...finBoth],
      arm: [S('warmarm', 'prep', 1), MOVE('upper'), S('arm', 'acc', 1), S('arm', 'acc', 1), S('drill', 'speed', 1), S('speed', 'speed', 1), MOVE('hip'), S('grip', 'acc', 2), ...finBoth]
    })[kind];
  }

  // Sore spots → exercises to leave out.
  const avoider = a => x => (a.sore.includes('shoulder') && (x.tags.includes('ohp') || ['Plyo push-ups', 'Pike push-ups', 'Chair dips', 'Med ball overhead slams', 'Band pass-throughs'].includes(x.name)))
    || (a.sore.includes('elbow') && ['Plyo push-ups', 'Chair dips', 'Diamond push-ups', 'Cable triceps pushdown'].includes(x.name))
    || (a.sore.includes('back') && ['Romanian deadlift', 'Ab wheel rollouts', 'Kettlebell swings', 'Med ball overhead backward toss', 'Hanging knee raises'].includes(x.name))
    || (a.sore.includes('knee') && ['Depth jumps', 'Tuck jumps', 'Jumping lunges', 'Hurdle hops', 'Single-leg hops', 'Lateral skater bounds'].includes(x.name))
    || (a.age < 15 && x.tags.includes('hit'));

  // Sets and reps for a week. [sets by week of the phase (the 4th is the light/test week)], [reps].
  const DOSE = {
    main: { 1: [[3, 4, 4, 2], [10, 10, 8, 8]], 2: [[4, 4, 5, 3], [8, 6, 5, 6]], 3: [[4, 5, 5, 2], [6, 5, 4, 5]] },
    acc: { 1: [[3, 3, 4, 2], [12, 12, 10, 10]], 2: [[3, 4, 4, 2], [10, 10, 8, 10]], 3: [[3, 3, 3, 2], [8, 8, 8, 8]] },
    power: { 1: [3, 3, 3, 2], 2: [4, 4, 4, 2], 3: [4, 4, 4, 2] },
    speed: { 1: [3, 3, 4, 2], 2: [4, 4, 5, 2], 3: [4, 5, 5, 2] }
  };
  const setReps = (reps, n) => BUILDER.withReps(reps, n);
  function dose(o, a, w, an) {
    const ph = phaseOf(w), k = (w - 1) % 4, t = o.t, x = o.x, light = k === 3, inS = a.season === 'inseason';
    const e = { name: x.name, sets: t.sets || 3, reps: String(t.reps || '10'), rest: t.rest ?? 60, track: t.track || 'reps', cues: t.cues || '' };
    const loaded = e.track === 'weight' && !x.tags.includes('home') && (a.where === 'gym' || a.homeEquip === 'dumbbells');
    const careful = x.slot === 'arm' || x.slot === 'grip' || x.slot === 'core' || x.slot === 'calf' || x.slot === 'add' || x.slot === 'rot';
    if (o.role === 'main' || o.role === 'acc') {
      const [sets, reps] = DOSE[o.role][ph];
      if (careful) e.sets = light ? 2 : Math.min(3, Math.max(2, e.sets));
      else {
        e.sets = Math.min(a.exp === 'new' ? 4 : 5, sets[k] + (o.role === 'acc' && an.frame === 'lean' && ph < 3 && !light ? 1 : 0));
        if (loaded) {
          let n = reps[k];
          if (a.exp === 'new' || x.tags.includes('uni')) n = Math.max(6, n);
          if (a.age < 15) n = Math.max(8, n);
          e.reps = setReps(e.reps, n);
          e.rest = o.role === 'main' ? (n <= 4 ? 180 : n <= 6 ? 150 : 120) : (n <= 8 ? 90 : 75);
        }
      }
      if (inS) e.sets = Math.max(2, e.sets - 1);
      if (a.exp === 'new' && o.role === 'main') e.sets = Math.min(e.sets, 4);
    } else if (o.role === 'power') e.sets = o.contrast ? (light ? 2 : 3) : Math.min(DOSE.power[ph][k], a.days.length === 3 ? 3 : 4);   // 3 full-body days: room for muscle work
    else if (o.role === 'speed') e.sets = Math.min(t.sets || 4, DOSE.speed[ph][k]) + (an.speedFirst && !light ? 1 : 0);
    else if (o.role === 'prep' && x.slot === 'mob') { e.sets = o.fin ? 1 : Math.max(2, e.sets); e.rest = o.fin ? 0 : e.rest || 15; }
    if (o.contrast) e.cues = `Right after your heavy sets above: do these 1–2 minutes after your last heavy set. ${e.cues}`.trim();
    return e;
  }

  // Hitting drills: by phase, your Swing lab priorities first, and only what your setup allows.
  const HIT = {
    1: ['tee-zones', 'two-tee', 'inside-out-tee', 'stride-freeze', 'head-still', 'hip-turn', 'hold-finish', 'fence-drill', 'stride-line', 'front-block', 'high-low-tee', 'shadow-swings'],
    2: ['overload-underload', 'step-back', 'front-toss', 'hip-turn', 'one-hand', 'side-toss', 'high-low-tee', 'tee-zones', 'two-tee'],
    3: ['rapid-fire', 'call-location', 'live-timing', 'two-color', 'front-toss', 'overload-underload', 'high-low-tee', 'tee-zones']
  };
  function drillsFor(a, ph, i) {
    if (typeof DRILL_BY_ID === 'undefined') return [];
    const can = d => d && d.pos.includes('hitting') && (d.who === 'solo' || a.setup !== 'tee') && (d.id !== 'live-timing' || a.setup === 'cage') && d.id !== 'bunting';
    const fix = ph < 3 ? DRILLS.filter(d => can(d) && d.fixes.some(f => a.faults.includes(f))).map(d => d.id) : [];
    const list = [...new Set([...fix.slice(0, 3), ...HIT[ph]])].map(id => DRILL_BY_ID[id]).filter(can);
    // Each hitting day of the week gets 3 different drills (rotating through the list); bat-speed swings stay in phase 2.
    const out = [];
    for (let k = 0; out.length < 3 && k < list.length; k++) out.push(list[(i * 3 + k) % list.length]);
    if (ph === 2 && !out.some(d => d.id === 'overload-underload') && DRILL_BY_ID['overload-underload']) out[out.length - 1] = DRILL_BY_ID['overload-underload'];
    return [...new Set(out)].map(d => ({ name: d.n, sets: 1, reps: d.dose, rest: 0, track: 'check', cues: d.cues.join(' · '), drill: d.id }));
  }

  function trim(list, minutes) {
    const over = () => BUILDER.minutes(list.map(o => o.e)) > minutes + 5;
    for (const pri of [3, 2]) for (let i = list.length - 1; i >= 0 && over(); i--) if (list[i].pri === pri && list[i].role !== 'main' && !list[i].fin) list.splice(i, 1);
    for (const o of list) if (over() && o.role === 'acc' && o.e.sets > 2) o.e.sets--;
    return list;
  }

  // One week: 7 days (Monday first), each { title, type, focus, exercises }.
  function week(answers, w, { age } = {}) {
    const a = answersOf(answers), an = analyze(a), ph = phaseOf(w), kind = kindOf(w), P = PHASES[ph - 1];
    const prof = { pos: a.pos, exp: a.exp, goal: 'strength', build: an.frame, season: a.season, homeEquip: a.homeEquip, days: a.days, minutes: a.minutes };
    const lifts = LIFTS[a.days.length], free = [0, 1, 2, 3, 4, 5, 6].filter(d => !a.days.includes(d));
    const restDay = free.includes(6) ? 6 : free[free.length - 1], hitDays = free.filter(d => d !== restDay).slice(0, 3);
    const used = new Map(), avoid = avoider(a), seed = a.seed * 97 + ph;   // same exercises all phase long
    const allow = a.where === 'home' && a.medball ? x => /^Med ball/.test(x.name) && x.name !== 'Med ball overhead slams' : null;
    const phaseLine = kind === 'deload' ? `Lighter week (week ${w}): fewer sets, same weights — let your body catch up and grow. Keep eating big.`
      : kind === 'test' ? 'Test week: fewer sets, then retest your numbers (Baseball tab → Games & arm → Tests) and weigh in.'
      : `${P.name} phase (weeks ${P.weeks}), week ${w}: ${P.goal}`;
    const days = [];
    for (let d = 0; d < 7; d++) {
      const li = a.days.indexOf(d), hi = hitDays.indexOf(d);
      if (li >= 0) {
        const k = lifts[li], picked = BUILDER.choose(slotsFor(k, a, ph), { where: a.where, profile: prof, age: age || a.age, seed: seed + li * 13, used, avoid, allow });
        const list = trim(picked.map(o => ({ ...o, e: dose(o, a, w, an) })), a.minutes);
        days.push({ title: `Wk ${w} · ${TITLES[k]}`, type: k === 'pow' ? 'agility' : 'strength', focus: phaseLine, exercises: list.map(o => o.e) });
      } else if (hi >= 0) {
        const run = ph >= 2 && hi === 0, k = !a.hits ? 'arm' : run ? 'hitrun' : 'hit';
        const picked = BUILDER.choose(slotsFor(k, a, ph), { where: a.where, profile: prof, age: age || a.age, seed: seed + 50 + hi, used, avoid, allow });
        const body = picked.filter(o => !o.fin).map(o => dose(o, a, w, an)), fin = picked.filter(o => o.fin).map(o => dose(o, a, w, an));
        const drills = a.hits ? drillsFor(a, ph, hi) : [];
        days.push({ title: `Wk ${w} · ${TITLES[k]}`, type: 'agility',
          focus: a.hits ? `${P.hit} Loosen up first, then quality swings — every one with a purpose. ${run ? 'Sprints after the swings, with full rest.' : ''}`.trim() : 'Arm care, mobility and a few fast sprints. Easy on the arm if you threw hard yesterday.',
          exercises: [...body.slice(0, 2), ...drills, ...body.slice(2), ...fin] });
      } else {
        const pr = BUILDER.preset('flex-daily', a.where);
        days.push({ title: `Wk ${w} · Rest + 10-minute stretch`, type: 'rest', focus: 'Full rest from training. The 10-minute stretch is optional — morning or before bed. Sleep 8–10 hours and hit your calories.', exercises: pr ? pr.exercises : [] });
      }
    }
    return { week: w, phase: P, kind, days };
  }
  const weekOn = (start, date) => {          // start: Monday "YYYY-MM-DD" of week 1 → week number for a date (0 = not started)
    const p = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const days = Math.floor((p(date) - p(start)) / 86400000);
    return days < 0 ? 0 : Math.floor(days / 7) + 1;
  };

  return { WEEKS, PHASES, SORE, SETUP, GAINS, MARKS, answersOf, analyze, week, weekOn, phaseOf, kindOf, fmtHeight };
})();
