/* app.js — everything you see and tap in Dugout.

   Sections:
     1. Helpers            6. Rest timer, sound, screen-awake
     2. Icons              7. Plan tab
     3. State & saving     8. Diet tab
     4. App shell          9. Progress tab (charts + history)
     5. Today tab + workout in progress
                          10. Settings tab + backup
                          11. Start-up                                   */

'use strict';

const APP_VERSION = '2.0.0';

// If a data file didn't load (e.g. offline right after an update), run with empty data instead of crashing.
if (typeof RECIPES === 'undefined') Object.assign(self, { RECIPES: [], RECIPE_BY_ID: {}, MEAL_TAGS: {}, DIET_GUIDE: [] });
if (typeof FOODS === 'undefined') self.FOODS = [];
if (typeof EXERCISE_INFO === 'undefined') Object.assign(self, { EXERCISE_INFO: {}, EXERCISE_GROUPS: [] });

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
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0l-2.2 2.2"/>'
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
  seenVersion: ''         // last "What's new" shown
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
  progEx: null,
  progMetric: null,
  progRange: 'all',
  progView: 'lifts',   // Progress tab: lifts, body or baseball
  editCheckin: false,  // Today: daily check-in form open
  calMonth: null,      // Progress calendar month ("YYYY-MM"), null = this month
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
function buildPlan(src) {
  const p = clone({ gym: src.gym, home: src.home });
  for (const mode of ['gym', 'home']) for (const day of p[mode]) for (const e of day.exercises) e.id = uid();
  return p;
}
const planFor = (mode = S.settings.mode) => S.plan[mode];
const program = () => PROGRAMS[S.settings.program] || PROGRAMS.offseason;
const dayPlan = (i, mode = S.settings.mode) => S.plan[mode][i];

function findPlanEx(id) {
  if (!id) return null;
  for (const mode of ['gym', 'home']) for (const day of S.plan[mode]) {
    const e = day.exercises.find(x => x.id === id);
    if (e) return e;
  }
  return null;
}

// The most recent time you did this exercise (same Gym/Home mode) — for "Last time" and pre-filled weights.
function lastSetsFor(name, mode) {
  const key = normName(name);
  for (const w of S.workouts) {
    if (w.mode !== mode) continue;
    const e = w.exercises.find(x => normName(x.name) === key);
    if (e && e.sets.some(s => s.done)) return { date: w.date, sets: e.sets.filter(s => s.done) };
  }
  return null;
}

/* ============================== 4. APP SHELL ============================== */

const actions = {}, inputs = {}, changes = {}, submits = {};
let postRender = [];
const later = fn => postRender.push(fn);

const TABS = [['today', 'Today'], ['plan', 'Plan'], ['diet', 'Diet'], ['progress', 'Progress'], ['settings', 'Settings']];

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
  const views = { today: renderToday, plan: renderPlan, diet: renderDiet, progress: renderProgress, settings: renderSettings };
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

function todayCard(day, di, doneToday) {
  const m = MODES[S.settings.mode];
  const n = day.exercises.length;
  const isRest = day.type === 'rest';
  const preview = day.exercises.slice(0, 5).map(e => `<div><span>${esc(e.name)}</span><span>${e.sets} × ${esc(e.reps)}</span></div>`).join('')
    + (n > 5 ? `<div><span class="muted">+ ${n - 5} more</span><span></span></div>` : '');
  const startLabel = isRest ? 'Start optional recovery' : doneToday ? 'Train again' : `Start ${m.label} workout`;
  const check = checkinOf(ymd()), lowReady = check && readiness(check) < 50 ? readiness(check) : null;
  return `<section class="card hero">
    <div class="spread">
      <span class="badge accent">${icon(m.icon)} ${m.label} · ${TYPES[day.type] || 'Workout'}</span>
      ${doneToday ? `<span class="badge good">${icon('check')} Done</span>` : ''}
    </div>
    <div>
      <h2 class="day-title">${esc(day.title)}</h2>
      ${day.focus ? `<p class="text-2 small" style="margin-top:8px">${esc(day.focus)}</p>` : ''}
    </div>
    ${lowReady != null && !isRest && !doneToday ? `<div class="banner warn">${icon('info')}<div>Readiness is ${lowReady} today. Warm up, then decide — cutting a set from each exercise, or doing the mobility day instead, is a smart call.</div></div>` : ''}
    <div class="meta-row">
      <span>${icon('clock', 'sm')} ${clockTime(S.settings.workoutTime)}</span>
      ${n ? `<span>${n} exercise${n === 1 ? '' : 's'}</span><span>~${estMinutes(day)} min</span>` : ''}
    </div>
    ${countdown(doneToday || isRest)}
    ${n ? `<div class="preview-list">${preview}</div>` : ''}
    ${doneToday ? `<button class="btn btn-ghost btn-block" data-action="showWorkout" data-id="${doneToday.id}">See today's workout</button>` : ''}
    ${n ? `<button class="btn ${isRest || doneToday ? 'btn-ghost' : 'btn-primary'} btn-xl" data-action="startWorkout" data-day="${di}">${icon('play')} ${startLabel}</button>`
        : `<p class="muted small">No exercises on this day. Add some in the Plan tab.</p>`}
    <button class="btn-link" data-action="pickDay">Do a different day's workout</button>
  </section>`;
}

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
    ${next ? `<button class="next-meal" data-action="openRecipe" data-id="${next.r.id}" data-slot="${next.slot}" data-servings="${next.servings}">
      <span class="grow">
        <span class="plan-slot">Up next · ${slotName(next.slot, kind)}</span>
        <span class="meal-name">${esc(next.r.name)}</span>
        <span class="meal-sub">${servingsText(next.servings)} · ${fmt(next.r.cal * next.servings)} cal · ${fmt(next.r.pro * next.servings)} g protein</span>
      </span>${icon('right', 'sm')}</button>` : ''}
    <button class="btn-link meal-link" data-action="openMealPlan">Today's meal plan & recipes</button>
  </section>`;
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
  const mode = S.settings.mode, today = dayIdx();
  openSheet(`Pick a ${MODES[mode].label.toLowerCase()} workout`, `<div class="stack">${planFor(mode).map((d, i) => `
    <button class="hist" data-action="startWorkout" data-day="${i}" ${d.exercises.length ? '' : 'disabled'}>
      <div><div class="hist-title">${DAYS[i]}${i === today ? ' · today' : ''}</div><div class="hist-sub">${esc(d.title)} · ${d.exercises.length} exercises</div></div>
      <div class="hist-right">${icon('play')}</div>
    </button>`).join('')}</div>`);
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
  const di = Number(el.dataset.day), mode = S.settings.mode;
  const day = dayPlan(di, mode);
  if (!day || !day.exercises.length) { toast('Add exercises to this day in the Plan tab first'); return; }
  closeSheet();
  S.active = {
    id: uid(), mode, dayIndex: di, title: day.title, type: day.type,
    date: ymd(), startedAt: Date.now(), finishedAt: null,
    exercises: day.exercises.map(e => ({
      planId: e.id, name: e.name, reps: e.reps, rest: e.rest, track: e.track, cues: e.cues, video: e.video,
      sets: makeSets(e.sets, e.track, lastSetsFor(e.name, mode))
    }))
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
          <div class="row" style="gap:10px">
            <span class="badge solid">${icon(m.icon)} ${m.label}</span>
            <span class="wo-clock" id="wo-clock">${clock((Date.now() - a.startedAt) / 1000)}</span>
            <span class="wo-clock" id="wo-count">${done}/${total} sets</span>
          </div>
          <div class="wo-title" style="margin-top:6px">${esc(a.title)}</div>
        </div>
        <button class="btn btn-icon btn-ghost" data-action="workoutMenu" aria-label="Workout options">${icon('more')}</button>
      </div>
      <div class="wo-bar"><span id="wo-bar" style="width:${total ? (done / total) * 100 : 0}%"></span></div>
    </div>
    <div class="wo-list">
      ${Date.now() - (a.lastAt || a.startedAt) > 4 * 3600000 ? `<div class="banner warn">${icon('clock')}
        <div class="grow">Started ${fmtDate(new Date(a.startedAt), { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Forgot to finish? Your time is saved up to your last set.</div>
        <button class="btn btn-sm btn-primary" data-action="finishWorkout">Finish</button></div>` : ''}
      ${a.exercises.map((e, i) => woExercise(e, i, i === open)).join('')}
      <button class="btn btn-ghost btn-block" data-action="addWorkoutExercise">${icon('plus')} Add exercise</button>
      <button class="btn btn-primary btn-xl" data-action="finishWorkout">${icon('check')} Finish workout</button>
    </div>`;
}

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
  const nw = nextWeight(e, last), u = S.settings.unit;
  const firstW = (e.sets.find(st => st.w > 0) || {}).w;
  const work = nw ? nw.to : firstW || (last ? Math.max(0, ...last.sets.map(st => st.w || 0)) : 0);
  const warm = e.sets.some(st => st.done) ? '' : warmupSets(e, work);
  return `${nw ? `<div class="wo-tip">${icon('up', 'sm')}<span class="grow">Every set hit ${targetNum(e.reps)}+ reps at ${fmt(nw.from, 1)} ${u} last time — try <b>${fmt(nw.to, 1)} ${u}</b> today.</span>
      <button class="btn btn-sm btn-ghost" data-action="useWeight" data-i="${i}" data-w="${nw.to}">Use it</button></div>` : ''}
    ${warm ? `<div class="wo-warm"><span class="grow">Warm-up first: <b>${warm}</b></span>
      <button class="btn-link" data-action="plateCalc" data-w="${work}" data-bar="${barFor(e.name)}">Plates</button></div>` : ''}`;
}
// Which bar a lift usually uses (for the plate calculator): machines load plates only.
const barFor = name => { const kg = S.settings.unit === 'kg'; return /leg press|sled/i.test(name) ? 0 : /trap bar/i.test(name) ? (kg ? 25 : 60) : (kg ? 20 : 45); };
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
    const next = exDone ? S.active.exercises.find(x => x.sets.some(y => !y.done)) : null;
    startTimer(e.rest, next ? `Next: ${next.name}` : `Rest · ${e.name}`);
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
  <button class="btn btn-danger btn-block" data-action="discardWorkout">${icon('trash', 'sm')} Discard workout</button>
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

actions.finishWorkout = async () => {
  if (!S.active) return;
  const { total, done } = workoutProgress();
  if (done === 0) {
    if (await confirmBox('Nothing checked off', "You haven't checked off any sets. Discard this workout?", { ok: 'Discard', danger: true })) endWorkout(false);
    return;
  }
  if (done < total) {
    const left = total - done;
    if (!(await confirmBox('Finish workout?', `${left} set${left === 1 ? ' is' : 's are'} not checked off. They'll be saved as skipped.`, { ok: 'Finish' }))) return;
  } else closeSheet();
  endWorkout(true);
};
actions.discardWorkout = async () => {
  if (await confirmBox('Discard workout?', 'Everything logged in this workout will be deleted.', { ok: 'Discard', danger: true })) endWorkout(false);
};

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
    // Forgot to tap Finish? End the workout a minute after your last checked set instead of now.
    if (a.lastAt && a.finishedAt - a.lastAt > 3 * 3600000) a.finishedAt = a.lastAt + 60000;
    prs = findPRs(a);
    S.workouts.unshift(a);
    await save(() => DB.put('workouts', a));
  }
  await saveActive();
  render({ keepScroll: false });
  if (keep) showSummary(a, prs); else toast('Workout discarded');
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
  const vol = volumeOf(w);
  openSheet('Workout complete', `
    <div class="tiles">
      <div class="tile"><div class="tile-label">Time</div><div class="tile-value">${fmtDur(w.finishedAt - w.startedAt)}</div></div>
      <div class="tile"><div class="tile-label">Sets done</div><div class="tile-value">${setsDone(w)}</div></div>
      <div class="tile"><div class="tile-label">Volume</div><div class="tile-value">${vol ? `${fmtK(vol)} <small>${S.settings.unit}</small>` : '–'}</div></div>
    </div>
    ${prs.length ? `<div class="card stack-sm"><div class="card-title row">${icon('trophy')} New personal records</div>${prs.map(p => `<div class="small text-2">${esc(p)}</div>`).join('')}</div>` : ''}
    ${effortBlock(w)}
    <p class="text-2 small">Saved to your history on the Progress tab.</p>
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
    ${videoRef && videoRef.src === 'wo' ? swapBlock(ex) : ''}
    ${info ? `<details class="table-toggle"><summary>Use a different video</summary>${form}</details>` : form}`);
}

const videoEmbed = (info, name) => `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${info.id}?playsinline=1&rel=0&modestbranding=1${info.start ? `&start=${info.start}` : ''}"
  title="${esc(name)} form video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;

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
      : `<button class="btn btn-primary btn-block" data-action="libAdd" data-name="${esc(name)}">${icon('plus', 'sm')} Add to ${DAYS[S.planDay]} · ${MODES[S.settings.mode].label}</button>`}
    <button class="btn btn-ghost btn-block" data-action="libBack">Back to the library</button>`);
};
actions.libBack = () => openLibrary();
actions.libAdd = el => {
  const name = el.dataset.name, t = planTemplate(name);
  dayPlan(S.planDay).exercises.push({ id: uid(), name, sets: t ? t.sets : 3, reps: t ? t.reps : '10', rest: t ? t.rest : 60, track: t ? t.track : 'reps', cues: t ? t.cues : '', video: defaultVideo(name) });
  savePlan(); closeSheet(); render();
  toast(`${name} added to ${DAYS[S.planDay]}`);
};

// How the starting plan sets up an exercise (cues, reps, what to log).
function planTemplate(name) {
  for (const mode of ['gym', 'home']) for (const d of DEFAULT_PLAN[mode]) { const e = d.exercises.find(x => x.name === name); if (e) return e; }
  return null;
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
    </button>`).join('');
  return `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Weekly plan</div><h1 class="page-title">Plan</h1></div>
      <button class="btn btn-sm btn-ghost" data-action="programs">${icon('refresh', 'sm')} ${esc(program().name)}</button></div>
    ${modeToggle()}
    <div class="days">${chips}</div>
    <section class="card hero">
      <div class="spread">
        <span class="badge accent">${icon(m.icon)} ${m.label} · ${DAYS[di]}</span>
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
    ${n ? `<button class="btn btn-primary btn-xl" data-action="startWorkout" data-day="${di}" ${S.active ? 'disabled' : ''}>${icon('play')} ${S.active ? 'Workout in progress' : 'Start this workout'}</button>` : ''}
    <p class="hint center">Tap an exercise to change its sets, reps, rest, cues or video. Gym and Home plans are completely separate — switch with the toggle at the top.</p>
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
  <p class="hint">Switching replaces both your gym and home weekly plans (including your edits). Your workout history, charts and records stay.</p>
</div>`);
actions.useProgram = async el => {
  const k = el.dataset.k, p = PROGRAMS[k];
  if (!p) return;
  if (!(await confirmBox(`Switch to ${p.name}?`, 'Your gym and home weekly plans will be replaced with this program. Workout history is kept.', { ok: 'Switch' }))) return;
  S.plan = buildPlan(p.plan);
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
  openSheet(`Add to ${DAYS[S.planDay]}`, exerciseForm(
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
  if (!(await confirmBox('Delete exercise?', `Remove "${e.name}" from ${DAYS[S.planDay]}? Your workout history is kept.`, { ok: 'Delete', danger: true }))) return;
  list.splice(i, 1);
  savePlan(); render(); toast('Exercise deleted');
};

actions.editDay = () => {
  const day = dayPlan(S.planDay);
  openSheet(`${DAYS[S.planDay]} · ${MODES[S.settings.mode].label}`, `<form class="form" novalidate data-submit="saveDay">
    <label class="field"><span>Workout name</span><input name="title" value="${esc(day.title)}" maxlength="60" required autocomplete="off"></label>
    <label class="field"><span>Type of day</span>
      <select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${day.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field"><span>Focus / notes</span><textarea name="focus" maxlength="400">${esc(day.focus)}</textarea></label>
    <button class="btn btn-primary btn-block" type="submit">Save</button>
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
actions.resetDay = async () => {
  const mode = S.settings.mode, di = S.planDay;
  if (!(await confirmBox('Reset this day?', `${DAYS[di]} (${MODES[mode].label}) goes back to the starting exercises and videos. Your workout history is kept.`, { ok: 'Reset', danger: true }))) return;
  S.plan[mode][di] = buildPlan(program().plan)[mode][di];
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
    <div class="seg" role="group" aria-label="Day, week or meal ideas">
      ${[['day', 'Day'], ['week', 'Week totals'], ['meals', 'Meals']].map(([v, label]) =>
        `<button class="${S.dietView === v ? 'on' : ''}" data-action="dietView" data-v="${v}" aria-pressed="${S.dietView === v}">${label}</button>`).join('')}
    </div>
    ${S.dietView === 'week' ? dietWeek() : S.dietView === 'meals' ? dietMeals() : dietDay()}
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
    <div class="macro-val">${waterText(oz)} <small>/ ${waterText(goal)}</small></div>
    <div class="meter water" role="progressbar" aria-label="Water" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>
    <div class="water-btns">
      ${adds.map(([v, l]) => `<button class="btn btn-sm btn-ghost" data-action="addWater" data-oz="${v}" data-date="${date}">${icon('drop', 'sm')} ${l}</button>`).join('')}
      <button class="btn btn-sm btn-ghost btn-icon sm" data-action="addWater" data-oz="${-adds[0][0]}" data-date="${date}" aria-label="Take some off" ${oz <= 0 ? 'disabled' : ''}>${icon('minus', 'sm')}</button>
    </div>
  </section>`;
}
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
        <thead><tr><th>Day</th><th>Calories</th><th>Protein</th></tr></thead>
        <tbody>
          ${days.map(x => `<tr class="${x.key === todayKey ? 'today' : ''}" data-action="dietOpenDay" data-date="${x.key}">
            <td>${fmtDate(x.d, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
            ${cell(x.cal, calGoal, fmt(x.cal), x.future)}${cell(x.pro, proteinGoal, fmt(x.pro, 1) + ' g', x.future)}</tr>`).join('')}
          <tr><td class="bold">Total</td><td class="bold">${fmt(totCal)}</td><td class="bold">${fmt(totPro, 1)} g</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top:10px">✓ = daily goal reached. Tap a day to see what you ate.</p>
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
    used.add(r.id);
    return { slot, r, servings: 1 };
  });
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

const PROG_VIEWS = [['lifts', 'Lifts'], ['body', 'Body'], ['baseball', 'Baseball']];
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
  if (S.progView === 'baseball') return `<div class="page">${head}${toolsCard()}${gamesCard()}${skillsCard()}${testsCard()}${armCard()}${throwCard()}</div>`;
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
    <div><div class="hist-title">${esc(w.title)}</div><div class="hist-sub">${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)} · ${setsDone(w)} sets</div></div>
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
      <div><div class="hist-title">${esc(w.title)}</div><div class="hist-sub">${fmtDate(parseYmd(w.date), { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)}${w.rpe ? ` · effort ${w.rpe}/10` : ''}${w.notes ? ' · notes' : ''}</div></div>
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
    id: uid(), mode: w.mode, dayIndex: dayIdx(), title: w.title, type: w.type, date: ymd(), startedAt: Date.now(), finishedAt: null,
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
      <button class="btn btn-sm btn-ghost" data-action="logTest">${icon('plus', 'sm')} Log</button></div>
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
const throwText = l => `${THROW_LABEL[l.type] || 'Throwing'} · ${fmt(l.count)} ${PITCHING.includes(l.type) ? 'pitches' : 'throws'}${l.dist ? ` · ${fmt(l.dist)} ft` : ''}${l.feel ? ` · arm ${FEEL[l.feel].toLowerCase()}` : ''}`;

// When can you pitch again? The latest "first day back" from any recent pitching outing.
function armStatus() {
  const age = S.settings.profile && S.settings.profile.age, rule = age ? pitchRule(age) : null;
  let until = null, from = null;
  if (rule) for (const l of logsOf('throw').filter(x => PITCHING.includes(x.type) && x.count > 0).slice(-12)) {
    const rd = restDays(rule, l.count);
    if (!rd) continue;
    const back = addDays(parseYmd(l.date), rd + 1);
    if (!until || back > until) { until = back; from = l; }
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
  if (PITCHING.includes(l.type) && rule && count > rule.max) toast(`That's over the Pitch Smart daily limit for your age (${rule.max}). Rest up!`);
  else if (PITCHING.includes(l.type) && rule) { const r = restDays(rule, count); toast(r ? `Saved — ${r} day${r === 1 ? '' : 's'} of rest before pitching again` : 'Saved — no rest day needed'); }
  else toast(l.feel === 1 ? 'Saved — please get that arm checked' : 'Throwing saved');
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
      <button class="btn btn-sm btn-ghost" data-action="logGame">${icon('plus', 'sm')} Log game</button></div>
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
  ['ground', 'Ground balls', 'fielding'], ['fly', 'Fly balls', 'fielding'], ['bunt', 'Bunting', 'swings'], ['bases', 'Base running', 'running'], ['catcher', 'Catching / blocking', 'fielding']];
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
actions.logSkill = () => openSheet('Log practice', `<form class="form" novalidate data-submit="saveSkill">
  <label class="field"><span>What did you work on?</span><select name="type">${SKILLS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
  <div class="form-grid">
    <label class="field"><span>Swings / reps</span><input name="reps" inputmode="numeric" autocomplete="off" placeholder="e.g. 75"></label>
    <label class="field"><span>Minutes</span><input name="min" inputmode="numeric" autocomplete="off" placeholder="optional"></label>
  </div>
  <div class="form-grid">
    <label class="field"><span>Date</span><input name="date" type="date" value="${ymd()}" max="${ymd()}"></label>
    <label class="field"><span>Focus / notes</span><input name="note" maxlength="120" autocomplete="off" placeholder="e.g. stay through the ball"></label>
  </div>
  <button class="btn btn-primary btn-block" type="submit">Save</button>
</form>`);
submits.saveSkill = f => {
  const d = formData(f), reps = Math.round(num(d.reps) || 0), min = Math.round(num(d.min) || 0);
  if (!reps && !min) { toast('Enter your swings/reps or minutes'); return; }
  if (reps > 2000 || min > 600) { toast('That looks too high — check the numbers'); return; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= ymd() ? d.date : ymd();
  putLog({ id: uid(), kind: 'skill', date, type: SKILL[d.type] ? d.type : 'tee', reps: reps || null, min: min || null, note: String(d.note || '').trim(), at: Date.now() });
  closeSheet(); render(); toast('Practice saved');
};

// ----- Live pitch counter (kept in settings so it survives closing the app mid-game) -----
function pitchState() {
  let p = S.settings.pitch;
  if (!isObj(p) || p.date !== ymd() || !Array.isArray(p.inn) || !Array.isArray(p.seq)) { p = S.settings.pitch = { date: ymd(), type: 'game', s: 0, b: 0, inn: [0], seq: [] }; saveSettings(); }
  return p;
}
function pitchBody() {
  const p = pitchState(), total = p.s + p.b, rule = pitchRule(S.settings.profile && S.settings.profile.age);
  const rest = rule ? restDays(rule, total) : 0, level = !rule ? '' : total >= rule.max ? 'over' : total >= rule.max - 10 ? 'near' : '';
  return `<div class="pc-total ${level}">${total}<small>pitches${rule ? ` · limit ${rule.max}` : ''}</small></div>
    ${rule ? `<div class="meter pc ${level}"><span style="width:${Math.min(100, (total / rule.max) * 100)}%"></span></div>
      <p class="small text-2 center">${total >= rule.max ? '<b>Daily limit reached — time to come out.</b> ' : ''}${total ? `If you stop now: <b>${rest} day${rest === 1 ? '' : 's'}</b> of rest` : 'Pitch Smart limit for your age shown above'}</p>`
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
  if (!(await confirmBox('Start over?', 'The pitch count for today goes back to zero.', { ok: 'Start over', danger: true }))) { actions.pitchCounter(); return; }
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
  const rule = pitchRule(S.settings.profile && S.settings.profile.age), r = rule ? restDays(rule, total) : null;
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

/* ============================== 10. SETTINGS + BACKUP ============================== */

let storagePersisted = null;

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
      <div class="set-item"><div class="grow"><div>Weight units</div><div class="hint">Changes labels only</div></div>
        <div class="seg" style="width:120px">${['lb', 'kg'].map(u => `<button class="${st.unit === u ? 'on' : ''}" data-action="setUnit" data-u="${u}" aria-pressed="${st.unit === u}">${u}</button>`).join('')}</div></div>
      ${toggle('autoRest', 'Auto-start rest timer', 'Starts when you check off a set')}
      ${toggle('sound', 'Timer beep', "Won't play when your phone is on silent")}
      ${toggle('keepAwake', 'Keep screen on during workouts', 'So the rest timer stays visible')}
    </div>

    <div class="section-title">Daily nutrition goals</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="calcGoals"><div class="grow"><div>Calculate my goals</div><div class="hint">From your size, age, training and goal</div></div>${icon('flame')}</button>
      <button class="set-item as-btn" data-action="editGoals"><div class="grow"><div>${fmt(st.calGoal)} cal · ${fmt(st.proteinGoal)} g protein</div>
        <div class="hint">${[st.carbGoal ? `${fmt(st.carbGoal)} g carbs` : '', st.fatGoal ? `${fmt(st.fatGoal)} g fat` : '', `${waterText(st.waterGoal)} water`].filter(Boolean).join(' · ')} · tap to edit</div></div>${icon('edit')}</button>
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
      <div class="hint center">${S.workouts.length} workouts · ${S.meals.length} food entries · ${S.foods.length} favorites saved</div>
    </div>

    <div class="section-title">Plan</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="programs"><div class="grow"><div>Program: ${esc(program().name)}</div><div class="hint">Switch between off-season and in-season plans</div></div>${icon('plan')}</button>
      <button class="set-item as-btn" data-action="resetPlan" data-mode="gym"><div class="grow"><div>Reset Gym plan</div><div class="hint">Back to the ${esc(program().name)} gym plan</div></div>${icon('refresh')}</button>
      <button class="set-item as-btn" data-action="resetPlan" data-mode="home"><div class="grow"><div>Reset Home plan</div><div class="hint">Back to the ${esc(program().name)} home plan</div></div>${icon('refresh')}</button>
    </div>

    <div class="section-title">App</div>
    <div class="set-list">
      <div class="set-item"><div class="grow"><div>Storage</div><div class="hint">${storageText()}</div></div></div>
      <button class="set-item as-btn" data-action="checkUpdate"><div class="grow"><div>Check for updates</div><div class="hint">Loads the newest app files from GitHub (needs internet)</div></div>${icon('refresh')}</button>
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
actions.setUnit = el => { S.settings.unit = el.dataset.u; saveSettings(); render(); };
// ----- Backup file -----
function backupData() {
  return {
    app: 'dugout', format: 1, version: APP_VERSION, exportedAt: new Date().toISOString(),
    kv: { settings: { ...S.settings, lastBackup: Date.now() }, plan: S.plan, ...(S.active ? { active: S.active } : {}) },
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

// ----- Spreadsheets (CSV) for you or your coach — these are NOT encrypted -----
const csvCell = v => {
  let t = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t) && isNaN(Number(t))) t = "'" + t;   // stop spreadsheet formulas
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const toCsv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n');
const CSV = {
  workouts: ['Workouts', () => {
    const rows = [['Date', 'Mode', 'Workout', 'Exercise', 'Set', `Weight (${S.settings.unit})`, 'Reps or seconds', 'Done', 'Effort (1-10)', 'Workout notes']];
    for (const w of [...S.workouts].reverse()) w.exercises.forEach((e, ei) => e.sets.forEach((st, i) =>
      rows.push([w.date, MODES[w.mode].label, w.title, e.name, i + 1, e.track === 'weight' ? st.w ?? '' : '', st.r ?? '', st.done ? 'yes' : 'no', w.rpe || '', ei === 0 && i === 0 ? w.notes || '' : ''])));
    return rows;
  }],
  food: ['Food log', () => [['Date', 'Time', 'Meal', 'Food', 'Servings', 'Serving size', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
    ...[...S.meals].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
      .map(m => [m.date, m.time || '', MEAL_LABEL[m.meal] || '', m.name, m.servings || 1, m.serving || '', m.cal, m.pro, m.carb ?? '', m.fat ?? ''])]],
  tracking: ['Weight, water, tests, games, practice, throwing and check-ins', () => {
    const rows = [['Date', 'Type', 'What', 'Value', 'Unit', 'Details']];
    for (const l of [...S.logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
      if (l.kind === 'weight') rows.push([l.date, 'Body weight', '', l.w, S.settings.unit, '']);
      else if (l.kind === 'water') rows.push([l.date, 'Water', '', l.oz, 'oz', '']);
      else if (l.kind === 'test') { const t = TEST_BY_ID[l.test]; if (t) rows.push([l.date, 'Test', t.name, l.v, t.unit, '']); }
      else if (l.kind === 'throw') rows.push([l.date, 'Throwing', THROW_LABEL[l.type] || l.type, l.count, PITCHING.includes(l.type) ? 'pitches' : 'throws', [l.dist ? `${l.dist} ft` : '', l.feel ? `arm ${FEEL[l.feel].toLowerCase()}` : '', l.note || ''].filter(Boolean).join('; ')]);
      else if (l.kind === 'game') rows.push([l.date, 'Game', [l.opp && `vs ${l.opp}`, l.result, l.score].filter(Boolean).join(' '), '', '',
        [`${l.bat.h}-for-${l.bat.ab}`, ...BAT.slice(2).filter(([k]) => l.bat[k]).map(([k, n]) => `${l.bat[k]} ${n}`), l.pitch ? `pitching ${ipText(l.pitch.outs)} IP ${PITCH.map(([k, n]) => `${l.pitch[k]} ${n}`).join(' ')}` : '', l.note].filter(Boolean).join('; ')]);
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
    kv.settings = { ...(kv.settings || {}), username };      // keep this phone's login name
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
  if (!(await confirmBox(`Reset ${label} plan?`, `All 7 ${label.toLowerCase()} days go back to the starting plan, replacing your ${label.toLowerCase()} edits and video links. Workout history is kept.`, { ok: 'Reset', danger: true }))) return;
  S.plan[mode] = buildPlan(program().plan)[mode];
  savePlan(); render(); toast(`${label} plan reset`);
};

actions.checkUpdate = async () => {
  if (!navigator.onLine) { toast('Connect to the internet first'); return; }
  toast('Updating…');
  try {
    if (S.active) await saveActive();
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.update();
    if (self.caches) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
  } catch (e) { /* ignore — reload anyway */ }
  setTimeout(() => location.reload(), 400);
};

// ----- How to use Dugout -----
const HELP = [
  ['Your day in Dugout', ['Open the Today tab: it shows today\'s workout, a quick check-in, your nutrition, water and what to eat next.',
    'Tap Start to begin a workout. Check off each set — the rest timer starts on its own, and your weights from last time are filled in.',
    'Tap ▶ on any exercise for a form video, step-by-step how-to, common mistakes and easier or harder versions.']],
  ['Logging food fast', ['Type a few letters to search 169 common foods, your favorites and anything you logged before. Change Servings and the numbers update.',
    'Use the Recent row, Favorites, the + on a meal, or "Copy yesterday\'s food" to log in one tap.',
    'Diet → Meals has a daily plan sized to your goals, 45 recipes, a game-day timeline and a shopping list.']],
  ['Setting your goals', ['Settings → Calculate my goals turns your age, size, training and goal into calories, protein, carbs, fat and water.',
    'Weigh in once or twice a week (Progress → Body) and recalculate every month or so. If you\'re trying to gain and your weight stalls for 2–3 weeks, add about 250 calories.']],
  ['Games and stats', ['Log each game in Progress → Baseball: your batting line and, if you pitched, innings (5.2 = 5⅔), hits, runs, walks and strikeouts.',
    'Your season AVG, OBP, SLG, OPS, ERA and WHIP update automatically, and pitches can go straight into the arm-care log.']],
  ['Testing the right way', ['Warm up fully first. Take 2–3 tries and log your best.', 'Test the same way each time — same surface, same timer, same time of day — so the numbers are fair.',
    'Re-test every 4–6 weeks. The stopwatch (Progress → Baseball) lets a partner time your sprints.']],
  ['Arm care and pitch counts', ['Log every throwing session with how your arm feels. Big week-to-week jumps in throwing are a common cause of arm trouble.',
    'During games use the pitch counter: it shows your Pitch Smart limit for your age and the rest days you\'ll need. Your league\'s rules come first.',
    'Soreness that fades in a day is normal. Pain, numbness or pain that lingers is not — stop throwing and tell a coach, athletic trainer or doctor.']],
  ['Programs and your plan', ['Plan → Programs switches between off-season (build) and in-season (maintain). Your history stays.',
    'Tap any exercise to change sets, reps, rest or the video. Use the exercise library to add new ones, or swap an exercise for today during a workout.']],
  ['Backups and privacy', ['Everything stays on this phone, encrypted with your password. There is no password reset — keep it in your iPhone Passwords app.',
    'Export a backup about once a week (Settings) and save it to Files or email it to yourself. Spreadsheet (CSV) exports are for coaches and are not encrypted.']]
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
  for (const k of ['profile', 'mealPlan']) if (!isObj(out[k])) out[k] = null;
  if (!Array.isArray(out.badges)) out.badges = null;
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
  return out;
}
const cleanWorkout = w => {
  if (!isObj(w) || !w.id || !w.startedAt || !Array.isArray(w.exercises)) return null;
  w.exercises = w.exercises.filter(e => isObj(e) && e.name && Array.isArray(e.sets));
  w.exercises.forEach(e => { e.sets = e.sets.filter(isObj); if (!TRACKS[e.track]) e.track = 'weight'; });
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

async function loadAll() {
  const [settings, plan, active, workouts, meals, foods, logs] = await Promise.all([
    DB.get('settings'), DB.get('plan'), DB.get('active'), DB.all('workouts'), DB.all('meals'), DB.all('foods'), DB.all('logs')
  ]);
  S.settings = cleanSettings(settings);
  const cleanP = cleanPlan(plan);
  if (cleanP) {
    S.plan = cleanP;
    const all = [...cleanP.gym, ...cleanP.home].flatMap(d => d.exercises);
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
  S.logs = (logs || []).filter(l => isObj(l) && l.id && typeof l.kind === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.date));
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

  // Offline support
  if ('serviceWorker' in navigator) {
    const updating = !!navigator.serviceWorker.controller;     // no controller yet = first install, not an update
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updating && !S.locked) toast('A new version of Dugout is ready', { action: () => location.reload(), label: 'Reload' });
    });
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Offline mode unavailable:', err));
  }
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
const WHATS_NEW = '2.0';
function whatsNew() {
  const item = (ic, title, text) => `<div class="new-item">${icon(ic)}<div><b>${title}</b><div class="small text-2">${text}</div></div></div>`;
  openSheet("What's new in Dugout 2.0", `
    ${item('diet', 'Easier food logging', 'Search 169 foods, pick servings, and track carbs and fat. Recent foods and "copy yesterday" save taps.')}
    ${item('flame', 'Goals made for you', 'Calculate calories, protein and water from your size and training. Track water and body weight.')}
    ${item('check', 'Meal plans and recipes', 'A daily plan sized to your goals, 45 recipes, a game-day timeline, the week ahead and a shopping list.')}
    ${item('dumbbell', 'Smarter workouts', 'How-tos for every exercise, a library, swaps, next-weight tips, warm-up sets, a plate calculator and effort notes.')}
    ${item('plan', 'In-season program', 'Switch programs on the Plan tab: two short lifts a week to stay strong during the season.')}
    ${item('timer', 'Baseball tests, stats and arm care', 'Progress → Baseball: a game log with AVG/OBP/SLG and ERA, 60-yard and exit velo tests, a throwing log, a live pitch counter with Pitch Smart rest days, and a stopwatch.')}
    ${item('trophy', 'Stay on track', 'Daily readiness check-in, a weekly review, a training calendar, badges and spreadsheet export.')}
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
  await DB.delRaw('lockout');
  await openApp();
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
  badgeSig = '';
  Object.assign(S, { locked: true, settings: { ...DEFAULT_SETTINGS }, plan: null, active: null, workouts: [], meals: [], foods: [], logs: [], openEx: null });
  render();
  if (message) toast(message);
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
  <div class="field"><span>What part of the year is it?</span>${choice('program', [['offseason', 'Off-season'], ['inseason', 'In-season']], S.settings.program)}
    <small>Off-season builds strength and speed. In-season keeps them with 2 short lifts so you're fresh for games.</small></div>
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
  await DB.eraseEverything();
  DB.lock();
  S.vault = null;
  render();
  toast('Erased — create a new login');
};

boot();
