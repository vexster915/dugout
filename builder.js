/* builder.js — builds workouts for YOU. Used by Plan → Build my plan and Plan → Presets & custom (app.js, section 7b).

   Build my plan   a full week (gym, home and a Light workout) from your position, build, lifting experience, main
                   goal, the part of the season, which days you train and how long you have.
   Make a workout  one workout from what you pick (lower body, speed, arm care…) and how many minutes you have.
   Presets         ready-made workouts for positions, speed, power, travel, game day and recovery.

   Every exercise comes from the exercise library (exercises.js) — so each one has a how-to and a form video — and
   its form cues and what to log come from the starting programs (plan.js). Like plan.js, you never need to edit this.

   How a plan is put together
   - Each kind of day (Lower, Upper, Total body, Speed, Mobility, In-season…) is a list of SLOTS in order of importance:
     warm-up, jumps, a squat, a hinge, single-leg work, arm care, core…
   - Each slot is filled with the best exercise for you: one you have the equipment for, that fits your experience,
     and — when it counts — the ones that matter most for your position (a pitcher gets single-leg RDLs, landmine
     presses and extra arm care; a catcher gets goblet squats, lateral lunges and Copenhagen planks; an outfielder
     gets drop-step sprints and Nordic curls…).
   - Sets, reps and rest come from your experience, goal and build (a newer lifter starts with 3 × 8; an experienced
     one building strength gets 5 × 5 on the big lifts; a smaller player adding size gets an extra set).
   - Then the least important slots come off until the workout fits your time. */

const BUILDER = (() => {
  /* ---------- The choices ---------- */
  const POSITIONS = [
    ['pitcher', 'Pitcher', 'Arm care in every lift, pitcher-safe pressing, rotational power and single-leg strength'],
    ['catcher', 'Catcher', 'Strong hips and legs for the crouch, adductors, lateral quickness and a healthy throwing arm'],
    ['infield', 'Infield', 'First-step quickness, side-to-side range, rotational power and quick feet'],
    ['outfield', 'Outfield', 'Acceleration and top speed, jumping, hamstring health and a strong arm'],
    ['twoway', 'Two-way', 'Pitcher arm care plus position-player speed and power']
  ];
  const BUILDS = [
    ['lean', 'Smaller / lean', 'Want to add size and strength: extra sets on the big lifts, more muscle-building work'],
    ['average', 'Average', 'Balanced strength, power and speed'],
    ['big', 'Bigger / strong', 'Want to move better: more speed, mobility and conditioning, easier on the joints']
  ];
  const EXPERIENCE = [
    ['new', 'New to lifting', 'Under 6 months — learn the movements with simpler lifts'],
    ['some', 'Some experience', '6 months to 2 years'],
    ['exp', 'Experienced', '2+ years with good form on the big lifts']
  ];
  const GOALS = [
    ['all', 'All-around', 'A bit of everything'],
    ['strength', 'Strength & size', 'Get bigger and stronger'],
    ['speed', 'Speed & agility', 'Faster first step and top speed'],
    ['power', 'Power', 'Bat speed, throwing velocity and jumping'],
    ['arm', 'Arm health', 'Stay healthy and throw more']
  ];
  const SEASONS = [['offseason', 'Off-season'], ['preseason', 'Pre-season'], ['inseason', 'In-season']];
  const HOME_EQUIP = [['none', 'Nothing (bodyweight)'], ['bands', 'Bands'], ['dumbbells', 'Dumbbells + bands']];
  const MINUTES = [30, 45, 60, 75];
  const DEFAULT_DAYS = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  const DEFAULTS = { pos: 'infield', build: 'average', exp: 'some', goal: 'all', season: 'offseason', days: [0, 1, 3, 4], minutes: 45, homeEquip: 'none' };

  /* ---------- The exercises: [name, slot, equipment, level, tags] ----------
     equipment: gym (machines, barbell, cables, med ball, box) · db (dumbbells / kettlebell) · band · bw (nothing, or a
     backpack, chair, couch or table). Level 1 = fine for anyone, 2 = some experience, 3 = experienced.
     tags: P pitcher, C catcher, I infield, O outfield (a good fit for that position) · ohp (overhead / dips — pitchers skip
     them) · hit (hard landings — bigger players do fewer) · lat (side to side) · low (easy on the body) · uni (one leg at a
     time) · home (a home stand-in — skipped at the gym) · hip / upper (what a stretch opens up). */
  const EX = [
    ['Dynamic warm-up', 'warm', 'bw', 1], ['Warm-up + band arm care', 'warmarm', 'band', 1, 'P C'], ['Warm-up + arm circles', 'warmarm', 'bw', 1],

    ['Box jumps', 'plyo', 'gym', 1, 'low'], ['Broad jumps', 'plyo', 'bw', 1, 'O C'], ['Line hops', 'plyo', 'bw', 1, 'low I'],
    ['Lateral skater bounds', 'plyo', 'bw', 2, 'lat I C P'], ['Tuck jumps', 'plyo', 'bw', 2, 'hit'], ['Jumping lunges', 'plyo', 'bw', 2, 'hit'],
    ['Single-leg hops', 'plyo', 'bw', 3, 'hit O'],

    ['Med ball rotational scoop toss', 'power', 'gym', 1, 'P I O C'], ['Med ball chest pass', 'power', 'gym', 1], ['Med ball overhead slams', 'power', 'gym', 1],
    ['Kettlebell swings', 'power', 'db', 2], ['Plyo push-ups', 'power', 'bw', 3, 'hit'],

    ['Leg press', 'squat', 'gym', 1], ['Goblet squat', 'squat', 'db', 1, 'C'], ['Bulgarian split squat', 'squat', 'bw', 2, 'P O I uni'],
    ['Trap bar deadlift', 'hinge', 'gym', 2, 'C O P'], ['Romanian deadlift', 'hinge', 'db', 2], ['Hip thrust', 'hinge', 'gym', 1],
    ['Single-leg RDL', 'hinge', 'db', 2, 'P O uni'], ['Single-leg RDL (backpack)', 'hinge', 'bw', 1, 'P O uni home'],

    ['Walking lunges (dumbbells)', 'single', 'db', 1], ['Reverse lunges', 'single', 'bw', 1], ['Dumbbell step-ups', 'single', 'db', 1],
    ['Step-ups (chair or bench)', 'single', 'bw', 1], ['Step-ups with backpack', 'single', 'bw', 1, 'home'], ['Lateral lunges', 'single', 'bw', 1, 'lat C I'],
    ['Single-leg leg press', 'single', 'gym', 1, 'low'],

    ['Nordic hamstring curls', 'ham', 'gym', 3, 'O'], ['Nordic curls (feet under couch)', 'ham', 'bw', 3, 'O home'], ['Seated leg curl', 'ham', 'gym', 1],
    ['Single-leg glute bridge', 'ham', 'bw', 1], ['Single-leg hip thrust (couch)', 'ham', 'bw', 1, 'home'],
    ['Copenhagen plank', 'add', 'gym', 2, 'C I P'], ['Copenhagen plank (couch)', 'add', 'bw', 2, 'C I P home'], ['Banded lateral walks', 'add', 'band', 1, 'C'],
    ['Standing calf raises', 'calf', 'gym', 1], ['Single-leg calf raises', 'calf', 'bw', 1, 'O'],

    ['Dumbbell bench press', 'push', 'gym', 1], ['Incline dumbbell press', 'push', 'gym', 1], ['Half-kneeling landmine press', 'push', 'gym', 2, 'P'],
    ['Push-ups', 'push', 'bw', 1, 'P'], ['Decline push-ups', 'push', 'bw', 2], ['Diamond push-ups', 'push', 'bw', 2],
    ['Pike push-ups', 'push', 'bw', 2, 'ohp'], ['Backpack overhead press', 'push', 'bw', 1, 'ohp home'], ['Chair dips', 'push', 'bw', 1, 'ohp home'],

    ['Pull-ups', 'pull', 'gym', 2], ['Chest-supported row', 'pull', 'gym', 1, 'P C'], ['Single-arm dumbbell row', 'pull', 'db', 1, 'P'],
    ['Table inverted rows', 'pull', 'bw', 1, 'home'], ['Backpack bent-over rows', 'pull', 'bw', 1, 'home'],

    ['Face pulls', 'arm', 'gym', 1, 'P C'], ['Cable external rotation', 'arm', 'gym', 1, 'P'], ['Band 90/90 external rotation', 'arm', 'band', 1, 'P C'],
    ['Band pull-aparts', 'arm', 'band', 1, 'P C'], ['Rear delt fly', 'arm', 'db', 1], ['Prone Y-T-W raises', 'arm', 'bw', 1, 'P'],
    ['External rotation hold (doorway)', 'arm', 'bw', 1, 'P home'], ['Scap push-ups', 'arm', 'bw', 1], ['Wall slides', 'arm', 'bw', 1],

    ['Wrist curls + reverse wrist curls', 'grip', 'db', 1, 'P'], ['Towel wringing', 'grip', 'bw', 1, 'P'], ['Farmer\'s carry', 'grip', 'db', 1],

    ['Dumbbell lateral raises', 'extra', 'db', 1], ['Hammer curls', 'extra', 'db', 1], ['Incline dumbbell curls', 'extra', 'gym', 1],
    ['Cable triceps pushdown', 'extra', 'gym', 1], ['Backpack curls', 'extra', 'bw', 1, 'home'], ['Leg extensions', 'extra', 'gym', 1],

    ['Pallof press', 'core', 'gym', 1, 'P I'], ['Dead bugs', 'core', 'bw', 1], ['Plank shoulder taps', 'core', 'bw', 1], ['Side plank hip dips', 'core', 'bw', 1],
    ['Hollow body hold', 'core', 'bw', 2], ['Superman hold', 'core', 'bw', 1], ['Suitcase carry', 'core', 'db', 1], ['Hanging knee raises', 'core', 'gym', 2],
    ['Ab wheel rollouts', 'core', 'gym', 3], ['Up-downs (plank to push-up)', 'core', 'bw', 1],
    ['Cable woodchop (high to low)', 'rot', 'gym', 1, 'I P'], ['Landmine rotations', 'rot', 'gym', 2, 'I O'], ['Russian twists (backpack)', 'rot', 'bw', 1, 'home'],

    ['A-skips & B-skips', 'drill', 'bw', 1], ['Crossover sprint starts', 'speed', 'bw', 1, 'I O'], ['Drop-step sprints', 'speed', 'bw', 1, 'O'],
    ['Base-stealing starts (crossover)', 'speed', 'bw', 1], ['Sled push', 'speed', 'gym', 1, 'low'],
    ['Pro agility shuttle (5-10-5)', 'agility', 'gym', 1, 'I C'], ['5-10-5 shuttle', 'agility', 'bw', 1, 'I C'], ['Agility ladder drills', 'agility', 'gym', 1, 'I'],
    ['Lateral shuffles', 'agility', 'bw', 1, 'lat I C'],
    ['Bear crawl', 'cond', 'bw', 1],

    ['World\'s greatest stretch', 'mob', 'bw', 1, 'hip'], ['90/90 hip switches', 'mob', 'bw', 1, 'C hip'], ['Hip airplanes', 'mob', 'bw', 2, 'C P hip'],
    ['Couch stretch (hip flexors)', 'mob', 'bw', 1, 'O hip'], ['Thoracic open books', 'mob', 'bw', 1, 'P I upper'], ['Cross-body shoulder stretch', 'mob', 'bw', 1, 'P upper'],
    ['Lat stretch on rack', 'mob', 'gym', 1, 'upper'], ['Band hamstring stretch', 'mob', 'band', 1, 'O hip'], ['Towel hamstring stretch', 'mob', 'bw', 1, 'O hip'],
    ['Pigeon stretch', 'mob', 'bw', 1, 'C hip'], ['Wrist & forearm stretch', 'mob', 'bw', 1, 'P C upper'], ['Cat-cow + deep breathing', 'mob', 'bw', 1, 'hip upper'],
    ['Doorway chest stretch', 'mob', 'bw', 1, 'upper'],
    ['Cool-down walk + stretch', 'cool', 'bw', 1], ['Foam roll', 'cool', 'gym', 1], ['Ball rolling (tennis or lacrosse ball)', 'cool', 'bw', 1]
  ].map(([name, slot, equip, level, tags = '']) => ({ name, slot, equip, level, tags: tags.split(' ').filter(Boolean) }));
  const EX_BY_NAME = Object.fromEntries(EX.map(e => [e.name, e]));
  const SAME = [['Pro agility shuttle (5-10-5)', '5-10-5 shuttle'], ['Nordic hamstring curls', 'Nordic curls (feet under couch)'], ['Single-leg RDL', 'Single-leg RDL (backpack)'],
    ['Copenhagen plank', 'Copenhagen plank (couch)'], ['Step-ups (chair or bench)', 'Step-ups with backpack', 'Dumbbell step-ups'], ['Band hamstring stretch', 'Towel hamstring stretch']];
  const twins = name => (SAME.find(g => g.includes(name)) || [name]);
  const RANK = { gym: 3, db: 2, band: 1, bw: 0 };
  const POS_TAG = { pitcher: 'P', catcher: 'C', infield: 'I', outfield: 'O', twoway: 'P' };

  // What equipment a place has.
  const kit = (where, homeEquip) => (where === 'gym' ? ['gym', 'db', 'band', 'bw'] : homeEquip === 'dumbbells' ? ['db', 'band', 'bw'] : homeEquip === 'bands' ? ['band', 'bw'] : ['bw']);

  /* ---------- How each exercise is usually set up (from plan.js), per place ---------- */
  let TPL = null;
  function templates() {
    if (TPL) return TPL;
    TPL = { gym: {}, home: {} };
    const add = (mode, e) => { if (!TPL[mode][e.name]) TPL[mode][e.name] = e; };
    const progs = typeof PROGRAMS !== 'undefined' ? Object.values(PROGRAMS) : [];
    for (const p of progs) for (const mode of ['gym', 'home']) for (const d of p.plan[mode]) d.exercises.forEach(e => add(mode, e));
    if (typeof LIGHT_WORKOUT !== 'undefined') for (const mode of ['gym', 'home']) LIGHT_WORKOUT[mode].exercises.forEach(e => add(mode, e));
    if (typeof EXERCISE_INFO !== 'undefined') for (const [name, x] of Object.entries(EXERCISE_INFO)) if (x.plan) { add('gym', { name, ...x.plan }); add('home', { name, ...x.plan }); }
    return TPL;
  }
  const tpl = (name, mode) => { const t = templates(); return t[mode][name] || t[mode === 'gym' ? 'home' : 'gym'][name] || { sets: 3, reps: '10', rest: 60, track: 'reps', cues: '' }; };
  // "10/leg" with 8 → "8/leg"; "30 sec/side" with 20 → "20 sec/side"; "6-8" with 5 → "5".
  const withReps = (reps, n) => (/\d/.test(String(reps)) ? String(reps).replace(/\d+(\s*-\s*\d+)?/, String(n)) : String(n));

  /* ---------- A small seeded random (the same answers + seed always build the same plan) ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- The kinds of days: slots in order, with how important each is (1 = keep, 3 = first to go) ---------- */
  // role: main (big lift), power, acc (accessory), prep (warm-up, mobility), speed
  const S = (slot, role, pri, alt, like) => ({ slot, role, pri, alt, like });
  const DAY_KINDS = {
    lower: { title: 'Lower Body — Power & Strength', type: 'strength', focus: 'Jumps first while you\'re fresh, then the big leg lifts and single-leg strength.',
      slots: [S('warm', 'prep', 1), S('plyo', 'power', 1), S('squat', 'main', 1, ['single']), S('hinge', 'main', 1), S('single', 'acc', 2), S('ham', 'acc', 2), S('add', 'acc', 2), S('core', 'acc', 3), S('calf', 'acc', 3), S('mob', 'prep', 3, null, 'hip')] },
    upper: { title: 'Upper Body — Strength & Arm Care', type: 'strength', focus: 'Upper-body power, pressing and plenty of pulling, then arm care to keep your shoulder healthy.',
      slots: [S('warmarm', 'prep', 1), S('power', 'power', 2), S('push', 'main', 1), S('pull', 'main', 1), S('pull', 'acc', 2), S('arm', 'acc', 1), S('rot', 'acc', 2), S('push', 'acc', 3), S('arm', 'acc', 3), S('grip', 'acc', 3)] },
    totalA: { title: 'Total Body Power A', type: 'strength', focus: 'Explosive work first, then a squat and a press, single-leg work and rotation.',
      slots: [S('warm', 'prep', 1), S('plyo', 'power', 1), S('power', 'power', 1), S('squat', 'main', 1, ['single']), S('push', 'main', 1), S('pull', 'acc', 2), S('single', 'acc', 2), S('rot', 'acc', 2), S('arm', 'acc', 2), S('core', 'acc', 3)] },
    totalB: { title: 'Total Body Power B', type: 'strength', focus: 'Jumps and throws, then a hinge and a row, single-leg work and core.',
      slots: [S('warm', 'prep', 1), S('plyo', 'power', 1), S('power', 'power', 1), S('hinge', 'main', 1), S('pull', 'main', 1), S('push', 'acc', 2), S('single', 'acc', 2), S('arm', 'acc', 2), S('core', 'acc', 2), S('ham', 'acc', 3)] },
    speed: { title: 'Speed & Agility', type: 'agility', focus: 'Short, fast sprints with full rest — quality over quantity. Stop before you slow down.',
      slots: [S('warm', 'prep', 1), S('drill', 'speed', 1), S('speed', 'speed', 1), S('agility', 'speed', 1), S('speed', 'speed', 2), S('plyo', 'power', 2), S('agility', 'speed', 3), S('add', 'acc', 3), S('cool', 'prep', 2)] },
    mobility: { title: 'Mobility & Arm Care', type: 'mobility', focus: 'An easy day: open up your hips, back and shoulders and take care of your arm.',
      slots: [S('warmarm', 'prep', 1), S('mob', 'prep', 1, null, 'hip'), S('mob', 'prep', 1, null, 'upper'), S('arm', 'acc', 1), S('mob', 'prep', 2, null, 'hip'), S('arm', 'acc', 2), S('core', 'acc', 2), S('mob', 'prep', 3, null, 'upper'), S('cool', 'prep', 2)] },
    inA: { title: 'In-Season Total Body A', type: 'strength', focus: 'Short and strong — keep your strength without being sore for games. Stop every set with 2–3 good reps left.',
      slots: [S('warm', 'prep', 1), S('plyo', 'power', 2), S('squat', 'main', 1, ['single']), S('push', 'main', 1), S('pull', 'acc', 1), S('arm', 'acc', 1), S('core', 'acc', 2), S('mob', 'prep', 3, null, 'hip')] },
    inB: { title: 'In-Season Total Body B', type: 'strength', focus: 'Short and strong — keep your strength without being sore for games. Stop every set with 2–3 good reps left.',
      slots: [S('warm', 'prep', 1), S('power', 'power', 2), S('hinge', 'main', 1), S('pull', 'main', 1), S('push', 'acc', 2), S('arm', 'acc', 1), S('rot', 'acc', 2), S('mob', 'prep', 3, null, 'upper')] },
    tuneup: { title: 'Speed Tune-Up', type: 'agility', focus: 'A few fast reps to stay sharp — you should feel quicker after, not tired.',
      slots: [S('warm', 'prep', 1), S('drill', 'speed', 2), S('speed', 'speed', 1), S('agility', 'speed', 2), S('mob', 'prep', 2, null, 'hip')] },
    light: { title: 'Light Day: Recover + Move', type: 'mobility', focus: 'Easy pace, nothing heavy. You should feel better when you finish than when you started.',
      slots: [S('warmarm', 'prep', 1), S('mob', 'prep', 1, null, 'hip'), S('mob', 'prep', 1, null, 'upper'), S('arm', 'acc', 1), S('arm', 'acc', 2), S('core', 'acc', 2), S('ham', 'acc', 3), S('cool', 'prep', 2)] }
  };

  // The week: which kinds of days, by season and number of days (the goal can swap one in).
  function weekKinds(season, n, goal) {
    n = Math.max(1, Math.min(6, n | 0));
    if (season === 'inseason') return ({ 1: ['inA'], 2: ['inA', 'inB'], 3: ['inA', 'tuneup', 'inB'], 4: ['inA', 'mobility', 'tuneup', 'inB'],
      5: ['inA', 'mobility', 'tuneup', 'inB', 'mobility'], 6: ['inA', 'mobility', 'tuneup', 'inB', 'mobility', 'tuneup'] })[n];
    if (season === 'preseason') return ({ 1: ['totalA'], 2: ['totalA', 'totalB'], 3: ['totalA', 'speed', 'totalB'], 4: ['lower', 'speed', 'upper', 'mobility'],
      5: ['lower', 'speed', 'mobility', 'upper', 'speed'], 6: ['lower', 'speed', 'mobility', 'upper', 'speed', 'mobility'] })[n];
    const base = ({ 1: ['totalA'], 2: ['totalA', 'totalB'], 3: ['lower', 'upper', 'totalB'], 4: ['lower', 'upper', 'speed', 'totalB'],
      5: ['lower', 'upper', 'speed', 'totalB', 'mobility'], 6: ['lower', 'upper', 'speed', 'totalB', 'mobility', 'speed'] })[n].slice();
    if (goal === 'speed' && n === 3) return ['totalA', 'speed', 'totalB'];
    if (goal === 'speed' && n === 5) return ['lower', 'speed', 'upper', 'speed', 'totalB'];
    if (goal === 'arm' && n === 4) return ['lower', 'upper', 'mobility', 'totalB'];
    if (goal === 'strength' && n === 6) return ['lower', 'upper', 'speed', 'totalA', 'mobility', 'totalB'];
    return base;
  }

  /* ---------- Who you are → how the slots change ---------- */
  function adjustSlots(kind, p) {
    const slots = DAY_KINDS[kind].slots.map(s => ({ ...s }));
    const add = (s, after) => {        // after a slot, or at the end before the stretches
      let i = after ? slots.map(x => x.slot).lastIndexOf(after) + 1 : 0;
      if (i <= 0) { i = slots.length; while (i > 1 && slots[i - 1].role === 'prep') i--; }
      slots.splice(i, 0, s);
    };
    const bump = (slot, pri) => { const s = slots.find(x => x.slot === slot && x.pri > pri); if (s) s.pri = pri; };
    const strengthDay = ['lower', 'upper', 'totalA', 'totalB', 'inA', 'inB'].includes(kind);
    const pitcher = p.pos === 'pitcher' || p.pos === 'twoway';
    // Position
    if (pitcher && strengthDay) { if (!slots.some(s => s.slot === 'arm')) add(S('arm', 'acc', 1)); bump('arm', 1); if (kind === 'upper') { bump('grip', 2); add(S('pull', 'acc', 2), 'pull'); } }
    if (p.pos === 'catcher') { if (kind === 'lower' || kind === 'totalA' || kind === 'totalB') { if (!slots.some(s => s.slot === 'add')) add(S('add', 'acc', 1), 'single'); bump('add', 1); } if (strengthDay) bump('mob', 2); }
    if (p.pos === 'infield' && (kind === 'totalA' || kind === 'totalB' || kind === 'lower')) add(S('agility', 'speed', 2), 'plyo');
    if (p.pos === 'outfield') { if (kind === 'lower' || kind === 'totalB') bump('ham', 1); if (kind === 'totalA' || kind === 'totalB') add(S('speed', 'speed', 2), 'warm'); }
    if (p.pos === 'twoway' && (kind === 'totalA' || kind === 'totalB')) add(S('speed', 'speed', 3), 'warm');
    // Goal
    if (p.goal === 'strength' && strengthDay) add(S(kind === 'upper' ? 'extra' : kind === 'lower' ? 'single' : 'pull', 'acc', 2));
    if (p.goal === 'speed') { if (kind === 'speed') { add(S('speed', 'speed', 2), 'speed'); bump('plyo', 1); } if (strengthDay) bump('plyo', 1); }
    if (p.goal === 'power') { slots.filter(s => s.role === 'power').forEach(s => { s.pri = 1; }); if (strengthDay && !slots.some(s => s.slot === 'power')) add(S('power', 'power', 1), 'plyo'); }
    if (p.goal === 'arm') { if (strengthDay) { add(S('arm', 'acc', 1)); bump('grip', 2); } if (kind === 'mobility' || kind === 'light') add(S('grip', 'acc', 2), 'arm'); }
    // Build
    if (p.build === 'lean' && strengthDay) add(S('extra', 'acc', 3));
    if (p.build === 'big') { if (strengthDay) bump('mob', 2); if (kind === 'totalA' || kind === 'totalB' || kind === 'speed') add(S('cond', 'acc', 2), kind === 'speed' ? 'agility' : 'core'); }
    return slots;
  }

  /* ---------- Picking the best exercise for a slot ---------- */
  function pick(slot, ctx, used, day, like, role) {
    const { p, have, maxLevel, rand } = ctx, tag = POS_TAG[p.pos];
    const pitcher = p.pos === 'pitcher' || p.pos === 'twoway';
    const ok = x => have.includes(x.equip) && x.level <= maxLevel && !(pitcher && x.tags.includes('ohp')) && !(ctx.where === 'gym' && x.tags.includes('home'));
    // A home stand-in loses to its gym version when you have the equipment ("Single-leg RDL" beats the backpack one at the gym).
    const outranked = x => twins(x.name).some(n => n !== x.name && ok(EX_BY_NAME[n]) && RANK[EX_BY_NAME[n].equip] > RANK[x.equip]);
    const pool = EX.filter(x => x.slot === slot && ok(x) && !outranked(x) && !twins(x.name).some(n => day.has(n)));
    if (!pool.length) return null;
    const oneLegged = [...day].some(n => EX_BY_NAME[n] && EX_BY_NAME[n].tags.includes('uni'));
    const score = x => {
      let s = rand() * 1.5;                                             // a little variety (the seed decides)
      if (tag && x.tags.includes(tag)) s += 3;                          // fits your position
      if (p.pos === 'twoway' && (x.tags.includes('O') || x.tags.includes('I'))) s += 1;
      if (like && x.tags.includes(like)) s += 5;                        // the right stretch for the day
      if (x.equip === 'gym' || x.equip === 'db') s += ctx.where === 'gym' ? 1 : 0.5;   // use the equipment you have
      if (p.build === 'big' && x.tags.includes('hit')) s -= 3;         // easier landings for bigger players
      if (p.build === 'big' && x.tags.includes('low')) s += 1;
      if (p.build === 'lean' && (x.slot === 'squat' || x.slot === 'hinge') && x.equip !== 'bw') s += 1;
      if (p.goal === 'speed' && x.tags.includes('lat') && p.pos === 'infield') s += 1;
      if (role === 'main' && oneLegged && x.tags.includes('uni')) s -= 2.5;   // one big lift on two legs
      s -= twins(x.name).reduce((a, n) => a + (used.get(n) || 0), 0) * 2.5;  // spread exercises across the week
      if (maxLevel >= 2 && x.level === 1 && ['squat', 'hinge', 'push', 'pull'].includes(slot) && p.exp === 'exp') s -= 0.5;
      return s;
    };
    return pool.map(x => [x, score(x)]).sort((a, b) => b[1] - a[1])[0][0];
  }

  /* ---------- Sets, reps and rest ---------- */
  function dose(x, role, ctx) {
    const { p, mode, season } = ctx, t = tpl(x.name, mode), inSeason = season === 'inseason';
    const e = { name: x.name, sets: t.sets || 3, reps: String(t.reps || '10'), rest: t.rest ?? 60, track: t.track || 'reps', cues: t.cues || '' };
    const lvl = p.exp === 'new' ? 0 : p.exp === 'some' ? 1 : 2, cap = n => Math.max(1, Math.min(inSeason ? (role === 'speed' ? 4 : 3) : 6, n));
    // Heavy, low-rep sets only when there's real weight to lift (a backpack or bodyweight keeps its normal reps).
    const loaded = e.track === 'weight' && !x.tags.includes('home') && (ctx.where === 'gym' || p.homeEquip === 'dumbbells');
    if (role === 'main') {
      if (loaded) {
        const table = { strength: [['8', 3], ['6', 4], ['5', 5]], power: [['6', 3], ['5', 4], ['3', 5]], speed: [['8', 3], ['6', 3], ['5', 4]], arm: [['8', 3], ['8', 3], ['6', 4]], all: [['8', 3], ['6', 4], ['5', 4]] };
        let [reps, sets] = (table[p.goal] || table.all)[lvl];
        if (season === 'preseason') { reps = String(Math.max(3, Number(reps) - 2)); }
        if (inSeason) { sets = Math.min(sets, 3); reps = String(Math.max(4, Number(reps) - 1)); }
        if (p.build === 'lean' && !inSeason) sets += 1;
        e.sets = cap(sets); e.reps = withReps(e.reps, Number(reps));
        e.rest = lvl === 0 ? 90 : Number(reps) <= 5 ? 150 : 120;
      } else e.sets = cap((lvl === 0 ? 3 : 4) + (p.build === 'lean' ? 1 : 0));
    } else if (role === 'power') {
      e.sets = cap((lvl === 2 ? 4 : 3) + (p.goal === 'power' ? 1 : 0) - (p.build === 'big' && x.tags.includes('hit') ? 1 : 0) - (inSeason ? 1 : 0));
    } else if (role === 'acc') {
      e.sets = cap((lvl === 0 ? 2 : 3) + (p.build === 'lean' && ['single', 'pull', 'push', 'extra', 'ham'].includes(x.slot) ? 1 : 0) - (inSeason ? 1 : 0));
      if (x.slot === 'arm' || x.slot === 'grip') e.sets = cap(p.goal === 'arm' || p.pos === 'pitcher' || p.pos === 'twoway' ? 3 : 2);
      if (p.build === 'lean' && loaded && ['single', 'pull', 'push', 'extra'].includes(x.slot)) { const n = Number((e.reps.match(/\d+/) || [])[0]); if (n && n < 10) e.reps = withReps(e.reps, n + 2); }
    } else if (role === 'speed') {
      e.sets = cap(Math.min(6, (t.sets || 5) + (p.goal === 'speed' ? 1 : 0)) - (lvl === 0 || inSeason ? 1 : 0) - (p.build === 'big' ? 1 : 0));
    }
    return e;
  }

  /* ---------- Fitting the time you have ---------- */
  function secs(reps) {
    const s = String(reps || '').toLowerCase(), m = s.match(/\d+(\.\d+)?/g), n = m ? Number(m[m.length - 1]) : null;
    return n == null ? null : /min/.test(s) ? n * 60 : /sec|\ds\b/.test(s) ? n : null;
  }
  function minutes(exs) {       // the same estimate the Plan tab shows
    let sec = 0;
    for (const e of exs) {
      const sets = Math.max(1, e.sets | 0), timed = secs(e.reps), sides = /\/\s*(leg|side|arm)|each/i.test(e.reps) ? 2 : 1;
      sec += sets * (timed != null ? timed : 35) * sides + (sets - 1) * (e.rest || 0) + 30;
    }
    return Math.max(5, Math.round(sec / 300) * 5);
  }
  const sum = (list, role) => list.reduce((a, x) => a + (x.role === role ? x.e.sets : 0), 0);
  // Most exercises in one workout: enough to cover everything, few enough to do each one well.
  const maxExercises = (p, mins) => Math.min(p.exp === 'new' ? 8 : p.exp === 'some' ? 9 : 10, mins <= 30 ? 7 : mins <= 45 ? 9 : mins <= 60 ? 10 : 11);
  function fit(list, target, cap = 12, cover = false) {
    const out = list.slice(), long = () => minutes(out.map(x => x.e)) > target + 3 || out.length > cap;
    // Drop the least important slots (from the end) until it fits. A made-to-order workout first
    // trims sets and rests so it can keep a bit of everything you asked for.
    for (const pri of [3, 2]) {
      if (cover && pri === 2) for (const x of out) {
        if (!long()) break;
        if (x.role === 'main') { x.e.sets = Math.min(x.e.sets, 3); x.e.rest = Math.min(x.e.rest, 90); }
        if (x.role === 'acc' || x.role === 'power') { x.e.sets = Math.min(x.e.sets, 2); x.e.rest = Math.min(x.e.rest, 45); }
        if (x.role === 'speed') x.e.sets = Math.min(x.e.sets, 4);
      }
      while (long()) {
        // The last one of this importance — from whichever focus you picked still has the most left.
        const left = f => out.filter(x => x.f === f).length;
        let k = -1;
        for (let i = out.length - 1; i >= 0; i--) if (out[i].pri === pri && (k < 0 || left(out[i].f) > left(out[k].f))) k = i;
        if (k < 0) break;
        out.splice(k, 1);
      }
    }
    // Still long: shorten a long warm-up, take sets off accessories, then off the big lifts, then shorten their rests.
    const steps = [
      x => x.role === 'prep' && secs(x.e.reps) >= 420 && (x.e.reps = withReps(x.e.reps, Math.max(5, Math.round(secs(x.e.reps) / 60) - 3))),
      x => x.role === 'acc' && x.e.sets > 2 && x.e.sets--,
      x => (x.role === 'main' || x.role === 'power' || x.role === 'speed') && x.e.sets > 3 && x.e.sets--,
      x => (x.role === 'main' || x.role === 'power') && x.e.rest > 90 && (x.e.rest -= 30)
    ];
    for (const step of steps) for (let changed = true; long() && changed;) { changed = false; for (const x of out) if (long() && step(x)) changed = true; }
    // Last resort: keep the warm-up and the first big lift, drop the rest from the end.
    const warm = x => x.slot === 'warm' || x.slot === 'warmarm', work = () => out.filter(x => !warm(x)).length;
    for (const keepMain of [true, false]) for (let i = out.length - 1; i >= 0 && long(); i--) {
      const x = out[i];
      if (!warm(x) && work() > 2 && !(keepMain && x.role === 'main') && !(x.role === 'main' && out.filter(y => y.role === 'main').length === 1)) out.splice(i, 1);
    }
    return out;
  }

  /* ---------- One day ---------- */
  function buildDay(kind, ctx, used, { title, focus, slots } = {}) {
    const def = DAY_KINDS[kind] || DAY_KINDS.totalA, list = [], day = new Set();
    for (const s of slots || adjustSlots(kind, ctx.p)) {
      let x = pick(s.slot, ctx, used, day, s.like, s.role);
      for (const alt of s.alt || []) if (!x) x = pick(alt, ctx, used, day, s.like, s.role);
      if (!x) continue;
      day.add(x.name);
      const e = dose(x, s.role, ctx);
      if (kind === 'light') easy(e, ctx.mode);
      list.push({ e, pri: s.pri, role: s.role, f: s.f, slot: s.slot });
    }
    if (ctx.minutes <= 30) list.forEach(x => { if (x.role === 'prep' && secs(x.e.reps) >= 360) x.e.reps = withReps(x.e.reps, 5); });
    const speedDay = def.type === 'agility' && !slots;
    const kept = fit(list, ctx.minutes, Math.min(maxExercises(ctx.p, ctx.minutes) + (ctx.extra || 0), speedDay ? 8 : 12), ctx.cover);
    // Speed is built with few, fast reps: about 24 sprints and shuttles in a day at most.
    for (let total = sum(kept, 'speed'); total > 24;) {
      const x = kept.filter(y => y.role === 'speed').sort((a, b) => b.e.sets - a.e.sets)[0];
      if (!x || x.e.sets <= 2) break;
      x.e.sets -= 1; total -= 1;
    }
    kept.forEach(x => used.set(x.e.name, (used.get(x.e.name) || 0) + 1));
    return { title: title || def.title, type: def.type, focus: focus || def.focus, exercises: kept.map(x => x.e) };
  }
  // Light days: the easy version from the Light workout when there is one, never more than 2 sets, nothing heavy.
  function easy(e, mode) {
    const l = typeof LIGHT_WORKOUT !== 'undefined' && (LIGHT_WORKOUT[mode].exercises.find(x => x.name === e.name) || LIGHT_WORKOUT[mode === 'gym' ? 'home' : 'gym'].exercises.find(x => x.name === e.name));
    if (l) Object.assign(e, { sets: l.sets, reps: l.reps, rest: l.rest, cues: l.cues });
    e.sets = Math.min(e.sets, 2);
    if (!l && e.track === 'weight' && !/^Light weight/.test(e.cues)) e.cues = `Light weight — easy reps. ${e.cues}`.trim();
    return e;
  }

  const NOTES = {
    pos: { pitcher: 'Pitcher: arm care in every lift, dumbbell and landmine pressing instead of heavy overhead work, extra rows, rotational power.',
      catcher: 'Catcher: goblet squats, lateral lunges and Copenhagen planks for strong hips and groin in the crouch, plus hip mobility.',
      infield: 'Infield: quick feet and side-to-side agility on lifting days, rotational power for hitting and throwing.',
      outfield: 'Outfield: acceleration and top-speed sprints, Nordic curls for healthy hamstrings, and jumps.',
      twoway: 'Two-way: a pitcher\'s arm care and pressing rules, plus position-player speed.' },
    build: { lean: 'Smaller build: an extra set on the big lifts and more muscle-building work — eat big to grow.', average: '',
      big: 'Bigger build: more speed, mobility and conditioning, and fewer hard landings to save your knees.' },
    exp: { new: 'New to lifting: simpler lifts, 3 sets of 8, and weights that leave 2–3 reps in the tank. Learn the movement first.',
      some: 'Some experience: sets of 5–6 on the big lifts.', exp: 'Experienced: heavier sets of 3–5 on the big lifts, with longer rest.' },
    home: { none: 'At home: bodyweight and backpack versions — more reps instead of more weight.', bands: 'At home: bodyweight, backpack and band exercises.',
      dumbbells: 'At home: dumbbell versions of the big lifts.' },
    goal: { all: '', strength: 'Strength & size: an extra accessory on lifting days.', speed: 'Speed: more sprints and jumps, and speed work on lifting days.',
      power: 'Power: jumps and med ball throws on every lifting day, done fast and fresh.', arm: 'Arm health: extra arm care and forearm work, and a mobility day.' },
    season: { offseason: 'Off-season: build strength, power and speed.', preseason: 'Pre-season: heavier, lower-rep lifting and more game-speed sprinting.',
      inseason: 'In-season: short lifts that keep your strength without leaving you sore for games.' }
  };
  const label = (list, k) => (list.find(([x]) => x === k) || [k, k])[1];

  function profileOf(p) {
    const q = { ...DEFAULTS, ...(p || {}) };
    if (!POSITIONS.some(([k]) => k === q.pos) && q.pos !== 'none') q.pos = DEFAULTS.pos;   // 'none': no position yet (Make a workout)
    if (!BUILDS.some(([k]) => k === q.build)) q.build = DEFAULTS.build;
    if (!EXPERIENCE.some(([k]) => k === q.exp)) q.exp = DEFAULTS.exp;
    if (!GOALS.some(([k]) => k === q.goal)) q.goal = DEFAULTS.goal;
    if (!SEASONS.some(([k]) => k === q.season)) q.season = DEFAULTS.season;
    if (!HOME_EQUIP.some(([k]) => k === q.homeEquip)) q.homeEquip = DEFAULTS.homeEquip;
    q.minutes = MINUTES.includes(Number(q.minutes)) ? Number(q.minutes) : DEFAULTS.minutes;
    q.days = [...new Set((Array.isArray(q.days) ? q.days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((a, b) => a - b);
    if (!q.days.length) q.days = DEFAULT_DAYS[3];
    if (q.days.length > 6) q.days = q.days.slice(0, 6);
    q.seed = Number(q.seed) || 0;
    return q;
  }
  // The most a younger athlete should see (from the goal calculator's age): simple lifts under 13, nothing advanced under 15.
  const maxLevelFor = (p, age) => Math.min(p.exp === 'new' ? 1 : p.exp === 'some' ? 2 : 3, age && age < 13 ? 1 : age && age < 15 ? 2 : 3);

  /* ---------- A whole week (gym + home + Light) ---------- */
  function week(profile, { age, rest } = {}) {
    const p = profileOf(profile), kinds = weekKinds(p.season, p.days.length, p.goal), out = { gym: [], home: [], light: {} };
    for (const where of ['gym', 'home']) {
      const ctx = { p, where, mode: where, season: p.season, minutes: p.minutes, maxLevel: maxLevelFor(p, age), have: kit(where, p.homeEquip), rand: rng(p.seed * 7919 + (where === 'gym' ? 1 : 2)) };
      const used = new Map(), days = [];
      for (let d = 0; d < 7; d++) {
        const k = p.days.indexOf(d);
        days.push(k < 0 ? clone(rest) : buildDay(kinds[k], ctx, used, { title: dayTitle(kinds[k], p), focus: dayFocus(kinds[k], p) }));
      }
      out[where] = days;
      out.light[where] = buildDay('light', { ...ctx, minutes: 25, maxLevel: 1 }, new Map(), { focus: `${DAY_KINDS.light.focus}${p.pos === 'catcher' ? ' Extra hip mobility for the crouch.' : p.pos === 'pitcher' || p.pos === 'twoway' ? ' Extra arm care for your throwing arm.' : p.pos === 'outfield' ? ' Extra hamstring and hip work.' : ''}` });
    }
    const notes = [NOTES.pos[p.pos], NOTES.build[p.build], p.season === 'inseason' && p.exp !== 'new' ? '' : NOTES.exp[p.exp], NOTES.goal[p.goal], NOTES.season[p.season], NOTES.home[p.homeEquip]].filter(Boolean);
    if (age && age < 15) notes.push(`Age ${age}: Dugout keeps to simpler lifts — focus on great form and don't test your max.`);
    return { ...out, notes, profile: p, name: `${label(POSITIONS, p.pos)} · ${label(SEASONS, p.season).toLowerCase()}`, summary: summary(p) };
  }
  const clone = o => JSON.parse(JSON.stringify(o || { title: 'Rest Day', type: 'rest', focus: 'Rest and recover.', exercises: [] }));
  function dayTitle(kind, p) {
    const t = DAY_KINDS[kind].title;
    if (kind === 'upper' && (p.pos === 'pitcher' || p.pos === 'twoway')) return 'Upper Body — Pitcher-Safe Strength';
    if (kind === 'speed') return p.pos === 'outfield' ? 'Speed: First Step & Top Speed' : p.pos === 'infield' ? 'Agility: First Step & Range' : p.pos === 'catcher' ? 'Agility & Explosive Hips' : t;
    return t;
  }
  function dayFocus(kind, p) {
    const f = DAY_KINDS[kind].focus, extra = {
      pitcher: { lower: ' Single-leg strength drives your delivery.', upper: ' No heavy overhead pressing — landmine and dumbbell work is kinder to a throwing shoulder.', mobility: ' Extra shoulder and upper-back mobility.' },
      catcher: { lower: ' Hips and adductors keep you strong and healthy in the crouch.', speed: ' Explosive hips for quick pop-ups and blocks.' },
      infield: { speed: ' Side-to-side quickness and a fast first step — range wins games.', totalA: ' Quick feet before you lift.', totalB: ' Quick feet before you lift.' },
      outfield: { speed: ' Drop steps and crossovers — the first move to the ball.', lower: ' Nordic curls keep your hamstrings healthy for sprinting.' },
      twoway: { upper: ' No heavy overhead pressing — you throw a lot.' }
    }[p.pos] || {};
    return f + (extra[kind] || '');
  }
  const summary = p => [p.pos === 'none' ? 'No position' : label(POSITIONS, p.pos), label(BUILDS, p.build).toLowerCase(), label(EXPERIENCE, p.exp).toLowerCase(), label(GOALS, p.goal).toLowerCase(),
    label(SEASONS, p.season).toLowerCase(), `${p.days.length} day${p.days.length === 1 ? '' : 's'}`, `~${p.minutes} min`].join(' · ');

  /* ---------- One workout from what you pick ---------- */
  // Each focus lists its slots, most important first ("mob:hip" = a hip stretch).
  const FOCUS = [
    ['full', 'Full body', ['warm', 'squat', 'push', 'pull', 'plyo', 'hinge', 'arm', 'core', 'single']],
    ['lower', 'Lower body', ['warm', 'squat', 'hinge', 'plyo', 'single', 'ham', 'add', 'calf', 'mob:hip']],
    ['upper', 'Upper body', ['warmarm', 'push', 'pull', 'arm', 'pull', 'power', 'push', 'grip', 'mob:upper']],
    ['power', 'Power & jumps', ['warm', 'plyo', 'power', 'plyo', 'power', 'rot']],
    ['speed', 'Speed & agility', ['warm', 'speed', 'agility', 'drill', 'speed', 'agility', 'cool']],
    ['core', 'Core', ['core', 'rot', 'core', 'core', 'rot']],
    ['arm', 'Arm care', ['warmarm', 'arm', 'arm', 'arm', 'grip', 'arm', 'mob:upper']],
    ['mobility', 'Mobility', ['mob:hip', 'mob:upper', 'mob:hip', 'mob:upper', 'mob:hip', 'mob:upper', 'cool']]
  ];
  const ROLE = { warm: 'prep', warmarm: 'prep', mob: 'prep', cool: 'prep', plyo: 'power', power: 'power', squat: 'main', hinge: 'main', push: 'main', pull: 'main', drill: 'speed', speed: 'speed', agility: 'speed' };
  // The order things happen in a workout: warm up, sprint and jump while fresh, lift, then accessories, arm care, core and stretching.
  const PHASE = { warm: 0, warmarm: 0, drill: 1, speed: 1.5, agility: 1.5, plyo: 2, power: 2, squat: 3, hinge: 3, push: 3, pull: 3, single: 4, ham: 4, add: 4, calf: 4, extra: 4, rot: 5, cond: 5, arm: 6, grip: 6, core: 6, mob: 7, cool: 8 };
  function quick({ focus = ['full'], minutes = 30, where = 'gym', profile, age, seed = 0 } = {}) {
    const p = profileOf(profile), picked = FOCUS.filter(([k]) => focus.includes(k));
    if (!picked.length) picked.push(FOCUS[0]);
    const pitcher = p.pos === 'pitcher' || p.pos === 'twoway', slots = [];
    let mains = 0;
    picked.forEach(([, , list], f) => list.filter(c => c !== 'warm' && c !== 'warmarm').forEach((code, j) => {
      const [slot, like] = code.split(':');
      if (slots.filter(s => s.slot === slot).length >= (slot === 'mob' ? 6 : 3)) return;
      let role = ROLE[slot] || 'acc';
      if (role === 'main' && (mains >= 2 || slots.some(s => s.slot === slot))) role = 'acc';
      if (role === 'main') mains++;
      // The first three of every focus you picked stay; the rest go first when time is short.
      let pri = j < 3 ? 1 : j < 5 ? 2 : 3;
      if (slot === 'arm' && pitcher) pri = Math.min(pri, 2);
      slots.push({ ...S(slot, role, pri, null, like), f, order: PHASE[slot] * 100 + slots.length });
    }));
    // One warm-up (with arm care when there's throwing-arm work), unless it's all stretching.
    if (!picked.every(([k]) => k === 'mobility' || k === 'core')) {
      const arm = picked.some(([, , l]) => l[0] === 'warmarm') || (pitcher && slots.some(s => s.slot === 'push' || s.slot === 'pull' || s.slot === 'arm'));
      slots.push({ ...S(arm ? 'warmarm' : 'warm', 'prep', 1), order: 0 });
    }
    // Pitchers get arm care in anything with pressing or pulling.
    if (pitcher && !slots.some(s => s.slot === 'arm') && slots.some(s => s.slot === 'push' || s.slot === 'pull')) slots.push({ ...S('arm', 'acc', 2), f: 0, order: PHASE.arm * 100 + slots.length });
    slots.sort((a, b) => a.order - b.order);
    const ctx = { p, where, mode: where, season: p.season, minutes: clampMin(minutes), maxLevel: maxLevelFor(p, age), have: kit(where, p.homeEquip),
      rand: rng((Number(seed) || 0) * 104729 + 17), cover: true, extra: picked.length - 1 };
    const names = picked.map(([, l]) => l.toLowerCase());
    const day = buildDay('totalA', ctx, new Map(), { slots, title: picked.map(([, l]) => l).join(' + '),
      focus: `Made for you: ${names.join(' + ')}, about ${ctx.minutes} minutes ${where === 'home' ? 'at home' : 'at the gym'}.` });
    day.type = picked.every(([k]) => k === 'mobility' || k === 'arm') ? 'mobility' : picked.every(([k]) => k === 'speed' || k === 'power') ? 'agility' : 'strength';
    return day;
  }
  const clampMin = m => Math.max(10, Math.min(90, Math.round((Number(m) || 30) / 5) * 5));

  /* ---------- Presets: [id, name, category, where, positions, about, [[exercise, sets, reps, rest]]] ---------- */
  const PRESETS = [
    ['pitcher-arm', 'Pitcher arm care', 'Position', 'gym', ['pitcher', 'twoway'], 'The shoulder, scap and forearm work that keeps a throwing arm healthy. 2–3 times a week, away from your hardest throwing days.', [
      ['Warm-up + band arm care', 1, '8 min', 0], ['Band 90/90 external rotation', 3, '12/arm', 30], ['Cable external rotation', 2, '12/arm', 30], ['Prone Y-T-W raises', 2, '8 each', 30],
      ['Face pulls', 3, '15', 45], ['Scap push-ups', 2, '12', 30], ['Wrist curls + reverse wrist curls', 2, '15 each', 30], ['Towel wringing', 2, '30 sec', 30],
      ['Thoracic open books', 2, '10/side', 15], ['Cross-body shoulder stretch', 2, '30 sec/side', 15]]],
    ['arm-home', 'Arm care at home', 'Position', 'home', ['pitcher', 'twoway', 'catcher', 'outfield', 'infield'], 'A band is all you need. Great on days you throw or the day after.', [
      ['Warm-up + arm circles', 1, '5 min', 0], ['Band pull-aparts', 3, '15', 30], ['Band 90/90 external rotation', 3, '12/arm', 30], ['External rotation hold (doorway)', 2, '20 sec/arm', 20],
      ['Prone Y-T-W raises', 2, '8 each', 30], ['Scap push-ups', 2, '12', 30], ['Wall slides', 2, '10', 30], ['Towel wringing', 2, '30 sec', 30]]],
    ['catcher-legs', 'Catcher legs & hips', 'Position', 'gym', ['catcher'], 'Strong hips, legs and groin for hours in the crouch, and explosive pop-ups.', [
      ['Dynamic warm-up', 1, '8 min', 0], ['90/90 hip switches', 2, '8/side', 20], ['Lateral skater bounds', 3, '5/side', 60], ['Goblet squat', 4, '8', 90],
      ['Trap bar deadlift', 3, '5', 150], ['Lateral lunges', 3, '8/side', 60], ['Copenhagen plank', 3, '20 sec/side', 45], ['Banded lateral walks', 2, '10 steps each way', 30], ['Pigeon stretch', 2, '45 sec/side', 15]]],
    ['infield-agility', 'Infield first step & range', 'Position', 'any', ['infield', 'twoway'], 'Quick feet, side-to-side range and a fast first step. Anywhere with 15 yards of space.', [
      ['Dynamic warm-up', 1, '8 min', 0], ['Line hops', 3, '20 sec', 30], ['Lateral shuffles', 4, '10 yd each way', 45], ['5-10-5 shuttle', 5, '1', 75],
      ['Crossover sprint starts', 5, '10 yd', 60], ['Lateral skater bounds', 3, '5/side', 60], ['Lateral lunges', 3, '8/side', 45], ['Cool-down walk + stretch', 1, '5 min', 0]]],
    ['outfield-speed', 'Outfield speed & jumps', 'Position', 'any', ['outfield'], 'Drop steps, crossovers and jumps for the first move to the ball — and Nordic curls to keep your hamstrings healthy.', [
      ['Dynamic warm-up', 1, '10 min', 0], ['A-skips & B-skips', 3, '20 yd', 45], ['Drop-step sprints', 6, '20 yd', 60], ['Crossover sprint starts', 5, '15 yd', 60],
      ['Broad jumps', 4, '3', 60], ['Nordic curls (feet under couch)', 2, '5', 90], ['Towel hamstring stretch', 2, '45 sec/side', 15], ['Cool-down walk + stretch', 1, '5 min', 0]]],
    ['bat-speed', 'Rotational power (bat speed)', 'Speed & power', 'gym', ['infield', 'outfield', 'catcher', 'twoway'], 'Hips first, then the core, then the arms — the same sequence as a swing, trained with speed.', [
      ['Dynamic warm-up', 1, '8 min', 0], ['Med ball rotational scoop toss', 4, '5/side', 60], ['Med ball overhead slams', 3, '6', 45], ['Landmine rotations', 3, '6/side', 60],
      ['Cable woodchop (high to low)', 3, '8/side', 45], ['Trap bar deadlift', 3, '3', 150], ['Lateral skater bounds', 3, '4/side', 60], ['Pallof press', 2, '10/side', 45], ['Thoracic open books', 2, '10/side', 15]]],
    ['sprint', 'Sprint speed day', 'Speed & power', 'any', [], 'Short, all-out sprints with full rest — the way speed is built. Stop the day before you slow down.', [
      ['Dynamic warm-up', 1, '10 min', 0], ['A-skips & B-skips', 3, '20 yd', 45], ['Base-stealing starts (crossover)', 6, '15 yd', 75], ['Drop-step sprints', 5, '20 yd', 60],
      ['Broad jumps', 3, '3', 60], ['Single-leg calf raises', 2, '15/leg', 30], ['Cool-down walk + stretch', 1, '5 min', 0]]],
    ['lower-strength', 'Lower-body strength', 'Strength', 'gym', [], 'The big leg lifts plus the single-leg and hamstring work that keeps you fast and healthy.', [
      ['Dynamic warm-up', 1, '8 min', 0], ['Box jumps', 3, '3', 90], ['Trap bar deadlift', 4, '5', 150], ['Bulgarian split squat', 3, '8/leg', 90],
      ['Romanian deadlift', 3, '8', 120], ['Nordic hamstring curls', 2, '5', 90], ['Copenhagen plank', 2, '20 sec/side', 45], ['Standing calf raises', 3, '12', 45]]],
    ['upper-safe', 'Upper-body strength (pitcher-safe)', 'Strength', 'gym', ['pitcher', 'twoway'], 'Pressing and plenty of pulling without heavy overhead work — kind to a throwing shoulder.', [
      ['Warm-up + band arm care', 1, '8 min', 0], ['Med ball chest pass', 3, '6', 60], ['Dumbbell bench press', 3, '8', 120], ['Chest-supported row', 4, '8', 90],
      ['Half-kneeling landmine press', 3, '8/arm', 90], ['Single-arm dumbbell row', 3, '10/arm', 60], ['Face pulls', 3, '15', 45], ['Cable external rotation', 2, '12/arm', 30], ['Pallof press', 2, '10/side', 45]]],
    ['full-20', '20-minute full body', 'Quick', 'home', [], 'No equipment, no excuses — a full workout in 20 minutes. Keep the rests short.', [
      ['Warm-up + arm circles', 1, '3 min', 0], ['Broad jumps', 2, '4', 30], ['Reverse lunges', 2, '10/leg', 30], ['Push-ups', 3, '12', 30],
      ['Single-leg glute bridge', 2, '12/leg', 30], ['Table inverted rows', 3, '10', 30], ['Plank shoulder taps', 2, '20 taps', 20]]],
    ['hotel', 'Travel / hotel room', 'Quick', 'home', [], 'For tournament weekends: a chair, a backpack and a bit of floor.', [
      ['Warm-up + arm circles', 1, '5 min', 0], ['Step-ups (chair or bench)', 3, '10/leg', 45], ['Decline push-ups', 3, '10', 45], ['Single-leg RDL (backpack)', 3, '8/leg', 45],
      ['Backpack bent-over rows', 3, '12', 45], ['Side plank hip dips', 2, '10/side', 30], ['Prone Y-T-W raises', 2, '8 each', 30], ['World\'s greatest stretch', 2, '5/side', 15]]],
    ['core', 'Core & anti-rotation', 'Quick', 'any', [], 'A strong trunk moves power from your legs to the bat and ball.', [
      ['Dead bugs', 3, '8/side', 30], ['Side plank hip dips', 3, '10/side', 30], ['Hollow body hold', 3, '20 sec', 30], ['Russian twists (backpack)', 3, '16', 30],
      ['Superman hold', 2, '30 sec', 30], ['Plank shoulder taps', 2, '20 taps', 30]]],
    ['grip', 'Grip & forearm finisher', 'Quick', 'gym', ['pitcher', 'catcher'], 'Add it to the end of any lift — strong forearms protect the elbow.', [
      ['Farmer\'s carry', 3, '40 yd', 60], ['Wrist curls + reverse wrist curls', 2, '15 each', 30], ['Towel wringing', 2, '30 sec', 30], ['Hammer curls', 2, '10', 45]]],
    ['bigger-move', 'Move better (bigger players)', 'Quick', 'any', [], 'Mobility, footwork and low-impact conditioning — quicker on your feet without pounding your joints.', [
      ['Dynamic warm-up', 1, '8 min', 0], ['World\'s greatest stretch', 2, '5/side', 15], ['Line hops', 3, '20 sec', 30], ['Lateral shuffles', 4, '10 yd each way', 45],
      ['Bear crawl', 3, '15 yd', 45], ['Step-ups (chair or bench)', 3, '10/leg', 45], ['90/90 hip switches', 2, '8/side', 20], ['Cool-down walk + stretch', 1, '5 min', 0]]],
    ['game-primer', 'Game-day primer', 'Game day', 'any', [], 'Wakes you up without tiring you out — 1 to 3 hours before first pitch.', [
      ['Dynamic warm-up', 1, '6 min', 0], ['A-skips & B-skips', 2, '20 yd', 30], ['Wall slides', 2, '10', 20], ['Line hops', 2, '15 sec', 30],
      ['Crossover sprint starts', 3, '10 yd', 45], ['World\'s greatest stretch', 1, '5/side', 0]]],
    ['post-game', 'Post-game recovery', 'Game day', 'any', [], 'Right after a game or the next morning: bring your body back down and loosen up.', [
      ['Cool-down walk + stretch', 1, '5 min', 0], ['Ball rolling (tennis or lacrosse ball)', 1, '5 min', 0], ['Thoracic open books', 2, '10/side', 15], ['Cross-body shoulder stretch', 2, '30 sec/side', 15],
      ['90/90 hip switches', 2, '8/side', 15], ['Couch stretch (hip flexors)', 2, '45 sec/side', 15], ['Cat-cow + deep breathing', 1, '3 min', 0]]],
    ['mobility-flow', 'Mobility flow', 'Recovery', 'any', [], 'Hips, back, shoulders and hamstrings — 20 minutes that pay off in every swing and throw.', [
      ['Cat-cow + deep breathing', 1, '2 min', 0], ['World\'s greatest stretch', 2, '5/side', 15], ['90/90 hip switches', 2, '8/side', 15], ['Hip airplanes', 2, '5/leg', 20],
      ['Thoracic open books', 2, '10/side', 15], ['Couch stretch (hip flexors)', 2, '45 sec/side', 15], ['Pigeon stretch', 2, '45 sec/side', 15], ['Towel hamstring stretch', 2, '45 sec/side', 15]]]
  ].map(([id, name, cat, where, pos, about, list]) => ({ id, name, cat, where, pos, about, list }));
  const PRESET_BY_ID = Object.fromEntries(PRESETS.map(p => [p.id, p]));

  // A preset as a day of the plan (in the gym or at home).
  function preset(id, mode = 'gym') {
    const pr = PRESET_BY_ID[id];
    if (!pr) return null;
    const m = pr.where === 'any' ? mode : pr.where;
    const exercises = pr.list.map(([name, sets, reps, rest]) => { const t = tpl(name, m); return { name, sets, reps, rest, track: t.track || 'reps', cues: t.cues || '' }; });
    return { title: pr.name, type: typeOf(exercises), focus: pr.about, exercises, where: m };
  }
  // Mostly stretching and arm care → a mobility day; two or more sprints or shuttles → agility; otherwise strength.
  function typeOf(exercises) {
    const slots = exercises.map(e => (EX_BY_NAME[e.name] || {}).slot);
    if (slots.every(s => ['mob', 'cool', 'warm', 'warmarm', 'arm', 'grip'].includes(s))) return 'mobility';
    return slots.filter(s => ['speed', 'agility', 'drill'].includes(s)).length >= 2 ? 'agility' : 'strength';
  }
  const presetMinutes = id => minutes(preset(id).exercises);

  return { POSITIONS, BUILDS, EXPERIENCE, GOALS, SEASONS, HOME_EQUIP, MINUTES, DEFAULT_DAYS, DEFAULTS, FOCUS, PRESETS, EX, EX_BY_NAME,
    week, quick, preset, presetMinutes, profileOf, summary, typeOf, minutes, label, maxLevelFor, weekKinds };
})();
