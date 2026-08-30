/* ============================================================
   main.js — навигация и запуск
   ============================================================ */

/* Версия сборки. Меняется вместе с version.txt при каждом деплое —
   по их расхождению приложение понимает, что открылось старым, и перезагружается.
   Нужно потому, что самая первая загрузка идёт мимо service worker,
   прямо из HTTP-кэша браузера, а на GitHub Pages заголовками не поуправляешь. */
const BUILD = '2026-08-30-4';

let TAB = 'train';

function showTab(t) {
  TAB = t;
  $$('.screen').forEach(s => s.classList.remove('on'));
  $('#sc-' + t).classList.add('on');
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  window.scrollTo(0, 0);
  if (t === 'train') renderTrain();
  if (t === 'food')  renderFood();
  if (t === 'notes') renderNotes();
  if (t === 'more')  renderMore();
  tgBack(t !== 'train');
}

function renderAll() {
  renderTrain(); renderFood(); renderNotes(); renderMore();
}

window.onBackNav = () => { if (TAB !== 'train') showTab('train'); };

function boot() {
  applyTheme();

  $$('#tabs button').forEach(b => b.onclick = () => { buzz(); showTab(b.dataset.tab); });
  $('#btn-import').onclick = openImport;
  $('#nt-add').onclick = () => editNote();
  $('#fd-datebtn').onclick = openDatePick;
  $$('[data-close]').forEach(e => e.onclick = closeSheet);
  $$('[data-close2]').forEach(e => e.onclick = closeSheet2);

  // Esc / кнопка «назад» в браузере
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#sheet2').classList.contains('on')) return closeSheet2();
    if ($('#sheet').classList.contains('on')) return closeSheet();
  });

  showTab('train');

  // офлайн-режим
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(checkUpdate).catch(() => {});
  }

  // ежедневный сброс даты в питании при возврате в приложение
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && FD_DATE !== today() && REPDATE_AUTO) { FD_DATE = today(); if (TAB === 'food') renderFood(); }
  });
}

let REPDATE_AUTO = true;

/* Если на сервере лежит сборка новее — перезагружаемся один раз.
   После регистрации worker-а навигация уже идёт через него, поэтому
   перезагрузка приносит свежую разметку, а не ту же самую из кэша. */
async function checkUpdate() {
  try {
    const r = await fetch('version.txt?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.text()).trim();
    if (!v || v === BUILD) return;
    if (sessionStorage.getItem('fit-upd') === v) return;  // уже пробовали — не зацикливаемся
    sessionStorage.setItem('fit-upd', v);
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) { try { await reg.update(); } catch (e) {} }
    location.reload();
  } catch (e) { /* нет сети — работаем тем, что есть */ }
}

/* Telegram SDK подгружаем отдельно — приложение работает и без него */
function loadTelegram() {
  if (window.Telegram && window.Telegram.WebApp) { initTelegram(); renderMore(); return; }
  if (!location.protocol.startsWith('http')) return;
  const s = document.createElement('script');
  s.src = 'https://telegram.org/js/telegram-web-app.js';
  s.async = true;
  s.onload = () => { initTelegram(); if (TAB === 'more') renderMore(); };
  s.onerror = () => {};
  document.head.appendChild(s);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); loadTelegram(); });
else { boot(); loadTelegram(); }
