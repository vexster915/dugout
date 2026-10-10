/* throw.js — the throwing program: throw harder from the outfield, the infield and behind the plate (Plan → Throwing
   program). Not a pitching program. Used by app.js, section 7e.

   12-week cycles that keep going (each new cycle starts from the longest throw you logged, so the distances grow):

     Ramp-up    weeks 1–3, depending on how long you've been off: catch play out to 60, 90, then 120 ft. Never skip it.
     Build      to week 6: long toss twice a week — out with an arc to your max comfortable distance, then pull-downs back
                in on a line — plus position throws and easy recovery catch. Week 6 is lighter.
     Intent     weeks 7–11: one max-intent day (crow-hop throws on a line, all-out, few of them), one long toss day,
                position throws and recovery catch.
     Test       week 12: lighter throwing, then test your throwing velocity and longest throw.

   No weighted balls: for high-school arms the injury risk isn't worth it. Velocity comes from a strong body and fast
   rotation (the lifting and med ball work in your plans), long toss, intent and good footwork. Arm care before and after
   every session. Sore arm → that day becomes recovery catch; pain → no throwing (the app checks your throwing log).

   It never changes your weekly plan, the 12-week plan or the mobility plan. Alongside them it picks days the same way the
   mobility plan does: hard throwing on hitting or upper-body days (throw first, then lift), never two hard days in a row,
   nothing on the rest day, and nothing that's already in that day's other sessions (warm-ups aside). Reads plan.js
   (like()) and drills.js. */

const THROW = (() => {
  const WEEKS = 12;
  const LAYOFF = [['none', 'I throw most weeks', 'Throwing regularly right now'], ['short', '2–4 weeks off', 'A short break'], ['long', 'A month or more off', 'Coming back after a long break']];
  const KINDS = {
    ramp: { title: 'Throwing: Ramp-Up', hard: false, focus: 'Build the arm back up. Easy, loose throws — the distance grows a little each session. Never skip this part.' },
    long: { title: 'Throwing: Long Toss', hard: true, focus: 'Out with an arc to your max comfortable distance (loose, long arm), then pull-downs back in on a line — harder the closer you get.' },
    intent: { title: 'Throwing: Max Intent', hard: true, focus: 'A few throws as hard as you can, on a line, with full rest between. Few and fast — stop the moment your arm feels off.' },
    pos: { title: 'Throwing: Position Throws', hard: false, focus: 'The throws your position actually makes — footwork first, then a strong, accurate throw.' },
    recov: { title: 'Throwing: Recovery Catch', hard: false, focus: 'Easy catch to flush the arm out. 50% effort, short distance — your arm should feel better after.' },
    test: { title: 'Throwing: Test Day', hard: true, focus: 'Warm up fully, then test: your longest throw and your throwing velocity (radar or a sensor, best of 3). Log them in the Baseball tab.' }
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function answersOf(a = {}) {
    const q = { ...a };
    if (!BUILDER.POSITIONS.some(([k]) => k === q.pos)) q.pos = 'infield';
    if (!['R', 'L'].includes(q.throws)) q.throws = 'R';
    q.age = clamp(Math.round(Number(q.age) || 16), 10, 25);
    q.velo = Number(q.velo) > 0 ? Number(q.velo) : null;
    q.maxDist = clamp(Math.round(Number(q.maxDist) || defaultDist(q)), 90, 400);
    q.partner = q.partner !== false && q.partner !== 'no';
    q.sessions = [3, 4].includes(Number(q.sessions)) ? Number(q.sessions) : 3;
    q.days = [...new Set((Array.isArray(q.days) ? q.days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((x, y) => x - y);
    if (q.days.length !== q.sessions) q.days = q.sessions === 4 ? [0, 1, 3, 5] : [0, 2, 4];
    if (!LAYOFF.some(([k]) => k === q.layoff)) q.layoff = 'none';
    if (!BUILDER.SEASONS.some(([k]) => k === q.season)) q.season = 'offseason';
    q.cycle = Math.max(1, Math.round(Number(q.cycle) || 1));
    return q;
  }
  // A starting guess for a comfortable long-toss distance (ft) by age and position.
  function defaultDist(q) {
    const age = Number(q.age) || 16, base = age <= 12 ? 120 : age <= 14 ? 160 : age <= 16 ? 200 : 230;
    return base + (q.pos === 'outfield' ? 20 : q.pos === 'catcher' ? -10 : 0);
  }
  const rampWeeks = a => ({ none: 1, short: 2, long: 3 })[a.layoff];
  const phaseOf = (a, w) => (w <= rampWeeks(a) ? 'Ramp-up' : w <= 6 ? 'Build' : w <= 11 ? 'Intent' : 'Test');
  const cycleWeek = w => ((Math.max(1, w) - 1) % WEEKS) + 1;

  function kinds(a, w) {
    const ph = phaseOf(a, w), four = a.sessions === 4, inS = a.season === 'inseason';
    if (ph === 'Ramp-up') return four ? ['ramp', 'ramp', 'ramp', 'recov'] : ['ramp', 'ramp', 'ramp'];
    if (ph === 'Test') return four ? ['test', 'recov', 'pos', 'recov'] : ['test', 'recov', 'pos'];
    if (inS) return ['long', 'recov', 'pos'].slice(0, a.sessions);                       // in season: games are the hard throws
    if (ph === 'Build') return four ? ['long', 'pos', 'long', 'recov'] : ['long', 'pos', 'recov'];
    return four ? ['intent', 'long', 'pos', 'recov'] : ['intent', 'long', 'recov'];
  }

  /* ---------- Which day each session goes on ---------- */
  // roles (from BLOCK.roles) and moveDays (the mobility plan's kinds per day) when those plans are on.
  const MOVE_HARD = ['speed', 'agility', 'cond'];
  const HARD_OK = { up: 3, hit: 3, hitrun: 2, arm: 2 }, EASY_OK = { low: 3, fb: 3, pow: 3, hitrun: 3, hit: 2, up: 2, arm: 2 };
  function schedule(answers, w, { roles, moveDays } = {}) {
    const a = answersOf(answers), list = kinds(a, cycleWeek(w)), out = Array(7).fill(null);
    const hard = list.filter(k => KINDS[k].hard), easy = list.filter(k => !KINDS[k].hard);
    const hardAt = d => out[d] && KINDS[out[d]].hard;
    if (!roles && !moveDays) {
      // Your days: hard throwing days apart, easy ones in between.
      const days = a.days, order = [];
      for (let i = 0; i < days.length; i += 2) order.push(days[i]);
      for (let i = 1; i < days.length; i += 2) order.push(days[i]);
      [...hard, ...easy].forEach((k, i) => { if (order[i] != null) out[order[i]] = k; });
      return out;
    }
    const role = d => (roles ? roles[d] : moveDays && moveDays[d] ? 'hit' : 'up');
    const restDay = d => (roles ? roles[d] === 'rest' : false);
    const score = (d, k) => {
      if (out[d] || restDay(d)) return -1;
      if (KINDS[k].hard) {
        if (hardAt((d + 6) % 7) || hardAt((d + 1) % 7)) return -1;               // never two hard throwing days in a row
        const s = HARD_OK[role(d)];
        return s ? s * 10 - (moveDays && moveDays[d] && MOVE_HARD.includes(moveDays[d]) ? 6 : 0) : -1;   // spread the hard days out
      }
      return (EASY_OK[role(d)] || 1) * 10 + (hardAt((d + 6) % 7) ? 2 : 0);    // easy catch the day after a hard day
    };
    for (const k of [...hard, ...easy]) {
      let best = -1, at = -1;
      for (let d = 0; d < 7; d++) { const s = score(d, k); if (s > best) { best = s; at = d; } }
      if (at >= 0) out[at] = k;
    }
    return out;
  }

  /* ---------- One session ---------- */
  const L = (name, sets, reps, rest) => like(name, sets, reps, rest);
  const D = (id, reps) => { const d = typeof DRILL_BY_ID !== 'undefined' && DRILL_BY_ID[id]; return d ? { name: d.n, sets: 1, reps: reps || d.dose, rest: 0, track: 'check', cues: d.cues.join(' · '), drill: d.id } : null; };
  const ft = n => `${Math.round(n / 10) * 10} ft`;
  // Your long toss distance this week: starts a bit inside your comfortable max and grows ~4% a week, to about 15% past it.
  function distance(a, w) {
    const r = rampWeeks(a), k = Math.max(0, w - r);
    return Math.round(a.maxDist * Math.min(1.15, 0.85 + 0.04 * k));
  }
  function session(answers, w, kind, { skip = [] } = {}) {
    const a = answersOf(answers), cw = cycleWeek(w), dist = distance(a, cw), light = cw === 6, ph = phaseOf(a, cw);
    const intentThrows = clamp(8 + (cw - 7), 8, 12) - (a.age < 14 ? 2 : 0);
    const warm = L('Warm-up + band arm care', 1, '8 min', 0), dyn = L('Dynamic warm-up', 1, '5 min', 0);
    const after = [L('Band 90/90 external rotation', 2, '12/arm', 30), L('Prone Y-T-W raises', 2, '8 each', 30), L('Wrist & forearm stretch', 1, '30 sec each', 0), L('Cross-body shoulder stretch', 1, '30 sec/side', 0)];
    const pos = a.pos === 'outfield' ? [D('crow-hop'), a.partner ? D('do-or-die', '8 reps') : null]
      : a.pos === 'catcher' ? [D('catcher-transfer'), D('quick-transfer', '2 sets of 15')]
      : a.pos === 'pitcher' || a.pos === 'twoway' ? [D('quick-transfer', '2 sets of 15'), D('crow-hop', '2 sets of 6')]
      : [D('quick-transfer', '2 sets of 15'), a.partner ? D('long-throws-3b', '12 throws') : D('one-knee')];
    let list = [], throws = 0, far = 0;
    const catchPlay = to => { far = Math.max(far, to); throws += 30; return a.partner ? D('catch-play', `out to ${ft(to)}, about 30 throws`) : L('Recovery catch', 1, `against a wall or net, 30 throws`, 0); };
    if (kind === 'ramp') {
      const to = [60, 90, 120][Math.min(2, cw - 1)];
      list = [dyn, warm, D('one-knee', '15 throws'), catchPlay(to), ...after];
      throws += 15;
    } else if (kind === 'long') {
      const out = light ? Math.round(dist * 0.8) : dist;
      list = [dyn, warm, catchPlay(90),
        a.partner ? { ...L('Long toss: extension', 1, `out to ${ft(out)}`, 0) } : L('Recovery catch', 1, 'net or wall, 20 firm throws', 0),
        a.partner ? L('Long toss: pull-downs', 1, light ? '8 throws' : '12 throws', 0) : null, ...after];
      throws += a.partner ? 25 + (light ? 8 : 12) : 20; far = Math.max(far, a.partner ? out : 0);
    } else if (kind === 'intent') {
      list = [dyn, warm, catchPlay(90), a.partner ? L('Long toss: extension', 1, `out to ${ft(dist * 0.75)}`, 0) : null,
        L('Max-intent crow-hop throws', 1, `${intentThrows} throws`, 0), pos[0], ...after];
      throws += 15 + intentThrows + 10; far = Math.max(far, a.partner ? dist * 0.75 : 0);
    } else if (kind === 'pos') {
      list = [dyn, warm, catchPlay(90), ...pos, ...after];
      throws += 30;
    } else if (kind === 'test') {
      list = [dyn, warm, catchPlay(120), a.partner ? L('Long toss: extension', 1, `out to your max — measure it`, 0) : null,
        L('Max-intent crow-hop throws', 1, '3 throws on the radar', 0), ...after];
      throws += 25;
    } else {
      list = [warm, L('Recovery catch', 1, `${a.partner ? '25 easy throws, 60–90 ft' : '25 easy throws at a wall or net'}`, 0), ...after.slice(1)];
      throws += 25; far = Math.max(far, 90);
    }
    // Nothing that's already in that day's other sessions (warm-ups are done once, first).
    list = list.filter(e => e && !(skip.includes(e.name) && !/warm-up/i.test(e.name)));
    const K = KINDS[kind];
    return { title: K.title, type: 'agility', kind, throws, far: Math.round(far), phase: ph,
      focus: `${K.focus} ${ph} phase${light && kind !== 'recov' ? ' — lighter week' : ''}.${!a.partner && kind !== 'recov' ? ' No partner: long toss needs one — this uses a net or wall instead.' : ''}`,
      exercises: list.map(e => ({ ...e })) };
  }

  function week(answers, w, { roles, moveDays, skipDays } = {}) {
    const a = answersOf(answers), cw = cycleWeek(w), days = schedule(a, w, { roles, moveDays });
    return { week: cw, cycle: Math.floor((Math.max(1, w) - 1) / WEEKS) + a.cycle, phase: phaseOf(a, cw), distance: distance(a, cw),
      days: days.map((k, d) => (k ? session(a, w, k, { skip: (skipDays && skipDays[d]) || [] }) : null)) };
  }
  const weekOn = (start, date) => {
    const p = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const days = Math.floor((p(date) - p(start)) / 86400000);
    return days < 0 ? 0 : Math.floor(days / 7) + 1;
  };
  // Notes for the setup screen.
  function notes(answers) {
    const a = answersOf(answers), r = rampWeeks(a);
    return [
      `${r === 1 ? 'Week 1 ramps' : `Weeks 1–${r} ramp`} your arm up${a.layoff === 'long' ? ' — after a long break, this is where arms get hurt if you rush' : ''}. Long toss starts around ${ft(distance(a, r + 1))} and grows about 4% a week to ${ft(distance(a, 11))}.`,
      a.velo ? `You throw ${a.velo} mph now. With strength, rotational power and intent, adding a few mph over a cycle is a realistic goal — retest in week 12.` : 'Test your throwing velocity in week 12 (or now, if you have a radar) to see the gain.',
      a.pos === 'outfield' ? 'Outfield: crow-hop throws and do-or-die balls — long, accurate throws on a line to the cutoff or the base.'
        : a.pos === 'catcher' ? 'Catcher: transfer and footwork for pop time, plus long toss for arm strength.'
        : a.pos === 'pitcher' || a.pos === 'twoway' ? 'This program is for position throwing, not pitching. On days you pitch or throw a bullpen, skip the throwing session.'
        : 'Infield: quick transfers and throws across the diamond — accurate first, then harder.',
      a.partner ? 'Long toss needs a partner and open space — a field is best.' : 'No partner: long toss is replaced with net or wall throws. Find a partner when you can — long toss is the best arm builder.',
      'No weighted balls. Arm care before and after every session. A sore arm turns the day into easy recovery catch; pain means no throwing — see an athletic trainer.',
      a.season === 'inseason' ? 'In season: games are your hard throws, so there are no max-intent days — long toss and position throws keep the arm strong.' : ''
    ].filter(Boolean);
  }

  return { WEEKS, KINDS, LAYOFF, answersOf, kinds, schedule, session, week, weekOn, notes, cycleWeek, phaseOf, distance, defaultDist };
})();
