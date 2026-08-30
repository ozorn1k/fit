/* ============================================================
   parser.js — разбор текста программы от тренера

   Важно: в JS \w и \b работают только с латиницей, поэтому везде
   используются явные кириллические классы [а-яё] и lookahead-и.

   Понимает:
     День 1 — ноги            Понедельник (верх тела):
     1. Приседания 4х12 40 кг     2) Жим 4x10 12кг
     Жим ногами 3 подхода по 15   Разводка 3 по 15
     Планка 3х45 сек              Дорожка 30 мин
     Выпады 3х10 (на каждую ногу) Отдых между подходами 90 сек
   ============================================================ */

const RE = {
  bullet:  /^\s*(?:\d{1,2}\s*[.)]\s*|[-–—•*·]\s*)/,
  dayNum:  /^\s*\*{0,2}\s*(?:день|тренировка|day|занятие|блок)\s*[№#]?\s*[0-9IVXА-Яа-яA-Za-z]{1,3}(?![а-яё])/i,
  dow:     /^\s*\*{0,2}\s*(пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)(?![а-яё])/i,
  week:    /^\s*\*{0,2}\s*недел[яи]\s*\d/i,
  md:      /^\s*#{1,4}\s+/,

  restLine: /^\s*отдых/i,
  rest:     /отдых[а-яё]*(?:\s+между\s+[а-яё]+)?\s*[-–—:]?\s*(\d{1,3})\s*(сек[а-яё]*|мин[а-яё]*)?/i,

  setsX:   /(\d{1,2})\s*[хxXХ*×]\s*(\d{1,3}\s*[-–—]\s*\d{1,3}|\d{1,3}|макс[а-яё]*|max)\s*(сек[а-яё]*|мин[а-яё]*)?/i,
  setsBy:  /(\d{1,2})\s*(?:подход[а-яё]*|сет[а-яё]*|круг[а-яё]*|сери[а-яё]*)\s*(?:по\s*)?(\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)?/i,
  setsPo:  /(\d{1,2})\s*по\s*(\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)(?!\s*(?:кг|kg))/i,
  repsBy:  /по\s*(\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)\s*(?:раз[а-яё]*|повтор[а-яё]*)/i,

  weight:  /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:кг|kg)(?![а-яё])/i,
  weightW: /(?:с\s+весом|вес)\s*[-–—:]?\s*(\d{1,3}(?:[.,]\d{1,2})?)/i,

  time:    /(\d{1,3})\s*(сек[а-яё]*|мин[а-яё]*)(?![а-яё])/i,
  paren:   /\(([^)]*)\)/,
  toFail:  /(до\s*отказа|макс[а-яё]*|max)/i,
  junk:    /(^|\s)(сек[а-яё]*|мин[а-яё]*|кг|kg|раз|повторени[а-яё]*|подход[а-яё]*)(?=\s|$)/gi
};

function isDayHeader(line) {
  const l = line.trim();
  if (!l) return false;
  if (RE.restLine.test(l)) return false;
  if (RE.week.test(l) || RE.dayNum.test(l) || RE.dow.test(l) || RE.md.test(l)) return true;
  const hasSets = RE.setsX.test(l) || RE.setsBy.test(l) || RE.setsPo.test(l);
  if (hasSets) return false;
  if (/[:：]\s*$/.test(l) && l.length < 60) return true;
  if (/^\*{2}.+\*{2}$/.test(l)) return true;
  return false;
}

function cleanHeader(line) {
  return line
    .replace(RE.md, '')
    .replace(/\*+/g, '')
    .replace(/[:：]\s*$/, '')
    .replace(/^\s*[-–—]\s*/, '')
    .trim();
}

/* сек/мин -> секунды */
function toSec(val, unit) {
  return /^мин/i.test(unit || '') ? val * 60 : val;
}

/* Возвращает объект упражнения, либо {onlyRest: сек} для строки «Отдых 90 сек» */
function parseExercise(line) {
  let s = line.replace(RE.bullet, '').replace(/\*+/g, '').trim();
  if (!s) return null;

  const ex = { id: uid(), name: '', sets: 3, reps: '12', weight: '', rest: '', note: '', time: '' };

  // комментарий в скобках
  const pm = s.match(RE.paren);
  if (pm) { ex.note = pm[1].trim(); s = s.replace(RE.paren, ' '); }

  // отдых
  const rm = s.match(RE.rest);
  if (rm) {
    ex.rest = toSec(+rm[1], rm[2]);
    s = s.replace(RE.rest, ' ');
    if (RE.restLine.test(line) && !s.replace(/[^а-яёa-z]/gi, '').replace(/^между[а-яё]*$/i, '')) {
      return { onlyRest: ex.rest };
    }
    if (RE.restLine.test(line)) return { onlyRest: ex.rest };
  }

  // подходы × повторы
  let found = false;
  let m = s.match(RE.setsX);
  if (m) {
    ex.sets = Math.min(20, +m[1] || 3);
    ex.reps = String(m[2]).replace(/\s+/g, '');
    if (RE.toFail.test(ex.reps)) ex.reps = 'макс';
    if (m[3]) ex.reps += /^мин/i.test(m[3]) ? ' мин' : ' сек';
    s = s.replace(RE.setsX, ' ');
    found = true;
  }
  if (!found) {
    m = s.match(RE.setsBy);
    if (m) {
      ex.sets = Math.min(20, +m[1] || 3);
      if (m[2]) ex.reps = m[2].replace(/\s+/g, '');
      s = s.replace(RE.setsBy, ' ');
      found = true;
      if (!m[2]) {
        const r2 = s.match(RE.repsBy) || s.match(/по\s*(\d{1,3})/i);
        if (r2) { ex.reps = r2[1]; s = s.replace(r2[0], ' '); }
      }
    }
  }
  if (!found) {
    m = s.match(RE.setsPo);
    if (m) {
      ex.sets = Math.min(20, +m[1] || 3);
      ex.reps = m[2].replace(/\s+/g, '');
      s = s.replace(RE.setsPo, ' ');
      found = true;
    }
  }
  if (!found) {
    m = s.match(RE.repsBy);
    if (m) { ex.reps = m[1].replace(/\s+/g, ''); s = s.replace(RE.repsBy, ' '); found = true; }
  }

  // вес
  let wm = s.match(RE.weight);
  if (wm) { ex.weight = wm[1].replace(',', '.'); s = s.replace(RE.weight, ' '); }
  else {
    wm = s.match(RE.weightW);
    if (wm) { ex.weight = wm[1].replace(',', '.'); s = s.replace(RE.weightW, ' '); }
  }

  // время: кардио и статика («Дорожка 30 мин», «Планка 60 сек»)
  const tm = s.match(RE.time);
  if (tm) {
    const sec = toSec(+tm[1], tm[2]);
    ex.time = sec;
    if (!found) {
      ex.sets = 1;
      ex.reps = /^мин/i.test(tm[2]) ? tm[1] + ' мин' : tm[1] + ' сек';
      found = true;
    }
    s = s.replace(RE.time, ' ');
  }

  // остаток — название
  ex.name = s
    .replace(RE.junk, ' ')
    .replace(/[,;]+\s*$/, '')
    .replace(/\s*[-–—:]\s*$/, '')
    .replace(/^\s*[-–—:,]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!ex.name || ex.name.length < 2) return null;
  ex.name = ex.name.charAt(0).toUpperCase() + ex.name.slice(1);
  return ex;
}

function parseProgram(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const prog = { id: uid(), title: '', createdAt: Date.now(), days: [] };
  if (!lines.length) return prog;

  let cur = null;
  let start = 0;

  // первая строка как название программы
  const first = lines[0];
  if (!isDayHeader(first) && !RE.setsX.test(first) && !RE.setsBy.test(first) && !RE.setsPo.test(first) &&
      first.length < 70 && lines.length > 2) {
    prog.title = cleanHeader(first);
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    if (isDayHeader(line)) {
      cur = { id: uid(), title: cleanHeader(line) || ('День ' + (prog.days.length + 1)), note: '', exercises: [], rest: '' };
      prog.days.push(cur);
      continue;
    }

    const res = parseExercise(line);
    if (!res) continue;

    if (res.onlyRest) {                      // «Отдых между подходами 90 сек»
      if (cur) cur.rest = res.onlyRest;
      continue;
    }
    if (!cur) {
      cur = { id: uid(), title: 'Тренировка', note: '', exercises: [], rest: '' };
      prog.days.push(cur);
    }
    cur.exercises.push(res);
  }

  // общий отдых дня — тем упражнениям, где он не указан явно
  prog.days.forEach(d => {
    if (d.rest) d.exercises.forEach(e => { if (!e.rest) e.rest = d.rest; });
  });

  prog.days = prog.days.filter(d => d.exercises.length);

  if (!prog.title) {
    const d = new Date();
    prog.title = 'Программа от ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  return prog;
}
