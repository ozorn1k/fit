/* ============================================================
   food.js — дневник питания и счётчик калорий
   ============================================================ */

let FD_DATE = today();
const MEALS = [
  { k: 'breakfast', t: 'Завтрак' },
  { k: 'lunch',     t: 'Обед' },
  { k: 'dinner',    t: 'Ужин' },
  { k: 'snack',     t: 'Перекусы' }
];

function dayFood(d) { return S.food[d || FD_DATE] || []; }
function daySum(d) {
  const s = { kcal: 0, p: 0, f: 0, c: 0 };
  dayFood(d).forEach(i => { s.kcal += i.kcal; s.p += i.p; s.f += i.f; s.c += i.c; });
  return s;
}

function renderFood() {
  const P = S.profile;
  const sum = daySum();
  const left = P.targetKcal - sum.kcal;
  const pct = Math.min(100, P.targetKcal ? sum.kcal / P.targetKcal * 100 : 0);
  const over = sum.kcal > P.targetKcal;

  $('#fd-sub').textContent = humanDateFull(FD_DATE);
  $('#fd-datebtn').textContent = FD_DATE === today() ? 'Сегодня' : humanDate(FD_DATE);

  let html = '';

  /* сводка */
  html += '<div class="card tap" onclick="editTargets()">' +
    '<div class="row between" style="align-items:flex-end">' +
      '<div><div class="tiny">Съедено · изменить цель</div>' +
      '<div style="font-size:34px;font-weight:700;line-height:1.1;letter-spacing:-1px">' + r0(sum.kcal) + '</div>' +
      '<div class="small muted">из ' + P.targetKcal + ' ккал</div></div>' +
      '<div style="text-align:right"><div class="tiny">' + (over ? 'Перебор' : 'Осталось') + '</div>' +
      '<div style="font-size:24px;font-weight:700;color:' + (over ? 'var(--bad)' : 'var(--ok)') + '">' + r0(Math.abs(left)) + '</div></div>' +
    '</div>' +
    '<div class="bar ' + (over ? 'over' : (pct > 80 ? 'ok' : '')) + '" style="margin-top:14px"><i style="width:' + pct + '%"></i></div>' +
    '<div class="macro">' +
      macroBox('Белки', sum.p, P.targetP, 'var(--acc4)') +
      macroBox('Жиры', sum.f, P.targetF, 'var(--acc3)') +
      macroBox('Углеводы', sum.c, P.targetC, 'var(--acc2)') +
    '</div>' +
  '</div>';

  /* вода */
  const wt = waterToday(), wtarget = S.profile.targetWater || 2000;
  const glasses = Math.max(4, Math.round(wtarget / 250));
  let cups = '';
  for (let i = 0; i < glasses; i++) cups += '<i class="' + (i * 250 < wt ? 'on' : '') + '"></i>';
  html += '<div class="card"><div class="row between">' +
    '<div><div class="tiny">Вода</div><div style="font-size:20px;font-weight:700;margin-top:2px">' +
      (wt / 1000).toFixed(1) + ' <span class="small muted" style="font-weight:500">/ ' + (wtarget / 1000).toFixed(1) + ' л</span></div></div>' +
    '<div class="row" style="gap:6px">' +
      '<button class="btn sm sec" onclick="addWater(-250)">-</button>' +
      '<button class="btn sm sec" onclick="addWater(250)">+ стакан</button>' +
    '</div></div>' +
    '<div class="water">' + cups + '</div></div>';

  /* шаги */
  const st = stepsToday(), stTarget = S.profile.targetSteps || 8000;
  const stPct = Math.min(100, st / stTarget * 100);
  html += '<div class="card tap" onclick="openSteps()">' +
    '<div class="row between" style="align-items:flex-end">' +
      '<div><div class="tiny">Шаги</div>' +
      '<div style="font-size:20px;font-weight:700;margin-top:2px">' + nfmt(st) +
        ' <span class="small muted" style="font-weight:500">/ ' + nfmt(stTarget) + '</span></div></div>' +
      '<div class="small ' + (st >= stTarget ? '' : 'muted') + '" style="' + (st >= stTarget ? 'color:var(--ok);font-weight:700' : '') + '">' +
        (st >= stTarget ? 'цель взята' : (st ? 'осталось ' + nfmt(stTarget - st) : 'вписать')) + '</div>' +
    '</div>' +
    '<div class="bar ' + (st >= stTarget ? 'ok' : '') + '" style="margin-top:12px"><i style="width:' + stPct + '%"></i></div>' +
  '</div>';

  /* приёмы пищи */
  MEALS.forEach(m => {
    const items = dayFood().filter(i => i.meal === m.k);
    const k = items.reduce((n, i) => n + i.kcal, 0);
    html += '<div class="meal-h"><div class="t">' + m.t + (k ? ' <span class="muted small" style="font-weight:500">· ' + r0(k) + ' ккал</span>' : '') + '</div>' +
      '<div class="row" style="gap:6px">' +
      (items.length ? '<button class="btn sm sec" style="padding:9px 11px" onclick="mealActions(\'' + m.k + '\')">⋯</button>' : '') +
      '<button class="btn sm sec" onclick="openAddFood(\'' + m.k + '\')">+</button></div></div>';
    if (!items.length) {
      html += '<div class="small" style="color:var(--tx3);padding:2px 4px 6px">пусто</div>';
    }
    items.forEach(i => {
      html += '<div class="fi" onclick="editFoodItem(\'' + i.id + '\')">' +
        '<div class="grow"><div style="font-weight:600;font-size:15px" class="wrap">' + h(i.name) + '</div>' +
        '<div class="small muted">' + (i.grams ? r0(i.grams) + ' г · ' : '') + 'Б ' + r1(i.p) + ' · Ж ' + r1(i.f) + ' · У ' + r1(i.c) + '</div></div>' +
        '<div class="k">' + r0(i.kcal) + '</div></div>';
    });
  });

  /* неделя */
  html += '<div class="tiny" style="margin:24px 0 8px 2px">Неделя</div><div class="card">';
  let wsum = 0, wn = 0;
  for (let i = 6; i >= 0; i--) {
    const d = shiftIso(today(), -i);
    const s = daySum(d);
    if (s.kcal > 0) { wsum += s.kcal; wn++; }
    const p = Math.min(100, P.targetKcal ? s.kcal / P.targetKcal * 100 : 0);
    html += '<div class="row" style="margin-bottom:9px" onclick="gotoDate(\'' + d + '\')">' +
      '<div class="small muted" style="width:34px;flex:none">' + DOW[fromIso(d).getDay()] + '</div>' +
      '<div class="bar grow"><i style="width:' + p + '%;background:' + (s.kcal > P.targetKcal ? 'var(--bad)' : 'var(--acc2)') + '"></i></div>' +
      '<div class="small" style="width:52px;text-align:right;flex:none;font-weight:600">' + (s.kcal ? r0(s.kcal) : '—') + '</div></div>';
  }
  html += '<hr class="sep"><div class="row between"><div class="small muted">Среднее за ' + wn + ' ' + plural(wn, 'день', 'дня', 'дней') + '</div>' +
    '<div style="font-weight:700">' + (wn ? r0(wsum / wn) : '—') + ' ккал</div></div></div>';

  $('#fd-body').innerHTML = html;
}

function macroBox(t, v, target, color) {
  return '<div><b style="color:' + color + '">' + r0(v) + '</b><span>' + t + ' / ' + target + '</span></div>';
}

function gotoDate(d) { FD_DATE = d; renderFood(); }

function openDatePick() {
  let html = '<h2>Выбери день</h2><div class="chips" style="flex-wrap:wrap;gap:8px">';
  for (let i = 0; i < 14; i++) {
    const d = shiftIso(today(), -i);
    html += '<button class="chip' + (d === FD_DATE ? ' on' : '') + '" onclick="gotoDate(\'' + d + '\');closeSheet()">' + humanDate(d) + '</button>';
  }
  html += '</div><div class="field" style="margin-top:16px"><label class="lbl">Другая дата</label>' +
    '<input type="date" class="inp" value="' + FD_DATE + '" onchange="gotoDate(this.value);closeSheet()"></div>' +
    '<button class="btn sec" onclick="closeSheet()">Закрыть</button>';
  sheet(html);
}

/* ---------- добавление еды ---------- */
function openAddFood(meal) {
  sheet(
    '<h2>Что съела?</h2>' +
    '<input class="inp" id="fs-q" placeholder="Начни печатать: гречка, творог…" autocomplete="off">' +
    '<div class="sugbox" id="fs-list"></div>' +
    '<button class="btn sec" style="margin-top:12px" onclick="openScanner(\'' + meal + '\')">Сканировать штрихкод</button>' +
    '<div class="btn2" style="margin-top:8px">' +
      '<button class="btn sec" onclick="copyMealFrom(\'' + meal + '\')">Как в прошлый раз</button>' +
      '<button class="btn sec" onclick="openTemplates(\'' + meal + '\')">Мои приёмы</button>' +
    '</div>' +
    '<div class="btn2" style="margin-top:8px">' +
      '<button class="btn sec" onclick="quickKcal(\'' + meal + '\')">Просто ккал</button>' +
      '<button class="btn sec" onclick="newCustomFood(\'' + meal + '\')">Своё блюдо</button>' +
    '</div>',
    { onOpen: () => {
        const q = $('#fs-q');
        let found = [];
        const draw = () => {
          found = searchFood(q.value);
          // имена вставляем только текстом: в onclick они ломались бы на кавычках
          $('#fs-list').innerHTML = found.length
            ? found.map((f, k) =>
                '<div class="sug" data-i="' + k + '">' +
                '<div class="grow"><div style="font-weight:600;font-size:14.5px" class="wrap">' + h(f.name) + '</div>' +
                '<div class="small muted">' + f.kcal + ' ккал · Б' + f.p + ' Ж' + f.f + ' У' + f.c + ' / 100 г</div></div>' +
                '<div style="color:var(--acc);font-size:20px;flex:none">+</div></div>').join('')
            : '<div class="sug muted small">Ничего не нашлось. Добавь как «своё блюдо».</div>';
        };
        $('#fs-list').onclick = ev => {
          const row = ev.target.closest('[data-i]');
          if (row) pickFood(found[+row.dataset.i], meal);
        };
        q.oninput = draw;
        draw();
        focusLater(q);
      } }
  );
}

/* принимает объект продукта или его название */
function pickFood(food, meal) {
  const f = typeof food === 'string' ? allFoods().find(x => x.name === food) : food;
  if (!f) return;
  const g = f.portG || 100;
  sheet2(
    '<h2 class="wrap">' + h(f.name) + '</h2>' +
    '<div class="small muted" style="margin:-8px 0 14px">' + f.kcal + ' ккал на 100 г</div>' +
    '<div class="field"><label class="lbl">Сколько граммов</label>' +
    '<input class="inp" id="pf-g" inputmode="decimal" value="' + g + '"></div>' +
    '<div class="chips" id="pf-chips">' +
      (f.portG ? '<button class="chip" data-g="' + f.portG + '">' + f.portName + ' (' + f.portG + ' г)</button>' : '') +
      '<button class="chip" data-g="50">50 г</button>' +
      '<button class="chip" data-g="100">100 г</button>' +
      '<button class="chip" data-g="150">150 г</button>' +
      '<button class="chip" data-g="200">200 г</button>' +
      '<button class="chip" data-g="300">300 г</button>' +
    '</div>' +
    '<div class="card" id="pf-calc" style="margin-top:6px"></div>' +
    '<button class="btn" id="pf-ok">Добавить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        const gi = $('#pf-g');
        const calc = () => {
          const grams = num(gi.value);
          const k = f.kcal * grams / 100;
          $('#pf-calc').innerHTML = '<div class="row between"><div><div class="tiny">Итого</div>' +
            '<div style="font-size:26px;font-weight:700">' + r0(k) + ' <span class="small muted" style="font-weight:500">ккал</span></div></div>' +
            '<div class="small muted" style="text-align:right">Б ' + r1(f.p * grams / 100) + '<br>Ж ' + r1(f.f * grams / 100) + '<br>У ' + r1(f.c * grams / 100) + '</div></div>';
        };
        gi.oninput = calc; calc();
        $$('#pf-chips .chip').forEach(b => b.onclick = () => { gi.value = b.dataset.g; calc(); });
        $('#pf-ok').onclick = () => {
          const grams = num(gi.value);
          if (!grams) return toast('Укажи граммы');
          addFoodItem({
            name: f.name, meal, grams,
            kcal: f.kcal * grams / 100, p: f.p * grams / 100, f: f.f * grams / 100, c: f.c * grams / 100
          });
          rememberFood(f.name);
          closeSheet2(); closeSheet();
        };
      } }
  );
}

function quickKcal(meal) {
  sheet2(
    '<h2>Просто калории</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Когда точный состав не важен — например, кафе или гости.</p>' +
    '<div class="field"><label class="lbl">Название</label><input class="inp" id="qk-n" placeholder="Обед в кафе"></div>' +
    '<div class="field"><label class="lbl">Калории</label><input class="inp" id="qk-k" inputmode="numeric" placeholder="600"></div>' +
    '<button class="btn" id="qk-ok">Добавить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        $('#qk-ok').onclick = () => {
          const k = num($('#qk-k').value);
          if (!k) return toast('Укажи калории');
          addFoodItem({ name: $('#qk-n').value.trim() || 'Приём пищи', meal, grams: 0, kcal: k, p: 0, f: 0, c: 0 });
          closeSheet2(); closeSheet();
        };
        focusLater('#qk-n');
      } }
  );
}

function newCustomFood(meal) {
  sheet2(
    '<h2>Своё блюдо</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Сохранится в твой список — потом добавляется в один тап.</p>' +
    '<div class="field"><label class="lbl">Название</label><input class="inp" id="cf-n" placeholder="Мамины сырники"></div>' +
    '<div class="g2"><div class="field"><label class="lbl">Ккал на 100 г</label><input class="inp" id="cf-k" inputmode="numeric"></div>' +
    '<div class="field"><label class="lbl">Белки</label><input class="inp" id="cf-p" inputmode="decimal"></div></div>' +
    '<div class="g2"><div class="field"><label class="lbl">Жиры</label><input class="inp" id="cf-f" inputmode="decimal"></div>' +
    '<div class="field"><label class="lbl">Углеводы</label><input class="inp" id="cf-c" inputmode="decimal"></div></div>' +
    '<button class="btn" id="cf-ok">Сохранить и добавить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        $('#cf-ok').onclick = () => {
          const name = $('#cf-n').value.trim();
          const kcal = num($('#cf-k').value);
          if (!name || !kcal) return toast('Нужны название и калории');
          const item = { name, kcal, p: num($('#cf-p').value), f: num($('#cf-f').value), c: num($('#cf-c').value), custom: true };
          S.customFoods.unshift(item);
          save();
          closeSheet2();
          pickFood(name, meal);
        };
        focusLater('#cf-n');
      } }
  );
}

function addFoodItem(o) {
  o.id = uid();
  if (!S.food[FD_DATE]) S.food[FD_DATE] = [];
  S.food[FD_DATE].push(o);
  save(); renderFood(); buzz();
  toast('+' + r0(o.kcal) + ' ккал');
}

function editFoodItem(id) {
  const list = S.food[FD_DATE] || [];
  const it = list.find(x => x.id === id);
  if (!it) return;

  sheet2(
    '<h2 class="wrap">' + h(it.name) + '</h2>' +
    (it.grams
      ? '<div class="field"><label class="lbl">Граммы (остальное пересчитается само)</label>' +
        '<input class="inp" id="ef-g" inputmode="decimal" value="' + h(it.grams) + '"></div>'
      : '') +
    '<div class="field"><label class="lbl">Калории</label>' +
    '<input class="inp" id="ef-k" inputmode="decimal" value="' + r0(it.kcal) + '"></div>' +
    '<div class="g3">' +
      '<div class="field"><label class="lbl">Белки</label><input class="inp inp-num" id="ef-p" inputmode="decimal" value="' + r1(it.p) + '"></div>' +
      '<div class="field"><label class="lbl">Жиры</label><input class="inp inp-num" id="ef-f" inputmode="decimal" value="' + r1(it.f) + '"></div>' +
      '<div class="field"><label class="lbl">Углеводы</label><input class="inp inp-num" id="ef-c" inputmode="decimal" value="' + r1(it.c) + '"></div>' +
    '</div>' +
    '<label class="lbl">Приём пищи</label>' +
    '<div class="chips" id="ef-meals">' +
      MEALS.map(m => '<button class="chip' + (m.k === it.meal ? ' on' : '') + '" data-m="' + m.k + '">' + m.t + '</button>').join('') +
    '</div>' +
    '<button class="btn" id="ef-ok">Сохранить</button>' +
    '<button class="btn dan" style="margin-top:8px" onclick="delFoodItem(' + jsArg(id) + ')">Удалить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        let meal = it.meal;
        const gi = $('#ef-g'), ki = $('#ef-k'), pi = $('#ef-p'), fi = $('#ef-f'), ci = $('#ef-c');

        // при смене граммов тянем за собой калории и БЖУ в той же пропорции
        if (gi) {
          const base = { g: num(it.grams) || 100, kcal: it.kcal, p: it.p, f: it.f, c: it.c };
          gi.oninput = () => {
            const g = num(gi.value);
            if (!g) return;
            const k = g / base.g;
            ki.value = r0(base.kcal * k);
            pi.value = r1(base.p * k);
            fi.value = r1(base.f * k);
            ci.value = r1(base.c * k);
          };
        }

        $$('#ef-meals .chip').forEach(b => b.onclick = () => {
          $$('#ef-meals .chip').forEach(x => x.classList.remove('on'));
          b.classList.add('on'); meal = b.dataset.m;
        });

        $('#ef-ok').onclick = () => {
          const k = num(ki.value);
          if (!k && k !== 0) return toast('Укажи калории');
          if (gi) it.grams = num(gi.value);
          it.kcal = k;
          it.p = num(pi.value);
          it.f = num(fi.value);
          it.c = num(ci.value);
          it.meal = meal;
          save(); renderFood(); closeSheet2(); toast('Сохранено');
        };
      } }
  );
}


function moveMeal(id, meal) {
  const i = (S.food[FD_DATE] || []).find(x => x.id === id);
  if (i) { i.meal = meal; save(); renderFood(); closeSheet2(); }
}
function delFoodItem(id) {
  S.food[FD_DATE] = (S.food[FD_DATE] || []).filter(x => x.id !== id);
  if (!S.food[FD_DATE].length) delete S.food[FD_DATE];
  save(); renderFood(); closeSheet2(); toast('Удалено');
}
