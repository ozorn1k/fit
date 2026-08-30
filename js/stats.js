/* ============================================================
   stats.js — рекорды, прогресс по упражнениям, стрик и календарь
   ============================================================ */

/* Оценка одноповторного максимума (формула Эпли).
   Нужна, чтобы честно сравнивать 40кг×12 и 45кг×8 между собой. */
function e1rm(w, r) {
  w = num(w); r = num(r);
  if (!w || !r) return 0;
  return w * (1 + r / 30);
}

/* Все упражнения, которые вообще встречались: и в истории, и в программах */
function allExerciseNames() {
  const set = new Map();
  S.sessions.forEach(s => (s.exercises || []).forEach(e => {
    if (e.sets.some(x => x.done)) set.set(e.name.toLowerCase(), e.name);
  }));
  S.programs.forEach(p => p.days.forEach(d => d.exercises.forEach(e => {
    if (!set.has(e.name.toLowerCase())) set.set(e.name.toLowerCase(), e.name);
  })));
  return Array.from(set.values());
}

/* История по одному упражнению: по одной точке на тренировку */
function exerciseHistory(name) {
  const key = name.toLowerCase();
  const out = [];
  S.sessions.forEach(s => {
    const e = (s.exercises || []).find(x => x.name.toLowerCase() === key);
    if (!e) return;
    const done = e.sets.filter(x => x.done);
    if (!done.length) return;
    // упражнения без веса (планка, отжимания) ранжируем по повторам/секундам
    const pr = String(e.plan && e.plan.reps || '');
    const unit = /мин/i.test(pr) ? 'мин' : /сек/i.test(pr) ? 'сек' : 'повт.';
    let best = null, vol = 0, reps = 0;
    done.forEach(x => {
      vol += num(x.w) * num(x.r);
      reps += num(x.r);
      const v = num(x.w) ? e1rm(x.w, x.r) : num(x.r);
      if (v && (!best || v > best.v)) best = { v, w: num(x.w), r: num(x.r), unit };
    });
    if (!best) return;
    out.push({ date: s.date, best, vol, reps, sets: done.length, feel: s.feel || '', unit });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* Личный рекорд: лучший подход за всю историю */
function personalRecord(name) {
  const h = exerciseHistory(name);
  let pr = null;
  h.forEach(x => { if (x.best && x.best.v && (!pr || x.best.v > pr.v)) pr = { ...x.best, date: x.date }; });
  if (pr && !pr.unit) pr.unit = 'повт.';
  return pr;
}

/* Рекорд ли это прямо сейчас — вызывается в момент отметки подхода */
function checkPR(name, w, r) {
  const v = num(w) ? e1rm(w, r) : num(r);
  if (!v) return false;
  const pr = personalRecord(name);
  if (!pr) return false;              // первый раз рекордом не считаем
  return v > pr.v * 1.001;
}

/* ---------- экран «Рекорды» ---------- */
function openRecords() {
  const names = allExerciseNames();
  const rows = names.map(n => ({ n, pr: personalRecord(n), h: exerciseHistory(n) }))
                    .filter(x => x.h.length)
                    .sort((a, b) => b.h.length - a.h.length);

  let html = '<h2>Рекорды и прогресс</h2>';
  if (!rows.length) {
    html += '<div class="empty"><p>Пока не по чему считать</p><div class="small">Проведи пару тренировок — здесь появится динамика по каждому упражнению</div></div>';
  } else {
    html += '<div class="small muted" style="margin:-8px 0 14px">Тапни по упражнению — покажу график</div>';
    rows.forEach(x => {
      const first = x.h[0].best, last = x.h[x.h.length - 1].best;
      const growth = first && last && first.v ? (last.v - first.v) / first.v * 100 : 0;
      html += '<div class="card tap" onclick="openExerciseStats(' + jsArg(x.n) + ')">' +
        '<div class="row between"><div class="grow">' +
          '<div style="font-weight:650" class="wrap">' + h(x.n) + '</div>' +
          '<div class="small muted" style="margin-top:3px">' +
            (x.pr ? 'рекорд: ' + (x.pr.w ? r1(x.pr.w) + ' кг × ' + x.pr.r : x.pr.r + ' ' + x.pr.unit) : 'рекорд: —') +
            ' · ' + x.h.length + ' ' + plural(x.h.length, 'тренировка', 'тренировки', 'тренировок') +
          '</div>' +
        '</div>' +
        (x.h.length > 1 && growth ? '<div class="pill ' + (growth >= 0 ? 'g' : 'r') + '">' + (growth > 0 ? '+' : '') + r0(growth) + '%</div>' : '') +
        '</div></div>';
    });
  }
  html += '<button class="btn sec" style="margin-top:10px" onclick="closeSheet()">Закрыть</button>';
  sheet(html);
}

/* строковый аргумент для onclick без риска сломаться на кавычках */
function jsArg(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;') + "'";
}

function openExerciseStats(name) {
  const hh = exerciseHistory(name);
  const pr = personalRecord(name);
  let html = '<h2 class="wrap">' + h(name) + '</h2>';

  if (pr) {
    html += '<div class="card"><div class="row between">' +
      '<div><div class="tiny">Личный рекорд</div>' +
      '<div style="font-size:26px;font-weight:700;margin-top:2px">' +
        (pr.w ? r1(pr.w) + ' <span class="small muted" style="font-weight:500">кг ×</span> ' + pr.r
              : pr.r + ' <span class="small muted" style="font-weight:500">' + pr.unit + '</span>') +
      '</div>' +
      '<div class="small muted">' + humanDate(pr.date) + '</div></div>' +
      (pr.w ? '<div style="text-align:right"><div class="tiny">Расчётный 1ПМ</div>' +
        '<div style="font-size:20px;font-weight:700">' + r1(pr.v) + ' кг</div></div>' : '') +
      '</div></div>';
  }

  if (hh.length > 1) {
    html += '<div class="card"><div class="tiny" style="margin-bottom:4px">Динамика</div>' +
      lineChart(hh.map(x => x.best.v), hh.map(x => x.date), hh[0].best.w ? 'кг' : hh[0].best.unit) + '</div>';
  }

  html += '<div class="tiny" style="margin:18px 0 8px 2px">По тренировкам</div>';
  hh.slice().reverse().forEach(x => {
    html += '<div class="card" style="padding:13px">' +
      '<div class="row between"><div class="small" style="font-weight:600">' + humanDateFull(x.date) + '</div>' +
      (x.feel ? '<div class="pill">' + h(x.feel) + '</div>' : '') + '</div>' +
      '<div class="small muted" style="margin-top:6px">' +
        'лучший подход ' + (x.best.w ? r1(x.best.w) + ' кг × ' + x.best.r : x.best.r + ' ' + x.best.unit) +
        (x.vol ? ' · объём ' + r0(x.vol) + ' кг' : '') + ' · ' + x.sets + ' ' + plural(x.sets, 'подход', 'подхода', 'подходов') +
      '</div></div>';
  });

  const note = S.exNotes[name.toLowerCase()] || '';
  html += '<div class="field" style="margin-top:16px"><label class="lbl">Личная заметка (видна на тренировке)</label>' +
    '<textarea class="inp" id="exn" style="min-height:70px" placeholder="Гантели брать 10, не 12 — на 12 спина круглится">' + h(note) + '</textarea></div>' +
    '<button class="btn" onclick="saveExNote(' + jsArg(name) + ')">Сохранить заметку</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Закрыть</button>';

  sheet2(html);
}

function saveExNote(name) {
  const v = $('#exn').value.trim();
  if (v) S.exNotes[name.toLowerCase()] = v;
  else delete S.exNotes[name.toLowerCase()];
  save(); closeSheet2(); toast('Заметка сохранена');
}

/* ---------- график ---------- */
function lineChart(vals, labels, unit) {
  if (vals.length < 2) return '';
  const w = 600, hgt = 150, padL = 8, padR = 8, padT = 14, padB = 22;
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = (max - min) || 1;
  const x = i => padL + i * (w - padL - padR) / (vals.length - 1);
  const y = v => hgt - padB - (v - min) / rng * (hgt - padT - padB);
  const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
  const area = 'M' + pts[0] + ' L' + pts.join(' L') + ' L' + x(vals.length - 1).toFixed(1) + ',' + (hgt - padB) + ' L' + padL + ',' + (hgt - padB) + ' Z';

  let dots = '';
  vals.forEach((v, i) => { dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="4" fill="var(--acc)"/>'; });

  const f = fromIso(labels[0]), l = fromIso(labels[labels.length - 1]);
  return '<svg viewBox="0 0 ' + w + ' ' + hgt + '" style="width:100%;height:150px;display:block;overflow:visible">' +
    '<path d="' + area + '" fill="color-mix(in srgb,var(--acc) 14%,transparent)"/>' +
    '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    dots +
    '<text x="' + padL + '" y="' + (hgt - 4) + '" fill="var(--tx3)" font-size="15">' + f.getDate() + '.' + (f.getMonth() + 1) + '</text>' +
    '<text x="' + (w - padR) + '" y="' + (hgt - 4) + '" fill="var(--tx3)" font-size="15" text-anchor="end">' + l.getDate() + '.' + (l.getMonth() + 1) + '</text>' +
    '<text x="' + padL + '" y="12" fill="var(--tx3)" font-size="15">' + r1(max) + ' кг</text>' +
    '</svg>';
}

/* ---------- стрик ---------- */
/* День засчитан, если была тренировка ИЛИ заполнен дневник питания */
function activeDay(d) {
  return S.sessions.some(s => s.date === d) || (S.food[d] || []).length > 0;
}

function streakInfo() {
  let cur = 0;
  const t = today();
  // сегодня может быть ещё не заполнено — это не должно рвать серию
  let start = activeDay(t) ? 0 : 1;
  for (let i = start; i < 400; i++) {
    if (activeDay(shiftIso(t, -i))) cur++;
    else break;
  }
  let best = 0, run = 0;
  const dates = new Set([...S.sessions.map(s => s.date), ...Object.keys(S.food).filter(d => S.food[d].length)]);
  const sorted = Array.from(dates).sort();
  sorted.forEach((d, i) => {
    if (i && shiftIso(sorted[i - 1], 1) === d) run++; else run = 1;
    if (run > best) best = run;
  });
  return { cur, best: Math.max(best, cur) };
}

/* ---------- календарь месяца ---------- */
let CAL_OFF = 0;

function openCalendar() {
  CAL_OFF = 0;
  sheet('<div id="cal-wrap"></div>', { onOpen: drawCalendar });
}
function calShift(n) { CAL_OFF += n; drawCalendar(); }

function drawCalendar() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + CAL_OFF, 1);
  const year = d.getFullYear(), month = d.getMonth();
  const MN = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const daysIn = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // пн = 0

  const st = streakInfo();
  let trainings = 0, foodDays = 0;

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<div></div>';
  for (let day = 1; day <= daysIn; day++) {
    const iso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const tr = S.sessions.some(s => s.date === iso);
    const fd = (S.food[iso] || []).length > 0;
    if (tr) trainings++;
    if (fd) foodDays++;
    const isToday = iso === today();
    cells += '<div class="cal-d' + (isToday ? ' now' : '') + '" onclick="calOpen(' + jsArg(iso) + ')">' +
      '<span>' + day + '</span>' +
      '<i class="dots">' + (tr ? '<b class="t"></b>' : '') + (fd ? '<b class="f"></b>' : '') + '</i>' +
      '</div>';
  }

  $('#cal-wrap').innerHTML =
    '<h2>Календарь</h2>' +
    '<div class="card"><div class="row between">' +
      '<div><div class="tiny">Серия дней подряд</div>' +
      '<div style="font-size:30px;font-weight:700;line-height:1.2">' + st.cur + ' 🔥</div></div>' +
      '<div style="text-align:right"><div class="tiny">Лучшая</div>' +
      '<div style="font-size:20px;font-weight:700">' + st.best + '</div></div>' +
    '</div></div>' +
    '<div class="row between" style="margin:16px 0 10px">' +
      '<button class="btn sm sec" onclick="calShift(-1)">‹</button>' +
      '<div style="font-weight:700">' + MN[month] + ' ' + year + '</div>' +
      '<button class="btn sm sec" onclick="calShift(1)"' + (CAL_OFF >= 0 ? ' disabled style="opacity:.35"' : '') + '>›</button>' +
    '</div>' +
    '<div class="cal-h">' + ['пн','вт','ср','чт','пт','сб','вс'].map(x => '<span>' + x + '</span>').join('') + '</div>' +
    '<div class="cal">' + cells + '</div>' +
    '<div class="row" style="gap:16px;margin-top:14px;justify-content:center">' +
      '<div class="small muted"><b class="lg t"></b> тренировка — ' + trainings + '</div>' +
      '<div class="small muted"><b class="lg f"></b> питание — ' + foodDays + '</div>' +
    '</div>' +
    '<button class="btn sec" style="margin-top:16px" onclick="closeSheet()">Закрыть</button>';
}

function calOpen(iso) {
  const ses = S.sessions.filter(s => s.date === iso);
  const food = S.food[iso] || [];
  if (!ses.length && !food.length) return toast(humanDate(iso) + ' — пусто');
  let html = '<h2>' + humanDateFull(iso) + '</h2>';
  ses.forEach(s => {
    html += '<div class="card tap" onclick="openSessionCard(' + jsArg(s.id) + ')">' +
      '<div style="font-weight:650">' + h(s.dayTitle) + '</div>' +
      '<div class="small muted" style="margin-top:3px">' + s.exercises.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0) + ' подходов · ' + r0(tonnage(s)) + ' кг</div></div>';
  });
  if (food.length) {
    const k = food.reduce((n, i) => n + i.kcal, 0);
    html += '<div class="card"><div class="row between"><div style="font-weight:650">Питание</div><b>' + r0(k) + ' ккал</b></div>' +
      '<div class="small muted" style="margin-top:6px" class="wrap">' + h(food.map(i => i.name).join(', ')) + '</div></div>';
  }
  html += '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Закрыть</button>';
  sheet2(html);
}
