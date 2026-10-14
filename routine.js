/* routine.js — your day, minute by minute (Today → Your day). Like plan.js, you never need to edit this file.

   ROUTINE.day(r, x) builds one day from:
     r  your answers (ROUTINE.answersOf): wake times, school, practice, homework, sleep, training and dinner times
     x  what's on that day (the app works it out): { dow, nextWake, lift, throw, move, rest, game, meals }
          lift / throw / move   { title, minutes } of today's sessions (or null)
          game                  { time: 'HH:MM' } on a game day
          meals                 { breakfast, lunch, pre, post, dinner, snack } recipe names from the meal plan

   The fixed points come first — lights-out (counted back from tomorrow's wake-up so you get your sleep), school,
   practice, a game — and everything else is fitted between them: training in the order throw → lift → mobility,
   the meals around it (a snack 60–90 minutes before, recovery food right after), homework, then a wind-down.
   If a day doesn't fit, it says so and what to move, instead of quietly cutting your sleep.

   Times are minutes after midnight (390 = 6:30 AM). */

const ROUTINE = (() => {
  const SLEEP = [[8, '8 h'], [8.5, '8½ h'], [9, '9 h'], [9.5, '9½ h'], [10, '10 h']];
  const DEFAULTS = {
    wake: '06:15', weekendWake: '08:00', school: [0, 1, 2, 3, 4], schoolStart: '07:25', schoolEnd: '14:20', lunch: '11:45', commute: 15,
    practice: [], practiceStart: '15:00', practiceEnd: '17:30', homework: 120, sleep: 9, train: '15:30', weekendTrain: '10:00', dinner: '18:30',
    amStretch: true
  };
  const HM = /^\d{2}:\d{2}$/;
  const m = hhmm => { const [h, mi] = String(hhmm).split(':').map(Number); return h * 60 + mi; };
  const hhmm = t => { t = ((Math.round(t) % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const ampm = t => { t = ((Math.round(t) % 1440) + 1440) % 1440; const h = Math.floor(t / 60); return `${h % 12 || 12}:${String(t % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const days = v => (Array.isArray(v) ? [...new Set(v.map(Number).filter(d => d >= 0 && d <= 6))].sort() : null);

  // Saved or restored answers → clean answers (anything missing or broken gets the default).
  function answersOf(a) {
    a = a && typeof a === 'object' ? a : {};
    const time = k => (HM.test(a[k] || '') && m(a[k]) < 1440 ? a[k] : DEFAULTS[k]);
    const num = (k, lo, hi) => { const n = Number(a[k]); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : DEFAULTS[k]; };
    const out = {
      wake: time('wake'), weekendWake: time('weekendWake'), school: days(a.school) || DEFAULTS.school.slice(), schoolStart: time('schoolStart'), schoolEnd: time('schoolEnd'),
      lunch: time('lunch'), commute: Math.round(num('commute', 0, 90)), practice: days(a.practice) || [], practiceStart: time('practiceStart'), practiceEnd: time('practiceEnd'),
      homework: Math.round(num('homework', 0, 300) / 15) * 15, sleep: SLEEP.some(([v]) => v === Number(a.sleep)) ? Number(a.sleep) : DEFAULTS.sleep,
      train: time('train'), weekendTrain: time('weekendTrain'), dinner: time('dinner'), amStretch: a.amStretch !== false
    };
    if (m(out.schoolEnd) <= m(out.schoolStart)) out.schoolEnd = DEFAULTS.schoolEnd;
    if (m(out.practiceEnd) <= m(out.practiceStart)) out.practiceEnd = hhmm(m(out.practiceStart) + 150);
    return out;
  }
  const schoolDay = (r, dow) => r.school.includes(dow);
  const wakeOn = (r, dow) => m(schoolDay(r, dow) ? r.wake : r.weekendWake);

  function day(r, x) {
    r = answersOf(r);
    const items = [], warn = [], dow = x.dow;
    let school = schoolDay(r, dow);
    if (school && x.game && m(x.game.time) - 90 < m(r.schoolEnd)) {   // a game during school hours: no school that day
      school = false;
      warn.push('The game is during school hours, so this day is laid out without school.');
    }
    const practice = r.practice.includes(dow) && !x.game;
    const meals = x.meals || {};
    const add = (at, min, title, detail, kind, act) => { const it = { at: Math.round(at), end: Math.round(at + min), title, detail: detail || '', kind, act: act || null }; items.push(it); return it; };
    const meal = (slot, label) => (meals[slot] ? `${label}: ${meals[slot]}` : label);
    let wake = wakeOn(r, dow);
    const leaveAt = school ? m(r.schoolStart) - r.commute : null;
    if (school && leaveAt - wake < 15) {
      warn.push(`Your ${ampm(wake)} wake-up doesn't leave time before you head to school at ${ampm(leaveAt)} — this shows a ${ampm(leaveAt - 25)} wake-up. Change it in your times.`);
      wake = leaveAt - 25;
    }
    const nextWake = x.nextWake != null ? x.nextWake : wakeOn(r, (dow + 1) % 7);
    const lightsOut = nextWake + 1440 - r.sleep * 60, windDown = lightsOut - 30;

    // ---- Morning ----
    const room = school ? leaveAt - wake : 999;                    // minutes before you leave for school
    const stretch = r.amStretch && room >= 40, grab = room < 35;
    add(wake, 10, 'Wake up', 'Big glass of water and 5 minutes of daylight (it sets your body clock so you fall asleep easier tonight). Do your Dugout check-in.', 'wake', { action: 'checkin' });
    let cur = wake + 10;
    if (stretch) { add(cur, 5, 'Morning mobility', 'Cat-cow, world\'s greatest stretch, hip circles — 5 easy minutes to wake your body up.', 'train'); cur += 5; }
    const bLen = grab ? Math.max(5, Math.min(10, room - 10)) : 20;
    add(cur, bLen, meal('breakfast', 'Breakfast'), grab ? 'Tight morning — grab-and-go: overnight oats, a PB&J or a bagel and milk. Never skip it.' : x.game ? 'Normal breakfast — the big pre-game meal comes later.' : 'Protein + carbs. Don\'t skip it: a growing athlete can\'t catch up on a missed meal.', 'meal', { action: 'meal', slot: 'breakfast' });
    cur += bLen;

    // The training block (throw → lift → mobility), placed at `at`. Returns when it ends.
    const sessions = [];
    if (x.throw && !x.throw.blocked) sessions.push(['throw', `Throwing: ${x.throw.title}`, x.throw.minutes, 'First, right after your warm-up, while your arm is fresh.']);
    if (x.lift) sessions.push(['lift', x.lift.title, x.lift.minutes, sessions.length ? 'Your workout from the Plan tab — skip the warm-up you already did.' : 'Your workout from the Plan tab.']);
    if (x.move) sessions.push(['move', `Mobility: ${x.move.title}`, x.move.minutes, sessions.length ? 'Last — after throwing and lifting.' : 'Your mobility plan session.']);
    const trainBlock = (at, list, { postMeal = true } = {}) => {
      let t = at;
      list.forEach(([kind, title, min, why]) => {
        add(t, min, title, why, 'train', { action: kind });
        t += min + 5;
      });
      t -= list.length ? 5 : 0;
      if (postMeal && list.length && !x.rest) { add(t, 15, meal('post', 'Recovery food'), 'Within an hour of training: protein + carbs (chocolate milk or a shake counts).', 'meal', { action: 'meal', slot: 'post' }); t += 15; }
      if (list.length) { add(t, 15, 'Shower', '', 'free'); t += 15; }
      return t;
    };
    const preSnack = (at, note) => { if (!x.rest) add(at, 10, meal('pre', 'Pre-workout snack'), note || '60–90 minutes before you train: easy carbs, a little protein.', 'meal', { action: 'meal', slot: 'pre' }); };
    const minutes = list => list.reduce((s, [, , min]) => s + min, 0) + Math.max(0, list.length - 1) * 5;

    let homework = school || dow === 6 ? r.homework : 0;            // school nights, plus Sunday
    let dinnerAt = m(r.dinner), dinnerDone = false;
    const doDinner = at => { const t = Math.max(at, dinnerAt); add(t, 30, meal('dinner', 'Dinner'), 'A full plate: protein, a big serving of carbs, vegetables. Drink water with it.', 'meal', { action: 'meal', slot: 'dinner' }); dinnerDone = true; return t + 30; };
    let lateMove = null;                                             // a mobility session that goes wherever there's room tonight

    if (school) {
      // ---- School day ----
      const sStart = m(r.schoolStart), sEnd = m(r.schoolEnd), leave = sStart - r.commute;
      if (leave - wake < 35) warn.push(`Only ${leave - wake} minutes between waking up and leaving — 45 gives you time for breakfast and a 5-minute warm-up.`);
      if (r.commute) add(leave, r.commute, 'Leave for school', 'Water bottle, snack and lunch packed?', 'travel');
      add(sStart, sEnd - sStart, 'School', '', 'school');
      add(m(r.lunch), 25, meal('lunch', 'Lunch'), 'Your biggest chance to eat during school — finish all of it.', 'meal', { action: 'meal', slot: 'lunch' });
      cur = sEnd;

      if (x.game) {
        cur = gameDay(cur);
      } else if (practice) {
        const pStart = Math.max(m(r.practiceStart), sEnd), pEnd = Math.max(m(r.practiceEnd), pStart + 30);
        if (!x.rest) {
          const at = pStart - sEnd >= 15 ? Math.max(sEnd, pStart - 45) : sEnd - 10;   // no gap: eat it in your last class
          add(at, 10, meal('pre', 'Snack before practice'), at < sEnd ? 'Practice starts right after the bell — eat it in your last class or between bells.' : 'Easy carbs before practice — a banana, a bagel, pretzels.', 'meal', { action: 'meal', slot: 'pre' });
        }
        add(pStart, pEnd - pStart, 'Practice', x.throw && !x.throw.blocked ? 'Practice throwing counts as today\'s throwing — skip the throwing program session (your arm only gets so many throws a day).' : 'Bring a full water bottle — drink between drills.', 'practice');
        cur = pEnd;
        const after = sessions.filter(([k]) => k === 'lift');
        if (after.length) {
          add(cur, after[0][2], after[0][1], 'Right after practice while you\'re warm (skip it if your team lifted at practice).', 'train', { action: 'lift' });
          cur += after[0][2];
        }
        add(cur, 15, meal('post', 'Recovery food'), 'Within an hour after practice: protein + carbs.', 'meal', { action: 'meal', slot: 'post' });
        cur += 15;
        if (r.commute) { add(cur, r.commute, 'Head home', '', 'travel'); cur += r.commute; }
        add(cur, 15, 'Shower', '', 'free'); cur += 15;
        cur = doDinner(cur);
        lateMove = sessions.find(([k]) => k === 'move') || null;
      } else {
        const home = sEnd + r.commute;
        if (r.commute) add(sEnd, r.commute, 'Head home', '', 'travel');
        cur = home;
        if (sessions.length) {
          let T = Math.max(m(r.train), home + 30);
          const snackAt = Math.max(home, T - 75);
          preSnack(snackAt, snackAt <= home ? 'Eat it as soon as you\'re home, then give it 45+ minutes before you train.' : '');
          T = Math.max(T, snackAt + 45);
          cur = trainBlock(T, sessions);
        }
        cur = doDinner(cur);
      }
    } else if (x.game) {
      cur = gameDay(cur);
    } else {
      // ---- No school: train in the morning, the afternoon is yours ----
      const list = sessions;
      if (list.length) {
        let T = Math.max(m(r.weekendTrain), cur + 60);
        if (T - cur >= 120) preSnack(T - 75);
        cur = trainBlock(T, list);
      }
      const lunchAt = Math.max(m('12:30'), cur + (list.length ? 45 : 0));
      add(lunchAt, 25, meal('lunch', 'Lunch'), '', 'meal', { action: 'meal', slot: 'lunch' });
      cur = lunchAt + 25;
      cur = doDinner(cur);
    }

    function gameDay(from) {
      const G = Math.max(m(x.game.time), from + 20), meal1 = G - 210;
      if (meal1 >= from) add(meal1, 30, meal(meal1 < 690 ? 'breakfast' : 'lunch', 'Pre-game meal'), 'Carbs + lean protein, easy on fat and fiber. Done eating about 3 hours before first pitch.', 'meal');
      else warn.push(school ? 'The pre-game meal falls during school — make lunch your big pre-game meal.' : 'An early game: breakfast is your pre-game meal — eat it at least 2 hours before first pitch.');
      const water = Math.max(from, G - 120);
      if (water + 5 <= G - 15) add(water, 5, 'Drink 16 oz of water', 'Add a sports drink if it\'s hot.', 'meal');
      const arrive = Math.max(from, Math.min(G - 15, Math.max(water + 5, G - 90)));
      add(arrive, G - arrive, 'Arrive · team warm-up', 'Dynamic warm-up, throwing progression, BP.', 'practice');
      if (G - 60 >= arrive && G - 50 <= G) add(G - 60, 10, meal('pre', 'Top-off snack'), 'Small and carb-based, 30–60 minutes before.', 'meal', { action: 'meal', slot: 'pre' });
      if (G > m(x.game.time)) warn.push(`First pitch at ${ampm(m(x.game.time))} leaves no time to get there — check the game time.`);
      add(G, 150, 'Game', 'Sip water every half-inning. Game days replace lifting and the throwing program.', 'game');
      let t = G + 150;
      add(t + 15, 15, meal('post', 'Recovery snack'), 'Within an hour of the final out.', 'meal', { action: 'meal', slot: 'post' });
      t += 30;
      if (r.commute) { add(t, r.commute, 'Head home', '', 'travel'); t += r.commute; }
      add(t, 15, 'Shower', '', 'free'); t += 15;
      return doDinner(t);
    }

    // ---- Evening: fit homework (and a leftover mobility session) into the open time, then the snack and bed ----
    const gapsIn = (from, to) => {
      items.sort((a, b) => a.at - b.at || a.end - b.end);
      const out = [];
      let t = from;
      for (const i of items) { if (i.end <= from) continue; if (i.at > t) out.push([t, Math.min(i.at, to)]); t = Math.max(t, i.end); if (t >= to) break; }
      if (t < to) out.push([t, to]);
      return out.filter(([a, b]) => b > a);
    };
    const hwFrom = school ? m(r.schoolEnd) : Math.max(wake + 120, m('13:00'));
    for (const [a, b] of gapsIn(hwFrom, windDown - 15)) {
      if (homework < 30) break;
      const start = a + 10, len = Math.min(homework, Math.floor((b - 5 - start) / 15) * 15);
      if (len < 30) continue;
      add(start, len, dow === 6 ? 'Homework + plan the week' : 'Homework', len >= 90 ? 'Phone in another room. 50 minutes on, 10 off.' : 'Phone in another room — focused time goes twice as fast.', 'homework');
      homework -= len;
    }
    if (homework >= 30) warn.push(`${homework} minutes of homework don't fit before bed — use a free period at school, or start the minute you get home.`);
    if (lateMove) {
      const g = gapsIn(cur, windDown - 15).find(([a, b]) => b - a >= lateMove[2] + 10);
      if (g) add(g[0] + 5, lateMove[2], lateMove[1], 'Easy tonight after practice — it doubles as recovery.', 'train', { action: 'move' });
      else warn.push(`No room tonight for the mobility session (${lateMove[2]} min) — do it tomorrow morning or on the weekend.`);
    }
    const end = Math.max(cur, ...items.map(i => i.end));
    const sg = gapsIn(Math.max(lightsOut - 150, end), windDown).find(([a, b]) => b - a >= 25);
    if (sg) add(Math.max(sg[0] + 5, Math.min(sg[1] - 20, lightsOut - 90)), 15, meal('snack', 'Evening snack'), 'Protein before bed (Greek yogurt, cottage cheese, milk) — your muscles rebuild while you sleep.', 'meal', { action: 'meal', slot: 'snack' });
    const late = Math.max(0, end - windDown);
    const out = Math.max(lightsOut, end + 30);
    add(out - 30, 20, 'Wind down', `Phone on the charger across the room. 10-minute stretch, then get ready for bed.${sg ? '' : ` Have your snack now${meals.snack ? ` (${meals.snack})` : ''} — protein before bed.`}`, 'wind', { action: 'stretch' });
    add(out, 0, 'Lights out', `${fmtH(nextWake + 1440 - out)} of sleep before your ${ampm(nextWake)} wake-up. Cool, dark, quiet room.`, 'sleep');
    if (late) warn.push(`Today runs ${late} minutes past your wind-down, so lights-out slips to ${ampm(out)} (${fmtH(nextWake + 1440 - out)} of sleep). Move something: mobility to the morning or the weekend, or homework into a free period.`);

    // Free time in the gaps (school covers everything inside it, like lunch).
    items.sort((a, b) => a.at - b.at || a.end - b.end);
    const gaps = [];
    let t0 = wake;
    for (const i of items) { if (i.at - t0 >= 30) gaps.push([t0, i.at]); t0 = Math.max(t0, i.end); }
    gaps.forEach(([a, b]) => add(a, b - a, 'Free time', b - a >= 90 ? 'Yours — friends, games, rest. Get up and move a little if you\'ve been sitting.' : '', 'free'));
    items.sort((a, b) => a.at - b.at || a.end - b.end);
    const free = gaps.reduce((sm, [a, b]) => sm + b - a, 0);
    return { items, warn, wake, lightsOut: out, sleep: (nextWake + 1440 - out) / 60, free, school, practice, game: !!x.game };
  }
  const fmtH = min => { const h = Math.floor(min / 60), mm = Math.round(min % 60); return mm ? `${h} h ${mm} min` : `${h} h`; };

  return { DEFAULTS, SLEEP, answersOf, day, wakeOn, schoolDay, m, hhmm };
})();
