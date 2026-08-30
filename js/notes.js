/* ============================================================
   notes.js — заметки, вес и замеры, профиль, данные
   ============================================================ */

function renderNotes() {
  const list = S.notes.slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.ts - a.ts);
  $('#nt-sub').textContent = list.length ? list.length + ' ' + plural(list.length, 'заметка', 'заметки', 'заметок') : 'пока пусто';

  if (!list.length) {
    $('#nt-body').innerHTML = '<div class="empty">' + ICON.note +
      '<p>Заметок пока нет</p><div class="small">Вопросы тренеру, самочувствие, что попробовать в следующий раз</div>' +
      '<button class="btn" style="margin-top:22px;max-width:280px" onclick="editNote()">Написать</button></div>';
    return;
  }

  $('#nt-body').innerHTML = list.map(n =>
    '<div class="card tap" onclick="editNote(\'' + n.id + '\')">' +
      '<div class="row between" style="align-items:flex-start">' +
        '<div class="grow wrap" style="font-size:15.5px;line-height:1.5">' + h(n.text).replace(/\n/g, '<br>') + '</div>' +
        (n.pin ? '<div style="flex:none;color:var(--acc3)">★</div>' : '') +
      '</div>' +
      '<div class="small" style="color:var(--tx3);margin-top:10px">' + humanDate(iso(new Date(n.ts))) + '</div>' +
    '</div>').join('');
}

function editNote(id) {
  const n = id ? S.notes.find(x => x.id === id) : null;
  sheet(
    '<h2>' + (n ? 'Заметка' : 'Новая заметка') + '</h2>' +
    '<textarea class="inp" id="nt-t" placeholder="Спросить у тренера про замену выпадов…">' + (n ? h(n.text) : '') + '</textarea>' +
    '<div class="row" style="margin:14px 0">' +
      '<button class="chip' + (n && n.pin ? ' on' : '') + '" id="nt-pin">★ Закрепить</button>' +
    '</div>' +
    '<button class="btn" id="nt-save">Сохранить</button>' +
    (n ? '<button class="btn dan" style="margin-top:8px" id="nt-del">Удалить</button>' : '') +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Отмена</button>',
    { onOpen: () => {
        let pin = n ? !!n.pin : false;
        $('#nt-pin').onclick = () => { pin = !pin; $('#nt-pin').classList.toggle('on', pin); };
        $('#nt-save').onclick = () => {
          const text = $('#nt-t').value.trim();
          if (!text) return toast('Пустая заметка');
          if (n) { n.text = text; n.pin = pin; }
          else S.notes.push({ id: uid(), text, ts: Date.now(), pin });
          save(); closeSheet(); renderNotes();
        };
        if (n) $('#nt-del').onclick = () => confirmSheet('Удалить заметку?', '', 'Удалить', () => {
          S.notes = S.notes.filter(x => x.id !== n.id); save(); closeSheet(); renderNotes();
        });
        focusLater('#nt-t');
      } }
  );
}

/* ============================================================
   ПРОФИЛЬ
   ============================================================ */
function renderMore() {
  const P = S.profile;
  const w = S.weights.slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastW = w[w.length - 1];
  const firstW = w[0];
  const diff = lastW && firstW && w.length > 1 ? lastW.kg - firstW.kg : null;

  $('#mr-sub').textContent = P.name ? P.name : 'настройки и данные';

  let html = '';

  /* вес */
  html += '<div class="card">' +
    '<div class="row between"><div class="tiny">Вес</div>' +
    '<button class="btn sm sec" onclick="addWeight()">Записать</button></div>';
  if (lastW) {
    html += '<div class="row" style="align-items:flex-end;gap:10px;margin-top:8px">' +
      '<div style="font-size:34px;font-weight:700;letter-spacing:-1px">' + r1(lastW.kg) + '<span class="small muted" style="font-weight:500"> кг</span></div>' +
      (diff !== null ? '<div class="pill ' + (diff <= 0 ? 'g' : 'r') + '" style="margin-bottom:8px">' + (diff > 0 ? '+' : '') + r1(diff) + ' кг</div>' : '') +
      '</div>' +
      '<div class="small muted">последнее измерение ' + humanDate(lastW.date) + '</div>' +
      spark(w.map(x => x.kg));
  } else {
    html += '<div class="small muted" style="margin-top:8px">Записывай раз в неделю утром — так динамика видна честнее.</div>';
  }
  html += '</div>';

  /* цели */
  html += '<div class="card tap" onclick="editTargets()">' +
    '<div class="row between"><div class="grow"><div class="tiny">Цель по калориям</div>' +
    '<div style="font-size:20px;font-weight:700;margin-top:3px">' + P.targetKcal + ' ккал</div>' +
    '<div class="small muted">Б ' + P.targetP + ' · Ж ' + P.targetF + ' · У ' + P.targetC + ' г</div></div>' +
    '<div style="color:var(--tx3);font-size:22px">›</div></div></div>';

  /* отчёт */
  html += '<div class="card tap" onclick="openReport()" style="border-color:color-mix(in srgb,var(--acc) 40%,var(--line))">' +
    '<div class="row between"><div class="grow"><div class="tiny" style="color:var(--acc)">Тренеру</div>' +
    '<div style="font-size:17px;font-weight:700;margin-top:3px">Собрать отчёт</div>' +
    '<div class="small muted">тренировки, питание и вес за период</div></div>' +
    '<div style="color:var(--acc);font-size:22px">›</div></div></div>';

  /* профиль */
  html += '<div class="tiny" style="margin:22px 0 8px 2px">Настройки</div>';
  html += '<div class="card">' +
    '<div class="field"><label class="lbl">Имя</label><input class="inp" value="' + h(P.name) + '" oninput="S.profile.name=this.value;save()"></div>' +
    '<div class="field" style="margin-bottom:0"><label class="lbl">Имя тренера</label><input class="inp" value="' + h(P.trainer) + '" placeholder="для подписи в отчёте" oninput="S.profile.trainer=this.value;save()"></div>' +
    '</div>';

  html += '<div class="card tap" onclick="toggleTheme()"><div class="row between">' +
    '<div>Тема</div><div class="muted">' + (P.theme === 'light' ? 'светлая' : 'тёмная') + '</div></div></div>';

  /* данные */
  html += '<div class="tiny" style="margin:22px 0 8px 2px">Данные</div>';
  html += '<div class="card"><div class="small muted" style="margin-bottom:12px">Всё хранится на телефоне и работает без интернета. Раз в пару недель делай копию — на случай смены телефона.</div>' +
    '<div class="btn2"><button class="btn sec" onclick="exportData()">Сохранить копию</button>' +
    '<button class="btn sec" onclick="importData()">Загрузить копию</button></div></div>';

  const st = streakInfo();
  html += '<div class="card"><div class="row between"><div class="small muted">Серия дней подряд</div><b>' + st.cur + ' 🔥</b></div>' +
    '<div class="row between" style="margin-top:8px"><div class="small muted">Тренировок в истории</div><b>' + S.sessions.length + '</b></div>' +
    '<div class="row between" style="margin-top:8px"><div class="small muted">Дней с едой</div><b>' + Object.keys(S.food).length + '</b></div>' +
    '<div class="row between" style="margin-top:8px"><div class="small muted">Своих продуктов</div><b>' + S.customFoods.length + '</b></div>' +
    '<div class="row between" style="margin-top:8px"><div class="small muted">Сохранённых приёмов</div><b>' + S.mealTemplates.length + '</b></div></div>';

  html += '<div class="small" style="text-align:center;color:var(--tx3);margin:20px 0 10px">' +
    (TG.on ? 'работает в Telegram' : 'работает офлайн') + '</div>';

  $('#mr-body').innerHTML = html;
}

/* мини-график */
function spark(vals) {
  if (vals.length < 2) return '';
  const w = 300, hgt = 70, pad = 6;
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = (max - min) || 1;
  const pts = vals.map((v, i) => {
    const x = pad + i * (w - pad * 2) / (vals.length - 1);
    const y = hgt - pad - (v - min) / rng * (hgt - pad * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" style="margin-top:10px">' +
    '<polyline points="' + pts + '" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function addWeight() {
  const last = S.weights[S.weights.length - 1];
  sheet(
    '<h2>Записать вес</h2>' +
    '<div class="field"><label class="lbl">Вес, кг</label><input class="inp" id="w-kg" inputmode="decimal" value="' + (last ? last.kg : '') + '"></div>' +
    '<div class="g3">' +
      '<div class="field"><label class="lbl">Грудь</label><input class="inp inp-num" id="w-ch" inputmode="decimal" value="' + (last && last.ch ? last.ch : '') + '"></div>' +
      '<div class="field"><label class="lbl">Талия</label><input class="inp inp-num" id="w-wa" inputmode="decimal" value="' + (last && last.wa ? last.wa : '') + '"></div>' +
      '<div class="field"><label class="lbl">Бёдра</label><input class="inp inp-num" id="w-hi" inputmode="decimal" value="' + (last && last.hi ? last.hi : '') + '"></div>' +
    '</div>' +
    '<div class="field"><label class="lbl">Дата</label><input type="date" class="inp" id="w-d" value="' + today() + '"></div>' +
    '<button class="btn" id="w-ok">Сохранить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Отмена</button>',
    { onOpen: () => {
        $('#w-ok').onclick = () => {
          const kg = num($('#w-kg').value);
          if (!kg) return toast('Укажи вес');
          const date = $('#w-d').value || today();
          const rec = { date, kg, ch: num($('#w-ch').value) || null, wa: num($('#w-wa').value) || null, hi: num($('#w-hi').value) || null };
          S.weights = S.weights.filter(x => x.date !== date).concat([rec]).sort((a, b) => a.date.localeCompare(b.date));
          save(); closeSheet(); renderMore(); toast('Записано');
        };
      } }
  );
}

function editTargets() {
  const P = S.profile;
  sheet(
    '<h2>Цель по калориям</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Цифры даёт тренер. Если не давал — оставь как есть.</p>' +
    '<div class="field"><label class="lbl">Калории в день</label><input class="inp" id="t-k" inputmode="numeric" value="' + P.targetKcal + '"></div>' +
    '<div class="g3">' +
      '<div class="field"><label class="lbl">Белки, г</label><input class="inp inp-num" id="t-p" inputmode="numeric" value="' + P.targetP + '"></div>' +
      '<div class="field"><label class="lbl">Жиры, г</label><input class="inp inp-num" id="t-f" inputmode="numeric" value="' + P.targetF + '"></div>' +
      '<div class="field"><label class="lbl">Углеводы, г</label><input class="inp inp-num" id="t-c" inputmode="numeric" value="' + P.targetC + '"></div>' +
    '</div>' +
    '<div class="g2"><div class="field"><label class="lbl">Вода в день, мл</label><input class="inp" id="t-w" inputmode="numeric" value="' + (P.targetWater || 2000) + '"></div>' +
    '<div class="field"><label class="lbl">Шагов в день</label><input class="inp" id="t-s" inputmode="numeric" value="' + (P.targetSteps || 8000) + '"></div></div>' +
    '<button class="btn" id="t-ok">Сохранить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Отмена</button>',
    { onOpen: () => {
        $('#t-ok').onclick = () => {
          P.targetKcal = r0(num($('#t-k').value, 1800));
          P.targetP = r0(num($('#t-p').value, 110));
          P.targetF = r0(num($('#t-f').value, 55));
          P.targetC = r0(num($('#t-c').value, 180));
          P.targetWater = Math.max(500, r0(num($('#t-w').value, 2000)));
          P.targetSteps = Math.max(1000, r0(num($('#t-s').value, 8000)));
          save(); closeSheet(); renderMore(); renderFood(); toast('Сохранено');
        };
      } }
  );
}

function toggleTheme() {
  S.profile.theme = S.profile.theme === 'light' ? 'dark' : 'light';
  applyTheme(); save(); renderMore();
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.profile.theme === 'light' ? 'light' : 'dark');
  const c = S.profile.theme === 'light' ? '#f4f6fa' : '#0f1115';
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = c;
}

/* ---------- копия данных ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fit-backup-' + today() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Файл сохранён в «Загрузки»');
}

function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!data || typeof data !== 'object') throw 0;
        confirmSheet('Заменить все данные?', 'Текущие тренировки и питание в телефоне будут перезаписаны копией.', 'Заменить', () => {
          S = Object.assign(DEFAULTS(), data);
          save(); applyTheme(); renderAll(); toast('Данные загружены');
        });
      } catch (e) { toast('Файл не подходит'); }
    };
    rd.readAsText(f);
  };
  inp.click();
}
