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

const APP_VERSION = '1.0.0';

/* ============================== 1. HELPERS ============================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
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
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'
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
  installHintDismissed: false
};

// Everything the app is showing lives here (and is saved to the phone with DB.*).
const S = {
  tab: 'today',
  settings: { ...DEFAULT_SETTINGS },
  plan: null,          // { gym: [7 days], home: [7 days] }
  active: null,        // the workout in progress, if any
  workouts: [],        // finished workouts, newest first
  meals: [],
  foods: [],           // favorites
  planDay: dayIdx(),
  planReorder: false,
  dietDate: ymd(),
  dietView: 'day',
  dietWeek: ymd(weekStart()),
  progEx: null,
  progMetric: null,
  progRange: 'all',
  histLimit: 15,
  openEx: null         // which exercise card is open during a workout (null = automatic)
};

async function save(work) {
  try { await work(); }
  catch (err) { console.error(err); toast('Could not save: ' + (err.message || err)); }
}
const saveSettings = () => save(() => DB.set('settings', S.settings));
const savePlan = () => save(() => DB.set('plan', S.plan));
const saveActive = () => save(() => (S.active ? DB.set('active', S.active) : DB.del('active')));
let saveActiveTimer = null;
const saveActiveSoon = () => { clearTimeout(saveActiveTimer); saveActiveTimer = setTimeout(saveActive, 400); };

// Makes a fresh copy of the starting plan (from plan.js) with an id on every exercise.
function buildPlan(src) {
  const p = clone({ gym: src.gym, home: src.home });
  for (const mode of ['gym', 'home']) for (const day of p[mode]) for (const e of day.exercises) e.id = uid();
  return p;
}
const planFor = (mode = S.settings.mode) => S.plan[mode];
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
  document.body.dataset.mode = S.active ? S.active.mode : S.settings.mode;
  const view = $('#view');
  const top = view.scrollTop;
  const views = { today: renderToday, plan: renderPlan, diet: renderDiet, progress: renderProgress, settings: renderSettings };
  view.innerHTML = views[S.tab]();
  view.scrollTop = keepScroll ? top : 0;
  renderTabbar();
  const queue = postRender; postRender = [];
  queue.forEach(fn => fn());
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
let sheetOnClose = null;
function openSheet(title, body, { onClose } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `
    <div class="sheet-backdrop" data-action="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
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
}
function closeSheet() {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  root.classList.remove('show');
  const cb = sheetOnClose; sheetOnClose = null;
  setTimeout(() => { if (!root.classList.contains('show')) { root.classList.remove('open'); root.innerHTML = ''; } }, 300);
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
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action]:not(button):not(a):not(input):not(select):not(textarea)')) {
    e.preventDefault();
    e.target.click();
  }
});
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
};
const stepper = (name, value, d, { min = 0, max = 9999, minus = icon('minus', 'sm'), plus = icon('plus', 'sm'), mode = 'numeric' } = {}) => `
  <div class="stepper">
    <button type="button" class="btn" data-action="step" data-target="${name}" data-d="${-d}" data-min="${min}" data-max="${max}" aria-label="Less">${minus}</button>
    <input name="${name}" inputmode="${mode}" value="${esc(value)}" autocomplete="off">
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
    ${todayCard(dayPlan(di), di, doneToday)}
    ${nutritionCard()}
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
  return `<section class="card hero">
    <div class="spread">
      <span class="badge accent">${icon(m.icon)} ${m.label} · ${TYPES[day.type] || 'Workout'}</span>
      ${doneToday ? `<span class="badge good">${icon('check')} Done</span>` : ''}
    </div>
    <div>
      <h2 class="day-title">${esc(day.title)}</h2>
      ${day.focus ? `<p class="text-2 small" style="margin-top:8px">${esc(day.focus)}</p>` : ''}
    </div>
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
  return `<section class="card">
    <div class="spread" style="margin-bottom:14px">
      <div class="card-title">Nutrition today</div>
      <button class="btn btn-sm btn-ghost" data-action="quickLog">${icon('plus', 'sm')} Log food</button>
    </div>
    ${macroBlock(dayTotals(ymd()))}
  </section>`;
}

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
  return row('cal', 'Calories', t.cal, calGoal, '') + row('pro', 'Protein', t.pro, proteinGoal, ' g');
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
    <button class="btn btn-sm btn-primary" data-action="exportBackup">Back up</button>
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
      <div class="wo-tools">
        <button class="btn btn-sm btn-ghost" data-action="video" data-src="wo" data-i="${i}">${icon('play', 'sm')} Form video</button>
        ${secs && secs <= 600 ? `<button class="btn btn-sm btn-ghost" data-action="workTimer" data-i="${i}" data-sec="${secs}">${icon('timer', 'sm')} ${restLabel(secs)} timer</button>` : ''}
      </div>
      ${last && e.track !== 'check' ? `<div class="wo-last">Last time (${shortDate(last.date)}): <b>${last.sets.map(s => setText(s, e.track)).join(' · ')}</b></div>` : ''}
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
    <p class="text-2 small">Saved to your history on the Progress tab.</p>
    <div class="sheet-actions">
      <button class="btn btn-ghost" data-action="quickLog">Log a meal</button>
      <button class="btn btn-primary" data-action="closeSheet">Done</button>
    </div>`);
}

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
    top = `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${info.id}?playsinline=1&rel=0&modestbranding=1${info.start ? `&start=${info.start}` : ''}"
      title="${esc(ex.name)} form video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
  } else if (link && !isSearchLink(link)) {
    top = `<div class="placeholder-box"><div class="bold">This link can't play inside the app</div>
      <div class="hint">Only YouTube links play here. You can still open it:</div>
      <a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">${icon('video', 'sm')} Open link</a></div>`;
  } else {
    top = `<div class="placeholder-box">
      <div class="bold">No video picked yet — this is a placeholder</div>
      <ol class="steps">
        <li>Tap <b>Find a video</b> to search YouTube.</li>
        <li>Open a good one, then tap <b>Share → Copy link</b>.</li>
        <li>Come back here, tap <b>Paste</b>, then <b>Save link</b>.</li>
      </ol>
      <a class="btn btn-primary" href="${esc(link || placeholderVideo(ex.name))}" target="_blank" rel="noopener">${icon('video', 'sm')} Find a video</a>
    </div>`;
  }
  openSheet(ex.name, `${top}
    ${ex.cues ? `<p class="wo-cues">${esc(ex.cues)}</p>` : ''}
    <form class="form" novalidate data-submit="saveVideo">
      <label class="field"><span>${info ? 'Swap for a different video' : 'YouTube link'}</span>
        <input name="video" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://youtu.be/…" value="${info ? esc(ex.video) : ''}"></label>
      <div class="sheet-actions">
        <button type="button" class="btn btn-ghost" data-action="pasteLink">${icon('copy', 'sm')} Paste</button>
        <button type="submit" class="btn btn-primary">Save link</button>
      </div>
      ${info ? `<a class="btn-link center" href="${esc(link)}" target="_blank" rel="noopener">Open in YouTube</a>` : ''}
    </form>`);
}

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
  if (!url) url = placeholderVideo(target.name);
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

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (S.active) keepAwake(true);
  try { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume(); } catch (e) { /* ignore */ }
  timerTick();
  if (S.plan && S.tab === 'today' && !S.active && !$('#sheet-root').classList.contains('open')) render();
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
    <div class="page-head"><div><div class="eyebrow">Weekly plan</div><h1 class="page-title">Plan</h1></div></div>
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
    <button class="btn btn-ghost btn-block" data-action="addPlanEx">${icon('plus')} Add exercise</button>
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
    : `<div class="ex-side"><button class="btn btn-icon sm" data-action="video" data-src="plan" data-i="${i}" aria-label="Form video for ${esc(e.name)}">${icon('play', 'sm')}</button></div>`;
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
  if (!video || (renamed && isSearchLink(video) && video === old.video)) video = placeholderVideo(name);
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
  S.plan[mode][di] = buildPlan(DEFAULT_PLAN)[mode][di];
  savePlan(); render(); toast('Day reset');
};

/* ============================== 8. DIET TAB ============================== */

let editMealId = null;

function dayTotals(date) {
  let cal = 0, pro = 0;
  for (const m of S.meals) if (m.date === date) { cal += m.cal || 0; pro += m.pro || 0; }
  return { cal: Math.round(cal), pro: Math.round(pro * 10) / 10 };
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
    <div class="seg" role="group" aria-label="Day or week">
      <button class="${S.dietView === 'day' ? 'on' : ''}" data-action="dietView" data-v="day" aria-pressed="${S.dietView === 'day'}">Day</button>
      <button class="${S.dietView === 'week' ? 'on' : ''}" data-action="dietView" data-v="week" aria-pressed="${S.dietView === 'week'}">Week totals</button>
    </div>
    ${S.dietView === 'week' ? dietWeek() : dietDay()}
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
      <div class="meal-group-head"><span>${label}</span><span>${fmt(sum(list, m => m.cal))} cal · ${fmt(sum(list, m => m.pro), 1)} g</span></div>
      ${list.map(mealRow).join('')}
    </div>`;
  }).join('');
  const favs = sortedFavs();
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
    <button class="btn btn-primary btn-xl" data-action="logFood">${icon('plus')} Log food</button>
    <div class="section-row">
      <div class="section-title">Favorites</div>
      <button class="btn-link" data-action="manageFavs">${favs.length ? 'Manage' : '+ Add'}</button>
    </div>
    ${favs.length ? `<div class="fav-row">${favs.map(favCard).join('')}</div>`
      : `<p class="hint" style="margin:0 4px">Save foods you eat often as favorites, then log them with one tap.</p>`}
    <div class="section-title">${isToday ? "Today's food" : 'Food log'}</div>
    ${groups || `<div class="empty">Nothing logged ${isToday ? 'yet today' : 'on this day'}.</div>`}`;
}

const mealRow = m => `<button class="meal" data-action="editMeal" data-id="${m.id}">
  <div><div class="meal-name">${esc(m.name)}</div><div class="meal-sub">${m.time ? clockTime(m.time) : ''}${m.servings && m.servings !== 1 ? ` · ${fmt(m.servings, 2)} servings` : ''}</div></div>
  <div class="meal-nums">${fmt(m.cal)} cal<small>${fmt(m.pro, 1)} g protein</small></div>
</button>`;

const favCard = f => `<div class="fav">
  <div data-action="favOpen" data-id="${f.id}" role="button" tabindex="0">
    <div class="fav-name">${esc(f.name)}</div>
    <div class="fav-meta">${fmt(f.cal)} cal · ${fmt(f.pro, 1)} g</div>
  </div>
  <button class="btn btn-sm btn-primary" data-action="favLog" data-id="${f.id}" aria-label="Log ${esc(f.name)}">${icon('plus', 'sm')} Log</button>
</div>`;

actions.dietStep = el => {
  const d = ymd(addDays(parseYmd(S.dietDate), Number(el.dataset.d)));
  if (d > ymd()) return;
  S.dietDate = d;
  render();
};
actions.dietToday = () => { S.dietDate = ymd(); render(); };

// ----- Logging food -----
function foodSuggestions() {
  const seen = new Set(), out = [];
  const add = n => { const k = normName(n); if (k && !seen.has(k)) { seen.add(k); out.push(n); } };
  sortedFavs().forEach(f => add(f.name));
  [...S.meals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 300).forEach(m => add(m.name));
  return out.slice(0, 80);
}

function openFoodSheet(meal = null) {
  editMealId = meal ? meal.id : null;
  const m = meal || { name: '', cal: '', pro: '', meal: guessMeal(), time: nowHHMM() };
  const isFav = !!meal && S.foods.some(f => normName(f.name) === normName(meal.name));
  openSheet(meal ? 'Edit food' : 'Log food', `<form class="form" novalidate data-submit="saveMeal">
    <label class="field"><span>Food</span>
      <input name="name" list="food-suggest" value="${esc(m.name)}" placeholder="e.g. Chicken breast, 6 oz" maxlength="80" required autocomplete="off" data-input="foodName"></label>
    <datalist id="food-suggest">${foodSuggestions().map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>
    <div class="form-grid">
      <label class="field"><span>Calories</span><input name="cal" inputmode="decimal" value="${esc(m.cal)}" placeholder="0" autocomplete="off"></label>
      <label class="field"><span>Protein (g)</span><input name="pro" inputmode="decimal" value="${esc(m.pro)}" placeholder="0" autocomplete="off"></label>
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
actions.logFood = () => openFoodSheet();
actions.editMeal = el => { const m = S.meals.find(x => x.id === el.dataset.id); if (m) openFoodSheet(m); };

// Typing a food you've logged before fills in its calories and protein.
inputs.foodName = el => {
  const f = el.form, key = normName(el.value);
  if (!key || f.elements.cal.value) return;
  const hit = S.foods.find(x => normName(x.name) === key)
    || [...S.meals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(x => normName(x.name) === key);
  if (!hit) return;
  const per = hit.servings && hit.servings !== 1 ? 1 / hit.servings : 1;
  f.elements.cal.value = Math.round(hit.cal * per);
  f.elements.pro.value = Math.round(hit.pro * per * 10) / 10;
};

submits.saveMeal = f => {
  const d = formData(f);
  const typed = String(d.name || '').trim();
  const fav = S.foods.find(x => normName(x.name) === normName(typed));
  const name = fav ? fav.name : typed;
  const cal = num(d.cal), pro = num(d.pro);
  if (!name) { toast('Type what you ate'); return; }
  if (cal == null && pro == null) { toast('Enter the calories and/or protein'); return; }
  const entry = {
    name,
    cal: Math.max(0, Math.round(cal || 0)),
    pro: Math.max(0, Math.round((pro || 0) * 10) / 10),
    meal: d.meal || guessMeal(),
    time: d.time || nowHHMM()
  };
  const editing = !!editMealId;
  let m;
  if (editing) {
    m = S.meals.find(x => x.id === editMealId);
    if (!m) { closeSheet(); return; }
    Object.assign(m, entry);
  } else {
    m = { id: uid(), date: S.dietDate, servings: 1, createdAt: Date.now(), ...entry };
    S.meals.push(m);
    if (d.fav) addFavorite({ name, cal: entry.cal, pro: entry.pro });
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
  const per = m.servings && m.servings !== 1 ? 1 / m.servings : 1;
  addFavorite({ name: m.name, cal: Math.round(m.cal * per), pro: Math.round(m.pro * per * 10) / 10 });
  closeSheet(); render(); toast(`${m.name} added to favorites`);
};

// ----- Favorites -----
function addFavorite({ name, cal, pro }) {
  const existing = S.foods.find(f => normName(f.name) === normName(name));
  if (existing) { Object.assign(existing, { cal, pro }); save(() => DB.put('foods', existing)); return existing; }
  const f = { id: uid(), name, cal, pro, uses: 0, createdAt: Date.now() };
  S.foods.push(f);
  save(() => DB.put('foods', f));
  return f;
}

function logFavorite(f, servings) {
  const m = {
    id: uid(), date: S.dietDate, time: nowHHMM(), meal: guessMeal(), name: f.name, servings,
    cal: Math.round(f.cal * servings), pro: Math.round(f.pro * servings * 10) / 10, createdAt: Date.now()
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
    <p class="text-2">${fmt(f.cal)} cal · ${fmt(f.pro, 1)} g protein per serving</p>
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
    <div class="form-grid">
      <label class="field"><span>Calories</span><input name="cal" inputmode="decimal" value="${f ? esc(f.cal) : ''}" placeholder="0" autocomplete="off"></label>
      <label class="field"><span>Protein (g)</span><input name="pro" inputmode="decimal" value="${f ? esc(f.pro) : ''}" placeholder="0" autocomplete="off"></label>
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
  const data = { name, cal: Math.max(0, Math.round(num(d.cal) || 0)), pro: Math.max(0, Math.round((num(d.pro) || 0) * 10) / 10) };
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
      <div><div class="meal-name">${esc(f.name)}</div><div class="meal-sub">per serving · tap to edit</div></div>
      <div class="meal-nums">${fmt(f.cal)} cal<small>${fmt(f.pro, 1)} g protein</small></div></button>`).join('') || '<p class="hint">No favorites yet.</p>'}
    <button class="btn btn-primary btn-block" data-action="newFav">${icon('plus', 'sm')} New favorite</button>
  </div>`);
};

actions.editGoals = () => openSheet('Daily goals', `<form class="form" novalidate data-submit="saveGoals">
  <label class="field"><span>Calories per day</span><input name="cal" inputmode="numeric" value="${S.settings.calGoal}" autocomplete="off"></label>
  <label class="field"><span>Protein per day (grams)</span><input name="pro" inputmode="numeric" value="${S.settings.proteinGoal}" autocomplete="off"></label>
  <p class="hint">Use the numbers that fit you — a coach or dietitian can help you pick them.</p>
  <button class="btn btn-primary btn-block" type="submit">Save goals</button>
</form>`);
submits.saveGoals = f => {
  const d = formData(f);
  const cal = Math.round(num(d.cal) || 0), pro = Math.round(num(d.pro) || 0);
  if (cal < 500 || cal > 10000) { toast('Calories should be between 500 and 10,000'); return; }
  if (pro < 10 || pro > 500) { toast('Protein should be between 10 and 500 g'); return; }
  Object.assign(S.settings, { calGoal: cal, proteinGoal: pro, goalsSet: true });
  saveSettings(); closeSheet(); render(); toast('Goals saved');
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
function barChart(sel, data, { goal, cls, unit }) {
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
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${unit === 'g' ? 'Protein' : 'Calories'} for each day of the week">`;
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

function renderProgress() {
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
    <div class="page-head"><div><div class="eyebrow">Your gains</div><h1 class="page-title">Progress</h1></div></div>
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

function historyList(ws) {
  if (!ws.length) return `<div class="empty">No ${MODES[S.settings.mode].label.toLowerCase()} workouts yet.</div>`;
  const shown = ws.slice(0, S.histLimit);
  return `<div class="stack">${shown.map(w => {
    const vol = volumeOf(w);
    return `<button class="hist" data-action="showWorkout" data-id="${w.id}">
      <div><div class="hist-title">${esc(w.title)}</div><div class="hist-sub">${fmtDate(parseYmd(w.date), { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtDur((w.finishedAt || w.startedAt) - w.startedAt)}</div></div>
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
    <button class="btn btn-danger btn-block" data-action="deleteWorkout" data-id="${w.id}">${icon('trash', 'sm')} Delete this workout</button>`);
};
actions.deleteWorkout = async el => {
  const id = el.dataset.id;
  if (!(await confirmBox('Delete workout?', 'It will be removed from your history and charts.', { ok: 'Delete', danger: true }))) return;
  S.workouts = S.workouts.filter(w => w.id !== id);
  await save(() => DB.remove('workouts', id));
  render(); toast('Workout deleted');
};

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
      <div class="set-item"><div class="grow"><div>Calories</div></div>
        <input class="input" inputmode="numeric" value="${st.calGoal}" data-change="setGoal" data-k="calGoal" aria-label="Calorie goal"></div>
      <div class="set-item"><div class="grow"><div>Protein (grams)</div></div>
        <input class="input" inputmode="numeric" value="${st.proteinGoal}" data-change="setGoal" data-k="proteinGoal" aria-label="Protein goal"></div>
    </div>

    <div class="section-title">Backup — never lose your data</div>
    <div class="card stack">
      <div class="row" style="align-items:flex-start">${icon('shield')}<div class="grow">
        <div class="bold">${last}</div>
        <div class="hint">Everything is stored only on this phone. About once a week, tap Export and choose <b>Save to Files</b> (iCloud Drive) or email it to yourself. Import brings it all back — even on a new phone.</div>
      </div></div>
      <button class="btn btn-primary btn-block" data-action="exportBackup">${icon('download', 'sm')} Export backup</button>
      <label class="btn btn-ghost btn-block" for="import-file">${icon('upload', 'sm')} Import backup</label>
      <input class="vh" type="file" id="import-file" accept=".json,application/json,text/plain" data-change="importFile">
      <div class="hint center">${S.workouts.length} workouts · ${S.meals.length} food entries · ${S.foods.length} favorites saved</div>
    </div>

    <div class="section-title">Plan</div>
    <div class="set-list">
      <button class="set-item as-btn" data-action="resetPlan" data-mode="gym"><div class="grow"><div>Reset Gym plan</div><div class="hint">Back to the starting 7-day gym plan</div></div>${icon('refresh')}</button>
      <button class="set-item as-btn" data-action="resetPlan" data-mode="home"><div class="grow"><div>Reset Home plan</div><div class="hint">Back to the starting 7-day home plan</div></div>${icon('refresh')}</button>
    </div>

    <div class="section-title">App</div>
    <div class="set-list">
      <div class="set-item"><div class="grow"><div>Storage</div><div class="hint">${storageText()}</div></div></div>
      <button class="set-item as-btn" data-action="checkUpdate"><div class="grow"><div>Check for updates</div><div class="hint">Loads the newest app files from GitHub (needs internet)</div></div>${icon('refresh')}</button>
      <button class="set-item as-btn" data-action="installHelp"><div class="grow"><div>How to install on iPhone</div></div>${icon('info')}</button>
    </div>

    <div class="section-title">Danger zone</div>
    <button class="btn btn-danger btn-block" data-action="eraseAll">${icon('trash', 'sm')} Erase all data on this phone</button>
    <p class="hint center">No account · no ads · works offline</p>
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
changes.setGoal = el => {
  const k = el.dataset.k, v = Math.round(num(el.value) || 0);
  const [lo, hi] = k === 'calGoal' ? [500, 10000] : [10, 500];
  if (v < lo || v > hi) { toast(`Enter a number from ${fmt(lo)} to ${fmt(hi)}`); el.value = S.settings[k]; return; }
  S.settings[k] = v;
  S.settings.goalsSet = true;
  saveSettings();
  toast('Goal saved');
};

// ----- Backup file -----
function backupData() {
  return {
    app: 'dugout', format: 1, version: APP_VERSION, exportedAt: new Date().toISOString(),
    kv: { settings: { ...S.settings, lastBackup: Date.now() }, plan: S.plan, ...(S.active ? { active: S.active } : {}) },
    workouts: S.workouts, meals: S.meals, foods: S.foods
  };
}
function markBackedUp() {
  S.settings.lastBackup = Date.now();
  saveSettings();
  render();
  toast('Backup exported');
}
actions.exportBackup = async () => {
  const name = `dugout-backup-${ymd()}.json`;
  const json = JSON.stringify(backupData());
  let file = null;
  try { file = new File([json], name, { type: 'application/json' }); } catch (e) { /* very old browser */ }
  // iPhone: opens the Share sheet → "Save to Files", AirDrop, Mail…
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Dugout backup' });
      markBackedUp();
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;       // share sheet closed — nothing saved
    }
  }
  // Computers / other browsers: a normal download
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  markBackedUp();
};

changes.importFile = async el => {
  const file = el.files && el.files[0];
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  el.value = '';
  if (!data || data.app !== 'dugout' || typeof data.kv !== 'object') { toast("That file isn't a Dugout backup"); return; }
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'an unknown date';
  const counts = `${(data.workouts || []).length} workouts and ${(data.meals || []).length} food entries`;
  if (!(await confirmBox('Restore this backup?', `Backup from ${when} with ${counts}. It REPLACES everything currently in the app on this phone.`, { ok: 'Restore', danger: true }))) return;
  try {
    stopTimer();
    await DB.importAll(data);
    await loadAll();
    render({ keepScroll: false });
    toast('Backup restored');
  } catch (e) {
    toast('Restore failed: ' + (e.message || e));
  }
};

actions.resetPlan = async el => {
  const mode = el.dataset.mode, label = MODES[mode].label;
  if (!(await confirmBox(`Reset ${label} plan?`, `All 7 ${label.toLowerCase()} days go back to the starting plan, replacing your ${label.toLowerCase()} edits and video links. Workout history is kept.`, { ok: 'Reset', danger: true }))) return;
  S.plan[mode] = buildPlan(DEFAULT_PLAN)[mode];
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
  if (!(await confirmBox('Erase everything?', 'Deletes all workouts, food logs, favorites, settings and plan changes from this phone. This cannot be undone — export a backup first if you might want it.', { ok: 'Erase', danger: true }))) return;
  if (!(await confirmBox('Are you sure?', 'Last chance. Everything will be erased.', { ok: 'Yes, erase all', danger: true }))) return;
  try {
    stopTimer();
    keepAwake(false);
    await DB.eraseAll();
    await loadAll();
    S.tab = 'today';
    render({ keepScroll: false });
    toast('All data erased');
  } catch (e) {
    toast('Erase failed: ' + (e.message || e));
  }
};

/* ============================== 11. START-UP ============================== */

async function loadAll() {
  const [settings, plan, active, workouts, meals, foods] = await Promise.all([
    DB.get('settings'), DB.get('plan'), DB.get('active'), DB.all('workouts'), DB.all('meals'), DB.all('foods')
  ]);
  S.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (plan && Array.isArray(plan.gym) && Array.isArray(plan.home) && plan.gym.length === 7 && plan.home.length === 7) {
    S.plan = plan;
  } else {
    S.plan = buildPlan(DEFAULT_PLAN);
    await DB.set('plan', S.plan);
  }
  S.active = active || null;
  S.workouts = (workouts || []).filter(w => w && w.startedAt).sort((a, b) => b.startedAt - a.startedAt);
  S.meals = meals || [];
  S.foods = foods || [];
  S.openEx = null;
  S.progEx = null;
  S.progMetric = null;
}

async function boot() {
  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    $('#view').innerHTML = `<div class="page"><div class="card stack">
      <div class="card-title">Couldn't open your saved data</div>
      <p class="text-2 small">${esc(err.message || err)}</p>
      <p class="hint">Private Browsing blocks saving. Open Dugout in a normal Safari tab or from its home-screen icon.</p>
    </div></div>`;
    return;
  }
  render({ keepScroll: false });
  if (S.active) keepAwake(true);

  // Every second: tick the workout clock. Every 30 s: refresh Today's countdown (and the date after midnight).
  let ticks = 0, shownDay = ymd();
  setInterval(() => {
    ticks++;
    if (S.active) {
      const c = $('#wo-clock');
      if (c) c.textContent = clock((Date.now() - S.active.startedAt) / 1000);
    } else if (ticks % 30 === 0 && S.tab === 'today') {
      if (shownDay !== ymd()) { shownDay = ymd(); render(); return; }
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
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Offline mode unavailable:', err));
  }
}

boot();
