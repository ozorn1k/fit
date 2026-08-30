/* ============================================================
   store.js — состояние, хранилище, мост в Telegram, утилиты
   ============================================================ */

const KEY = 'ulia_fit_v1';

const DEFAULTS = () => ({
  v: 1,
  profile: {
    name: '',
    trainer: '',
    targetKcal: 1800,
    targetP: 110,
    targetF: 55,
    targetC: 180,
    theme: 'dark'
  },
  programs: [],
  activeProgram: null,
  active: null,
  sessions: [],
  food: {},
  customFoods: [],
  recent: [],
  notes: [],
  weights: [],
  lastBackup: null
});

let S = DEFAULTS();

/* ---------- загрузка / сохранение ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      S = Object.assign(DEFAULTS(), p);
      S.profile = Object.assign(DEFAULTS().profile, p.profile || {});
    }
  } catch (e) {
    console.warn('load failed', e);
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      cloudBackup();
    } catch (e) {
      toast('Не удалось сохранить — мало места на телефоне');
    }
  }, 120);
}

/* Резервная копия в облако Telegram (если открыто внутри Telegram).
   Данные всё равно живут локально — облако только страховка. */
function cloudBackup() {
  if (!TG.on) return;
  const cs = TG.wa && TG.wa.CloudStorage;
  if (!cs || !cs.setItem) return;
  const now = Date.now();
  if (S.lastBackup && now - S.lastBackup < 5 * 60 * 1000) return;
  S.lastBackup = now;
  try {
    const data = JSON.stringify(S);
    if (data.length < 4000) cs.setItem('backup', data, () => {});
    else cs.setItem('backup_meta', JSON.stringify({ ts: now, size: data.length }), () => {});
  } catch (e) { /* не критично */ }
}

/* ---------- утилиты ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

function h(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DOW    = ['вс','пн','вт','ср','чт','пт','сб'];
const DOW_L  = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

function iso(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fromIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function today() { return iso(new Date()); }
function shiftIso(s, n) { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); }
function humanDate(s) {
  const d = fromIso(s), t = today();
  if (s === t) return 'сегодня';
  if (s === shiftIso(t, -1)) return 'вчера';
  if (s === shiftIso(t, 1)) return 'завтра';
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
}
function humanDateFull(s) {
  const d = fromIso(s);
  return DOW_L[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}
function num(v, def) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : (def === undefined ? 0 : def); }
function r0(n) { return Math.round(n); }
function r1(n) { return Math.round(n * 10) / 10; }
function plural(n, a, b, c) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return c;
  if (n1 > 1 && n1 < 5) return b;
  if (n1 === 1) return a;
  return c;
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- шторки ---------- */
function sheet(html, opts) {
  $('#sheet-c').innerHTML = html;
  $('#sheet').classList.add('on');
  tgBack(true);
  if (opts && opts.onOpen) opts.onOpen();
}
function closeSheet() {
  $('#sheet').classList.remove('on');
  $('#sheet-c').innerHTML = '';
  if (!$('#sheet2').classList.contains('on')) tgBack(false);
}
function sheet2(html, opts) {
  $('#sheet2-c').innerHTML = html;
  $('#sheet2').classList.add('on');
  tgBack(true);
  if (opts && opts.onOpen) opts.onOpen();
}
function closeSheet2() {
  $('#sheet2').classList.remove('on');
  $('#sheet2-c').innerHTML = '';
  if (!$('#sheet').classList.contains('on')) tgBack(false);
}
function closeAllSheets() { closeSheet2(); closeSheet(); }

function confirmSheet(title, text, okLabel, onOk) {
  sheet2(
    '<h2>' + h(title) + '</h2>' +
    '<p class="muted small" style="margin:-6px 0 16px">' + h(text) + '</p>' +
    '<button class="btn dan" id="cf-ok">' + h(okLabel) + '</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => { $('#cf-ok').onclick = () => { closeSheet2(); onOk(); }; } }
  );
}

/* ---------- вибро ---------- */
function buzz(type) {
  const hf = TG.on && TG.wa.HapticFeedback;
  if (hf) { try { hf.impactOccurred(type || 'light'); return; } catch (e) {} }
  if (navigator.vibrate) navigator.vibrate(type === 'heavy' ? 25 : 10);
}

/* ---------- Telegram ---------- */
const TG = { on: false, wa: null };

function initTelegram() {
  const wa = window.Telegram && window.Telegram.WebApp;
  // вне Telegram скрипт тоже грузится, но platform там 'unknown'
  if (!wa || !wa.platform || wa.platform === 'unknown') return;
  TG.on = true; TG.wa = wa;
  try {
    wa.ready();
    wa.expand();
    if (wa.enableClosingConfirmation) wa.enableClosingConfirmation();
    if (wa.setHeaderColor) wa.setHeaderColor('#0f1115');
    if (wa.setBackgroundColor) wa.setBackgroundColor('#0f1115');
    wa.BackButton.onClick(() => {
      if ($('#sheet2').classList.contains('on')) return closeSheet2();
      if ($('#sheet').classList.contains('on')) return closeSheet();
      if (window.onBackNav) window.onBackNav();
    });
    const u = wa.initDataUnsafe && wa.initDataUnsafe.user;
    if (u && !S.profile.name) { S.profile.name = u.first_name || ''; save(); }
  } catch (e) { console.warn('tg init', e); }
}

function tgBack(show) {
  if (!TG.on) return;
  try { show ? TG.wa.BackButton.show() : TG.wa.BackButton.hide(); } catch (e) {}
}

/* Отправка текста в чат: внутри Telegram — прямо в диалог, иначе в буфер обмена */
function shareText(text) {
  if (TG.on && TG.wa.switchInlineQuery) {
    // switchInlineQuery ограничен по длине, поэтому надёжнее — буфер + подсказка
  }
  if (navigator.share) {
    navigator.share({ text }).catch(() => copyText(text));
  } else {
    copyText(text);
  }
}
function copyText(text) {
  const done = () => toast('Скопировано — вставь в чат тренеру');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Не удалось скопировать'); }
  document.body.removeChild(ta);
}

load();
