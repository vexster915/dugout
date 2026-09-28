/* app.js — everything you see and tap in Dugout.

   Sections (search for the numbered banners):
     1. Helpers, theme           7. Plan tab — programs, exercise library, day editing
     2. Icons                    8. Diet tab — food log + search, favorites, recent foods, water,
     3. State & saving              sweat test, goals + calculator, week totals, meal plan,
     4. App shell (sheets,          game-day timeline, week ahead + shopping list, recipes
        toasts, one listener     9. Progress tab — lift charts, records, calendar, badges,
        for every tap)              body weight, recovery
     5. Today tab — week          9b. Baseball — tests, games + season stats, skills practice,
        review, check-in,            arm care + Pitch Smart, pitch counter, stopwatch
        workout, coaching tips  10. Settings — backup, share cards, CSV export, help
     6. Rest timer, sound,       11. Start-up — loading + cleaning saved data, day rollover
        screen-awake            12. Sign-in, first-run setup, what's new

   Data lives in plan.js (programs), exercises.js (how-tos), meals.js (recipes + tips) and
   foods.js (food list). Every tap goes through data-action="…" → actions.…; forms through
   data-submit → submits.…; typing through data-input → inputs.…; changes through data-change → changes.… */

'use strict';

const APP_VERSION = '2.4.0';

// If a data file didn't load (e.g. offline right after an update), run with empty data instead of crashing.
if (typeof RECIPES === 'undefined') Object.assign(self, { RECIPES: [], RECIPE_BY_ID: {}, MEAL_TAGS: {}, DIET_GUIDE: [] });
if (typeof FOODS === 'undefined') self.FOODS = [];
if (typeof EXERCISE_INFO === 'undefined') Object.assign(self, { EXERCISE_INFO: {}, EXERCISE_GROUPS: [] });
if (typeof LIGHT_WORKOUT === 'undefined') self.LIGHT_WORKOUT = { gym: REST_DAY, home: REST_DAY };   // older plan.js
if (typeof DRILLS === 'undefined') Object.assign(self, { DRILLS: [], DRILL_BY_ID: {}, DRILL_POSITIONS: [], SWING_FAULTS: {} });

/* ============================== 1. HELPERS ============================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Typed numbers: "1,200" → 1200 (thousands), "2,5" → 2.5 (decimal comma), "abc" → null
const num = v => {
  let s = String(v ?? '').trim().replace(/\s/g, '');
  s = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const fmt = (n, d = 0) => n == null || !Number.isFinite(n) ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const fmtK = n => Math.abs(n) >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : fmt(n);
const pad = n => String(n).padStart(2, '0');
const sum = (list, f) => list.reduce((t, x) => t + (f(x) || 0), 0);
const normName = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Dates are stored as local "YYYY-MM-DD" strings (never UTC, so evenings don't jump to tomorrow).
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7;          // Monday = 0 … Sunday = 6
const weekStart = (d = new Date()) => addDays(d, -dayIdx(d));
const fmtDate = (d, opts) => d.toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });
const shortDate = s => fmtDate(parseYmd(s), { month: 'short', day: 'numeric' });
const nowHHMM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const clockTime = hhmm => {
  const [h, m] = String(hhmm || '15:00').split(':').map(Number);
  const d = new Date(); d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const mmss = sec => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };
const clock = sec => {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
const fmtDur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };
const restLabel = s => s < 60 ? `${s}s` : s % 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : `${s / 60} min`;

// Links: only allow real web links. "youtu.be/abc" without https:// gets it added.
const normUrl = v => {
  v = String(v || '').trim();
  if (v && !/^https?:\/\//i.test(v) && /^(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(v)) v = 'https://' + v;
  return v;
};
const safeUrl = u => /^https?:\/\/[^\s]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
const isSearchLink = u => /youtube\.com\/results/i.test(String(u || ''));
const placeholderVideo = name => ytSearch(name + ' proper form');   // ytSearch() lives in plan.js
// The tutorial picked for this exercise in plan.js (VIDEOS), or a YouTube search if there isn't one.
const defaultVideo = name => VIDEOS[String(name || '').trim()] || placeholderVideo(name);

// Give exercises that still have a placeholder search link their real tutorial video.
// Links you picked yourself are never changed.
function upgradeVideos(exercises) {
  let changed = false;
  for (const e of exercises) {
    const v = VIDEOS[e.name];
    if (v && (!e.video || isSearchLink(e.video))) { e.video = v; changed = true; }
  }
  return changed;
}
const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

// "6-8" → 8, "10/leg" → 10, "30 sec" → 30  (the number you aim for)
const targetNum = reps => { const m = String(reps || '').match(/\d+(\.\d+)?/g); return m ? Number(m[m.length - 1]) : null; };
// "45 sec" → 45, "8 min" → 480, "10" → null
const repSeconds = reps => {
  const s = String(reps || '').toLowerCase(), n = targetNum(s);
  if (n == null) return null;
  if (/min/.test(s)) return n * 60;
  if (/sec|\ds\b/.test(s)) return n;
  return null;
};

// Rough workout length: work + rest for every set, plus changeover time.
function estMinutes(day) {
  let sec = 0;
  for (const e of day.exercises) {
    const sets = Math.max(1, e.sets | 0);
    const timed = repSeconds(e.reps);
    const sides = /\/\s*(leg|side|arm)|each/i.test(e.reps) ? 2 : 1;
    sec += sets * (timed != null ? timed : 35) * sides + (sets - 1) * (e.rest || 0) + 30;
  }
  return Math.max(5, Math.round(sec / 300) * 5);
}

// YouTube link → { id, start } for playing inside the app, or null.
function ytInfo(url) {
  try {
    const u = new URL(normUrl(url));
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else { const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/); if (m) id = m[2]; }
    }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
    const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    const start = hms ? (+hms[1] || 0) * 3600 + (+hms[2] || 0) * 60 + (+hms[3] || 0) : 0;
    return { id, start };
  } catch (e) {
    return null;
  }
}

// ----- Appearance: dark, light or follow the phone. Kept outside the encrypted data (it's just a
// preference) so the right colors show even on the sign-in screen. -----
const THEMES = [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']];
const themePref = () => { try { return localStorage.getItem('dugout-theme') || 'dark'; } catch (e) { return 'dark'; } };
function applyTheme() {
  const pref = themePref(), light = pref === 'light' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#f3f5f8' : '#07090d');
}
applyTheme();
window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);

const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

/* ============================== 2. ICONS ============================== */

const ICONS = {
  today: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/>',
  plan: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  diet: '<path d="M12 7.6c-1.7-1.3-5.4-1.6-7 1.4-1.6 3-.3 7.4 2 10.3 1.4 1.8 2.9 1.6 5 .9 2.1.7 3.6.9 5-.9 2.3-2.9 3.6-7.3 2-10.3-1.6-3-5.3-2.7-7-1.4z"/><path d="M12 7.6c0-2.2.8-3.8 2.9-4.8"/>',
  progress: '<path d="M3 17.5 9 11.5l4 4 8-8"/><path d="M15 7.5h6v6"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V10M9.5 2.5h5M12 2.5V6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v8h14v-8"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 20h14"/>',
  more: '<circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  flame: '<path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-3.9-3.2-6.3-4.2-10.3-2.3 1.6-3.3 3.6-3.3 5.8-1.2-.8-1.8-2-2-3.3C7.3 9 5.5 11.4 5.5 14.8 5.5 18.4 8 21 12 21z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  drop: '<path d="M12 3.5c3 3.6 6 7 6 10.3a6 6 0 0 1-12 0C6 10.5 9 7.1 12 3.5z"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0l-2.2 2.2"/>',
  baseball: '<circle cx="12" cy="12" r="9"/><path d="M6.3 5.2c1.9 1.8 3 4.2 3 6.8s-1.1 5-3 6.8M17.7 5.2c-1.9 1.8-3 4.2-3 6.8s1.1 5 3 6.8"/>',
  camera: '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20v11H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
  sparkle: '<path d="M11 3.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9z"/><path d="M18.5 15.5v5M16 18h5"/>',
  coach: '<path d="M20.5 11.5c0 4.1-3.8 7.4-8.5 7.4a9.6 9.6 0 0 1-3.6-.7L3.5 19.8l1.4-3.9a6.9 6.9 0 0 1-1.4-4.4c0-4.1 3.8-7.4 8.5-7.4s8.5 3.3 8.5 7.4z"/><path d="M12 8.2l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>'
};
const FILLED = new Set(['play', 'more']);
const icon = (name, cls = '') => `<svg class="i ${FILLED.has(name) ? 'fill' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ============================== 3. STATE & SAVING ============================== */

const MODES = { gym: { label: 'Gym', icon: 'dumbbell' }, home: { label: 'Home', icon: 'house' } };
const TYPES = { strength: 'Strength', agility: 'Agility', mobility: 'Mobility', rest: 'Rest' };
const TYPE_SHORT = { strength: 'Lift', agility: 'Agility', mobility: 'Stretch', rest: 'Rest' };
const TRACKS = { weight: 'Weight + reps', reps: 'Reps only', time: 'Time (seconds)', check: 'Just check it off' };
const TRACK_SHORT = { weight: 'weight', reps: 'reps', time: 'timed', check: 'check-off' };
const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['pre', 'Pre-workout'], ['post', 'Post-workout'], ['dinner', 'Dinner'], ['snack', 'Snack']];
const MEAL_LABEL = Object.fromEntries(MEALS);

const DEFAULT_SETTINGS = {
  mode: 'gym',            // 'gym' or 'home'
  workoutTime: '15:00',   // 3 PM
  unit: 'lb',
  calGoal: 3000,
  proteinGoal: 180,
  goalsSet: false,
  autoRest: true,
  sound: true,
  keepAwake: true,
  lastBackup: null,
  installHintDismissed: false,
  username: '',
  autoLock: 5,            // minutes in the background before Dugout locks itself
  mealPlan: null,         // today's suggested meals: { date, kind, seed, swaps }
  carbGoal: 0,            // optional (0 = not set)
  fatGoal: 0,
  waterGoal: 100,         // ounces
  program: 'offseason',   // which starting plan (plan.js PROGRAMS) resets go back to
  profile: null,          // goal calculator answers: { sex, age, ft, inch, cm, weight, activity, goal }
  badges: null,           // badge ids already celebrated
  reviewSeen: '',         // week (Monday "YYYY-MM-DD") whose review card you closed
  seenVersion: '',        // last "What's new" shown
  intensity: null,        // today's Light / Moderate / Heavy pick: { date, level }
  drillPlan: [],          // drill ids you starred (or the Swing lab picked for you)
  drillPlanFrom: '',      // date of the swing analysis that built the plan, if it did
  drillVideos: {},        // drill id → a YouTube link you saved for it
  bats: 'R',              // which side you hit from (Swing lab)
  pantry: null,           // Diet → Pantry: the food in your kitchen, shopping list and Claude's ideas (see section 8b)
  aiKey: ''               // your own Anthropic API key (optional; never put in backups)
};

// Everything the app is showing lives here (and is saved to the phone with DB.*).
const S = {
  locked: true,        // nothing is shown or loaded until you sign in
  vault: null,         // your saved (locked) login, or null if none has been created yet
  tab: 'today',
  settings: { ...DEFAULT_SETTINGS },
  plan: null,          // { gym: [7 days], home: [7 days] }
  active: null,        // the workout in progress, if any
  workouts: [],        // finished workouts, newest first
  meals: [],
  foods: [],           // favorites
  logs: [],            // body weight, water, tests, throwing… ({ id, kind, date, … })
  planDay: dayIdx(),
  planReorder: false,
  dietDate: ymd(),
  dietView: 'day',
  dietWeek: ymd(weekStart()),
  recipeMeal: 'all',   // Meals view filters
  recipeTag: null,
  coach: null,         // the Coach chat (section 8c), loaded at sign-in
  coachDraft: '',      // what's typed in the Coach box but not sent yet
  pantryMeal: '',      // Pantry view: meal filter ('' = any)
  panAll: false,       // Pantry view: show every ready recipe
  progEx: null,
  progMetric: null,
  progRange: 'all',
  progView: 'lifts',   // Progress tab: lifts, body or baseball
  editCheckin: false,  // Today: daily check-in form open
  calMonth: null,      // Progress calendar month ("YYYY-MM"), null = this month
  ballView: 'drills',  // Baseball tab: drills, swing (Swing lab) or stats
  drillWho: 'solo',    // Drills: alone or with a partner
  drillPos: 'all',     // Drills: position filter
  drillQ: '',          // Drills: search text
  swingOpen: null,     // Swing lab: the swing report being shown (id)
  histLimit: 15,
  openEx: null         // which exercise card is open during a workout (null = automatic)
};

async function save(work) {
  if (S.locked) return;
  try { await work(); }
  catch (err) { if (S.locked) return; console.error(err); toast('Could not save: ' + (err.message || err)); }
}
const saveSettings = () => save(() => DB.set('settings', S.settings));
const savePlan = () => save(() => DB.set('plan', S.plan));
const saveActive = () => save(() => (S.active ? DB.set('active', S.active) : DB.del('active')));
const logsOf = kind => S.logs.filter(l => l.kind === kind).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0)));
function putLog(l) {
  const i = S.logs.findIndex(x => x.id === l.id);
  if (i >= 0) S.logs[i] = l; else S.logs.push(l);
  save(() => DB.put('logs', l));
  return l;
}
function removeLog(id) {
  S.logs = S.logs.filter(x => x.id !== id);
  save(() => DB.remove('logs', id));
}
let saveActiveTimer = null;
const saveActiveSoon = () => { clearTimeout(saveActiveTimer); saveActiveTimer = setTimeout(saveActive, 400); };

// Makes a fresh copy of the starting plan (from plan.js) with an id on every exercise.
// Besides the 7 days, each mode has a Light workout (plan.js LIGHT_WORKOUT) you can pick on any day.
function buildPlan(src) {
  const p = clone({ gym: src.gym, home: src.home, light: src.light || LIGHT_WORKOUT });
  for (const mode of ['gym', 'home']) for (const day of [...p[mode], p.light[mode]]) for (const e of day.exercises) e.id = uid();
  return p;
}
const LIGHT = 7;                  // the Light workout's "day number" (Monday–Sunday are 0–6)
const planFor = (mode = S.settings.mode) => S.plan[mode];
const program = () => PROGRAMS[S.settings.program] || PROGRAMS.offseason;
const dayPlan = (i, mode = S.settings.mode) => (i === LIGHT ? S.plan.light[mode] : S.plan[mode][i]);
const dayName = i => (i === LIGHT ? 'Light workout' : DAYS[i]);
function setDayPlan(i, day, mode = S.settings.mode) { if (i === LIGHT) S.plan.light[mode] = day; else S.plan[mode][i] = day; }

// ----- Light / Moderate / Heavy: how hard you want to go today (picked on the Today screen) -----
const LEVELS = {
  light: { label: 'Light', sub: 'Recovery', hint: 'Your Light workout instead: mobility, arm care and core. Good the day after a game, sprinting or a hard practice.',
    during: 'Light day: keep everything easy. You should feel better when you finish than when you started.' },
  moderate: { label: 'Moderate', sub: 'Fewer sets', hint: "Today's workout with about ⅔ of the sets, and weights around 90% of last time.",
    during: 'Moderate day: weights start at about 90% of last time. Stop each set with 2–3 good reps left.' },
  heavy: { label: 'Heavy', sub: 'Full workout', hint: 'The full workout: every set at your working weights.', during: '' }
};
const todayLevel = () => { const x = S.settings.intensity; return isObj(x) && x.date === ymd() && LEVELS[x.level] ? x.level : 'heavy'; };
// Starting a planned day uses today's pick (Light swaps in the Light workout, so planned days then run in full).
const startLevel = di => (di === LIGHT ? 'light' : todayLevel() === 'moderate' ? 'moderate' : 'heavy');
const modSets = n => Math.max(1, Math.round((n * 2) / 3));                  // 4 → 3, 3 → 2, 2 → 1
const levelDay = (day, level) => (level === 'moderate' ? { ...day, exercises: day.exercises.map(e => ({ ...e, sets: modSets(e.sets) })) } : day);
const isEasy = w => w.intensity === 'light' || w.intensity === 'moderate';

function findPlanEx(id) {
  if (!id) return null;
  for (const mode of ['gym', 'home']) for (const day of [...S.plan[mode], S.plan.light[mode]]) {
    const e = day.exercises.find(x => x.id === id);
    if (e) return e;
  }
  return null;
}

// The most recent time you did this exercise (same Gym/Home mode) — for "Last time" and pre-filled weights.
// Light and moderate days are skipped when there's a full (heavy) session, so easy days don't drag your weights down.
function lastSetsFor(name, mode) {
  const key = normName(name);
  let easy = null;
  for (const w of S.workouts) {
    if (w.mode !== mode) continue;
    const e = w.exercises.find(x => normName(x.name) === key);
    if (!e || !e.sets.some(s => s.done)) continue;
    const found = { date: w.date, sets: e.sets.filter(s => s.done) };
    if (!isEasy(w)) return found;
    if (!easy) easy = found;
  }
  return easy;
}

/* ============================== 4. APP SHELL ============================== */

const actions = {}, inputs = {}, changes = {}, submits = {};
let postRender = [];
const later = fn => postRender.push(fn);

const TABS = [['today', 'Today'], ['plan', 'Plan'], ['baseball', 'Baseball'], ['coach', 'Coach'], ['diet', 'Diet'], ['progress', 'Progress'], ['settings', 'Settings']];

function renderTabbar() {
  $('#tabbar').innerHTML = TABS.map(([id, label]) => `
    <button class="tab ${S.tab === id ? 'on' : ''}" data-action="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>
      ${icon(id)}<span>${label}</span>${id === 'today' && S.active ? '<i class="live" aria-label="Workout in progress"></i>' : ''}
    </button>`).join('');
}

function render({ keepScroll = true } = {}) {
  const view = $('#view');
  if (S.locked) {                        // signed out: show only the login screen
    document.body.dataset.mode = 'gym';
    $('#tabbar').hidden = true;
    view.innerHTML = renderAuth();
    view.scrollTop = 0;
    return;
  }
  $('#tabbar').hidden = false;
  document.body.dataset.mode = S.active ? S.active.mode : S.settings.mode;
  const top = view.scrollTop;
  const views = { today: renderToday, plan: renderPlan, baseball: renderBaseball, coach: renderCoach, diet: renderDiet, progress: renderProgress, settings: renderSettings };
  view.innerHTML = views[S.tab]();
  view.scrollTop = keepScroll ? top : 0;
  renderTabbar();
  const queue = postRender; postRender = [];
  queue.forEach(fn => fn());
  checkBadges();
}

actions.tab = el => {
  const t = el.dataset.tab;
  if (S.tab === t) { $('#view').scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.tab = t;
  render({ keepScroll: false });
};

function modeToggle() {
  const m = S.settings.mode;
  return `<div class="seg mode-seg" role="group" aria-label="Gym or home workouts">
    ${Object.entries(MODES).map(([k, v]) => `<button class="${m === k ? 'on' : ''}" data-action="setMode" data-mode="${k}" aria-pressed="${m === k}">${icon(v.icon)} ${v.label}</button>`).join('')}
  </div>`;
}
actions.setMode = el => {
  const m = el.dataset.mode;
  if (m === S.settings.mode) return;
  if (S.active) { toast(`Finish or discard your ${MODES[S.active.mode].label.toLowerCase()} workout first`); return; }
  S.settings.mode = m;
  saveSettings();
  render();
};

// ----- Bottom sheets (pop-up panels) -----
let sheetOnClose = null, sheetReturnFocus = null;
function openSheet(title, body, { onClose } = {}) {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) sheetReturnFocus = document.activeElement;   // put focus back here on close
  root.innerHTML = `
    <div class="sheet-backdrop" data-action="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1">
      <div class="sheet-grab"></div>
      <div class="sheet-head">
        <div class="sheet-title">${esc(title)}</div>
        <button class="btn btn-icon sm btn-ghost" data-action="closeSheet" aria-label="Close">${icon('x')}</button>
      </div>
      <div class="sheet-body">${body}</div>
    </div>`;
  root.classList.add('open');
  void root.offsetHeight;           // let the browser notice, so the slide-up animation plays
  root.classList.add('show');
  sheetOnClose = onClose || null;
  $('.sheet', root).focus({ preventScroll: true });           // screen readers start reading the sheet
}
function closeSheet() {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  root.classList.remove('show');
  const cb = sheetOnClose; sheetOnClose = null;
  setTimeout(() => { if (!root.classList.contains('show')) { root.classList.remove('open'); root.innerHTML = ''; } }, 300);
  const back = sheetReturnFocus; sheetReturnFocus = null;
  if (back && back !== document.body && document.contains(back)) back.focus({ preventScroll: true });
  if (cb) cb();
}
actions.closeSheet = () => closeSheet();

// ----- Yes/No question -----
let confirmAnswer = null;
function confirmBox(title, message, { ok = 'OK', danger = false } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const answer = v => { if (!answered) { answered = true; resolve(v); } };
    openSheet(title, `
      <p class="text-2">${esc(message)}</p>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="confirmNo">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirmYes">${esc(ok)}</button>
      </div>`, { onClose: () => answer(false) });
    confirmAnswer = answer;
  });
}
actions.confirmYes = () => { const a = confirmAnswer; confirmAnswer = null; sheetOnClose = null; closeSheet(); if (a) a(true); };
actions.confirmNo = () => closeSheet();

// ----- Little message at the top of the screen -----
let toastTimer = null, toastAct = null;
function toast(msg, { action, label = 'Undo' } = {}) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="btn btn-primary" data-action="toastAction">${esc(label)}</button>` : ''}`;
  toastAct = action || null;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
}
actions.toastAction = () => { const a = toastAct; toastAct = null; $('#toast').classList.remove('show'); if (a) a(); };

// ----- One listener for every tap / edit / form in the app -----
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && changes[el.dataset.change]) changes[el.dataset.change](el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  if (submits[f.dataset.submit]) submits[f.dataset.submit](f, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#sheet-root').classList.contains('open')) { closeSheet(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action]:not(button):not(a):not(input):not(select):not(textarea)')) {
    e.preventDefault();
    e.target.click();
  }
});
// Video thumbnails need internet. If one can't load (offline at the gym), show a plain play tile instead.
document.addEventListener('error', e => {
  const img = e.target;
  if (img && img.tagName === 'IMG' && img.closest('.yt-thumb, .yt-mini')) img.closest('.yt-card, .yt-mini').classList.add('no-thumb');
}, true);
// iPhone sometimes leaves the page shifted after the keyboard closes — put it back.
document.addEventListener('focusout', () => {
  setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) window.scrollTo(0, 0); }, 60);
});

const formData = f => Object.fromEntries(new FormData(f).entries());

// Number steppers (– / +) inside forms
actions.step = el => {
  const input = el.closest('form').elements.namedItem(el.dataset.target);
  if (!input) return;
  const min = num(el.dataset.min) ?? 0, max = num(el.dataset.max) ?? 9999;
  const v = (num(input.value) ?? 0) + Number(el.dataset.d);
  input.value = clamp(Math.round(v * 100) / 100, min, max);
  input.dispatchEvent(new Event('input', { bubbles: true }));   // lets forms react (e.g. servings rescale the numbers)
};
const STEPPER_LABEL = { sets: 'Sets', rest: 'Rest between sets in seconds', servings: 'Servings' };
const stepper = (name, value, d, { min = 0, max = 9999, minus = icon('minus', 'sm'), plus = icon('plus', 'sm'), mode = 'numeric', input = '' } = {}) => `
  <div class="stepper">
    <button type="button" class="btn" data-action="step" data-target="${name}" data-d="${-d}" data-min="${min}" data-max="${max}" aria-label="Less">${minus}</button>
    <input name="${name}" inputmode="${mode}" value="${esc(value)}" autocomplete="off" aria-label="${STEPPER_LABEL[name] || name}"${input ? ` data-input="${input}"` : ''}>
    <button type="button" class="btn" data-action="step" data-target="${name}" data-d="${d}" data-min="${min}" data-max="${max}" aria-label="More">${plus}</button>
  </div>`;

/* ============================== 5. TODAY + WORKOUT IN PROGRESS ============================== */

function renderToday() {
  if (S.active) return renderWorkout();
  const now = new Date();
  const di = dayIdx(now);
  const doneToday = S.workouts.find(w => w.date === ymd(now) && w.mode === S.settings.mode);
  return `<div class="page">
    <div class="page-head"><div>
      <div class="eyebrow">${fmtDate(now, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1 class="page-title">Today</h1>
    </div></div>
    ${modeToggle()}
    ${installBanner()}
    ${backupBanner()}
    ${weekReview()}
    ${todayCard(dayPlan(di), di, doneToday)}
    ${checkinCard()}
    ${nutritionCard()}
    ${waterCard()}
    ${logsOf('throw').some(l => l.date >= ymd(addDays(now, -14))) ? armCard() : ''}
    ${weekCard()}
  </div>`;
}

function todayCard(planned, di, doneToday) {
  const m = MODES[S.settings.mode];
  const isRest = planned.type === 'rest', canPick = !isRest && planned.exercises.length > 0;
  const level = canPick ? todayLevel() : 'heavy';
  // What you'll actually do today: the Light workout, a trimmed (moderate) day, or the full plan.
  const day = level === 'light' ? dayPlan(LIGHT) : levelDay(planned, level), startDay = level === 'light' ? LIGHT : di;
  const n = day.exercises.length;
  const preview = day.exercises.slice(0, 5).map(e => `<div><span>${esc(e.name)}</span><span>${e.sets} × ${esc(e.reps)}</span></div>`).join('')
    + (n > 5 ? `<div><span class="muted">+ ${n - 5} more</span><span></span></div>` : '');
  const startLabel = isRest ? 'Start optional recovery' : doneToday ? 'Train again' : `Start ${LEVELS[level].label.toLowerCase()} workout`;
  const check = checkinOf(ymd()), lowReady = check && readiness(check) < 50 ? readiness(check) : null;
  return `<section class="card hero">
    <div class="spread">
      <span class="badge accent">${icon(m.icon)} ${m.label} · ${TYPES[day.type] || 'Workout'}</span>
      ${doneToday ? `<span class="badge good">${icon('check')} Done</span>` : ''}
    </div>
    ${canPick ? `<div class="stack-sm">
      <div class="seg level-seg" role="group" aria-label="How hard today">${Object.entries(LEVELS).map(([k, v]) =>
        `<button class="${k === level ? 'on' : ''} lv-${k}" data-action="setLevel" data-k="${k}" aria-pressed="${k === level}">${v.label}<small>${v.sub}</small></button>`).join('')}</div>
      <p class="small muted">${LEVELS[level].hint}</p>
    </div>` : ''}
    <div>
      <h2 class="day-title">${esc(day.title)}</h2>
      ${level === 'light' ? `<p class="small muted" style="margin-top:6px">Instead of ${esc(planned.title)}</p>` : ''}
      ${day.focus ? `<p class="text-2 small" style="margin-top:8px">${esc(day.focus)}</p>` : ''}
    </div>
    ${lowReady != null && canPick && level === 'heavy' && !doneToday ? `<div class="banner warn">${icon('info')}<div>Readiness is ${lowReady} today. Think about switching to <b>Moderate</b> or <b>Light</b> above, or warm up first and then decide.</div></div>` : ''}
    <div class="meta-row">
      <span>${icon('clock', 'sm')} ${clockTime(S.settings.workoutTime)}</span>
      ${n ? `<span>${n} exercise${n === 1 ? '' : 's'}</span><span>~${estMinutes(day)} min</span>` : ''}
    </div>
    ${countdown(doneToday || isRest)}
    ${n ? `<div class="preview-list">${preview}</div>` : ''}
    ${doneToday ? `<button class="btn btn-ghost btn-block" data-action="showWorkout" data-id="${doneToday.id}">See today's workout</button>` : ''}
    ${n ? `<button class="btn ${isRest || doneToday ? 'btn-ghost' : 'btn-primary'} btn-xl" data-action="startWorkout" data-day="${startDay}">${icon('play')} ${startLabel}</button>`
        : `<p class="muted small">No exercises on this day. Add some in the Plan tab.</p>`}
    <button class="btn-link" data-action="pickDay">Do a different day's workout</button>
  </section>`;
}
actions.setLevel = el => {
  if (!LEVELS[el.dataset.k]) return;
  S.settings.intensity = { date: ymd(), level: el.dataset.k };
  saveSettings(); render();
};

// ----- Last week in review (Today, Monday–Wednesday) -----
function weekReview() {
  const start = addDays(weekStart(), -7), from = ymd(start), to = ymd(addDays(start, 6));
  if (S.settings.reviewSeen === from || dayIdx() > 2) return '';
  const inWeek = d => d >= from && d <= to;
  const ws = S.workouts.filter(w => inWeek(w.date)), planned = planFor().filter(d => d.type !== 'rest' && d.exercises.length).length;
  const days = Array.from({ length: 7 }, (_, i) => dayTotals(ymd(addDays(start, i)))), eaten = days.filter(t => t.cal > 0);
  if (!ws.length && !eaten.length && !S.logs.some(l => inWeek(l.date))) return '';
  const proHits = days.filter(t => t.pro >= S.settings.proteinGoal).length, avgCal = eaten.length ? sum(eaten, t => t.cal) / eaten.length : 0;
  const checks = logsOf('checkin').filter(l => inWeek(l.date)), sleep = checks.length ? sum(checks, l => l.sleep) / checks.length : null;
  const waterHits = logsOf('water').filter(l => inWeek(l.date) && l.oz >= S.settings.waterGoal).length;
  const wts = logsOf('weight').filter(l => inWeek(l.date)), wch = wts.length > 1 ? wts[wts.length - 1].w - wts[0].w : null;
  const throws = sum(logsOf('throw').filter(l => inWeek(l.date)), l => l.count || 0);
  const tile = (label, value, sub) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div>${sub ? `<div class="hint">${sub}</div>` : ''}</div>`;
  const tip = eaten.length && proHits < 4 ? 'Protein was the weak spot — add a shake or a Greek yogurt bowl to hit your goal more days this week.'
    : ws.length < planned ? `You got ${ws.length} of ${planned} sessions in. Pick your workout times for this week now so they happen.`
    : sleep != null && sleep < 8 ? 'Sleep ran short. Set a bedtime alarm this week — it pays off in speed and strength.'
    : 'Strong week. Keep stacking them.';
  return `<section class="card stack">
    <div class="spread"><div><div class="eyebrow">${fmtDate(start, { month: 'short', day: 'numeric' })} – ${fmtDate(addDays(start, 6), { month: 'short', day: 'numeric' })}</div>
      <div class="card-title">Last week in review</div></div>
      <button class="btn btn-icon sm btn-ghost" data-action="dismissReview" data-k="${from}" aria-label="Hide last week's review">${icon('x', 'sm')}</button></div>
    <div class="tiles two">
      ${tile('Workouts', `${ws.length}<small> / ${planned}</small>`, ws.length >= planned ? 'Every session done' : '')}
      ${tile('Protein goal hit', `${proHits}<small> / 7 days</small>`, eaten.length ? `${fmt(avgCal)} cal a day on average` : 'No food logged')}
      ${sleep != null ? tile('Average sleep', `${fmt(sleep, 1)}<small> h</small>`, sleep < 8 ? 'Aim for 8–10 hours' : 'Right on target') : ''}
      ${tile('Water goal hit', `${waterHits}<small> / 7 days</small>`, '')}
      ${wch != null ? tile('Body weight', `${wch > 0 ? '+' : ''}${fmt(wch, 1)}<small> ${S.settings.unit}</small>`, `${wts.length} weigh-ins`) : ''}
      ${throws ? tile('Throws', fmt(throws), '') : ''}
    </div>
    <p class="small text-2">${tip}</p>
  </section>`;
}
actions.dismissReview = el => { S.settings.reviewSeen = el.dataset.k; saveSettings(); render(); };

// ----- Daily check-in: sleep, energy, soreness → readiness score -----
const checkinOf = date => S.logs.find(l => l.kind === 'checkin' && l.date === date) || null;
function readiness(c) {
  const sleep = c.sleep >= 9 ? 100 : c.sleep >= 8 ? 95 : c.sleep >= 7 ? 80 : c.sleep >= 6 ? 55 : 25;
  return Math.round(sleep * 0.4 + ((c.energy - 1) / 4) * 30 + ((5 - c.sore) / 4) * 30);
}
const READY = [
  [75, 'good', 'Green light', 'You recovered well — go after it today.'],
  [50, 'ok', 'Train smart', "Warm up well. If you still feel flat, drop one set from each exercise."],
  [0, 'low', 'Take it easy', 'Your body is asking for recovery. Do the mobility day or cut your sets in half, then focus on sleep, food and water tonight.']
];
const readyInfo = r => READY.find(([min]) => r >= min);
function checkinCard() {
  const c = checkinOf(ymd());
  if (c && !S.editCheckin) {
    const r = readiness(c), [, cls, label, tip] = readyInfo(r);
    return `<section class="card stack-sm">
      <div class="spread"><div class="card-title row"><span class="ready-dot ${cls}">${r}</span>${label}</div>
        <button class="btn btn-sm btn-ghost" data-action="editCheckin">${icon('edit', 'sm')} Edit</button></div>
      <p class="small text-2">${tip}</p>
      <div class="small muted">Slept ${c.sleep >= 9 ? '9+' : c.sleep <= 5 ? '5 or less' : c.sleep} hours · energy ${c.energy}/5 · soreness ${c.sore}/5</div>
    </section>`;
  }
  if (!S.editCheckin) return `<section class="card spread">
    <div><div class="card-title">How do you feel today?</div><div class="small muted">Sleep, energy, soreness → your readiness score</div></div>
    <button class="btn btn-sm btn-primary" data-action="editCheckin">Check in</button></section>`;
  const v = c || { sleep: 8, energy: 3, sore: 2 };
  return `<section class="card"><form class="form" novalidate data-submit="saveCheckin">
    <div class="card-title">How do you feel today?</div>
    <div class="field"><span>Sleep last night (hours)</span>${choice('sleep', [[5, '≤5'], [6, '6'], [7, '7'], [8, '8'], [9, '9+']], v.sleep)}</div>
    <div class="field"><span>Energy <small>1 = drained · 5 = great</small></span>${choice('energy', [1, 2, 3, 4, 5].map(n => [n, String(n)]), v.energy)}</div>
    <div class="field"><span>Soreness <small>1 = none · 5 = very sore</small></span>${choice('sore', [1, 2, 3, 4, 5].map(n => [n, String(n)]), v.sore)}</div>
    <button class="btn btn-primary btn-block" type="submit">Save check-in</button>
  </form></section>`;
}
submits.saveCheckin = f => {
  const d = formData(f), n = (k, lo, hi, def) => clamp(parseInt(d[k], 10) || def, lo, hi);
  const c = { id: 'check-' + ymd(), kind: 'checkin', date: ymd(), sleep: n('sleep', 5, 9, 8), energy: n('energy', 1, 5, 3), sore: n('sore', 1, 5, 2), at: Date.now() };
  putLog(c);
  S.editCheckin = false;
  render();
  toast(`Readiness ${readiness(c)} — ${readyInfo(readiness(c))[2].toLowerCase()}`);
};
actions.editCheckin = () => { S.editCheckin = true; render(); };

function countdown(skip) {
  if (skip) return '';
  const [h, mi] = S.settings.workoutTime.split(':').map(Number);
  const start = new Date(); start.setHours(h || 0, mi || 0, 0, 0);
  const diff = start - Date.now();
  if (diff > 0) return `<div class="countdown">${icon('timer', 'sm')} Starts in ${fmtDur(diff)}</div>`;
  if (diff > -2 * 3600000) return `<div class="countdown">${icon('flame', 'sm')} It's go time</div>`;
  return '';
}

function nutritionCard() {
  const next = upNextMeal(), kind = mealPlanToday().kind;
  return `<section class="card">
    <div class="spread" style="margin-bottom:14px">
      <div class="card-title">Nutrition today</div>
      <button class="btn btn-sm btn-ghost" data-action="quickLog">${icon('plus', 'sm')} Log food</button>
    </div>
    ${S.settings.goalsSet ? '' : `<button class="banner as-btn goal-nudge" data-action="calcGoals">${icon('flame')}
      <span class="grow"><b>Personalize your goals.</b> These are starter numbers — answer a few questions to get yours.</span>${icon('right', 'sm')}</button>`}
    ${macroBlock(dayTotals(ymd()))}
    ${gameLine()}
    ${next ? `<button class="next-meal" data-action="openRecipe" data-id="${next.r.id}" data-slot="${next.slot}" data-servings="${next.servings}">
      <span class="grow">
        <span class="plan-slot">Up next · ${slotName(next.slot, kind)}</span>
        <span class="meal-name">${esc(next.r.name)}</span>
        <span class="meal-sub">${servingsText(next.servings)} · ${fmt(next.r.cal * next.servings)} cal · ${fmt(next.r.pro * next.servings)} g protein</span>
      </span>${icon('right', 'sm')}</button>` : ''}
    <button class="btn-link meal-link" data-action="openMealPlan">Today's meal plan & recipes</button>
  </section>`;
}
// On a game day, Today shows first pitch and when to eat the pre-game meal.
function gameLine() {
  const mp = mealPlanToday();
  if (mp.kind !== 'game') return '';
  const gt = /^\d{2}:\d{2}$/.test(mp.gameTime || '') ? mp.gameTime : S.settings.workoutTime, [h, m] = gt.split(':').map(Number), t = h * 60 + m - 210;
  const meal = t >= 0 ? clockTime(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`) : null;
  return `<button class="banner as-btn goal-nudge" data-action="openMealPlan">${icon('trophy')}<span class="grow"><b>Game day</b> · first pitch ${clockTime(gt)}${meal ? ` — pre-game meal around ${meal}` : ''}</span>${icon('right', 'sm')}</button>`;
}
actions.openMealPlan = () => { S.tab = 'diet'; S.dietView = 'meals'; render({ keepScroll: false }); };

function macroBlock(t) {
  const { calGoal, proteinGoal } = S.settings;
  const pct = (v, g) => (g > 0 ? clamp((v / g) * 100, 0, 100) : 0);
  const left = (v, g, u) => (v >= g ? `Goal hit${v > g ? ` · ${fmt(v - g)}${u} over` : ''}` : `${fmt(g - v)}${u} to go`);
  const row = (cls, label, v, g, u) => `
    <div class="macro">
      <div class="macro-top"><span class="macro-name"><i class="key ${cls}"></i>${label}</span><span class="macro-left">${left(v, g, u)}</span></div>
      <div class="macro-val">${fmt(v)}${u ? `<small>${u}</small>` : ''} <small>/ ${fmt(g)}${u}</small></div>
      <div class="meter ${cls}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct(v, g))}"><span style="width:${pct(v, g)}%"></span></div>
    </div>`;
  const kc = { pro: t.pro * 4, carb: t.carb * 4, fat: t.fat * 9 }, tot = kc.pro + kc.carb + kc.fat;
  const split = t.carb || t.fat ? `<div class="split" role="img" aria-label="Calories from protein ${Math.round(kc.pro / tot * 100)}%, carbs ${Math.round(kc.carb / tot * 100)}%, fat ${Math.round(kc.fat / tot * 100)}%">
      ${['pro', 'carb', 'fat'].map(k => `<span class="${k}" style="width:${(kc[k] / tot) * 100}%"></span>`).join('')}</div>
    <div class="split-key">${[['pro', 'Protein'], ['carb', 'Carbs'], ['fat', 'Fat']].map(([k, l]) => `<span>${l} ${Math.round((kc[k] / tot) * 100)}%</span>`).join('')}</div>` : '';
  const extra = t.carb || t.fat ? `<div class="macro-extra">
      <span><i class="key carb"></i>Carbs <b>${fmt(t.carb)}${S.settings.carbGoal ? ` / ${fmt(S.settings.carbGoal)}` : ''} g</b></span>
      <span><i class="key fat"></i>Fat <b>${fmt(t.fat)}${S.settings.fatGoal ? ` / ${fmt(S.settings.fatGoal)}` : ''} g</b></span></div>` : '';
  return row('cal', 'Calories', t.cal, calGoal, '') + row('pro', 'Protein', t.pro, proteinGoal, ' g') + extra + split;
}

function weekCard() {
  const mode = S.settings.mode;
  const start = weekStart(), today = dayIdx();
  let count = 0;
  const cells = DAYS_SHORT.map((d, i) => {
    const key = ymd(addDays(start, i));
    const done = S.workouts.some(w => w.date === key && w.mode === mode);
    if (done) count++;
    const rest = dayPlan(i).type === 'rest';
    return `<div class="wd ${done ? 'done' : ''} ${i === today ? 'today' : ''} ${rest ? 'rest' : ''}" aria-label="${DAYS[i]}${done ? ', done' : ''}">
      <div class="wd-dot">${icon('check')}</div>${d[0]}</div>`;
  }).join('');
  return `<section class="card">
    <div class="spread" style="margin-bottom:14px">
      <div class="card-title">This week</div>
      <span class="muted small bold">${count} ${MODES[mode].label.toLowerCase()} workout${count === 1 ? '' : 's'}</span>
    </div>
    <div class="week">${cells}</div>
  </section>`;
}

function installBanner() {
  if (isStandalone() || S.settings.installHintDismissed) return '';
  return `<div class="banner">${icon('share')}
    <div class="grow"><b>Install it:</b> in Safari tap <b>Share</b> → <b>Add to Home Screen</b>. Then it opens full-screen and works offline.</div>
    <button class="btn btn-icon sm btn-ghost" data-action="dismissInstall" aria-label="Hide this tip">${icon('x', 'sm')}</button>
  </div>`;
}
actions.dismissInstall = () => { S.settings.installHintDismissed = true; saveSettings(); render(); };

function backupBanner() {
  if (!S.workouts.length && S.meals.length < 5) return '';
  const last = S.settings.lastBackup;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (days != null && days < 7) return '';
  return `<div class="banner warn">${icon('shield')}
    <div class="grow">${days == null ? "You haven't backed up yet." : `Last backup: ${days} days ago.`} Save a copy so you never lose your data.</div>
    <button class="btn btn-sm btn-primary" data-action="exportBackup" data-external>Back up</button>
  </div>`;
}

actions.pickDay = () => {
  const mode = S.settings.mode, today = dayIdx(), light = dayPlan(LIGHT, mode), moderate = todayLevel() === 'moderate';
  openSheet(`Pick a ${MODES[mode].label.toLowerCase()} workout`, `<div class="stack">
    <button class="hist" data-action="startWorkout" data-day="${LIGHT}" ${light.exercises.length ? '' : 'disabled'}>
      <div><div class="hist-title">Light workout</div><div class="hist-sub">${esc(light.title)} · ${light.exercises.length} exercises</div></div>
      <div class="hist-right">${icon('play')}</div>
    </button>
    ${planFor(mode).map((d, i) => `
    <button class="hist" data-action="startWorkout" data-day="${i}" ${d.exercises.length ? '' : 'disabled'}>
      <div><div class="hist-title">${DAYS[i]}${i === today ? ' · today' : ''}</div><div class="hist-sub">${esc(d.title)} · ${d.exercises.length} exercises</div></div>
      <div class="hist-right">${icon('play')}</div>
    </button>`).join('')}
    <p class="hint">${moderate ? 'Days start as <b>Moderate</b> (fewer sets), like you picked on the Today screen.' : 'Days start as the full workout. Pick <b>Moderate</b> on the Today screen for fewer sets.'}</p></div>`);
};

actions.quickLog = () => {
  closeSheet();
  S.tab = 'diet'; S.dietView = 'day'; S.dietDate = ymd();
  render({ keepScroll: false });
  openFoodSheet();
};

// ----- Starting a workout -----
function makeSets(count, track, last) {
  return Array.from({ length: clamp(count | 0, 1, 20) }, (_, i) => {
    const prev = last && (last.sets[i] || last.sets[last.sets.length - 1]);
    return { w: track === 'weight' && prev ? prev.w : null, r: null, done: false };
  });
}

actions.startWorkout = el => {
  if (S.active) { closeSheet(); toast('A workout is already in progress'); return; }
  const di = Number(el.dataset.day), mode = S.settings.mode, level = startLevel(di);
  const day = dayPlan(di, mode);
  if (!day || !day.exercises.length) { toast('Add exercises to this day in the Plan tab first'); return; }
  closeSheet();
  const kg = S.settings.unit === 'kg';
  S.active = {
    id: uid(), mode, dayIndex: di, title: day.title, type: day.type, intensity: level,
    date: ymd(), startedAt: Date.now(), finishedAt: null,
    exercises: levelDay(day, level).exercises.map(e => {
      const sets = makeSets(e.sets, e.track, lastSetsFor(e.name, mode));
      // Moderate: start from about 90% of your last full-effort weights
      if (level === 'moderate' && e.track === 'weight') sets.forEach(st => { if (st.w > 0) st.w = Math.max(kg ? 2.5 : 5, roundTo(st.w * 0.9, kg ? 2.5 : 5)); });
      return { planId: e.id, name: e.name, reps: e.reps, rest: e.rest, track: e.track, cues: e.cues, video: e.video, sets };
    })
  };
  S.openEx = null;
  S.tab = 'today';
  saveActive();
  render({ keepScroll: false });
  unlockAudio();
  keepAwake(true);
};

// ----- The workout screen -----
function workoutProgress() {
  let total = 0, done = 0;
  for (const e of S.active.exercises) { total += e.sets.length; done += e.sets.filter(s => s.done).length; }
  return { total, done };
}
function currentOpen() {
  if (S.openEx !== null) return S.openEx;
  return S.active.exercises.findIndex(e => e.sets.some(s => !s.done));
}

function renderWorkout() {
  const a = S.active, m = MODES[a.mode];
  const { total, done } = workoutProgress();
  const open = currentOpen();
  return `
    <div class="wo-head">
      <div class="spread">
        <div class="grow">
          <div class="row wo-meta">
            <span class="badge solid">${icon(m.icon)} ${m.label}</span>
            <span class="wo-clock" id="wo-clock">${clock((Date.now() - a.startedAt) / 1000)}</span>
            <span class="wo-clock" id="wo-count">${done}/${total} sets</span>
          </div>
          <div class="wo-title" style="margin-top:6px">${esc(a.title)}${levelTag(a)}</div>
        </div>
        <div class="row wo-head-btns">
          <button class="btn btn-sm btn-ghost" data-action="exitWorkout">${icon('x', 'sm')} End</button>
          <button class="btn btn-icon btn-ghost" data-action="workoutMenu" aria-label="Workout options">${icon('more')}</button>
        </div>
      </div>
      <div class="wo-bar"><span id="wo-bar" style="width:${total ? (done / total) * 100 : 0}%"></span></div>
    </div>
    <div class="wo-list">
      ${a.intensity && LEVELS[a.intensity] && LEVELS[a.intensity].during ? `<div class="banner">${icon('info')}<div>${LEVELS[a.intensity].during}</div></div>` : ''}
      ${Date.now() - (a.lastAt || a.startedAt) > 4 * 3600000 ? `<div class="banner warn">${icon('clock')}
        <div class="grow">Started ${fmtDate(new Date(a.startedAt), { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Forgot to finish? Your time is saved up to your last set.</div>
        <button class="btn btn-sm btn-primary" data-action="finishWorkout">Finish</button></div>` : ''}
      ${a.exercises.map((e, i) => woExercise(e, i, i === open)).join('')}
      <button class="btn btn-ghost btn-block" data-action="addWorkoutExercise">${icon('plus')} Add exercise</button>
      <button class="btn btn-primary btn-xl" data-action="finishWorkout">${icon('check')} Finish workout</button>
      <button class="btn-link center" data-action="exitWorkout">End early or cancel</button>
    </div>`;
}

// "Light" / "Moderate" label for workouts that weren't the full (heavy) version
const levelTag = w => (isEasy(w) ? ` <span class="lvl-tag lv-${w.intensity}">${LEVELS[w.intensity].label}</span>` : '');

function setText(s, track) {
  if (track === 'weight') return `${s.w != null ? fmt(s.w, 1) : 'BW'} × ${s.r != null ? fmt(s.r) : '?'}`;
  if (track === 'reps') return `${s.r != null ? fmt(s.r) : '?'} reps`;
  if (track === 'time') return s.r != null ? `${fmt(s.r, 2)}s` : '✓';
  return s.done ? '✓' : '–';
}

// Grey hint in the reps box: what you did last time, otherwise the target.
function repHint(e, j, last) {
  const prev = last && (last.sets[j] || last.sets[last.sets.length - 1]);
  if (prev && prev.r != null) return String(prev.r);
  if (e.track === 'time') { const s = repSeconds(e.reps); return s != null ? String(s) : 'sec'; }
  const t = targetNum(e.reps);
  return t != null ? String(t) : '';
}

// Tutorial video preview: tap the thumbnail to play the video inside the app.
function videoCard(e, i) {
  const info = ytInfo(e.video);
  if (!info) {
    return `<div class="wo-tools"><button class="btn btn-sm btn-ghost" data-action="video" data-src="wo" data-i="${i}">${icon('play', 'sm')} Find a form video</button></div>`;
  }
  return `<button class="yt-card" data-action="video" data-src="wo" data-i="${i}" aria-label="Watch the ${esc(e.name)} tutorial">
    <span class="yt-thumb"><img src="${ytThumb(info.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-play">${icon('play')}</span></span>
    <span class="yt-text"><b>Form video + how-to</b><small>Steps, mistakes, easier and harder versions</small></span>
  </button>`;
}

// ----- Coaching tips inside the workout -----
const LOWER_BODY = /leg press|deadlift|squat|lunge|step-up|hip thrust|romanian|rdl|calf|sled|swing/i;
const roundTo = (v, step) => Math.round(v / step) * step;
// Beat the top of your rep range on every set at your top weight → time to go up.
function nextWeight(e, last) {
  if (e.track !== 'weight' || !last) return null;
  const target = targetNum(e.reps), sets = last.sets.filter(st => st.w > 0);
  if (!target || !sets.length) return null;
  const top = Math.max(...sets.map(st => st.w)), atTop = sets.filter(st => st.w === top);
  if (!atTop.every(st => (st.r || 0) >= target) || sets.length < Math.min(2, e.sets.length)) return null;
  const kg = S.settings.unit === 'kg', lower = LOWER_BODY.test(e.name);
  return { from: top, to: top + (kg ? (lower ? 5 : 2.5) : (lower ? 10 : 5)) };
}
// Warm-up ramp for heavy sets (8 reps or fewer): about 45% × 8, 65% × 5, 85% × 3.
function warmupSets(e, work) {
  const kg = S.settings.unit === 'kg', target = targetNum(e.reps);
  if (e.track !== 'weight' || !work || !target || target > 8 || work < (kg ? 40 : 95)) return '';
  const step = kg ? 2.5 : 5;
  return [[0.45, 8], [0.65, 5], [0.85, 3]].map(([p, r]) => `${fmt(roundTo(work * p, step), 1)} × ${r}`).join(' · ');
}
function coachTips(e, i, last) {
  if (e.track !== 'weight') return '';
  const nw = S.active && isEasy(S.active) ? null : nextWeight(e, last), u = S.settings.unit;
  const firstW = (e.sets.find(st => st.w > 0) || {}).w;
  const work = nw ? nw.to : firstW || (last ? Math.max(0, ...last.sets.map(st => st.w || 0)) : 0);
  const warm = e.sets.some(st => st.done) ? '' : warmupSets(e, work);
  return `${nw ? `<div class="wo-tip">${icon('up', 'sm')}<span class="grow">Every set hit ${targetNum(e.reps)}+ reps at ${fmt(nw.from, 1)} ${u} last time — try <b>${fmt(nw.to, 1)} ${u}</b> today.</span>
      <button class="btn btn-sm btn-ghost" data-action="useWeight" data-i="${i}" data-w="${nw.to}">Use it</button></div>` : ''}
    ${warm ? `<div class="wo-warm"><span class="grow">Warm-up first: <b>${warm}</b></span>
      ${barFor(e.name) != null ? `<button class="btn-link" data-action="plateCalc" data-w="${work}" data-bar="${barFor(e.name)}">Plates</button>` : ''}</div>` : ''}`;
}
// Which bar a lift usually uses (for the plate calculator): plate-loaded machines use plates only, and
// dumbbell, kettlebell, cable, machine-stack and bodyweight lifts have no plate math at all (null).
const NO_PLATES = /dumbbell|kettlebell|cable|backpack|landmine|band|pull-up|chin-up|lunge|step-up|split squat|goblet|carry|chest-supported|leg curl|leg extension|pulldown|pushdown|raise|fly|curls?\b|pallof/i;
const barFor = name => {
  const kg = S.settings.unit === 'kg';
  if (NO_PLATES.test(name) && !/leg press/i.test(name)) return null;
  return /leg press|sled/i.test(name) ? 0 : /trap bar/i.test(name) ? (kg ? 25 : 60) : (kg ? 20 : 45);
};
actions.useWeight = el => {
  if (!S.active) return;
  const i = +el.dataset.i, e = S.active.exercises[i], w = num(el.dataset.w);
  if (!e || w == null) return;
  e.sets.forEach(st => { if (!st.done) st.w = w; });
  S.openEx = i; saveActive(); render();
  toast(`Set to ${fmt(w, 1)} ${S.settings.unit}`);
};

// ----- Plate calculator -----
const PLATES = { lb: [45, 35, 25, 10, 5, 2.5], kg: [25, 20, 15, 10, 5, 2.5, 1.25] };
const BARS = {
  lb: [[45, 'Barbell (45 lb)'], [35, 'Lighter bar (35 lb)'], [60, 'Trap bar (about 60 lb)'], [0, 'Plates only (leg press, sled)']],
  kg: [[20, 'Barbell (20 kg)'], [15, 'Lighter bar (15 kg)'], [25, 'Trap bar (about 25 kg)'], [0, 'Plates only (leg press, sled)']]
};
function platesFor(total, bar, unit) {
  let side = (total - bar) / 2;
  if (!(side >= 0)) return null;
  const plates = [];
  for (const p of PLATES[unit]) while (side >= p - 1e-9) { plates.push(p); side -= p; }
  return { plates, left: Math.round(side * 2 * 100) / 100 };
}
function plateOut(f) {
  const u = S.settings.unit, total = num(f.elements.total.value), bar = num(f.elements.bar.value) || 0;
  const r = total ? platesFor(total, bar, u) : null;
  $('.plate-out', f).innerHTML = !total ? '<p class="hint">Enter the total weight you want to lift.</p>'
    : !r ? `<p class="hint">That's less than the bar (${fmt(bar)} ${u}).</p>`
    : `<div class="small text-2">On <b>each side</b>:</div>
      <div class="plates">${r.plates.length ? r.plates.map(p => `<span class="plate" style="--h:${Math.round(40 + (p / PLATES[u][0]) * 44)}px">${fmt(p, 2)}</span>`).join('') : '<span class="hint">No plates — just the bar.</span>'}</div>
      ${r.left ? `<p class="hint">Can't make exactly ${fmt(total, 1)} ${u} with standard plates — that's ${fmt(total - r.left, 2)} ${u}.</p>` : ''}`;
}
actions.plateCalc = el => {
  const u = S.settings.unit, w = num(el && el.dataset.w), bar = el && el.dataset.bar != null ? num(el.dataset.bar) : null;
  openSheet('Plate calculator', `<form class="form" novalidate data-submit="noop">
    <div class="form-grid">
      <label class="field"><span>Total weight (${u})</span><input name="total" inputmode="decimal" value="${w || ''}" autocomplete="off" data-input="plateCalc"></label>
      <label class="field"><span>Bar</span><select name="bar" data-change="plateCalc">${BARS[u].map(([v, l]) => `<option value="${v}" ${v === bar ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    </div>
    <div class="plate-out"></div>
  </form>`);
  plateOut($('#sheet-root form'));
};
inputs.plateCalc = el => plateOut(el.form);
changes.plateCalc = el => plateOut(el.form);
submits.noop = () => {};

function woExercise(e, i, open) {
  const doneN = e.sets.filter(s => s.done).length;
  const complete = doneN === e.sets.length;
  const last = lastSetsFor(e.name, S.active.mode);
  const secs = repSeconds(e.reps);
  const labels = {
    weight: `<div class="set-labels"><span>Set</span><span>${S.settings.unit}</span><span>Reps</span><span>Done</span></div>`,
    reps: `<div class="set-labels one"><span>Set</span><span>Reps</span><span>Done</span></div>`,
    time: `<div class="set-labels one"><span>Set</span><span>Seconds</span><span>Done</span></div>`
  }[e.track] || '';
  return `<article class="wo-ex ${open ? 'open' : ''} ${complete ? 'complete' : ''}" id="ex-${i}">
    <button class="wo-ex-head" data-action="toggleEx" data-i="${i}" aria-expanded="${open}">
      <span class="wo-num" id="exn-${i}">${complete ? icon('check', 'sm') : i + 1}</span>
      <span class="grow">
        <span class="wo-name" style="display:block">${esc(e.name)}</span>
        <span class="wo-sub" style="display:block">${e.sets.length} × ${esc(e.reps)}${e.rest ? ` · rest ${restLabel(e.rest)}` : ''}</span>
      </span>
      <span class="wo-count" id="exc-${i}">${doneN}/${e.sets.length}</span>
    </button>
    <div class="wo-ex-body">
      ${e.cues ? `<p class="wo-cues">${esc(e.cues)}</p>` : ''}
      ${videoCard(e, i)}
      ${secs && secs <= 600 ? `<div class="wo-tools"><button class="btn btn-sm btn-ghost" data-action="workTimer" data-i="${i}" data-sec="${secs}">${icon('timer', 'sm')} ${restLabel(secs)} timer</button></div>` : ''}
      ${last && e.track !== 'check' ? `<div class="wo-last">Last time (${shortDate(last.date)}): <b>${last.sets.map(s => setText(s, e.track)).join(' · ')}</b></div>` : ''}
      ${coachTips(e, i, last)}
      <div class="set-grid">${labels}${e.sets.map((s, j) => setRow(e, i, s, j, last)).join('')}</div>
      <div class="row">
        <button class="btn btn-sm btn-ghost grow" data-action="addSet" data-i="${i}">${icon('plus', 'sm')} Add set</button>
        <button class="btn btn-sm btn-ghost grow" data-action="removeSet" data-i="${i}" ${e.sets.length <= 1 ? 'disabled' : ''}>${icon('minus', 'sm')} Remove set</button>
      </div>
    </div>
  </article>`;
}

function setRow(e, i, s, j, last) {
  const check = `<button class="set-check" data-action="toggleSet" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} done" aria-pressed="${s.done}">${icon('check')}</button>`;
  const field = (f, val, mode, ph, label) => `<input class="set-in" type="text" inputmode="${mode}" enterkeyhint="done" autocomplete="off"
    data-input="setVal" data-i="${i}" data-j="${j}" data-f="${f}" value="${val == null ? '' : esc(val)}" placeholder="${esc(ph)}" aria-label="${label}, set ${j + 1}">`;
  const hint = repHint(e, j, last);
  let mid;
  if (e.track === 'weight') mid = field('w', s.w, 'decimal', S.settings.unit, 'Weight') + field('r', s.r, 'numeric', hint, 'Reps');
  else if (e.track === 'reps') mid = field('r', s.r, 'numeric', hint, 'Reps');
  else if (e.track === 'time') mid = field('r', s.r, 'decimal', hint, 'Seconds');
  else mid = `<div class="set-static">${esc(e.reps)}</div>`;
  return `<div class="set-row ${e.track === 'weight' ? '' : 'one'} ${s.done ? 'done' : ''}" id="set-${i}-${j}"><span class="set-num">${j + 1}</span>${mid}${check}</div>`;
}

inputs.setVal = el => {
  if (!S.active) return;
  const i = +el.dataset.i, j = +el.dataset.j, f = el.dataset.f;
  const e = S.active.exercises[i], s = e && e.sets[j];
  if (!s) return;
  const old = s[f], val = num(el.value);
  s[f] = val;
  // Changing a weight also fills the next sets that had the same weight (less typing between sets)
  if (f === 'w') {
    for (let k = j + 1; k < e.sets.length; k++) {
      const t = e.sets[k];
      if (t.done || !(t.w === old || t.w == null)) break;
      t.w = val;
      const inp = document.querySelector(`#set-${i}-${k} [data-f="w"]`);
      if (inp) inp.value = val == null ? '' : val;
    }
  }
  saveActiveSoon();
};

actions.toggleSet = el => {
  if (!S.active) return;
  const i = +el.dataset.i, j = +el.dataset.j;
  const e = S.active.exercises[i], s = e.sets[j];
  const row = document.getElementById(`set-${i}-${j}`);
  if (row) $$('[data-f]', row).forEach(inp => { s[inp.dataset.f] = num(inp.value); });
  s.done = !s.done;
  if (s.done) S.active.lastAt = Date.now();     // when you really finished (for workouts you forget to close)
  if (s.done && s.r == null) {
    // Nothing typed? Log the grey hint (last time / target). Sprint times are never guessed.
    const autoFill = e.track === 'weight' || e.track === 'reps' || (e.track === 'time' && repSeconds(e.reps) != null);
    if (autoFill) { const n = num(repHint(e, j, lastSetsFor(e.name, S.active.mode))); if (n != null) s.r = n; }
  }
  saveActive();
  refreshSet(i, j);
  if (!s.done) return;
  unlockAudio();
  const exDone = e.sets.every(x => x.done);
  const { total, done } = workoutProgress();
  if (S.settings.autoRest && e.rest > 0 && done < total) {
    const next = exDone ? S.active.exercises.find(x => x.sets.some(y => !y.done)) : null, nextSet = e.sets.findIndex(x => !x.done);
    startTimer(e.rest, next ? `Next: ${next.name}` : nextSet >= 0 ? `${e.name} · next: set ${nextSet + 1} of ${e.sets.length}` : `Rest · ${e.name}`);
  }
  if (exDone) {
    S.openEx = null;
    setTimeout(() => {
      if (!S.active || S.tab !== 'today') return;
      render();
      const n = currentOpen();
      if (n >= 0) scrollToEx(n);
    }, 450);
  }
  if (done === total) toast('All sets done — tap Finish workout!');
};

function refreshSet(i, j) {
  const e = S.active.exercises[i], s = e.sets[j];
  const row = document.getElementById(`set-${i}-${j}`);
  if (row) {
    row.classList.toggle('done', s.done);
    row.querySelector('.set-check').setAttribute('aria-pressed', s.done);
    const r = row.querySelector('[data-f="r"]');
    if (r && s.r != null && r.value === '') r.value = s.r;
  }
  const doneN = e.sets.filter(x => x.done).length, complete = doneN === e.sets.length;
  const c = document.getElementById(`exc-${i}`); if (c) c.textContent = `${doneN}/${e.sets.length}`;
  const art = document.getElementById(`ex-${i}`); if (art) art.classList.toggle('complete', complete);
  const n = document.getElementById(`exn-${i}`); if (n) n.innerHTML = complete ? icon('check', 'sm') : String(i + 1);
  const { total, done } = workoutProgress();
  const bar = $('#wo-bar'); if (bar) bar.style.width = `${total ? (done / total) * 100 : 0}%`;
  const cnt = $('#wo-count'); if (cnt) cnt.textContent = `${done}/${total} sets`;
}

function scrollToEx(i) {
  const el = document.getElementById(`ex-${i}`), view = $('#view'), head = $('.wo-head');
  if (!el) return;
  const top = view.scrollTop + el.getBoundingClientRect().top - view.getBoundingClientRect().top - (head ? head.offsetHeight : 0) - 10;
  view.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

actions.toggleEx = el => {
  const i = +el.dataset.i;
  const art = document.getElementById(`ex-${i}`);
  const willOpen = !art.classList.contains('open');
  $$('.wo-ex.open').forEach(x => { x.classList.remove('open'); x.querySelector('.wo-ex-head').setAttribute('aria-expanded', 'false'); });
  if (willOpen) { art.classList.add('open'); el.setAttribute('aria-expanded', 'true'); scrollToEx(i); }
  S.openEx = willOpen ? i : -1;
};

actions.addSet = el => {
  const i = +el.dataset.i, e = S.active.exercises[i];
  if (e.sets.length >= 20) return;
  const prev = e.sets[e.sets.length - 1];
  e.sets.push({ w: prev ? prev.w : null, r: null, done: false });
  S.openEx = i; saveActive(); render();
};
actions.removeSet = el => {
  const i = +el.dataset.i, e = S.active.exercises[i];
  if (e.sets.length <= 1) return;
  e.sets.pop();
  S.openEx = i; saveActive(); render();
};

actions.workTimer = el => {
  if (!S.active) return;
  unlockAudio();
  startTimer(+el.dataset.sec, `Work · ${S.active.exercises[+el.dataset.i].name}`);
};

actions.workoutMenu = () => openSheet('Workout options', `<div class="stack">
  <button class="btn btn-primary btn-block" data-action="finishWorkout">${icon('check', 'sm')} Finish workout</button>
  <button class="btn btn-ghost btn-block" data-action="addWorkoutExercise">${icon('plus', 'sm')} Add an exercise</button>
  <button class="btn btn-ghost btn-block" data-action="plateCalc">${icon('dumbbell', 'sm')} Plate calculator</button>
  <div class="field"><span>Quick timer</span>
    <div class="chips">${[30, 45, 60, 90, 120, 180].map(s => `<button class="chip" data-action="customTimer" data-s="${s}">${restLabel(s)}</button>`).join('')}</div>
  </div>
  <button class="btn btn-ghost btn-block" data-action="exitWorkout">${icon('x', 'sm')} End early or cancel</button>
</div>`);
actions.customTimer = el => { closeSheet(); unlockAudio(); startTimer(+el.dataset.s, 'Timer'); };

actions.addWorkoutExercise = () => {
  if (!S.active) return;
  openSheet('Add to this workout', exerciseForm(
    { name: '', sets: 3, reps: '10', rest: 60, track: S.active.mode === 'home' ? 'reps' : 'weight', cues: '', video: '' },
    { submit: 'saveWoEx', isNew: true }));
};
submits.saveWoEx = f => {
  if (!S.active) { closeSheet(); return; }
  const data = cleanExercise(formData(f));
  if (!data) return;
  S.active.exercises.push({
    planId: null, name: data.name, reps: data.reps, rest: data.rest, track: data.track, cues: data.cues, video: data.video,
    sets: makeSets(data.sets, data.track, lastSetsFor(data.name, S.active.mode))
  });
  S.openEx = S.active.exercises.length - 1;
  saveActive(); closeSheet(); render();
  scrollToEx(S.openEx);
  toast('Added to this workout only');
};

// ----- Finishing -----
const lowerIsBetter = e => e.track === 'time' && repSeconds(e.reps) == null;   // sprint / shuttle times
const volumeOf = w => sum(w.exercises.filter(e => e.track === 'weight'), e => sum(e.sets.filter(s => s.done), s => (s.w || 0) * (s.r || 0)));
const setsDone = w => sum(w.exercises, e => e.sets.filter(s => s.done).length);

actions.finishWorkout = () => {
  if (!S.active) return;
  const { total, done } = workoutProgress();
  if (done < total) { actions.exitWorkout(); return; }       // sets left: same choices as the End button
  closeSheet();
  endWorkout(true);
};
// ----- Stop early: keep what you did, or cancel the whole workout (with Undo) -----
actions.exitWorkout = () => {
  if (!S.active) return;
  const { total, done } = workoutProgress(), left = total - done, took = fmtDur(Date.now() - S.active.startedAt);
  const s = n => (n === 1 ? '' : 's');
  openSheet(!done ? 'Cancel this workout?' : left ? 'End workout early?' : 'Finish workout?', `<div class="stack">
    <p class="text-2">${done ? `You've done <b>${done} of ${total} set${s(total)}</b> in ${took}.` : `You haven't checked off any sets yet (${took}).`}</p>
    ${done ? `<div class="stack-sm">
      <button class="btn btn-primary btn-block" data-action="endEarly">${icon('check', 'sm')} ${left ? 'Save and end now' : 'Finish and save'}</button>
      <p class="hint">${left ? `Keeps the ${done} set${s(done)} you checked off, and the other ${left} ${left === 1 ? 'is' : 'are'} marked as skipped.` : 'Every set is done.'} It goes into your history and progress charts.</p>
    </div>` : ''}
    <div class="stack-sm">
      <button class="btn btn-danger btn-block" data-action="cancelWorkout">${icon('trash', 'sm')} Cancel workout</button>
      <p class="hint">Nothing from this workout is saved. You can undo it right after.</p>
    </div>
    <button class="btn btn-ghost btn-block" data-action="closeSheet">Keep going</button>
  </div>`);
};
actions.endEarly = () => { if (!S.active) return; closeSheet(); endWorkout(true); };
actions.cancelWorkout = () => { if (!S.active) return; closeSheet(); endWorkout(false); };
// Undo a cancel: the workout comes back exactly as it was.
function resumeWorkout(a) {
  if (S.active) { toast('Another workout is already going'); return; }
  S.active = a; S.openEx = null; S.tab = 'today';
  saveActive(); render({ keepScroll: false }); keepAwake(true);
  toast('Workout back — keep going');
}

async function endWorkout(keep) {
  const a = S.active;
  if (!a) return;
  stopTimer();
  keepAwake(false);
  S.active = null;
  S.openEx = null;
  let prs = [];
  if (keep) {
    a.finishedAt = Date.now();
    a.early = a.exercises.some(e => e.sets.some(st => !st.done));   // stopped before every set was done
    // Forgot to tap Finish? End the workout a minute after your last checked set instead of now.
    if (a.lastAt && a.finishedAt - a.lastAt > 3 * 3600000) a.finishedAt = a.lastAt + 60000;
    prs = findPRs(a);
    S.workouts.unshift(a);
    await save(() => DB.put('workouts', a));
  }
  await saveActive();
  render({ keepScroll: false });
  if (keep) showSummary(a, prs);
  else toast('Workout canceled — nothing saved', { action: () => resumeWorkout(a), label: 'Undo' });
}

// New bests compared with every earlier workout in the same mode.
function findPRs(w) {
  const prs = [], unit = S.settings.unit;
  for (const e of w.exercises) {
    const mine = e.sets.filter(s => s.done);
    if (!mine.length || e.track === 'check') continue;
    const key = normName(e.name), prev = [];
    for (const x of S.workouts) if (x.mode === w.mode) for (const y of x.exercises) if (normName(y.name) === key) prev.push(...y.sets.filter(s => s.done));
    if (!prev.length) continue;
    if (e.track === 'weight') {
      const top = Math.max(0, ...mine.map(s => s.w || 0)), best = Math.max(0, ...prev.map(s => s.w || 0));
      if (top > best) prs.push(`${e.name}: ${fmt(top, 1)} ${unit} (old best ${fmt(best, 1)})`);
    } else {
      const vals = mine.map(s => s.r).filter(v => v > 0), old = prev.map(s => s.r).filter(v => v > 0);
      if (!vals.length || !old.length) continue;
      if (lowerIsBetter(e)) {
        const b = Math.min(...vals), ob = Math.min(...old);
        if (b < ob) prs.push(`${e.name}: ${fmt(b, 2)}s (old best ${fmt(ob, 2)}s)`);
      } else {
        const b = Math.max(...vals), ob = Math.max(...old), u = e.track === 'time' ? 's' : ' reps';
        if (b > ob) prs.push(`${e.name}: ${fmt(b, 1)}${u} (old best ${fmt(ob, 1)}${u})`);
      }
    }
  }
  return prs;
}

function showSummary(w, prs) {
  const vol = volumeOf(w), total = sum(w.exercises, e => e.sets.length);
  openSheet(w.early ? 'Workout saved' : 'Workout complete', `
    ${w.early ? `<p class="text-2 small">Ended early: ${setsDone(w)} of ${total} sets done. Good call if your body needed it.</p>` : ''}
    <div class="tiles">
      <div class="tile"><div class="tile-label">Time</div><div class="tile-value">${fmtDur(w.finishedAt - w.startedAt)}</div></div>
      <div class="tile"><div class="tile-label">Sets done</div><div class="tile-value">${setsDone(w)}</div></div>
      <div class="tile"><div class="tile-label">Volume</div><div class="tile-value">${vol ? `${fmtK(vol)} <small>${S.settings.unit}</small>` : '–'}</div></div>
    </div>
    ${prs.length ? `<div class="card stack-sm"><div class="card-title row">${icon('trophy')} New personal records</div>${prs.map(p => `<div class="small text-2">${esc(p)}</div>`).join('')}</div>` : ''}
    ${effortBlock(w)}
    <p class="text-2 small">Saved to your history on the Progress tab.</p>
    <button class="btn btn-ghost btn-block" data-action="shareWorkout" data-id="${w.id}" data-external>${icon('share', 'sm')} Share this workout</button>
    <div class="sheet-actions">
      <button class="btn btn-ghost" data-action="quickLog">Log a meal</button>
      <button class="btn btn-primary" data-action="closeSheet">Done</button>
    </div>`);
}

// ----- Effort rating + notes (on the summary and in history) -----
const EFFORT = ['', 'Very easy', 'Easy', 'Easy', 'Moderate', 'Moderate', 'Hard', 'Hard', 'Very hard', 'Very hard', 'All-out'];
const effortText = v => (v ? `${v}/10 · ${EFFORT[v]}` : '1 = very easy · 10 = all-out');
function effortBlock(w) {
  return `<div class="field"><span>How hard was it? <small class="effort-label">${effortText(w.rpe)}</small></span>
      <div class="rpe">${Array.from({ length: 10 }, (_, k) => `<button class="rpe-btn ${w.rpe === k + 1 ? 'on' : ''}" data-action="rateWorkout" data-id="${w.id}" data-v="${k + 1}" aria-pressed="${w.rpe === k + 1}">${k + 1}</button>`).join('')}</div></div>
    <label class="field"><span>Notes</span><textarea data-input="workoutNote" data-id="${w.id}" maxlength="1000" placeholder="How you felt, what to change next time…">${esc(w.notes || '')}</textarea></label>`;
}
actions.rateWorkout = el => {
  const w = S.workouts.find(x => x.id === el.dataset.id);
  if (!w) return;
  const v = +el.dataset.v;
  w.rpe = w.rpe === v ? null : v;
  save(() => DB.put('workouts', w));
  const box = el.closest('.field');
  $$('.rpe-btn', box).forEach(b => { const on = +b.dataset.v === w.rpe; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  $('.effort-label', box).textContent = effortText(w.rpe);
};
let noteTimer = null;
inputs.workoutNote = el => {
  const w = S.workouts.find(x => x.id === el.dataset.id);
  if (!w) return;
  w.notes = el.value.trim();
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => save(() => DB.put('workouts', w)), 400);
};

// ----- Form videos -----
let videoRef = null;
actions.video = el => {
  const i = +el.dataset.i;
  if (el.dataset.src === 'wo') {
    if (!S.active) return;
    videoRef = { src: 'wo', i };
    openVideo(S.active.exercises[i]);
  } else {
    videoRef = { src: 'plan', i, mode: S.settings.mode, day: S.planDay };
    openVideo(dayPlan(S.planDay).exercises[i]);
  }
};

function openVideo(ex) {
  const info = ytInfo(ex.video);
  const link = safeUrl(normUrl(ex.video));
  let top;
  if (info) {
    top = videoEmbed(info, ex.name);
  } else if (link && !isSearchLink(link)) {
    top = `<div class="placeholder-box"><div class="bold">This link can't play inside the app</div>
      <div class="hint">Only YouTube links play here. You can still open it:</div>
      <a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener" data-external>${icon('video', 'sm')} Open link</a></div>`;
  } else {
    top = `<div class="placeholder-box">
      <div class="bold">No video picked yet — this is a placeholder</div>
      <ol class="steps">
        <li>Tap <b>Find a video</b> to search YouTube.</li>
        <li>Open a good one, then tap <b>Share → Copy link</b>.</li>
        <li>Come back here, tap <b>Paste</b>, then <b>Save link</b>.</li>
      </ol>
      <a class="btn btn-primary" href="${esc(link || placeholderVideo(ex.name))}" target="_blank" rel="noopener" data-external>${icon('video', 'sm')} Find a video</a>
    </div>`;
  }
  const form = `<form class="form" novalidate data-submit="saveVideo">
      <label class="field"><span>${info ? 'Swap for a different video' : 'YouTube link'}</span>
        <input name="video" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://youtu.be/…" value="${info ? esc(ex.video) : ''}"></label>
      <div class="sheet-actions">
        <button type="button" class="btn btn-ghost" data-action="pasteLink">${icon('copy', 'sm')} Paste</button>
        <button type="submit" class="btn btn-primary">Save link</button>
      </div>
      ${info ? `<a class="btn-link center" href="${esc(link)}" target="_blank" rel="noopener" data-external>Open in YouTube</a>` : ''}
    </form>`;
  openSheet(ex.name, `${top}
    ${ex.cues ? `<p class="wo-cues">${esc(ex.cues)}</p>` : ''}
    ${infoBlock(ex.name)}
    ${progressLink(ex.name)}
    ${videoRef && videoRef.src === 'wo' ? swapBlock(ex) : ''}
    ${info ? `<details class="table-toggle"><summary>Use a different video</summary>${form}</details>` : form}`);
}

const videoEmbed = (info, name) => `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${info.id}?playsinline=1&rel=0&modestbranding=1${info.start ? `&start=${info.start}` : ''}"
  title="${esc(name)} form video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;

// Jump from an exercise to its chart on the Progress tab (once you've logged it).
function progressLink(name) {
  const mode = S.active ? S.active.mode : S.settings.mode, ex = loggedExercises(mode).find(e => normName(e.name) === normName(name));
  return ex ? `<button class="btn btn-ghost btn-block" data-action="exProgress" data-name="${esc(ex.name)}">${icon('progress', 'sm')} Your progress · ${ex.count} session${ex.count === 1 ? '' : 's'}</button>` : '';
}
actions.exProgress = el => { S.progEx = el.dataset.name; S.progMetric = null; S.progView = 'lifts'; S.tab = 'progress'; closeSheet(); render({ keepScroll: false }); };

// How-to details from exercises.js. A renamed exercise like "Push-ups (weighted)" falls back to "Push-ups".
const exerciseInfo = name => EXERCISE_INFO[name] || EXERCISE_INFO[String(name || '').replace(/\s*\(.*\)\s*$/, '')] || null;
function infoBlock(name) {
  const x = exerciseInfo(name);
  if (!x) return '';
  const list = (tag, items) => `<${tag} class="steps">${items.map(t => `<li>${esc(t)}</li>`).join('')}</${tag}>`;
  return `<div class="ex-info">
    <div><span class="badge">${icon('dumbbell')} ${esc(x.muscles)}</span></div>
    <p class="text-2 small"><b>Why it matters:</b> ${esc(x.why)}</p>
    <div class="section-title">How to do it</div>${list('ol', x.steps)}
    <div class="section-title">Watch out for</div>${list('ul', x.mistakes)}
    <div class="grid2">
      <div class="tile"><div class="tile-label">Easier version</div><div class="small">${esc(x.easier)}</div></div>
      <div class="tile"><div class="tile-label">Harder version</div><div class="small">${esc(x.harder)}</div></div>
    </div>
  </div>`;
}

// During a workout: swap an exercise for a similar one when the equipment is taken (today only).
function swapBlock(ex) {
  const x = exerciseInfo(ex.name);
  if (!x || !x.swap || !x.swap.length) return '';
  const started = ex.sets.some(st => st.done);
  return `<div class="section-title">Equipment taken? Swap it for today</div>
    <div class="chips">${x.swap.map(n => `<button class="chip" data-action="swapEx" data-name="${esc(n)}" ${started ? 'disabled' : ''}>${esc(n)}</button>`).join('')}
      <button class="chip" data-action="library" data-swap="1" ${started ? 'disabled' : ''}>More options…</button></div>
    <p class="hint">${started ? 'Swapping works before you check off any sets of this exercise.' : "Only changes today's workout — your plan stays the same."}</p>`;
}
// ----- Exercise library (Plan tab): browse every exercise and add one to the day you're viewing -----
function libList(q) {
  const words = normName(q).split(' ').filter(Boolean);
  const match = n => { const hay = normName(n + ' ' + ((exerciseInfo(n) || {}).muscles || '')); return words.every(w => hay.includes(w)); };
  return EXERCISE_GROUPS.map(([g, names]) => [g, names.filter(match)]).filter(([, names]) => names.length)
    .map(([g, names]) => `<div class="section-title">${esc(g)}</div>${names.map(n => `<button class="lib-row" data-action="libOpen" data-name="${esc(n)}">
      <span class="grow"><b>${esc(n)}</b><small>${esc((exerciseInfo(n) || {}).muscles || '')}</small></span>${icon('right', 'sm')}</button>`).join('')}`).join('')
    || '<div class="empty">No exercises match.</div>';
}
let libSwap = false;   // true when the library was opened to swap an exercise in a workout
actions.library = el => { libSwap = !!(el && el.dataset.swap); openLibrary(); };
const openLibrary = () => openSheet(libSwap ? 'Swap for today' : 'Exercise library', `
  <label class="field"><span>Search by name or muscle</span><input data-input="libSearch" placeholder="e.g. hamstrings, press, rotation" autocomplete="off" autocorrect="off"></label>
  <div class="lib-list">${libList('')}</div>`);
inputs.libSearch = el => { $('.lib-list').innerHTML = libList(el.value); };
actions.libOpen = el => {
  const name = el.dataset.name, info = ytInfo(defaultVideo(name));
  openSheet(name, `${info ? videoEmbed(info, name) : ''}
    ${infoBlock(name)}
    ${libSwap && S.active ? `<button class="btn btn-primary btn-block" data-action="swapEx" data-name="${esc(name)}">${icon('refresh', 'sm')} Swap for today</button>`
      : `<button class="btn btn-primary btn-block" data-action="libAdd" data-name="${esc(name)}">${icon('plus', 'sm')} Add to ${dayName(S.planDay)} · ${MODES[S.settings.mode].label}</button>`}
    <button class="btn btn-ghost btn-block" data-action="libBack">Back to the library</button>`);
};
actions.libBack = () => openLibrary();
actions.libAdd = el => {
  const name = el.dataset.name, t = planTemplate(name);
  dayPlan(S.planDay).exercises.push({ id: uid(), name, sets: t ? t.sets : 3, reps: t ? t.reps : '10', rest: t ? t.rest : 60, track: t ? t.track : 'reps', cues: t ? t.cues : '', video: defaultVideo(name) });
  savePlan(); closeSheet(); render();
  toast(`${name} added to ${dayName(S.planDay)}`);
};

// How the starting programs set up an exercise (cues, reps, what to log). Library-only exercises carry
// their own defaults in exercises.js ("plan").
function planTemplate(name) {
  const plans = [program().plan, ...Object.values(PROGRAMS).map(p => p.plan)];
  for (const plan of plans) for (const mode of ['gym', 'home']) for (const d of plan[mode]) { const e = d.exercises.find(x => x.name === name); if (e) return e; }
  const x = EXERCISE_INFO[name];
  return x && x.plan ? x.plan : null;
}
actions.swapEx = el => {
  if (!S.active || !videoRef || videoRef.src !== 'wo') return;
  const e = S.active.exercises[videoRef.i], name = el.dataset.name;
  if (!e || e.sets.some(st => st.done)) return;
  const t = planTemplate(name), from = e.name;
  Object.assign(e, { name, planId: null, video: defaultVideo(name), cues: t ? t.cues : '', reps: t ? t.reps : e.reps, rest: t ? t.rest : e.rest, track: t ? t.track : e.track });
  e.sets = makeSets(e.sets.length, e.track, lastSetsFor(name, S.active.mode));
  saveActive(); closeSheet(); render();
  toast(`Swapped ${from} for ${name} (today only)`);
};

submits.saveVideo = f => {
  const ref = videoRef;
  if (!ref) { closeSheet(); return; }
  let url = normUrl(formData(f).video);
  if (url && !safeUrl(url)) { toast('Paste a full link that starts with https://'); return; }
  let target, planEx;
  if (ref.src === 'wo') {
    if (!S.active) { closeSheet(); return; }
    target = S.active.exercises[ref.i];
    planEx = findPlanEx(target && target.planId);
  } else {
    target = dayPlan(ref.day, ref.mode).exercises[ref.i];
    planEx = target;
  }
  if (!target) { closeSheet(); return; }
  if (!url) url = defaultVideo(target.name);
  target.video = url;
  if (planEx) { planEx.video = url; savePlan(); }   // remember it in the plan for next time too
  if (ref.src === 'wo') saveActive();
  closeSheet();
  render();
  toast(ytInfo(url) ? 'Video saved — tap play to watch' : 'Link saved');
};

actions.pasteLink = async el => {
  const input = el.closest('form').elements.namedItem('video');
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (text) input.value = text; else toast('Nothing copied yet');
  } catch (e) {
    input.focus();
    toast('Tap and hold in the box, then tap Paste');
  }
};

/* ============================== 6. REST TIMER, SOUND, SCREEN-AWAKE ============================== */

const T = { end: 0, total: 0, label: '', id: null, doneAt: 0 };

function startTimer(sec, label) {
  T.total = Math.max(1, sec); T.end = Date.now() + sec * 1000; T.label = label; T.doneAt = 0;
  clearInterval(T.id);
  T.id = setInterval(timerTick, 250);
  drawTimer();
  timerTick();
}
function stopTimer() {
  clearInterval(T.id);
  T.id = null; T.end = 0; T.doneAt = 0;
  const el = $('#timer');
  el.hidden = true; el.classList.remove('done'); el.innerHTML = '';
}
function drawTimer() {
  const el = $('#timer');
  el.hidden = false;
  el.classList.remove('done');
  el.innerHTML = `
    <div class="tm-label" id="tm-label">${esc(T.label)}</div>
    <div class="tm-time" id="tm-time">${mmss(T.total)}</div>
    <div class="tm-bar"><span id="tm-bar"></span></div>
    <div class="tm-btns">
      <button class="btn" data-action="timerAdd" data-s="-15" aria-label="15 seconds less">−15</button>
      <button class="btn" data-action="timerAdd" data-s="15" aria-label="15 seconds more">+15</button>
      <button class="btn" data-action="timerSkip" aria-label="Stop timer">${icon('x', 'sm')}</button>
    </div>`;
}
function timerTick() {
  if (!T.end) return;
  const time = $('#tm-time'), bar = $('#tm-bar'), label = $('#tm-label');
  if (!time) return;
  const left = (T.end - Date.now()) / 1000;
  if (left <= 0) {
    if (!T.doneAt) {
      T.doneAt = Date.now();
      $('#timer').classList.add('done');
      time.textContent = 'GO!';
      label.textContent = T.label.startsWith('Work') ? 'Time!' : 'Rest over — next set';
      bar.style.width = '100%';
      timerAlert(-left > 3);   // don't beep late if the phone was locked when it ran out
    } else if (Date.now() - T.doneAt > 5000) stopTimer();
    return;
  }
  time.textContent = mmss(Math.ceil(left));
  bar.style.width = `${clamp(100 - (left / T.total) * 100, 0, 100)}%`;
}
actions.timerAdd = el => {
  const d = Number(el.dataset.s);
  if (T.doneAt) {
    if (d < 0) return;
    T.doneAt = 0; T.end = Date.now(); T.total = 0;
    drawTimer();
  }
  T.end += d * 1000;
  T.total = Math.max(1, T.total + d);
  timerTick();
};
actions.timerSkip = () => stopTimer();

// Sound: iPhones only allow sound after a tap, so the first tap "unlocks" it.
let audioCtx = null;
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state !== 'running') audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = audioCtx.createBuffer(1, 1, 22050);
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (e) { /* no sound available */ }
}
function beep() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state !== 'running') audioCtx.resume();
    const t0 = audioCtx.currentTime + 0.05;
    [0, 0.28, 0.56].forEach((d, k) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), last = k === 2;
      o.type = 'sine';
      o.frequency.value = last ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.6, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (last ? 0.5 : 0.2));
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0 + d); o.stop(t0 + d + 0.55);
    });
  } catch (e) { /* ignore */ }
}
function timerAlert(late) {
  if (S.settings.sound && !late) beep();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// Keep the screen on during a workout (newer iPhones support this in home-screen apps).
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && S.settings.keepAwake && 'wakeLock' in navigator) {
      if (!wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } else if (wakeLock) {
      const w = wakeLock; wakeLock = null;
      await w.release();
    }
  } catch (e) { /* not supported here — that's fine */ }
}

// Auto-lock: if Dugout sat in the background longer than your Auto-lock setting, sign out.
// Opening the share sheet, the file picker or YouTube sends Dugout to the background for a
// moment on purpose — don't lock for that (unless you stay away more than 10 minutes).
let hiddenAt = 0, externalAt = 0;
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-external]')) externalAt = Date.now(); }, true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  checkForUpdate();
  const wentAt = hiddenAt, away = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = 0;
  if (S.locked) return;
  const onPurpose = externalAt && wentAt - externalAt < 5000 && away < 10 * 60000;
  if (away && !onPurpose && away >= (S.settings.autoLock ?? 5) * 60000) { lockApp(); return; }
  if (S.active) keepAwake(true);
  try { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume(); } catch (e) { /* ignore */ }
  timerTick();
  const newDay = rollDay();
  if (S.plan && (S.tab === 'today' || newDay) && !S.active && !$('#sheet-root').classList.contains('open')) render();
});
document.addEventListener('pointerdown', () => {
  try { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume(); } catch (e) { /* ignore */ }
}, { passive: true });

/* ============================== 7. PLAN TAB ============================== */

let editIndex = null;   // which exercise the edit form is changing (null = adding a new one)

function renderPlan() {
  const mode = S.settings.mode, m = MODES[mode];
  const di = S.planDay, day = dayPlan(di), today = dayIdx();
  const n = day.exercises.length;
  const chips = planFor(mode).map((d, i) => `
    <button class="day-chip ${i === di ? 'on' : ''} ${i === today ? 'today' : ''}" data-action="planDay" data-i="${i}" aria-pressed="${i === di}" aria-label="${DAYS[i]}: ${esc(d.title)}">
      ${DAYS_SHORT[i]}<small>${TYPE_SHORT[d.type] || ''}</small>
    </button>`).join('') + `
    <button class="day-chip light-chip ${di === LIGHT ? 'on' : ''}" data-action="planDay" data-i="${LIGHT}" aria-pressed="${di === LIGHT}" aria-label="Light workout: ${esc(dayPlan(LIGHT).title)}">
      Light workout<small>Pick it any day on Today</small>
    </button>`;
  return `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Weekly plan</div><h1 class="page-title">Plan</h1></div>
      <button class="btn btn-sm btn-ghost" data-action="programs">${icon('refresh', 'sm')} ${esc(program().name)}</button></div>
    ${modeToggle()}
    <div class="days">${chips}</div>
    <div class="small muted center">${(() => { const days = planFor(mode).filter(d => d.type !== 'rest' && d.exercises.length), mins = sum(days, d => estMinutes(d));
      return `${days.length} training day${days.length === 1 ? '' : 's'} · about ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`} a week`; })()}</div>
    <section class="card hero">
      <div class="spread">
        <span class="badge accent">${icon(m.icon)} ${m.label} · ${di === LIGHT ? 'Light' : DAYS[di]}</span>
        <button class="btn btn-sm btn-ghost" data-action="editDay">${icon('edit', 'sm')} Edit day</button>
      </div>
      <div>
        <h2 class="day-title">${esc(day.title)}</h2>
        ${day.focus ? `<p class="text-2 small" style="margin-top:8px">${esc(day.focus)}</p>` : ''}
      </div>
      <div class="meta-row"><span>${TYPES[day.type] || ''}</span><span>${n} exercise${n === 1 ? '' : 's'}</span>${n ? `<span>~${estMinutes(day)} min</span>` : ''}</div>
    </section>
    <div class="section-row">
      <div class="section-title">Exercises</div>
      ${n > 1 ? `<button class="btn-link" data-action="toggleReorder">${S.planReorder ? 'Done' : 'Reorder'}</button>` : ''}
    </div>
    <div class="stack">${n ? day.exercises.map((e, i) => planExCard(e, i, n)).join('') : `<div class="empty">No exercises yet — add your first one.</div>`}</div>
    <div class="grid2">
      <button class="btn btn-ghost" data-action="library">${icon('dumbbell', 'sm')} Exercise library</button>
      <button class="btn btn-ghost" data-action="addPlanEx">${icon('plus', 'sm')} Add your own</button>
    </div>
    ${n ? `<button class="btn btn-primary btn-xl" data-action="startWorkout" data-day="${di}" ${S.active ? 'disabled' : ''}>${icon('play')} ${S.active ? 'Workout in progress' : di === LIGHT ? 'Start the Light workout' : 'Start this workout'}</button>` : ''}
    <p class="hint center">${di === LIGHT ? 'Your easy day. Pick <b>Light</b> on the Today screen to do this instead of the planned workout — the day after a game, sprinting or a hard practice. ' : ''}Tap an exercise to change its sets, reps, rest, cues or video. Gym and Home plans are completely separate — switch with the toggle at the top.</p>
  </div>`;
}

function planExCard(e, i, n) {
  const side = S.planReorder
    ? `<div class="ex-side">
        <button class="btn btn-icon sm btn-ghost" data-action="moveEx" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up', 'sm')}</button>
        <button class="btn btn-icon sm btn-ghost" data-action="moveEx" data-i="${i}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">${icon('down', 'sm')}</button>
      </div>`
    : (() => {
      const info = ytInfo(e.video);
      return info
        ? `<div class="ex-side"><button class="yt-mini" data-action="video" data-src="plan" data-i="${i}" aria-label="Watch the ${esc(e.name)} tutorial"><img src="${ytThumb(info.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-play">${icon('play')}</span></button></div>`
        : `<div class="ex-side"><button class="btn btn-icon sm" data-action="video" data-src="plan" data-i="${i}" aria-label="Find a form video for ${esc(e.name)}">${icon('play', 'sm')}</button></div>`;
    })();
  return `<div class="ex-card">
    <span class="wo-num">${i + 1}</span>
    <div class="grow" data-action="editPlanEx" data-i="${i}" role="button" tabindex="0" aria-label="Edit ${esc(e.name)}">
      <div class="ex-name">${esc(e.name)}</div>
      <div class="ex-meta">${e.sets} × ${esc(e.reps)}${e.rest ? ` · rest ${restLabel(e.rest)}` : ''} · ${TRACK_SHORT[e.track] || ''}</div>
      ${e.cues ? `<div class="ex-cues">${esc(e.cues)}</div>` : ''}
    </div>
    ${side}
  </div>`;
}

actions.planDay = el => { S.planDay = +el.dataset.i; render(); };

// ----- Programs (plan.js PROGRAMS): switch between off-season and in-season plans -----
actions.programs = () => openSheet('Programs', `<div class="stack">
  ${Object.entries(PROGRAMS).map(([k, p]) => `<div class="card stack-sm program ${S.settings.program === k ? 'current' : ''}">
    <div class="spread"><div class="card-title">${esc(p.name)}</div><span class="badge ${S.settings.program === k ? 'accent' : ''}">${S.settings.program === k ? 'Current' : esc(p.tag)}</span></div>
    <p class="text-2 small">${esc(p.about)}</p>
    ${S.settings.program === k ? '' : `<button class="btn btn-primary btn-block" data-action="useProgram" data-k="${k}">Switch to ${esc(p.name)}</button>`}
  </div>`).join('')}
  <p class="hint">Switching replaces both your gym and home weekly plans (including your edits). Your Light workout, workout history, charts and records stay.</p>
</div>`);
actions.useProgram = async el => {
  const k = el.dataset.k, p = PROGRAMS[k];
  if (!p) return;
  if (!(await confirmBox(`Switch to ${p.name}?`, 'Your gym and home weekly plans will be replaced with this program. Workout history is kept.', { ok: 'Switch' }))) return;
  S.plan = { ...buildPlan(p.plan), light: S.plan.light };      // your Light workout stays the same
  S.settings.program = k;
  savePlan(); saveSettings(); render({ keepScroll: false });
  toast(`${p.name} program ready`);
};
actions.toggleReorder = () => { S.planReorder = !S.planReorder; render(); };
actions.moveEx = el => {
  const list = dayPlan(S.planDay).exercises, i = +el.dataset.i, j = i + Number(el.dataset.d);
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  savePlan(); render();
};

function exerciseForm(e, { submit, isNew, canDelete }) {
  return `<form class="form" novalidate data-submit="${submit}">
    <label class="field"><span>Exercise name</span><input name="name" value="${esc(e.name)}" maxlength="60" required autocomplete="off" placeholder="e.g. Leg press"></label>
    <div class="form-grid">
      <div class="field"><span>Sets</span>${stepper('sets', e.sets, 1, { min: 1, max: 20 })}</div>
      <label class="field"><span>Reps / time</span><input name="reps" value="${esc(e.reps)}" maxlength="24" autocomplete="off" placeholder="8, 6-8, 30 sec"></label>
    </div>
    <div class="field"><span>Rest between sets (seconds)</span>${stepper('rest', e.rest, 15, { min: 0, max: 900, minus: '−15', plus: '+15' })}</div>
    <label class="field"><span>What to log each set</span>
      <select name="track">${Object.entries(TRACKS).map(([k, v]) => `<option value="${k}" ${e.track === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field"><span>Form cues</span><textarea name="cues" maxlength="500" placeholder="Short reminders for good form">${esc(e.cues)}</textarea></label>
    <label class="field"><span>YouTube video link</span>
      <input name="video" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(e.video)}" placeholder="https://youtu.be/…">
      <small>Paste a YouTube link to play it inside the app. The starting links are YouTube searches — placeholders you can swap.</small></label>
    <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Add exercise' : 'Save changes'}</button>
    ${canDelete ? `<button class="btn btn-danger btn-block" type="button" data-action="deletePlanEx">${icon('trash', 'sm')} Delete exercise</button>` : ''}
  </form>`;
}

function cleanExercise(d, old) {
  const name = String(d.name || '').trim();
  if (!name) { toast('Give the exercise a name'); return null; }
  let video = normUrl(d.video);
  if (video && !safeUrl(video)) { toast('Video link must start with https://'); return null; }
  // Renamed an exercise that still has a placeholder? Point the placeholder at the new name.
  const renamed = old && normName(old.name) !== normName(name);
  if (!video || (renamed && isSearchLink(video) && video === old.video)) video = defaultVideo(name);
  return {
    name,
    sets: clamp(parseInt(d.sets, 10) || 1, 1, 20),
    reps: String(d.reps || '').trim() || '10',
    rest: clamp(parseInt(d.rest, 10) || 0, 0, 900),
    track: TRACKS[d.track] ? d.track : 'weight',
    cues: String(d.cues || '').trim(),
    video
  };
}

actions.editPlanEx = el => {
  editIndex = +el.dataset.i;
  const e = dayPlan(S.planDay).exercises[editIndex];
  if (e) openSheet('Edit exercise', exerciseForm(e, { submit: 'savePlanEx', isNew: false, canDelete: true }));
};
actions.addPlanEx = () => {
  editIndex = null;
  openSheet(`Add to ${dayName(S.planDay)}`, exerciseForm(
    { name: '', sets: 3, reps: '10', rest: 60, track: S.settings.mode === 'gym' ? 'weight' : 'reps', cues: '', video: '' },
    { submit: 'savePlanEx', isNew: true }));
};
submits.savePlanEx = f => {
  const list = dayPlan(S.planDay).exercises;
  const old = editIndex != null ? list[editIndex] : null;
  const data = cleanExercise(formData(f), old);
  if (!data) return;
  if (old) Object.assign(old, data); else list.push({ id: uid(), ...data });
  savePlan(); closeSheet(); render();
  toast(old ? 'Saved' : 'Exercise added');
};
actions.deletePlanEx = async () => {
  const list = dayPlan(S.planDay).exercises, i = editIndex, e = list[i];
  if (!e) return;
  if (!(await confirmBox('Delete exercise?', `Remove "${e.name}" from ${dayName(S.planDay)}? Your workout history is kept.`, { ok: 'Delete', danger: true }))) return;
  list.splice(i, 1);
  savePlan(); render(); toast('Exercise deleted');
};

actions.editDay = () => {
  const day = dayPlan(S.planDay);
  openSheet(`${dayName(S.planDay)} · ${MODES[S.settings.mode].label}`, `<form class="form" novalidate data-submit="saveDay">
    <label class="field"><span>Workout name</span><input name="title" value="${esc(day.title)}" maxlength="60" required autocomplete="off"></label>
    <label class="field"><span>Type of day</span>
      <select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${day.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field"><span>Focus / notes</span><textarea name="focus" maxlength="400">${esc(day.focus)}</textarea></label>
    <button class="btn btn-primary btn-block" type="submit">Save</button>
    <label class="field"><span>Copy another day's workout here</span>
      <select data-change="copyDayFrom"><option value="">Choose a day…</option>${[...planFor().keys(), LIGHT].map(i => (i === S.planDay ? '' : `<option value="${i}">${dayName(i)} — ${esc(dayPlan(i).title)}</option>`)).join('')}</select></label>
    <button class="btn btn-ghost btn-block" type="button" data-action="resetDay">${icon('refresh', 'sm')} Reset this day to the starting plan</button>
  </form>`);
};
submits.saveDay = f => {
  const d = formData(f), day = dayPlan(S.planDay);
  day.title = String(d.title || '').trim() || day.title;
  day.type = TYPES[d.type] ? d.type : day.type;
  day.focus = String(d.focus || '').trim();
  savePlan(); closeSheet(); render(); toast('Day saved');
};
changes.copyDayFrom = async el => {
  const from = Number(el.value), to = S.planDay, fromDay = el.value !== '' && from !== to ? dayPlan(from) : null;
  if (!fromDay) return;
  if (!(await confirmBox(`Copy ${dayName(from)} to ${dayName(to)}?`, `${dayName(to)}'s exercises will be replaced with a copy of ${dayName(from)} (${fromDay.title}). Your workout history is kept.`, { ok: 'Copy' }))) return;
  const src = clone(fromDay);
  src.exercises.forEach(e => { e.id = uid(); });
  setDayPlan(to, src);
  savePlan(); render(); toast(`${dayName(from)} copied to ${dayName(to)}`);
};
actions.resetDay = async () => {
  const mode = S.settings.mode, di = S.planDay;
  if (!(await confirmBox('Reset this day?', `${dayName(di)} (${MODES[mode].label}) goes back to the starting exercises and videos. Your workout history is kept.`, { ok: 'Reset', danger: true }))) return;
  const fresh = buildPlan(program().plan);
  setDayPlan(di, di === LIGHT ? fresh.light[mode] : fresh[mode][di], mode);
  savePlan(); render(); toast('Day reset');
};

/* ============================== 8. DIET TAB ============================== */

let editMealId = null;

function dayTotals(date) {
  let cal = 0, pro = 0, carb = 0, fat = 0;
  for (const m of S.meals) if (m.date === date) { cal += m.cal || 0; pro += m.pro || 0; carb += m.carb || 0; fat += m.fat || 0; }
  return { cal: Math.round(cal), pro: Math.round(pro * 10) / 10, carb: Math.round(carb), fat: Math.round(fat) };
}

// Guess the meal from the time of day (built around your workout time).
function guessMeal(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  const [wh, wm] = S.settings.workoutTime.split(':').map(Number);
  const w = (Number.isFinite(wh) ? wh : 15) + (wm || 0) / 60;
  if (h >= w - 2 && h < w) return 'pre';
  if (h >= w && h < w + 2.5) return 'post';
  if (h < 10.5) return 'breakfast';
  if (h < 14.5) return 'lunch';
  if (h >= 17 && h < 21.5) return 'dinner';
  return 'snack';
}

const sortedFavs = () => [...S.foods].sort((a, b) => a.name.localeCompare(b.name));

function renderDiet() {
  return `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Nutrition</div><h1 class="page-title">Diet</h1></div></div>
    <div class="seg" role="group" aria-label="Day, week, meal ideas or pantry">
      ${[['day', 'Day'], ['week', 'Week'], ['meals', 'Meals'], ['pantry', 'Pantry']].map(([v, label]) =>
        `<button class="${S.dietView === v ? 'on' : ''}" data-action="dietView" data-v="${v}" aria-pressed="${S.dietView === v}">${label}</button>`).join('')}
    </div>
    ${S.dietView === 'week' ? dietWeek() : S.dietView === 'meals' ? dietMeals() : S.dietView === 'pantry' ? dietPantry() : dietDay()}
  </div>`;
}
actions.dietView = el => {
  S.dietView = el.dataset.v;
  if (S.dietView === 'week') S.dietWeek = ymd(weekStart(parseYmd(S.dietDate)));
  render();
};

function dietDay() {
  const date = S.dietDate, d = parseYmd(date), isToday = date === ymd();
  const meals = S.meals.filter(m => m.date === date).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const groups = MEALS.map(([k, label]) => {
    const list = meals.filter(m => (m.meal || 'snack') === k);
    if (!list.length) return '';
    return `<div class="meal-group">
      <div class="meal-group-head"><span>${label}</span><span class="row" style="gap:8px">${fmt(sum(list, m => m.cal))} cal · ${fmt(sum(list, m => m.pro), 1)} g
        <button class="add-mini" data-action="logFood" data-meal="${k}" aria-label="Add food to ${label}">${icon('plus', 'sm')}</button></span></div>
      ${list.map(mealRow).join('')}
    </div>`;
  }).join('');
  const favs = sortedFavs(), recent = recentFoods();
  const prevKey = ymd(addDays(d, -1)), prev = meals.length ? [] : S.meals.filter(m => m.date === prevKey);
  return `
    <div class="date-nav">
      <button class="btn btn-icon btn-ghost" data-action="dietStep" data-d="-1" aria-label="Previous day">${icon('left')}</button>
      <button class="label" data-action="dietToday">${isToday ? 'Today' : fmtDate(d, { weekday: 'long' })}<small>${fmtDate(d, { month: 'short', day: 'numeric', year: 'numeric' })}</small></button>
      <button class="btn btn-icon btn-ghost" data-action="dietStep" data-d="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
    </div>
    <section class="card">
      ${macroBlock(dayTotals(date))}
      <div class="spread" style="margin-top:14px">
        <span class="muted small">${S.settings.goalsSet ? 'Daily goals you set' : 'Tap Goals to set your own targets'}</span>
        <button class="btn btn-sm btn-ghost" data-action="editGoals">${icon('edit', 'sm')} Goals</button>
      </div>
    </section>
    ${waterCard(date)}
    <button class="btn btn-primary btn-xl" data-action="logFood">${icon('plus')} Log food</button>
    <div class="section-row">
      <div class="section-title">Favorites</div>
      <button class="btn-link" data-action="manageFavs">${favs.length ? 'Manage' : '+ Add'}</button>
    </div>
    ${favs.length ? `<div class="fav-row">${favs.map(favCard).join('')}</div>`
      : `<p class="hint" style="margin:0 4px">Save foods you eat often as favorites, then log them with one tap.</p>`}
    ${recent.length ? `<div class="section-title">Recent</div><div class="fav-row">${recent.map(recentCard).join('')}</div>` : ''}
    <div class="section-title">${isToday ? "Today's food" : 'Food log'}</div>
    ${groups || `<div class="empty">Nothing logged ${isToday ? 'yet today' : 'on this day'}.</div>`}
    ${prev.length ? `<button class="btn btn-ghost btn-block" data-action="copyDay" data-from="${prevKey}">${icon('copy', 'sm')} Copy ${fmtDate(parseYmd(prevKey), { weekday: 'long' })}'s food (${prev.length} item${prev.length === 1 ? '' : 's'})</button>` : ''}`;
}

// "1.5 × 1 cup", "2 servings" or nothing for a single plain serving
const servingText = m => (m.serving ? `${m.servings && m.servings !== 1 ? `${fmt(m.servings, 2)} × ` : ''}${m.serving}` : m.servings && m.servings !== 1 ? `${fmt(m.servings, 2)} servings` : '');
const macroText = m => [m.carb != null ? `${fmt(m.carb)} g carbs` : '', m.fat != null ? `${fmt(m.fat)} g fat` : ''].filter(Boolean).join(' · ');
const mealRow = m => `<button class="meal" data-action="editMeal" data-id="${m.id}">
  <div><div class="meal-name">${esc(m.name)}</div><div class="meal-sub">${[m.time ? clockTime(m.time) : '', esc(servingText(m)), macroText(m)].filter(Boolean).join(' · ')}</div></div>
  <div class="meal-nums">${fmt(m.cal)} cal<small>${fmt(m.pro, 1)} g protein</small></div>
</button>`;

const favCard = f => `<div class="fav">
  <div data-action="favOpen" data-id="${f.id}" role="button" tabindex="0">
    <div class="fav-name">${esc(f.name)}</div>
    <div class="fav-meta">${fmt(f.cal)} cal · ${fmt(f.pro, 1)} g</div>
  </div>
  <button class="btn btn-sm btn-primary" data-action="favLog" data-id="${f.id}" aria-label="Log ${esc(f.name)}">${icon('plus', 'sm')} Log</button>
</div>`;

// Foods you logged recently that aren't favorites — tap + to log the same thing again.
function recentFoods() {
  const seen = new Set(sortedFavs().map(f => normName(f.name))), out = [];
  for (const m of [...S.meals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
    const k = normName(m.name);
    if (seen.has(k)) continue;
    seen.add(k); out.push(m);
    if (out.length >= 8) break;
  }
  return out;
}
const recentCard = m => `<div class="fav">
  <div data-action="editMeal" data-id="${m.id}" role="button" tabindex="0" aria-label="See ${esc(m.name)}">
    <div class="fav-name">${esc(m.name)}</div>
    <div class="fav-meta">${fmt(m.cal)} cal · ${fmt(m.pro, 1)} g${servingText(m) ? ` · ${esc(servingText(m))}` : ''}</div>
  </div>
  <button class="btn btn-sm btn-ghost" data-action="relog" data-id="${m.id}" aria-label="Log ${esc(m.name)} again">${icon('plus', 'sm')} Log</button>
</div>`;
const copyMeal = (m, date) => ({ ...m, id: uid(), date, createdAt: Date.now() });
actions.relog = el => {
  const src = S.meals.find(x => x.id === el.dataset.id);
  if (!src) return;
  const m = { ...copyMeal(src, S.dietDate), time: nowHHMM(), meal: guessMeal() };
  S.meals.push(m);
  save(() => DB.put('meals', m));
  render();
  toast(`Logged ${m.name}`, { action: () => removeMeal(m.id) });
};
actions.copyDay = el => {
  const copies = S.meals.filter(m => m.date === el.dataset.from).map(m => copyMeal(m, S.dietDate));
  if (!copies.length) return;
  S.meals.push(...copies);
  save(() => DB.putMany('meals', copies));
  render();
  toast(`Copied ${copies.length} item${copies.length === 1 ? '' : 's'}`, { action: () => {
    const ids = new Set(copies.map(c => c.id));
    S.meals = S.meals.filter(m => !ids.has(m.id));
    copies.forEach(c => save(() => DB.remove('meals', c.id)));
    render();
  } });
};

actions.dietStep = el => {
  const d = ymd(addDays(parseYmd(S.dietDate), Number(el.dataset.d)));
  if (d > ymd()) return;
  S.dietDate = d;
  render();
};
actions.dietToday = () => { S.dietDate = ymd(); render(); };

// ----- Logging food -----
// Search as you type: your favorites first, then foods you've logged before, then the built-in list (foods.js).
const MACROS = ['cal', 'pro', 'carb', 'fat'];
const r1 = v => Math.max(0, Math.round((v || 0) * 10) / 10);
const perServing = m => {
  const s = m.servings > 0 ? m.servings : 1, per = v => (v == null ? null : v / s);
  return { name: m.name, serving: m.serving || '', cal: per(m.cal), pro: per(m.pro), carb: per(m.carb), fat: per(m.fat) };
};
let foodHits = [];
function searchFoods(q) {
  const words = normName(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const phrase = words.join(' ');
  const score = name => {
    const n = normName(name);
    if (!words.every(w => n.includes(w))) return 0;
    const parts = n.split(/[\s,()/-]+/);
    return (n.startsWith(phrase) ? 3 : 1) + (words.every(w => parts.some(p => p.startsWith(w))) ? 1 : 0);
  };
  const out = [], seen = new Set();
  const add = (f, src, bonus) => {
    const k = normName(f.name), sc = score(f.name);
    if (!sc || seen.has(k)) return;
    seen.add(k);
    out.push({ ...f, src, sc: sc + bonus });
  };
  sortedFavs().forEach(f => add(perServing(f), 'fav', 2));
  [...S.meals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 300).forEach(m => add(perServing(m), 'hist', 1));
  FOODS.forEach(f => add(f, 'db', 0));
  return out.sort((a, b) => b.sc - a.sc).slice(0, 8);
}
function foodResults(q) {
  foodHits = searchFoods(q);
  return foodHits.map((f, i) => `<button type="button" class="food-hit" data-action="pickFood" data-i="${i}">
    <span class="grow"><span class="food-hit-name">${f.src === 'fav' ? icon('star', 'sm') : ''}${esc(f.name)}</span>
      <span class="food-hit-sub">${esc(f.serving || (f.src === 'db' ? '1 serving' : 'as you logged it'))}${f.src === 'hist' ? ' · recent' : f.group ? ` · ${esc(f.group)}` : ''}</span></span>
    <span class="meal-nums">${fmt(f.cal)} cal<small>${fmt(f.pro, 1)} g protein</small></span>
  </button>`).join('');
}

// The numbers in the form are totals for what you ate; "base" remembers them per ONE serving,
// so changing Servings rescales everything.
const formBase = f => JSON.parse(f.dataset.base || '{}');
function fillMacros(f, base, servings) {
  for (const k of MACROS) {
    const v = base[k];
    f.elements[k].value = v == null ? '' : k === 'cal' ? Math.round(v * servings) : Math.round(v * servings * 10) / 10;
  }
  f.dataset.base = JSON.stringify(base);
  f.dataset.auto = JSON.stringify({ cal: f.elements.cal.value, pro: f.elements.pro.value });
}
function setServingLabel(f, serving) {
  f.elements.serving.value = serving || '';
  const note = $('.serving-note', f);
  if (note) note.textContent = serving ? `1 serving = ${serving}` : '';
}

function openFoodSheet(meal = null, slot = null) {
  editMealId = meal ? meal.id : null;
  const m = meal || { name: '', cal: '', pro: '', carb: null, fat: null, servings: 1, serving: '', meal: MEAL_LABEL[slot] ? slot : guessMeal(), time: nowHHMM() };
  const isFav = !!meal && S.foods.some(f => normName(f.name) === normName(meal.name));
  const base = meal ? perServing(meal) : {};
  const numField = (k, label, v) => `<label class="field"><span>${label}</span><input name="${k}" inputmode="decimal" value="${v == null ? '' : esc(v)}" placeholder="${k === 'carb' || k === 'fat' ? 'optional' : '0'}" autocomplete="off" data-input="foodNum"></label>`;
  openSheet(meal ? 'Edit food' : 'Log food', `<form class="form" novalidate data-submit="saveMeal" data-base="${esc(JSON.stringify(base))}" data-picked="${esc(normName(m.name))}">
    <label class="field"><span>Food</span>
      <input name="name" value="${esc(m.name)}" placeholder="Search foods or type your own" maxlength="80" required autocomplete="off" autocorrect="off" data-input="foodName"></label>
    <div class="food-results"></div>
    <input type="hidden" name="serving" value="${esc(m.serving || '')}">
    <div class="field"><span>Servings <small class="serving-note">${m.serving ? `1 serving = ${esc(m.serving)}` : ''}</small></span>
      ${stepper('servings', m.servings || 1, 0.5, { min: 0.5, max: 20, mode: 'decimal', input: 'foodServings' })}</div>
    <div class="form-grid">
      ${numField('cal', 'Calories', m.cal)}${numField('pro', 'Protein (g)', m.pro)}
      ${numField('carb', 'Carbs (g)', m.carb)}${numField('fat', 'Fat (g)', m.fat)}
    </div>
    <div class="form-grid">
      <label class="field"><span>Meal</span><select name="meal">${MEALS.map(([k, v]) => `<option value="${k}" ${m.meal === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Time</span><input name="time" type="time" value="${esc(m.time || '')}"></label>
    </div>
    ${meal ? '' : `<label class="check-line"><input type="checkbox" name="fav" value="1"> Also save as a favorite</label>`}
    <button class="btn btn-primary btn-block" type="submit">${meal ? 'Save changes' : 'Log it'}</button>
    ${meal ? `<div class="grid2">
      <button type="button" class="btn btn-ghost" data-action="mealToFav" ${isFav ? 'disabled' : ''}>${icon('star', 'sm')} ${isFav ? 'In favorites' : 'Favorite'}</button>
      <button type="button" class="btn btn-danger" data-action="deleteMeal">${icon('trash', 'sm')} Delete</button>
    </div>` : ''}
  </form>`);
}
actions.logFood = el => openFoodSheet(null, el && el.dataset.meal);
actions.editMeal = el => { const m = S.meals.find(x => x.id === el.dataset.id); if (m) openFoodSheet(m); };

// Typing: show matching foods. An exact match with a favorite or something you logged before fills in
// its numbers; if you keep typing and it stops matching, those filled-in numbers are cleared again
// (numbers you typed yourself always stay).
inputs.foodName = el => {
  const f = el.form, key = normName(el.value);
  $('.food-results', f).innerHTML = foodResults(el.value);
  if (f.elements.serving.value && f.dataset.picked !== key) setServingLabel(f, '');
  const auto = f.dataset.auto ? JSON.parse(f.dataset.auto) : null;
  const untouched = !!auto && f.elements.cal.value === auto.cal && f.elements.pro.value === auto.pro;
  if (f.elements.cal.value && !untouched) return;
  const hit = key && (S.foods.find(x => normName(x.name) === key)
    || [...S.meals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(x => normName(x.name) === key));
  if (hit) { fillMacros(f, perServing(hit), num(f.elements.servings.value) || 1); f.dataset.picked = key; setServingLabel(f, hit.serving); return; }
  if (untouched) { for (const k of MACROS) f.elements[k].value = ''; f.dataset.base = '{}'; delete f.dataset.auto; }
};
actions.pickFood = el => {
  const f = el.closest('form'), food = foodHits[+el.dataset.i];
  if (!f || !food) return;
  f.elements.name.value = food.name;
  f.dataset.picked = normName(food.name);
  setServingLabel(f, food.serving);
  fillMacros(f, { cal: food.cal, pro: food.pro, carb: food.carb ?? null, fat: food.fat ?? null }, num(f.elements.servings.value) || 1);
  $('.food-results', f).innerHTML = '';
};
inputs.foodServings = el => {
  const f = el.form, s = num(el.value), base = formBase(f);
  if (s > 0 && MACROS.some(k => base[k] != null)) fillMacros(f, base, s);
};
inputs.foodNum = el => {
  const f = el.form, s = num(f.elements.servings.value) || 1, v = num(el.value), base = formBase(f);
  base[el.name] = v == null ? null : v / s;
  f.dataset.base = JSON.stringify(base);
};

submits.saveMeal = f => {
  const d = formData(f);
  const typed = String(d.name || '').trim();
  const fav = S.foods.find(x => normName(x.name) === normName(typed));
  const name = fav ? fav.name : typed;
  const [cal, pro, carb, fat] = MACROS.map(k => num(d[k]));
  if (!name) { toast('Type what you ate'); return; }
  if (cal == null && pro == null) { toast('Enter the calories and/or protein'); return; }
  const servings = clamp(num(d.servings) || 1, 0.1, 50);
  const entry = {
    name, servings, serving: String(d.serving || '').trim(),
    cal: Math.max(0, Math.round(cal || 0)), pro: r1(pro),
    carb: carb == null ? null : r1(carb), fat: fat == null ? null : r1(fat),
    meal: MEAL_LABEL[d.meal] ? d.meal : guessMeal(),
    time: d.time || nowHHMM()
  };
  const editing = !!editMealId;
  let m;
  if (editing) {
    m = S.meals.find(x => x.id === editMealId);
    if (!m) { closeSheet(); return; }
    Object.assign(m, entry);
  } else {
    m = { id: uid(), date: S.dietDate, createdAt: Date.now(), ...entry };
    S.meals.push(m);
    if (d.fav) addFavorite(perServing(m));
  }
  save(() => DB.put('meals', m));
  closeSheet(); render();
  toast(editing ? 'Saved' : `Logged ${name}`);
};

function removeMeal(id) {
  S.meals = S.meals.filter(x => x.id !== id);
  save(() => DB.remove('meals', id));
  render();
}
actions.deleteMeal = () => {
  const m = S.meals.find(x => x.id === editMealId);
  if (!m) return;
  closeSheet();
  removeMeal(m.id);
  toast(`Deleted ${m.name}`, { action: () => { S.meals.push(m); save(() => DB.put('meals', m)); render(); } });
};
actions.mealToFav = () => {
  const m = S.meals.find(x => x.id === editMealId);
  if (!m) return;
  addFavorite(perServing(m));
  closeSheet(); render(); toast(`${m.name} added to favorites`);
};

// ----- Favorites -----
// Favorites store numbers for ONE serving (carbs, fat and the serving size are optional).
function addFavorite({ name, serving = '', cal, pro, carb = null, fat = null }) {
  const data = { cal: Math.round(cal || 0), pro: r1(pro), carb: carb == null ? null : r1(carb), fat: fat == null ? null : r1(fat), serving: serving || '' };
  const existing = S.foods.find(f => normName(f.name) === normName(name));
  if (existing) { Object.assign(existing, data); save(() => DB.put('foods', existing)); return existing; }
  const f = { id: uid(), name, ...data, uses: 0, createdAt: Date.now() };
  S.foods.push(f);
  save(() => DB.put('foods', f));
  return f;
}

function logFavorite(f, servings) {
  const m = {
    id: uid(), date: S.dietDate, time: nowHHMM(), meal: guessMeal(), name: f.name, servings, serving: f.serving || '',
    cal: Math.round(f.cal * servings), pro: r1(f.pro * servings),
    carb: f.carb == null ? null : r1(f.carb * servings), fat: f.fat == null ? null : r1(f.fat * servings), createdAt: Date.now()
  };
  S.meals.push(m);
  f.uses = (f.uses || 0) + 1;
  f.lastUsed = Date.now();
  save(() => DB.put('meals', m));
  save(() => DB.put('foods', f));
  return m;
}
actions.favLog = el => {
  const f = S.foods.find(x => x.id === el.dataset.id);
  if (!f) return;
  const m = logFavorite(f, 1);
  render();
  toast(`Logged ${f.name}`, { action: () => removeMeal(m.id) });
};
actions.favOpen = el => {
  const f = S.foods.find(x => x.id === el.dataset.id);
  if (!f) return;
  openSheet(f.name, `<form class="form" novalidate data-submit="favLogServings" data-id="${f.id}">
    <p class="text-2">${[`${fmt(f.cal)} cal`, `${fmt(f.pro, 1)} g protein`, macroText(f)].filter(Boolean).join(' · ')} per serving${f.serving ? ` (${esc(f.serving)})` : ''}</p>
    <div class="field"><span>Servings</span>${stepper('servings', 1, 0.5, { min: 0.5, max: 20, mode: 'decimal' })}</div>
    <button class="btn btn-primary btn-block" type="submit">${icon('plus', 'sm')} Log it</button>
    <div class="grid2">
      <button type="button" class="btn btn-ghost" data-action="editFav" data-id="${f.id}">${icon('edit', 'sm')} Edit</button>
      <button type="button" class="btn btn-danger" data-action="deleteFav" data-id="${f.id}">${icon('trash', 'sm')} Remove</button>
    </div>
  </form>`);
};
submits.favLogServings = f => {
  const fav = S.foods.find(x => x.id === f.dataset.id);
  if (!fav) { closeSheet(); return; }
  const servings = clamp(num(formData(f).servings) || 1, 0.25, 20);
  const m = logFavorite(fav, servings);
  closeSheet(); render();
  toast(`Logged ${fav.name}`, { action: () => removeMeal(m.id) });
};

function favForm(f) {
  return `<form class="form" novalidate data-submit="saveFav" data-id="${f ? f.id : ''}">
    <label class="field"><span>Food name</span><input name="name" value="${esc(f ? f.name : '')}" maxlength="80" required autocomplete="off" placeholder="e.g. Protein shake"></label>
    <label class="field"><span>Serving size <small>optional</small></span><input name="serving" value="${esc(f ? f.serving || '' : '')}" maxlength="40" autocomplete="off" placeholder="e.g. 1 bottle, 1 cup, 6 oz"></label>
    <div class="form-grid">
      ${[['cal', 'Calories'], ['pro', 'Protein (g)'], ['carb', 'Carbs (g)'], ['fat', 'Fat (g)']].map(([k, label]) =>
        `<label class="field"><span>${label}</span><input name="${k}" inputmode="decimal" value="${f && f[k] != null ? esc(f[k]) : ''}" placeholder="${k === 'carb' || k === 'fat' ? 'optional' : '0'}" autocomplete="off"></label>`).join('')}
    </div>
    <p class="hint">Numbers are for one serving.</p>
    <button class="btn btn-primary btn-block" type="submit">${f ? 'Save favorite' : 'Add favorite'}</button>
    ${f ? `<button class="btn btn-danger btn-block" type="button" data-action="deleteFav" data-id="${f.id}">${icon('trash', 'sm')} Remove favorite</button>` : ''}
  </form>`;
}
actions.editFav = el => { const f = S.foods.find(x => x.id === el.dataset.id); if (f) openSheet('Edit favorite', favForm(f)); };
actions.newFav = () => openSheet('New favorite', favForm(null));
submits.saveFav = f => {
  const d = formData(f), name = String(d.name || '').trim();
  if (!name) { toast('Enter a name'); return; }
  const [carb, fat] = [num(d.carb), num(d.fat)];
  const data = { name, serving: String(d.serving || '').trim(), cal: Math.max(0, Math.round(num(d.cal) || 0)), pro: r1(num(d.pro)),
    carb: carb == null ? null : r1(carb), fat: fat == null ? null : r1(fat) };
  const existing = f.dataset.id ? S.foods.find(x => x.id === f.dataset.id) : null;
  if (existing) { Object.assign(existing, data); save(() => DB.put('foods', existing)); }
  else addFavorite(data);
  closeSheet(); render(); toast('Favorite saved');
};
actions.deleteFav = async el => {
  const f = S.foods.find(x => x.id === el.dataset.id);
  if (!f) return;
  if (!(await confirmBox('Remove favorite?', `"${f.name}" will be removed from favorites. Your food log stays the same.`, { ok: 'Remove', danger: true }))) return;
  S.foods = S.foods.filter(x => x.id !== f.id);
  save(() => DB.remove('foods', f.id));
  render(); toast('Favorite removed');
};
actions.manageFavs = () => {
  const favs = sortedFavs();
  openSheet('Favorite foods', `<div class="stack">
    ${favs.map(f => `<button class="meal" data-action="editFav" data-id="${f.id}">
      <div><div class="meal-name">${esc(f.name)}</div><div class="meal-sub">${f.serving ? esc(f.serving) : 'per serving'} · tap to edit</div></div>
      <div class="meal-nums">${fmt(f.cal)} cal<small>${fmt(f.pro, 1)} g protein</small></div></button>`).join('') || '<p class="hint">No favorites yet.</p>'}
    <button class="btn btn-primary btn-block" data-action="newFav">${icon('plus', 'sm')} New favorite</button>
  </div>`);
};

// Water is stored in ounces; metric shows liters.
const metricWater = () => S.settings.unit === 'kg';
const waterText = oz => (metricWater() ? `${fmt(oz * 0.0295735, 1)} L` : `${fmt(oz)} oz`);
const waterInput = oz => (metricWater() ? Math.round(oz * 0.0295735 * 10) / 10 : Math.round(oz));

// ----- Water (one "water" log per day, in ounces) -----
const waterOf = date => { const l = S.logs.find(x => x.kind === 'water' && x.date === date); return l ? l.oz : 0; };
function waterCard(date = ymd()) {
  const oz = waterOf(date), goal = S.settings.waterGoal, pct = clamp((oz / goal) * 100, 0, 100);
  const adds = metricWater() ? [[8.45, '+250 ml'], [16.9, '+500 ml'], [25.36, '+750 ml']] : [[8, '+8 oz'], [16, '+16 oz'], [20, '+20 oz']];
  return `<section class="card water-card">
    <div class="macro-top">
      <span class="macro-name"><i class="key water"></i>Water</span>
      <span class="macro-left">${oz >= goal ? 'Goal hit' : `${waterText(goal - oz)} to go`}</span>
    </div>
    <div class="spread"><div class="macro-val">${waterText(oz)} <small>/ ${waterText(goal)}</small></div>
      <button class="btn-link" data-action="sweatTest">Sweat test</button></div>
    <div class="meter water" role="progressbar" aria-label="Water" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>
    <div class="water-btns">
      ${adds.map(([v, l]) => `<button class="btn btn-sm btn-ghost" data-action="addWater" data-oz="${v}" data-date="${date}">${icon('drop', 'sm')} ${l}</button>`).join('')}
      <button class="btn btn-sm btn-ghost btn-icon sm" data-action="addWater" data-oz="${-adds[0][0]}" data-date="${date}" aria-label="Take some off" ${oz <= 0 ? 'disabled' : ''}>${icon('minus', 'sm')}</button>
    </div>
  </section>`;
}
// ----- Sweat test: weigh in before and after practice to learn how much to drink -----
actions.sweatTest = () => {
  const kg = metricWater(), u = S.settings.unit;
  openSheet('Sweat test', `<form class="form" novalidate data-submit="sweatTest">
    <p class="text-2 small">Weigh yourself right before and right after a practice — same clothes, towel off first. The difference is mostly sweat, so you'll know how much to drink next time.</p>
    <div class="form-grid">
      <label class="field"><span>Weight before (${u})</span><input name="before" inputmode="decimal" autocomplete="off"></label>
      <label class="field"><span>Weight after (${u})</span><input name="after" inputmode="decimal" autocomplete="off"></label>
      <label class="field"><span>Drank during (${kg ? 'ml' : 'oz'})</span><input name="drank" inputmode="decimal" autocomplete="off" placeholder="0"></label>
      <label class="field"><span>Practice (minutes)</span><input name="min" inputmode="numeric" autocomplete="off" placeholder="90"></label>
    </div>
    <div class="sweat-out stack-sm"></div>
    <button class="btn btn-primary btn-block" type="submit">Calculate</button>
  </form>`);
};
submits.sweatTest = f => {
  const d = formData(f), kg = metricWater(), before = num(d.before), after = num(d.after), drank = num(d.drank) || 0, min = num(d.min);
  if (!(before > 0 && after > 0 && min >= 10)) { toast('Fill in both weights and how long you practiced'); return; }
  if (after > before + (kg ? 1 : 2)) { toast('The after weight looks higher than before — check the numbers'); return; }
  const lost = Math.max(0, before - after);                                   // in lb or kg
  const lostOz = kg ? (lost * 1000 + drank) / 29.5735 : lost * 16 + drank;   // 1 lb of sweat ≈ 16 oz; 1 kg ≈ 1 liter
  const perHour = lostOz / (min / 60), per15 = Math.min(perHour, 34) / 4, pct = (lost / before) * 100;
  const catchUp = kg ? (lost * 1500) / 29.5735 : lost * 20;                   // drink ~150% of what you lost, over a few hours
  $('.sweat-out', f).innerHTML = `
    <div class="tiles two">
      <div class="tile"><div class="tile-label">Sweat rate</div><div class="tile-value">${waterText(perHour)}<small> / hour</small></div></div>
      <div class="tile"><div class="tile-label">Body weight lost</div><div class="tile-value">${fmt(pct, 1)}<small>%</small></div></div>
    </div>
    <p class="small text-2">Next practice, drink about <b>${waterText(per15)} every 15 minutes</b>. Add a sports drink when it's hot or you practice longer than an hour.</p>
    ${catchUp ? `<p class="small text-2">To catch up now, drink about <b>${waterText(catchUp)}</b> over the next 2–3 hours.</p>` : ''}
    ${pct >= 2 ? `<div class="banner warn">${icon('info')}<div>Losing 2% or more of your body weight in sweat is enough to slow you down. Drink more during practice next time.</div></div>` : ''}`;
};

actions.addWater = el => {
  const date = el.dataset.date || ymd(), cur = S.logs.find(x => x.kind === 'water' && x.date === date);
  const before = cur ? cur.oz : 0, oz = Math.max(0, Math.round((before + (num(el.dataset.oz) || 0)) * 10) / 10);
  putLog({ id: cur ? cur.id : 'water-' + date, kind: 'water', date, oz, at: Date.now() });
  render();
  if (before < S.settings.waterGoal && oz >= S.settings.waterGoal) toast('Water goal hit — nice work');
};

actions.editGoals = () => openSheet('Daily goals', `<form class="form" novalidate data-submit="saveGoals">
  <button type="button" class="btn btn-ghost btn-block" data-action="calcGoals">${icon('flame', 'sm')} Calculate them for me</button>
  <div class="form-grid">
    <label class="field"><span>Calories</span><input name="cal" inputmode="numeric" value="${S.settings.calGoal}" autocomplete="off"></label>
    <label class="field"><span>Protein (g)</span><input name="pro" inputmode="numeric" value="${S.settings.proteinGoal}" autocomplete="off"></label>
    <label class="field"><span>Carbs (g)</span><input name="carb" inputmode="numeric" value="${S.settings.carbGoal || ''}" placeholder="optional" autocomplete="off"></label>
    <label class="field"><span>Fat (g)</span><input name="fat" inputmode="numeric" value="${S.settings.fatGoal || ''}" placeholder="optional" autocomplete="off"></label>
  </div>
  <label class="field"><span>Water per day (${metricWater() ? 'liters' : 'oz'})</span><input name="water" inputmode="decimal" value="${waterInput(S.settings.waterGoal)}" autocomplete="off"></label>
  <p class="hint">Use the numbers that fit you — the calculator, a coach or a dietitian can help you pick them.</p>
  <button class="btn btn-primary btn-block" type="submit">Save goals</button>
</form>`);
submits.saveGoals = f => {
  const d = formData(f);
  const cal = Math.round(num(d.cal) || 0), pro = Math.round(num(d.pro) || 0);
  const carb = Math.round(num(d.carb) || 0), fat = Math.round(num(d.fat) || 0);
  const water = Math.round(metricWater() ? (num(d.water) || 0) / 0.0295735 : num(d.water) || 0);
  if (cal < 500 || cal > 10000) { toast('Calories should be between 500 and 10,000'); return; }
  if (pro < 10 || pro > 500) { toast('Protein should be between 10 and 500 g'); return; }
  if (carb < 0 || carb > 1500 || fat < 0 || fat > 500) { toast('Carbs up to 1,500 g and fat up to 500 g'); return; }
  if (water < 16 || water > 400) { toast(metricWater() ? 'Water should be 0.5 to 12 liters' : 'Water should be 16 to 400 oz'); return; }
  Object.assign(S.settings, { calGoal: cal, proteinGoal: pro, carbGoal: carb, fatGoal: fat, waterGoal: water, goalsSet: true });
  saveSettings(); closeSheet(); render(); toast('Goals saved');
};

// ----- Goal calculator -----
// Mifflin-St Jeor resting burn × how much you train, then +/− for your goal. Protein ≈ 0.8–0.9 g per lb
// (1.8–2 g per kg), fat ≈ 27% of calories, carbs fill the rest. Water ≈ half your body weight in oz + 20 oz.
const ACTIVITY = [[1.55, 'Light', '2–3 workouts a week, or in-season'], [1.725, 'Active', 'Training 4–6 days a week'], [1.9, 'Very active', 'Practice plus lifting most days']];
const GOALS = { gain: ['Build muscle / gain weight', 400], maintain: ['Stay the same', 0], lose: ['Lose fat', -400] };
const LB = 0.45359237;
const latestWeight = () => { const w = logsOf('weight'); return w.length ? w[w.length - 1].w : null; };

function calcTargets(p, metric) {
  const kg = metric ? p.weight : p.weight * LB, lb = kg / LB;
  const cm = metric ? p.cm : (p.ft * 12 + p.inch) * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'female' ? -161 : 5);
  const maintain = bmr * p.activity;
  const adjust = p.goal === 'lose' && p.age < 18 ? -250 : GOALS[p.goal][1];   // growing athletes: gentler cut
  const r5 = v => Math.round(v / 5) * 5;
  const cal = Math.round((maintain + adjust) / 50) * 50;
  const pro = r5(lb * (p.goal === 'maintain' ? 0.8 : 0.9));
  const fat = r5((cal * 0.27) / 9);
  const carb = Math.max(0, r5((cal - pro * 4 - fat * 9) / 4));
  const water = Math.round((lb / 2 + 20) / 4) * 4;
  return { bmr: Math.round(bmr), maintain: Math.round(maintain), adjust, cal, pro, carb, fat, water };
}

actions.calcGoals = () => {
  const metric = S.settings.unit === 'kg';
  const p = { sex: 'male', age: 17, ft: 5, inch: 10, cm: 178, activity: 1.725, goal: 'gain', ...(S.settings.profile || {}) };
  const weight = latestWeight() ?? p.weight ?? '';
  const sel = (name, opts, cur) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  openSheet('Calculate my goals', `<form class="form" novalidate data-submit="calcGoals">
    <p class="text-2 small">Estimates how much you should eat each day from your size, age and training. Redo it every month or so as your weight changes.</p>
    <div class="form-grid">
      <label class="field"><span>Sex</span>${sel('sex', [['male', 'Male'], ['female', 'Female']], p.sex)}</label>
      <label class="field"><span>Age</span><input name="age" inputmode="numeric" value="${esc(p.age)}" autocomplete="off"></label>
    </div>
    ${metric ? `<label class="field"><span>Height (cm)</span><input name="cm" inputmode="numeric" value="${esc(p.cm)}" autocomplete="off"></label>`
      : `<div class="form-grid">
      <label class="field"><span>Height (feet)</span><input name="ft" inputmode="numeric" value="${esc(p.ft)}" autocomplete="off"></label>
      <label class="field"><span>+ inches</span><input name="inch" inputmode="numeric" value="${esc(p.inch)}" autocomplete="off"></label></div>`}
    <label class="field"><span>Body weight (${S.settings.unit})</span><input name="weight" inputmode="decimal" value="${esc(weight)}" placeholder="e.g. ${metric ? 75 : 170}" autocomplete="off"></label>
    <label class="field"><span>Training</span>${sel('activity', ACTIVITY.map(([v, l, h]) => [v, `${l} — ${h}`]), p.activity)}</label>
    <label class="field"><span>Goal</span>${sel('goal', Object.entries(GOALS).map(([k, [l]]) => [k, l]), p.goal)}</label>
    <button class="btn btn-primary btn-block" type="submit">Calculate</button>
  </form>`);
};

let calcResult = null;
submits.calcGoals = f => {
  const d = formData(f), metric = S.settings.unit === 'kg';
  const p = {
    sex: d.sex === 'female' ? 'female' : 'male', age: num(d.age), weight: num(d.weight), cm: num(d.cm), ft: num(d.ft), inch: num(d.inch) ?? 0,
    activity: ACTIVITY.some(a => a[0] === num(d.activity)) ? num(d.activity) : 1.725, goal: GOALS[d.goal] ? d.goal : 'maintain'
  };
  const inches = metric ? p.cm / 2.54 : p.ft * 12 + p.inch, lb = metric ? p.weight / LB : p.weight;
  if (!(p.age >= 10 && p.age <= 80)) { toast('Enter an age from 10 to 80'); return; }
  if (!(inches >= 48 && inches <= 90)) { toast(metric ? 'Enter your height in cm (120–230)' : 'Enter your height in feet and inches'); return; }
  if (!(lb >= 60 && lb <= 400)) { toast(`Enter your body weight in ${S.settings.unit}`); return; }
  const t = calcTargets(p, metric);
  calcResult = { p, t };
  const tile = (label, v, u) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${fmt(v)}${u ? `<small> ${u}</small>` : ''}</div></div>`;
  openSheet('Your daily targets', `
    <div class="tiles four">${tile('Calories', t.cal)}${tile('Protein', t.pro, 'g')}${tile('Carbs', t.carb, 'g')}${tile('Fat', t.fat, 'g')}</div>
    <div class="card stack-sm">
      <div class="small text-2">Your body burns about <b>${fmt(t.bmr)}</b> calories a day at rest. With your training that's about <b>${fmt(t.maintain)}</b> to stay the same weight${t.adjust ? `, ${t.adjust > 0 ? 'plus' : 'minus'} <b>${fmt(Math.abs(t.adjust))}</b> to ${t.adjust > 0 ? 'build muscle' : 'lose fat slowly'}` : ''}.</div>
      <div class="small text-2">Water: about <b>${waterText(t.water)}</b> a day, more on hot days and doubleheaders.</div>
      ${p.age < 18 ? '<div class="small text-2">You\'re still growing, so under-eating costs you size, speed and strength. If your weight stalls for 2–3 weeks while trying to gain, add 250 calories.</div>' : ''}
    </div>
    <p class="hint">Estimates for healthy athletes — a doctor or sports dietitian can fine-tune them.</p>
    <div class="sheet-actions">
      <button class="btn btn-ghost" data-action="calcGoals">Back</button>
      <button class="btn btn-primary" data-action="useGoals">Use these goals</button>
    </div>`);
};
actions.useGoals = () => {
  if (!calcResult) return;
  const { p, t } = calcResult;
  Object.assign(S.settings, { calGoal: t.cal, proteinGoal: t.pro, carbGoal: t.carb, fatGoal: t.fat, waterGoal: t.water, goalsSet: true, profile: p });
  saveSettings();
  if (latestWeight() !== p.weight) putLog({ id: uid(), kind: 'weight', date: ymd(), w: p.weight, at: Date.now() });
  calcResult = null;
  closeSheet(); render(); toast('Goals updated');
};

// ----- Week totals -----
function dietWeek() {
  const start = parseYmd(S.dietWeek), end = addDays(start, 6), todayKey = ymd();
  const { calGoal, proteinGoal } = S.settings;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i), key = ymd(d);
    return { d, key, label: DAYS_SHORT[i], future: key > todayKey, ...dayTotals(key) };
  });
  const logged = days.filter(x => x.cal > 0 || x.pro > 0);
  const totCal = sum(days, x => x.cal), totPro = sum(days, x => x.pro);
  const avgCal = logged.length ? totCal / logged.length : 0, avgPro = logged.length ? totPro / logged.length : 0;
  const totCarb = sum(days, x => x.carb), totFat = sum(days, x => x.fat);
  const calHits = days.filter(x => x.cal >= calGoal).length, proHits = days.filter(x => x.pro >= proteinGoal).length;
  const thisWeek = S.dietWeek === ymd(weekStart());
  later(() => {
    barChart('#chart-cal', days.map(x => ({ label: x.label, full: fmtDate(x.d), v: x.cal })), { goal: calGoal, cls: 'cal', unit: 'cal' });
    barChart('#chart-pro', days.map(x => ({ label: x.label, full: fmtDate(x.d), v: x.pro })), { goal: proteinGoal, cls: 'pro', unit: 'g' });
  });
  const cell = (v, goal, text, future) => future ? '<td></td>' : `<td class="${v >= goal ? 'hit' : ''}">${text}${v >= goal ? ' ✓' : ''}</td>`;
  return `
    <div class="date-nav">
      <button class="btn btn-icon btn-ghost" data-action="dietWeekStep" data-d="-7" aria-label="Previous week">${icon('left')}</button>
      <button class="label" data-action="dietThisWeek">${fmtDate(start, { month: 'short', day: 'numeric' })} – ${fmtDate(end, { month: 'short', day: 'numeric' })}<small>${thisWeek ? 'This week' : start.getFullYear()}</small></button>
      <button class="btn btn-icon btn-ghost" data-action="dietWeekStep" data-d="7" aria-label="Next week" ${thisWeek ? 'disabled' : ''}>${icon('right')}</button>
    </div>
    <div class="tiles">
      <div class="tile"><div class="tile-label">Week calories</div><div class="tile-value">${fmtK(totCal)}</div></div>
      <div class="tile"><div class="tile-label">Week protein</div><div class="tile-value">${fmtK(Math.round(totPro))}<small> g</small></div></div>
      <div class="tile"><div class="tile-label">Days logged</div><div class="tile-value">${logged.length}<small> / 7</small></div></div>
    </div>
    <div class="tiles two">
      <div class="tile"><div class="tile-label">Average calories / day</div><div class="tile-value">${fmt(avgCal)}</div></div>
      <div class="tile"><div class="tile-label">Average protein / day</div><div class="tile-value">${fmt(avgPro)}<small> g</small></div></div>
    </div>
    ${totCarb || totFat ? `<div class="tiles two">
      <div class="tile"><div class="tile-label">Average carbs / day</div><div class="tile-value">${fmt(totCarb / logged.length)}<small> g</small></div></div>
      <div class="tile"><div class="tile-label">Average fat / day</div><div class="tile-value">${fmt(totFat / logged.length)}<small> g</small></div></div>
    </div>` : ''}
    <section class="card">
      <div class="spread"><div class="card-title">Calories</div><span class="muted small bold">Goal hit ${calHits} of 7 days</span></div>
      <div class="chart" id="chart-cal"></div>
    </section>
    <section class="card">
      <div class="spread"><div class="card-title">Protein</div><span class="muted small bold">Goal hit ${proHits} of 7 days</span></div>
      <div class="chart" id="chart-pro"></div>
    </section>
    <section class="card">
      <table class="table">
        <thead><tr><th>Day</th><th>Calories</th><th>Protein</th><th>Water</th></tr></thead>
        <tbody>
          ${days.map(x => `<tr class="${x.key === todayKey ? 'today' : ''}" data-action="dietOpenDay" data-date="${x.key}">
            <td>${fmtDate(x.d, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
            ${cell(x.cal, calGoal, fmt(x.cal), x.future)}${cell(x.pro, proteinGoal, fmt(x.pro, 1) + ' g', x.future)}${cell(waterOf(x.key), S.settings.waterGoal, waterOf(x.key) ? waterText(waterOf(x.key)) : '–', x.future)}</tr>`).join('')}
          <tr><td class="bold">Total</td><td class="bold">${fmt(totCal)}</td><td class="bold">${fmt(totPro, 1)} g</td><td class="bold">${waterText(sum(days, x => waterOf(x.key)))}</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top:10px">✓ = daily goal reached · water goal hit ${days.filter(x => waterOf(x.key) >= S.settings.waterGoal).length} of 7 days. Tap a day to see what you ate.</p>
    </section>`;
}
actions.dietWeekStep = el => {
  const d = ymd(addDays(parseYmd(S.dietWeek), Number(el.dataset.d)));
  if (d > ymd()) return;
  S.dietWeek = d;
  render();
};
actions.dietThisWeek = () => { S.dietWeek = ymd(weekStart()); render(); };
actions.dietOpenDay = el => {
  const k = el.dataset.date;
  if (k > ymd()) return;
  S.dietDate = k; S.dietView = 'day';
  render({ keepScroll: false });
};

// ----- Meal plan + recipes (Meals view). Recipes and tips live in meals.js -----
const PLAN_KINDS = [['training', 'Training'], ['rest', 'Rest day'], ['game', 'Game day']];
const KIND_SLOTS = {
  training: ['breakfast', 'lunch', 'pre', 'post', 'dinner', 'snack'],
  rest: ['breakfast', 'lunch', 'dinner', 'snack'],
  game: ['breakfast', 'lunch', 'pre', 'post', 'dinner', 'snack']
};
const slotName = (slot, kind) => (kind === 'game' && slot === 'pre' ? 'Pre-game' : kind === 'game' && slot === 'post' ? 'Post-game' : MEAL_LABEL[slot]);
const slotHint = (slot, kind) => ({ pre: kind === 'game' ? '30–60 min before' : '1–2 h before', post: 'within 1 h after' })[slot] || '';
const KIND_NOTE = {
  training: 'Carbs before you train, protein + carbs after.',
  rest: 'Same protein, no pre/post-workout snacks — your muscles rebuild today.',
  game: 'Full meal 3–4 hours before first pitch, a small carb snack 30–60 minutes before, recovery food after.'
};
const GROW_ORDER = ['dinner', 'lunch', 'breakfast', 'post', 'snack', 'pre'];   // which meals get bigger first
const hashStr = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// Today's plan choices. Each day starts fresh: training or rest comes from today's workout in the Plan tab.
function mealPlanToday() {
  const mp = S.settings.mealPlan;
  if (isObj(mp) && mp.date === ymd() && KIND_SLOTS[mp.kind] && Number.isFinite(mp.seed)) return { ...mp, swaps: isObj(mp.swaps) ? mp.swaps : {} };
  return { date: ymd(), kind: dayPlan(dayIdx()).type === 'rest' ? 'rest' : 'training', seed: 0, swaps: {} };
}
const saveMealPlan = mp => { S.settings.mealPlan = mp; saveSettings(); };

// Recipes for one meal. On game day, breakfast, lunch and the pre-game snack stick to game-day-friendly food.
function slotChoices(slot, kind) {
  const all = RECIPES.filter(r => r.meals.includes(slot));
  const game = kind === 'game' && ['breakfast', 'lunch', 'pre'].includes(slot) ? all.filter(r => r.tags.includes('game')) : [];
  return game.length ? game : all;
}

// One recipe per meal (no repeats), then servings grow or shrink in half steps to land near your calorie goal.
function buildMealPlan(mp) {
  const used = new Set();
  const items = KIND_SLOTS[mp.kind].map(slot => {
    const list = slotChoices(slot, mp.kind);
    const i = hashStr(mp.date + slot) + mp.seed + ((mp.swaps || {})[slot] || 0);
    let r = list[i % list.length];
    for (let k = 1; used.has(r.id) && k < list.length; k++) r = list[(i + k) % list.length];
    used.add(r && r.id);
    return { slot, r, servings: 1 };
  }).filter(x => x.r);   // no recipes for a meal (e.g. meals.js didn't load) → leave it out
  const goal = S.settings.calGoal, total = () => sum(items, x => x.r.cal * x.servings);
  const order = [...items].sort((a, b) => GROW_ORDER.indexOf(a.slot) - GROW_ORDER.indexOf(b.slot));
  for (let grew = true; grew;) {
    grew = false;
    for (const x of order) if (x.servings < 3 && total() + x.r.cal / 2 <= goal + 75) { x.servings += 0.5; grew = true; }
  }
  for (let shrank = true; shrank && total() > goal + 150;) {
    shrank = false;
    for (const x of [...order].reverse()) if (x.servings > 0.5 && total() > goal + 150) { x.servings -= 0.5; shrank = true; }
  }
  return items;
}

// The next planned meal you haven't logged yet today (for the Today screen).
function upNextMeal() {
  const items = buildMealPlan(mealPlanToday()), order = MEALS.map(m => m[0]);
  const logged = new Set(S.meals.filter(m => m.date === ymd()).map(m => m.meal));
  const now = order.indexOf(guessMeal());
  return items.find(x => order.indexOf(x.slot) >= now && !logged.has(x.slot)) || null;
}

// Game day: when to eat and drink, counted back from first pitch.
function gameTimeline(mp, items) {
  const gt = /^\d{2}:\d{2}$/.test(mp.gameTime || '') ? mp.gameTime : S.settings.workoutTime;
  const [h, m] = gt.split(':').map(Number), start = h * 60 + m;
  const at = mins => { const t = (((start + mins) % 1440) + 1440) % 1440; return clockTime(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`); };
  const rec = slot => { const x = items.find(i => i.slot === slot); return x ? x.r.name : ''; };
  const rows = [
    [-210, 'Pre-game meal', rec(start - 210 < 630 ? 'breakfast' : 'lunch'), 'Carbs plus lean protein, easy on fat and fiber. Be done eating about 3 hours before.'],
    [-120, 'Drink 16 oz of water', '', "Add a sports drink if it's hot."],
    [-60, 'Top-off snack', rec('pre'), 'Something small and carb-based, 30–60 minutes before.'],
    [-15, 'Drink another 8 oz', '', ''],
    [0, 'First pitch', '', "Sip water every half-inning — sports drink when it's hot or it's a doubleheader."],
    [180, 'Recovery snack', rec('post'), 'Within an hour of the final out.'],
    [240, 'Dinner', rec('dinner'), 'A full plate: protein, carbs and vegetables.']
  ];
  return `<div class="timeline">
    <label class="field"><span>First pitch</span><input type="time" value="${esc(gt)}" data-change="gameTime"></label>
    ${rows.map(([mins, what, r, tip]) => `<div class="tl-row"><span class="tl-time">${at(mins)}</span>
      <span class="grow"><b>${what}</b>${r ? ` · ${esc(r)}` : ''}${tip ? `<small>${tip}</small>` : ''}</span></div>`).join('')}
  </div>`;
}
changes.gameTime = el => {
  if (!/^\d{2}:\d{2}/.test(el.value)) return;
  saveMealPlan({ ...mealPlanToday(), gameTime: el.value.slice(0, 5) });
  render();
};

// ----- The week ahead: planned meals for the next 7 days + one shopping list -----
function planForDate(date) {
  if (date === ymd()) return buildMealPlan(mealPlanToday());
  return buildMealPlan({ date, kind: dayPlan(dayIdx(parseYmd(date))).type === 'rest' ? 'rest' : 'training', seed: 0, swaps: {} });
}
const nextWeek = () => Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), i)));
actions.weekMeals = () => openSheet('The week ahead', `${nextWeek().map((d, i) => `
  <div class="section-title">${i ? fmtDate(parseYmd(d), { weekday: 'long', month: 'short', day: 'numeric' }) : 'Today'}</div>
  <div>${planForDate(d).map(x => `<button class="lib-row" data-action="openRecipe" data-id="${x.r.id}" data-slot="${x.slot}" data-servings="${x.servings}">
    <span class="grow"><b>${esc(x.r.name)}</b><small>${MEAL_LABEL[x.slot]} · ${servingsText(x.servings)} · ${fmt(x.r.cal * x.servings)} cal</small></span>${icon('right', 'sm')}</button>`).join('')}</div>`).join('')}
  <p class="hint">Days follow your workout plan (training or rest). Game days and swaps are set day by day in the Meals view.</p>
  <button class="btn btn-primary btn-block" data-action="shopList">${icon('check', 'sm')} Shopping list for the week</button>`);
function weekShopping() {
  const need = {};
  for (const d of nextWeek()) for (const x of planForDate(d)) need[x.r.id] = (need[x.r.id] || 0) + x.servings;
  return Object.entries(need).map(([id, servings]) => { const r = RECIPE_BY_ID[id]; return { r, servings, batches: Math.max(1, Math.ceil(servings / r.makes)) }; });
}
actions.shopList = () => {
  const list = weekShopping();
  openSheet('Shopping list', `<p class="text-2 small">Everything for the next 7 days of your meal plan, recipe by recipe. Check things off as you shop.</p>
    ${list.map(({ r, servings, batches }) => `<div class="shop-recipe">
      <div class="bold">${esc(r.name)}</div>
      <div class="small muted">${fmt(servings, 1)} serving${servings === 1 ? '' : 's'} this week${r.makes > 1 ? ` · recipe makes ${r.makes}${batches > 1 ? ` — make it ${batches} times` : ''}` : batches > 1 ? ` — buy for ${batches}` : ''}</div>
      ${r.ing.map(g => `<label class="check-line shop-item"><input type="checkbox"> <span>${esc(g)}</span></label>`).join('')}
    </div>`).join('')}
    <button class="btn btn-ghost btn-block" data-action="copyShopList">${icon('copy', 'sm')} Copy list (paste into Notes)</button>`);
};
actions.copyShopList = async () => {
  const text = weekShopping().map(({ r, batches }) => `${r.name}${batches > 1 ? ` (×${batches})` : ''}\n${r.ing.map(g => `- ${g}`).join('\n')}`).join('\n\n');
  try { await navigator.clipboard.writeText(text); toast('Shopping list copied'); }
  catch (e) { toast("Couldn't copy — take a screenshot instead"); }
};

const servingsText = n => `${fmt(n, 1)} serving${n === 1 ? '' : 's'}`;
const loggedToday = (slot, name) => S.meals.some(m => m.date === ymd() && m.meal === slot && normName(m.name) === normName(name));

function dietMeals() {
  const mp = mealPlanToday(), items = buildMealPlan(mp), day = dayPlan(dayIdx());
  const { calGoal, proteinGoal } = S.settings;
  const cal = sum(items, x => x.r.cal * x.servings), pro = sum(items, x => x.r.pro * x.servings);
  const rows = items.map(x => {
    const done = loggedToday(x.slot, x.r.name), hint = slotHint(x.slot, mp.kind);
    return `<div class="plan-meal ${done ? 'done' : ''}">
      <button class="plan-meal-main" data-action="openRecipe" data-id="${x.r.id}" data-slot="${x.slot}" data-servings="${x.servings}">
        <span class="plan-slot">${slotName(x.slot, mp.kind)}${hint ? ` · ${hint}` : ''}${done ? ` · ${icon('check', 'sm')} Logged` : ''}</span>
        <span class="meal-name">${esc(x.r.name)}</span>
        <span class="meal-sub">${servingsText(x.servings)} · ${fmt(x.r.cal * x.servings)} cal · ${fmt(x.r.pro * x.servings)} g protein</span>
      </button>
      <button class="btn btn-icon sm btn-ghost" data-action="planSwap" data-slot="${x.slot}" aria-label="Swap ${slotName(x.slot, mp.kind)} for another idea">${icon('refresh', 'sm')}</button>
    </div>`;
  }).join('');
  const list = RECIPES.filter(r => (S.recipeMeal === 'all' || r.meals.includes(S.recipeMeal)) && (!S.recipeTag || r.tags.includes(S.recipeTag)));
  const chip = (action, k, label, on) => `<button class="chip ${on ? 'on' : ''}" data-action="${action}" data-k="${k}" aria-pressed="${on}">${label}</button>`;
  return `
    <section class="card hero">
      <div class="spread">
        <span class="badge accent">${icon('diet')} Today's meal plan</span>
        <button class="btn btn-sm btn-ghost" data-action="planShuffle">${icon('refresh', 'sm')} Shuffle</button>
      </div>
      <div class="seg" role="group" aria-label="Type of day">
        ${PLAN_KINDS.map(([k, label]) => `<button class="${mp.kind === k ? 'on' : ''}" data-action="planKind" data-k="${k}" aria-pressed="${mp.kind === k}">${label}</button>`).join('')}
      </div>
      <p class="text-2 small">${mp.kind === 'training' && day.type !== 'rest' ? `<b>${esc(day.title)}.</b> ` : ''}${KIND_NOTE[mp.kind]}</p>
      <div class="stack-sm">${rows}</div>
      ${mp.kind === 'game' ? gameTimeline(mp, items) : ''}
      <div class="plan-total"><span>Plan total</span><span><b>${fmt(cal)}</b> cal · <b>${fmt(pro)}</b> g protein</span></div>
      <button class="btn btn-ghost btn-block" data-action="weekMeals">${icon('plan', 'sm')} The week ahead + shopping list</button>
      <p class="hint">Sized to your goal of ${fmt(calGoal)} cal · ${fmt(proteinGoal)} g protein.${pro < proteinGoal - 15 ? ' Short on protein? Add a shake or a Greek yogurt bowl.' : ''} Tap a meal for the recipe and to log it; tap ${icon('refresh', 'sm')} to swap it.</p>
    </section>

    <div class="section-title">Recipes & meal ideas</div>
    <div class="chip-row">${[['all', 'All'], ...MEALS].map(([k, label]) => chip('recipeMeal', k, label, S.recipeMeal === k)).join('')}</div>
    <div class="chip-row">${Object.entries(MEAL_TAGS).map(([k, label]) => chip('recipeTag', k, label, S.recipeTag === k)).join('')}</div>
    <div>${list.map(recipeRow).join('') || '<div class="empty">No recipes match — try another filter.</div>'}</div>

    <div class="section-title">Eating for baseball</div>
    <div class="guide">${DIET_GUIDE.map(g => `<details><summary>${esc(g.title)}</summary>
      <ul class="steps">${g.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>`).join('')}</div>
    <p class="hint center">General tips for healthy athletes. Food allergies, a medical condition or a weight goal? Check with a doctor or sports dietitian.</p>`;
}

const recipeRow = r => `<button class="meal" data-action="openRecipe" data-id="${r.id}">
  <div><div class="meal-name">${esc(r.name)}</div><div class="meal-sub">${r.min} min · ${r.meals.map(m => MEAL_LABEL[m]).join(', ')}</div></div>
  <div class="meal-nums">${fmt(r.cal)} cal<small>${fmt(r.pro)} g protein</small></div>
</button>`;

actions.planKind = el => {
  if (!KIND_SLOTS[el.dataset.k]) return;
  saveMealPlan({ ...mealPlanToday(), kind: el.dataset.k, swaps: {} });
  render();
};
actions.planShuffle = () => {
  const mp = mealPlanToday();
  saveMealPlan({ ...mp, seed: (mp.seed || 0) + 1, swaps: {} });
  render(); toast('Fresh meal ideas');
};
actions.planSwap = el => {
  const mp = mealPlanToday(), slot = el.dataset.slot, swaps = { ...(mp.swaps || {}) };
  swaps[slot] = (swaps[slot] || 0) + 1;
  saveMealPlan({ ...mp, swaps });
  render();
};
actions.recipeMeal = el => { S.recipeMeal = el.dataset.k; render(); };
actions.recipeTag = el => { S.recipeTag = S.recipeTag === el.dataset.k ? null : el.dataset.k; render(); };

// The full recipe: nutrition, ingredients, steps — and log it with one tap.
actions.openRecipe = el => openRecipe(RECIPE_BY_ID[el.dataset.id], el.dataset.slot, num(el.dataset.servings) || 1);
function openRecipe(r, slot, servings = 1) {
  if (!r) return;
  const g = guessMeal(), meal = slot || (r.meals.includes(g) ? g : r.meals[0]);
  const tile = (label, v, u) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${fmt(v)}${u ? `<small> ${u}</small>` : ''}</div></div>`;
  openSheet(r.name, `
    <div class="row wrap" style="gap:6px">
      <span class="badge">${icon('clock')} ${r.min} min</span>
      ${r.makes > 1 ? `<span class="badge">Makes ${r.makes}</span>` : ''}
      ${r.tags.map(t => `<span class="badge accent">${esc(MEAL_TAGS[t])}</span>`).join('')}
    </div>
    <div class="tiles four">${tile('Calories', r.cal)}${tile('Protein', r.pro, 'g')}${tile('Carbs', r.carb, 'g')}${tile('Fat', r.fat, 'g')}</div>
    <p class="hint">Per serving${r.makes > 1 ? ` — the recipe makes ${r.makes}` : ''}. Estimates; brands vary.</p>
    <p class="text-2 small">${esc(r.why)}</p>
    <div class="section-title">Ingredients</div>
    <ul class="steps">${r.ing.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="section-title">How to make it</div>
    <ol class="steps">${r.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    <form class="form" novalidate data-submit="logRecipe" data-id="${r.id}">
      <div class="form-grid">
        <div class="field"><span>Servings</span>${stepper('servings', servings, 0.5, { min: 0.5, max: 10, mode: 'decimal' })}</div>
        <label class="field"><span>Meal</span><select name="meal">${MEALS.map(([k, v]) => `<option value="${k}" ${meal === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <button class="btn btn-primary btn-block" type="submit">${icon('plus', 'sm')} Log it for today</button>
    </form>
    <button class="btn btn-ghost btn-block" data-action="recipeFav" data-id="${r.id}">${icon('star', 'sm')} Save to favorites</button>`);
}
submits.logRecipe = f => {
  const r = RECIPE_BY_ID[f.dataset.id];
  if (!r) { closeSheet(); return; }
  const d = formData(f), servings = clamp(num(d.servings) || 1, 0.25, 20);
  const m = {
    id: uid(), date: ymd(), time: nowHHMM(), meal: MEAL_LABEL[d.meal] ? d.meal : guessMeal(), name: r.name, servings,
    cal: Math.round(r.cal * servings), pro: r1(r.pro * servings), carb: r1(r.carb * servings), fat: r1(r.fat * servings), createdAt: Date.now()
  };
  S.meals.push(m);
  save(() => DB.put('meals', m));
  closeSheet(); render();
  toast(`Logged ${r.name}`, { action: () => removeMeal(m.id) });
};
actions.recipeFav = el => {
  const r = RECIPE_BY_ID[el.dataset.id];
  if (!r) return;
  addFavorite({ name: r.name, cal: r.cal, pro: r.pro, carb: r.carb, fat: r.fat });
  closeSheet(); render(); toast(`${r.name} saved to favorites`);
};

/* ============================== 8b. PANTRY (Diet → Pantry) ============================== */
// The food in your kitchen — from photos (scan.js) or tapped in — and the meals you can make with it (pantry.js).
// Saved in settings.pantry: { items: { id: { at, amount } }, shop: [{ name, need, done }], ideas: { at, meal, list }, updated, how }.
// Food that isn't in the catalog (from a Claude scan, or typed in) gets an id starting with "x-" plus its own name and shelf.

const PANTRY_MEALS = [['', 'Any meal'], ['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack'], ['pre', 'Pre-game'], ['post', 'Post-game']];
const PAN_MAX_PHOTOS = 6;
// Shown after a scan ("Missed anything?") — the things photos miss most: fresh food without a label.
const PAN_STAPLES = ['eggs', 'milk', 'bread', 'chicken-breast', 'ground-turkey', 'ground-beef', 'rice', 'pasta', 'potatoes', 'shredded-cheese',
  'greek-yogurt', 'butter', 'bananas', 'apples', 'berries', 'oranges', 'broccoli', 'lettuce', 'tomatoes', 'onions', 'carrots', 'peanut-butter'];
const pantry = () => {
  if (!isObj(S.settings.pantry)) S.settings.pantry = { items: {}, shop: [], ideas: null, updated: 0, how: 'claude' };
  return S.settings.pantry;
};
const panIds = () => Object.keys(pantry().items);
const panName = id => (PANTRY_BY_ID[id] ? PANTRY_BY_ID[id].name : (pantry().items[id] || {}).name || id);
const panShelf = id => (PANTRY_BY_ID[id] ? PANTRY_BY_ID[id].cat : (pantry().items[id] || {}).cat || 'other');
const shelfName = k => (PANTRY_CATS.find(([c]) => c === k) || [0, 'Other'])[1];
const customId = name => 'x-' + normName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const aiKey = () => S.settings.aiKey || '';
const savePantry = () => { pantry().updated = Date.now(); saveSettings(); };
const daysAgo = t => { const d = Math.round((parseYmd(ymd()) - parseYmd(ymd(new Date(t)))) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// A need from pantry.js (an item, a group like "cheese", or a list meaning "any of these") → one item to buy or add.
const needItem = need => { const n = Array.isArray(need) ? need[0] : need; return PANTRY_BY_ID[n] ? n : (PANTRY.members[n] || [])[0] || null; };

// found: [{ id, name, cat, amount }] — a catalog id, or 'other' with a name. A name that clearly means one catalog item
// ("Sharp cheddar" → Cheddar) becomes that item, so recipes can use it. Returns the ids added or updated.
function addToPantry(found, { replace = false } = {}) {
  const p = pantry(), now = Date.now(), before = replace ? {} : p.items, items = { ...before }, ids = [];
  for (const f of found) {
    let id = f.id;
    const typed = String(f.name || '').trim().slice(0, 60), name = typed.charAt(0).toUpperCase() + typed.slice(1), amount = String(f.amount || '').trim().slice(0, 40);
    if (!PANTRY_BY_ID[id]) {
      const hits = PANTRY.findInText(name);
      id = hits.length === 1 ? hits[0] : customId(name);
      if (id === 'x-') continue;
    }
    const keep = before[id] && before[id].amount && !amount ? { amount: before[id].amount } : {};
    items[id] = PANTRY_BY_ID[id] ? { at: now, ...(amount ? { amount } : keep) }
      : { at: now, name: before[id] ? before[id].name : name, cat: PANTRY_CATS.some(([k]) => k === f.cat) ? f.cat : (before[id] || {}).cat || 'other', ...(amount ? { amount } : keep) };
    ids.push(id);
  }
  p.items = items;
  const have = Object.keys(items);
  p.shop = p.shop.filter(s => !(s.need && [].concat(s.need).some(n => PANTRY.has(have, n))));    // got it: off the shopping list
  savePantry();
  return ids;
}
function addToShop(name, need) {
  const p = pantry(), key = normName(name);
  if (p.shop.some(s => normName(s.name) === key && !s.done)) return false;
  p.shop = p.shop.filter(s => normName(s.name) !== key);
  p.shop.push({ name: String(name).slice(0, 60), ...(need ? { need } : {}), done: false });
  return true;
}
const onShop = name => pantry().shop.some(s => !s.done && normName(s.name) === normName(name));

// Recipes you can make now or with one more thing, and quick plates. A meal chip filters; otherwise what fits
// this time of day comes first.
function pantryRecs(meal) {
  const ids = panIds(), sortBy = meal || guessMeal(), fits = list => list.filter(x => !meal || (x.r ? x.r.meals : x.meals).includes(meal));
  const rk = PANTRY.rank(RECIPES, ids, { meal: sortBy });
  return { ready: fits(rk.ready), one: fits(rk.one), plates: fits(PANTRY.plates(ids, { meal: sortBy })) };
}

function dietPantry() {
  if (typeof PANTRY === 'undefined' || typeof SCAN === 'undefined') return '<div class="empty">The Pantry didn\'t load. Connect to the internet and reopen Dugout.</div>';
  const p = pantry(), ids = panIds();
  if (!ids.length) return pantryWelcome();
  const meal = S.pantryMeal, { ready, one, plates } = pantryRecs(meal);
  const chip = ([k, label]) => `<button class="chip ${meal === k ? 'on' : ''}" data-action="panMeal" data-k="${k}" aria-pressed="${meal === k}">${label}</button>`;
  const slot = meal ? ` data-slot="${meal}"` : '';
  const shownReady = S.panAll ? ready : ready.slice(0, 5), mealWord = meal ? PANTRY_MEALS.find(([k]) => k === meal)[1].toLowerCase() : '';
  const recipeRow = m => `<button class="meal" data-action="openRecipe" data-id="${m.r.id}"${slot}>
    <div><div class="meal-name">${esc(m.r.name)}</div><div class="meal-sub">${m.r.min} min · ${m.r.meals.map(k => MEAL_LABEL[k]).join(', ')}</div></div>
    <div class="meal-nums">${fmt(m.r.cal)} cal<small>${fmt(m.r.pro)} g protein</small></div>
  </button>`;
  const oneRow = m => {
    const listed = onShop(m.missing[0]);
    return `<div class="plan-meal">
      <button class="plan-meal-main" data-action="openRecipe" data-id="${m.r.id}"${slot}>
        <span class="plan-slot need">Need: ${esc(m.missing[0])}</span>
        <span class="meal-name">${esc(m.r.name)}</span>
        <span class="meal-sub">${m.r.min} min · ${fmt(m.r.cal)} cal · ${fmt(m.r.pro)} g protein</span>
      </button>
      <button class="btn btn-icon sm btn-ghost" data-action="panNeed" data-id="${m.r.id}" ${listed ? 'disabled' : ''} aria-label="${listed ? `${esc(m.missing[0])} is on your shopping list` : `Add ${esc(m.missing[0])} to your shopping list`}">${icon(listed ? 'check' : 'plus', 'sm')}</button>
    </div>`;
  };
  const plateRow = (pl, i) => `<button class="meal" data-action="panPlate" data-i="${i}">
    <div><div class="meal-name">${esc(pl.title)}</div><div class="meal-sub">${esc(pl.name)}</div></div>
    <div class="meal-nums">${fmt(pl.cal)} cal<small>${fmt(pl.pro)} g protein</small></div>
  </button>`;
  const title = ready.length ? `You can make ${plural(ready.length, 'recipe')}${mealWord ? ` for ${mealWord}` : ''} right now`
    : plates.length ? `No full recipes${mealWord ? ` for ${mealWord}` : ''} yet — but you can make a plate`
    : one.length ? `You're one ingredient away from ${plural(one.length, 'recipe')}` : 'Add a few more foods to get ideas';
  return `
    <section class="card hero">
      <div class="spread wrap">
        <span class="badge accent">${icon('diet')} ${plural(ids.length, 'food')} at home</span>
        ${daysAgo(p.updated || Date.now()) === 'today' ? '' : `<span class="small muted nowrap">Updated ${daysAgo(p.updated)}</span>`}
      </div>
      <div class="card-title">${esc(title)}</div>
      <div class="grid2 pan-actions">
        <button class="btn btn-primary" data-action="panScan">${icon('camera', 'sm')} Scan photos</button>
        <button class="btn btn-ghost" data-action="panAdd">${icon('plus', 'sm')} Add food</button>
      </div>
    </section>
    <div class="chip-row" role="group" aria-label="Which meal">${PANTRY_MEALS.map(chip).join('')}</div>

    <div class="section-title">Make it now</div>
    <div>${shownReady.map(recipeRow).join('') || `<div class="empty">No recipes from the recipe book${mealWord ? ` for ${mealWord}` : ''} with what you have yet.${plates.length ? ' Try a quick plate below.' : ''}</div>`}
      ${ready.length > shownReady.length ? `<button class="btn btn-ghost btn-block" data-action="panAll">Show ${ready.length - shownReady.length} more</button>` : ''}</div>

    ${plates.length ? `<div class="section-title">Quick plates</div>
    <div>${plates.slice(0, 4).map(plateRow).join('')}</div>` : ''}

    ${one.length ? `<div class="section-title">One thing away</div>
    <div class="stack-sm">${one.slice(0, 4).map(oneRow).join('')}</div>
    <p class="hint">Tap ${icon('plus', 'sm')} to put what's missing on your shopping list.</p>` : ''}

    ${pantryIdeas()}

    <div class="section-title">In your kitchen</div>
    <div class="card pan-kitchen">${pantryShelves()}
      <div class="grid2">
        <button class="btn btn-ghost btn-sm" data-action="panAdd">${icon('plus', 'sm')} Add food</button>
        <button class="btn btn-ghost btn-sm" data-action="panClear">${icon('trash', 'sm')} Clear all</button>
      </div>
      <p class="hint">Tap a food to note how much is left or to take it off (you ate the last of it? Add it to your shopping list).</p>
    </div>

    ${pantryShop()}
    <p class="hint center">Recipes count on salt, pepper, oil and cooking spray being in your kitchen.</p>`;
}

function pantryWelcome() {
  return `
    <section class="card hero">
      <span class="badge accent">${icon('diet')} What can I make?</span>
      <div class="card-title">Snap your kitchen — get meals you can make</div>
      <p class="text-2 small">Take photos of your pantry, fridge and freezer. Dugout finds your food and shows what you can make right now for your calorie and protein goals — and what you're one ingredient away from.</p>
      <button class="btn btn-primary btn-block" data-action="panScan">${icon('camera', 'sm')} Scan photos</button>
      <button class="btn btn-ghost btn-block" data-action="panAdd">${icon('plus', 'sm')} Tap in what you have</button>
      <p class="hint">${aiKey() ? 'Claude is on: for each scan you pick who reads the photos — Claude (they go to Anthropic) or this phone.' : 'Photos are read right on your phone — nothing is uploaded.'}</p>
    </section>
    <div class="section-title">Tips for good photos</div>
    <div class="card"><ul class="steps">
      <li>Open the doors, turn on the lights, and take one shelf or door per photo.</li>
      <li>Get close enough to read the names on the packages, and turn them to face you.</li>
      <li>Food without a label (eggs in a bowl, meat in foil) is easy to miss — tap it in afterwards.</li>
    </ul></div>`;
}

function pantryShelves() {
  const by = {}, items = pantry().items;
  panIds().forEach(id => { (by[panShelf(id)] = by[panShelf(id)] || []).push(id); });
  return PANTRY_CATS.filter(([k]) => by[k]).map(([k, label]) => `<div class="pan-shelf">
    <div class="pan-shelf-name">${label}</div>
    <div class="chips">${by[k].sort((a, b) => panName(a).localeCompare(panName(b))).map(id =>
      `<button class="chip pan-chip" data-action="panItem" data-id="${esc(id)}">${esc(panName(id))}${items[id].amount ? `<small>${esc(items[id].amount)}</small>` : ''}</button>`).join('')}</div>
  </div>`).join('');
}

function pantryShop() {
  const shop = pantry().shop;
  return `<div class="section-title">Shopping list</div>
    <div class="card stack-sm">
      ${shop.map((s, i) => `<div class="pan-shop-row">
        <label class="check-line shop-item"><input type="checkbox" data-change="panShopTick" data-i="${i}" ${s.done ? 'checked' : ''}> <span>${esc(s.name)}</span></label>
        <button class="btn btn-icon sm btn-ghost" data-action="panShopDel" data-i="${i}" aria-label="Take ${esc(s.name)} off the list">${icon('x', 'sm')}</button>
      </div>`).join('') || '<p class="hint">Nothing on it yet. Add what you run out of, or what a recipe is missing.</p>'}
      <form class="pan-shop-add" novalidate data-submit="panShopNew">
        <input class="input" name="name" placeholder="Add to the list…" maxlength="60" autocomplete="off" aria-label="Add to the shopping list">
        <button class="btn btn-icon btn-ghost" type="submit" aria-label="Add">${icon('plus', 'sm')}</button>
      </form>
      ${shop.length ? `<div class="grid2">
        <button class="btn btn-ghost btn-sm" data-action="panShopGot" ${shop.some(s => s.done) ? '' : 'disabled'}>${icon('check', 'sm')} Got them</button>
        <button class="btn btn-ghost btn-sm" data-action="panShopCopy">${icon('copy', 'sm')} Copy list</button>
      </div>
      <p class="hint">Check off what you buy, then tap Got them to move it into your kitchen.</p>` : ''}
    </div>`;
}

actions.panMeal = el => { S.pantryMeal = el.dataset.k; S.panAll = false; render(); };
actions.panAll = () => { S.panAll = true; render(); };

// ----- Scanning photos -----
actions.panScan = () => {
  if (typeof SCAN === 'undefined') { toast('The Pantry is still loading — try again in a moment'); return; }
  if (panJob) { showPanProgress(); return; }
  const ai = !!aiKey();
  openSheet('Scan your kitchen', `<form class="form" novalidate data-submit="panScanGo">
    <label class="field"><span>Photos (up to ${PAN_MAX_PHOTOS})</span><input type="file" name="photos" accept="image/*" multiple data-external>
      <small>Pantry shelves, the fridge, the freezer — one shelf or door per photo, close enough to read the labels.</small></label>
    ${ai ? `<div class="field"><span>Who reads them</span>${choice('how', [['claude', 'Claude'], ['phone', 'This phone']], pantry().how === 'phone' ? 'phone' : 'claude')}
      <small>Claude recognizes nearly any food and about how much is left (your photos go to Anthropic). This phone reads package labels and spots some fruit and veggies — free and private.</small></div>` : ''}
    <button type="submit" class="btn btn-primary btn-block">${icon('camera', 'sm')} Find my food</button>
    ${ai ? '' : `<p class="hint">Read right on your phone: it finds packaged food by reading the labels, and spots bananas, apples, oranges, broccoli and carrots. The first scan downloads the reader (about 24 MB), then it works offline. For much better results, turn on Claude in Settings → Claude AI.</p>`}
  </form>`);
};
submits.panScanGo = f => {
  const input = $('input[type=file]', f), files = input && input.files ? [...input.files] : [];
  const pics = files.filter(x => !x.type || /^image\//.test(x.type));
  if (!files.length) { toast('Choose at least one photo'); return; }
  if (!pics.length) { toast('Those files aren\'t photos'); return; }
  const how = aiKey() && formData(f).how !== 'phone' ? 'claude' : 'phone';
  if (aiKey() && pantry().how !== how) { pantry().how = how; saveSettings(); }
  runPantryScan(pics.slice(0, PAN_MAX_PHOTOS), how);
  if (pics.length > PAN_MAX_PHOTOS) toast(`Reading the first ${PAN_MAX_PHOTOS} photos`);
};

let panJob = null;        // the scan or idea request in progress: { ac, kind, stage, pct, n, total }
let panFound = null;      // the last scan's finds, while you check them
const PAN_STAGE = { download: 'Getting the label reader ready', read: 'Reading your photos', prepare: 'Getting your photos ready',
  ask: 'Claude is looking at your photos', ideas: 'Claude is coming up with meals' };
function showPanProgress() {
  openSheet(panJob && panJob.kind === 'ideas' ? 'Meal ideas' : 'Scanning your kitchen', `<div class="stack-sm" aria-live="polite">
    <div class="small bold" id="pan-stage"></div>
    <div class="meter pc" id="pan-meter"><span id="pan-bar" style="width:0%"></span></div>
    <p class="hint" id="pan-sub"></p>
    <button class="btn btn-ghost btn-block" data-action="panCancel">Cancel</button>
  </div>`, { onClose: cancelPan });
  updatePanProgress();
}
// Closing the progress sheet (Cancel, ×, or tapping outside) stops the job.
function cancelPan() { if (panJob) { panJob.ac.abort(); panJob = null; toast('Cancelled'); } }
function updatePanProgress() {
  const st = $('#pan-stage'), bar = $('#pan-bar'), sub = $('#pan-sub'), meter = $('#pan-meter');
  if (!panJob || !st) return;
  const { stage, pct, n, total } = panJob, waiting = stage === 'ask' || stage === 'ideas';
  st.textContent = PAN_STAGE[stage] || '';
  meter.classList.toggle('busy', waiting);                 // Claude gives no percentage: a moving bar instead
  bar.style.width = waiting ? '' : `${Math.round(clamp(pct, 0, 1) * 100)}%`;
  sub.textContent = stage === 'download' ? (pct < 1 ? `Downloading the label reader (one time only): ${Math.round(pct * 24)} of 24 MB` : 'Starting the label reader…')
    : stage === 'read' ? `Photo ${Math.min(total, Math.floor(pct * total) + 1)} of ${total} — keep Dugout open`
    : stage === 'ask' ? (n ? `Found ${plural(n, 'food')} so far…` : 'Usually takes 20–60 seconds.')
    : stage === 'ideas' ? (n ? `Writing idea ${Math.min(n, 5)} of 5…` : 'Usually takes 20–40 seconds.')
    : 'Keep Dugout open until it\'s done.';
}
actions.panCancel = () => closeSheet();

const PAN_PROBLEM = {
  old: ['This phone can\'t read the photos itself', 'It needs iOS 16.4 or newer on iPhone, or a current Chrome on Android. You can still tap in your food by hand.'],
  offline: ['Connect to the internet', 'The first scan downloads the label reader (about 24 MB) — after that it works offline. Claude always needs internet.'],
  model: ['The label reader couldn\'t start', 'Close other apps to free up memory and try again. Restarting your phone can help.'],
  image: ['A photo couldn\'t be opened', 'Try photos taken with your phone\'s camera app.'],
  badkey: ['Claude didn\'t accept your key', 'The API key may have been deleted or mistyped. Check it in Settings → Claude AI.'],
  credit: ['Your Anthropic account is out of credit', 'Add credit at console.anthropic.com (Billing), then try again.'],
  busy: ['Claude is busy right now', 'Too many requests, or Anthropic is overloaded. Wait a minute and try again.'],
  refused: ['Claude couldn\'t help with that', 'Try different photos, or tap your food in by hand.'],
  ai: ['That didn\'t work', 'Claude\'s answer didn\'t come through. Try again in a moment.']
};
function pantryProblem(code, detail, retry = 'panScan') {
  const [title, text] = PAN_PROBLEM[code] || ['Something went wrong', 'Try again. If it keeps happening, tap your food in by hand.'];
  const key = code === 'badkey' || code === 'credit';
  openSheet(title, `<p class="text-2">${esc(text)}</p>${detail && code === 'ai' ? `<p class="hint">${esc(String(detail).slice(0, 200))}</p>` : ''}
    <div class="sheet-actions">${code === 'old' ? `<button class="btn btn-ghost" data-action="closeSheet">Close</button><button class="btn btn-primary" data-action="panAdd">Add by hand</button>`
      : `<button class="btn btn-ghost" data-action="${key ? 'aiSetup' : 'panAdd'}">${key ? 'Check key' : 'Add by hand'}</button><button class="btn btn-primary" data-action="${retry}">Try again</button>`}</div>`);
}
const panFailed = (e, retry) => {
  const code = e && e.code;
  if (S.locked || code === 'cancelled') return;              // cancelling already closed the sheet
  if (!PAN_PROBLEM[code] || code === 'model' || code === 'ai') console.error(e);
  pantryProblem(code, e && e.detail, retry);
};

async function runPantryScan(files, how) {
  if (how === 'phone' && SCAN.supported()) { pantryProblem('old'); return; }
  panJob = { ac: new AbortController(), kind: 'scan', stage: how === 'phone' ? 'download' : 'prepare', pct: 0, n: 0, total: files.length };
  const job = panJob;
  showPanProgress();
  keepAwake(true);
  try {
    const onProgress = (stage, v) => { job.stage = stage; if (stage === 'ask') job.n = v; else job.pct = v; updatePanProgress(); };
    const res = how === 'claude' ? await SCAN.withClaude(files, aiKey(), { onProgress, signal: job.ac.signal })
      : await SCAN.onPhone(files, { onProgress, signal: job.ac.signal });
    if (job.ac.signal.aborted || S.locked) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    panJob = null;
    pantryReview(res.items, how, files.length);
  } catch (e) {
    if (panJob === job) panJob = null;
    panFailed(e, 'panScan');
  } finally {
    keepAwake(!!S.active);
  }
}

// ----- Checking what the scan found -----
function pantryReview(items, how, photos) {
  const seen = new Set(), rows = [];
  for (const x of items) {
    const key = PANTRY_BY_ID[x.id] ? x.id : 'x:' + normName(x.name);
    if (seen.has(key) || key === 'x:') continue;
    seen.add(key);
    rows.push(how === 'phone' ? { id: x.id, name: panName(x.id), cat: PANTRY_BY_ID[x.id].cat, sure: true, note: x.how === 'shape' ? 'Spotted by its shape' : 'Read on a label' }
      : { id: x.id, name: x.name || panName(x.id), cat: PANTRY_BY_ID[x.id] ? PANTRY_BY_ID[x.id].cat : x.cat, amount: x.amount, sure: x.sure, note: x.amount || '' });
  }
  const order = Object.fromEntries(PANTRY_CATS.map(([k], i) => [k, i]));
  rows.sort((a, b) => (b.sure - a.sure) || (order[a.cat] ?? 9) - (order[b.cat] ?? 9) || a.name.localeCompare(b.name));
  panFound = rows;
  const inPantry = panIds().length, extra = PAN_STAPLES.filter(id => !seen.has(id) && !pantry().items[id]);
  if (!rows.length) {
    openSheet('No food found', `<p class="text-2">${how === 'phone'
      ? `Dugout couldn't read any food labels in ${photos === 1 ? 'this photo' : 'these photos'}. Get closer so the names on the packages are big and sharp, in good light — or tap your food in by hand.${aiKey() ? '' : ' Claude (Settings → Claude AI) can recognize food without reading labels.'}`
      : 'Claude didn\'t see any food in these photos. Try again with the doors open and the lights on.'}</p>
      <div class="sheet-actions"><button class="btn btn-ghost" data-action="panAdd">Add by hand</button><button class="btn btn-primary" data-action="panScan">Try again</button></div>`);
    return;
  }
  const maybes = rows.filter(r => !r.sure).length;
  openSheet(`Found ${plural(rows.length, 'food')}`, `<form class="form" novalidate data-submit="panReviewAdd">
    <p class="text-2 small">Uncheck anything that's wrong${maybes ? ', and check the maybes you really have' : ''}.</p>
    <div class="pan-found">${rows.map((r, i) => `<label class="check-line"><input type="checkbox" name="f" value="${i}" ${r.sure ? 'checked' : ''}>
      <span class="grow"><b>${esc(r.name)}</b><small>${[r.sure ? '' : 'Maybe', r.note, pantry().items[r.id] ? 'already in your list' : ''].filter(Boolean).map(esc).join(' · ')}</small></span></label>`).join('')}</div>
    ${extra.length ? `<div class="field"><span>Missed anything? Tap what you also have</span>
      <div class="chips">${extra.map(id => `<label class="pan-pick"><input type="checkbox" name="s" value="${id}"><span>${esc(panName(id))}</span></label>`).join('')}</div></div>` : ''}
    ${inPantry ? `<label class="check-line"><input type="checkbox" name="replace"> <span>This is my whole kitchen — replace my old list of ${plural(inPantry, 'food')}</span></label>` : ''}
    <button type="submit" class="btn btn-primary btn-block">${icon('check', 'sm')} Add to my kitchen</button>
    ${how === 'phone' ? '<p class="hint">Read on your phone. It can miss food without a clear label — add it with the chips above or Add food.</p>' : ''}
  </form>`);
}
submits.panReviewAdd = f => {
  if (!panFound) { closeSheet(); return; }
  const fd = new FormData(f), replace = fd.get('replace') === 'on';
  const picked = fd.getAll('f').map(i => panFound[Number(i)]).filter(Boolean), extra = fd.getAll('s').filter(id => PANTRY_BY_ID[id]).map(id => ({ id }));
  if (!picked.length && !extra.length) { toast('Check at least one food'); return; }
  const before = replace ? 0 : panIds().length, ids = addToPantry([...picked, ...extra], { replace });
  const added = replace ? ids.length : panIds().length - before;
  panFound = null;
  closeSheet();
  Object.assign(S, { tab: 'diet', dietView: 'pantry', panAll: false });
  render({ keepScroll: false });
  const ready = pantryRecs(S.pantryMeal).ready.length;
  toast(`${replace ? `Your kitchen: ${plural(panIds().length, 'food')}` : added ? `Added ${plural(added, 'food')}` : 'Kitchen updated'}${ready ? ` — ${plural(ready, 'recipe')} ready` : ''}`);
};

// ----- Adding food by hand -----
actions.panAdd = () => {
  if (typeof PANTRY === 'undefined') return;
  openSheet('Add food', `<div class="stack">
    <label class="field"><span>Search</span><input id="pan-q" placeholder="Eggs, rice, Greek yogurt…" autocomplete="off" autocapitalize="off" enterkeyhint="done" data-input="panSearch"></label>
    <div class="chips" id="pan-hits"></div>
    <p class="hint">Or tap everything you have:</p>
    ${PANTRY_CATS.map(([k, label]) => {
      const list = PANTRY_ITEMS.filter(it => it.cat === k && it.group !== 'basic');
      return list.length ? `<div class="pan-shelf"><div class="pan-shelf-name">${label}</div><div class="chips">${list.map(it => panToggle(it.id)).join('')}</div></div>` : '';
    }).join('')}
    <button class="btn btn-primary btn-block" data-action="closeSheet">Done</button>
  </div>`, { onClose: () => render() });
};
const panToggle = id => { const on = !!pantry().items[id]; return `<button class="chip ${on ? 'on' : ''}" data-action="panToggle" data-id="${esc(id)}" aria-pressed="${on}">${esc(panName(id))}</button>`; };
actions.panToggle = el => {
  const id = el.dataset.id, p = pantry(), on = !p.items[id];
  if (on) addToPantry([{ id }]); else { delete p.items[id]; savePantry(); }
  $$('[data-action="panToggle"]').filter(b => b.dataset.id === id).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
};
inputs.panSearch = el => {
  const q = el.value.trim(), hits = q ? PANTRY.search(q, 6) : [], box = $('#pan-hits');
  if (!box) return;
  box.innerHTML = hits.map(it => panToggle(it.id)).join('') + (q && !hits.some(it => normName(it.name) === normName(q)) ? `<button class="chip" data-action="panCustom">${icon('plus', 'sm')} Add “${esc(q.slice(0, 40))}”</button>` : '');
};
actions.panCustom = () => {
  const q = $('#pan-q'), name = q ? q.value.trim().slice(0, 60) : '';
  if (!name) return;
  const [id] = addToPantry([{ id: 'other', name, cat: 'other' }]);
  q.value = ''; $('#pan-hits').innerHTML = '';
  $$('[data-action="panToggle"]').filter(b => b.dataset.id === id).forEach(b => { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); });
  toast(id ? `Added ${panName(id)}` : 'Type a food name first');
};

// ----- One food: how much is left, or take it off -----
actions.panItem = el => {
  const id = el.dataset.id, it = pantry().items[id];
  if (!it) return;
  openSheet(panName(id), `<form class="form" novalidate data-submit="panItemSave" data-id="${esc(id)}">
    <p class="text-2 small">${esc(shelfName(panShelf(id)))} · added ${daysAgo(it.at)}</p>
    <label class="field"><span>How much is left (optional)</span><input name="amount" value="${esc(it.amount || '')}" placeholder="About half a bag" maxlength="40" autocomplete="off"></label>
    <button type="submit" class="btn btn-primary btn-block">Save</button>
  </form>
  <div class="grid2">
    <button class="btn btn-ghost" data-action="panGone" data-id="${esc(id)}" data-shop="1">${icon('plus', 'sm')} Ran out — add to list</button>
    <button class="btn btn-danger" data-action="panGone" data-id="${esc(id)}">${icon('trash', 'sm')} Remove</button>
  </div>`);
};
submits.panItemSave = f => {
  const it = pantry().items[f.dataset.id];
  if (it) { const a = String(formData(f).amount || '').trim().slice(0, 40); if (a) it.amount = a; else delete it.amount; savePantry(); }
  closeSheet(); render();
};
actions.panGone = el => {
  const id = el.dataset.id, p = pantry(), was = p.items[id], name = panName(id), shop = !!el.dataset.shop;
  if (!was) return;
  delete p.items[id];
  const listed = shop && addToShop(name, PANTRY_BY_ID[id] ? id : null);
  savePantry(); closeSheet(); render();
  toast(shop ? `${name} is on your shopping list` : `Removed ${name}`, { action: () => {
    p.items[id] = was;
    if (listed) p.shop = p.shop.filter(s => normName(s.name) !== normName(name));
    savePantry(); render();
  } });
};
actions.panClear = async () => {
  if (!(await confirmBox('Clear your kitchen?', `Removes all ${plural(panIds().length, 'food')} so you can start fresh. Your shopping list stays.`, { ok: 'Clear', danger: true }))) return;
  const p = pantry(), was = p.items;
  p.items = {}; savePantry(); render();
  toast('Kitchen cleared', { action: () => { p.items = was; savePantry(); render(); } });
};

// ----- Quick plates -----
let foodIndex = null;
const foodNamed = name => { if (!foodIndex) foodIndex = Object.fromEntries(FOODS.map(f => [f.name, f])); return foodIndex[name]; };
const macroTiles = x => {
  const tile = (label, v, u) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${fmt(v)}${u ? `<small> ${u}</small>` : ''}</div></div>`;
  return `<div class="tiles four">${tile('Calories', x.cal)}${tile('Protein', x.pro, 'g')}${tile('Carbs', x.carb, 'g')}${tile('Fat', x.fat, 'g')}</div>`;
};
const logForm = (submit, meal, i) => `<form class="form" novalidate data-submit="${submit}" data-i="${i}">
  <div class="form-grid">
    <div class="field"><span>Servings</span>${stepper('servings', 1, 0.5, { min: 0.5, max: 10, mode: 'decimal' })}</div>
    <label class="field"><span>Meal</span><select name="meal">${MEALS.map(([k, v]) => `<option value="${k}" ${meal === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  </div>
  <button class="btn btn-primary btn-block" type="submit">${icon('plus', 'sm')} Log it for today</button>
</form>`;
const mealFor = meals => (MEAL_LABEL[S.pantryMeal] ? S.pantryMeal : meals.includes(guessMeal()) ? guessMeal() : meals[0]);
actions.panPlate = el => {
  const pl = pantryRecs(S.pantryMeal).plates[Number(el.dataset.i)];
  if (!pl) return;
  openSheet(pl.name, `
    ${macroTiles(pl)}
    <p class="hint">For one plate as listed. Estimates from Dugout's food list — brands vary.</p>
    <div class="section-title">On the plate</div>
    <ul class="steps">${pl.items.map(id => {
      const it = PANTRY_BY_ID[id], f = it.food && foodNamed(it.food[0]);
      return `<li><b>${esc(it.name)}</b>${f ? ` — ${it.food[1] === 1 ? '' : `${fmt(it.food[1], 2)} × `}${esc(f.serving)}` : ''}</li>`;
    }).join('')}</ul>
    <div class="section-title">How to make it</div>
    <p class="text-2 small">${esc(pl.how)}</p>
    ${logForm('logPlate', mealFor(pl.meals), el.dataset.i)}`);
};
function logPantryMeal(f, x) {       // x: name plus numbers for one serving
  const d = formData(f), servings = clamp(num(d.servings) || 1, 0.25, 20);
  const m = {
    id: uid(), date: ymd(), time: nowHHMM(), meal: MEAL_LABEL[d.meal] ? d.meal : guessMeal(), name: x.name, servings,
    cal: Math.round(x.cal * servings), pro: r1(x.pro * servings), carb: r1(x.carb * servings), fat: r1(x.fat * servings), createdAt: Date.now()
  };
  S.meals.push(m);
  save(() => DB.put('meals', m));
  closeSheet(); render();
  toast(`Logged ${x.name}`, { action: () => removeMeal(m.id) });
}
submits.logPlate = f => {
  const pl = pantryRecs(S.pantryMeal).plates[Number(f.dataset.i)];
  if (!pl) { closeSheet(); return; }
  logPantryMeal(f, { ...pl, name: pl.title.slice(0, 80) });
};

// ----- One thing away: put it on the shopping list -----
actions.panNeed = el => {
  const r = RECIPE_BY_ID[el.dataset.id], m = r && PANTRY.match(r, new Set([...panIds(), ...BASICS]));
  if (!m || !m.missing.length) return;
  addToShop(m.missing[0], m.missingIds[0]);
  saveSettings(); render();
  toast(`${m.missing[0]} is on your shopping list`);
};

// ----- Shopping list -----
changes.panShopTick = el => { const s = pantry().shop[Number(el.dataset.i)]; if (s) { s.done = el.checked; saveSettings(); render(); } };
actions.panShopDel = el => {
  const p = pantry(), i = Number(el.dataset.i), s = p.shop[i];
  if (!s) return;
  p.shop.splice(i, 1); saveSettings(); render();
  toast(`Took ${s.name} off the list`, { action: () => { p.shop.splice(Math.min(i, p.shop.length), 0, s); saveSettings(); render(); } });
};
submits.panShopNew = f => {
  const name = String(formData(f).name || '').trim().slice(0, 60);
  if (!name) return;
  if (!addToShop(name)) { toast(`${name} is already on the list`); return; }
  saveSettings();
  later(() => { const inp = $('.pan-shop-add input'); if (inp) inp.focus({ preventScroll: true }); });
  render();
};
actions.panShopGot = () => {
  const p = pantry(), got = p.shop.filter(s => s.done);
  if (!got.length) return;
  // Each bought thing goes into your kitchen: the catalog item it stands for, or its own name.
  addToPantry(got.map(s => { const id = s.need ? needItem(s.need) : null; return id ? { id } : { id: 'other', name: s.name, cat: 'other' }; }));
  p.shop = p.shop.filter(s => !s.done);
  saveSettings(); render();
  toast(`Moved ${plural(got.length, 'thing')} into your kitchen`);
};
actions.panShopCopy = async () => {
  const text = pantry().shop.filter(s => !s.done).map(s => `- ${s.name}`).join('\n');
  if (!text) { toast('Everything on the list is checked off'); return; }
  try { await navigator.clipboard.writeText(`Shopping list\n${text}`); toast('Shopping list copied'); }
  catch (e) { toast('Couldn\'t copy — take a screenshot instead'); }
};

// ----- Meal ideas from Claude (optional: your own API key) -----
function pantryIdeas() {
  const ideas = pantry().ideas;
  if (!aiKey()) return `<div class="section-title">More ideas</div>
    <button class="card pan-ai" data-action="aiSetup">${icon('sparkle')}<span class="grow"><b>Want meals beyond the recipe book?</b>
      <small>Connect Claude with your own Anthropic API key for custom meals made from exactly what you have.</small></span>${icon('right', 'sm')}</button>`;
  const list = ideas && ideas.list || [];
  return `<div class="section-title" id="pan-ideas">Ideas from Claude</div>
    ${list.length ? `<div>${list.map((x, i) => `<button class="meal" data-action="panIdea" data-i="${i}">
        <div><div class="meal-name">${esc(x.name)}</div><div class="meal-sub">${x.minutes ? `${x.minutes} min · ` : ''}${MEAL_LABEL[x.meal] || 'Any meal'}${x.missing.length ? ` · needs ${plural(x.missing.length, 'extra')}` : ''}</div></div>
        <div class="meal-nums">${fmt(x.cal)} cal<small>${fmt(x.pro)} g protein</small></div>
      </button>`).join('')}</div>
      <button class="btn btn-ghost btn-block" data-action="panAskIdeas">${icon('sparkle', 'sm')} New ideas${S.pantryMeal ? ` for ${PANTRY_MEALS.find(([k]) => k === S.pantryMeal)[1].toLowerCase()}` : ''}</button>
      <p class="hint">Asked ${daysAgo(ideas.at)}. Numbers are Claude's estimates per serving.</p>`
    : `<button class="btn btn-ghost btn-block" data-action="panAskIdeas">${icon('sparkle', 'sm')} Ask Claude for meal ideas${S.pantryMeal ? ` for ${PANTRY_MEALS.find(([k]) => k === S.pantryMeal)[1].toLowerCase()}` : ''}</button>
      <p class="hint">Sends your list of foods and your daily goals to Claude — no photos.</p>`}`;
}
const PAN_MEAL_ASK = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'a snack', pre: 'a meal 1–2 hours before a game or practice', post: 'a meal right after a game or practice' };
actions.panAskIdeas = () => runPantryIdeas();
async function runPantryIdeas() {
  if (!aiKey()) { actions.aiSetup(); return; }
  if (panJob) { showPanProgress(); return; }
  const p = pantry(), meal = S.pantryMeal, kind = mealPlanToday().kind;
  const have = panIds().filter(id => !BASICS.includes(id)).map(id => (p.items[id].amount ? `${panName(id)} (${p.items[id].amount})` : panName(id)));
  if (have.length < 3) { toast('Add a few more foods first'); return; }
  panJob = { ac: new AbortController(), kind: 'ideas', stage: 'ideas', pct: 0, n: 0, total: 5 };
  const job = panJob;
  showPanProgress();
  keepAwake(true);
  try {
    const list = await SCAN.ideas(aiKey(), { have, cal: S.settings.calGoal, pro: S.settings.proteinGoal, day: kind === 'game' ? 'game' : kind === 'rest' ? 'rest' : 'training', meal: PAN_MEAL_ASK[meal] || '' },
      { signal: job.ac.signal, onProgress: (stage, n) => { job.n = n; updatePanProgress(); } });
    if (job.ac.signal.aborted || S.locked) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    panJob = null;
    if (!list.length) throw Object.assign(new Error('ai'), { code: 'ai', detail: 'No ideas came back' });
    p.ideas = { at: Date.now(), meal, list };
    saveSettings();
    closeSheet();
    later(() => { const h = $('#pan-ideas'); if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    render();
    toast(`${plural(list.length, 'meal idea')} from Claude`);
  } catch (e) {
    if (panJob === job) panJob = null;
    panFailed(e, 'panAskIdeas');
  } finally {
    keepAwake(!!S.active);
  }
}
const ideaAt = i => ((pantry().ideas || {}).list || [])[Number(i)];
actions.panIdea = el => {
  const x = ideaAt(el.dataset.i);
  if (!x) return;
  openSheet(x.name, `
    <div class="row wrap" style="gap:6px">
      ${x.minutes ? `<span class="badge">${icon('clock')} ${x.minutes} min</span>` : ''}
      ${x.servings > 1 ? `<span class="badge">Makes ${x.servings}</span>` : ''}
      <span class="badge accent">${icon('sparkle')} From Claude</span>
    </div>
    ${macroTiles(x)}
    <p class="hint">Per serving — Claude's estimate. Check your labels.</p>
    ${x.why ? `<p class="text-2 small">${esc(x.why)}</p>` : ''}
    ${x.uses.length ? `<div class="section-title">From your kitchen</div><ul class="steps">${x.uses.map(u => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
    ${x.missing.length ? `<div class="section-title">You'd also need</div><ul class="steps">${x.missing.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
      <button class="btn btn-ghost btn-block" data-action="panIdeaShop" data-i="${el.dataset.i}">${icon('plus', 'sm')} Add to shopping list</button>` : ''}
    ${x.steps.length ? `<div class="section-title">How to make it</div><ol class="steps">${x.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${logForm('logIdea', MEAL_LABEL[S.pantryMeal] ? S.pantryMeal : MEAL_LABEL[x.meal] ? x.meal : guessMeal(), el.dataset.i)}
    <button class="btn btn-ghost btn-block" data-action="panIdeaFav" data-i="${el.dataset.i}">${icon('star', 'sm')} Save to favorites</button>`);
};
submits.logIdea = f => { const x = ideaAt(f.dataset.i); if (!x) { closeSheet(); return; } logPantryMeal(f, x); };
actions.panIdeaShop = el => {
  const x = ideaAt(el.dataset.i);
  if (!x) return;
  const n = x.missing.filter(name => { const hits = PANTRY.findInText(name); return addToShop(name, hits.length === 1 ? hits[0] : null); }).length;
  saveSettings(); closeSheet(); render();
  toast(n ? `Added ${plural(n, 'thing')} to your shopping list` : 'Already on your shopping list');
};
actions.panIdeaFav = el => {
  const x = ideaAt(el.dataset.i);
  if (!x) return;
  addFavorite({ name: x.name, cal: x.cal, pro: x.pro, carb: x.carb, fat: x.fat });
  closeSheet(); render(); toast(`${x.name} saved to favorites`);
};

// ----- Settings → Claude AI: your own Anthropic API key -----
actions.aiSetup = () => {
  const key = aiKey();
  openSheet('Claude AI', `<div class="stack">
    <p class="text-2 small">Dugout works fine without this. With your own Anthropic API key you get:</p>
    <ul class="steps">
      <li><b>Coach</b> — a chat with an AI coach that knows your plan, workouts, food, check-ins, goals and baseball logs</li>
      <li>Pantry photo scans that recognize nearly any food — even without a label — and about how much is left</li>
      <li>Meal ideas made from exactly what's in your kitchen, sized for your goals</li>
    </ul>
    <p class="text-2 small"><b>Cost:</b> Anthropic charges your account for what you use — usually a few cents per Coach question and about 5–25¢ per scan or set of meal ideas. Nothing is sent unless you use one of these.</p>
    <p class="text-2 small"><b>Privacy:</b> what you use them for goes to Anthropic: your Coach questions with a summary of your Dugout data, the kitchen photos you have Claude read, and your food list for meal ideas. Your key is saved encrypted on this phone and is never put in backups.</p>
    <details class="table-toggle"><summary>How to get a key</summary>
      <ol class="steps"><li>Go to console.anthropic.com and sign in (billing needs a card — ask a parent if it isn't yours).</li><li>Open API keys → Create key, and copy it.</li><li>Paste it below.</li></ol></details>
    <form class="form" novalidate data-submit="aiSave">
      <label class="field"><span>${key ? `Your key ends in …${esc(key.slice(-4))} — paste a new one to replace it` : 'Your API key'}</span>
        <input name="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…"></label>
      <button type="submit" class="btn btn-primary btn-block">${icon('check', 'sm')} ${key ? 'Replace key' : 'Save key'}</button>
    </form>
    ${key ? `<button class="btn btn-danger btn-block" data-action="aiRemove">${icon('trash', 'sm')} Remove key</button>` : ''}
  </div>`);
};
submits.aiSave = async f => {
  const k = String(formData(f).key || '').replace(/\s+/g, '');
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k)) { toast('That isn\'t an Anthropic API key — it starts with sk-ant-'); return; }
  const btn = $('button[type=submit]', f), label = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Checking the key…';
  let note = 'Claude is on — say hi in the Coach tab';
  try { await AI.checkKey(k); }
  catch (e) {
    if (e && (e.code === 'badkey' || e.code === 'credit')) { btn.disabled = false; btn.innerHTML = label; toast(e.code === 'credit' ? 'That account is out of credit — add some at console.anthropic.com' : 'Anthropic didn\'t accept that key'); return; }
    note = 'Key saved — it couldn\'t be checked right now';
  }
  if (S.locked) return;
  S.settings.aiKey = k; saveSettings();
  closeSheet(); render(); toast(note);
};
actions.aiRemove = async () => {
  if (!(await confirmBox('Remove your Claude key?', 'The Coach and meal ideas from Claude turn off, and Pantry scans go back to reading photos on this phone. Your chats and ideas stay.', { ok: 'Remove', danger: true }))) return;
  S.settings.aiKey = ''; saveSettings(); render(); toast('Claude key removed');
};

// Restored backups and old versions: keep only what the Pantry understands.
function cleanPantry(p) {
  if (!isObj(p) || typeof PANTRY_BY_ID === 'undefined') return isObj(p) ? p : null;
  const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : ''), nums = v => Math.max(0, Math.round(Number(v) || 0));
  const strs = (a, n) => (Array.isArray(a) ? a.filter(s => typeof s === 'string' && s.trim()).slice(0, n).map(s => s.trim().slice(0, 300)) : []);
  const items = {};
  for (const [id, v] of Object.entries(isObj(p.items) ? p.items : {})) {
    if (!isObj(v)) continue;
    const amount = str(v.amount, 40), base = { at: Number(v.at) || Date.now(), ...(amount ? { amount } : {}) };
    if (PANTRY_BY_ID[id]) items[id] = base;
    else if (/^x-[a-z0-9-]{1,40}$/.test(id) && str(v.name, 60)) items[id] = { ...base, name: str(v.name, 60), cat: PANTRY_CATS.some(([k]) => k === v.cat) ? v.cat : 'other' };
  }
  const okNeed = n => (typeof n === 'string' && n.length < 40) || (Array.isArray(n) && n.length && n.length < 8 && n.every(x => typeof x === 'string' && x.length < 40));
  const shop = (Array.isArray(p.shop) ? p.shop : []).filter(s => isObj(s) && str(s.name, 60)).slice(0, 100)
    .map(s => ({ name: str(s.name, 60), ...(okNeed(s.need) ? { need: s.need } : {}), done: !!s.done }));
  const ideas = isObj(p.ideas) && Array.isArray(p.ideas.list) ? { at: Number(p.ideas.at) || 0, meal: MEAL_LABEL[p.ideas.meal] ? p.ideas.meal : '',
    list: p.ideas.list.filter(x => isObj(x) && str(x.name, 80)).slice(0, 6).map(x => ({ name: str(x.name, 80), meal: MEAL_LABEL[x.meal] ? x.meal : '', minutes: nums(x.minutes),
      servings: Math.max(1, nums(x.servings)), uses: strs(x.uses, 12), missing: strs(x.missing, 12), cal: nums(x.cal), pro: nums(x.pro), carb: nums(x.carb), fat: nums(x.fat),
      why: str(x.why, 300), steps: strs(x.steps, 12) })) } : null;
  return { items, shop, ideas: ideas && ideas.list.length ? ideas : null, updated: Number(p.updated) || 0, how: p.how === 'phone' ? 'phone' : 'claude' };
}

/* ============================== 8c. COACH (AI chat — coach.js) ============================== */
// A chat with Claude (your own API key) that knows your Dugout. This section builds what Claude is told about the app
// and about you, runs the look-ups it asks for (on this phone), applies the buttons it offers when you tap them, and
// draws the chat. Saved encrypted as "coach": { msgs: [...what's on screen], api: [[...API messages of one turn]], cost }.

let coachJob = null;              // the reply being written: { ac, id, text, looked, offers, status }
let coachGuide = null;            // the app guide Claude reads (built once — it only changes with a new Dugout version)
const COACH_TURNS = 12;           // back-and-forths sent with each question (older ones stay on screen)
const coachChat = () => (S.coach || (S.coach = { msgs: [], api: [], cost: 0 }));
const saveCoach = () => { if (S.coach) save(() => DB.set('coach', S.coach)); };
const COACH_LOOK = { get_training_history: 'your workouts', get_food_log: 'your food log', get_body_and_recovery: 'your weight and recovery',
  get_baseball_data: 'your baseball data', get_plan: 'your plan', look_up: 'the Dugout library' };

// ----- What Claude knows about the app (the same for everyone, so it can be cached) -----
function coachGuideText() {
  if (coachGuide) return coachGuide;
  const L = [`<dugout_app version="${APP_VERSION}">`, `# Where things are
- Today tab: the date, the Gym / Home switch, today's workout with a Light / Moderate / Heavy switch and Start, the daily check-in (sleep, energy, soreness → a readiness score), food so far against the goals, water, an arm-care card after throwing, this week's summary, and a review of last week (Monday–Wednesday).
- During a workout: log each set (weight × reps, or time), a rest timer, a form video and how-to for every exercise, next-weight tips, warm-up sets, a plate calculator, exercise swaps, End (save what they did or cancel), then an effort rating (1–10) and notes. Moderate = about ⅔ of the sets starting around 90% of last time's weights; Light = their Light workout (mobility, arm care and core).
- Plan tab: the 7-day Gym and Home plans and the Light workout — edit any exercise (sets, reps, rest, cues, video link) and reorder; Programs (off-season, pre-season, in-season); the exercise library.
- Baseball tab: Drills (by position, alone or with a partner; star drills to build a drill plan; log practice), Swing lab (film one swing from the side, front or back → score, priorities with the numbers behind them, pictures, charts and drills), Games & arm (game log with season stats, speed and power tests, throwing log, a live pitch counter with Pitch Smart rest days, a stopwatch and a practice log).
- Diet tab: Day (the food log: search the food list, favorites, recent foods, copy yesterday; water), Week (weekly totals), Meals (a daily meal plan for training, rest and game days, the recipe book, a game-day timeline, the week ahead with a shopping list, eating tips), Pantry (scan kitchen photos or tap in food → recipes they can make now, quick plates, recipes one ingredient away, a shopping list, Claude meal ideas).
- Coach tab: this chat.
- Progress tab: Lifts (a chart for every exercise, personal records, a training calendar, badges, workout history) and Body (body-weight trend, recovery trends, goals).
- Settings: login and auto-lock, workout time, light or dark look, lb or kg, timer options, daily nutrition goals and the goal calculator, Claude AI, backups and spreadsheet export, program and plan resets, updates, help.`];
  L.push('', '# Programs (Plan → Programs)', ...Object.values(PROGRAMS).map(p => `- ${p.name} (${p.tag}): ${p.about}`));
  L.push('', '# Exercise library (look_up "exercise" for how-tos)', ...EXERCISE_GROUPS.map(([g, list]) => `- ${g}: ${list.join(', ')}`));
  L.push('', '# Recipe book (per serving; look_up "recipe" for ingredients and steps)',
    ...RECIPES.map(r => `- ${r.name} [${r.meals.map(k => MEAL_LABEL[k]).join(', ')}] ${r.min} min · ${r.cal} cal, ${r.pro} g protein, ${r.carb} g carbs, ${r.fat} g fat${r.makes > 1 ? ` · makes ${r.makes}` : ''}${r.tags.length ? ` · ${r.tags.map(t => MEAL_TAGS[t]).join(', ')}` : ''}`));
  L.push('', `# Food list: ${FOODS.length} common foods with nutrition per serving (look_up "food"): ${[...new Set(FOODS.map(f => f.group))].join(', ')}.`);
  L.push('', '# Drills (id: name — positions, alone or with a partner; the swing problems it helps)',
    ...DRILLS.map(d => `- ${d.id}: ${d.n} — ${d.pos.map(p => (DRILL_POSITIONS.find(([k]) => k === p) || [p, p])[1]).join(', ')}, ${d.who === 'solo' ? 'alone' : 'partner'}${d.fixes && d.fixes.length ? `; helps ${d.fixes.join(', ')}` : ''}`));
  L.push('', '# Swing lab problems (id: name — the cue)', ...Object.entries(SWING_FAULTS).map(([id, f]) => `- ${id}: ${f.name} — "${f.cue}"`));
  L.push('', '# Tests (Baseball → Games & arm)', ...TESTS.map(t => `- ${t.name}, in ${t.unit}${t.lower ? ' (lower is better)' : ''}${t.good ? `; strong high-school mark ${t.lower ? '≤' : '≥'} ${t.good}` : ''}. ${t.hint}`));
  L.push('', '# Pitch Smart (what the app uses): most pitches in a day by age, and rest days after more than each count');
  PITCH_SMART.forEach((r, i) => L.push(`- Ages ${i ? PITCH_SMART[i - 1].upTo + 1 : 7}–${r.upTo}: max ${r.max}; ${r.tiers.map((t, j) => `over ${t} → ${j + 1} day${j ? 's' : ''}`).join(', ')}`));
  L.push('', '# Eating for baseball (the app\'s tips)', ...DIET_GUIDE.flatMap(g => [`## ${g.title}`, ...g.points.map(p => `- ${p}`)]));
  L.push('', '# Help topics (how the app works)', ...HELP.flatMap(([t, pts]) => [`## ${t}`, ...pts.map(p => `- ${p}`)]));
  L.push('</dugout_app>');
  return (coachGuide = L.join('\n'));
}

// ----- What Claude knows about you right now (sent fresh with every question) -----
const setTxt = (e, s) => (e.track === 'time' ? `${fmt(s.r, 1)}s` : e.track === 'weight' && s.w ? `${fmt(s.w, 1)}×${s.r ?? '?'}` : s.r != null ? `${fmt(s.r)} reps` : 'done');
const dayWord = d => fmtDate(parseYmd(d), { weekday: 'short', month: 'short', day: 'numeric' });
function coachContext() {
  const st = S.settings, p = st.profile || {}, u = st.unit, now = new Date(), today = ymd(now), L = ['<athlete>'];
  L.push(`Now: ${fmtDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${clockTime(nowHHMM(now))}.`);
  const lw = latestWeight(), wlog = logsOf('weight');
  const height = u === 'kg' ? (p.cm ? `${fmt(p.cm)} cm` : '') : (p.ft ? `${p.ft} ft ${p.inch || 0} in` : '');
  const act = ACTIVITY.find(a => a[0] === p.activity);
  L.push(`Profile: ${[p.age ? `${p.age} years old` : 'age not set (goal calculator not used)', p.sex || '', height, lw ? `${fmt(lw, 1)} ${u} (weighed ${dayWord(wlog[wlog.length - 1].date)})` : p.weight ? `${fmt(p.weight, 1)} ${u}` : '',
    GOALS[p.goal] ? `goal: ${GOALS[p.goal][0].toLowerCase()}` : '', act ? `activity: ${act[1].toLowerCase()} (${act[2].toLowerCase()})` : ''].filter(Boolean).join(', ')}. Bats ${st.bats === 'L' ? 'left' : 'right'}. Units: ${u}.`);
  L.push(`Daily goals: ${fmt(st.calGoal)} cal, ${fmt(st.proteinGoal)} g protein${st.carbGoal ? `, ${fmt(st.carbGoal)} g carbs` : ''}${st.fatGoal ? `, ${fmt(st.fatGoal)} g fat` : ''}, ${waterText(st.waterGoal)} water.`);
  L.push(`Training: ${program().name} program, ${MODES[st.mode].label.toLowerCase()} plan, workout time ${clockTime(st.workoutTime)}.`);

  // Today
  const di = dayIdx(now), day = dayPlan(di), level = todayLevel(), done = S.workouts.find(w => w.date === today);
  const exList = d => d.exercises.map(e => `${e.name} ${e.sets}×${e.reps}`).join('; ');
  if (S.active) L.push(`Right now: in the middle of "${S.active.title}" (${S.active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)} sets done).`);
  if (day.type === 'rest') L.push(`Today's plan: rest day${level === 'light' ? ' (they picked Light: ' + exList(dayPlan(LIGHT)) + ')' : ''}.`);
  else L.push(`Today's plan: ${day.title} (${TYPES[day.type]}${day.focus ? ` — ${day.focus}` : ''}), set to ${LEVELS[level].label}${level === 'light' ? ` → Light workout: ${exList(dayPlan(LIGHT))}` : `: ${exList(level === 'moderate' ? levelDay(day, 'moderate') : day)}`}.`);
  if (done) L.push(`Done today: ${done.title} (${LEVELS[done.intensity] ? LEVELS[done.intensity].label : 'Heavy'}, ${fmtDur((done.finishedAt || done.startedAt) - done.startedAt)}${done.rpe ? `, effort ${done.rpe}/10` : ''}).`);
  const c = checkinOf(today);
  L.push(c ? `Check-in today: slept ${c.sleep} h, energy ${c.energy}/5, soreness ${c.sore}/5 → readiness ${readiness(c)} (${readyInfo(readiness(c))[2]}).` : 'Check-in today: not done.');
  const t = dayTotals(today), eaten = S.meals.filter(m => m.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  L.push(`Eaten today: ${fmt(t.cal)} cal, ${fmt(t.pro)} g protein, ${fmt(t.carb)} g carbs, ${fmt(t.fat)} g fat${eaten.length ? ` — ${eaten.map(m => `${MEAL_LABEL[m.meal] || m.meal}: ${m.name} (${fmt(m.cal)} cal, ${fmt(m.pro)} g protein)`).join('; ')}` : ' (nothing logged yet)'}. Water: ${waterText(waterOf(today))}.`);
  L.push(`Meal plan today: ${(PLAN_KINDS.find(([k]) => k === mealPlanToday().kind) || [0, 'Training'])[1].toLowerCase()}.`);

  // The last week or so
  const wk = ymd(addDays(now, -6)), recent = S.workouts.filter(w => w.date >= wk);
  L.push(`Last 7 days: ${recent.length ? `${plural(recent.length, 'workout')} — ${recent.map(w => `${dayWord(w.date)} ${w.title}${w.intensity && w.intensity !== 'heavy' ? ` (${w.intensity})` : ''}`).join('; ')}` : 'no workouts logged'}.`);
  const fed = [...new Set(S.meals.filter(m => m.date >= wk && m.date < today).map(m => m.date))];
  if (fed.length) {
    const tt = fed.map(dayTotals);
    L.push(`Food, last 7 days before today (${plural(fed.length, 'day')} logged): about ${fmt(sum(tt, x => x.cal) / fed.length)} cal and ${fmt(sum(tt, x => x.pro) / fed.length)} g protein a day.`);
  }
  const cks = S.logs.filter(l => l.kind === 'checkin' && l.date >= wk);
  if (cks.length) L.push(`Check-ins, last 7 days: average sleep ${fmt(sum(cks, x => x.sleep) / cks.length, 1)} h, energy ${fmt(sum(cks, x => x.energy) / cks.length, 1)}/5, soreness ${fmt(sum(cks, x => x.sore) / cks.length, 1)}/5.`);

  // Lifts: the best recent set of each exercise (last 8 weeks)
  const since8 = ymd(addDays(now, -56)), best = new Map();
  for (const w of S.workouts) {
    if (w.date < since8) continue;
    for (const e of w.exercises) {
      if (e.track !== 'weight') continue;
      for (const s of e.sets) if (s.done && s.w > 0) { const b = best.get(e.name); if (!b || s.w > b.w || (s.w === b.w && (s.r || 0) > (b.r || 0))) best.set(e.name, { w: s.w, r: s.r, date: w.date }); }
    }
  }
  if (best.size) L.push(`Best sets, last 8 weeks: ${[...best].slice(0, 14).map(([n, b]) => `${n} ${fmt(b.w, 1)}×${b.r ?? '?'} (${shortDate(b.date)})`).join('; ')}.`);
  if (wlog.length >= 2) {
    const old = wlog.filter(l => l.date <= ymd(addDays(now, -28))).pop() || wlog[0], last = wlog[wlog.length - 1];
    if (old !== last) L.push(`Body weight: ${fmt(last.w, 1)} ${u} on ${shortDate(last.date)}, ${fmt(old.w, 1)} on ${shortDate(old.date)} (${last.w >= old.w ? '+' : ''}${fmt(last.w - old.w, 1)} ${u}).`);
  }

  // Baseball
  const arm = armStatus(), throws = logsOf('throw').filter(l => l.date >= wk);
  if (throws.length || arm.until) L.push(`Arm: ${throws.length ? `last 7 days ${throws.map(l => `${shortDate(l.date)} ${throwText(l)}`).join('; ')}` : 'no throwing logged this week'}${arm.until ? `. Pitch Smart rest: no pitching until ${fmtDate(arm.until, { weekday: 'long', month: 'short', day: 'numeric' })}` : ''}${!arm.age ? ' (age not set, so rest days aren\'t tracked)' : ''}.`);
  const games = logsOf('game').filter(g => g.date >= `${now.getFullYear()}-01-01`);
  if (games.length) {
    const s = seasonStats(games);
    L.push(`This year's games: ${games.length} — ${s.b.ab ? `${avgText(s.avg)} AVG / ${avgText(s.obp)} OBP / ${avgText(s.slg)} SLG, ${s.b.hr} HR, ${s.b.sb} SB` : 'no at-bats'}${s.p.outs ? `; pitching ${ipText(s.p.outs)} IP, ${fmt(s.era, 2)} ERA, ${s.p.k} K, ${s.p.bb} BB` : ''}.`);
  }
  const tests = TESTS.map(tt => [tt, bestOf(tt, testLogs(tt.id))]).filter(([, b]) => b);
  if (tests.length) L.push(`Best tests: ${tests.map(([tt, b]) => `${tt.name} ${testFmt(tt, b.v)} (${shortDate(b.date)})`).join('; ')}.`);
  const sw = logsOf('swing').slice(-1)[0];
  if (sw) L.push(`Latest Swing lab (${shortDate(sw.date)}, ${sw.view} view): score ${sw.score}/100; priorities: ${sw.faults.length ? sw.faults.slice(0, 3).map(f => swFaultName(f.id)).join(', ') : 'none'}${sw.strengths && sw.strengths.length ? `; strengths: ${sw.strengths.slice(0, 3).join(', ')}` : ''}.`);
  const plan = S.settings.drillPlan.map(id => DRILL_BY_ID[id]).filter(Boolean);
  if (plan.length) L.push(`Drill plan: ${plan.map(d => d.n).join('; ')}.`);

  // Kitchen and favorites
  const pp = st.pantry, have = pp && isObj(pp.items) ? Object.keys(pp.items) : [];
  if (have.length) L.push(`In their kitchen (Pantry, updated ${daysAgo(pp.updated || Date.now())}): ${have.slice(0, 80).map(id => panName(id) + (pp.items[id].amount ? ` (${pp.items[id].amount})` : '')).join(', ')}. Shopping list: ${pp.shop.filter(s => !s.done).map(s => s.name).join(', ') || 'empty'}.`);
  if (S.foods.length) L.push(`Saved favorite foods: ${sortedFavs().slice(0, 20).map(f => `${f.name} (${fmt(f.cal)} cal, ${fmt(f.pro)} g protein)`).join('; ')}.`);
  L.push('</athlete>');
  return L.join('\n');
}

// ----- Look-ups Claude can ask for while answering (they run here, on the phone) -----
function bestMatches(list, text, q, n) {
  const t = normName(q).replace(/[^a-z0-9 ]/g, ' ').trim(), words = t.split(/\s+/).filter(w => w.length > 1);
  if (!t) return [];
  return list.map(x => {
    const s = normName(text(x)).replace(/[^a-z0-9 ]/g, ' ');
    const score = (s === t ? 100 : 0) + (s.startsWith(t) ? 40 : 0) + (s.includes(t) ? 30 : 0) + words.filter(w => s.includes(w)).length * 10;
    return [x, score];
  }).filter(([, sc]) => sc >= 10).sort((a, b) => b[1] - a[1]).slice(0, n).map(([x]) => x);
}
function coachTool(name, input, job) {
  const i = isObj(input) ? input : {}, u = S.settings.unit;
  const days = (v, d, max) => clamp(Math.round(Number(v)) || d, 1, max), from = n => ymd(addDays(new Date(), -(n - 1)));
  const offer = (o, what) => { if (job.offers.length >= 6) return { content: 'Too many buttons already — skip this one.', error: true }; job.offers.push(o); coachPaint(); return { content: `A button (${what}) is showing under your reply. Nothing changes unless they tap it.` }; };
  switch (name) {
    case 'get_training_history': {
      const n = days(i.days, 28, 365), q = normName(i.exercise || ''), ws = S.workouts.filter(w => w.date >= from(n));
      const lines = [], bests = new Map();
      for (const w of ws.slice(0, 80)) {
        const ex = w.exercises.filter(e => (!q || normName(e.name).includes(q)) && e.sets.some(s => s.done));
        if (q && !ex.length) continue;
        ex.forEach(e => e.sets.filter(s => s.done).forEach(s => {
          const b = bests.get(e.name), better = !b || (e.track === 'weight' ? (s.w || 0) > (b.w || 0) || ((s.w || 0) === (b.w || 0) && (s.r || 0) > (b.r || 0)) : lowerIsBetter(e) ? s.r < b.r : (s.r || 0) > (b.r || 0));
          if (better && (s.w || s.r)) bests.set(e.name, { ...s, e, date: w.date });
        }));
        lines.push(`${w.date} ${w.title} — ${w.mode}, ${LEVELS[w.intensity] ? LEVELS[w.intensity].label : 'Heavy'}, ${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)}${w.early ? ', ended early' : ''}${w.rpe ? `, effort ${w.rpe}/10` : ''}: ${ex.map(e => `${e.name} ${e.sets.filter(s => s.done).map(s => setTxt(e, s)).join(', ')}`).join(' | ') || 'no sets logged'}${w.notes ? ` [notes: ${w.notes.slice(0, 200)}]` : ''}`);
      }
      if (!lines.length) return { content: `No workouts${q ? ` with "${i.exercise}"` : ''} logged in the last ${n} days.` };
      return { content: `Weights in ${u}. ${plural(lines.length, 'workout')} in the last ${n} days, newest first:\n${lines.join('\n')}\nBest sets: ${[...bests].map(([nm, b]) => `${nm} ${setTxt(b.e, b)} (${b.date})`).join('; ')}` };
    }
    case 'get_food_log': {
      const n = days(i.days, 7, 60), st = S.settings, lines = [];
      for (let k = 0; k < n; k++) {
        const d = ymd(addDays(new Date(), -k)), list = S.meals.filter(m => m.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const t = dayTotals(d), water = waterOf(d);
        if (!list.length && !water) continue;
        lines.push(`${d}: ${fmt(t.cal)} cal, ${fmt(t.pro)} g protein, ${fmt(t.carb)} g carbs, ${fmt(t.fat)} g fat, water ${waterText(water)}${list.length && k < 14 ? ` — ${list.map(m => `${m.time || ''} ${MEAL_LABEL[m.meal] || m.meal}: ${m.name}${m.servings && m.servings !== 1 ? ` ×${fmt(m.servings, 2)}` : ''} (${fmt(m.cal)} cal, ${fmt(m.pro)} P, ${m.carb != null ? fmt(m.carb) : '?'} C, ${m.fat != null ? fmt(m.fat) : '?'} F)`).join('; ')}` : ''}`);
      }
      if (!lines.length) return { content: `Nothing logged in the last ${n} days.` };
      return { content: `Goals: ${fmt(st.calGoal)} cal, ${fmt(st.proteinGoal)} g protein${st.carbGoal ? `, ${fmt(st.carbGoal)} g carbs` : ''}${st.fatGoal ? `, ${fmt(st.fatGoal)} g fat` : ''}, ${waterText(st.waterGoal)} water. Days with entries, newest first:\n${lines.join('\n')}` };
    }
    case 'get_body_and_recovery': {
      const n = days(i.days, 30, 365), f = from(n);
      const w = logsOf('weight').filter(l => l.date >= f), c = logsOf('checkin').filter(l => l.date >= f);
      if (!w.length && !c.length) return { content: `No body weight or check-ins in the last ${n} days.` };
      return { content: `Body weight (${u}): ${w.length ? w.slice(-60).map(l => `${l.date} ${fmt(l.w, 1)}`).join(', ') : 'none'}\nCheck-ins (sleep h / energy 1–5 / soreness 1–5 → readiness): ${c.length ? c.slice(-60).map(l => `${l.date} ${l.sleep}/${l.energy}/${l.sore} → ${readiness(l)}`).join(', ') : 'none'}` };
    }
    case 'get_baseball_data': {
      const n = days(i.days, 60, 365), f = from(n), part = ['games', 'tests', 'arm', 'practice', 'swing'].includes(i.section) ? i.section : 'all', out = [];
      const want = k => part === 'all' || part === k;
      if (want('games')) {
        const g = logsOf('game').filter(x => x.date >= f);
        if (g.length) {
          const s = seasonStats(g);
          out.push(`Games (last ${n} days): ${g.length}. Batting ${s.b.ab} AB, ${s.b.h} H, ${s.b.d} 2B, ${s.b.t} 3B, ${s.b.hr} HR, ${s.b.bb} BB, ${s.b.k} K, ${s.b.rbi} RBI, ${s.b.sb} SB → ${avgText(s.avg)} AVG / ${avgText(s.obp)} OBP / ${avgText(s.slg)} SLG.${s.p.outs ? ` Pitching ${ipText(s.p.outs)} IP, ${s.p.h} H, ${s.p.er} ER, ${s.p.bb} BB, ${s.p.k} K → ${fmt(s.era, 2)} ERA, ${fmt(s.whip, 2)} WHIP.` : ''}`,
            ...g.slice(-25).map(x => `${x.date}${x.opp ? ` vs ${x.opp}` : ''}${x.result ? ` ${x.result}${x.score ? ' ' + x.score : ''}` : ''}: ${x.bat.ab ? `${x.bat.h}-for-${x.bat.ab}${x.bat.hr ? `, ${x.bat.hr} HR` : ''}${x.bat.d ? `, ${x.bat.d} 2B` : ''}${x.bat.bb ? `, ${x.bat.bb} BB` : ''}${x.bat.k ? `, ${x.bat.k} K` : ''}${x.bat.rbi ? `, ${x.bat.rbi} RBI` : ''}` : 'no at-bats'}${x.pitch ? `; pitched ${ipText(x.pitch.outs)} IP, ${x.pitch.er} ER, ${x.pitch.k} K, ${x.pitch.bb} BB${x.pitch.pc ? `, ${x.pitch.pc} pitches` : ''}` : ''}${x.note ? ` [${x.note.slice(0, 120)}]` : ''}`));
        } else out.push(`Games: none logged in the last ${n} days.`);
      }
      if (want('tests')) {
        const lines = TESTS.map(t => { const l = testLogs(t.id); if (!l.length) return ''; const b = bestOf(t, l), last = l[l.length - 1]; return `${t.name}: best ${testFmt(t, b.v)} (${b.date}), latest ${testFmt(t, last.v)} (${last.date}), ${l.length} logged${t.good ? `; strong high-school mark ${t.lower ? '≤' : '≥'} ${testFmt(t, t.good)}` : ''}`; }).filter(Boolean);
        out.push(lines.length ? `Tests:\n${lines.join('\n')}` : 'Tests: none logged.');
      }
      if (want('arm')) {
        const a = armStatus(), th = logsOf('throw').filter(x => x.date >= f);
        out.push(`Arm (Pitch Smart ${a.rule ? `for age ${a.age}: max ${a.rule.max} pitches a day` : 'rest days not tracked — no age set'})${a.until ? `: no pitching until ${ymd(a.until)} (after ${a.from.count} pitches on ${a.from.date})` : ': no required rest right now'}.\nThrowing (last ${n} days): ${th.length ? th.slice(-40).map(x => `${x.date} ${throwText(x)}`).join('; ') : 'none'}`);
      }
      if (want('practice')) {
        const sk = logsOf('skill').filter(x => x.date >= f);
        out.push(`Practice (last ${n} days): ${sk.length ? sk.slice(-40).map(x => `${x.date} ${skillText(x)}`).join('; ') : 'none'}. Drill plan: ${S.settings.drillPlan.map(id => DRILL_BY_ID[id]).filter(Boolean).map(d => `${d.id} (${d.n})`).join(', ') || 'empty'}.`);
      }
      if (want('swing')) {
        const sws = logsOf('swing').slice(-3).reverse();
        out.push(sws.length ? sws.map(r => `Swing lab ${r.date}: ${r.view} view, bats ${r.bats}, score ${r.score}/100 (${swScoreWord(r.score)}), confidence ${r.confidence}.\nPriorities: ${r.faults.map(x => `${swFaultName(x.id)} [${x.id}] (severity ${x.sev}${x.evidence ? `: ${x.evidence}` : ''})`).join('; ') || 'none'}.\nStrengths: ${(r.strengths || []).join('; ') || '–'}.\nMeasurements: ${r.metrics.filter(m => m.value != null).map(m => `${m.label} ${fmt(m.value, 1)}${m.unit || ''} (${m.status}${m.target ? `, target ${m.target}` : ''})`).join('; ')}`).join('\n\n') : 'Swing lab: no analyses yet.');
      }
      return { content: out.join('\n\n') };
    }
    case 'get_plan': {
      const mode = MODES[i.mode] ? i.mode : S.settings.mode, di = dayIdx();
      const dayTxt = (d, label) => `${label}: ${d.title} (${TYPES[d.type]}${d.focus ? ` — ${d.focus}` : ''})${d.exercises.length ? `\n${d.exercises.map(e => `  - ${e.name}: ${e.sets} × ${e.reps}${e.rest ? `, rest ${restLabel(e.rest)}` : ''}${e.track === 'check' ? '' : ` (${TRACK_SHORT[e.track]})`}${e.cues ? ` — ${e.cues.slice(0, 160)}` : ''}`).join('\n')}` : ''}`;
      return { content: `${program().name} program, ${MODES[mode].label} plan (today is ${DAYS[di]}, set to ${LEVELS[todayLevel()].label}):\n${planFor(mode).map((d, k) => dayTxt(d, DAYS[k])).join('\n')}\n${dayTxt(S.plan.light[mode], 'Light workout')}` };
    }
    case 'look_up': {
      const q = String(i.query || '').slice(0, 80);
      if (!q.trim()) return { content: 'Say what to look up.', error: true };
      if (i.type === 'exercise') {
        const hits = bestMatches(Object.keys(EXERCISE_INFO), x => x, q, 3);
        return { content: hits.length ? hits.map(n => { const x = EXERCISE_INFO[n]; return `${n}\nWorks: ${x.muscles}. Why: ${x.why}\nHow: ${x.steps.join(' ')}\nMistakes: ${x.mistakes.join('; ')}\nEasier: ${x.easier}. Harder: ${x.harder}.${x.swap && x.swap.length ? ` Swaps: ${x.swap.join(', ')}.` : ''}`; }).join('\n\n') : `No exercise called "${q}" in the library.` };
      }
      if (i.type === 'recipe') {
        const hits = bestMatches(RECIPES, r => `${r.name} ${r.ing.join(' ')}`, q, 3);
        return { content: hits.length ? hits.map(r => `${r.name} (${r.meals.map(k => MEAL_LABEL[k]).join(', ')}; ${r.min} min; makes ${r.makes}). Per serving: ${r.cal} cal, ${r.pro} g protein, ${r.carb} g carbs, ${r.fat} g fat. ${r.why}\nIngredients: ${r.ing.join('; ')}\nSteps: ${r.steps.join(' ')}`).join('\n\n') : `No recipe matching "${q}".` };
      }
      if (i.type === 'food') {
        const list = [...S.foods.map(f => ({ ...f, fav: true })), ...FOODS];
        const hits = bestMatches(list, f => f.name, q, 8);
        return { content: hits.length ? hits.map(f => `${f.name}${f.fav ? ' (their favorite)' : ''} — ${f.serving || '1 serving'}: ${fmt(f.cal)} cal, ${fmt(f.pro, 1)} g protein, ${f.carb != null ? fmt(f.carb, 1) : '?'} g carbs, ${f.fat != null ? fmt(f.fat, 1) : '?'} g fat`).join('\n') : `"${q}" isn't in the app's food list — use standard nutrition data.` };
      }
      if (i.type === 'drill') {
        const hits = bestMatches(DRILLS, d => `${d.n} ${d.id} ${d.pos.join(' ')}`, q, 3);
        return { content: hits.length ? hits.map(d => `${d.n} [${d.id}] — ${d.who === 'solo' ? 'alone' : 'with a partner'}; gear: ${d.gear}; dose: ${d.dose}. ${d.why}\nSteps: ${d.steps.join(' ')}\nCues: ${d.cues.join('; ')}\nAvoid: ${d.avoid.join('; ')}\nHarder: ${d.harder}${d.fixes && d.fixes.length ? `\nHelps: ${d.fixes.map(swFaultName).join(', ')}` : ''}`).join('\n\n') : `No drill matching "${q}".` };
      }
      if (i.type === 'swing_problem') {
        const hits = bestMatches(Object.entries(SWING_FAULTS), ([id, f]) => `${id} ${f.name}`, q, 2);
        return { content: hits.length ? hits.map(([id, f]) => `${f.name} [${id}]: ${f.what} ${f.why} Cue: "${f.cue}". Drills that help: ${DRILLS.filter(d => (d.fixes || []).includes(id)).map(d => `${d.id} (${d.n}, ${d.who === 'solo' ? 'alone' : 'partner'})`).join(', ') || 'none listed'}.`).join('\n\n') : `No swing problem matching "${q}".` };
      }
      return { content: 'type must be exercise, recipe, food, drill or swing_problem.', error: true };
    }
    case 'offer_food_log': {
      const nm = String(i.name || '').trim().slice(0, 80), n0 = (v, max) => clamp(Math.round((Number(v) || 0) * 10) / 10, 0, max);
      if (!nm || !(Number(i.cal) > 0)) return { content: 'A food needs a name and calories.', error: true };
      return offer({ kind: 'food', name: nm, meal: MEAL_LABEL[i.meal] ? i.meal : guessMeal(), servings: clamp(Number(i.servings) || 1, 0.25, 10),
        cal: Math.round(n0(i.cal, 5000)), pro: n0(i.pro, 400), carb: n0(i.carb, 800), fat: n0(i.fat, 300) }, `Log ${nm}`);
    }
    case 'offer_shopping_list': {
      const items = (Array.isArray(i.items) ? i.items : []).map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 15);
      return items.length ? offer({ kind: 'shop', items }, `add ${plural(items.length, 'item')} to the shopping list`) : { content: 'No items given.', error: true };
    }
    case 'offer_intensity':
      return LEVELS[i.level] ? offer({ kind: 'level', level: i.level }, `switch today to ${LEVELS[i.level].label}`) : { content: 'level must be light, moderate or heavy.', error: true };
    case 'offer_drills': {
      const ids = [...new Set((Array.isArray(i.drill_ids) ? i.drill_ids : []).map(String))].filter(id => DRILL_BY_ID[id]).slice(0, 8);
      return ids.length ? offer({ kind: 'drills', ids }, `add ${plural(ids.length, 'drill')} to the drill plan`) : { content: 'None of those are drill ids from the library.', error: true };
    }
    case 'offer_screen':
      return COACH_SCREENS[i.screen] ? offer({ kind: 'screen', screen: i.screen }, COACH_SCREENS[i.screen][0]) : { content: 'Unknown screen.', error: true };
  }
  return { content: `Unknown tool ${name}.`, error: true };
}

// ----- The buttons Claude can offer -----
const COACH_SCREENS = {
  today: ['Open Today', () => { S.tab = 'today'; }],
  plan: ['Open your plan', () => { S.tab = 'plan'; S.planDay = dayIdx(); }],
  light_workout: ['Open the Light workout', () => { S.tab = 'plan'; S.planDay = LIGHT; }],
  drills: ['Open Drills', () => { S.tab = 'baseball'; S.ballView = 'drills'; }],
  swing_lab: ['Open the Swing lab', () => { S.tab = 'baseball'; S.ballView = 'swing'; S.swingOpen = null; }],
  games_and_arm: ['Open Games & arm', () => { S.tab = 'baseball'; S.ballView = 'stats'; }],
  food_log: ['Open today\'s food log', () => { S.tab = 'diet'; S.dietView = 'day'; S.dietDate = ymd(); }],
  meal_plan: ['Open the meal plan', () => { S.tab = 'diet'; S.dietView = 'meals'; }],
  pantry: ['Open the Pantry', () => { S.tab = 'diet'; S.dietView = 'pantry'; }],
  progress_lifts: ['Open lift progress', () => { S.tab = 'progress'; S.progView = 'lifts'; }],
  progress_body: ['Open body progress', () => { S.tab = 'progress'; S.progView = 'body'; }],
  goal_calculator: ['Open the goal calculator', () => { S.tab = 'settings'; later(() => actions.calcGoals()); }]
};
function offerHtml(o, m, k) {
  const btn = (label, ic) => (o.done ? `<span class="coach-done">${icon('check', 'sm')} Done</span>` : `<button class="btn btn-sm btn-primary" data-action="coachOffer" data-m="${m.id}" data-o="${k}">${ic ? icon(ic, 'sm') : ''} ${label}</button>`);
  if (o.kind === 'food') return `<div class="coach-offer"><div class="grow"><b>${esc(o.name)}</b><small>${MEAL_LABEL[o.meal]} · ${o.servings !== 1 ? `${fmt(o.servings, 2)} × ` : ''}${fmt(o.cal)} cal · ${fmt(o.pro)} g protein</small></div>${btn('Log it', 'plus')}</div>`;
  if (o.kind === 'shop') return `<div class="coach-offer"><div class="grow"><b>Shopping list</b><small>${esc(o.items.join(', '))}</small></div>${btn('Add', 'plus')}</div>`;
  if (o.kind === 'level') return `<div class="coach-offer"><div class="grow"><b>Today: ${LEVELS[o.level].label}</b><small>${esc(LEVELS[o.level].sub)}</small></div>${btn('Switch', 'check')}</div>`;
  if (o.kind === 'drills') return `<div class="coach-offer"><div class="grow"><b>Drill plan</b><small>${esc(o.ids.map(id => DRILL_BY_ID[id].n).join(', '))}</small></div>${btn('Add', 'plus')}</div>`;
  if (o.kind === 'screen') return `<div class="coach-offer"><div class="grow"><b>${esc(COACH_SCREENS[o.screen][0])}</b></div><button class="btn btn-sm btn-ghost" data-action="coachOffer" data-m="${m.id}" data-o="${k}" aria-label="${esc(COACH_SCREENS[o.screen][0])}">${icon('right', 'sm')}</button></div>`;
  return '';
}
actions.coachOffer = el => {
  const m = (S.coach ? S.coach.msgs : []).find(x => x.id === el.dataset.m), o = m && m.offers[Number(el.dataset.o)];
  if (!o || o.done) return;
  if (o.kind === 'screen') { COACH_SCREENS[o.screen][1](); render({ keepScroll: false }); return; }
  let msg = '', undo = null;
  if (o.kind === 'food') {
    const s = o.servings || 1;
    const meal = { id: uid(), date: ymd(), time: nowHHMM(), meal: o.meal, name: o.name, servings: s, cal: Math.round(o.cal * s), pro: r1(o.pro * s), carb: r1(o.carb * s), fat: r1(o.fat * s), createdAt: Date.now() };
    S.meals.push(meal); save(() => DB.put('meals', meal));
    msg = `Logged ${o.name}`; undo = () => { removeMeal(meal.id); o.done = false; saveCoach(); render(); };
  } else if (o.kind === 'shop') {
    const n = o.items.filter(x => { const hits = PANTRY.findInText(x); return addToShop(x, hits.length === 1 ? hits[0] : null); }).length;
    saveSettings(); msg = n ? `Added ${plural(n, 'item')} to your shopping list` : 'Already on your shopping list';
  } else if (o.kind === 'level') {
    const was = S.settings.intensity;
    S.settings.intensity = { date: ymd(), level: o.level }; saveSettings();
    msg = `Today is set to ${LEVELS[o.level].label}`; undo = () => { S.settings.intensity = was; saveSettings(); o.done = false; saveCoach(); render(); };
  } else if (o.kind === 'drills') {
    const was = [...S.settings.drillPlan], wasFrom = S.settings.drillPlanFrom;
    S.settings.drillPlan = [...new Set([...S.settings.drillPlan, ...o.ids])]; S.settings.drillPlanFrom = ''; saveSettings();
    msg = `Added to your drill plan`; undo = () => { S.settings.drillPlan = was; S.settings.drillPlanFrom = wasFrom; saveSettings(); o.done = false; saveCoach(); render(); };
  }
  o.done = true; saveCoach(); render();
  toast(msg, undo ? { action: undo } : {});
};

// ----- Chat text: a small, safe Markdown (bold, italics, lists, headings, tables, links) -----
function coachMd(src) {
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (x, t, url) => `<a href="${url}" target="_blank" rel="noopener" data-external>${t}</a>`);
  const out = [], lines = String(src || '').replace(/\r/g, '').split('\n');
  let list = null, para = [], table = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; }
    if (list) { out.push(`<${list.tag}>${list.items.map(x => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`); list = null; }
    if (table.length) {
      const rows = table.filter(r => !/^\|?[\s:|-]+\|?$/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      if (rows.length) out.push(`<div class="md-table"><table><thead><tr>${rows[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      table = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd(), t = line.trim();
    let m;
    if (!t) { flush(); continue; }
    if (t.startsWith('|')) { if (para.length || list) flush(); table.push(t); continue; }     // (while a table is open, nothing else is)
    if (table.length) flush();
    if ((m = t.match(/^#{1,4}\s+(.*)$/))) { flush(); out.push(`<div class="md-h">${inline(m[1])}</div>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); out.push('<hr>'); continue; }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { if (para.length || (list && list.tag !== 'ul')) flush(); list = list || { tag: 'ul', items: [] }; list.items.push(m[1]); continue; }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { if (para.length || (list && list.tag !== 'ol')) flush(); list = list || { tag: 'ol', items: [] }; list.items.push(m[1]); continue; }
    if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ' ' + t; continue; }   // a wrapped list line
    if (list) flush();
    para.push(t);
  }
  flush();
  return out.join('');
}

// ----- The chat screen -----
const COACH_PROBLEM = {
  badkey: 'Claude didn\'t accept your API key. Check it in Settings → Claude AI.',
  credit: 'Your Anthropic account is out of credit. Add some at console.anthropic.com (Billing).',
  busy: 'Claude is busy right now. Wait a minute and try again.',
  offline: 'Couldn\'t reach Claude. Check your internet connection and try again.',
  refusal: 'Coach can\'t help with that one. Try asking it a different way.',
  interrupted: 'Dugout closed before Coach finished.',
  ai: 'Something went wrong on the way. Try again in a moment.'
};
function coachSuggestions() {
  const out = [`What should I eat before my ${clockTime(S.settings.workoutTime)} workout?`];
  out.push(checkinOf(ymd()) ? 'Based on my check-in, how hard should I go today?' : 'How hard should I train today?');
  const sw = logsOf('swing').slice(-1)[0];
  out.push(sw && sw.faults.length ? `How do I fix my ${swFaultName(sw.faults[0].id).toLowerCase()}?` : 'How can I hit the ball harder?');
  out.push(S.workouts.length >= 3 ? 'How are my lifts progressing?' : `What should I focus on in my ${program().name.toLowerCase()} program?`);
  out.push(S.meals.some(m => m.date === ymd()) ? 'Am I on track with my food today?' : 'How much protein do I need, and from what foods?');
  if (panIds().length >= 5) out.push('What can I cook with what\'s in my kitchen?');
  out.push('Give me a 15-minute arm care routine');
  return out.slice(0, 7);
}
const coachCents = d => (d < 0.995 ? `${Math.max(1, Math.round(d * 100))}¢` : `$${d.toFixed(2)}`);
function coachMsgHtml(m) {
  if (m.who === 'me') return `<div class="coach-msg me"><div class="bubble">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`;
  const live = coachJob && coachJob.id === m.id, text = live ? coachJob.text : m.text, looked = live ? coachJob.looked : m.looked || [];
  return `<div class="coach-msg bot" id="cm-${m.id}">
    <div class="coach-looked"${looked.length ? '' : ' hidden'}>${icon('check', 'sm')} <span>Looked at ${looked.map(k => COACH_LOOK[k]).join(', ')}</span></div>
    <div class="bubble md">${text ? coachMd(text) : live ? '<span class="coach-typing" aria-label="Coach is thinking"><i></i><i></i><i></i></span>' : ''}</div>
    <div class="coach-offers">${(m.offers || []).map((o, k) => offerHtml(o, m, k)).join('')}</div>
    ${m.failed ? `<div class="coach-fail">${esc(COACH_PROBLEM[m.failed] || COACH_PROBLEM.ai)} <button class="btn-link inline-link" data-action="coachRetry" data-id="${m.id}">Try again</button>${m.failed === 'badkey' || m.failed === 'credit' ? ` · <button class="btn-link inline-link" data-action="aiSetup">Check key</button>` : ''}</div>` : ''}
    ${m.stop === 'max_tokens' ? '<div class="hint">That answer was cut off — ask Coach to keep going.</div>' : m.stop === 'stopped' ? '<div class="hint">Stopped.</div>' : ''}
  </div>`;
}
function renderCoach() {
  const c = S.coach, msgs = c ? c.msgs : [], key = !!aiKey();
  const intro = !key ? `<section class="card hero">
      <span class="badge accent">${icon('sparkle')} AI coach</span>
      <div class="card-title">Ask anything about your training, food and baseball</div>
      <p class="text-2 small">Coach knows your plan, workouts, food log, check-ins, goals, swing analyses and stats — so the answers are about you. What to eat before practice, why a lift stalled, how hard to go today, how to fix your swing, what your numbers mean…</p>
      <button class="btn btn-primary btn-block" data-action="aiSetup">${icon('sparkle', 'sm')} Connect Claude</button>
      <p class="hint">Coach runs on Claude, Anthropic's AI, with your own API key — usually a few cents a question. Settings → Claude AI explains how.</p>
    </section>
    <div class="section-title">You could ask</div>
    <div class="card"><ul class="steps">${coachSuggestions().slice(0, 5).map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>`
    : !msgs.length ? `<section class="card coach-hello">
      <div class="row">${icon('sparkle')}<b>Hi! I'm your Coach.</b></div>
      <p class="text-2 small">I can see your plan, workouts, food, check-ins, goals and baseball logs in Dugout. Ask me anything — what to eat, how hard to train, how to fix your swing, what a stat means.</p>
      <div class="coach-sugg">${coachSuggestions().map(q => `<button class="chip" data-action="coachAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <p class="hint">Your question and a summary of your Dugout data go to Anthropic to answer it.</p>
    </section>` : '';
  const turns = msgs.filter(m => m.who === 'me').length;
  return `<div class="page coach-page">
    <div class="page-head"><div><div class="eyebrow">Ask anything</div><h1 class="page-title">Coach</h1></div>
      ${msgs.length ? `<button class="btn btn-sm btn-ghost" data-action="coachNew">${icon('plus', 'sm')} New chat</button>` : ''}</div>
    ${intro}
    <div class="coach-log" id="coach-log">${msgs.map(coachMsgHtml).join('')}</div>
    ${msgs.length && c.cost ? `<p class="hint center">This chat so far: about ${coachCents(c.cost)}${turns >= 15 ? ' · long chats cost more per question — tap New chat to start fresh' : ''}</p>` : ''}
    ${key ? `<form class="coach-bar" novalidate data-submit="coachSend">
      <textarea id="coach-q" name="q" rows="1" maxlength="2000" placeholder="Ask Coach anything…" aria-label="Your question for Coach" data-input="coachDraft">${esc(S.coachDraft || '')}</textarea>
      ${coachJob ? `<button type="button" class="btn btn-icon coach-send" data-action="coachStop" aria-label="Stop">${icon('x')}</button>`
        : `<button type="submit" class="btn btn-icon btn-primary coach-send" aria-label="Send">${icon('up')}</button>`}
    </form>` : ''}
  </div>`;
}
// While a reply streams in, only its bubble is redrawn (at most once a frame).
let coachPaintQueued = false;
function coachPaint() {
  if (coachPaintQueued) return;
  coachPaintQueued = true;
  requestAnimationFrame(() => {
    coachPaintQueued = false;
    const job = coachJob, el = job && $(`#cm-${job.id}`);
    if (!el) return;
    const view = $('#view'), atBottom = view.scrollHeight - view.scrollTop - view.clientHeight < 120;
    $('.bubble', el).innerHTML = job.text ? coachMd(job.text) : '<span class="coach-typing" aria-label="Coach is thinking"><i></i><i></i><i></i></span>';
    const lk = $('.coach-looked', el);
    lk.hidden = !job.looked.length;
    $('span', lk).textContent = `Looked at ${job.looked.map(k => COACH_LOOK[k]).join(', ')}`;
    const m = S.coach && S.coach.msgs.find(x => x.id === job.id);
    if (m) $('.coach-offers', el).innerHTML = m.offers.map((o, k) => offerHtml(o, m, k)).join('');
    if (atBottom) view.scrollTop = view.scrollHeight;
  });
}
const coachScroll = () => later(() => { const v = $('#view'); v.scrollTop = v.scrollHeight; });
inputs.coachDraft = el => {
  S.coachDraft = el.value;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
};
// Enter sends (Shift+Enter for a new line) on a keyboard; the phone keyboard's return key adds a line.
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.id === 'coach-q' && matchMedia('(hover: hover)').matches) {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
});
submits.coachSend = f => {
  const q = (formData(f).q || '').trim();
  if (!q) return;
  if (coachJob) { toast('Coach is still answering — tap × to stop it'); return; }
  coachAsk(q);
};
actions.coachAsk = el => coachAsk(el.dataset.q);
actions.coachStop = () => {
  const job = coachJob;
  if (!job) return;
  job.ac.abort();
};
actions.coachRetry = el => {
  const c = S.coach, k = c ? c.msgs.findIndex(m => m.id === el.dataset.id) : -1;
  if (k < 1 || coachJob || c.msgs[k - 1].who !== 'me') return;
  const q = c.msgs[k - 1].text;
  c.msgs.splice(k - 1, 2);
  coachAsk(q);
};
actions.coachNew = async () => {
  if (!(await confirmBox('Start a new chat?', 'This chat will be cleared from this phone. Coach still knows everything in your Dugout.', { ok: 'New chat' }))) return;
  if (coachJob) { coachJob.ac.abort(); coachJob = null; }
  S.coach = { msgs: [], api: [], cost: 0 };
  saveCoach(); render({ keepScroll: false });
};

async function coachAsk(question) {
  question = String(question || '').trim().slice(0, 2000);
  if (!question || coachJob) return;
  if (!aiKey()) { actions.aiSetup(); return; }
  if (typeof COACH === 'undefined') { toast('Coach is still loading — try again in a moment'); return; }
  const c = coachChat(), bot = { id: uid(), who: 'coach', text: '', at: Date.now(), offers: [], looked: [] };
  c.msgs.push({ id: uid(), who: 'me', text: question, at: Date.now() }, bot);
  if (c.msgs.length > 200) c.msgs = c.msgs.slice(-200);
  const job = coachJob = { ac: new AbortController(), id: bot.id, text: '', looked: bot.looked, offers: bot.offers };
  S.coachDraft = '';
  S.tab = 'coach';
  coachScroll(); render();
  try {
    const res = await COACH.reply({
      key: aiKey(), knowledge: coachGuideText(), history: c.api.slice(-COACH_TURNS).flat(), question, context: coachContext(), signal: job.ac.signal,
      runTool: async (name, input) => { try { return coachTool(name, input, job); } catch (e) { console.error(e); return { content: 'That look-up failed on the phone.', error: true }; } },
      onText: t => { job.text = t; coachPaint(); },
      onTool: name => { if (COACH_LOOK[name] && !job.looked.includes(name)) job.looked.push(name); coachPaint(); }
    });
    if (coachJob !== job) return;                               // a new chat was started meanwhile
    bot.text = res.text || job.text;
    bot.cost = COACH.cost(res.usage); c.cost = (c.cost || 0) + bot.cost;
    if (res.stop === 'refusal') { bot.failed = 'refusal'; bot.text = ''; }      // a declined answer's partial text isn't shown
    else if (res.stop === 'max_tokens') bot.stop = 'max_tokens';
    if (res.turn) { c.api.push(res.turn); if (c.api.length > 40) c.api = c.api.slice(-40); }
    if (!bot.text && !bot.failed) bot.failed = 'ai';
  } catch (e) {
    if (coachJob !== job) return;
    bot.text = job.text;
    if (e && e.code === 'cancelled') bot.stop = 'stopped';
    else { bot.failed = COACH_PROBLEM[e && e.code] ? e.code : 'ai'; if (!COACH_PROBLEM[e && e.code] || e.code === 'ai') console.error(e); }
  } finally {
    if (coachJob === job) coachJob = null;
  }
  if (S.locked) return;
  saveCoach();
  if (S.tab === 'coach') { const v = $('#view'), atBottom = v.scrollHeight - v.scrollTop - v.clientHeight < 160; render(); if (atBottom) v.scrollTop = v.scrollHeight; }
}

// Loaded chats: only what the screen and the API understand; a reply cut short by closing the app says so.
function cleanCoach(c) {
  if (!isObj(c) || !Array.isArray(c.msgs)) return null;
  const okOffer = o => isObj(o) && ((o.kind === 'food' && typeof o.name === 'string' && MEAL_LABEL[o.meal] && [o.cal, o.pro, o.carb, o.fat, o.servings].every(v => Number.isFinite(v) && v >= 0))
    || (o.kind === 'shop' && Array.isArray(o.items) && o.items.every(x => typeof x === 'string'))
    || (o.kind === 'level' && LEVELS[o.level]) || (o.kind === 'drills' && Array.isArray(o.ids) && o.ids.every(id => DRILL_BY_ID[id]))
    || (o.kind === 'screen' && COACH_SCREENS[o.screen]));
  const msgs = c.msgs.filter(m => isObj(m) && typeof m.text === 'string' && (m.who === 'me' || m.who === 'coach')).slice(-200).map(m => (m.who === 'me'
    ? { id: String(m.id || uid()), who: 'me', text: m.text.slice(0, 2000), at: Number(m.at) || 0 }
    : { id: String(m.id || uid()), who: 'coach', text: m.text.slice(0, 30000), at: Number(m.at) || 0, offers: (Array.isArray(m.offers) ? m.offers : []).filter(okOffer),
      looked: (Array.isArray(m.looked) ? m.looked : []).filter(k => COACH_LOOK[k]), cost: Number(m.cost) || 0,
      ...(COACH_PROBLEM[m.failed] ? { failed: m.failed } : !m.text ? { failed: 'interrupted' } : {}), ...(['max_tokens', 'stopped'].includes(m.stop) ? { stop: m.stop } : {}) }));
  const api = (Array.isArray(c.api) ? c.api : []).filter(t => Array.isArray(t) && t.length && t.every(x => isObj(x) && ['user', 'assistant', 'system'].includes(x.role))).slice(-40);
  return { msgs, api, cost: Number(c.cost) || 0 };
}

/* ============================== 9. PROGRESS TAB (charts + history) ============================== */

// Round, readable axis numbers (0, 250, 500 …)
function niceTicks(lo, hi, count = 4) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].find(s => s * mag >= raw) * mag;
  const ticks = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}
const tickLabel = v => (Math.abs(v) >= 10000 ? fmtK(v) : fmt(v, 1));

// Column chart (weekly calories / protein) with a goal line. Tap a column for its value.
function barChart(sel, data, { goal, cls, unit, label }) {
  const el = $(sel);
  if (!el) return;
  const W = Math.max(260, el.clientWidth || 320), H = 190, L = 44, R = 10, T = 18, B = 26;
  const top = niceTicks(0, Math.max(goal || 0, ...data.map(d => d.v), 1) * 1.08, 4);
  const max = top[top.length - 1];
  const y = v => T + (H - T - B) * (1 - v / max);
  const step = (W - L - R) / data.length, bw = Math.min(24, step * 0.62);
  const cx = i => L + step * (i + 0.5);
  const col = (x, yTop, w, h) => {
    const r = Math.min(4, w / 2, h);
    return `M${x},${yTop + h}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yTop + h}Z`;
  };
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label || `${unit === 'g' ? 'Protein' : 'Calories'} for each day of the week`)}">`;
  top.forEach(t => { s += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${tickLabel(t)}</text>`; });
  data.forEach((d, i) => {
    if (d.v > 0) s += `<path class="bar ${cls}" data-i="${i}" d="${col(cx(i) - bw / 2, y(d.v), bw, y(0) - y(d.v))}"/>`;
    s += `<text class="tick" x="${cx(i)}" y="${H - 7}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  s += `<line class="baseline" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  if (goal) s += `<line class="goal" x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}"/><text class="goal-label" x="${W - R}" y="${y(goal) - 6}" text-anchor="end">Goal ${fmt(goal)}${unit === 'g' ? ' g' : ''}</text>`;
  data.forEach((d, i) => { s += `<rect class="bar-hit" x="${L + step * i}" y="${T}" width="${step}" height="${H - T}" data-i="${i}"/>`; });
  el.innerHTML = s + '</svg><div class="chart-tip"></div>';

  const tip = $('.chart-tip', el);
  const hide = () => { tip.classList.remove('show'); $$('.bar', el).forEach(b => b.classList.remove('dim')); };
  const show = ev => {
    const hit = ev.target.closest && ev.target.closest('.bar-hit');
    if (!hit) return;
    const i = +hit.dataset.i, d = data[i];
    tip.innerHTML = `<b>${fmt(d.v, 1)} ${unit}</b>${esc(d.full)}`;
    tip.style.left = `${clamp(cx(i), 55, W - 55)}px`;
    tip.style.top = `${Math.min(y(d.v), goal ? y(goal) : H) - 8}px`;
    tip.classList.add('show');
    $$('.bar', el).forEach(b => b.classList.toggle('dim', +b.dataset.i !== i));
    if (ev.pointerType !== 'mouse') { clearTimeout(el._hide); el._hide = setTimeout(hide, 2500); }
  };
  el.onpointerdown = show;
  el.onpointermove = show;
  el.onpointerleave = ev => { if (ev.pointerType === 'mouse') hide(); };
}

// Line chart over time with a crosshair. Drag or tap to read any point.
function lineChart(sel, pts, { fmtV }) {
  const el = $(sel);
  if (!el) return;
  if (!pts.length) { el.innerHTML = '<div class="chart-empty">Nothing logged in this time range.</div>'; return; }
  const W = Math.max(260, el.clientWidth || 320), H = 210, L = 46, R = 16, T = 24, B = 28;
  const vals = pts.map(p => p.v);
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const padV = (vMax - vMin) * 0.15 || Math.max(1, Math.abs(vMax) * 0.1);
  const ticks = niceTicks(Math.max(0, vMin - padV), vMax + padV, 4);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = t => (t1 === t0 ? (L + W - R) / 2 : L + ((W - L - R) * (t - t0)) / (t1 - t0));
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Progress over time">`;
  ticks.forEach(t => { s += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${tickLabel(t)}</text>`; });
  const xl = (p, anchor) => `<text class="tick" x="${x(p.t)}" y="${H - 8}" text-anchor="${anchor}">${esc(p.short)}</text>`;
  s += pts.length === 1 ? xl(pts[0], 'middle') : xl(pts[0], 'start') + xl(pts[pts.length - 1], 'end');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  if (pts.length > 1) {
    s += `<path class="area" d="${path}L${x(t1).toFixed(1)},${y(lo)}L${x(t0).toFixed(1)},${y(lo)}Z"/>`;
    s += `<path class="line" d="${path}"/>`;
  }
  const last = pts[pts.length - 1];
  s += `<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}"/>`;
  if (pts.length <= 40) pts.slice(0, -1).forEach(p => { s += `<circle class="pt" cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4"/>`; });
  s += `<circle class="dot" cx="${x(last.t)}" cy="${y(last.v)}" r="5"/>`;
  s += `<text class="end-label" x="${x(last.t)}" y="${y(last.v) - 12}" text-anchor="${pts.length === 1 ? 'middle' : 'end'}">${esc(fmtV(last.v))}</text>`;
  s += `<circle class="dot focus" r="6" cx="-99" cy="-99"/>`;
  el.innerHTML = s + '</svg><div class="chart-tip"></div>';

  const svg = $('svg', el), tip = $('.chart-tip', el), cross = $('.cross', el), focus = $('.focus', el);
  const hide = () => { tip.classList.remove('show'); cross.style.opacity = 0; focus.setAttribute('cx', -99); };
  const pick = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    let best = 0, dist = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(x(p.t) - px); if (d < dist) { dist = d; best = i; } });
    const p = pts[best], cx = x(p.t), cy = y(p.v);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.opacity = 1;
    focus.setAttribute('cx', cx); focus.setAttribute('cy', cy);
    tip.innerHTML = `<b>${esc(fmtV(p.v))}</b>${esc(p.label)}${p.detail ? ` · ${esc(p.detail)}` : ''}`;
    tip.style.left = `${clamp(cx, 80, W - 80)}px`;
    tip.style.top = `${cy - 10}px`;
    tip.classList.add('show');
    if (ev.pointerType !== 'mouse') { clearTimeout(el._hide); el._hide = setTimeout(hide, 2500); }
  };
  svg.addEventListener('pointerdown', pick);
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hide(); });
}

// Exercises you've logged in this mode (for the chart picker)
function loggedExercises(mode) {
  const map = new Map();
  for (const w of S.workouts) {
    if (w.mode !== mode) continue;
    for (const e of w.exercises) {
      if (e.track === 'check' || !e.sets.some(s => s.done)) continue;
      const k = normName(e.name), cur = map.get(k);
      if (cur) cur.count++; else map.set(k, { name: e.name, track: e.track, reps: e.reps, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const METRICS = {
  weight: [['top', 'Heaviest set'], ['e1rm', 'Est. max'], ['vol', 'Volume']],
  reps: [['max', 'Most reps'], ['total', 'Total reps']],
  time: [['best', 'Best time']]
};
const RANGES = [['1m', '1M', 30], ['3m', '3M', 91], ['6m', '6M', 182], ['1y', '1Y', 365], ['all', 'All', 0]];

// One number per workout for the chart.
function sessionValue(e, metric, lower) {
  const done = e.sets.filter(s => s.done);
  if (metric === 'top') {
    const ws = done.filter(s => s.w > 0);
    if (!ws.length) return null;
    const b = ws.reduce((a, s) => (s.w > a.w || (s.w === a.w && (s.r || 0) > (a.r || 0)) ? s : a));
    return { v: b.w, detail: `${fmt(b.w, 1)} × ${b.r ?? '?'}` };
  }
  if (metric === 'e1rm') {   // Epley formula, only from sets of 12 reps or fewer
    let best = null;
    for (const s of done) {
      if (!(s.w > 0 && s.r > 0 && s.r <= 12)) continue;
      const v = Math.round(s.r === 1 ? s.w : s.w * (1 + s.r / 30));
      if (!best || v > best.v) best = { v, detail: `from ${fmt(s.w, 1)} × ${s.r}` };
    }
    return best;
  }
  if (metric === 'vol') {
    const v = sum(done, s => (s.w || 0) * (s.r || 0));
    return v > 0 ? { v, detail: `${done.length} sets` } : null;
  }
  const rs = done.map(s => s.r).filter(r => r > 0);
  if (!rs.length) return null;
  if (metric === 'max') return { v: Math.max(...rs), detail: `${done.length} sets` };
  if (metric === 'total') return { v: sum(rs, r => r), detail: `${done.length} sets` };
  if (metric === 'best') return { v: lower ? Math.min(...rs) : Math.max(...rs), detail: `${rs.length} timed` };
  return null;
}

function series(ex, metric, mode) {
  const days = (RANGES.find(r => r[0] === S.progRange) || RANGES[4])[2];
  const since = days ? Date.now() - days * 86400000 : 0;
  const key = normName(ex.name), pts = [];
  for (let i = S.workouts.length - 1; i >= 0; i--) {          // oldest → newest
    const w = S.workouts[i];
    if (w.mode !== mode || w.startedAt < since) continue;
    const e = w.exercises.find(x => normName(x.name) === key);
    const r = e && sessionValue(e, metric, ex.lower);
    if (r) {
      const d = new Date(w.startedAt);
      pts.push({ t: w.startedAt, v: r.v, detail: r.detail, label: fmtDate(d), short: fmtDate(d, { month: 'short', day: 'numeric' }) });
    }
  }
  return pts;
}

function metricFmt(metric) {
  const u = S.settings.unit;
  if (metric === 'top' || metric === 'e1rm') return v => `${fmt(v, 1)} ${u}`;
  if (metric === 'vol') return v => `${fmtK(v)} ${u}`;
  if (metric === 'best') return v => `${fmt(v, 2)}s`;
  return v => `${fmt(v)} reps`;
}

function weekStreak(ws) {
  const weeks = new Set(ws.map(w => ymd(weekStart(parseYmd(w.date)))));
  let d = weekStart(), n = 0;
  if (!weeks.has(ymd(d))) d = addDays(d, -7);   // this week hasn't started yet — count from last week
  while (weeks.has(ymd(d))) { n++; d = addDays(d, -7); }
  return n;
}

const PROG_VIEWS = [['lifts', 'Lifts'], ['body', 'Body']];
actions.progView = el => { S.progView = el.dataset.v; render({ keepScroll: false }); };
function recoveryCard() {
  const list = logsOf('checkin'), today = checkinOf(ymd());
  if (!list.length) return '';
  const week = list.filter(l => l.date >= ymd(addDays(new Date(), -6)));
  const avgSleep = week.length ? sum(week, l => l.sleep) / week.length : null;
  if (list.length > 1) later(() => lineChart('#chart-ready', list.slice(-45).map(l => logPoint(l, readiness(l))), { fmtV: v => `${Math.round(v)} / 100` }));
  return `<section class="card stack">
    <div class="card-title">Recovery</div>
    <div class="grid2">
      <div class="tile"><div class="tile-label">Average sleep, last 7 days</div><div class="tile-value">${avgSleep == null ? '–' : fmt(avgSleep, 1)}<small> h</small></div></div>
      <div class="tile"><div class="tile-label">Readiness today</div><div class="tile-value">${today ? readiness(today) : '–'}<small>${today ? ' / 100' : ''}</small></div></div>
    </div>
    ${list.length > 1 ? '<div class="chart" id="chart-ready"></div>' : ''}
    <p class="hint">Teen athletes need 8–10 hours of sleep a night. It's the cheapest performance booster there is.</p>
  </section>`;
}
function goalsCard() {
  const st = S.settings;
  return `<section class="card stack-sm">
    <div class="spread"><div class="card-title">Daily targets</div><button class="btn btn-sm btn-ghost" data-action="calcGoals">Recalculate</button></div>
    <div class="small text-2">${[`${fmt(st.calGoal)} cal`, `${fmt(st.proteinGoal)} g protein`, st.carbGoal ? `${fmt(st.carbGoal)} g carbs` : '', st.fatGoal ? `${fmt(st.fatGoal)} g fat` : '', `${waterText(st.waterGoal)} water`].filter(Boolean).join(' · ')}</div>
    <p class="hint">Recalculate every few weeks as your weight changes.</p>
  </section>`;
}
function renderProgress() {
  const head = `<div class="page-head"><div><div class="eyebrow">Your gains</div><h1 class="page-title">Progress</h1></div></div>
    <div class="seg" role="group" aria-label="What to show">${PROG_VIEWS.map(([k, l]) => `<button class="${S.progView === k ? 'on' : ''}" data-action="progView" data-v="${k}" aria-pressed="${S.progView === k}">${l}</button>`).join('')}</div>`;
  if (S.progView === 'body') return `<div class="page">${head}${bodyCard()}${recoveryCard()}${goalsCard()}</div>`;
  const mode = S.settings.mode, m = MODES[mode];
  const ws = S.workouts.filter(w => w.mode === mode);
  const weekKey = ymd(weekStart()), monthKey = ymd().slice(0, 7);
  const exList = loggedExercises(mode);
  let ex = exList.find(e => normName(e.name) === normName(S.progEx));
  if (!ex) ex = exList.find(e => normName(e.name) === 'leg press') || [...exList].sort((a, b) => b.count - a.count)[0];
  let chart = `<div class="empty">Finish a ${m.label.toLowerCase()} workout and your progress charts show up here.</div>`;
  if (ex) {
    S.progEx = ex.name;
    const lower = lowerIsBetter(ex);
    ex.lower = lower;
    const metrics = METRICS[ex.track] || METRICS.reps;
    if (!metrics.some(([k]) => k === S.progMetric)) S.progMetric = metrics[0][0];
    const pts = series(ex, S.progMetric, mode);
    const f = metricFmt(S.progMetric);
    const lowerWins = lower && S.progMetric === 'best';
    const best = pts.length ? pts.reduce((a, p) => ((lowerWins ? p.v < a.v : p.v > a.v) ? p : a)) : null;
    const change = pts.length > 1 ? pts[pts.length - 1].v - pts[0].v : null;
    const metricName = metrics.find(([k]) => k === S.progMetric)[1];
    later(() => lineChart('#chart-lift', pts, { fmtV: f }));
    chart = `
      <div class="field"><select data-change="progEx" aria-label="Exercise">${exList.map(e => `<option value="${esc(e.name)}" ${e === ex ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></div>
      ${metrics.length > 1 ? `<div class="seg">${metrics.map(([k, label]) => `<button class="${S.progMetric === k ? 'on' : ''}" data-action="progMetric" data-k="${k}" aria-pressed="${S.progMetric === k}">${label}</button>`).join('')}</div>` : ''}
      <div class="chips">${RANGES.map(([k, label]) => `<button class="chip ${S.progRange === k ? 'on' : ''}" data-action="progRange" data-k="${k}" aria-pressed="${S.progRange === k}">${label}</button>`).join('')}</div>
      <div class="chart" id="chart-lift"></div>
      ${pts.length ? `<div class="grid2">
        <div class="tile"><div class="tile-label">${lowerWins ? 'Fastest' : 'Best'}</div><div class="tile-value" style="font-size:20px">${esc(f(best.v))}</div><div class="hint">${esc(best.short)}</div></div>
        <div class="tile"><div class="tile-label">Change</div><div class="tile-value" style="font-size:20px">${change == null ? '–' : esc((change > 0 ? '+' : '') + f(change))}</div><div class="hint">${pts.length} session${pts.length === 1 ? '' : 's'}</div></div>
      </div>
      <details class="table-toggle"><summary>Show as a table</summary>
        <table class="table"><thead><tr><th>Date</th><th>${esc(metricName)}</th><th>Details</th></tr></thead>
        <tbody>${pts.slice().reverse().map(p => `<tr><td>${esc(p.short)}</td><td>${esc(f(p.v))}</td><td>${esc(p.detail)}</td></tr>`).join('')}</tbody></table>
      </details>` : ''}`;
  }
  return `<div class="page">
    ${head}
    ${modeToggle()}
    <div class="tiles">
      <div class="tile"><div class="tile-label">Workouts this week</div><div class="tile-value">${ws.filter(w => w.date >= weekKey).length}</div></div>
      <div class="tile"><div class="tile-label">Workouts this month</div><div class="tile-value">${ws.filter(w => w.date.startsWith(monthKey)).length}</div></div>
      <div class="tile"><div class="tile-label">Week streak</div><div class="tile-value">${weekStreak(ws)}</div></div>
    </div>
    <section class="card stack">
      <div class="card-title">${ex ? 'Lift progress' : 'Progress charts'}</div>
      ${chart}
    </section>
    ${prCard(exList, mode)}
    ${calendarCard(ws)}
    ${badgesCard()}
    <div class="section-title">${m.label} workout history</div>
    ${historyList(ws)}
  </div>`;
}
changes.progEx = el => { S.progEx = el.value; S.progMetric = null; render(); };
actions.progMetric = el => { S.progMetric = el.dataset.k; render(); };
actions.progRange = el => { S.progRange = el.dataset.k; render(); };
actions.progPick = el => {
  S.progEx = el.dataset.name; S.progMetric = null;
  render();
  $('#view').scrollTo({ top: 0, behavior: 'smooth' });
};

function prCard(exList, mode) {
  const rows = exList.filter(e => e.track === 'weight').map(e => {
    const key = normName(e.name);
    let best = null;
    for (const w of S.workouts) {
      if (w.mode !== mode) continue;
      for (const x of w.exercises) {
        if (normName(x.name) !== key) continue;
        for (const s of x.sets) if (s.done && s.w > 0 && (!best || s.w > best.w || (s.w === best.w && (s.r || 0) > (best.r || 0)))) best = { w: s.w, r: s.r, date: w.date };
      }
    }
    return best && { name: e.name, best };
  }).filter(Boolean).sort((a, b) => b.best.w - a.best.w).slice(0, 8);
  if (!rows.length) return '';
  return `<section class="card">
    <div class="card-title row" style="margin-bottom:6px">${icon('trophy')} Personal records</div>
    ${rows.map(r => `<button class="pr-row" data-action="progPick" data-name="${esc(r.name)}">
      <span>${esc(r.name)}</span>
      <span><b>${fmt(r.best.w, 1)} ${S.settings.unit}</b> <span class="muted">× ${r.best.r ?? '?'} · ${shortDate(r.best.date)}</span></span>
    </button>`).join('')}
  </section>`;
}

// ----- Training calendar (Progress → Lifts) -----
const monthKeyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function calendarCard(ws) {
  const cur = monthKeyOf(), mk = S.calMonth && S.calMonth <= cur ? S.calMonth : cur;
  const [y, m] = mk.split('-').map(Number), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), today = ymd();
  const byDate = {};
  for (const w of ws) (byDate[w.date] = byDate[w.date] || []).push(w);
  const count = ws.filter(w => w.date.startsWith(mk)).length;
  const cells = Array.from({ length: dayIdx(first) }, () => '<span></span>');
  for (let d = 1; d <= days; d++) {
    const key = `${mk}-${pad(d)}`, list = byDate[key] || [], cls = `cal-day ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}`;
    cells.push(list.length
      ? `<button class="${cls} has" data-action="calDay" data-date="${key}" aria-label="${fmtDate(parseYmd(key))}: ${list.length} workout${list.length > 1 ? 's' : ''}">${d}<i class="t-${esc(list[0].type || 'strength')}"></i></button>`
      : `<span class="${cls}">${d}</span>`);
  }
  return `<section class="card stack">
    <div class="spread">
      <button class="btn btn-icon sm btn-ghost" data-action="calStep" data-d="-1" aria-label="Previous month">${icon('left', 'sm')}</button>
      <div class="center"><div class="card-title">${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div class="small muted">${count} workout${count === 1 ? '' : 's'}</div></div>
      <button class="btn btn-icon sm btn-ghost" data-action="calStep" data-d="1" aria-label="Next month" ${mk === cur ? 'disabled' : ''}>${icon('right', 'sm')}</button>
    </div>
    <div class="cal">${DAYS_SHORT.map(d => `<b>${d[0]}</b>`).join('')}${cells.join('')}</div>
    <div class="cal-key"><span><i class="t-strength"></i>Lift</span><span><i class="t-agility"></i>Speed</span><span><i class="t-mobility"></i>Mobility</span><span><i class="t-rest"></i>Recovery</span></div>
  </section>`;
}
actions.calStep = el => {
  const [y, m] = (S.calMonth || monthKeyOf()).split('-').map(Number), k = monthKeyOf(new Date(y, m - 1 + Number(el.dataset.d), 1));
  if (k > monthKeyOf()) return;
  S.calMonth = k; render();
};
actions.calDay = el => {
  const list = S.workouts.filter(w => w.date === el.dataset.date && w.mode === S.settings.mode);
  if (list.length === 1) { actions.showWorkout({ dataset: { id: list[0].id } }); return; }
  openSheet(fmtDate(parseYmd(el.dataset.date), { weekday: 'long', month: 'long', day: 'numeric' }), `<div class="stack">${list.map(w => `<button class="hist" data-action="showWorkout" data-id="${w.id}">
    <div><div class="hist-title">${esc(w.title)}${levelTag(w)}</div><div class="hist-sub">${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)} · ${setsDone(w)} sets</div></div>
    <div class="hist-right">${icon('right', 'sm')}</div></button>`).join('')}</div>`);
};

// ----- Badges: milestones that make the grind visible -----
function badgeStats() {
  const day = {};
  for (const m of S.meals) day[m.date] = (day[m.date] || 0) + (m.pro || 0);
  const proDays = Object.values(day).filter(p => p >= S.settings.proteinGoal).length;
  const waterDays = logsOf('water').filter(l => l.oz >= S.settings.waterGoal).length;
  let record = false;
  const best = {};
  for (const w of [...S.workouts].reverse()) for (const e of w.exercises) {
    if (e.track !== 'weight') continue;
    const k = w.mode + ':' + normName(e.name), top = Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w || 0));
    if (top > 0 && best[k] != null && top > best[k]) record = true;
    if (top > 0) best[k] = Math.max(best[k] || 0, top);
  }
  const tests = logsOf('test'), testBest = TESTS.some(t => { const l = tests.filter(x => x.test === t.id); return l.length > 1 && bestOf(t, l) !== l[0]; });
  return { n: S.workouts.length, streak: weekStreak(S.workouts), proDays, waterDays, record, testBest,
    tests: tests.length, throws: logsOf('throw').length, checkins: logsOf('checkin').length, weighIns: logsOf('weight').length,
    skills: logsOf('skill').length, games: logsOf('game').length };
}
const BADGES = [
  ['first', 'First workout', 'Finish your first workout', s => s.n >= 1],
  ['w10', '10 workouts', 'Finish 10 workouts', s => s.n >= 10],
  ['w50', '50 workouts', 'Finish 50 workouts', s => s.n >= 50],
  ['w100', '100 club', 'Finish 100 workouts', s => s.n >= 100],
  ['streak4', 'Month of work', 'Train every week for 4 weeks in a row', s => s.streak >= 4],
  ['streak12', 'Iron habit', 'Train every week for 12 weeks in a row', s => s.streak >= 12],
  ['record', 'Record breaker', 'Beat your heaviest weight on any lift', s => s.record],
  ['protein7', 'Protein pro', 'Hit your protein goal on 7 days', s => s.proDays >= 7],
  ['water7', 'Hydrated', 'Hit your water goal on 7 days', s => s.waterDays >= 7],
  ['checkin7', 'Tuned in', 'Do 7 daily check-ins', s => s.checkins >= 7],
  ['weigh8', 'Weigh-in habit', 'Log 8 weigh-ins', s => s.weighIns >= 8],
  ['tested', 'Tested', 'Log a baseball test', s => s.tests >= 1],
  ['faster', 'Faster, stronger', 'Beat one of your test results', s => s.testBest],
  ['arm10', 'Arm care', 'Log 10 throwing sessions', s => s.throws >= 10],
  ['grinder', 'Grinder', 'Log 20 skills practice sessions', s => s.skills >= 20],
  ['gamer', 'Gamer', 'Log 10 games', s => s.games >= 10]
];
function earnedBadges() { const s = badgeStats(); return BADGES.filter(b => b[3](s)).map(b => b[0]); }
function badgesCard() {
  const got = new Set(earnedBadges());
  return `<section class="card stack">
    <div class="spread"><div class="card-title row">${icon('trophy')} Badges</div><span class="muted small bold">${got.size} of ${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(([id, name, how]) => `<div class="badge-tile ${got.has(id) ? 'got' : ''}">
      ${icon(got.has(id) ? 'star' : 'shield', 'sm')}<b>${esc(name)}</b><small>${esc(how)}</small></div>`).join('')}</div>
  </section>`;
}
// Called after each render: celebrate badges you just earned (the first check only remembers them quietly).
let badgeSig = '';
function checkBadges() {
  const sig = `${S.workouts.length}:${S.meals.length}:${S.logs.length}:${S.settings.proteinGoal}:${S.settings.waterGoal}`;
  if (sig === badgeSig) return;
  badgeSig = sig;
  const got = earnedBadges(), known = S.settings.badges;
  if (!Array.isArray(known)) { S.settings.badges = got; saveSettings(); return; }
  const fresh = got.filter(id => !known.includes(id));
  if (!fresh.length) return;
  S.settings.badges = [...known, ...fresh];
  saveSettings();
  const b = BADGES.find(x => x[0] === fresh[0]);
  setTimeout(() => toast(`Badge earned: ${b[1]}!`), 700);
}

// ----- Body weight -----
const logPoint = (l, v) => { const d = parseYmd(l.date); return { t: d.getTime(), v, label: fmtDate(d), short: fmtDate(d, { month: 'short', day: 'numeric' }) }; };
function bodyCard() {
  const list = logsOf('weight'), u = S.settings.unit, last = list[list.length - 1];
  const change = days => {
    const cut = ymd(addDays(new Date(), -days)), old = list.filter(l => l.date <= cut).pop() || list[0];
    return last && old && old !== last ? last.w - old.w : null;
  };
  const ch = change(30), pace = weightPace(list);
  if (list.length > 1) later(() => lineChart('#chart-body', list.map(l => logPoint(l, l.w)), { fmtV: v => `${fmt(v, 1)} ${u}` }));
  return `<section class="card stack">
    <div class="spread"><div class="card-title row">${icon('scale')} Body weight</div>
      <button class="btn btn-sm btn-ghost" data-action="logWeight">${icon('plus', 'sm')} Log</button></div>
    ${list.length ? `<div class="grid2">
        <div class="tile"><div class="tile-label">Latest · ${shortDate(last.date)}</div><div class="tile-value">${fmt(last.w, 1)}<small> ${u}</small></div></div>
        <div class="tile"><div class="tile-label">Last 30 days</div><div class="tile-value">${ch == null ? '–' : `${ch > 0 ? '+' : ''}${fmt(ch, 1)}<small> ${u}</small>`}</div></div>
      </div>
      ${pace ? `<div class="banner ${pace.ok ? '' : 'warn'}">${icon(pace.ok ? 'check' : 'info')}<div>${pace.text}</div></div>` : ''}
      ${list.length > 1 ? '<div class="chart" id="chart-body"></div>' : ''}
      <button class="btn-link" data-action="weightHistory">All weigh-ins (${list.length})</button>`
      : `<p class="hint">Weigh in once or twice a week — same time of day, before eating — to see if you're gaining the way you want.</p>`}
  </section>`;
}
// Weekly rate over the last ~4 weeks compared with a healthy pace for your goal.
function weightPace(list) {
  const cut = ymd(addDays(new Date(), -28)), recent = list.filter(l => l.date >= cut);
  if (recent.length < 2) return null;
  const a = recent[0], b = recent[recent.length - 1], days = (parseYmd(b.date) - parseYmd(a.date)) / 86400000;
  if (days < 10) return null;
  const kg = S.settings.unit === 'kg', perWeek = ((b.w - a.w) / days) * 7, lbWeek = kg ? perWeek / LB : perWeek;
  const goal = (S.settings.profile && S.settings.profile.goal) || 'gain', u = S.settings.unit;
  const rate = `${perWeek > 0 ? '+' : ''}${fmt(perWeek, 2)} ${u} a week over the last ${Math.round(days / 7)} weeks`;
  if (goal === 'gain') {
    if (lbWeek < 0.2) return { ok: false, text: `${rate}. For steady muscle gain aim for about ${kg ? '0.1–0.35 kg' : '0.25–0.75 lb'} a week — add 200–300 calories a day.` };
    if (lbWeek > 1) return { ok: false, text: `${rate} — faster than muscle can be built. Trim 200–300 calories a day to keep the gain lean.` };
    return { ok: true, text: `${rate} — right on pace for lean muscle gain.` };
  }
  if (goal === 'lose') {
    if (lbWeek > -0.2) return { ok: false, text: `${rate}. To lose fat slowly, aim for about ${kg ? '0.25–0.5 kg' : '0.5–1 lb'} a week.` };
    if (lbWeek < -1.5) return { ok: false, text: `${rate} — that's fast enough to cost strength and speed. Eat a bit more.` };
    return { ok: true, text: `${rate} — a steady, healthy pace.` };
  }
  return Math.abs(lbWeek) <= 0.3 ? { ok: true, text: `${rate} — holding steady.` } : { ok: false, text: `${rate}. To stay the same, adjust your calories a little.` };
}
actions.logWeight = () => openSheet('Log body weight', `<form class="form" novalidate data-submit="saveWeight">
  <div class="form-grid">
    <label class="field"><span>Weight (${S.settings.unit})</span><input name="w" inputmode="decimal" value="${latestWeight() ?? ''}" autocomplete="off"></label>
    <label class="field"><span>Date</span><input name="date" type="date" value="${ymd()}" max="${ymd()}"></label>
  </div>
  <p class="hint">For a fair comparison, weigh yourself at the same time of day — ideally in the morning before eating.</p>
  <button class="btn btn-primary btn-block" type="submit">Save</button>
</form>`);
submits.saveWeight = f => {
  const d = formData(f), w = num(d.w);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  const [lo, hi] = S.settings.unit === 'kg' ? [25, 250] : [55, 550];
  if (!(w >= lo && w <= hi)) { toast(`Enter a weight between ${lo} and ${hi} ${S.settings.unit}`); return; }
  const same = S.logs.find(l => l.kind === 'weight' && l.date === date);     // one weigh-in per day
  putLog({ id: same ? same.id : uid(), kind: 'weight', date, w: Math.round(w * 10) / 10, at: Date.now() });
  closeSheet(); render(); toast('Weight saved');
};
actions.weightHistory = () => {
  const list = logsOf('weight').reverse();
  openSheet('Weigh-ins', `<div class="stack-sm">${list.map(l => `<div class="log-row">
    <span class="grow">${fmtDate(parseYmd(l.date), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
    <b>${fmt(l.w, 1)} ${S.settings.unit}</b>
    <button class="btn btn-icon sm btn-ghost" data-action="deleteLog" data-id="${l.id}" aria-label="Delete">${icon('trash', 'sm')}</button></div>`).join('')}</div>`);
};
// Delete any dated log entry (weigh-in, test result, throwing session…) with an Undo.
actions.deleteLog = el => {
  const l = S.logs.find(x => x.id === el.dataset.id);
  if (!l) return;
  removeLog(l.id);
  const row = el.closest('.log-row'); if (row) row.remove();
  render();
  toast('Deleted', { action: () => { putLog(l); render(); } });
};

function historyList(ws) {
  if (!ws.length) return `<div class="empty">No ${MODES[S.settings.mode].label.toLowerCase()} workouts yet.</div>`;
  const shown = ws.slice(0, S.histLimit);
  return `<div class="stack">${shown.map(w => {
    const vol = volumeOf(w);
    return `<button class="hist" data-action="showWorkout" data-id="${w.id}">
      <div><div class="hist-title">${esc(w.title)}${levelTag(w)}</div><div class="hist-sub">${fmtDate(parseYmd(w.date), { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)}${w.early ? ' · ended early' : ''}${w.rpe ? ` · effort ${w.rpe}/10` : ''}${w.notes ? ' · notes' : ''}</div></div>
      <div class="hist-right">${setsDone(w)} sets<small>${vol ? `${fmtK(vol)} ${S.settings.unit}` : ''}</small></div>
    </button>`;
  }).join('')}</div>
  ${ws.length > shown.length ? `<button class="btn btn-ghost btn-block" data-action="moreHistory">Show more</button>` : ''}`;
}
actions.moreHistory = () => { S.histLimit += 20; render(); };

actions.showWorkout = el => {
  const w = S.workouts.find(x => x.id === el.dataset.id);
  if (!w) return;
  const vol = volumeOf(w);
  openSheet(w.title, `
    <div class="row wrap" style="gap:6px">
      <span class="badge accent">${icon(MODES[w.mode].icon)} ${MODES[w.mode].label}</span>
      <span class="badge">${fmtDate(parseYmd(w.date), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <span class="badge">${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)}</span>
      ${isEasy(w) ? `<span class="badge">${LEVELS[w.intensity].label} day</span>` : ''}
      ${w.early ? '<span class="badge">Ended early</span>' : ''}
      ${vol ? `<span class="badge">${fmtK(vol)} ${S.settings.unit}</span>` : ''}
    </div>
    <div>${w.exercises.map(e => `<div class="detail-ex">
      <div class="bold">${esc(e.name)}</div>
      <div class="detail-sets">${e.sets.map(s => `<span class="${s.done ? '' : 'skip'}">${esc(setText(s, e.track))}</span>`).join('')}</div>
    </div>`).join('')}</div>
    ${effortBlock(w)}
    <button class="btn btn-ghost btn-block" data-action="repeatWorkout" data-id="${w.id}" ${S.active ? 'disabled' : ''}>${icon('refresh', 'sm')} Do this workout again</button>
    <button class="btn btn-danger btn-block" data-action="deleteWorkout" data-id="${w.id}">${icon('trash', 'sm')} Delete this workout</button>`);
};
// Start a new workout with the same exercises as one in your history (weights from last time are filled in).
actions.repeatWorkout = el => {
  const w = S.workouts.find(x => x.id === el.dataset.id);
  if (!w || S.active) return;
  closeSheet();
  S.active = {
    id: uid(), mode: w.mode, dayIndex: dayIdx(), title: w.title, type: w.type, intensity: LEVELS[w.intensity] ? w.intensity : 'heavy', date: ymd(), startedAt: Date.now(), finishedAt: null,
    exercises: w.exercises.map(e => ({ planId: null, name: e.name, reps: e.reps || '10', rest: e.rest ?? 60, track: e.track, cues: e.cues || '', video: e.video || defaultVideo(e.name),
      sets: makeSets(e.sets.length, e.track, lastSetsFor(e.name, w.mode)) }))
  };
  if (S.settings.mode !== w.mode) S.settings.mode = w.mode;
  S.openEx = null; S.tab = 'today';
  saveActive(); saveSettings(); render({ keepScroll: false }); unlockAudio(); keepAwake(true);
};
actions.deleteWorkout = async el => {
  const id = el.dataset.id;
  if (!(await confirmBox('Delete workout?', 'It will be removed from your history and charts.', { ok: 'Delete', danger: true }))) return;
  S.workouts = S.workouts.filter(w => w.id !== id);
  await save(() => DB.remove('workouts', id));
  render(); toast('Workout deleted');
};

/* ============================== 9b. BASEBALL: TESTS + ARM CARE ============================== */

// Measurables you can test and track. "good" = a rough strong high-school mark (just a guide).
const TESTS = [
  { id: 'sixty', name: '60-yard dash', unit: 's', lower: true, good: 7.0, hint: 'Hand or laser timed from a standing start.' },
  { id: 'ten', name: '10-yard split', unit: 's', lower: true, hint: 'The first 10 yards of your 60 — pure acceleration.' },
  { id: 'homefirst', name: 'Home to first', unit: 's', lower: true, good: 4.3, hint: 'From contact to your foot hitting the bag.' },
  { id: 'agility', name: 'Pro agility (5-10-5)', unit: 's', lower: true, hint: 'Best of 2 tries, touching each line.' },
  { id: 'vertical', name: 'Vertical jump', unit: 'in', hint: 'Standing reach to the highest point you touch.' },
  { id: 'broad', name: 'Broad jump', unit: 'in', hint: 'In inches — 8 ft 2 in is 98.' },
  { id: 'exitvelo', name: 'Exit velocity', unit: 'mph', good: 90, hint: 'Best ball off a tee, measured with a radar or sensor.' },
  { id: 'batspeed', name: 'Bat speed', unit: 'mph', hint: 'Peak bat speed from a swing sensor.' },
  { id: 'throwvelo', name: 'Throwing velocity', unit: 'mph', good: 85, hint: 'Infield or outfield throw, or off the mound.' },
  { id: 'poptime', name: 'Pop time (catchers)', unit: 's', lower: true, good: 2.0, hint: 'Glove to glove on a throw to second.' }
];
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const testFmt = (t, v) => `${t.unit === 's' ? Number(v).toFixed(2) : fmt(v, 1)} ${t.unit}`;   // times always show 2 decimals
const testLogs = id => logsOf('test').filter(l => l.test === id);
const bestOf = (t, list) => list.reduce((b, l) => (!b || (t.lower ? l.v < b.v : l.v > b.v) ? l : b), null);

function testsCard() {
  const rows = TESTS.map(t => {
    const list = testLogs(t.id);
    if (!list.length) return '';
    const last = list[list.length - 1], best = bestOf(t, list), first = list[0];
    const ch = list.length > 1 ? last.v - first.v : null, better = ch != null && (t.lower ? ch < 0 : ch > 0);
    return `<button class="test-row" data-action="openTest" data-id="${t.id}">
      <span class="grow"><span class="bold">${esc(t.name)}</span>
        <span class="meal-sub">Best ${testFmt(t, best.v)}${ch ? ` · <span class="${better ? 'up' : 'down'}">${ch > 0 ? '+' : ''}${fmt(ch, t.unit === 's' ? 2 : 1)} since ${shortDate(first.date)}</span>` : ''}</span></span>
      <span class="meal-nums">${testFmt(t, last.v)}<small>${shortDate(last.date)}</small></span>
    </button>`;
  }).join('');
  return `<section class="card stack">
    <div class="spread"><div class="card-title row">${icon('timer')} Baseball tests</div>
      <div class="row" style="gap:6px">${logsOf('test').length ? `<button class="btn btn-icon sm btn-ghost" data-action="shareTests" data-external aria-label="Share best marks">${icon('share', 'sm')}</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-action="logTest">${icon('plus', 'sm')} Log</button></div></div>
    ${rows || `<p class="hint">Track the numbers scouts and coaches look at — 60-yard dash, exit velo, throwing velo, pop time and more. Test every 4–6 weeks to see your training pay off.</p>`}
  </section>`;
}

actions.logTest = el => {
  const pick = (el && el.dataset.id) || (testLogs('sixty').length ? '' : 'sixty');
  openSheet('Log a test result', `<form class="form" novalidate data-submit="saveTest">
    <label class="field"><span>Test</span><select name="test" data-change="testHint">${TESTS.map(t => `<option value="${t.id}" ${t.id === pick ? 'selected' : ''}>${esc(t.name)} (${t.unit})</option>`).join('')}</select></label>
    <p class="hint test-hint">${esc((TEST_BY_ID[pick] || TESTS[0]).hint)}</p>
    <div class="form-grid">
      <label class="field"><span>Result</span><input name="v" inputmode="decimal" autocomplete="off" placeholder="e.g. 7.05"></label>
      <label class="field"><span>Date</span><input name="date" type="date" value="${ymd()}" max="${ymd()}"></label>
    </div>
    <button class="btn btn-primary btn-block" type="submit">Save result</button>
  </form>`);
};
changes.testHint = el => { $('.test-hint', el.form).textContent = (TEST_BY_ID[el.value] || {}).hint || ''; };
submits.saveTest = f => {
  const d = formData(f), t = TEST_BY_ID[d.test], v = num(d.v);
  if (!t) return;
  if (!(v > 0 && v < 1000)) { toast(`Enter your ${t.name.toLowerCase()} in ${t.unit}`); return; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  const prev = bestOf(t, testLogs(t.id));
  putLog({ id: uid(), kind: 'test', test: t.id, date, v, at: Date.now() });
  closeSheet(); render();
  toast(prev && (t.lower ? v < prev.v : v > prev.v) ? `New best ${t.name.toLowerCase()}: ${testFmt(t, v)}!` : 'Result saved');
};
actions.openTest = el => {
  const t = TEST_BY_ID[el.dataset.id];
  if (!t) return;
  const list = testLogs(t.id), best = bestOf(t, list);
  openSheet(t.name, `
    <div class="grid2">
      <div class="tile"><div class="tile-label">Best</div><div class="tile-value">${best ? testFmt(t, best.v) : '–'}</div></div>
      <div class="tile"><div class="tile-label">${t.good ? 'Strong high-school mark' : 'Tests logged'}</div><div class="tile-value">${t.good ? `${t.lower ? '≤' : '≥'} ${testFmt(t, t.good)}` : list.length}</div></div>
    </div>
    ${list.length > 1 ? '<div class="chart" id="chart-test"></div>' : ''}
    <p class="hint">${esc(t.hint)}${t.good ? ' Marks are a rough guide — every level and position is different.' : ''}</p>
    <div class="stack-sm">${list.slice().reverse().map(l => `<div class="log-row"><span class="grow">${fmtDate(parseYmd(l.date), { month: 'short', day: 'numeric', year: 'numeric' })}${l === best ? ' · best' : ''}</span>
      <b>${testFmt(t, l.v)}</b><button class="btn btn-icon sm btn-ghost" data-action="deleteLog" data-id="${l.id}" aria-label="Delete">${icon('trash', 'sm')}</button></div>`).join('')}</div>
    <button class="btn btn-primary btn-block" data-action="logTest" data-id="${t.id}">${icon('plus', 'sm')} Log a new result</button>`);
  if (list.length > 1) lineChart('#chart-test', list.map(l => logPoint(l, l.v)), { fmtV: v => testFmt(t, v) });
};

// ----- Arm care: throwing log + pitch-count rest days -----
const THROW_TYPES = [['catch', 'Catch play / warm-up'], ['longtoss', 'Long toss'], ['position', 'Position practice'], ['bullpen', 'Bullpen'], ['game', 'Game pitching'], ['plyo', 'Plyo balls / arm care']];
const THROW_LABEL = Object.fromEntries(THROW_TYPES);
const PITCHING = ['bullpen', 'game'];
const FEEL = ['', 'Painful', 'Sore', 'OK', 'Good', 'Great'];
// Pitch Smart (MLB + USA Baseball) daily pitch limits and rest days by age. "tiers" are the top pitch
// count for 0, 1, 2… days of rest — e.g. ages 17–18: 1–30 → 0 days, 31–45 → 1, 46–60 → 2, 61–80 → 3, 81+ → 4.
const PITCH_SMART = [
  { upTo: 8, max: 50, tiers: [20, 35, 50] }, { upTo: 10, max: 75, tiers: [20, 35, 50, 65] },
  { upTo: 12, max: 85, tiers: [20, 35, 50, 65] }, { upTo: 14, max: 95, tiers: [20, 35, 50, 65] },
  { upTo: 16, max: 95, tiers: [30, 45, 60, 75] }, { upTo: 18, max: 105, tiers: [30, 45, 60, 80] },
  { upTo: 22, max: 120, tiers: [30, 45, 60, 80, 105] }
];
const pitchRule = age => (age >= 7 ? PITCH_SMART.find(r => age <= r.upTo) || null : null);
const restDays = (rule, pitches) => rule.tiers.filter(t => pitches > t).length;
// Pitch Smart goes by everything you pitch in a day, so a bullpen and a game (or both games of a
// doubleheader) on the same date add up.
const pitchesOn = date => sum(S.logs.filter(l => l.kind === 'throw' && l.date === date && PITCHING.includes(l.type)), l => l.count || 0);
const throwText = l => `${THROW_LABEL[l.type] || 'Throwing'} · ${fmt(l.count)} ${PITCHING.includes(l.type) ? 'pitches' : 'throws'}${l.dist ? ` · ${fmt(l.dist)} ft` : ''}${l.feel ? ` · arm ${FEEL[l.feel].toLowerCase()}` : ''}`;

// When can you pitch again? The latest "first day back" from any recent pitching outing.
function armStatus() {
  const age = S.settings.profile && S.settings.profile.age, rule = age ? pitchRule(age) : null;
  let until = null, from = null;
  const days = rule ? [...new Set(logsOf('throw').filter(x => PITCHING.includes(x.type) && x.count > 0).map(x => x.date))].slice(-12) : [];
  for (const date of days) {
    const count = pitchesOn(date), rd = restDays(rule, count);
    if (!rd) continue;
    const back = addDays(parseYmd(date), rd + 1);
    if (!until || back > until) { until = back; from = { date, count }; }
  }
  return { age, rule, until: until && until > parseYmd(ymd()) ? until : null, from };
}
function armCard() {
  const { age, rule, until, from } = armStatus(), all = logsOf('throw'), last = all[all.length - 1];
  const week = all.filter(l => l.date >= ymd(addDays(new Date(), -6)));
  const status = !age ? '<button class="btn-link inline-link" data-action="calcGoals">Add your age</button> to see Pitch Smart rest days after you pitch.'
    : !rule ? 'Pitch Smart pitch limits cover ages 7–22.'
    : until ? `<b>Rest from pitching</b> through ${fmtDate(addDays(until, -1), { weekday: 'long', month: 'short', day: 'numeric' })} — ${fmt(from.count)} pitches on ${shortDate(from.date)}.`
    : `<b>Ready to pitch.</b> Daily limit at age ${age}: ${rule.max} pitches.`;
  return `<section class="card stack-sm">
    <div class="spread"><div class="card-title row">${icon('shield')} Arm care</div>
      <button class="btn btn-sm btn-ghost" data-action="logThrow">${icon('plus', 'sm')} Log throwing</button></div>
    <div class="small text-2">${status}</div>
    ${last ? `<div class="small muted">Last: ${esc(throwText(last))} (${shortDate(last.date)})</div>` : '<div class="small muted">Log catch play, long toss, bullpens and games to keep an eye on your arm.</div>'}
    ${week.length ? `<div class="small muted">Last 7 days: ${fmt(sum(week, l => l.count || 0))} throws in ${week.length} session${week.length === 1 ? '' : 's'}</div>` : ''}
    ${last && last.feel === 1 && last.date >= ymd(addDays(new Date(), -3)) ? `<div class="banner warn">${icon('info')}<div>Pain is different from normal soreness. Don't throw through it — tell your coach or athletic trainer, and see a doctor if it doesn't go away.</div></div>`
      : last && last.feel === 2 && last.date >= ymd(addDays(new Date(), -2)) ? `<div class="banner">${icon('info')}<div>Arm sore? Keep today light: easy catch only, plus your band arm-care work.</div></div>` : ''}
  </section>`;
}
function throwCard() {
  const all = logsOf('throw'), start = weekStart();
  const weeks = Array.from({ length: 8 }, (_, k) => {
    const from = addDays(start, (k - 7) * 7), to = ymd(addDays(from, 6)), f = ymd(from);
    return { label: fmtDate(from, { month: 'numeric', day: 'numeric' }), full: `Week of ${fmtDate(from, { month: 'short', day: 'numeric' })}`, v: sum(all.filter(l => l.date >= f && l.date <= to), l => l.count || 0) };
  });
  if (all.length) later(() => barChart('#chart-throws', weeks, { cls: 'throw', unit: 'throws', label: 'Throws per week' }));
  return `<section class="card stack">
    <div class="card-title">Throwing log</div>
    ${all.length ? `<div class="chart" id="chart-throws"></div>
      <div class="stack-sm">${all.slice(-8).reverse().map(l => `<div class="log-row"><span class="grow small">${shortDate(l.date)} · ${esc(throwText(l))}${l.note ? `<br><span class="muted">${esc(l.note)}</span>` : ''}</span>
        <button class="btn btn-icon sm btn-ghost" data-action="deleteLog" data-id="${l.id}" aria-label="Delete">${icon('trash', 'sm')}</button></div>`).join('')}</div>`
      : '<p class="hint">Your weekly throwing totals show up here. Big jumps in throwing from one week to the next are a common cause of arm trouble — build up gradually.</p>'}
    <details class="table-toggle"><summary>Healthy-arm guidelines</summary><ul class="steps">
      <li>Build up throwing gradually after a break — no big jumps in volume from week to week.</li>
      <li>Don't pitch on back-to-back days, and don't pitch and catch in the same game.</li>
      <li>Take at least 2–3 months a year off from overhead throwing (4 months off pitching).</li>
      <li>Avoid pitching on more than one team at the same time. Follow your league's pitch-count rules.</li>
      <li>Soreness that fades in a day is normal. Pain, numbness or elbow/shoulder pain that lingers is not — stop and get checked.</li>
    </ul></details>
  </section>`;
}

actions.logThrow = () => openSheet('Log throwing', `<form class="form" novalidate data-submit="saveThrow">
  <label class="field"><span>Type</span><select name="type">${THROW_TYPES.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
  <div class="form-grid">
    <label class="field"><span>Throws / pitches</span><input name="count" inputmode="numeric" autocomplete="off" placeholder="e.g. 40"></label>
    <label class="field"><span>Longest throw (ft)</span><input name="dist" inputmode="numeric" autocomplete="off" placeholder="optional"></label>
  </div>
  <div class="field"><span>How does your arm feel?</span>
    <div class="feel">${[5, 4, 3, 2, 1].map(v => `<label class="feel-opt"><input type="radio" name="feel" value="${v}" ${v === 4 ? 'checked' : ''}><span>${FEEL[v]}</span></label>`).join('')}</div></div>
  <div class="form-grid">
    <label class="field"><span>Date</span><input name="date" type="date" value="${ymd()}" max="${ymd()}"></label>
    <label class="field"><span>Notes</span><input name="note" maxlength="120" autocomplete="off" placeholder="optional"></label>
  </div>
  <button class="btn btn-primary btn-block" type="submit">Save</button>
</form>`);
submits.saveThrow = f => {
  const d = formData(f), count = Math.round(num(d.count) || 0), dist = Math.round(num(d.dist) || 0);
  if (!(count >= 1 && count <= 500)) { toast('Enter how many throws or pitches (1–500)'); return; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  const l = { id: uid(), kind: 'throw', date, type: THROW_LABEL[d.type] ? d.type : 'catch', count, dist: dist || null, feel: clamp(parseInt(d.feel, 10) || 4, 1, 5), note: String(d.note || '').trim(), at: Date.now() };
  putLog(l);
  closeSheet(); render();
  const rule = pitchRule(S.settings.profile && S.settings.profile.age);
  if (PITCHING.includes(l.type) && rule) {
    const day = pitchesOn(date), r = restDays(rule, day), also = day > count ? ` (${day} pitches that day)` : '';
    toast(day > rule.max ? `${day > count ? `${day} pitches that day — that's` : "That's"} over the Pitch Smart daily limit for your age (${rule.max}). Rest up!`
      : r ? `Saved — ${r} day${r === 1 ? '' : 's'} of rest before pitching again${also}` : 'Saved — no rest day needed');
  } else toast(l.feel === 1 ? 'Saved — please get that arm checked' : 'Throwing saved');
};

// ----- Games & season stats -----
const BAT = [['ab', 'AB'], ['h', 'H'], ['d', '2B'], ['t', '3B'], ['hr', 'HR'], ['bb', 'BB'], ['hbp', 'HBP'], ['k', 'K'], ['rbi', 'RBI'], ['r', 'R'], ['sb', 'SB'], ['sf', 'SF']];
const PITCH = [['h', 'H'], ['r', 'R'], ['er', 'ER'], ['bb', 'BB'], ['k', 'K'], ['pc', 'Pitches']];
const ipText = outs => `${Math.floor(outs / 3)}${outs % 3 ? '.' + (outs % 3) : ''}`;         // 17 outs → "5.2"
const ipOuts = v => { const m = String(v || '').trim().match(/^(\d+)(?:\.([012]))?$/); return m ? +m[1] * 3 + (+m[2] || 0) : null; };
const avgText = v => (v == null ? '–' : v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, ''));   // baseball style: .312
function seasonStats(games) {
  const b = {}, p = {};
  for (const [k] of BAT) b[k] = sum(games, g => (g.bat && g.bat[k]) || 0);
  for (const [k] of PITCH) p[k] = sum(games, g => (g.pitch && g.pitch[k]) || 0);
  p.outs = sum(games, g => (g.pitch && g.pitch.outs) || 0);
  const tb = b.h + b.d + 2 * b.t + 3 * b.hr, pa = b.ab + b.bb + b.hbp + b.sf, ip = p.outs / 3;
  return {
    b, p, games: games.length, pitched: games.filter(g => g.pitch && g.pitch.outs).length,
    avg: b.ab ? b.h / b.ab : null, obp: pa ? (b.h + b.bb + b.hbp) / pa : null, slg: b.ab ? tb / b.ab : null,
    era: ip ? (9 * p.er) / ip : null, whip: ip ? (p.bb + p.h) / ip : null, k9: ip ? (9 * p.k) / ip : null, bb9: ip ? (9 * p.bb) / ip : null
  };
}
function gamesCard() {
  const year = String(new Date().getFullYear()), all = logsOf('game'), games = all.filter(g => g.date.startsWith(year)), st = seasonStats(games);
  const tile = (label, v) => `<div class="stat"><b>${v}</b><small>${label}</small></div>`;
  return `<section class="card stack">
    <div class="spread"><div class="card-title row">${icon('trophy')} ${year} season</div>
      <div class="row" style="gap:6px">${games.length ? `<button class="btn btn-icon sm btn-ghost" data-action="shareSeason" data-external aria-label="Share season stats">${icon('share', 'sm')}</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-action="logGame">${icon('plus', 'sm')} Log game</button></div></div>
    ${games.length ? `
      <div class="stats">${tile('AVG', avgText(st.avg))}${tile('OBP', avgText(st.obp))}${tile('SLG', avgText(st.slg))}${tile('OPS', st.obp == null ? '–' : avgText(st.obp + st.slg))}</div>
      <div class="small muted center">${st.games} game${st.games === 1 ? '' : 's'} · ${st.b.h}-for-${st.b.ab} · ${st.b.hr} HR · ${st.b.rbi} RBI · ${st.b.r} R · ${st.b.sb} SB · ${st.b.bb} BB · ${st.b.k} K</div>
      ${st.pitched ? `<div class="stats">${tile('ERA', st.era == null ? '–' : st.era.toFixed(2))}${tile('WHIP', st.whip == null ? '–' : st.whip.toFixed(2))}${tile('K/9', st.k9 == null ? '–' : st.k9.toFixed(1))}${tile('IP', ipText(st.p.outs))}</div>
        <div class="small muted center">${st.pitched} outing${st.pitched === 1 ? '' : 's'} · ${st.p.k} K · ${st.p.bb} BB · ${st.p.h} H · ${st.p.er} ER</div>` : ''}
      <div class="stack-sm">${games.slice(-6).reverse().map(g => `<button class="log-row as-btn" data-action="logGame" data-id="${g.id}">
        <span class="grow small"><b>${shortDate(g.date)}${g.opp ? ` vs ${esc(g.opp)}` : ''}</b>${g.result ? ` · ${esc(g.result)}${g.score ? ' ' + esc(g.score) : ''}` : ''}<br>
        <span class="muted">${g.bat && g.bat.ab + g.bat.bb + g.bat.hbp ? `${g.bat.h}-for-${g.bat.ab}${g.bat.hr ? `, ${g.bat.hr} HR` : ''}${g.bat.rbi ? `, ${g.bat.rbi} RBI` : ''}${g.bat.bb ? `, ${g.bat.bb} BB` : ''}` : 'Did not bat'}${g.pitch && g.pitch.outs ? ` · ${ipText(g.pitch.outs)} IP, ${g.pitch.k} K, ${g.pitch.er} ER` : ''}</span></span>${icon('edit', 'sm')}</button>`).join('')}</div>`
    : '<p class="hint">Log your games to track your batting average, on-base and slugging — plus ERA and strikeouts if you pitch.</p>'}
  </section>`;
}
actions.logGame = el => {
  const g = (el && el.dataset.id && S.logs.find(l => l.id === el.dataset.id)) || { date: ymd(), opp: '', result: '', score: '', bat: {}, pitch: null, note: '' };
  const n = (group, k, v) => `<label class="field mini"><span>${k}</span><input name="${group}.${v}" inputmode="numeric" value="${(g[group] && g[group][v]) || ''}" placeholder="0" autocomplete="off"></label>`;
  openSheet(g.id ? 'Edit game' : 'Log a game', `<form class="form" novalidate data-submit="saveGame" data-id="${g.id || ''}">
    <div class="form-grid">
      <label class="field"><span>Date</span><input name="date" type="date" value="${g.date}" max="${ymd()}"></label>
      <label class="field"><span>Opponent</span><input name="opp" value="${esc(g.opp)}" maxlength="40" autocomplete="off" placeholder="optional"></label>
    </div>
    <div class="form-grid">
      <div class="field"><span>Result</span><div class="choice">${[['W', 'W'], ['L', 'L'], ['T', 'T']].map(([v, l]) => `<label class="feel-opt"><input type="radio" name="result" value="${v}" ${g.result === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      <label class="field"><span>Score</span><input name="score" value="${esc(g.score)}" maxlength="12" autocomplete="off" placeholder="e.g. 5-3"></label>
    </div>
    <div class="section-title">Batting</div>
    <div class="mini-grid">${BAT.map(([v, k]) => n('bat', k, v)).join('')}</div>
    <details class="table-toggle" ${g.pitch && g.pitch.outs ? 'open' : ''}><summary>I pitched</summary>
      <div class="mini-grid"><label class="field mini"><span>IP</span><input name="pitch.ip" inputmode="decimal" value="${g.pitch && g.pitch.outs ? ipText(g.pitch.outs) : ''}" placeholder="5.2" autocomplete="off"></label>
        ${PITCH.map(([v, k]) => n('pitch', k, v)).join('')}</div>
      ${g.id ? '' : '<label class="check-line"><input type="checkbox" name="toArm" value="1" checked> Add my pitches to the arm-care log</label>'}
      <p class="hint">Innings: .1 = one out, .2 = two outs (5.2 = 5⅔ innings).</p>
    </details>
    <label class="field"><span>Notes</span><input name="note" value="${esc(g.note || '')}" maxlength="140" autocomplete="off" placeholder="optional"></label>
    <button class="btn btn-primary btn-block" type="submit">${g.id ? 'Save changes' : 'Save game'}</button>
    ${g.id ? `<button type="button" class="btn btn-danger btn-block" data-action="deleteGame" data-id="${g.id}">${icon('trash', 'sm')} Delete game</button>` : ''}
  </form>`);
};
submits.saveGame = f => {
  const d = formData(f), int = v => Math.max(0, Math.round(num(v) || 0));
  const bat = Object.fromEntries(BAT.map(([k]) => [k, int(d['bat.' + k])]));
  if (bat.h > bat.ab) { toast("Hits can't be more than at-bats"); return; }
  if (bat.d + bat.t + bat.hr > bat.h) { toast('Doubles + triples + homers can’t be more than hits'); return; }
  const outs = ipOuts(d['pitch.ip']);
  if (d['pitch.ip'] && outs == null) { toast('Innings look like 5, 5.1 or 5.2'); return; }
  const pitch = outs ? { outs, ...Object.fromEntries(PITCH.map(([k]) => [k, int(d['pitch.' + k])])) } : null;
  if (pitch && pitch.er > pitch.r) { toast("Earned runs can't be more than runs"); return; }
  const old = f.dataset.id ? S.logs.find(l => l.id === f.dataset.id) : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  const g = { id: old ? old.id : uid(), kind: 'game', date, opp: String(d.opp || '').trim(), result: ['W', 'L', 'T'].includes(d.result) ? d.result : '', score: String(d.score || '').trim(), bat, pitch, note: String(d.note || '').trim(), at: Date.now() };
  putLog(g);
  if (!old && pitch && pitch.pc && d.toArm) putLog({ id: uid(), kind: 'throw', date, type: 'game', count: pitch.pc, dist: null, feel: 4, note: `${ipText(outs)} IP${g.opp ? ` vs ${g.opp}` : ''}`, at: Date.now() });
  closeSheet(); render();
  toast(old ? 'Game updated' : bat.h >= 2 ? `Saved — ${bat.h}-for-${bat.ab}, nice game!` : 'Game saved');
};
actions.deleteGame = async el => {
  const g = S.logs.find(l => l.id === el.dataset.id);
  if (!g || !(await confirmBox('Delete this game?', 'It will be removed from your season stats.', { ok: 'Delete', danger: true }))) return;
  removeLog(g.id); render(); toast('Game deleted');
};

// ----- Skills practice: hitting and fielding reps -----
const SKILLS = [['tee', 'Tee work', 'swings'], ['toss', 'Front / soft toss', 'swings'], ['cage', 'Cage or machine', 'swings'], ['bp', 'Live BP', 'swings'],
  ['ground', 'Ground balls', 'fielding'], ['fly', 'Fly balls', 'fielding'], ['bunt', 'Bunting', 'swings'], ['bases', 'Base running', 'running'], ['catcher', 'Catching / blocking', 'fielding'],
  ['pdrill', 'Pitching drills', 'throwing'], ['tdrill', 'Throwing drills', 'throwing']];
const SKILL = Object.fromEntries(SKILLS.map(([k, l, g]) => [k, { l, g }]));
const skillText = l => `${(SKILL[l.type] || { l: 'Practice' }).l}${l.reps ? ` · ${fmt(l.reps)} ${SKILL[l.type] && SKILL[l.type].g === 'swings' ? 'swings' : 'reps'}` : ''}${l.min ? ` · ${fmt(l.min)} min` : ''}`;
function skillsCard() {
  const all = logsOf('skill'), from = ymd(weekStart()), week = all.filter(l => l.date >= from);
  const tot = g => sum(week.filter(l => SKILL[l.type] && SKILL[l.type].g === g), l => l.reps || 0);
  return `<section class="card stack">
    <div class="spread"><div class="card-title">Skills practice</div>
      <button class="btn btn-sm btn-ghost" data-action="logSkill">${icon('plus', 'sm')} Log</button></div>
    ${all.length ? `<div class="stats three">
        <div class="stat"><b>${fmt(tot('swings'))}</b><small>SWINGS</small></div>
        <div class="stat"><b>${fmt(tot('fielding'))}</b><small>FIELDING REPS</small></div>
        <div class="stat"><b>${fmt(sum(week, l => l.min || 0))}</b><small>MINUTES</small></div></div>
      <div class="small muted center">This week · ${week.length} session${week.length === 1 ? '' : 's'}</div>
      <div class="stack-sm">${all.slice(-6).reverse().map(l => `<div class="log-row"><span class="grow small">${shortDate(l.date)} · ${esc(skillText(l))}${l.note ? `<br><span class="muted">${esc(l.note)}</span>` : ''}</span>
        <button class="btn btn-icon sm btn-ghost" data-action="deleteLog" data-id="${l.id}" aria-label="Delete">${icon('trash', 'sm')}</button></div>`).join('')}</div>`
      : '<p class="hint">Log tee work, cage sessions, ground balls and more. Quality reps with a purpose beat mindless volume — pick one thing to work on each session.</p>'}
  </section>`;
}
actions.logSkill = el => { const pre = (el && el.dataset) || {}; openSheet('Log practice', `<form class="form" novalidate data-submit="saveSkill">
  <label class="field"><span>What did you work on?</span><select name="type">${SKILLS.map(([k, l]) => `<option value="${k}" ${k === pre.type ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
  <div class="form-grid">
    <label class="field"><span>Swings / reps</span><input name="reps" inputmode="numeric" autocomplete="off" placeholder="e.g. 75"></label>
    <label class="field"><span>Minutes</span><input name="min" inputmode="numeric" autocomplete="off" placeholder="optional"></label>
  </div>
  <div class="form-grid">
    <label class="field"><span>Date</span><input name="date" type="date" value="${ymd()}" max="${ymd()}"></label>
    <label class="field"><span>Focus / notes</span><input name="note" maxlength="120" autocomplete="off" placeholder="e.g. stay through the ball" value="${esc(pre.note || '')}"></label>
  </div>
  <button class="btn btn-primary btn-block" type="submit">Save</button>
</form>`); };
submits.saveSkill = f => {
  const d = formData(f), reps = Math.round(num(d.reps) || 0), min = Math.round(num(d.min) || 0);
  if (!reps && !min) { toast('Enter your swings/reps or minutes'); return; }
  if (reps > 2000 || min > 600) { toast('That looks too high — check the numbers'); return; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  putLog({ id: uid(), kind: 'skill', date, type: SKILL[d.type] ? d.type : 'tee', reps: reps || null, min: min || null, note: String(d.note || '').trim(), at: Date.now() });
  closeSheet(); render(); toast('Practice saved');
};

// ----- Live pitch counter (kept in settings so it survives closing the app mid-game) -----
// An unsaved count from an earlier day is kept (a night game past midnight, or a count you forgot to save)
// until you save it to that day or start over.
function pitchState() {
  let p = S.settings.pitch;
  const ok = isObj(p) && /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') && Number.isInteger(p.s) && Number.isInteger(p.b) && p.s >= 0 && p.b >= 0
    && Array.isArray(p.inn) && p.inn.length && Array.isArray(p.seq);
  if (!ok || (p.date !== ymd() && !(p.s + p.b))) { p = S.settings.pitch = { date: ymd(), type: 'game', s: 0, b: 0, inn: [0], seq: [] }; saveSettings(); }
  return p;
}
function pitchBody() {
  const p = pitchState(), total = p.s + p.b, rule = pitchRule(S.settings.profile && S.settings.profile.age);
  const today = p.date === ymd(), earlier = pitchesOn(p.date), day = earlier + total;
  const rest = rule ? restDays(rule, day) : 0, level = !rule ? '' : day >= rule.max ? 'over' : day >= rule.max - 10 ? 'near' : '';
  return `${today ? '' : `<div class="banner warn">${icon('info')}<div>This count is from ${fmtDate(parseYmd(p.date), { weekday: 'long', month: 'short', day: 'numeric' })}. Save it to that day, or start over.</div></div>`}
    <div class="pc-total ${level}">${total}<small>pitches${rule ? ` · limit ${rule.max}` : ''}</small></div>
    ${earlier ? `<p class="small muted center">${total ? `Plus ${earlier} pitches already logged ${today ? 'today' : 'that day'} — ${day} total` : `${earlier} pitches already logged ${today ? 'today' : 'that day'}`}</p>` : ''}
    ${rule ? `<div class="meter pc ${level}"><span style="width:${Math.min(100, (day / rule.max) * 100)}%"></span></div>
      <p class="small text-2 center">${day >= rule.max ? '<b>Daily limit reached — time to come out.</b> ' : ''}${day ? `If you stop now: <b>${rest} day${rest === 1 ? '' : 's'}</b> of rest` : 'Pitch Smart limit for your age shown above'}</p>`
      : '<p class="hint center"><button class="btn-link inline-link" data-action="calcGoals">Add your age</button> to see your pitch limit and rest days.</p>'}
    <div class="pc-btns">
      <button class="btn pc-btn strike" data-action="pitch" data-k="s">Strike<b>${p.s}</b></button>
      <button class="btn pc-btn ball" data-action="pitch" data-k="b">Ball<b>${p.b}</b></button>
    </div>
    <div class="grid2">
      <button class="btn btn-ghost" data-action="pitchUndo" ${total ? '' : 'disabled'}>Undo</button>
      <button class="btn btn-ghost" data-action="pitchInning">Next inning</button>
    </div>
    <div class="small muted center">Inning ${p.inn.map((n, i) => `${i + 1}: <b>${n}</b>`).join(' · ')}${total ? ` · ${Math.round((p.s / total) * 100)}% strikes` : ''}</div>
    <div class="field"><span>Save as</span><div class="choice">${[['game', 'Game'], ['bullpen', 'Bullpen']].map(([v, l]) =>
      `<label class="feel-opt"><input type="radio" name="pc-type" value="${v}" ${p.type === v ? 'checked' : ''} data-change="pitchType"><span>${l}</span></label>`).join('')}</div></div>
    <button class="btn btn-primary btn-block" data-action="pitchSave" ${total ? '' : 'disabled'}>Save to throwing log</button>
    <button class="btn-link center" data-action="pitchReset" ${total ? '' : 'disabled'}>Start over</button>`;
}
const redrawPitch = () => { const b = $('#sheet-root .sheet-body'); if (b) b.innerHTML = pitchBody(); };
actions.pitchCounter = () => openSheet('Pitch counter', pitchBody());
actions.pitch = el => {
  const p = pitchState(), k = el.dataset.k === 'b' ? 'b' : 's';
  p[k]++; p.inn[p.inn.length - 1]++; p.seq.push([k, p.inn.length - 1]);
  if (navigator.vibrate) navigator.vibrate(12);
  saveSettings(); redrawPitch();
};
actions.pitchUndo = () => {
  const p = pitchState(), last = p.seq.pop();
  if (!last) return;
  p[last[0]]--; p.inn[last[1]]--;
  if (p.inn.length > 1 && p.inn[p.inn.length - 1] === 0 && last[1] < p.inn.length - 1) p.inn.pop();
  saveSettings(); redrawPitch();
};
actions.pitchInning = () => { const p = pitchState(); if (p.inn[p.inn.length - 1] > 0) { p.inn.push(0); saveSettings(); } redrawPitch(); };
changes.pitchType = el => { pitchState().type = el.value === 'bullpen' ? 'bullpen' : 'game'; saveSettings(); };
actions.pitchReset = async () => {
  if (!(await confirmBox('Start over?', 'The live pitch count goes back to zero. Pitches you already saved stay in your throwing log.', { ok: 'Start over', danger: true }))) { actions.pitchCounter(); return; }
  S.settings.pitch = null; saveSettings(); actions.pitchCounter();
};
actions.pitchSave = () => {
  const p = pitchState(), total = p.s + p.b;
  if (!total) return;
  const innings = p.inn.filter(n => n > 0).length;
  putLog({ id: uid(), kind: 'throw', date: p.date, type: p.type, count: total, dist: null, feel: 4, at: Date.now(),
    note: `${p.s} strikes, ${p.b} balls (${Math.round((p.s / total) * 100)}%)${p.type === 'game' ? ` · ${innings} inning${innings === 1 ? '' : 's'}` : ''}` });
  S.settings.pitch = null; saveSettings();
  closeSheet(); render();
  const rule = pitchRule(S.settings.profile && S.settings.profile.age), r = rule ? restDays(rule, pitchesOn(p.date)) : null;
  toast(r ? `Saved ${total} pitches — ${r} day${r === 1 ? '' : 's'} of rest` : `Saved ${total} pitches`);
};

// ----- Sprint stopwatch: a partner times you, then save it as a test result -----
const SW = { start: 0, elapsed: 0, id: null };
const swText = () => ((SW.elapsed + (SW.id ? performance.now() - SW.start : 0)) / 1000).toFixed(2);
function stopSw() { if (SW.id) { SW.elapsed += performance.now() - SW.start; clearInterval(SW.id); SW.id = null; } }
actions.stopwatch = () => {
  stopSw(); SW.elapsed = 0;
  openSheet('Sprint stopwatch', `<div class="sw-time" id="sw-time">0.00</div>
    <button class="btn btn-primary btn-xl" data-action="swToggle" id="sw-btn">Start</button>
    <button class="btn btn-ghost btn-block" data-action="swReset">Reset</button>
    <div class="form-grid">
      <label class="field"><span>Save as</span><select id="sw-test">${TESTS.filter(t => t.unit === 's').map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
      <div class="field"><span>&nbsp;</span><button class="btn btn-ghost" data-action="swSave">Save time</button></div>
    </div>
    <p class="hint">Your partner starts the watch on your first movement and stops it as you cross the line. Hand times usually come out a little faster than laser timing.</p>`,
  { onClose: stopSw });
};
actions.swToggle = el => {
  if (SW.id) { stopSw(); el.textContent = 'Start'; $('#sw-time').textContent = swText(); return; }
  SW.start = performance.now();
  SW.id = setInterval(() => { const t = $('#sw-time'); if (t) t.textContent = swText(); else stopSw(); }, 31);
  el.textContent = 'Stop';
};
actions.swReset = () => { stopSw(); SW.elapsed = 0; const t = $('#sw-time'), b = $('#sw-btn'); if (t) t.textContent = '0.00'; if (b) b.textContent = 'Start'; };
actions.swSave = () => {
  stopSw();
  const v = Number(swText()), t = TEST_BY_ID[$('#sw-test').value];
  if (!t || !(v > 0.5)) { toast('Time a run first'); return; }
  const prev = bestOf(t, testLogs(t.id));
  putLog({ id: uid(), kind: 'test', test: t.id, date: ymd(), v, at: Date.now() });
  actions.swReset(); render();
  toast(prev && v < prev.v ? `New best ${t.name.toLowerCase()}: ${testFmt(t, v)}!` : `Saved ${testFmt(t, v)}`);
};
function toolsCard() {
  return `<section class="card stack-sm">
    <div class="card-title">Game-day tools</div>
    <div class="grid2">
      <button class="btn btn-ghost" data-action="pitchCounter">${icon('shield', 'sm')} Pitch counter</button>
      <button class="btn btn-ghost" data-action="stopwatch">${icon('timer', 'sm')} Stopwatch</button>
    </div>
  </section>`;
}

/* ============================== 9c. BASEBALL TAB + DRILLS ============================== */

const BALL_VIEWS = [['drills', 'Drills'], ['swing', 'Swing lab'], ['stats', 'Games & arm']];
function renderBaseball() {
  const v = BALL_VIEWS.some(([k]) => k === S.ballView) ? S.ballView : 'drills';
  const body = v === 'swing' ? swingView() : v === 'stats' ? toolsCard() + gamesCard() + skillsCard() + testsCard() + armCard() + throwCard() : drillsView();
  return `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Skills, drills and games</div><h1 class="page-title">Baseball</h1></div></div>
    <div class="seg" role="group" aria-label="Baseball sections">${BALL_VIEWS.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-action="ballView" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
    ${body}
  </div>`;
}
actions.ballView = el => { S.ballView = el.dataset.v; S.swingOpen = null; render({ keepScroll: false }); };

// ----- Drills: alone or with a partner, for every position (drills.js) -----
const POS_LABEL = Object.fromEntries(DRILL_POSITIONS);
const drillPosText = d => (d.pos.length > 2 ? 'Every infielder' : d.pos.map(p => POS_LABEL[p] || p).join(', '));
const drillGroup = d => (d.pos.length > 1 ? 'infield' : d.pos[0]);
const DRILL_GROUPS = [['hitting', 'Hitting'], ['pitching', 'Pitching'], ['catcher', 'Catcher'], ['infield', 'Infield (every position)'], ['first', 'First base'],
  ['middle', 'Second base / shortstop'], ['third', 'Third base'], ['outfield', 'Outfield'], ['throwing', 'Throwing (everyone)'], ['running', 'Base running']];
const inDrillPlan = id => S.settings.drillPlan.includes(id);
function drillMatches(d, q) {
  if (!q) return true;
  const hay = normName([d.n, d.why, d.gear, drillPosText(d), ...d.steps, ...d.cues, ...d.fixes.map(f => (SWING_FAULTS[f] || {}).name || '')].join(' '));
  return q.split(' ').every(w => hay.includes(w));
}
const drillRow = d => `<button class="lib-row" data-action="openDrill" data-id="${d.id}">
  <span class="grow"><b>${esc(d.n)}</b><small>${esc(drillPosText(d))} · ${esc(d.dose)}</small></span>
  ${inDrillPlan(d.id) ? `<span class="plan-star" title="In your plan">${icon('star', 'sm')}</span>` : ''}${icon('right', 'sm')}</button>`;
function drillList() {
  const who = S.drillWho === 'partner' ? 'partner' : 'solo', pos = S.drillPos || 'all', q = normName(S.drillQ);
  const list = DRILLS.filter(d => d.who === who && (pos === 'all' || d.pos.includes(pos)) && drillMatches(d, q));
  if (!list.length) return `<div class="empty">No ${who === 'solo' ? 'solo' : 'partner'} drills match. Try the other tab or clear the search.</div>`;
  if (pos !== 'all' || q) return list.map(drillRow).join('');
  return DRILL_GROUPS.map(([g, label]) => { const l = list.filter(d => drillGroup(d) === g); return l.length ? `<div class="section-title">${esc(label)}</div>${l.map(drillRow).join('')}` : ''; }).join('');
}
function drillsView() {
  const who = S.drillWho === 'partner' ? 'partner' : 'solo', pos = S.drillPos || 'all';
  const count = w => DRILLS.filter(d => d.who === w && (pos === 'all' || d.pos.includes(pos))).length;
  const plan = S.settings.drillPlan.map(id => DRILL_BY_ID[id]).filter(Boolean);
  const chip = (k, label) => `<button class="chip ${pos === k ? 'on' : ''}" data-action="drillPos" data-k="${k}" aria-pressed="${pos === k}">${esc(label)}</button>`;
  return `${plan.length ? `<section class="card stack-sm">
      <div class="spread"><div class="card-title row">${icon('star')} My drill plan</div><button class="btn-link" data-action="clearDrillPlan">Clear</button></div>
      ${S.settings.drillPlanFrom ? `<p class="hint">Picked for you by your swing analysis on ${shortDate(S.settings.drillPlanFrom)}. Do them 3 times a week.</p>` : '<p class="hint">Drills you starred. Tap one to see how to do it.</p>'}
      <div>${plan.map(drillRow).join('')}</div>
    </section>` : ''}
    <div class="seg" role="group" aria-label="Drills alone or with a partner">
      <button class="${who === 'solo' ? 'on' : ''}" data-action="drillWho" data-k="solo" aria-pressed="${who === 'solo'}">Alone <small class="seg-count">${count('solo')}</small></button>
      <button class="${who === 'partner' ? 'on' : ''}" data-action="drillWho" data-k="partner" aria-pressed="${who === 'partner'}">With a partner <small class="seg-count">${count('partner')}</small></button>
    </div>
    <div class="chip-row">${chip('all', 'All positions')}${DRILL_POSITIONS.map(([k, l]) => chip(k, l)).join('')}</div>
    <label class="field"><span>Search drills</span><input data-input="drillSearch" value="${esc(S.drillQ)}" placeholder="e.g. casting, backhand, bunt" autocomplete="off" autocorrect="off"></label>
    <p class="hint">${who === 'solo' ? 'Drills you can do by yourself with a tee, a net, a wall or a fence.' : 'Drills with a coach, parent or teammate tossing, throwing or hitting to you.'}</p>
    <div id="drill-list">${drillList()}</div>`;
}
actions.drillWho = el => { S.drillWho = el.dataset.k === 'partner' ? 'partner' : 'solo'; render(); };
actions.drillPos = el => { S.drillPos = el.dataset.k; render(); };
inputs.drillSearch = el => { S.drillQ = el.value; const box = $('#drill-list'); if (box) box.innerHTML = drillList(); };
actions.clearDrillPlan = () => { S.settings.drillPlan = []; S.settings.drillPlanFrom = ''; saveSettings(); render(); toast('Drill plan cleared'); };

actions.openDrill = el => openDrill(DRILL_BY_ID[el.dataset.id]);
function openDrill(d) {
  if (!d) return;
  const saved = S.settings.drillVideos[d.id], info = saved ? ytInfo(saved) : null, list = (tag, items) => `<${tag} class="steps">${items.map(x => `<li>${esc(x)}</li>`).join('')}</${tag}>`;
  openSheet(d.n, `
    <div class="row wrap" style="gap:6px"><span class="badge accent">${d.who === 'solo' ? 'Alone' : 'With a partner'}</span><span class="badge">${esc(drillPosText(d))}</span></div>
    ${info ? videoEmbed(info, d.n) : ''}
    <p class="text-2">${esc(d.why)}</p>
    <div class="grid2">
      <div class="tile"><div class="tile-label">You need</div><div class="small">${esc(d.gear)}</div></div>
      <div class="tile"><div class="tile-label">How much</div><div class="small">${esc(d.dose)}</div></div>
    </div>
    <div class="section-title">How to do it</div>${list('ol', d.steps)}
    <div class="section-title">Coaching points</div>${list('ul', d.cues)}
    <div class="section-title">Watch out for</div>${list('ul', d.avoid)}
    <div class="tile"><div class="tile-label">Make it harder</div><div class="small">${esc(d.harder)}</div></div>
    ${d.fixes.length ? `<p class="small text-2"><b>Helps fix:</b> ${esc(d.fixes.map(f => ((SWING_FAULTS[f] || {}).name || f).toLowerCase()).join(', '))}</p>` : ''}
    <div class="grid2">
      <button class="btn btn-primary" data-action="logDrill" data-id="${d.id}">${icon('check', 'sm')} Log it</button>
      <button class="btn btn-ghost" data-action="toggleDrillPlan" data-id="${d.id}" aria-pressed="${inDrillPlan(d.id)}">${icon('star', 'sm')} ${inDrillPlan(d.id) ? 'In my plan' : 'Add to plan'}</button>
    </div>
    <a class="btn btn-ghost btn-block" href="${esc(ytSearch(d.yt))}" target="_blank" rel="noopener" data-external>${icon('video', 'sm')} ${info ? 'Find a different demo video' : 'Find a demo video on YouTube'}</a>
    <details class="table-toggle"><summary>${info ? 'Change the saved video' : 'Save a video link to this drill'}</summary>
      <form class="form" novalidate data-submit="saveDrillVideo" data-id="${d.id}">
        <label class="field"><span>YouTube link</span><input name="video" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://youtu.be/…" value="${esc(saved || '')}"></label>
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" data-action="pasteLink">${icon('copy', 'sm')} Paste</button>
          <button type="submit" class="btn btn-primary">${saved ? 'Save' : 'Save link'}</button>
        </div>
        <p class="hint">Find a demo you like, tap Share → Copy link, then paste it here. It plays right here next time. Leave it empty and save to remove it.</p>
      </form>
    </details>`);
}
actions.toggleDrillPlan = el => {
  const id = el.dataset.id, on = inDrillPlan(id);
  S.settings.drillPlan = on ? S.settings.drillPlan.filter(x => x !== id) : [...S.settings.drillPlan, id];
  saveSettings(); render(); openDrill(DRILL_BY_ID[id]);
  toast(on ? 'Removed from your plan' : 'Added to your drill plan');
};
submits.saveDrillVideo = f => {
  const id = f.dataset.id, url = normUrl(formData(f).video);
  if (url && !safeUrl(url)) { toast('Paste a full link that starts with https://'); return; }
  if (url) S.settings.drillVideos[id] = url; else delete S.settings.drillVideos[id];
  saveSettings(); openDrill(DRILL_BY_ID[id]);
  toast(url ? (ytInfo(url) ? 'Video saved — it plays right here' : 'Link saved') : 'Video removed');
};
// "Log it" adds the drill to your practice log.
const drillLogType = d => d.pos.includes('hitting') ? ({ bunting: 'bunt', 'live-timing': 'bp' }[d.id] || (d.who === 'solo' ? 'tee' : 'toss'))
  : d.pos.includes('catcher') ? 'catcher' : d.pos.includes('outfield') ? 'fly' : d.pos.includes('running') ? 'bases'
  : d.pos.includes('pitching') ? 'pdrill' : d.pos.includes('throwing') ? 'tdrill' : 'ground';
actions.logDrill = el => { const d = DRILL_BY_ID[el.dataset.id]; if (d) actions.logSkill({ dataset: { type: drillLogType(d), note: d.n } }); };

/* ============================== 9d. SWING LAB ============================== */
// Film a swing → swing.js tracks your body on the phone and measures the swing → a report with your priorities,
// drills, pictures of your key positions, charts and a replay. Reports are saved as "swing" entries in the tracking
// log (encrypted like everything else). The video itself is never saved or uploaded.

const SW_VIEWS = [['auto', 'Auto'], ['side', 'Side'], ['front', 'Front'], ['back', 'Back']];
const SW_VIEW_TEXT = { side: 'from the side', front: 'from the front', back: 'from behind' };
const SW_VIEW_SHORT = { side: 'Side view', front: 'Front view', back: 'Back view' };
const SW_SPEEDS = [['auto', 'Auto'], ['1', 'Normal'], ['4', '4× slow'], ['8', '8× slow']];
const SW_KEYS = [['setup', 'Stance'], ['load', 'Load'], ['footPlant', 'Foot down'], ['contact', 'Contact'], ['finish', 'Finish']];
const SW_STATUS = { good: 'Great', ok: 'OK', work: 'Work on it', check: 'Other angle', info: '', na: '–' };
const SW_SEV = { 3: 'Big', 2: 'Medium', 1: 'Small' };
const SW_REL = { high: 'very reliable', med: 'fairly reliable', low: 'hard to see' };
const SW_HELP = {
  stance_width: 'How far apart your feet are in your stance, compared with your shoulders.',
  knee_setup: 'How bent your knees are while you wait for the pitch (180° = straight). An athletic stance has some bend.',
  hinge_setup: 'How far your chest tilts forward over the plate in your stance.',
  load_hands: 'How far your hands move back toward the catcher as you load.',
  coil: 'How much your front shoulder turns in toward the plate during your load.',
  stride_len: 'How far your front foot travels toward the pitcher. The target is based on your height.',
  stride_dir: 'Whether your stride goes straight at the pitcher (0°), opens away from the plate (+) or closes toward it (−).',
  weight_fp: 'Where your hips are between your feet when your front foot lands: 0% = over your back foot, 100% = over your front foot.',
  sep_fp: 'How far your hips have turned ahead of your shoulders when your front foot lands — the stretch that stores power.',
  sep_max: 'The most your hips get ahead of your shoulders at any point in the swing.',
  early_open: 'How far your shoulders have already turned toward the pitcher when your front foot lands (below 0 = still closed, which is good).',
  sequence: 'The order your body fires. Hips should reach top turning speed first, then shoulders, then hands.',
  speed_gain: 'How much faster your shoulders turn than your hips — a sign energy is passing up your body.',
  hip_open_contact: 'How far your hips have turned toward the pitcher at contact.',
  hip_speed: 'Your hips\' top turning speed.',
  sh_speed: 'Your shoulders\' top turning speed.',
  head_drift: 'How far your head moves toward the pitcher from your stance to contact. A still head sees the ball better.',
  head_drop: 'How much your head (your eye level) rises or drops from your stance to contact.',
  head_lateral: 'How far your head moves toward or away from the plate from your stance to contact.',
  posture_change: 'How much your spine tilt changes from your stance to contact. Standing up (−) is "pulling off".',
  tilt_contact: 'How much lower your back shoulder is than your front shoulder at contact. Some tilt is normal and matches pitch height.',
  front_block: 'How much your front knee straightens from foot plant to contact. A firm front side stops your forward move and turns it into rotation.',
  lead_knee_contact: 'Your front knee angle at contact (180° = straight).',
  back_collapse: 'How much your hips drop between foot plant and contact.',
  hands_close: 'How far your hands are from your body 60% of the way to contact, compared with when the swing started (1.0 = same distance).',
  back_elbow_mid: 'Your back elbow angle halfway to contact. It should stay bent and tucked near your side (the "slot").',
  extension: 'How straight your arms get just after contact.',
  swing_time: 'Time from when your hands start forward to contact. Quicker means you can wait longer to decide.',
  hand_speed: 'Rough top speed of your hands (not the bat head).',
  finish_balance: 'Where your head is over your feet at the finish (0 = centered). Bigger numbers mean falling forward or back.',
  back_foot_step: 'How far your back foot moves after contact to catch your balance.'
};
// Your height (from the goal calculator) makes stride and speed measurements more accurate.
const profileHeightIn = () => {
  const p = S.settings.profile;
  if (!p) return null;
  const h = S.settings.unit === 'kg' ? (p.cm ? p.cm / 2.54 : null) : (p.ft ? p.ft * 12 + (p.inch || 0) : null);
  return h && h >= 48 && h <= 90 ? Math.round(h) : null;
};
const swingById = id => S.logs.find(l => l.kind === 'swing' && l.id === id) || null;
const swViewText = r => (SW_VIEW_TEXT[r.view] || '') + (r.viewAuto ? ' (auto)' : '');
const swScoreWord = s => (s >= 90 ? 'Excellent' : s >= 80 ? 'Very good' : s >= 70 ? 'Solid' : s >= 60 ? 'Developing' : 'Needs work');
const swTone = s => (s >= 85 ? 'good' : s >= 65 ? 'ok' : 'work');
const swFaultName = id => (SWING_FAULTS[id] || {}).name || id;
function swVal(m) {
  const v = m.value;
  if (v == null || (typeof v === 'number' && !Number.isFinite(v))) return '–';
  if (m.key === 'sequence') return `${Math.round(v.hipToSh)} ms`;
  const u = m.unit;
  if (u === '°') return `${Math.round(v)}°`;
  if (u === '°/s') return `${fmt(v)}°/s`;
  if (u === 'ms') return `${Math.round(v)} ms`;
  if (u === 'mph') return `${fmt(v, 1)} mph`;
  if (u === 'in') return `${fmt(v, 1)} in`;
  if (u === '% forward') return `${Math.round(v)}%`;
  return `${fmt(v, 2)}×`;
}
function swTarget(m) {
  if (m.key === 'sequence') return 'Target: hips peak 5–130 ms before the shoulders';
  if (!m.target) return '';
  const [a, b] = m.target[0], u = m.unit;
  const f = x => swVal({ ...m, key: '', value: x, unit: u });
  if (['hands_close', 'back_collapse', 'back_foot_step', 'stride_len', 'back_elbow_mid'].includes(m.key)) return `Target: up to ${f(b)}`;
  if (u === '°' && b >= 180) return `Target: ${f(a)} or more`;
  return `Target: ${f(a)} to ${f(b)}`;
}
const swChip = (st, text) => `<span class="sw-chip ${st}">${esc(text ?? SW_STATUS[st] ?? '')}</span>`;

// ----- The Swing lab screen: start an analysis, your latest swing, your history -----
function swingView() {
  if (typeof SWING === 'undefined') return '<div class="empty">The swing analyzer didn\'t load. Close Dugout completely and open it again.</div>';
  const open = S.swingOpen && swingById(S.swingOpen);
  if (open) return swingReport(open);
  const list = logsOf('swing').slice().reverse(), last = list[0];
  if (list.length > 1) later(() => lineChart('#chart-swing', logsOf('swing').slice(-30).map(l => logPoint(l, l.score)), { fmtV: v => `${Math.round(v)} / 100` }));
  return `<section class="card hero stack-sm">
      <div class="card-title row">${icon('video')} Swing lab</div>
      <p class="text-2">Film one swing and get a full breakdown: your load, stride, hip and shoulder turn, the order your body fires, your head, hands and finish. Then drills that fix what it finds.</p>
      <button class="btn btn-primary btn-block" data-action="swingNew">${icon('upload', 'sm')} Analyze a swing</button>
      <p class="hint">Runs on your phone — your video is never uploaded or saved.</p>
    </section>
    ${last ? `<section class="card stack-sm">
      <div class="spread"><div class="card-title">Your latest swing</div><span class="text-2 small">${esc(shortDate(last.date))}</span></div>
      ${swingRowHtml(last)}
      ${list.length > 1 ? `<div class="section-title">Score over time</div><div class="chart" id="chart-swing"></div>` : ''}
    </section>` : ''}
    ${list.length > 1 ? `<section class="card stack-sm"><div class="card-title">All swings</div><div>${list.slice(1).map(swingRowHtml).join('')}</div></section>` : ''}
    <div class="guide">
      <details${list.length ? '' : ' open'}><summary>How to film your swing</summary><ol class="steps">
        <li><b>Side (best to start):</b> stand straight out from the plate, facing your chest, 10–15 ft away — like a first- or third-base coach's view of you.</li>
        <li><b>Front:</b> from the pitcher's side, behind a screen or fence. Shows your stride direction, head and hips.</li>
        <li><b>Back:</b> straight behind you (behind the catcher). Shows your stride direction and posture.</li>
        <li>Phone at waist height, held still (lean it on something) — no zooming or following the ball.</li>
        <li>Get your whole body and bat in the frame, head to feet, in good light. Other people are fine, but you should be the biggest.</li>
        <li>Start recording a couple of seconds before the pitch and stop after your finish. One swing per video.</li>
        <li>60 fps or slow motion gives the most accurate timing. Regular 30 fps video works too.</li>
      </ol></details>
      <details><summary>What it measures</summary><ol class="steps">
        <li><b>Load &amp; stride:</b> how your hands load, how far and which way you stride, where your weight is when your foot lands.</li>
        <li><b>Rotation &amp; sequence:</b> hip-shoulder separation, whether your shoulders open early, and the order your hips, shoulders and hands fire.</li>
        <li><b>Head &amp; posture:</b> how much your head moves and whether your spine angle holds.</li>
        <li><b>Lower half:</b> whether your front leg firms up and your back side stays tall.</li>
        <li><b>Hands:</b> whether your hands stay inside the ball, swing time and extension.</li>
        <li><b>Finish:</b> balance.</li>
        <li>Each camera angle sees some things better than others — the report tells you what to film next.</li>
      </ol></details>
    </div>`;
}
function swingRowHtml(l) {
  const pic = (l.keyframes || []).find(k => k.key === 'contact') || (l.keyframes || [])[0];
  const top = (l.faults || [])[0];
  return `<button class="lib-row sw-row" data-action="swingOpen" data-id="${esc(l.id)}">
    ${pic ? `<img src="${esc(pic.img)}" alt="">` : `<span class="sw-noimg">${icon('video', 'sm')}</span>`}
    <span class="grow"><b>${esc(shortDate(l.date))} · ${esc(SW_VIEW_SHORT[l.view] || '')}</b><small>${top ? `Work on: ${esc(swFaultName(top.id).toLowerCase())}` : 'No big problems found'}</small></span>
    <span class="ready-dot ${swTone(l.score) === 'work' ? 'low' : swTone(l.score)}">${Math.round(l.score)}</span>${icon('right', 'sm')}</button>`;
}
actions.swingOpen = el => { S.swingOpen = el.dataset.id; S.ballView = 'swing'; render({ keepScroll: false }); };
actions.swingBack = () => { S.swingOpen = null; render({ keepScroll: false }); };

// ----- Start: pick the video and a few settings -----
actions.swingNew = () => {
  if (typeof SWING === 'undefined') { toast('The swing analyzer is still loading — try again in a moment'); return; }
  if (swingJob) { showSwingProgress(); return; }
  const h = profileHeightIn();
  openSheet('Analyze a swing', `<form class="form" novalidate data-submit="swingGo">
    <label class="field"><span>Your swing video</span><input type="file" name="video" accept="video/*" data-external></label>
    <div class="field"><span>Where was the camera?</span>${choice('view', SW_VIEWS, 'auto')}
      <small>Side = facing your chest from straight out from the plate. Front = from the pitcher. Back = from behind the catcher.</small></div>
    <div class="field"><span>You bat</span>${choice('bats', [['R', 'Right'], ['L', 'Left']], S.settings.bats === 'L' ? 'L' : 'R')}</div>
    <details class="table-toggle"><summary>More options</summary>
      <div class="field"><span>Video speed</span>${choice('speed', SW_SPEEDS, 'auto')}
        <small>Auto works for most videos. Pick 4× or 8× if it's a slow-motion video that plays slowed down.</small></div>
      <label class="field"><span>Your height (inches)</span><input name="height" inputmode="numeric" autocomplete="off" placeholder="${h || 70}" value="${h || ''}">
        <small>Used to judge stride length. Saved from the goal calculator if you've used it.</small></label>
    </details>
    <button type="submit" class="btn btn-primary btn-block">${icon('play', 'sm')} Analyze</button>
    <p class="hint">Takes about a minute. The first time, Dugout downloads its body-tracking model (about 21 MB) — after that it works offline.</p>
  </form>`);
};
submits.swingGo = f => {
  const d = formData(f), input = $('input[type=file]', f), file = input && input.files && input.files[0];
  if (!file) { toast('Choose a video of your swing first'); return; }
  if (file.type && !/^video\//.test(file.type)) { toast('That file isn\'t a video'); return; }
  const h = num(d.height);
  if (d.height && !(h >= 48 && h <= 90)) { toast('Enter your height in inches (48–90)'); return; }
  const opts = { view: SW_VIEWS.some(([v]) => v === d.view) ? d.view : 'auto', bats: d.bats === 'L' ? 'L' : 'R',
    speed: ['1', '4', '8'].includes(d.speed) ? Number(d.speed) : 0, heightIn: h || profileHeightIn() || 70 };
  if (S.settings.bats !== opts.bats) { S.settings.bats = opts.bats; saveSettings(); }
  runSwing(file, opts);
};

// ----- Running the analysis -----
let swingJob = null;      // the analysis in progress: { ac, stage, pct }
let lastTrack = null;     // the most recent tracked swing, kept in memory so it can be re-measured with other settings
const SW_STAGE = { model: 'Getting the swing analyzer ready', find: 'Finding your swing in the video', track: 'Tracking your body, frame by frame',
  measure: 'Measuring your swing', pictures: 'Saving pictures of your positions' };
function showSwingProgress() {
  openSheet('Analyzing your swing', `<div class="stack-sm" aria-live="polite">
    <div class="sw-live" id="sw-live"><canvas id="sw-live-cv" aria-hidden="true"></canvas></div>
    <div class="small bold" id="sw-stage">${esc(SW_STAGE[swingJob ? swingJob.stage : 'model'])}</div>
    <div class="meter pc"><span id="sw-bar" style="width:${swingJob ? Math.round(swingJob.pct * 100) : 0}%"></span></div>
    <p class="hint" id="sw-sub">Keep Dugout open until it's done. Your video stays on your phone.</p>
    <button class="btn btn-ghost btn-block" data-action="swingCancel">Cancel</button>
  </div>`, { onClose: () => { if (swingJob) swingJob.ac.abort(); } });
}
function updateSwingProgress() {
  if (!swingJob) return;
  const st = $('#sw-stage'), bar = $('#sw-bar'), sub = $('#sw-sub');
  if (!st) return;
  st.textContent = SW_STAGE[swingJob.stage] || '';
  bar.style.width = `${Math.round(clamp(swingJob.pct, 0, 1) * 100)}%`;
  if (swingJob.stage === 'model' && swingJob.pct < 1) sub.textContent = `Downloading the body-tracking model (one time only): ${Math.round(swingJob.pct * 21)} of 21 MB`;
  else sub.textContent = 'Keep Dugout open until it\'s done. Your video stays on your phone.';
}
actions.swingCancel = () => { if (swingJob) swingJob.ac.abort(); closeSheet(); };
// Your tracked skeleton drawn over the video while it's analyzed.
function swLiveDraw(lm, bats) {
  const box = $('#sw-live'), cv = $('#sw-live-cv'), v = box && $('video', box);
  if (!cv || !v || !v.videoWidth) return;
  const cw = v.clientWidth, ch = v.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  if (!lm) return;
  const sc = Math.min(cw / v.videoWidth, ch / v.videoHeight), ox = (cw - v.videoWidth * sc) / 2, oy = (ch - v.videoHeight * sc) / 2;
  const P = j => [ox + lm[j][0] * v.videoWidth * sc, oy + lm[j][1] * v.videoHeight * sc], lead = bats === 'L' ? 0 : 1;
  ctx.lineCap = 'round'; ctx.lineWidth = 3;
  for (const [a, b] of SWING.BONES) {
    ctx.strokeStyle = a % 2 === lead && b % 2 === lead ? 'rgba(255,149,0,0.95)' : 'rgba(90,200,250,0.95)';
    const pa = P(a), pb = P(b);
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
  }
}

const SW_PROBLEM = {
  old: ['This browser can\'t run the swing analyzer', 'It needs iOS 16.4 or newer on iPhone, or a current Chrome on Android. Update your phone, then try again.'],
  offline: ['Connect to the internet once', 'The first time, Dugout downloads its body-tracking model (about 21 MB). Connect to Wi-Fi or data and try again — after that it works offline.'],
  model: ['The swing analyzer couldn\'t start', 'Close other apps to free up memory and try again. Restarting your phone can help.'],
  video: ['This video couldn\'t be opened', 'Try a video recorded with your phone\'s camera app. On iPhone, Settings → Camera → Formats → "Most Compatible" makes videos that open everywhere.'],
  nobody: ['Couldn\'t find you in the video', 'Make sure your whole body — head to feet — is in the frame, in good light, with the phone held still. If other people are in view, you should be the biggest.'],
  noswing: ['Couldn\'t find a full swing', 'Make sure the video shows your stance all the way through your finish, filmed steady (no zooming or following the ball). One swing per video works best.'],
  nohands: ['That doesn\'t look like a swing', 'When your hands moved fastest they weren\'t together on a bat. Make sure the video is of a swing (not a throw or a bunt) and your hands stay in the picture.']
};
function swingProblem(code) {
  const [title, text] = SW_PROBLEM[code] || ['Something went wrong', 'Try again. If it keeps happening, try a different video.'];
  openSheet(title, `<p class="text-2">${esc(text)}</p>
    <div class="sheet-actions"><button class="btn btn-ghost" data-action="closeSheet">Close</button><button class="btn btn-primary" data-action="swingNew">Try another video</button></div>`);
}

async function runSwing(file, opts) {
  if (SWING.supported()) { swingProblem('old'); return; }
  swingJob = { ac: new AbortController(), stage: 'model', pct: 0 };
  const job = swingJob;
  showSwingProgress();
  keepAwake(true);
  let tr = null;
  try {
    tr = await SWING.track(file, { signal: job.ac.signal, host: () => $('#sw-live'), onPose: lm => swLiveDraw(lm, opts.bats),
      onProgress: (stage, pct) => { job.stage = stage; job.pct = pct; updateSwingProgress(); } });
    job.stage = 'measure'; job.pct = 1; updateSwingProgress(); swLiveDraw(null);
    await new Promise(r => setTimeout(r, 40));               // let the screen show it
    const rep = SWING.analyze(tr.frames, { ...opts, aspect: tr.aspect });
    if (rep.error) throw Object.assign(new Error(rep.error), { code: rep.reason === 'hands' ? 'nohands' : rep.error });
    if (job.ac.signal.aborted) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    job.stage = 'pictures'; job.pct = 0.5; updateSwingProgress();
    const pics = await SWING.keyframes(tr, rep, SW_KEYS);
    tr.video.close(); tr.video = null;
    if (job.ac.signal.aborted || S.locked) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    const rec = saveSwing(rep, pics, { name: file.name });
    lastTrack = { id: rec.id, file, frames: tr.frames, aspect: tr.aspect, opts };
    swingJob = null;
    closeSheet();
    Object.assign(S, { tab: 'baseball', ballView: 'swing', swingOpen: rec.id });
    render({ keepScroll: false });
    toast(rec.faults.length ? `Analyzed — top priority: ${swFaultName(rec.faults[0].id).toLowerCase()}` : 'Analyzed — no big problems found');
  } catch (e) {
    if (tr && tr.video) tr.video.close();
    if (swingJob === job) swingJob = null;
    if (S.locked) return;
    const code = e && e.code;
    if (code === 'cancelled') { closeSheet(); toast('Analysis cancelled'); } else { if (!SW_PROBLEM[code] || code === 'model') console.error(e); swingProblem(code); }
  } finally {
    keepAwake(!!S.active);
  }
}

// The saved report: everything the screens need, nothing about the video file itself.
function saveSwing(rep, pics, extra, keep) {
  const track = rep.track, step = track.t.length > 180 ? 2 : 1;       // replay: at most ~180 frames
  const rec = {
    id: keep ? keep.id : uid(), kind: 'swing', date: keep ? keep.date : ymd(), at: keep ? keep.at : Date.now(),
    v: rep.version, view: rep.view, viewAuto: rep.viewAuto, bats: rep.bats, speed: rep.speed, speedAuto: rep.speedAuto,
    confidence: rep.confidence, detected: rep.detected, heightIn: rep.heightIn, score: rep.score,
    cats: Object.fromEntries(Object.entries(rep.cats).map(([k, c]) => [k, c.score])),
    metrics: rep.metrics.map(m => ({ key: m.key, cat: m.cat, label: m.label, unit: m.unit, value: m.value, status: m.status, rel: m.rel, target: m.target })),
    faults: rep.faults.map(f => ({ id: f.id, sev: f.sev, evidence: f.evidence })),
    strengths: rep.strengths, drills: rep.drills, otherViews: rep.otherViews, notes: rep.notes, timing: rep.timing, hasStride: rep.hasStride,
    series: rep.series,
    track: { aspect: track.aspect, t: track.t.filter((_, i) => i % step === 0), pts: track.pts.filter((_, i) => i % step === 0) },
    keyframes: pics, name: String((extra && extra.name) || (keep && keep.name) || '').slice(0, 80)
  };
  putLog(rec);
  // Personalized drills: if your plan is empty or came from a swing analysis, it becomes this swing's drills.
  const ids = [...new Set(rec.drills.map(d => d.id))].filter(id => DRILL_BY_ID[id]);
  if (ids.length && (!S.settings.drillPlan.length || S.settings.drillPlanFrom)) {
    S.settings.drillPlan = ids; S.settings.drillPlanFrom = rec.date; saveSettings();
  }
  return rec;
}

// ----- The report -----
function swingReport(r) {
  const earlier = logsOf('swing').filter(x => x.id !== r.id && x.view === r.view && (x.at || 0) < (r.at || 0));
  const prev = earlier[earlier.length - 1] || null;
  const pics = r.keyframes || [];
  const top = r.faults.slice(0, 4);
  const drillIds = [...new Set(r.drills.map(d => d.id))].filter(id => DRILL_BY_ID[id]);
  const isPlan = drillIds.length && drillIds.every(id => S.settings.drillPlan.includes(id));
  const byCat = Object.keys(SWING.CATS).map(c => [c, SWING.CATS[c][0], r.cats[c]]).filter(([, , s]) => s != null);
  const canRedo = lastTrack && lastTrack.id === r.id;
  later(() => swingReplay(r));
  return `<button class="btn-link sw-back" data-action="swingBack">${icon('left', 'sm')} Swing lab</button>
  <section class="card hero stack-sm">
    <div class="sw-score">
      <div class="sw-ring ${swTone(r.score)}">${swRing(r.score)}<b>${Math.round(r.score)}</b></div>
      <div class="grow"><div class="card-title">${esc(swScoreWord(r.score))} swing</div>
        <div class="small text-2">${esc(fmtDate(parseYmd(r.date), { weekday: 'short', month: 'short', day: 'numeric' }))} · filmed ${esc(swViewText(r))} · ${r.bats === 'L' ? 'left' : 'right'}-handed</div>
        <div class="small text-2">${r.timing.fps} frames per second${r.speed > 1 ? ` (${r.speed}× slow motion${r.speedAuto ? ', auto' : ''})` : ''} · ${esc(r.confidence)} confidence</div></div>
    </div>
    ${r.faults.length ? `<p class="small">Top priority: <b>${esc(swFaultName(r.faults[0].id))}</b>${r.faults.length > 1 ? ` · then ${esc(r.faults.slice(1, 3).map(f => swFaultName(f.id).toLowerCase()).join(', '))}` : ''}</p>` : '<p class="small">No big problems found from this angle — nice swing.</p>'}
  </section>
  ${pics.length ? `<section class="card stack-sm"><div class="card-title">Your positions</div>
    <div class="sw-frames">${pics.map(p => `<figure><img src="${esc(p.img)}" alt="${esc(p.label)}" loading="lazy"><figcaption>${esc(p.label)}</figcaption></figure>`).join('')}</div>
    <p class="hint">Orange = your front side, blue = your back side. Swipe for more.</p></section>` : ''}
  <section class="card stack-sm"><div class="card-title">${r.faults.length ? 'Your priorities' : 'Keep it up'}</div>
    ${top.length ? top.map((f, i) => swFaultCard(r, f, i)).join('') : '<p class="text-2 small">Nothing stood out as a problem. Film from another angle to check more, and keep grooving it with the drills below.</p>'}
    ${r.faults.length > 4 ? `<p class="small text-2">Also: ${esc(r.faults.slice(4).map(f => swFaultName(f.id).toLowerCase()).join(', '))}.</p>` : ''}
  </section>
  ${r.strengths.length ? `<section class="card stack-sm"><div class="card-title">What you do well</div><ul class="steps">${r.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''}
  ${drillIds.length ? `<section class="card stack-sm"><div class="spread"><div class="card-title row">${icon('star')} Your drills</div></div>
    <p class="hint">Picked for your priorities — the first ones are the most targeted. Do them 3 times a week, then film again to see what changed.</p>
    <div>${drillIds.map(id => drillRow(DRILL_BY_ID[id])).join('')}</div>
    ${isPlan ? '<p class="small text-2">These are your drill plan on the Drills screen.</p>' : `<button class="btn btn-ghost btn-block" data-action="swingPlan" data-id="${esc(r.id)}">${icon('star', 'sm')} Make these my drill plan</button>`}
  </section>` : ''}
  <section class="card stack-sm"><div class="card-title">Breakdown</div>
    ${byCat.map(([c, name, s]) => `<div class="sw-cat"><span>${esc(name)}</span><div class="meter pc ${swTone(s) === 'good' ? '' : swTone(s) === 'ok' ? 'near' : 'over'}"><span style="width:${clamp(s, 3, 100)}%"></span></div><b>${Math.round(s)}</b></div>`).join('')}
  </section>
  ${swTimeline(r)}
  ${swCharts(r)}
  ${r.track && r.track.t && r.track.t.length > 5 ? `<section class="card stack-sm"><div class="card-title">Replay</div>
    <div class="sw-replay"><canvas id="sw-canvas" aria-label="Stick-figure replay of your swing"></canvas></div>
    <div class="sw-controls"><button class="btn btn-sm btn-primary" data-action="swPlay" id="sw-play">${icon('play', 'sm')} Play</button>
      <input type="range" id="sw-scrub" min="0" max="${r.track.t.length - 1}" value="0" data-input="swScrub" aria-label="Move through the swing">
      <button class="btn btn-sm btn-ghost" data-action="swRate" id="sw-rate">¼×</button></div>
    <div class="small text-2" id="sw-phase">Stance</div></section>` : ''}
  <section class="card stack-sm"><div class="card-title">Every measurement</div>
    <p class="hint">Tap one to see what it means. "Other angle" = hard to see from this camera angle, so it isn't graded.</p>
    ${Object.keys(SWING.CATS).map(c => { const ms = r.metrics.filter(m => m.cat === c); return ms.length ? `<div class="section-title">${esc(SWING.CATS[c][0])}</div>${ms.map(swMetricRow).join('')}` : ''; }).join('')}
  </section>
  ${prev ? swCompare(r, prev) : ''}
  ${r.otherViews.length || r.notes.length ? `<section class="card stack-sm"><div class="card-title">To get even more</div><ul class="steps">${[...r.otherViews, ...r.notes].map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
  <section class="card stack-sm">
    ${canRedo ? `<button class="btn btn-ghost btn-block" data-action="swingRedo" data-id="${esc(r.id)}">${icon('refresh', 'sm')} Fix angle, side or speed</button>`
      : '<p class="hint">Wrong camera angle or batting side? Analyze the video again and pick them yourself.</p>'}
    <button class="btn btn-ghost btn-block" data-action="swingDelete" data-id="${esc(r.id)}">${icon('trash', 'sm')} Delete this swing</button>
  </section>`;
}
function swRing(score) {
  const c = 2 * Math.PI * 42, f = clamp(score, 0, 100) / 100;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
}
function swFaultCard(r, f, i) {
  const info = SWING_FAULTS[f.id] || {};
  const ds = r.drills.filter(d => d.fault === f.id).map(d => DRILL_BY_ID[d.id]).filter(Boolean);
  return `<div class="sw-fault">
    <div class="spread"><b>${i + 1}. ${esc(info.name || f.id)}</b>${swChip(f.sev >= 3 ? 'work' : f.sev === 2 ? 'ok' : 'check', SW_SEV[f.sev] || '')}</div>
    <p class="small">${esc(f.evidence)}</p>
    ${info.why ? `<p class="small text-2"><b>Why it matters:</b> ${esc(info.why)}</p>` : ''}
    ${info.cue ? `<p class="small"><b>Feel:</b> ${esc(info.cue)}</p>` : ''}
    ${ds.length ? `<div>${ds.map(drillRow).join('')}</div>` : ''}
  </div>`;
}
function swMetricRow(m) {
  const help = SW_HELP[m.key] || '', tgt = swTarget(m);
  return `<details class="sw-metric"><summary><span class="grow">${esc(m.label)}${tgt ? `<small>${esc(tgt)}</small>` : ''}</span><b>${esc(swVal(m))}</b>${m.status === 'info' ? '' : swChip(m.status)}</summary>
    <p class="small text-2">${esc(help)}${m.key === 'sequence' && m.value ? ` Shoulders → hands: ${Math.round(m.value.shToHands)} ms.` : ''} From this angle it's ${esc(SW_REL[m.rel] || 'fairly reliable')} to measure.</p></details>`;
}
function swTimeline(r) {
  const t = r.timing, rows = [];
  if (t.strideMs != null) rows.push(['Stride', `${t.strideMs} ms`, 'Front foot lifts → lands']);
  rows.push(['Foot down → contact', `${t.fpToContactMs} ms`, 'Your turn, after your front foot lands']);
  rows.push(['Swing time', `${t.swingMs} ms`, 'Hands start forward → contact (quicker lets you wait longer)']);
  const hs = r.metrics.find(m => m.key === 'hand_speed');
  if (hs && Number.isFinite(hs.value) && hs.rel !== 'low') rows.push(['Hand speed', `${fmt(hs.value, 1)} mph`, 'Rough top speed of your hands']);
  return `<section class="card stack-sm"><div class="card-title">Timing</div>
    <div class="timeline">${rows.map(([a, b, c]) => `<div class="tl-row"><span class="grow"><b>${esc(a)}</b><small>${esc(c)}</small></span><b>${esc(b)}</b></div>`).join('')}</div></section>`;
}

// Small charts (SVG) from the report's time series. x = milliseconds from contact.
function swCharts(r) {
  const s = r.series;
  if (!s || !s.t || s.t.length < 4) return '';
  const t = r.timing, fp = -t.fpToContactMs, ss = -t.swingMs;
  const W = 340, H = 170, L = 34, R = 10, T = 12, B = 22;
  const t0 = s.t[0], t1 = s.t[s.t.length - 1];
  const X = v => L + ((W - L - R) * (v - t0)) / ((t1 - t0) || 1);
  const frame = (lo, hi, ticks, fmtT) => {
    const Y = v => T + (H - T - B) * (1 - (v - lo) / ((hi - lo) || 1));
    let g = ticks.map(v => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="tick" x="${L - 5}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${fmtT(v)}</text>`).join('');
    const mark = (v, label) => (v > t0 && v < t1 ? `<line class="sw-mark" x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="tick" x="${X(v).toFixed(1)}" y="${H - 6}" text-anchor="middle">${label}</text>` : '');
    g += (Math.abs(X(fp) - X(0)) > 40 ? mark(fp, 'foot down') : '') + mark(0, 'contact');
    return { Y, g };
  };
  const path = (vals, Y) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(s.t[i]).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  // 1) Rotation: how open the hips and shoulders are (0 = your stance). The gap between them is separation.
  const all = [...s.hip, ...s.sh], lo = Math.floor(Math.min(-20, ...all) / 30) * 30, hi = Math.ceil(Math.max(90, ...all) / 30) * 30;
  const rot = frame(lo, hi, Array.from({ length: Math.round((hi - lo) / 30) + 1 }, (_, i) => lo + i * 30), v => `${v}°`);
  const sepArea = `${path(s.hip, rot.Y)}${s.sh.map((v, i) => `L${X(s.t[s.t.length - 1 - i]).toFixed(1)},${rot.Y(s.sh[s.sh.length - 1 - i]).toFixed(1)}`).join('')}Z`;
  const rotSvg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hip and shoulder turn during the swing">${rot.g}
    <path class="sw-sep" d="${sepArea}"/><path class="sw-line hip" d="${path(s.hip, rot.Y)}"/><path class="sw-line sh" d="${path(s.sh, rot.Y)}"/></svg>`;
  // 2) Sequence: turning speed of hips and shoulders, and hand speed, each as % of its own top speed.
  const norm = a => { const m = Math.max(1e-6, ...a); return a.map(v => Math.max(0, v) / m * 100); };
  const seq = frame(0, 100, [0, 50, 100], v => `${v}%`);
  const peakDot = (vals, cls) => { const a = norm(vals); let k = 0; a.forEach((v, i) => { if (v > a[k] && s.t[i] <= 60) k = i; }); return `<circle class="sw-dot ${cls}" cx="${X(s.t[k]).toFixed(1)}" cy="${seq.Y(a[k]).toFixed(1)}" r="4"/>`; };
  const seqSvg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Order your hips, shoulders and hands reach top speed">${seq.g}
    <path class="sw-line hip" d="${path(norm(s.hipV), seq.Y)}"/><path class="sw-line sh" d="${path(norm(s.shV), seq.Y)}"/><path class="sw-line hand" d="${path(norm(s.hand), seq.Y)}"/>
    ${peakDot(s.hipV, 'hip')}${peakDot(s.shV, 'sh')}${peakDot(s.hand, 'hand')}</svg>`;
  // 3) Head path from your stance to contact (inches); the ring is the ±3 in "quiet head" zone.
  let headSvg = '';
  if (s.head && s.head.length) {
    const upTo = s.head.filter((_, i) => s.t[i] <= 0), after = s.head.filter((_, i) => s.t[i] >= 0);
    const ext = Math.min(30, Math.max(6, ...[...upTo, ...after].map(p => Math.max(Math.abs(p[0]), Math.abs(p[1]))))) + 1;
    const Hs = 180, c = Hs / 2, k = (Hs / 2 - 14) / ext, P = p => `${(c + p[0] * k).toFixed(1)},${(c - p[1] * k).toFixed(1)}`;
    const lbl = r.view === 'side' ? ['← catcher', 'pitcher →'] : ['← away from plate', 'toward plate →'];
    const end = upTo[upTo.length - 1] || [0, 0];
    headSvg = `<svg viewBox="0 0 ${Hs} ${Hs}" class="sw-head-svg" role="img" aria-label="Your head's path from stance to contact">
      <line class="gridline" x1="0" x2="${Hs}" y1="${c}" y2="${c}"/><line class="gridline" x1="${c}" x2="${c}" y1="0" y2="${Hs}"/>
      <circle class="sw-zone" cx="${c}" cy="${c}" r="${(3 * k).toFixed(1)}"/>
      ${after.length > 1 ? `<polyline class="sw-line after" points="${after.map(P).join(' ')}"/>` : ''}
      ${upTo.length > 1 ? `<polyline class="sw-line head" points="${upTo.map(P).join(' ')}"/>` : ''}
      <circle class="sw-dot start" cx="${c}" cy="${c}" r="3.5"/><circle class="sw-dot hand" cx="${P(end).split(',')[0]}" cy="${P(end).split(',')[1]}" r="4.5"/>
      <text class="tick" x="4" y="${Hs - 5}">${lbl[0]}</text><text class="tick" x="${Hs - 4}" y="${Hs - 5}" text-anchor="end">${lbl[1]}</text>
      <text class="tick" x="${c + 4}" y="11">up</text></svg>`;
  }
  const seqM = r.metrics.find(m => m.key === 'sequence'), sepM = r.metrics.find(m => m.key === 'sep_max');
  return `<section class="card stack-sm"><div class="card-title">Hip and shoulder turn</div>
      <div class="sw-chart">${rotSvg}</div>
      <div class="sw-legend"><span><i class="hip"></i>Hips</span><span><i class="sh"></i>Shoulders</span><span><i class="sep"></i>Separation${sepM && Number.isFinite(sepM.value) ? ` (most: ${Math.round(sepM.value)}°)` : ''}</span></div>
      <p class="hint">How far each has turned toward the pitcher (0° = your stance). Good swings keep the shoulders closed until the foot lands while the hips start to open.</p>
    </section>
    <section class="card stack-sm"><div class="card-title">Firing order</div>
      <div class="sw-chart">${seqSvg}</div>
      <div class="sw-legend"><span><i class="hip"></i>Hips</span><span><i class="sh"></i>Shoulders</span><span><i class="hand"></i>Hands</span></div>
      <p class="hint">Dots mark top speed. Powerful swings fire hips → shoulders → hands${seqM && seqM.value ? ` — yours: hips to shoulders ${Math.round(seqM.value.hipToSh)} ms, shoulders to hands ${Math.round(seqM.value.shToHands)} ms` : ''}.</p>
    </section>
    ${headSvg ? `<section class="card stack-sm"><div class="card-title">Head movement</div>
      <div class="sw-chart center">${headSvg}</div>
      <p class="hint">Your head's path from your stance (center) to contact (big dot), seen ${esc(SW_VIEW_TEXT[r.view] || '')}. Staying inside the ring (3 in) keeps your eyes steady.${r.view !== 'side' ? ' Forward/back movement shows best from the side.' : ''}</p>
    </section>` : ''}`;
}

function swCompare(r, prev) {
  const was = Object.fromEntries(prev.metrics.map(m => [m.key, m]));
  const rank = { work: 0, ok: 1, good: 2 };
  const better = [], worse = [];
  for (const m of r.metrics) {
    const p = was[m.key];
    if (!p || rank[m.status] == null || rank[p.status] == null || rank[m.status] === rank[p.status]) continue;
    (rank[m.status] > rank[p.status] ? better : worse).push(`${m.label}: ${swVal(p)} → ${swVal(m)}`);
  }
  const d = Math.round(r.score - prev.score);
  return `<section class="card stack-sm"><div class="card-title">Since your last swing ${esc(SW_VIEW_TEXT[r.view] || '')}</div>
    <p class="small">Score ${Math.round(prev.score)} → <b>${Math.round(r.score)}</b> (${d > 0 ? '+' : ''}${d}) · ${esc(shortDate(prev.date))}</p>
    ${better.length ? `<div class="small"><b class="text-good">Better</b><ul class="steps">${better.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${worse.length ? `<div class="small"><b class="text-bad">Slipped</b><ul class="steps">${worse.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${!better.length && !worse.length ? '<p class="small text-2">No grades changed.</p>' : ''}
  </section>`;
}

// ----- Stick-figure replay (drawn from the tracked points) -----
let swAnim = null;         // { raf, playing, i, rate, last }
function swingReplay(r) {
  const cv = $('#sw-canvas');
  if (!cv || !r.track) return;
  if (swAnim && swAnim.raf) cancelAnimationFrame(swAnim.raf);
  const tr = r.track, n = tr.t.length, asp = tr.aspect || 16 / 9;
  const xs = [], ys = [];
  tr.pts.forEach(f => f.forEach(([x, y]) => { xs.push(x * asp); ys.push(y); }));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = cv.clientWidth || 300, bw = x1 - x0 || 1, bh = y1 - y0 || 1;
  const h = clamp(Math.round((w * bh) / bw) + 24, 180, 360), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = `${h}px`;
  const ctx = cv.getContext('2d');
  const k = Math.min((w - 24) / bw, (h - 24) / bh), ox = (w - bw * k) / 2, oy = (h - bh * k) / 2;
  const J = SWING.TRACK_JOINTS, at = j => J.indexOf(j);
  const lead = r.bats === 'L' ? 0 : 1;
  const ev = [[-(r.timing.strideMs || 0) - r.timing.fpToContactMs, 'Stride'], [-r.timing.fpToContactMs, 'Foot down'], [-r.timing.swingMs, 'Swing'], [0, 'Contact'], [60, 'Follow-through'], [260, 'Finish']];
  const phase = t => { let p = r.timing.strideMs != null ? 'Stance & load' : 'Stance'; ev.forEach(([et, name]) => { if (t >= et) p = name; }); return p; };
  const css = getComputedStyle(document.body);
  const colLead = css.getPropertyValue('--gym').trim() || '#ff7a1a', colBack = css.getPropertyValue('--water').trim() || '#38bdf8';
  const draw = i => {
    const f = tr.pts[i], P = j => [ox + (f[at(j)][0] * asp - x0) * k, oy + (f[at(j)][1] - y0) * k];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // faint trail of the hands so far
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let q = Math.max(0, i - 40); q <= i; q++) { const g = tr.pts[q], hx = ox + ((g[at(15)][0] + g[at(16)][0]) / 2 * asp - x0) * k, hy = oy + ((g[at(15)][1] + g[at(16)][1]) / 2 - y0) * k; if (q === Math.max(0, i - 40)) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy); }
    ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 4;
    for (const [a, b] of SWING.BONES) {
      ctx.strokeStyle = a % 2 === lead && b % 2 === lead ? colLead : colBack;
      const pa = P(a), pb = P(b);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    const hd = P(0), l = P(11), rs = P(12), neck = [(l[0] + rs[0]) / 2, (l[1] + rs[1]) / 2];
    ctx.strokeStyle = '#f2f5f9'; ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
    ctx.fillStyle = '#f2f5f9'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 8, 0, Math.PI * 2); ctx.fill();
    const lbl = $('#sw-phase'), sc = $('#sw-scrub');
    if (lbl) lbl.textContent = `${phase(tr.t[i])} · ${tr.t[i] > 0 ? '+' : ''}${tr.t[i]} ms`;
    if (sc && Number(sc.value) !== i) sc.value = i;
  };
  swAnim = { raf: 0, playing: false, i: 0, rate: 0.25, last: 0, draw, n, t: tr.t, cv };
  draw(0);
}
function swTick(now) {
  const a = swAnim;
  if (!a || !a.playing || !document.contains(a.cv)) { if (a) a.playing = false; return; }
  const dt = a.last ? now - a.last : 0;
  a.last = now;
  a.clock = (a.clock ?? a.t[a.i]) + dt * a.rate;
  while (a.i < a.n - 1 && a.t[a.i + 1] <= a.clock) a.i++;
  a.draw(a.i);
  if (a.i >= a.n - 1) { a.playing = false; const b = $('#sw-play'); if (b) b.innerHTML = `${icon('play', 'sm')} Play`; return; }
  a.raf = requestAnimationFrame(swTick);
}
actions.swPlay = el => {
  const a = swAnim;
  if (!a) return;
  a.playing = !a.playing;
  if (a.playing) { if (a.i >= a.n - 1) a.i = 0; a.clock = a.t[a.i]; a.last = 0; a.raf = requestAnimationFrame(swTick); }
  el.innerHTML = a.playing ? `${icon('x', 'sm')} Pause` : `${icon('play', 'sm')} Play`;
};
actions.swRate = el => {
  if (!swAnim) return;
  const rates = [0.1, 0.25, 1], next = rates[(rates.indexOf(swAnim.rate) + 1) % rates.length];
  swAnim.rate = next;
  el.textContent = next === 1 ? '1×' : next === 0.25 ? '¼×' : '⅒×';
};
inputs.swScrub = el => { const a = swAnim; if (!a) return; a.playing = false; a.i = clamp(parseInt(el.value, 10) || 0, 0, a.n - 1); a.draw(a.i); const b = $('#sw-play'); if (b) b.innerHTML = `${icon('play', 'sm')} Play`; };

// ----- Report actions -----
actions.swingPlan = el => {
  const r = swingById(el.dataset.id);
  if (!r) return;
  S.settings.drillPlan = [...new Set(r.drills.map(d => d.id))].filter(id => DRILL_BY_ID[id]);
  S.settings.drillPlanFrom = r.date;
  saveSettings(); render(); toast('Your drill plan is set — it\'s on the Drills screen');
};
actions.swingDelete = async el => {
  const r = swingById(el.dataset.id);
  if (!r || !(await confirmBox('Delete this swing?', 'Its report and pictures will be removed from this phone.', { ok: 'Delete', danger: true }))) return;
  removeLog(r.id);
  if (lastTrack && lastTrack.id === r.id) lastTrack = null;
  S.swingOpen = null; render({ keepScroll: false }); toast('Swing deleted');
};
actions.swingRedo = el => {
  const r = swingById(el.dataset.id);
  if (!r || !lastTrack || lastTrack.id !== r.id) return;
  openSheet('Re-measure this swing', `<form class="form" novalidate data-submit="swingRedo" data-id="${esc(r.id)}">
    <p class="text-2 small">Uses the body tracking from this video again — only the measuring is redone.</p>
    <div class="field"><span>Where was the camera?</span>${choice('view', SW_VIEWS.slice(1), r.view)}</div>
    <div class="field"><span>You bat</span>${choice('bats', [['R', 'Right'], ['L', 'Left']], r.bats)}</div>
    <div class="field"><span>Video speed</span>${choice('speed', SW_SPEEDS.slice(1), String(r.speed))}</div>
    <button type="submit" class="btn btn-primary btn-block">Re-measure</button>
  </form>`);
};
submits.swingRedo = async f => {
  const r = swingById(f.dataset.id), d = formData(f);
  if (!r || !lastTrack || lastTrack.id !== r.id) { closeSheet(); return; }
  const opts = { ...lastTrack.opts, view: ['side', 'front', 'back'].includes(d.view) ? d.view : r.view, bats: d.bats === 'L' ? 'L' : 'R', speed: ['1', '4', '8'].includes(d.speed) ? Number(d.speed) : r.speed };
  const rep = SWING.analyze(lastTrack.frames, { ...opts, aspect: lastTrack.aspect });
  if (rep.error) { swingProblem(rep.reason === 'hands' ? 'nohands' : rep.error); return; }
  let pics = r.keyframes;
  let vid = null;
  try { vid = await SWING.openVideo(lastTrack.file); pics = await SWING.keyframes({ video: vid, frames: lastTrack.frames }, rep, SW_KEYS); } catch (e) { /* keep the old pictures */ } finally { if (vid) vid.close(); }
  if (S.locked) return;
  const rec = saveSwing(rep, pics, null, r);
  lastTrack.opts = opts;
  closeSheet(); S.swingOpen = rec.id; render({ keepScroll: false }); toast('Re-measured');
};

/* ============================== 10. SETTINGS + BACKUP ============================== */

let storagePersisted = null;

// "Age 17 · 5′10″ · 170 lb · build muscle" from the goal calculator answers.
function profileText() {
  const p = S.settings.profile;
  if (!p || !p.age) return '';
  const h = S.settings.unit === 'kg' ? (p.cm ? `${fmt(p.cm)} cm` : '') : (p.ft ? `${p.ft}′${p.inch || 0}″` : '');
  return [`Age ${p.age}`, h, p.weight ? `${fmt(p.weight, 1)} ${S.settings.unit}` : '', GOALS[p.goal] ? GOALS[p.goal][0].toLowerCase() : ''].filter(Boolean).join(' · ');
}

function renderSettings() {
  const st = S.settings;
  const toggle = (k, title, hint) => `<label class="set-item">
      <div class="grow"><div>${title}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>
      <span class="switch"><input type="checkbox" ${st[k] ? 'checked' : ''} data-change="toggleSetting" data-k="${k}" aria-label="${title}"><span></span></span>
    </label>`;
  const last = st.lastBackup ? `Last backup: ${fmtDate(new Date(st.lastBackup), { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No backup yet';
  return `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Dugout ${APP_VERSION}</div><h1 class="page-title">Settings</h1></div></div>

    <div class="section-title">Security</div>
    <div class="set-list">
      <div class="set-item"><div class="grow"><div>Signed in as ${esc(st.username || 'you')}</div><div class="hint">Everything on this phone is encrypted (AES-256)</div></div>${icon('shield')}</div>
      <div class="set-item"><div class="grow"><div>Auto-lock</div><div class="hint">After Dugout has been in the background</div></div>
        <div class="field" style="width:150px"><select data-change="setAutoLock" aria-label="Auto-lock">${AUTOLOCK.map(([v, l]) => `<option value="${v}" ${Number(st.autoLock) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <button class="set-item as-btn" data-action="changeLogin"><div class="grow"><div>Change username or password</div></div>${icon('edit')}</button>
      <button class="set-item as-btn" data-action="lockNow"><div class="grow"><div>Lock now</div><div class="hint">Sign out until you enter your password again</div></div>${icon('shield')}</button>
    </div>

    <div class="section-title">Training</div>
    <div class="set-list">
      <div class="set-item"><div class="grow"><div>Workout time</div><div class="hint">Shown on the Today screen</div></div>
        <input class="input" type="time" value="${esc(st.workoutTime)}" data-change="setTime" aria-label="Workout time"></div>
      <div class="set-item"><div class="grow"><div>Appearance</div><div class="hint">Light is easier to read outside</div></div>
        <div class="seg" style="width:190px">${THEMES.map(([k, l]) => `<button class="${themePref() === k ? 'on' : ''}" data-action="setTheme" data-k="${k}" aria-pressed="${themePref() === k}">${l}</button>`).join('')}</div></div>
      <div class="set-item"><div class="grow"><div>Weight units</div><div class="hint">Water shows in liters with kg</div></div>
        <div class="seg" style="width:120px">${['lb', 'kg'].map(u => `<button class="${st.unit === u ? 'on' : ''}" data-action="setUnit" data-u="${u}" aria-pressed="${st.unit === u}">${u}</button>`).join('')}</div></div>
      ${toggle('autoRest', 'Auto-start rest timer', 'Starts when you check off a set')}
      ${toggle('sound', 'Timer beep', "Won't play when your phone is on silent")}
      ${toggle('keepAwake', 'Keep screen on during workouts', 'So the rest timer stays visible')}
    </div>

    <div class="section-title">Daily nutrition goals</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="calcGoals"><div class="grow"><div>Calculate my goals</div><div class="hint">${profileText() || 'From your size, age, training and goal'}</div></div>${icon('flame')}</button>
      <button class="set-item as-btn" data-action="editGoals"><div class="grow"><div>${fmt(st.calGoal)} cal · ${fmt(st.proteinGoal)} g protein</div>
        <div class="hint">${[st.carbGoal ? `${fmt(st.carbGoal)} g carbs` : '', st.fatGoal ? `${fmt(st.fatGoal)} g fat` : '', `${waterText(st.waterGoal)} water`].filter(Boolean).join(' · ')} · tap to edit</div></div>${icon('edit')}</button>
    </div>

    <div class="section-title">Claude AI (optional)</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="aiSetup"><div class="grow"><div>${st.aiKey ? 'Claude is on' : 'Connect Claude'}</div>
        <div class="hint">${st.aiKey ? `Key …${esc(st.aiKey.slice(-4))} · the Coach, pantry photo scans and meal ideas` : 'The AI Coach, smarter pantry scans and meal ideas, with your own Anthropic API key'}</div></div>${icon('sparkle')}</button>
    </div>

    <div class="section-title">Backup — never lose your data</div>
    <div class="card stack">
      <div class="row" style="align-items:flex-start">${icon('shield')}<div class="grow">
        <div class="bold">${last}</div>
        <div class="hint">Everything is stored only on this phone. About once a week, tap Export and choose <b>Save to Files</b> (iCloud Drive) or email it to yourself. Backup files are encrypted — opening one needs your username and password. Import brings it all back, even on a new phone.</div>
      </div></div>
      <button class="btn btn-primary btn-block" data-action="exportBackup" data-external>${icon('download', 'sm')} Export backup</button>
      <label class="btn btn-ghost btn-block" for="import-file" data-external>${icon('upload', 'sm')} Import backup</label>
      <button class="btn btn-ghost btn-block" data-action="csvMenu">${icon('share', 'sm')} Export spreadsheets (CSV)</button>
      <input class="vh" type="file" id="import-file" accept=".json,application/json,text/plain" data-change="importFile">
      <div class="hint center">${S.workouts.length} workouts · ${S.meals.length} food entries · ${S.foods.length} favorites · ${S.logs.length} tracking entries saved</div>
    </div>

    <div class="section-title">Plan</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="programs"><div class="grow"><div>Program: ${esc(program().name)}</div><div class="hint">Off-season, pre-season or in-season plans</div></div>${icon('plan')}</button>
      <button class="set-item as-btn" data-action="resetPlan" data-mode="gym"><div class="grow"><div>Reset Gym plan</div><div class="hint">Back to the ${esc(program().name)} gym plan</div></div>${icon('refresh')}</button>
      <button class="set-item as-btn" data-action="resetPlan" data-mode="home"><div class="grow"><div>Reset Home plan</div><div class="hint">Back to the ${esc(program().name)} home plan</div></div>${icon('refresh')}</button>
    </div>

    <div class="section-title">App</div>
    <div class="set-list">
      <div class="set-item"><div class="grow"><div>Storage</div><div class="hint">${storageText()}</div></div></div>
      <button class="set-item as-btn" data-action="checkUpdate"><div class="grow"><div>Check for updates</div><div class="hint">Dugout updates itself whenever it opens with internet — this does it right now</div></div>${icon('refresh')}</button>
      <button class="set-item as-btn" data-action="help"><div class="grow"><div>How to use Dugout</div><div class="hint">Tips for every part of the app</div></div>${icon('info')}</button>
      <button class="set-item as-btn" data-action="installHelp"><div class="grow"><div>How to install on iPhone</div></div>${icon('info')}</button>
    </div>

    <div class="section-title">Danger zone</div>
    <button class="btn btn-danger btn-block" data-action="eraseAll">${icon('trash', 'sm')} Erase all data on this phone</button>
    <p class="hint center">No ads · works offline · encrypted on this phone</p>
  </div>`;
}

function storageText() {
  if (!isStandalone()) return 'Open Dugout from its home-screen icon so iOS keeps your data safe.';
  if (storagePersisted === true) return "Protected — your phone won't clear it to save space.";
  return 'Saved on this phone. Keep regular backups.';
}

changes.toggleSetting = el => {
  S.settings[el.dataset.k] = el.checked;
  saveSettings();
  if (el.dataset.k === 'keepAwake') keepAwake(el.checked && !!S.active);
};
changes.setTime = el => {
  if (!/^\d{2}:\d{2}/.test(el.value)) return;
  S.settings.workoutTime = el.value.slice(0, 5);
  saveSettings();
  toast(`Workout time: ${clockTime(S.settings.workoutTime)}`);
};
actions.setTheme = el => {
  try { localStorage.setItem('dugout-theme', el.dataset.k); } catch (e) { /* private mode: just this session */ }
  applyTheme(); render();
};
// Switching lb ↔ kg: offer to convert what's already logged, so a 185 lb squat doesn't turn into 185 kg.
const hasWeights = () => logsOf('weight').length > 0 || !!(S.settings.profile && S.settings.profile.weight)
  || [...S.workouts, ...(S.active ? [S.active] : [])].some(w => w.exercises.some(e => e.sets.some(s => s.w != null && s.w !== 0)));
actions.setUnit = el => {
  const u = el.dataset.u, from = S.settings.unit;
  if (!['lb', 'kg'].includes(u) || u === from) return;
  if (!hasWeights()) { S.settings.unit = u; saveSettings(); render(); return; }
  openSheet(`Switch to ${u}?`, `<div class="stack">
    <p class="text-2">You've logged weights in ${from}. Convert them to ${u} (${from === 'lb' ? '185 lb → 83.9 kg' : '80 kg → 176.4 lb'})? That covers your lifts, body weight and goal answers.</p>
    <button class="btn btn-primary btn-block" data-action="unitSwitch" data-u="${u}" data-convert="1">Convert my numbers to ${u}</button>
    <button class="btn btn-ghost btn-block" data-action="unitSwitch" data-u="${u}">Just change the label</button>
    <p class="hint">Only change the label if the numbers you typed were really ${u} all along.</p>
  </div>`);
};
actions.unitSwitch = el => {
  const u = el.dataset.u;
  if (!['lb', 'kg'].includes(u) || u === S.settings.unit) { closeSheet(); return; }
  if (el.dataset.convert) convertWeights(u);
  S.settings.unit = u;
  saveSettings(); closeSheet(); render();
  toast(el.dataset.convert ? `Converted everything to ${u}` : `Weights now show in ${u}`);
};
function convertWeights(to) {
  const f = to === 'kg' ? LB : 1 / LB;
  // Two decimals so switching back and forth doesn't drift (135 lb → 61.23 kg → 135 lb); screens show one.
  const cv = v => { if (v == null || !Number.isFinite(v)) return v; const r2 = Math.round(v * f * 100) / 100, r1 = Math.round(r2 * 10) / 10; return Math.abs(r2 - r1) <= 0.011 ? r1 : r2; };
  const fixSets = w => w.exercises.forEach(e => e.sets.forEach(st => { st.w = cv(st.w); }));
  S.workouts.forEach(fixSets);
  if (S.workouts.length) save(() => DB.putMany('workouts', S.workouts));
  if (S.active) { fixSets(S.active); saveActive(); }
  const ws = S.logs.filter(l => l.kind === 'weight');
  ws.forEach(l => { l.w = cv(l.w); });
  if (ws.length) save(() => DB.putMany('logs', ws));
  const p = S.settings.profile;
  if (p) {
    if (p.weight) p.weight = cv(p.weight);
    if (to === 'kg' && p.ft) p.cm = Math.round((p.ft * 12 + (p.inch || 0)) * 2.54);
    if (to === 'lb' && p.cm) { const inch = Math.round(p.cm / 2.54); p.ft = Math.floor(inch / 12); p.inch = inch % 12; }
  }
}
// ----- Backup file -----
function backupData() {
  return {
    app: 'dugout', format: 1, version: APP_VERSION, exportedAt: new Date().toISOString(),
    kv: { settings: { ...S.settings, aiKey: '', lastBackup: Date.now() }, plan: S.plan, ...(S.active ? { active: S.active } : {}) },
    workouts: S.workouts, meals: S.meals, foods: S.foods, logs: S.logs
  };
}
function markBackedUp() {
  S.settings.lastBackup = Date.now();
  saveSettings();
  render();
  toast('Backup exported');
}
// Hand a file to the user: the Share sheet on iPhone ("Save to Files", AirDrop, Mail…),
// a normal download elsewhere. Returns false if the share sheet was closed without saving.
async function shareFile(name, text, type, title) {
  let file = null;
  try { file = new File([text], name, { type }); } catch (e) { /* very old browser */ }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return true; }
    catch (err) { if (err && err.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return true;
}
actions.exportBackup = async () => {
  let json;
  try { json = JSON.stringify(await DB.sealBackup(backupData())); }      // encrypted with your login
  catch (e) { toast('Backup failed: ' + (e.message || e)); return; }
  if (await shareFile(`dugout-backup-${ymd()}.json`, json, 'application/json', 'Dugout backup')) markBackedUp();
};

// ----- Share cards: turn your numbers into an image to send to a coach, parent or teammates -----
async function shareCard(title, sub, stats) {
  const lines = String(title).toUpperCase().match(/.{1,18}(\s|$)/g) || [String(title)];
  const tilesTop = 250 + lines.length * 100 + 90, rows = Math.ceil(Math.min(stats.length, 8) / 2);
  const W = 1080, H = Math.max(1350, tilesTop + rows * 220 + 140), c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'), font = (w, px, it = '') => `${it} ${w} ${px}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const accent = (getComputedStyle(document.body).getPropertyValue('--accent') || '#ff7a1a').trim();
  const box = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = '#07090d'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.15, 0, 0, W * 0.15, 0, 900);
  glow.addColorStop(0, accent + '66'); glow.addColorStop(1, '#07090d00');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = accent; g.font = font(900, 40); g.fillText('DUGOUT', 80, 120);
  g.fillStyle = '#f2f5f9'; g.font = font(900, 92, 'italic');
  let y = 250;
  for (const line of lines) { g.fillText(line.trim(), 80, y); y += 100; }
  g.fillStyle = '#b4bfcd'; g.font = font(600, 40); g.fillText(sub, 80, y + 10);
  stats.slice(0, 8).forEach(([label, value], i) => {
    const x = 80 + (i % 2) * 470, top = tilesTop + Math.floor(i / 2) * 220;
    g.fillStyle = '#10151d'; box(x, top, 440, 190, 28); g.fill();
    g.fillStyle = '#f2f5f9'; g.font = font(900, value.length > 7 ? 60 : 78); g.fillText(value, x + 36, top + 105);
    g.fillStyle = '#7d8a9c'; g.font = font(800, 28); g.fillText(label.toUpperCase(), x + 36, top + 155);
  });
  g.fillStyle = '#7d8a9c'; g.font = font(600, 30); g.fillText(fmtDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' }), 80, H - 70);
  const blob = await new Promise(res => c.toBlob(res, 'image/png'));
  if (blob) await shareFile(`dugout-${ymd()}.png`, blob, 'image/png', title);
}
actions.shareSeason = () => {
  const year = String(new Date().getFullYear()), st = seasonStats(logsOf('game').filter(g => g.date.startsWith(year)));
  const stats = [['AVG', avgText(st.avg)], ['OBP', avgText(st.obp)], ['SLG', avgText(st.slg)], ['OPS', st.obp == null ? '–' : avgText(st.obp + st.slg)],
    ['Home runs', String(st.b.hr)], ['RBI', String(st.b.rbi)]];
  if (st.pitched) stats.push(['ERA', st.era == null ? '–' : st.era.toFixed(2)], ['Strikeouts', String(st.p.k)]);
  else stats.push(['Stolen bases', String(st.b.sb)], ['Hits', String(st.b.h)]);
  shareCard(`${year} season`, `${st.games} game${st.games === 1 ? '' : 's'} · ${st.b.h}-for-${st.b.ab}`, stats);
};
actions.shareTests = () => {
  const stats = TESTS.map(t => { const b = bestOf(t, testLogs(t.id)); return b ? [t.name, testFmt(t, b.v)] : null; }).filter(Boolean);
  if (!stats.length) { toast('Log a test first'); return; }
  shareCard('My best marks', 'Baseball tests', stats);
};
actions.shareWorkout = el => {
  const w = S.workouts.find(x => x.id === el.dataset.id);
  if (!w) return;
  const vol = volumeOf(w), stats = [['Time', fmtDur(w.finishedAt - w.startedAt)], ['Sets', String(setsDone(w))]];
  if (vol) stats.push(['Volume', `${fmtK(vol)} ${S.settings.unit}`]);
  if (w.rpe) stats.push(['Effort', `${w.rpe}/10`]);
  shareCard(w.title, fmtDate(parseYmd(w.date), { weekday: 'long', month: 'long', day: 'numeric' }) + (isEasy(w) ? ` · ${LEVELS[w.intensity].label} day` : ''), stats);
};

// ----- Spreadsheets (CSV) for you or your coach — these are NOT encrypted -----
const csvCell = v => {
  let t = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t) && isNaN(Number(t))) t = "'" + t;   // stop spreadsheet formulas
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const toCsv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n');
const CSV = {
  workouts: ['Workouts', () => {
    const rows = [['Date', 'Mode', 'Workout', 'Level', 'Exercise', 'Set', `Weight (${S.settings.unit})`, 'Reps or seconds', 'Done', 'Effort (1-10)', 'Workout notes']];
    for (const w of [...S.workouts].reverse()) w.exercises.forEach((e, ei) => e.sets.forEach((st, i) =>
      rows.push([w.date, MODES[w.mode].label, w.title, (LEVELS[w.intensity] || LEVELS.heavy).label, e.name, i + 1, e.track === 'weight' ? st.w ?? '' : '', st.r ?? '', st.done ? 'yes' : 'no', w.rpe || '', ei === 0 && i === 0 ? w.notes || '' : ''])));
    return rows;
  }],
  food: ['Food log', () => [['Date', 'Time', 'Meal', 'Food', 'Servings', 'Serving size', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
    ...[...S.meals].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
      .map(m => [m.date, m.time || '', MEAL_LABEL[m.meal] || '', m.name, m.servings || 1, m.serving || '', m.cal, m.pro, m.carb ?? '', m.fat ?? ''])]],
  tracking: ['Weight, water, tests, games, practice, throwing and check-ins', () => {
    const rows = [['Date', 'Type', 'What', 'Value', 'Unit', 'Details']];
    for (const l of [...S.logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
      if (l.kind === 'weight') rows.push([l.date, 'Body weight', '', l.w, S.settings.unit, '']);
      else if (l.kind === 'water') rows.push([l.date, 'Water', '', metricWater() ? Math.round(l.oz * 0.0295735 * 100) / 100 : l.oz, metricWater() ? 'L' : 'oz', '']);
      else if (l.kind === 'test') { const t = TEST_BY_ID[l.test]; if (t) rows.push([l.date, 'Test', t.name, l.v, t.unit, '']); }
      else if (l.kind === 'throw') rows.push([l.date, 'Throwing', THROW_LABEL[l.type] || l.type, l.count, PITCHING.includes(l.type) ? 'pitches' : 'throws', [l.dist ? `${l.dist} ft` : '', l.feel ? `arm ${FEEL[l.feel].toLowerCase()}` : '', l.note || ''].filter(Boolean).join('; ')]);
      else if (l.kind === 'game') rows.push([l.date, 'Game', [l.opp && `vs ${l.opp}`, l.result, l.score].filter(Boolean).join(' '), '', '',
        [`${l.bat.h}-for-${l.bat.ab}`, ...BAT.slice(2).filter(([k]) => l.bat[k]).map(([k, n]) => `${l.bat[k]} ${n}`), l.pitch ? `pitching ${ipText(l.pitch.outs)} IP ${PITCH.map(([k, n]) => `${l.pitch[k]} ${n}`).join(' ')}` : '', l.note].filter(Boolean).join('; ')]);
      else if (l.kind === 'swing') rows.push([l.date, 'Swing analysis', `Filmed ${(SW_VIEW_TEXT[l.view] || '').trim()}`, l.score, '/100', l.faults.map(f => swFaultName(f.id)).join('; ') || 'no big problems']);
      else if (l.kind === 'skill') rows.push([l.date, 'Practice', (SKILL[l.type] || {}).l || l.type, l.reps ?? '', l.reps ? 'reps' : '', [l.min ? `${l.min} min` : '', l.note || ''].filter(Boolean).join('; ')]);
      else if (l.kind === 'checkin') rows.push([l.date, 'Check-in', 'Readiness', readiness(l), '/100', `sleep ${l.sleep} h; energy ${l.energy}/5; soreness ${l.sore}/5`]);
    }
    return rows;
  }]
};
actions.csvMenu = () => openSheet('Export spreadsheets', `<div class="stack">
  <p class="text-2 small">Opens in Excel, Numbers or Google Sheets — handy for sharing with a coach or trainer.</p>
  ${Object.entries(CSV).map(([k, [label]]) => `<button class="btn btn-ghost btn-block" data-action="exportCsv" data-k="${k}" data-external>${icon('download', 'sm')} ${label}</button>`).join('')}
  <div class="banner warn">${icon('shield')}<div>Spreadsheet files are <b>not encrypted</b> — anyone with the file can read it. For a full, private copy of your data use <b>Export backup</b> instead.</div></div>
</div>`);
actions.exportCsv = async el => {
  const entry = CSV[el.dataset.k];
  if (!entry) return;
  const rows = entry[1]();
  if (rows.length < 2) { toast('Nothing logged yet'); return; }
  await shareFile(`dugout-${el.dataset.k}-${ymd()}.csv`, '﻿' + toCsv(rows), 'text/csv', `Dugout ${entry[0].toLowerCase()}`);
};

let pendingBackup = null;
changes.importFile = async el => {
  const file = el.files && el.files[0];
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  el.value = '';
  if (!data || data.app !== 'dugout') { toast("That file isn't a Dugout backup"); return; }
  if (data.format === 2) {
    // Encrypted backup. Made on this phone? It opens with the key you're signed in with.
    let plain = null;
    try { plain = await DB.openBackup(data); } catch (e) { /* made with a different login */ }
    if (plain) { confirmRestore(plain); return; }
    pendingBackup = data;
    openSheet('Backup login', `<form class="form" novalidate data-submit="backupLogin">
      <p class="text-2">This backup was made with a different login (or on another phone). Enter the username and password that were used when it was made.</p>
      <label class="field"><span>Username</span><input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40"></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" maxlength="128" data-pw></label>
      <div class="auth-error" role="alert"></div>
      <button class="btn btn-primary btn-block" type="submit">Open backup</button>
    </form>`);
    return;
  }
  if (typeof data.kv !== 'object') { toast("That file isn't a Dugout backup"); return; }
  confirmRestore(data);          // an older, unencrypted backup from version 1.0
};
submits.backupLogin = async f => {
  const d = formData(f);
  setBusy(f, true, 'Opening…');
  try {
    const plain = await DB.openBackup(pendingBackup, d.username || '', d.password || '');
    pendingBackup = null;
    confirmRestore(plain);
  } catch (e) {
    setBusy(f, false);
    f.querySelector('.auth-error').textContent = e && e.name === 'OperationError' ? 'Wrong username or password for this backup.' : 'Could not open backup: ' + (e.message || e);
  }
};
async function confirmRestore(data) {
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'an unknown date';
  const counts = `${(data.workouts || []).length} workouts and ${(data.meals || []).length} food entries`;
  if (!(await confirmBox('Restore this backup?', `Backup from ${when} with ${counts}. It REPLACES everything currently in the app on this phone. Your login stays the same.`, { ok: 'Restore', danger: true }))) return;
  try {
    stopTimer();
    const username = S.settings.username;
    const kv = { ...(data.kv || {}) };
    kv.settings = { ...(kv.settings || {}), username, aiKey: S.settings.aiKey || '' };      // keep this phone's login name (and Claude key)
    await DB.replaceAll({ ...data, kv });
    await loadAll();
    render({ keepScroll: false });
    toast('Backup restored');
  } catch (e) {
    toast('Restore failed: ' + (e.message || e));
  }
}

actions.resetPlan = async el => {
  const mode = el.dataset.mode, label = MODES[mode].label;
  if (!(await confirmBox(`Reset ${label} plan?`, `All 7 ${label.toLowerCase()} days and the ${label.toLowerCase()} Light workout go back to the starting plan, replacing your edits and video links. Workout history is kept.`, { ok: 'Reset', danger: true }))) return;
  const fresh = buildPlan(program().plan);
  S.plan[mode] = fresh[mode];
  S.plan.light[mode] = fresh.light[mode];
  savePlan(); render(); toast(`${label} plan reset`);
};

actions.checkUpdate = async () => {
  if (!navigator.onLine) { toast('Connect to the internet first'); return; }
  toast('Updating…');
  try {
    if (S.active) await saveActive();
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.update();
    if (self.caches) { const keys = await caches.keys(); await Promise.all(keys.filter(k => !k.startsWith('dugout-models')).map(k => caches.delete(k))); }   // keep the big swing model
  } catch (e) { /* ignore — reload anyway */ }
  setTimeout(() => location.reload(), 400);
};

// ----- How to use Dugout -----
const HELP = [
  ['Your day in Dugout', ['Open the Today tab: it shows today\'s workout, a quick check-in, your nutrition, water and what to eat next.',
    'Tap Start to begin a workout. Check off each set — the rest timer starts on its own, and your weights from last time are filled in.',
    'Tap ▶ on any exercise for a form video, step-by-step how-to, common mistakes and easier or harder versions.',
    'Need to stop early? Tap End at the top of the workout: save the sets you did, or cancel the whole workout (you can undo it).']],
  ['Light, Moderate or Heavy', ['Every day you pick how hard to go, right above your workout on the Today screen. It starts on Heavy (the full workout) each morning.',
    'Moderate keeps the same exercises with about ⅔ of the sets, and fills in weights at about 90% of last time.',
    'Light swaps in your Light workout: mobility, arm care and core, with a form video for every exercise. Good the day after a game, sprinting or a hard practice.',
    'Change the Light workout like any other day: Plan tab → Light workout.']],
  ['Logging food fast', ['Type a few letters to search 169 common foods, your favorites and anything you logged before. Change Servings and the numbers update.',
    'Use the Recent row, Favorites, the + on a meal, or "Copy yesterday\'s food" to log in one tap.',
    'Diet → Meals has a daily plan sized to your goals, 45 recipes, a game-day timeline and a shopping list.']],
  ['Coach (AI chat)', ['The Coach tab is a chat with an AI coach (Claude, by Anthropic). It sees your plan, workouts, food log, check-ins, goals, body weight, swing analyses, stats and kitchen, so its answers are about you.',
    'Ask anything: what to eat before a game, how hard to go today, why a lift stalled, what weight to use next, how to fix a swing problem, how many pitches you can throw, what a stat means.',
    'It looks things up while it answers (you\'ll see "Looked at your workouts"), and can offer buttons — log a meal it suggested, add things to your shopping list, switch today to Light, add drills to your plan, or open a screen. Nothing changes unless you tap.',
    'It needs your own Anthropic API key (Settings → Claude AI) and internet, and usually costs a few cents a question — the chat shows about how much. Long chats cost more per question: tap New chat to start fresh.',
    'Your question and a summary of your Dugout data go to Anthropic to answer it. Chats are saved encrypted on this phone. It\'s a helpful coach, not a doctor — for pain or an injury, see an athletic trainer or doctor.']],
  ['Pantry: what can I make?', ['Diet → Pantry → Scan photos: take a photo of each pantry shelf, the fridge and the freezer (up to 6 at a time), close enough to read the labels. Check what it found, tap anything it missed, and add it to your kitchen.',
    'Or tap Add food and pick what you have. Tap a food in "In your kitchen" to note how much is left or take it off when it runs out.',
    'Make it now lists recipes you have everything for. Quick plates mix a protein, a carb and a fruit or veggie you have. One thing away shows what a single ingredient would unlock — tap + to put it on your shopping list. Pick a meal (Breakfast, Pre-game…) to narrow it down.',
    'On your phone, photos are read by recognizing the words on packages plus a few fruits and veggies by shape, so food without a label is easy to miss. Nothing is uploaded, and after the first scan (a 24 MB download) it works offline.',
    'Claude AI (optional): Settings → Claude AI takes your own Anthropic API key. Then Claude reads your photos (it recognizes nearly any food, and about how much is left) and can write meal ideas from exactly what you have. Those photos and your food list go to Anthropic, and your account is charged a few cents per use.']],
  ['Setting your goals', ['Settings → Calculate my goals turns your age, size, training and goal into calories, protein, carbs, fat and water.',
    'Weigh in once or twice a week (Progress → Body) and recalculate every month or so. If you\'re trying to gain and your weight stalls for 2–3 weeks, add about 250 calories.']],
  ['Drills for every position', ['Baseball tab → Drills: drills for hitting, pitching, catching, every infield spot, outfield, throwing and base running.',
    'Pick Alone for drills you can do by yourself (tee, net, wall, fence) or With a partner for drills with a coach, parent or teammate.',
    'Tap a drill for the steps, coaching points and mistakes to avoid, plus a demo video. Star drills to build your plan, and tap Log it to add it to your practice log.']],
  ['Swing lab (swing analysis)', ['Baseball tab → Swing lab → Analyze a swing, then pick a video. It runs on your phone — your video is never uploaded or saved.',
    'Film one swing with your whole body in the frame and the phone held still. Side view (facing your chest) sees the most; front (from the pitcher) and back (from behind the catcher) see stride direction, head and posture better.',
    'You get a score, your top priorities with the numbers behind them, pictures of your stance, load, foot plant, contact and finish, charts of your hip and shoulder turn and firing order, a replay, and every measurement with its target.',
    'Drills are picked for your priorities and become your drill plan (unless you built your own plan). Do them for 2–3 weeks, then film again from the same angle to see what changed.',
    'The first time, Dugout downloads its body-tracking model (about 21 MB). After that the Swing lab works offline.']],
  ['Games and stats', ['Log each game in the Baseball tab → Games & arm: your batting line and, if you pitched, innings (5.2 = 5⅔), hits, runs, walks and strikeouts.',
    'Your season AVG, OBP, SLG, OPS, ERA and WHIP update automatically, and pitches can go straight into the arm-care log.']],
  ['Testing the right way', ['Warm up fully first. Take 2–3 tries and log your best.', 'Test the same way each time — same surface, same timer, same time of day — so the numbers are fair.',
    'Re-test every 4–6 weeks. The stopwatch (Baseball tab → Games & arm) lets a partner time your sprints.']],
  ['Arm care and pitch counts', ['Log every throwing session with how your arm feels. Big week-to-week jumps in throwing are a common cause of arm trouble.',
    'During games use the pitch counter: it shows your Pitch Smart limit for your age and the rest days you\'ll need. Your league\'s rules come first.',
    'Soreness that fades in a day is normal. Pain, numbness or pain that lingers is not — stop throwing and tell a coach, athletic trainer or doctor.']],
  ['Programs and your plan', ['Plan → Programs switches between off-season (build), pre-season (sharpen) and in-season (maintain). Your history stays.',
    'Tap any exercise to change sets, reps, rest or the video. Use the exercise library to add new ones, or swap an exercise for today during a workout.']],
  ['Backups and privacy', ['Everything stays on this phone, encrypted with your password. There is no password reset — keep it in your iPhone Passwords app.',
    'Export a backup about once a week (Settings) and save it to Files or email it to yourself. Spreadsheet (CSV) exports are for coaches and are not encrypted.',
    'The one exception is the optional Claude AI (Settings → Claude AI): once you add your own API key, your Coach questions (with a summary of your Dugout data), the kitchen photos you choose to have Claude read, and your food list when you ask for meal ideas are sent to Anthropic. Your key is never put in backups.']]
];
actions.help = () => openSheet('How to use Dugout', `<div class="guide">${HELP.map(([title, points]) => `<details><summary>${esc(title)}</summary>
  <ul class="steps">${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>`).join('')}</div>
  <button class="btn btn-primary btn-block" data-action="closeSheet">Got it</button>`);

actions.installHelp = () => openSheet('Install on iPhone', `
  <ol class="steps">
    <li>Open the app's link in <b>Safari</b>.</li>
    <li>Tap the <b>Share</b> button (square with an up arrow). On newer iOS, tap the <b>•••</b> button first, then <b>Share</b>.</li>
    <li>Scroll down and tap <b>Add to Home Screen</b>. If you see <b>Open as Web App</b>, leave it on.</li>
    <li>Tap <b>Add</b>, then open Dugout from its new icon. It runs full-screen and works offline.</li>
  </ol>
  <p class="hint">Your data lives inside the home-screen app. Deleting the icon deletes its data, so export a backup first.</p>
  <button class="btn btn-primary btn-block" data-action="closeSheet">Got it</button>`);

actions.eraseAll = async () => {
  if (!(await confirmBox('Erase everything?', 'Deletes all workouts, food logs, favorites, settings and plan changes from this phone (your login stays). This cannot be undone — export a backup first if you might want it.', { ok: 'Erase', danger: true }))) return;
  if (!(await confirmBox('Are you sure?', 'Last chance. Everything will be erased.', { ok: 'Yes, erase all', danger: true }))) return;
  try {
    stopTimer();
    keepAwake(false);
    const username = S.settings.username;
    await DB.eraseData();
    await loadAll();
    S.settings.username = username;
    await DB.set('settings', S.settings);
    S.tab = 'today';
    render({ keepScroll: false });
    toast('All data erased');
  } catch (e) {
    toast('Erase failed: ' + (e.message || e));
  }
};

/* ============================== 11. START-UP ============================== */

// Keep "today" screens on today: after midnight, or when you unlock on a new day.
// (Otherwise food logged the next morning would land on yesterday.)
let shownDay = ymd();
function rollDay(force = false) {
  const today = ymd(), was = shownDay;
  if (!force && today === was) return false;
  shownDay = today;
  if (force || S.dietDate === was) S.dietDate = today;
  if (force || S.dietWeek === ymd(weekStart(parseYmd(was)))) S.dietWeek = ymd(weekStart());
  if (force || S.planDay === dayIdx(parseYmd(was))) S.planDay = dayIdx();
  return true;
}

// Data from an older version or a hand-edited backup can have missing or odd pieces.
// These fill them in with safe defaults so the app never crashes on load.
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
function cleanSettings(st) {
  const out = { ...DEFAULT_SETTINGS, ...(isObj(st) ? st : {}) };
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) if (v !== null && typeof out[k] !== typeof v) out[k] = v;
  if (!/^\d{2}:\d{2}$/.test(out.workoutTime)) out.workoutTime = DEFAULT_SETTINGS.workoutTime;
  if (!MODES[out.mode]) out.mode = 'gym';
  if (!['lb', 'kg'].includes(out.unit)) out.unit = 'lb';
  if (!PROGRAMS[out.program]) out.program = 'offseason';
  out.calGoal = clamp(Math.round(out.calGoal) || DEFAULT_SETTINGS.calGoal, 500, 10000);
  out.proteinGoal = clamp(Math.round(out.proteinGoal) || DEFAULT_SETTINGS.proteinGoal, 10, 500);
  out.waterGoal = clamp(Math.round(out.waterGoal) || DEFAULT_SETTINGS.waterGoal, 16, 400);
  for (const k of ['profile', 'mealPlan', 'intensity']) if (!isObj(out[k])) out[k] = null;
  out.drillPlan = Array.isArray(out.drillPlan) ? out.drillPlan.filter(id => typeof id === 'string') : [];
  if (!isObj(out.drillVideos)) out.drillVideos = {};
  if (!['R', 'L'].includes(out.bats)) out.bats = 'R';
  if (!Array.isArray(out.badges)) out.badges = null;
  out.aiKey = out.aiKey.trim();
  out.pantry = cleanPantry(out.pantry);
  return out;
}
function cleanExerciseData(e) {
  return {
    ...e, id: e.id || uid(), name: String(e.name), sets: clamp(parseInt(e.sets, 10) || 1, 1, 20),
    reps: String(e.reps ?? '10'), rest: clamp(parseInt(e.rest, 10) || 0, 0, 900), track: TRACKS[e.track] ? e.track : 'weight',
    cues: String(e.cues || ''), video: typeof e.video === 'string' && e.video ? e.video : defaultVideo(e.name)
  };
}
function cleanPlan(plan) {
  if (!isObj(plan) || !['gym', 'home'].every(m => Array.isArray(plan[m]) && plan[m].length === 7)) return null;
  const out = {};
  for (const mode of ['gym', 'home']) {
    out[mode] = plan[mode].map((d, i) => {
      const day = isObj(d) ? d : {};
      return {
        ...day, title: String(day.title || DAYS[i]), type: TYPES[day.type] ? day.type : 'strength', focus: String(day.focus || ''),
        exercises: (Array.isArray(day.exercises) ? day.exercises : []).filter(e => isObj(e) && e.name).map(cleanExerciseData)
      };
    });
  }
  // The Light workout (added in 2.1 — plans saved before then get the starting one)
  const light = isObj(plan.light) ? plan.light : {}, fresh = buildPlan({ gym: [], home: [] }).light;
  out.light = {};
  for (const mode of ['gym', 'home']) {
    const d = light[mode];
    out.light[mode] = isObj(d) && Array.isArray(d.exercises) ? {
      ...d, title: String(d.title || 'Light workout'), type: TYPES[d.type] ? d.type : 'mobility', focus: String(d.focus || ''),
      exercises: d.exercises.filter(e => isObj(e) && e.name).map(cleanExerciseData)
    } : fresh[mode];
  }
  return out;
}
const cleanWorkout = w => {
  if (!isObj(w) || !w.id || !w.startedAt || !Array.isArray(w.exercises)) return null;
  w.exercises = w.exercises.filter(e => isObj(e) && e.name && Array.isArray(e.sets));
  w.exercises.forEach(e => {
    e.sets = e.sets.filter(isObj).map(st => ({ ...st, w: optNum(st.w), r: optNum(st.r), done: !!st.done }));
    if (!TRACKS[e.track]) e.track = 'weight';
  });
  if (!MODES[w.mode]) w.mode = 'gym';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date)) w.date = ymd(new Date(w.startedAt));
  w.title = String(w.title || 'Workout');
  return w;
};
const optNum = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const cleanFood = f => (isObj(f) && f.id && f.name ? Object.assign(f, {
  name: String(f.name), cal: Number(f.cal) || 0, pro: Number(f.pro) || 0, carb: optNum(f.carb), fat: optNum(f.fat), serving: String(f.serving || '')
}) : null);
const cleanMeal = m => (cleanFood(m) && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m : null);

// Tracking entries: make sure every number the screens use is really a number.
const n0 = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
function cleanLog(l) {
  if (!isObj(l) || !l.id || typeof l.kind !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.date)) return null;
  switch (l.kind) {
    case 'weight': return Number(l.w) > 0 ? { ...l, w: Number(l.w) } : null;
    case 'water': return { ...l, oz: Math.max(0, n0(l.oz)) };
    case 'test': return TEST_BY_ID[l.test] && Number(l.v) > 0 ? { ...l, v: Number(l.v) } : null;
    case 'throw': return Number(l.count) > 0 ? { ...l, count: Number(l.count), feel: clamp(parseInt(l.feel, 10) || 4, 1, 5), dist: optNum(l.dist) } : null;
    case 'checkin': return { ...l, sleep: clamp(n0(l.sleep) || 8, 5, 9), energy: clamp(n0(l.energy) || 3, 1, 5), sore: clamp(n0(l.sore) || 2, 1, 5) };
    case 'skill': return { ...l, reps: optNum(l.reps), min: optNum(l.min) };
    case 'swing': {                         // a Swing lab report (pictures must be JPEG data, nothing else)
      if (!Array.isArray(l.metrics) || !Number.isFinite(Number(l.score)) || !isObj(l.timing)) return null;
      const arr = a => (Array.isArray(a) ? a : []);
      return { ...l, score: Number(l.score), faults: arr(l.faults).filter(f => isObj(f) && typeof f.id === 'string'), drills: arr(l.drills).filter(isObj),
        strengths: arr(l.strengths).map(String), otherViews: arr(l.otherViews).map(String), notes: arr(l.notes).map(String), cats: isObj(l.cats) ? l.cats : {},
        keyframes: arr(l.keyframes).filter(k => isObj(k) && typeof k.img === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(k.img)) };
    }
    case 'game': {
      const bat = Object.fromEntries(BAT.map(([k]) => [k, Math.max(0, n0(isObj(l.bat) ? l.bat[k] : 0))]));
      const pitch = isObj(l.pitch) && n0(l.pitch.outs) > 0 ? { outs: n0(l.pitch.outs), ...Object.fromEntries(PITCH.map(([k]) => [k, Math.max(0, n0(l.pitch[k]))])) } : null;
      return { ...l, bat, pitch, opp: String(l.opp || ''), result: ['W', 'L', 'T'].includes(l.result) ? l.result : '', score: String(l.score || ''), note: String(l.note || '') };
    }
    default: return l;                      // kinds from a newer version: keep them untouched
  }
}

async function loadAll() {
  const [settings, plan, active, workouts, meals, foods, logs, coach] = await Promise.all([
    DB.get('settings'), DB.get('plan'), DB.get('active'), DB.all('workouts'), DB.all('meals'), DB.all('foods'), DB.all('logs'), DB.get('coach')
  ]);
  S.coach = cleanCoach(coach);
  S.settings = cleanSettings(settings);
  const cleanP = cleanPlan(plan);
  if (cleanP) {
    S.plan = cleanP;
    const all = [...cleanP.gym, ...cleanP.home, cleanP.light.gym, cleanP.light.home].flatMap(d => d.exercises);
    upgradeVideos(all);                                   // placeholders → real tutorial videos
    if (JSON.stringify(cleanP) !== JSON.stringify(plan)) await DB.set('plan', S.plan);
  } else {
    S.plan = buildPlan(program().plan);
    await DB.set('plan', S.plan);
  }
  S.active = cleanWorkout(isObj(active) ? { id: 'active', ...active } : null);
  if (S.active && upgradeVideos(S.active.exercises)) await DB.set('active', S.active);
  S.workouts = (workouts || []).map(cleanWorkout).filter(Boolean).sort((a, b) => b.startedAt - a.startedAt);
  S.meals = (meals || []).map(cleanMeal).filter(Boolean);
  S.foods = (foods || []).map(cleanFood).filter(Boolean);
  S.logs = (logs || []).map(cleanLog).filter(Boolean);
  S.openEx = null;
  S.progEx = null;
  S.progMetric = null;
}

async function boot() {
  // Refuse to run inside another website's frame (blocks "clickjacking" tricks).
  if (window.top !== window.self) { document.body.innerHTML = ''; return; }
  try {
    S.vault = await DB.getRaw('vault');
  } catch (err) {
    console.error(err);
    $('#view').innerHTML = `<div class="page"><div class="card stack">
      <div class="card-title">Couldn't open your saved data</div>
      <p class="text-2 small">${esc(err.message || err)}</p>
      <p class="hint">Private Browsing blocks saving. Open Dugout in a normal Safari tab or from its home-screen icon.</p>
    </div></div>`;
    return;
  }
  S.locked = true;
  render({ keepScroll: false });       // shows "Sign in" (or "Create your login" the first time)

  // Every second: tick the workout clock. Every 30 s: refresh Today's countdown (and the date after midnight).
  let ticks = 0, stale = false;
  setInterval(() => {
    if (S.locked) return;
    ticks++;
    if (S.active) {
      const c = $('#wo-clock');
      if (c) c.textContent = clock((Date.now() - S.active.startedAt) / 1000);
    }
    if (ticks % 30) return;
    if (rollDay()) stale = true;
    if (S.active || $('#sheet-root').classList.contains('open')) return;
    if (stale) { stale = false; render(); return; }
    if (S.tab === 'today') {
      const cd = $('.countdown');
      if (cd) { const html = countdown(false); if (html) cd.outerHTML = html; else cd.remove(); }
    }
  }, 1000);

  // Ask iOS to protect our saved data from automatic clean-up.
  try {
    if (navigator.storage && navigator.storage.persist) {
      storagePersisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    }
  } catch (e) { /* not supported */ }

  // Offline support + updates (see "Updates" below)
  if ('serviceWorker' in navigator) {
    const sw = navigator.serviceWorker, ask = () => { if (sw.controller) sw.controller.postMessage('version?'); };
    sw.addEventListener('message', e => { if (e.data && e.data.type === 'dugout-version') newVersionSeen(e.data.version); });
    sw.addEventListener('controllerchange', ask);
    sw.register('./sw.js', { updateViaCache: 'none' }).then(reg => { swReg = reg; ask(); }).catch(err => console.warn('Offline mode unavailable:', err));
  }
}

// ----- Updates: always the newest version -----
// sw.js loads the newest files from GitHub every time Dugout opens with internet. If a newer version
// comes out while Dugout is open, switch to it right away when that's harmless (signed out, nothing
// typed, no workout going). Otherwise offer a Reload button, and switch the next time Dugout locks.
let swReg = null, updateReady = '', lastUpdateCheck = 0;
function checkForUpdate() {
  if (!swReg || Date.now() - lastUpdateCheck < 60000) return;
  lastUpdateCheck = Date.now();
  swReg.update().catch(() => { /* offline — try again later */ });
}
// "2.10.0" is newer than "2.9.1"
const isNewer = (a, b) => {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
function newVersionSeen(v) {
  if (!v || !isNewer(v, APP_VERSION) || v === updateReady) return;
  let tried = '';
  try { tried = sessionStorage.getItem('dugout-updated-to') || ''; } catch (e) { /* private mode */ }
  if (tried === v) return;                                  // already reloaded once for it: don't loop
  const typed = $$('#view input').some(i => i.type !== 'checkbox' && i.value), busy = !!S.active || $('#sheet-root').classList.contains('open');
  if (S.locked && !typed && !busy) { reloadForUpdate(v); return; }
  updateReady = v;
  toast('A new version of Dugout is ready', { action: () => reloadForUpdate(v), label: 'Reload' });
}
function reloadForUpdate(v) {
  try { sessionStorage.setItem('dugout-updated-to', v); } catch (e) { /* private mode */ }
  location.reload();
}

/* ============================== 12. SIGN-IN ============================== */

const AUTOLOCK = [[0, 'Immediately'], [1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour']];
const MAX_TRIES = 5;

function renderAuth() {
  const setup = !S.vault;
  return `<div class="auth">
    <div class="auth-brand"><img class="auth-logo" src="icon-192.png" alt=""><div class="day-title">Dugout</div></div>
    <form class="card form" novalidate data-submit="${setup ? 'createLogin' : 'signIn'}">
      <div>
        <h1 class="auth-title">${setup ? 'Create your login' : 'Sign in'}</h1>
        <p class="hint">${setup
          ? "Pick a username and password. You'll need them every time you open Dugout, and all your data gets encrypted with them."
          : 'Your workouts and food log are locked and encrypted on this phone.'}</p>
      </div>
      <label class="field"><span>Username</span>
        <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40"></label>
      <label class="field"><span>Password</span>
        <input name="password" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" maxlength="128" data-pw></label>
      ${setup ? `<label class="field"><span>Confirm password</span>
        <input name="confirm" type="password" autocomplete="new-password" maxlength="128" data-pw></label>` : ''}
      <label class="check-line"><input type="checkbox" data-change="showPw"> Show password</label>
      <div class="auth-error" role="alert"></div>
      <button class="btn btn-primary btn-xl" type="submit">${setup ? 'Create login' : 'Sign in'}</button>
      ${setup
        ? `<div class="banner warn">${icon('shield')}<div>There's no password reset — without your password, nobody (not even you) can unlock the data. Let your iPhone save it in Passwords, or write it down somewhere safe.</div></div>`
        : `<button type="button" class="btn-link" data-action="forgotPw">Forgot password?</button>`}
    </form>
  </div>`;
}

changes.showPw = el => { $$('[data-pw]', el.form).forEach(i => { i.type = el.checked ? 'text' : 'password'; }); };

function setBusy(f, busy, label) {
  const b = f.querySelector('button[type="submit"]');
  if (!b) return;
  if (busy) { b.dataset.label = b.textContent; b.textContent = label; b.disabled = true; }
  else { if (b.dataset.label) b.textContent = b.dataset.label; b.disabled = false; }
}
function authError(f, msg) { const e = f.querySelector('.auth-error'); if (e) e.textContent = msg; }
const waitText = ms => { const s = Math.ceil(ms / 1000); return s < 90 ? `${s} seconds` : `${Math.ceil(s / 60)} minutes`; };

function checkNewLogin(f, user, pass, confirm) {
  if (user.length < 3) { authError(f, 'Username needs at least 3 characters.'); return false; }
  if (pass.length < 8) { authError(f, 'Password needs at least 8 characters — longer is stronger.'); return false; }
  if (pass !== confirm) { authError(f, "The two passwords don't match."); return false; }
  return true;
}

// Unlocked: encrypt anything left over from version 1.0, load your data, show the app.
async function openApp(newUsername) {
  await DB.encryptOldData();
  await loadAll();
  if (newUsername) { S.settings.username = newUsername; await DB.set('settings', S.settings); }
  rollDay(true);
  S.locked = false;
  S.tab = 'today';
  render({ keepScroll: false });
  if (S.active) keepAwake(true);
  if (S.settings.seenVersion !== WHATS_NEW) {                 // after an update: show what's new (once)
    const hadData = S.workouts.length || S.meals.length;
    S.settings.seenVersion = WHATS_NEW;
    await DB.set('settings', S.settings);
    if (hadData && !S.active) whatsNew();
  }
}

// ----- What's new (shown once after an update to people who already use the app) -----
const WHATS_NEW = '2.4';
function whatsNew() {
  const item = (ic, title, text) => `<div class="new-item">${icon(ic)}<div><b>${title}</b><div class="small text-2">${text}</div></div></div>`;
  openSheet("What's new in Dugout 2.4", `
    ${item('coach', 'Coach', 'A new Coach tab: chat with an AI coach that knows your plan, workouts, food, check-ins, goals and baseball logs. Ask what to eat, how hard to train, why a lift stalled or how to fix your swing — it can log food, fill your shopping list or change today\'s workout with one tap. Needs your own Anthropic API key (Settings → Claude AI).')}
    <details class="table-toggle"><summary>New in 2.3</summary><div class="stack-sm">
    ${item('camera', 'What can I make?', 'Diet → Pantry: take photos of your pantry, fridge and freezer (or tap in what you have) and see the meals you can make right now, quick plates, what you\'re one ingredient away from, and a shopping list. Photos are read on your phone.')}
    ${item('sparkle', 'Claude AI (optional)', 'Settings → Claude AI: add your own Anthropic API key for much better photo scans and custom meal ideas made from exactly what you have.')}
    </div></details>
    <details class="table-toggle"><summary>New in 2.2</summary><div class="stack-sm">
    ${item('video', 'Swing lab', 'Baseball tab → Swing lab: film a swing from the side, front or back and get a full breakdown — stride, hip-shoulder separation, firing order, head movement, hands and finish — plus drills picked for what it finds. It all runs on your phone.')}
    ${item('baseball', '66 drills for every position', 'Baseball tab → Drills: hitting, pitching, catching, every infield spot, outfield, throwing and base running — split into drills you can do alone and drills with a partner.')}
    ${item('x', 'End a workout early', 'Tap End at the top of a workout to save what you did or cancel it.')}
    </div></details>
    <details class="table-toggle"><summary>New in 2.1</summary><div class="stack-sm">
    ${item('flame', 'Light, Moderate or Heavy', 'Pick how hard to go each day, right on the Today screen. Moderate trims the sets and weights. Light swaps in an easy recovery workout with a form video for every exercise.')}
    ${item('dumbbell', '10 more exercises', 'Goblet squats, Bulgarian split squats, band pull-aparts and more in the exercise library.')}
    ${item('refresh', 'Always the newest version', 'Dugout now loads the latest version every time you open it with internet.')}
    ${item('shield', 'Fixes', 'Switching lb and kg converts what you logged, and pitch counts add up across a whole day for Pitch Smart rest days.')}
    </div></details>
    <details class="table-toggle"><summary>Everything new in 2.0</summary><div class="stack-sm">
    ${item('diet', 'Easier food logging', 'Search 169 foods, pick servings, and track carbs and fat. Recent foods and "copy yesterday" save taps.')}
    ${item('flame', 'Goals made for you', 'Calculate calories, protein and water from your size and training. Track water and body weight.')}
    ${item('check', 'Meal plans and recipes', 'A daily plan sized to your goals, 45 recipes, a game-day timeline, the week ahead and a shopping list.')}
    ${item('dumbbell', 'Smarter workouts', 'How-tos for every exercise, a library, swaps, next-weight tips, warm-up sets, a plate calculator and effort notes.')}
    ${item('plan', 'In-season program', 'Plan tab → Programs: off-season, pre-season and in-season plans, including two short lifts a week to stay strong during the season.')}
    ${item('timer', 'Baseball tests, stats and arm care', 'Baseball tab: a game log with AVG/OBP/SLG and ERA, 60-yard and exit velo tests, a throwing log, a live pitch counter with Pitch Smart rest days, and a stopwatch.')}
    ${item('trophy', 'Stay on track', 'Daily readiness check-in, a weekly review, a training calendar, badges and spreadsheet export.')}
    ${item('settings', 'Light mode', 'Settings → Appearance: a bright theme that is easier to read outside at the field.')}
    </div></details>
    <button class="btn btn-primary btn-block" data-action="closeSheet">Let's go</button>`);
}

submits.createLogin = async f => {
  const d = formData(f);
  const user = String(d.username || '').trim(), pass = String(d.password || '');
  if (!checkNewLogin(f, user, pass, String(d.confirm || ''))) return;
  setBusy(f, true, 'Securing your data…');
  try {
    S.vault = await DB.createVault(user, pass);
    await openApp(user);
    toast('Login created — your data is encrypted');
    actions.onboard();
  } catch (e) {
    setBusy(f, false);
    authError(f, 'Could not create your login: ' + (e.message || e));
  }
};

submits.signIn = async f => {
  const d = formData(f);
  if (!d.username || !d.password) { authError(f, 'Enter your username and password.'); return; }
  const lock = await DB.getRaw('lockout');
  if (lock && lock.until > Date.now()) { authError(f, `Too many wrong tries. Try again in ${waitText(lock.until - Date.now())}.`); return; }
  setBusy(f, true, 'Unlocking…');
  try {
    await DB.unlock(d.username, d.password);
  } catch (e) {
    setBusy(f, false);
    if (e && e.name === 'OperationError') {           // the key didn't unlock = wrong username or password
      const next = await recordFailedSignIn(lock);
      f.elements.password.value = '';
      authError(f, next.until > Date.now()
        ? `Wrong username or password. Too many tries — wait ${waitText(next.until - Date.now())}.`
        : 'Wrong username or password.');
    } else {
      authError(f, 'Could not unlock: ' + (e.message || e));
    }
    return;
  }
  try {
    await DB.delRaw('lockout');
    await openApp();
  } catch (e) {
    console.error(e);
    setBusy(f, false);
    authError(f, 'Could not open your data: ' + (e.message || e));
  }
};

// After 5 wrong tries in a row, make people wait: 30 seconds, then doubling up to 1 hour.
async function recordFailedSignIn(prev) {
  const fails = ((prev && prev.fails) || 0) + 1;
  const until = fails >= MAX_TRIES ? Date.now() + Math.min(3600, 30 * 2 ** (fails - MAX_TRIES)) * 1000 : 0;
  const next = { fails, until };
  await DB.setRaw('lockout', next);
  return next;
}

// Sign out: forget the key and wipe everything from memory.
async function lockApp(message) {
  if (S.locked) return;
  clearTimeout(saveActiveTimer);
  if (S.active) { try { await DB.set('active', S.active); } catch (e) { /* ignore */ } }
  stopTimer();
  keepAwake(false);
  closeSheet();
  $('#toast').classList.remove('show');
  toastAct = null;
  DB.lock();
  badgeSig = ''; calcResult = null; pendingBackup = null;
  if (swingJob) swingJob.ac.abort();                 // stop a swing analysis and forget the last video
  swingJob = null; lastTrack = null;
  if (panJob) panJob.ac.abort();                     // and a pantry scan or idea request
  panJob = null; panFound = null;
  if (coachJob) coachJob.ac.abort();                 // and a Coach reply
  coachJob = null;
  Object.assign(S, { locked: true, settings: { ...DEFAULT_SETTINGS }, plan: null, active: null, workouts: [], meals: [], foods: [], logs: [], openEx: null, swingOpen: null, coach: null, coachDraft: '' });
  render();
  if (message) toast(message);
  if (updateReady) reloadForUpdate(updateReady);        // a new version was waiting: switch to it now
}
actions.lockNow = () => lockApp('Locked');

changes.setAutoLock = el => {
  S.settings.autoLock = Number(el.value);
  saveSettings();
  toast(`Auto-lock: ${(AUTOLOCK.find(a => a[0] === S.settings.autoLock) || AUTOLOCK[2])[1].toLowerCase()}`);
};

actions.changeLogin = () => openSheet('Change login', `<form class="form" novalidate data-submit="changeLogin">
  <label class="field"><span>Current password</span><input name="current" type="password" autocomplete="current-password" maxlength="128" data-pw></label>
  <label class="field"><span>Username</span><input name="username" value="${esc(S.settings.username)}" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40"></label>
  <label class="field"><span>New password</span><input name="password" type="password" autocomplete="new-password" maxlength="128" data-pw placeholder="Leave blank to keep your current one"></label>
  <label class="field"><span>Confirm new password</span><input name="confirm" type="password" autocomplete="new-password" maxlength="128" data-pw></label>
  <label class="check-line"><input type="checkbox" data-change="showPw"> Show passwords</label>
  <div class="auth-error" role="alert"></div>
  <button class="btn btn-primary btn-block" type="submit">Save new login</button>
</form>`);
submits.changeLogin = async f => {
  const d = formData(f);
  const user = String(d.username || '').trim(), cur = String(d.current || '');
  const pass = d.password ? String(d.password) : cur;
  if (!cur) { authError(f, 'Enter your current password.'); return; }
  if (!checkNewLogin(f, user, pass, d.password ? String(d.confirm || '') : pass)) return;
  setBusy(f, true, 'Saving…');
  try {
    S.vault = await DB.changeLogin(S.settings.username, cur, user, pass);
  } catch (e) {
    setBusy(f, false);
    authError(f, e && e.name === 'OperationError' ? 'Your current password is wrong.' : 'Could not change your login: ' + (e.message || e));
    return;
  }
  S.settings.username = user;
  await save(() => DB.set('settings', S.settings));
  closeSheet();
  render();
  toast('Login updated');
};

// ----- First-run setup (right after creating a login) -----
const choice = (name, opts, cur) => `<div class="choice">${opts.map(([v, l]) => `<label class="feel-opt"><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
actions.onboard = () => openSheet('Welcome to Dugout', `<form class="form" novalidate data-submit="onboard">
  <p class="text-2">Let's set up your training. You can change any of this later in Settings.</p>
  <div class="field"><span>Where will you train?</span>${choice('mode', [['gym', 'Gym'], ['home', 'Home (no equipment)']], S.settings.mode)}</div>
  <div class="field"><span>What part of the year is it?</span>${choice('program', [['offseason', 'Off-season'], ['preseason', 'Pre-season'], ['inseason', 'In-season']], S.settings.program)}
    <small>Off-season builds strength and speed. Pre-season (about 6 weeks before games) sharpens power and speed. In-season keeps them with 2 short lifts so you're fresh for games.</small></div>
  <div class="form-grid">
    <label class="field"><span>Usual workout time</span><input name="time" type="time" value="${esc(S.settings.workoutTime)}"></label>
    <div class="field"><span>Weights in</span>${choice('unit', [['lb', 'lb'], ['kg', 'kg']], S.settings.unit)}</div>
  </div>
  <button class="btn btn-primary btn-block" type="submit">Next: my nutrition goals</button>
  <button class="btn btn-ghost btn-block" type="button" data-action="closeSheet">Skip — use the defaults</button>
</form>`);
submits.onboard = f => {
  const d = formData(f);
  if (MODES[d.mode]) S.settings.mode = d.mode;
  if (['lb', 'kg'].includes(d.unit)) S.settings.unit = d.unit;
  if (/^\d{2}:\d{2}/.test(d.time || '')) S.settings.workoutTime = d.time.slice(0, 5);
  if (PROGRAMS[d.program] && d.program !== S.settings.program) { S.settings.program = d.program; S.plan = buildPlan(PROGRAMS[d.program].plan); savePlan(); }
  saveSettings(); render({ keepScroll: false });
  actions.calcGoals();
};

actions.forgotPw = () => openSheet('Forgot your password?', `
  <p class="text-2">For your security, Dugout can't show or reset your password — your data is encrypted with it, and only it can unlock it.</p>
  <ul class="steps">
    <li>Check the <b>Passwords</b> app on your iPhone (or Settings → Passwords) — iOS may have saved it for you.</li>
    <li>If it's really gone, you can erase everything on this phone and start again with a new login.</li>
  </ul>
  <button class="btn btn-danger btn-block" data-action="resetEverything">${icon('trash', 'sm')} Erase everything and start over</button>`);
actions.resetEverything = async () => {
  if (!(await confirmBox('Erase everything?', 'All workouts, food logs, favorites, settings and your login will be deleted from this phone. This cannot be undone.', { ok: 'Erase', danger: true }))) return;
  if (!(await confirmBox('Are you sure?', 'Last chance — everything on this phone will be erased.', { ok: 'Yes, erase everything', danger: true }))) return;
  try { await DB.eraseEverything(); }
  catch (e) { toast('Erase failed: ' + (e.message || e)); return; }
  DB.lock();
  S.vault = null;
  render();
  toast('Erased — create a new login');
};

boot();
