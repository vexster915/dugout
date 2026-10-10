/* move.js — the mobility plan: agility, sprinting, stretching and baseball conditioning (Plan → Mobility plan). Used by
   app.js, section 7d.

   8-week waves that repeat: Base (weeks 1–3: technique, an aerobic base, steady holds), Build (4–6: more sprints, top
   speed, repeat sprints, longer holds) and Sharpen (7–8: fewer, faster, game-speed reps). Each week has 3–6 sessions:

     Speed          acceleration, first steps out of a lead-off, top speed, base-running turns
     Agility        change of direction, shuttles, the L-drill and position footwork (shuffle-to-sprint, drop steps)
     Conditioning   baseball cardio: repeat 30-yard sprints (fast in the 7th inning), tempo runs, bike or rope intervals
     Flexibility    a full mobility and stretching session
     Recovery       easy cardio, rolling and mobility

   It never changes your weekly plan or the 12-week plan — its sessions sit next to them. When the 12-week plan is on, it
   schedules around it: sprint, agility and conditioning days land on hitting or upper-body days (never on leg days, the
   12-week sprint day or its rest day), flexibility and recovery go on leg days, and anything already in that day's
   12-week workout is left out. Like the other data files, you never need to edit this. It reads plan.js (like()). */

const MOVE = (() => {
  const WEEKS = 8;
  const PHASES = [
    { n: 1, name: 'Base', weeks: '1–3', goal: 'Sprint technique, an aerobic base and steady stretching. Smooth before fast.' },
    { n: 2, name: 'Build', weeks: '4–6', goal: 'More sprints, top speed, repeat sprints for late-game legs, and longer holds.' },
    { n: 3, name: 'Sharpen', weeks: '7–8', goal: 'Fewer, faster reps at game speed. Quality over quantity — you should leave feeling quick.' }
  ];
  const FOCUS = [['all', 'All-around', 'A bit of everything'], ['speed', 'Speed', 'First step, steals and top speed'], ['agility', 'Agility', 'Quickness, range and change of direction'],
    ['conditioning', 'Conditioning', 'Cardio that keeps you fast all game'], ['flexibility', 'Flexibility', 'Move better and stay loose']];
  const WHERE = [['field', 'A field or track (40+ yards)'], ['gym', 'A gym (turf, bike)'], ['home', 'Driveway or yard (about 20 yards)']];
  const SORE = [['knee', 'Knees'], ['hamstring', 'Hamstrings'], ['back', 'Lower back']];
  const KINDS = {
    speed: { title: 'Speed & Acceleration', hard: true, focus: 'First steps, lead-off starts and top speed. Full rest between reps — every one should be your fastest. Stop if you slow down.' },
    agility: { title: 'Agility & Quickness', hard: true, focus: 'Change of direction and the footwork of your position. Stay low on every turn and rest fully.' },
    cond: { title: 'Baseball Conditioning', hard: true, focus: 'Baseball is short sprints with rest in between. This trains you to be just as fast in the 7th inning as the 1st.' },
    flex: { title: 'Flexibility & Mobility', hard: false, focus: 'Moving drills first, then long, relaxed holds. Breathe out into every stretch — never force it.' },
    recov: { title: 'Recovery: Easy Cardio + Mobility', hard: false, focus: 'Easy cardio you could talk through, then loosen up. You should feel better when you finish.' }
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function answersOf(a = {}) {
    const q = { ...a };
    if (!BUILDER.POSITIONS.some(([k]) => k === q.pos)) q.pos = 'infield';
    q.age = clamp(Math.round(Number(q.age) || 16), 10, 25);
    q.sessions = clamp(Math.round(Number(q.sessions) || 4), 3, 6);
    q.minutes = [20, 30, 45].includes(Number(q.minutes)) ? Number(q.minutes) : 30;
    if (!WHERE.some(([k]) => k === q.where)) q.where = 'field';
    if (!FOCUS.some(([k]) => k === q.focus)) q.focus = 'all';
    if (!BUILDER.SEASONS.some(([k]) => k === q.season)) q.season = 'offseason';
    q.hill = !!q.hill;
    q.sore = (Array.isArray(q.sore) ? q.sore : []).filter(k => SORE.some(([s]) => s === k));
    q.days = [...new Set((Array.isArray(q.days) ? q.days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((x, y) => x - y);
    if (q.days.length !== q.sessions) q.days = ({ 3: [1, 3, 5], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] })[q.sessions];
    q.seed = Number(q.seed) || 0;
    return q;
  }
  const phaseOf = w => (w <= 3 ? 1 : w <= 6 ? 2 : 3);
  const waveWeek = w => ((Math.max(1, w) - 1) % WEEKS) + 1;          // 8-week waves that repeat

  // The sessions of a week, hard ones first.
  function kinds(a) {
    const n = a.season === 'inseason' ? Math.min(3, a.sessions) : a.sessions;
    const base = ({ 3: ['speed', 'agility', 'flex'], 4: ['speed', 'agility', 'cond', 'flex'], 5: ['speed', 'agility', 'cond', 'flex', 'recov'], 6: ['speed', 'agility', 'cond', 'flex', 'recov', 'flex'] })[n].slice();
    const swap = (from, to) => { const i = base.lastIndexOf(from); if (i >= 0) base[i] = to; };
    if (a.focus === 'speed') n >= 4 ? swap('cond', 'speed') : swap('agility', 'speed');
    if (a.focus === 'agility') n >= 4 ? swap('cond', 'agility') : swap('speed', 'agility');
    if (a.focus === 'conditioning') n >= 5 ? swap('recov', 'cond') : swap('agility', 'cond');
    if (a.focus === 'flexibility') n >= 5 ? swap('recov', 'flex') : n === 4 ? swap('cond', 'flex') : null;
    if (a.season === 'inseason') return ['speed', 'flex', 'recov'].slice(0, n);
    return base;
  }

  /* ---------- Which day each session goes on ---------- */
  // roles: from BLOCK.roles() when the 12-week plan is on (low, up, fb, pow, hit, hitrun, arm, rest), else null.
  const HARD_OK = { hit: 3, up: 2 }, EASY_OK = { low: 3, fb: 3, pow: 3, hitrun: 3, arm: 2, up: 1, hit: 1 };
  function schedule(answers, roles) {
    const a = answersOf(answers), list = kinds(a), out = Array(7).fill(null), notes = [];
    const hard = list.filter(k => KINDS[k].hard), easy = list.filter(k => !KINDS[k].hard);
    if (!roles) {
      // Your days: hard sessions spread apart, easy ones in between.
      const days = a.days.slice(0, list.length), order = [];
      for (let i = 0; i < days.length; i += 2) order.push(days[i]);
      for (let i = 1; i < days.length; i += 2) order.push(days[i]);
      [...hard, ...easy].forEach((k, i) => { if (order[i] != null) out[order[i]] = k; });
      return { days: out, notes };
    }
    // Alongside the 12-week plan: hard days only where your legs are fresh, and never the day before a leg day if it can be helped.
    const legs = r => r === 'low' || r === 'fb' || r === 'pow';
    const score = (d, k) => {
      const r = roles[d], next = roles[(d + 1) % 7];
      if (r === 'rest' || out[d]) return -1;
      if (KINDS[k].hard) return HARD_OK[r] ? HARD_OK[r] * 10 - (legs(next) ? 5 : 0) : -1;
      return (EASY_OK[r] || 0) * 10;
    };
    for (const k of [...hard, ...easy]) {
      let best = -1, at = -1;
      for (let d = 0; d < 7; d++) { const s = score(d, k); if (s > best) { best = s; at = d; } }
      if (at >= 0) out[at] = k;
      else if (KINDS[k].hard) {
        // No fresh-legs day left: make it an easy session instead of stacking sprints on a leg day.
        const alt = [0, 1, 2, 3, 4, 5, 6].find(d => !out[d] && roles[d] !== 'rest' && EASY_OK[roles[d]]);
        if (alt != null) { out[alt] = 'flex'; notes.push(`${KINDS[k].title} became a flexibility session this week — no day with fresh legs was left.`); }
      }
    }
    return { days: out, notes };
  }

  /* ---------- One session ---------- */
  const L = (name, sets, reps, rest, pri = 2) => ({ ...like(name, sets, reps, rest), pri });
  const hold = (name, reps) => ({ ...like(name, 1, reps, 0), pri: 1, fin: true });
  function session(answers, w, kind, { skip = [], minutes } = {}) {
    const a = answersOf(answers), wk = waveWeek(w), ph = phaseOf(wk), mins = minutes || a.minutes, sore = k => a.sore.includes(k);
    const field = a.where === 'field', gym = a.where === 'gym', home = a.where === 'home';
    const by = (p1, p2, p3) => [p1, p2, p3][ph - 1];
    const sec = by(30, 45, 60), young = a.age < 14, inS = a.season === 'inseason';
    const sets = n => Math.max(1, n - (young ? 1 : 0) - (inS ? 1 : 0));
    let list = [];
    const warm = L('Dynamic warm-up', 1, `${mins <= 20 ? 6 : 8} min`, 0, 1);
    if (kind === 'speed') {
      list = [warm, L('A-skips & B-skips', 2, '20 yd', 30, 1), L('Wall drives', by(3, 2, 2), '5/leg', 45, 2),
        L('Falling starts', sets(by(4, 4, 3)), home ? '10 yd' : '15 yd', 60, 1),
        L(home ? 'Crossover sprint starts' : 'Base-stealing starts (crossover)', sets(by(3, 4, 4)), home ? '15 yd' : '15 yd', 75, 1),
        ...(a.hill ? [L('Hill sprints', sets(by(4, 6, 4)), by('8 sec', '10 sec', '10 sec'), 90, 2)] : []),
        ...(!home && ph >= 2 && !sore('hamstring') ? [L('Flying sprints', sets(by(0, 3, 4)), '10 yd fly', 150, 1)] : []),
        ...(field && ph >= 2 ? [L('Base-running turns', sets(by(0, 3, 4)), 'home to 2nd', 90, 2)] : []),
        hold('Calf stretch (wall)', '30 sec/side'), hold('Half-kneeling hip flexor stretch', `${sec} sec/side`)];
    } else if (kind === 'agility') {
      const posDrill = a.pos === 'outfield' ? L('Drop-step sprints', sets(4), '20 yd', 45, 1) : a.pos === 'pitcher' ? L('Lateral shuffles', 3, '10 yd each way', 45, 2) : L('Shuffle-to-sprint', sets(by(4, 5, 4)), '5 yd + 10 yd', 60, 1);
      list = [warm, L('Carioca', 2, '20 yd each way', 30, 1), L(gym ? 'Agility ladder drills' : 'Line hops', 3, gym ? '1 pattern' : '20 sec', 30, 2),
        L(home ? '5-10-5 shuttle' : 'Pro agility shuttle (5-10-5)', sets(by(4, 5, 4)), '1', 75, 1), posDrill,
        ...(ph >= 2 ? [L('L-drill (3-cone)', sets(by(0, 3, 4)), '1', 90, 1)] : []),
        ...(!sore('knee') ? [L('Lateral skater bounds', sets(3), '4/side', 60, 2)] : []),
        L(gym ? 'Copenhagen plank' : home ? 'Copenhagen plank (couch)' : 'Side plank hip dips', 2, gym || home ? '20 sec/side' : '10/side', 45, 3),
        hold('Frog stretch', `${sec} sec`), hold('Pigeon stretch', `${sec} sec/side`)];
    } else if (kind === 'cond') {
      const engine = field ? L('Tempo runs', sets(by(8, 6, 4)), '100 yd', 45, 1) : gym ? L('Bike intervals', sets(by(6, 8, 6)), '20 sec', 70, 1) : L('Jump rope', sets(by(5, 6, 5)), '1 min', 30, 1);
      list = [warm,
        ...(ph >= 2 && !sore('hamstring') ? [L('Repeat 30-yard sprints', by(1, 2, 2), home ? '6 × 20 yd' : '6 × 30 yd', 180, 1)] : []),
        ...(field && ph >= 2 ? [L('Base-running turns', sets(3), 'home to 2nd', 90, 2)] : []),
        engine, ...(ph === 1 ? [L('Bear crawl', 3, '15 yd', 45, 3)] : []),
        hold(gym ? 'Band hamstring stretch' : 'Towel hamstring stretch', `${sec} sec/side`), hold('Supine spinal twist', '30 sec/side')];
    } else if (kind === 'flex') {
      list = [L('Cat-cow + deep breathing', 1, '2 min', 0, 1), L('Hip CARs', 2, '5/side', 15, 1), L('Shoulder CARs', 2, '5/arm', 15, 2), L("World's greatest stretch", 2, '5/side', 15, 1),
        ...(!sore('knee') ? [L('Cossack squats', 2, '6/side', 30, 2)] : []), L('Thread the needle', 2, '8/side', 15, 2), L('Deep squat hold', 2, `${sec} sec`, 15, 3),
        L('Half-kneeling hip flexor stretch', 2, `${sec} sec/side`, 15, 1), L('Frog stretch', 2, `${sec} sec`, 15, 2), L('Pigeon stretch', 2, `${sec} sec/side`, 15, 1),
        L(gym ? 'Band hamstring stretch' : 'Towel hamstring stretch', 2, `${sec} sec/side`, 15, 1), L('Calf stretch (wall)', 1, '30 sec/side', 0, 3),
        L("Child's pose lat stretch", 2, '30 sec/side', 15, 2), L('Supine spinal twist', 1, `${sec} sec/side`, 0, 1)];
    } else {
      list = [L('Easy cardio (bike or jog)', 1, `${clamp(mins - 10, 12, 30)} min`, 0, 1), L(gym ? 'Foam roll' : 'Ball rolling (tennis or lacrosse ball)', 1, '5 min', 0, 2),
        L('90/90 hip switches', 2, '8/side', 15, 1), L('Thread the needle', 2, '8/side', 15, 2), L('Cat-cow + deep breathing', 1, '2 min', 0, 2), L('Supine spinal twist', 1, '30 sec/side', 0, 1)];
    }
    // Nothing that's already in that day's 12-week workout.
    list = list.filter(e => e.sets > 0 && !skip.includes(e.name));
    // Fit the time: the least important come off first, then a set at a time.
    const over = () => BUILDER.minutes(list) > mins + 3;
    for (const pri of [3, 2]) for (let i = list.length - 1; i >= 0 && over(); i--) if (list[i].pri === pri && !list[i].fin) list.splice(i, 1);
    for (const e of list) if (over() && e.sets > 2) e.sets--;
    const K = KINDS[kind];
    return { title: K.title, type: kind === 'flex' || kind === 'recov' ? 'mobility' : 'agility', kind, focus: `${K.focus} ${PHASES[ph - 1].name} (weeks ${PHASES[ph - 1].weeks}): ${PHASES[ph - 1].goal}`,
      exercises: list.map(({ pri, fin, ...e }) => e) };
  }

  // A whole week: 7 days, each null or a session. blockDays: that week's 12-week workouts (to leave out what's in them).
  function week(answers, w, { roles, blockDays } = {}) {
    const a = answersOf(answers), { days, notes } = schedule(a, roles);
    return { week: waveWeek(w), round: Math.floor((Math.max(1, w) - 1) / WEEKS) + 1, phase: PHASES[phaseOf(waveWeek(w)) - 1], notes,
      days: days.map((k, d) => (k ? session(a, w, k, { skip: blockDays && blockDays[d] ? blockDays[d].exercises.map(e => e.name) : [] }) : null)) };
  }
  const weekOn = (start, date) => {
    const p = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const days = Math.floor((p(date) - p(start)) / 86400000);
    return days < 0 ? 0 : Math.floor(days / 7) + 1;
  };

  return { WEEKS, PHASES, FOCUS, WHERE, SORE, KINDS, answersOf, kinds, schedule, session, week, weekOn, waveWeek };
})();
