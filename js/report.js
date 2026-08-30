/* ============================================================
   report.js — сборка отчёта тренеру: текст по разделам + ссылка
   ============================================================ */

let REP = { from: null, to: null, preset: 'week' };

function presetRange(p) {
  const t = today();
  if (p === 'day')   return [t, t];
  if (p === 'week')  return [shiftIso(t, -6), t];
  if (p === 'month') return [shiftIso(t, -29), t];
  return [shiftIso(t, -6), t];
}

function openReport() {
  const [f, t] = presetRange(REP.preset);
  REP.from = REP.from || f; REP.to = REP.to || t;
  sheet('<div id="rp-wrap"></div>', { onOpen: drawReport });
}

function setPreset(p) {
  REP.preset = p;
  const [f, t] = presetRange(p);
  REP.from = f; REP.to = t;
  drawReport();
}

function drawReport() {
  const d = collectReport();
  const html =
    '<h2>Отчёт тренеру</h2>' +
    '<div class="chips">' +
      ['day','week','month'].map(p =>
        '<button class="chip' + (REP.preset === p ? ' on' : '') + '" onclick="setPreset(\'' + p + '\')">' +
        (p === 'day' ? 'Сегодня' : p === 'week' ? 'Неделя' : '30 дней') + '</button>').join('') +
    '</div>' +
    '<div class="g2" style="margin-bottom:14px">' +
      '<div><label class="lbl">с</label><input type="date" class="inp" value="' + REP.from + '" onchange="REP.from=this.value;REP.preset=\'custom\';drawReport()"></div>' +
      '<div><label class="lbl">по</label><input type="date" class="inp" value="' + REP.to + '" onchange="REP.to=this.value;REP.preset=\'custom\';drawReport()"></div>' +
    '</div>' +

    '<div class="card"><div class="row between"><div class="small muted">Тренировок</div><b>' + d.w.length + '</b></div>' +
      '<div class="row between" style="margin-top:8px"><div class="small muted">Дней с питанием</div><b>' + d.f.length + '</b></div>' +
      '<div class="row between" style="margin-top:8px"><div class="small muted">Среднее ккал</div><b>' + (d.avgK ? r0(d.avgK) : '—') + '</b></div>' +
      (d.wt.length ? '<div class="row between" style="margin-top:8px"><div class="small muted">Вес</div><b>' + r1(d.wt[d.wt.length - 1].kg) + ' кг</b></div>' : '') +
    '</div>' +

    '<div class="tiny" style="margin:18px 0 8px 2px">Как отправить</div>' +
    '<button class="btn" onclick="sendReportLink()">Ссылка на красивый отчёт</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="sendReportText()">Текстом в чат</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="previewReport()">Посмотреть, как выглядит</button>' +

    '<div class="tiny" style="margin:20px 0 8px 2px">Предпросмотр текста</div>' +
    '<div class="rep">' + h(reportText(d)) + '</div>' +
    '<button class="btn sec" style="margin-top:12px" onclick="closeSheet()">Закрыть</button>';
  $('#rp-wrap').innerHTML = html;
}

/* ---------- сбор данных ---------- */
function collectReport() {
  const from = REP.from, to = REP.to;
  const inR = d => d >= from && d <= to;

  const w = S.sessions.filter(s => inR(s.date)).map(s => ({
    d: s.date,
    title: s.dayTitle,
    feel: s.feel || '',
    note: s.note || '',
    mins: s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0,
    ton: r0(tonnage(s)),
    ex: s.exercises.map(e => ({
      n: e.name,
      p: e.plan.sets + '×' + e.plan.reps + (e.plan.weight ? ' · ' + e.plan.weight + ' кг' : ''),
      s: e.sets.filter(x => x.done).map(x => (x.w ? x.w + '×' : '') + (x.r || '–')).join(' · ')
    })).filter(e => e.s)
  }));

  const f = [];
  Object.keys(S.food).filter(inR).sort().forEach(d => {
    const s = daySum(d);
    if (s.kcal > 0) f.push({ d, kcal: r0(s.kcal), p: r0(s.p), f: r0(s.f), c: r0(s.c) });
  });
  const avgK = f.length ? f.reduce((n, x) => n + x.kcal, 0) / f.length : 0;
  const avgP = f.length ? f.reduce((n, x) => n + x.p, 0) / f.length : 0;
  const avgF = f.length ? f.reduce((n, x) => n + x.f, 0) / f.length : 0;
  const avgC = f.length ? f.reduce((n, x) => n + x.c, 0) / f.length : 0;

  const wt = S.weights.filter(x => inR(x.date)).map(x => ({ d: x.date, kg: x.kg, ch: x.ch, wa: x.wa, hi: x.hi }));

  const nt = S.notes.filter(n => n.pin || (n.ts >= fromIso(from).getTime())).sort((a, b) => b.ts - a.ts).slice(0, 8).map(n => n.text);

  return {
    n: S.profile.name || '', tr: S.profile.trainer || '',
    from, to, w, f, wt, nt,
    avgK, avgP, avgF, avgC,
    tg: { kcal: S.profile.targetKcal, p: S.profile.targetP, f: S.profile.targetF, c: S.profile.targetC }
  };
}

function rangeLabel(from, to) {
  const a = fromIso(from), b = fromIso(to);
  if (from === to) return a.getDate() + ' ' + MONTHS[a.getMonth()];
  const sameM = a.getMonth() === b.getMonth();
  return a.getDate() + (sameM ? '' : ' ' + MONTHS[a.getMonth()]) + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()];
}

/* ---------- текстовый отчёт ---------- */
function reportText(d) {
  const L = [];
  L.push('📋 ОТЧЁТ' + (d.n ? ' — ' + d.n : ''));
  L.push('📅 ' + rangeLabel(d.from, d.to));
  L.push('');

  L.push('━━━ ТРЕНИРОВКИ ━━━');
  if (!d.w.length) {
    L.push('за период тренировок не было');
  } else {
    const ton = d.w.reduce((n, x) => n + x.ton, 0);
    L.push('Всего: ' + d.w.length + (ton ? ' · тоннаж ' + r0(ton) + ' кг' : ''));
    L.push('');
    d.w.forEach(s => {
      const dd = fromIso(s.d);
      L.push('▸ ' + DOW[dd.getDay()] + ', ' + dd.getDate() + ' ' + MONTHS[dd.getMonth()] + ' — ' + s.title +
             (s.mins ? ' (' + s.mins + ' мин' + (s.feel ? ', ' + s.feel : '') + ')' : (s.feel ? ' (' + s.feel + ')' : '')));
      s.ex.forEach(e => {
        L.push('   • ' + e.n + ': ' + e.s + '   [план ' + e.p + ']');
      });
      if (s.note) L.push('   💬 ' + s.note);
      L.push('');
    });
  }

  L.push('━━━ ПИТАНИЕ ━━━');
  if (!d.f.length) {
    L.push('дневник не заполнялся');
  } else {
    const dev = d.avgK - d.tg.kcal;
    L.push('Среднее: ' + r0(d.avgK) + ' ккал при цели ' + d.tg.kcal + ' (' + (dev > 0 ? '+' : '') + r0(dev) + ')');
    L.push('Б ' + r0(d.avgP) + ' / Ж ' + r0(d.avgF) + ' / У ' + r0(d.avgC) + ' г в среднем');
    L.push('');
    d.f.forEach(x => {
      const dd = fromIso(x.d);
      L.push('   ' + DOW[dd.getDay()] + ' ' + dd.getDate() + '.' + String(dd.getMonth() + 1).padStart(2, '0') + ' — ' + x.kcal + ' ккал (Б' + x.p + ' Ж' + x.f + ' У' + x.c + ')');
    });
  }
  L.push('');

  if (d.wt.length) {
    L.push('━━━ ВЕС ━━━');
    const a = d.wt[0], b = d.wt[d.wt.length - 1];
    const dif = b.kg - a.kg;
    L.push(r1(b.kg) + ' кг' + (d.wt.length > 1 ? ' (' + (dif > 0 ? '+' : '') + r1(dif) + ' кг за период)' : ''));
    if (b.ch || b.wa || b.hi) {
      L.push('Замеры: ' + [b.ch ? 'грудь ' + b.ch : '', b.wa ? 'талия ' + b.wa : '', b.hi ? 'бёдра ' + b.hi : ''].filter(Boolean).join(' · ') + ' см');
    }
    L.push('');
  }

  if (d.nt.length) {
    L.push('━━━ ВОПРОСЫ И ЗАМЕТКИ ━━━');
    d.nt.forEach(t => L.push('• ' + t.replace(/\n/g, ' ')));
    L.push('');
  }

  return L.join('\n').trim();
}

/* ---------- ссылка на HTML-отчёт ----------
   Данные пакуются прямо в ссылку: сначала deflate (если браузер умеет),
   затем base64url. Префикс z = сжато, p = как есть. Сервер не участвует. */
function b64url(bytes) {
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function encodePayload(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const w = cs.writable.getWriter();
      w.write(bytes); w.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      return 'z' + b64url(new Uint8Array(buf));
    } catch (e) { /* падаем на несжатый вариант */ }
  }
  return 'p' + b64url(bytes);
}

async function reportUrl() {
  const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  return base + 'report.html#' + await encodePayload(collectReport());
}

async function sendReportLink() {
  const url = await reportUrl();
  if (url.length > 3800) {
    return confirmSheet('Период слишком большой',
      'Столько данных не помещается в одну ссылку — мессенджер её обрежет. Выбери период короче, например неделю.',
      'Понятно', () => {});
  }
  const d = collectReport();
  const msg = '📋 Отчёт' + (d.n ? ' — ' + d.n : '') + ' · ' + rangeLabel(d.from, d.to) + '\n' + url;
  if (navigator.share) {
    navigator.share({ title: 'Отчёт', text: msg }).catch(() => copyText(msg));
  } else copyText(msg);
}

function sendReportText() {
  const t = reportText(collectReport());
  if (navigator.share) navigator.share({ text: t }).catch(() => copyText(t));
  else copyText(t);
}

async function previewReport() {
  const url = await reportUrl();
  if (TG.on && TG.wa.openLink) TG.wa.openLink(url);
  else window.open(url, '_blank');
}

/* отправка одной тренировки */
function shareSession(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return;
  const dd = fromIso(s.date);
  const L = ['🏋️ ' + s.dayTitle, '📅 ' + dd.getDate() + ' ' + MONTHS[dd.getMonth()] + (s.feel ? ' · ' + s.feel : ''), ''];
  s.exercises.forEach(e => {
    const done = e.sets.filter(x => x.done);
    if (!done.length) return;
    L.push('• ' + e.name + ': ' + done.map(x => (x.w ? x.w + '×' : '') + (x.r || '-')).join(', '));
  });
  if (s.note) L.push('', '💬 ' + s.note);
  const t = L.join('\n');
  if (navigator.share) navigator.share({ text: t }).catch(() => copyText(t));
  else copyText(t);
}
