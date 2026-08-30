/* ============================================================
   workouts.js — программы, тренировка, история
   ============================================================ */

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  dumb:  '<svg viewBox="0 0 24 24"><path d="M4 9v6M20 9v6M7 6v12M17 6v12M7 12h10"/></svg>',
  note:  '<svg viewBox="0 0 24 24"><path d="M5 4h11l4 4v12H5z"/><path d="M9 10h7M9 14h7"/></svg>',
  plate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/></svg>'
};

function activeProgram() {
  if (!S.programs.length) return null;
  return S.programs.find(p => p.id === S.activeProgram) || S.programs[0];
}

function lastSessionFor(dayId) {
  for (let i = S.sessions.length - 1; i >= 0; i--) if (S.sessions[i].dayId === dayId) return S.sessions[i];
  return null;
}
function lastExercise(name) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const e = (S.sessions[i].exercises || []).find(x => x.name.toLowerCase() === name.toLowerCase());
    if (e && e.sets.some(s => s.done)) return e;
  }
  return null;
}

/* ---------- главный экран ---------- */
function renderTrain() {
  const prog = activeProgram();
  const body = $('#tr-body');
  const sub  = $('#tr-sub');

  if (!prog) {
    sub.textContent = 'программы пока нет';
    body.innerHTML =
      '<div class="empty">' + ICON.dumb +
      '<p>Программы пока нет</p>' +
      '<div class="small">Скопируй сообщение тренера целиком<br>и вставь — приложение разберёт его само</div>' +
      '<button class="btn" style="margin-top:22px;max-width:280px" onclick="openImport()">Вставить программу</button>' +
      '</div>';
    return;
  }

  sub.textContent = prog.title;
  let html = '';

  if (S.active) {
    const d = prog.days.find(x => x.id === S.active.dayId);
    html += '<div class="card tap" onclick="openSession()" style="border-color:var(--acc);background:color-mix(in srgb,var(--acc) 10%,var(--card))">' +
      '<div class="row between"><div class="grow"><div class="tiny" style="color:var(--acc)">Тренировка идёт</div>' +
      '<div style="font-size:17px;font-weight:700;margin-top:3px">' + h(S.active.dayTitle) + '</div>' +
      '<div class="small muted">' + sessionProgressText(S.active) + '</div></div>' +
      '<div class="btn sm" style="flex:none">Продолжить</div></div></div>';
  }

  html += weekStrip();

  html += '<div class="tiny" style="margin:18px 0 8px 2px">Дни программы</div>';
  prog.days.forEach((d, i) => {
    const last = lastSessionFor(d.id);
    const lastTxt = last ? 'последний раз ' + humanDate(last.date) : 'ещё не делали';
    html += '<div class="card tap" onclick="startDay(\'' + d.id + '\')">' +
      '<div class="row between">' +
        '<div class="grow">' +
          '<div style="font-size:17px;font-weight:700" class="wrap">' + h(d.title) + '</div>' +
          '<div class="small muted" style="margin-top:3px">' + d.exercises.length + ' ' + plural(d.exercises.length, 'упражнение', 'упражнения', 'упражнений') + ' · ' + lastTxt + '</div>' +
        '</div>' +
        '<div style="color:var(--tx3);font-size:22px;flex:none">›</div>' +
      '</div>' +
      '<div class="small muted wrap" style="margin-top:10px;color:var(--tx3)">' +
        h(d.exercises.slice(0, 4).map(e => e.name).join(' · ')) + (d.exercises.length > 4 ? ' …' : '') +
      '</div>' +
    '</div>';
  });

  html += '<div class="g3" style="margin-top:16px">' +
    '<button class="btn sec" onclick="openRecords()">Рекорды</button>' +
    '<button class="btn sec" onclick="openCalendar()">Календарь</button>' +
    '<button class="btn sec" onclick="openTimer()">Таймер</button>' +
    '</div>' +
    '<div class="btn2" style="margin-top:10px">' +
    '<button class="btn sec" onclick="openHistory()">История</button>' +
    '<button class="btn sec" onclick="editProgram()">Изменить</button>' +
    '</div>';

  if (S.programs.length > 1) {
    html += '<div class="tiny" style="margin:22px 0 8px 2px">Другие программы</div><div class="chips">';
    S.programs.forEach(p => {
      html += '<button class="chip' + (p.id === prog.id ? ' on' : '') + '" onclick="switchProgram(\'' + p.id + '\')">' + h(p.title) + '</button>';
    });
    html += '</div>';
  }

  body.innerHTML = html;
}

function weekStrip() {
  const t = today();
  let html = '<div class="dayline">';
  for (let i = 6; i >= 0; i--) {
    const d = shiftIso(t, -i);
    const trained = S.sessions.some(s => s.date === d);
    const ate = (S.food[d] || []).length > 0;
    const cls = trained ? 'tr' : (ate ? 'hit' : '');
    html += '<div class="' + cls + (i === 0 ? ' now' : '') + '">' + DOW[fromIso(d).getDay()] + '</div>';
  }
  html += '</div>';
  return html;
}

function switchProgram(id) { S.activeProgram = id; save(); renderTrain(); buzz(); }

/* ---------- импорт от тренера ---------- */
function openImport() {
  sheet(
    '<h2>Программа от тренера</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Скопируй сообщение целиком и вставь сюда. Разберу на дни и упражнения — потом можно поправить.</p>' +
    '<textarea class="inp" id="imp-t" placeholder="День 1 — ноги&#10;1. Приседания 4х12 40 кг&#10;2. Выпады 3х10 (на каждую ногу)&#10;3. Планка 3х45 сек&#10;&#10;День 2 — спина&#10;..."></textarea>' +
    '<button class="btn" style="margin-top:12px" id="imp-go">Разобрать</button>' +
    '<button class="btn gho" style="margin-top:8px" id="imp-paste">Вставить из буфера</button>',
    { onOpen: () => {
        $('#imp-go').onclick = () => {
          const txt = $('#imp-t').value;
          if (!txt.trim()) return toast('Сначала вставь текст');
          const prog = parseProgram(txt);
          if (!prog.days.length) return toast('Не нашёл упражнений — проверь текст');
          closeSheet();
          programEditor(prog, true);
        };
        $('#imp-paste').onclick = async () => {
          try {
            const t = await navigator.clipboard.readText();
            if (t) { $('#imp-t').value = t; toast('Вставлено'); }
            else toast('Буфер пуст');
          } catch (e) { toast('Вставь вручную: долгое нажатие в поле'); }
        };
        focusLater('#imp-t');
      } }
  );
}

/* ---------- редактор программы ---------- */
let EDIT = null;

function editProgram() {
  const p = activeProgram();
  if (!p) return;
  programEditor(JSON.parse(JSON.stringify(p)), false);
}

function programEditor(prog, isNew) {
  EDIT = { prog, isNew };
  sheet('<div id="ed-wrap"></div>', { onOpen: drawEditor });
}

function drawEditor() {
  const p = EDIT.prog;
  let html = '<h2>' + (EDIT.isNew ? 'Проверь, что получилось' : 'Изменить программу') + '</h2>';
  html += '<div class="field"><label class="lbl">Название программы</label>' +
    '<input class="inp" value="' + h(p.title) + '" oninput="EDIT.prog.title=this.value"></div>';

  p.days.forEach((d, di) => {
    html += '<div class="card" style="padding:14px">' +
      '<div class="row" style="margin-bottom:10px">' +
        '<input class="inp grow" style="font-weight:700" value="' + h(d.title) + '" oninput="EDIT.prog.days[' + di + '].title=this.value">' +
        '<button class="btn sm dan" style="flex:none;padding:9px 12px" onclick="edDelDay(' + di + ')">✕</button>' +
      '</div>';
    d.exercises.forEach((e, ei) => {
      html += '<div style="background:var(--card2);border-radius:12px;padding:10px;margin-bottom:8px">' +
        '<div class="row" style="margin-bottom:8px">' +
          '<input class="inp grow" style="background:var(--card);padding:9px 11px;font-size:15px" value="' + h(e.name) + '" oninput="EDIT.prog.days[' + di + '].exercises[' + ei + '].name=this.value">' +
          '<button class="btn sm dan" style="flex:none;padding:8px 11px" onclick="edDelEx(' + di + ',' + ei + ')">✕</button>' +
        '</div>' +
        '<div class="g3">' +
          '<div><label class="lbl">подходы</label><input class="inp inp-num" style="background:var(--card)" inputmode="numeric" value="' + h(e.sets) + '" oninput="EDIT.prog.days[' + di + '].exercises[' + ei + '].sets=+this.value||1"></div>' +
          '<div><label class="lbl">повторы</label><input class="inp inp-num" style="background:var(--card)" value="' + h(e.reps) + '" oninput="EDIT.prog.days[' + di + '].exercises[' + ei + '].reps=this.value"></div>' +
          '<div><label class="lbl">вес, кг</label><input class="inp inp-num" style="background:var(--card)" inputmode="decimal" value="' + h(e.weight) + '" oninput="EDIT.prog.days[' + di + '].exercises[' + ei + '].weight=this.value"></div>' +
        '</div>' +
        (e.note ? '<div class="small muted" style="margin-top:8px">' + h(e.note) + '</div>' : '') +
      '</div>';
    });
    html += '<button class="btn gho sm" style="width:100%" onclick="edAddEx(' + di + ')">+ упражнение</button>' +
      '</div>';
  });

  html += '<button class="btn gho" style="margin-bottom:12px" onclick="edAddDay()">+ добавить день</button>' +
    '<button class="btn" onclick="edSave()">Сохранить</button>' +
    (EDIT.isNew ? '' : '<button class="btn dan" style="margin-top:8px" onclick="edDelProgram()">Удалить программу</button>') +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Отмена</button>';

  $('#ed-wrap').innerHTML = html;
}

function edDelDay(di)      { EDIT.prog.days.splice(di, 1); drawEditor(); }
function edDelEx(di, ei)   { EDIT.prog.days[di].exercises.splice(ei, 1); drawEditor(); }
function edAddEx(di)       { EDIT.prog.days[di].exercises.push({ id: uid(), name: '', sets: 3, reps: '12', weight: '', rest: '', note: '' }); drawEditor(); }
function edAddDay()        { EDIT.prog.days.push({ id: uid(), title: 'День ' + (EDIT.prog.days.length + 1), exercises: [] }); drawEditor(); }

function edSave() {
  const p = EDIT.prog;
  p.days = p.days.filter(d => d.exercises.length);
  p.days.forEach(d => { d.exercises = d.exercises.filter(e => e.name.trim()); });
  if (!p.days.length) return toast('Нужно хотя бы одно упражнение');
  const i = S.programs.findIndex(x => x.id === p.id);
  if (i >= 0) S.programs[i] = p; else S.programs.push(p);
  S.activeProgram = p.id;
  save(); closeSheet(); renderTrain();
  toast(EDIT.isNew ? 'Программа сохранена' : 'Изменения сохранены');
  EDIT = null;
}

function edDelProgram() {
  confirmSheet('Удалить программу?', 'История выполненных тренировок останется.', 'Удалить', () => {
    S.programs = S.programs.filter(x => x.id !== EDIT.prog.id);
    S.activeProgram = S.programs.length ? S.programs[0].id : null;
    save(); closeSheet(); renderTrain(); toast('Удалено'); EDIT = null;
  });
}


/* Поля подходов заполняем не планом, а тем, что реально было в прошлый раз —
   так ей не приходится перебивать вес каждую тренировку. */
function buildSets(e) {
  const planReps = String(e.reps).match(/\d+/) ? String(e.reps).match(/\d+/)[0] : '';
  const prev = lastExercise(e.name);
  const prevDone = prev ? prev.sets.filter(x => x.done) : [];
  return Array.from({ length: Math.max(1, e.sets) }, (_, i) => {
    const p = prevDone[i] || prevDone[prevDone.length - 1];
    return {
      w: (p && p.w) || e.weight || '',
      r: (p && p.r) || planReps,
      done: false
    };
  });
}

/* Подсказка о прогрессии: если прошлый раз всё закрыла и было не тяжело — предложить прибавку */
function progressHint(name, plan) {
  const key = name.toLowerCase();
  let last = null;
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const e = (S.sessions[i].exercises || []).find(x => x.name.toLowerCase() === key);
    if (e && e.sets.some(x => x.done)) { last = { s: S.sessions[i], e }; break; }
  }
  if (!last) return '';
  const done = last.e.sets.filter(x => x.done);
  if (done.length < num(last.e.plan.sets, 0)) return '';
  const planReps = num(String(last.e.plan.reps).match(/\d+/) ? String(last.e.plan.reps).match(/\d+/)[0] : 0);
  if (planReps && done.some(x => num(x.r) < planReps)) return '';
  if (last.s.feel === 'тяжело' || last.s.feel === 'очень тяжело') return '';
  const w = num(done[0].w);
  if (!w) return '';
  const step = w < 20 ? 1 : w < 50 ? 2.5 : 5;
  return 'Прошлый раз закрыла всё' + (last.s.feel === 'легко' ? ' и было легко' : '') + ' → можно взять ' + r1(w + step) + ' кг';
}

/* ---------- тренировка ---------- */
function startDay(dayId) {
  const prog = activeProgram();
  const day = prog.days.find(d => d.id === dayId);
  if (!day) return;

  if (S.active && S.active.dayId !== dayId) {
    return confirmSheet('Начать другую тренировку?', 'Незаконченная «' + S.active.dayTitle + '» будет удалена.', 'Начать новую', () => {
      S.active = null; startDay(dayId);
    });
  }
  if (!S.active) {
    S.active = {
      programId: prog.id, dayId: day.id, dayTitle: day.title,
      date: today(), startedAt: Date.now(),
      exercises: day.exercises.map(e => ({
        name: e.name, plan: { sets: e.sets, reps: e.reps, weight: e.weight }, note: e.note || '', rest: e.rest || 90,
        sets: buildSets(e)
      }))
    };
    save();
  }
  openSession();
}

function sessionProgressText(a) {
  let done = 0, total = 0;
  a.exercises.forEach(e => e.sets.forEach(s => { total++; if (s.done) done++; }));
  return done + ' из ' + total + ' ' + plural(total, 'подхода', 'подходов', 'подходов') + ' сделано';
}

function openSession() {
  sheet('<div id="ses-wrap"></div>', { onOpen: drawSession });
}

function drawSession() {
  const a = S.active;
  if (!a) return closeSheet();
  const mins = Math.round((Date.now() - a.startedAt) / 60000);

  let html = '<h2 style="margin-bottom:4px">' + h(a.dayTitle) + '</h2>' +
    '<div class="small muted" style="margin-bottom:14px">' + sessionProgressText(a) + ' · ' + mins + ' мин</div>' +
    '<div id="rest-bar"></div>' +
    '<button class="btn gho sm" style="width:100%;margin-bottom:12px" onclick="openTimer()">Секундомер и таймер</button>';

  a.exercises.forEach((e, i) => {
    const done = e.sets.filter(s => s.done).length;
    const all  = done === e.sets.length;
    const prev = lastExercise(e.name);
    const prevTxt = prev ? 'прошлый раз: ' + prev.sets.filter(s => s.done).map(s => (s.w ? s.w + '×' : '') + s.r).join(', ') : '';
    const myNote = S.exNotes[e.name.toLowerCase()] || '';
    const hint = done ? '' : progressHint(e.name, e.plan);
    const tm = String(e.plan.reps).match(/(\d+)\s*(сек|мин)/i);
    const timed = tm ? (/мин/i.test(tm[2]) ? +tm[1] * 60 : +tm[1]) : 0;

    html += '<div class="ex' + (all ? ' done' : '') + (i === firstUndone(a) ? ' open' : '') + '" id="ex-' + i + '">' +
      '<div class="ex-h" onclick="toggleEx(' + i + ')">' +
        '<div class="ex-n">' + (all ? '✓' : (i + 1)) + '</div>' +
        '<div class="grow">' +
          '<div style="font-weight:650;font-size:15.5px" class="wrap">' + h(e.name) + '</div>' +
          '<div class="small muted">' + e.plan.sets + '×' + h(e.plan.reps) + (e.plan.weight ? ' · ' + h(e.plan.weight) + ' кг' : '') + ' · ' + done + '/' + e.sets.length + '</div>' +
        '</div>' +
        '<div style="color:var(--tx3);flex:none">▾</div>' +
      '</div>' +
      '<div class="ex-b">' +
        (e.note ? '<div class="small muted" style="padding:10px 0 0">' + h(e.note) + '</div>' : '') +
        (myNote ? '<div class="small" style="padding:10px 0 0;color:var(--acc3)">📌 ' + h(myNote) + '</div>' : '') +
        (prevTxt ? '<div class="small" style="padding:10px 0 0;color:var(--acc4)">' + h(prevTxt) + '</div>' : '') +
        (hint ? '<div class="small" style="padding:10px 0 0;color:var(--ok)">↗ ' + h(hint) + '</div>' : '') +
        (timed ? '<button class="btn sec sm" style="width:100%;margin-top:12px" onclick="startTimed(' + timed + ')">▶ Засечь ' + h(e.plan.reps) + '</button>' : '') +
        '<div class="sethead"><span></span><span>кг</span><span>повторы</span><span></span></div>';

    e.sets.forEach((s, si) => {
      html += '<div class="set' + (s.done ? ' done' : '') + '" id="set-' + i + '-' + si + '">' +
        '<div class="ix">' + (si + 1) + '</div>' +
        '<input class="inp inp-num" inputmode="decimal" value="' + h(s.w) + '" onchange="setVal(' + i + ',' + si + ',\'w\',this.value)">' +
        '<input class="inp inp-num" inputmode="numeric" value="' + h(s.r) + '" onchange="setVal(' + i + ',' + si + ',\'r\',this.value)">' +
        '<button class="ck" onclick="toggleSet(' + i + ',' + si + ')">' + ICON.check + '</button>' +
      '</div>';
    });

    html += '<button class="btn gho sm" style="width:100%;margin-top:10px" onclick="addSet(' + i + ')">+ подход</button>' +
      '</div></div>';
  });

  html += '<button class="btn" style="margin-top:16px" onclick="finishSession()">Завершить тренировку</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Свернуть</button>' +
    '<button class="btn dan" style="margin-top:8px" onclick="dropSession()">Отменить тренировку</button>';

  $('#ses-wrap').innerHTML = html;
}

function firstUndone(a) {
  for (let i = 0; i < a.exercises.length; i++) if (a.exercises[i].sets.some(s => !s.done)) return i;
  return -1;
}
function toggleEx(i) { $('#ex-' + i).classList.toggle('open'); }
function setVal(i, si, k, v) { S.active.exercises[i].sets[si][k] = v.replace(',', '.'); save(); }
function addSet(i) {
  const e = S.active.exercises[i];
  const last = e.sets[e.sets.length - 1] || { w: '', r: '' };
  e.sets.push({ w: last.w, r: last.r, done: false });
  save(); drawSession(); $('#ex-' + i).classList.add('open');
}
function toggleSet(i, si) {
  const s = S.active.exercises[i].sets[si];
  s.done = !s.done;
  save(); buzz(s.done ? 'medium' : 'light');
  const row = $('#set-' + i + '-' + si);
  row.classList.toggle('done', s.done);
  const e = S.active.exercises[i];
  const done = e.sets.filter(x => x.done).length;
  const card = $('#ex-' + i);
  card.classList.toggle('done', done === e.sets.length);
  $('.ex-n', card).textContent = done === e.sets.length ? '✓' : (i + 1);
  const sub = $('.ex-h .small', card);
  sub.textContent = e.plan.sets + '×' + e.plan.reps + (e.plan.weight ? ' · ' + e.plan.weight + ' кг' : '') + ' · ' + done + '/' + e.sets.length;
  const top = $('#ses-wrap > .small');
  if (top) top.textContent = sessionProgressText(S.active) + ' · ' + Math.round((Date.now() - S.active.startedAt) / 60000) + ' мин';
  if (s.done) {
    if (checkPR(e.name, s.w, s.r)) prFlash(e.name, s.w, s.r);
    startRest(e.rest || 90);
  }
}

/* ---------- личный рекорд ---------- */
let prT = null;
function prFlash(name, w, r) {
  const el = $('#prflash');
  el.innerHTML = '🏆 Новый рекорд!<small>' + h(name) + ' — ' + h(w) + ' кг × ' + h(r) + '</small>';
  el.classList.add('on');
  buzz('heavy');
  clearTimeout(prT);
  prT = setTimeout(() => el.classList.remove('on'), 2600);
}

/* ---------- таймер отдыха ---------- */
let restT = null;
function startRest(sec) { startCountdown(sec, 'Отдых'); }
function startTimed(sec) { startCountdown(sec, 'Упражнение'); buzz(); }

function startCountdown(sec, label) {
  clearInterval(restT);
  const bar = $('#rest-bar');
  if (!bar) return;
  let left = sec;
  const paint = () => {
    const m = Math.floor(left / 60), s = left % 60;
    bar.innerHTML = '<div class="card" style="padding:12px 16px;border-color:var(--acc4);background:color-mix(in srgb,var(--acc4) 10%,var(--card))">' +
      '<div class="row between"><div><div class="tiny" style="color:var(--acc4)">' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;font-variant-numeric:tabular-nums">' + m + ':' + String(s).padStart(2, '0') + '</div></div>' +
      '<div class="row" style="gap:8px"><button class="btn sm sec" onclick="restAdd(30)">+30с</button>' +
      '<button class="btn sm sec" onclick="stopRest()">Стоп</button></div></div></div>';
  };
  paint();
  restT = setInterval(() => {
    left--;
    if (left <= 0) { stopRest(); beep(); buzz('heavy'); toast(label === 'Отдых' ? 'Отдых окончен' : 'Время вышло'); return; }
    paint();
  }, 1000);
  window.__restLeft = () => left;
  window.restAdd = n => { left += n; paint(); };
}
function stopRest() { clearInterval(restT); const b = $('#rest-bar'); if (b) b.innerHTML = ''; }
function beep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = new C();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .5);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + .5);
  } catch (e) {}
}

/* ---------- завершение ---------- */
function finishSession() {
  const a = S.active;
  const doneSets = a.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  if (!doneSets) return confirmSheet('Ничего не отмечено', 'Тренировка будет удалена без записи в историю.', 'Всё равно завершить', dropSessionNow);

  sheet2(
    '<h2>Как прошла тренировка?</h2>' +
    '<div class="chips" id="feel-c" style="padding-bottom:14px">' +
      '<button class="chip" data-f="легко">Легко</button>' +
      '<button class="chip on" data-f="норм">Нормально</button>' +
      '<button class="chip" data-f="тяжело">Тяжело</button>' +
      '<button class="chip" data-f="очень тяжело">Очень тяжело</button>' +
    '</div>' +
    '<div class="field"><label class="lbl">Комментарий тренеру (не обязательно)</label>' +
    '<textarea class="inp" id="fin-note" style="min-height:90px" placeholder="Колено поднывало на выпадах, вес на жиме взяла легко"></textarea></div>' +
    '<button class="btn" id="fin-ok">Сохранить тренировку</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Назад</button>',
    { onOpen: () => {
        let feel = 'норм';
        $$('#feel-c .chip').forEach(b => b.onclick = () => {
          $$('#feel-c .chip').forEach(x => x.classList.remove('on'));
          b.classList.add('on'); feel = b.dataset.f;
        });
        $('#fin-ok').onclick = () => {
          a.finishedAt = Date.now();
          a.feel = feel;
          a.note = $('#fin-note').value.trim();
          a.id = uid();
          a.exercises.forEach(e => { e.sets = e.sets.filter(s => s.done || s.w || s.r); });
          S.sessions.push(a);
          S.active = null;
          save(); stopRest(); closeSheet2(); closeSheet(); renderTrain(); buzz('heavy');
          toast('Записано! Отчёт можно отправить тренеру');
        };
      } }
  );
}
function dropSession() {
  confirmSheet('Отменить тренировку?', 'Отмеченные подходы не сохранятся.', 'Отменить тренировку', dropSessionNow);
}
function dropSessionNow() {
  S.active = null; save(); stopRest(); closeSheet2(); closeSheet(); renderTrain();
}

/* ---------- история ---------- */
function openHistory() {
  const list = S.sessions.slice().reverse();
  let html = '<h2>История тренировок</h2>';
  if (!list.length) html += '<div class="empty"><p>Пока пусто</p></div>';
  list.slice(0, 60).forEach(s => {
    const setsN = s.exercises.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
    const vol = tonnage(s);
    const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
    html += '<div class="card tap" onclick="openSessionCard(\'' + s.id + '\')">' +
      '<div class="row between"><div class="grow">' +
      '<div style="font-weight:700" class="wrap">' + h(s.dayTitle) + '</div>' +
      '<div class="small muted" style="margin-top:2px">' + humanDateFull(s.date) + '</div></div>' +
      '<div class="pill' + (s.feel === 'тяжело' || s.feel === 'очень тяжело' ? ' r' : ' g') + '">' + h(s.feel || '') + '</div></div>' +
      '<div class="small muted" style="margin-top:10px">' + setsN + ' подходов · ' + (vol ? r0(vol) + ' кг тоннаж · ' : '') + mins + ' мин</div>' +
      (s.note ? '<div class="small wrap" style="margin-top:8px;color:var(--tx2)">« ' + h(s.note) + ' »</div>' : '') +
      '</div>';
  });
  html += '<button class="btn sec" style="margin-top:10px" onclick="closeSheet()">Закрыть</button>';
  sheet(html);
}

function tonnage(s) {
  let v = 0;
  s.exercises.forEach(e => e.sets.forEach(x => { if (x.done) v += num(x.w) * num(x.r); }));
  return v;
}

function openSessionCard(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return;
  let html = '<h2>' + h(s.dayTitle) + '</h2><div class="small muted" style="margin:-8px 0 14px">' + humanDateFull(s.date) + '</div>';
  s.exercises.forEach(e => {
    const done = e.sets.filter(x => x.done);
    if (!done.length) return;
    html += '<div class="card" style="padding:13px">' +
      '<div style="font-weight:650" class="wrap">' + h(e.name) + '</div>' +
      '<div class="small muted" style="margin-top:5px">' + done.map(x => (x.w ? x.w + ' кг × ' : '') + (x.r || '-')).join('  ·  ') + '</div>' +
      '</div>';
  });
  html += '<button class="btn" style="margin-top:8px" onclick="shareSession(\'' + id + '\')">Отправить тренеру</button>' +
    '<button class="btn dan" style="margin-top:8px" onclick="delSession(\'' + id + '\')">Удалить запись</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Закрыть</button>';
  sheet2(html);
}
function delSession(id) {
  confirmSheet('Удалить запись?', 'Тренировка исчезнет из истории и отчётов.', 'Удалить', () => {
    S.sessions = S.sessions.filter(x => x.id !== id);
    save(); closeSheet2(); closeSheet(); renderTrain(); toast('Удалено');
  });
}
