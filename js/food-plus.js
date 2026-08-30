/* ============================================================
   food-plus.js — быстрый ввод: повтор дня, свои приёмы,
   штрихкоды через Open Food Facts, вода
   ============================================================ */

/* ---------- повторить приём из другого дня ---------- */
function copyMealFrom(meal) {
  const title = (MEALS.find(m => m.k === meal) || {}).t || 'приём';
  const days = [];
  for (let i = 1; i <= 14; i++) {
    const d = shiftIso(FD_DATE, -i);
    const items = (S.food[d] || []).filter(x => x.meal === meal);
    if (items.length) days.push({ d, items, kcal: items.reduce((n, x) => n + x.kcal, 0) });
    if (days.length >= 7) break;
  }
  if (!days.length) return toast('Раньше этот приём не заполнялся');

  window.__copySrc = days;
  sheet2(
    '<h2>Повторить ' + h(title.toLowerCase()) + '</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Добавит те же продукты в этот же приём выбранного дня.</p>' +
    days.map((x, i) =>
      '<div class="card tap" onclick="applyCopy(' + i + ')">' +
      '<div class="row between"><div class="grow">' +
      '<div style="font-weight:650">' + humanDate(x.d) + '</div>' +
      '<div class="small muted wrap" style="margin-top:3px">' + h(x.items.map(t => t.name).join(', ')) + '</div></div>' +
      '<b style="flex:none">' + r0(x.kcal) + '</b></div></div>').join('') +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>'
  );
}

function applyCopy(i) {
  const src = (window.__copySrc || [])[i];
  if (!src) return;
  if (!S.food[FD_DATE]) S.food[FD_DATE] = [];
  src.items.forEach(x => {
    S.food[FD_DATE].push({ id: uid(), name: x.name, meal: x.meal, grams: x.grams, kcal: x.kcal, p: x.p, f: x.f, c: x.c });
  });
  save(); renderFood(); closeSheet2(); closeSheet(); buzz();
  toast('Добавлено ' + src.items.length + ' ' + plural(src.items.length, 'продукт', 'продукта', 'продуктов'));
}

/* ---------- свои приёмы (шаблоны) ---------- */
function saveMealTemplate(meal) {
  const items = dayFood().filter(x => x.meal === meal);
  if (!items.length) return toast('В этом приёме пока пусто');
  sheet2(
    '<h2>Сохранить как свой приём</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">' + h(items.map(x => x.name).join(', ')) + '</p>' +
    '<div class="field"><label class="lbl">Название</label><input class="inp" id="mt-n" placeholder="Мой обычный завтрак"></div>' +
    '<button class="btn" id="mt-ok">Сохранить</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        $('#mt-ok').onclick = () => {
          const name = $('#mt-n').value.trim();
          if (!name) return toast('Придумай название');
          S.mealTemplates.unshift({
            id: uid(), name,
            items: items.map(x => ({ name: x.name, grams: x.grams, kcal: x.kcal, p: x.p, f: x.f, c: x.c }))
          });
          save(); closeSheet2(); renderFood(); toast('Сохранено — теперь добавляется в один тап');
        };
        focusLater('#mt-n');
      } }
  );
}

function openTemplates(meal) {
  if (!S.mealTemplates.length) return toast('Пока нет сохранённых приёмов');
  sheet2(
    '<h2>Мои приёмы</h2>' +
    S.mealTemplates.map(t => {
      const k = t.items.reduce((n, x) => n + x.kcal, 0);
      return '<div class="card"><div class="row between">' +
        '<div class="grow tap" onclick="applyTemplate(' + jsArg(t.id) + ',' + jsArg(meal) + ')">' +
        '<div style="font-weight:650">' + h(t.name) + '</div>' +
        '<div class="small muted wrap" style="margin-top:3px">' + h(t.items.map(x => x.name).join(', ')) + ' · ' + r0(k) + ' ккал</div></div>' +
        '<button class="btn sm dan" style="flex:none;padding:8px 11px" onclick="delTemplate(' + jsArg(t.id) + ')">✕</button>' +
        '</div></div>';
    }).join('') +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Закрыть</button>'
  );
}

function applyTemplate(id, meal) {
  const t = S.mealTemplates.find(x => x.id === id);
  if (!t) return;
  if (!S.food[FD_DATE]) S.food[FD_DATE] = [];
  t.items.forEach(x => S.food[FD_DATE].push({ id: uid(), name: x.name, meal, grams: x.grams, kcal: x.kcal, p: x.p, f: x.f, c: x.c }));
  save(); renderFood(); closeSheet2(); closeSheet(); buzz();
  toast('+' + r0(t.items.reduce((n, x) => n + x.kcal, 0)) + ' ккал');
}

function delTemplate(id) {
  confirmSheet('Удалить приём?', '', 'Удалить', () => {
    S.mealTemplates = S.mealTemplates.filter(x => x.id !== id);
    save(); closeSheet2(); toast('Удалено');
  });
}

/* меню приёма пищи (три точки) */
function mealActions(meal) {
  const title = (MEALS.find(m => m.k === meal) || {}).t || '';
  sheet2(
    '<h2>' + h(title) + '</h2>' +
    '<button class="btn sec" onclick="closeSheet2();copyMealFrom(' + jsArg(meal) + ')">Повторить из другого дня</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2();saveMealTemplate(' + jsArg(meal) + ')">Сохранить как свой приём</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2();openTemplates(' + jsArg(meal) + ')">Мои приёмы</button>' +
    '<button class="btn dan" style="margin-top:8px" onclick="clearMeal(' + jsArg(meal) + ')">Очистить приём</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Закрыть</button>'
  );
}

function clearMeal(meal) {
  confirmSheet('Очистить приём?', 'Все продукты из него за этот день будут удалены.', 'Очистить', () => {
    S.food[FD_DATE] = (S.food[FD_DATE] || []).filter(x => x.meal !== meal);
    if (!S.food[FD_DATE].length) delete S.food[FD_DATE];
    save(); renderFood(); closeSheet2(); toast('Очищено');
  });
}

/* ---------- вода ---------- */
function waterToday() { return S.water[FD_DATE] || 0; }
function addWater(ml) {
  const v = Math.max(0, waterToday() + ml);
  if (v) S.water[FD_DATE] = v; else delete S.water[FD_DATE];
  save(); renderFood(); buzz();
}

/* ---------- штрихкоды ---------- */
let scanStream = null, scanLoop = null;

function openScanner(meal) {
  const canScan = 'BarcodeDetector' in window;
  sheet2(
    '<h2>Штрихкод</h2>' +
    (canScan
      ? '<div id="scan-box"><video id="scan-v" playsinline muted></video><div class="frame"></div></div>' +
        '<div class="small muted" style="text-align:center;margin-bottom:12px" id="scan-st">Наведи камеру на штрихкод</div>'
      : '<p class="muted small" style="margin:-8px 0 14px">Этот браузер не читает штрихкод камерой. Введи цифры под полосками вручную.</p>') +
    '<div class="field"><label class="lbl">Или ввести код руками</label>' +
    '<input class="inp" id="scan-i" inputmode="numeric" placeholder="4820000000000"></div>' +
    '<button class="btn" id="scan-go">Найти</button>' +
    '<button class="btn sec" style="margin-top:8px" onclick="stopScan();closeSheet2()">Закрыть</button>',
    { onOpen: () => {
        $('#scan-go').onclick = () => lookupBarcode($('#scan-i').value.trim(), meal);
        if (canScan) startScan(meal);
      } }
  );
}

async function startScan(meal) {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    const v = $('#scan-v');
    if (!v) return stopScan();
    v.srcObject = scanStream;
    await v.play();
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    scanLoop = setInterval(async () => {
      try {
        const codes = await det.detect(v);
        if (codes && codes.length) {
          const code = codes[0].rawValue;
          buzz('heavy');
          stopScan();
          lookupBarcode(code, meal);
        }
      } catch (e) { /* кадр не распознался — ждём следующий */ }
    }, 400);
  } catch (e) {
    const st = $('#scan-st');
    if (st) st.textContent = 'Камера недоступна — введи код руками';
  }
}

function stopScan() {
  clearInterval(scanLoop); scanLoop = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
}

/* Ищем сначала в своём кэше (работает офлайн), потом в Open Food Facts */
async function lookupBarcode(code, meal) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 8) return toast('Код слишком короткий');

  const cached = S.scanned[code];
  if (cached) { stopScan(); closeSheet2(); closeSheet(); return pickFood(cached, meal); }

  const st = $('#scan-st');
  if (st) st.textContent = 'Ищу в базе…';
  toast('Ищу продукт…');

  try {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code +
      '.json?fields=product_name,product_name_uk,product_name_ru,brands,serving_quantity,nutriments');
    const d = await r.json();
    if (!d || d.status !== 1 || !d.product) throw new Error('not found');

    const p = d.product, n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'];
    if (kcal == null) throw new Error('no kcal');

    const base = (p.product_name_uk || p.product_name_ru || p.product_name || 'Продукт').trim();
    const brand = p.brands ? p.brands.split(',')[0].trim() : '';
    // бренд добавляем, только если его ещё нет в названии — иначе выходит «Nutella · Nutella»
    const nm = (brand && !base.toLowerCase().includes(brand.toLowerCase())) ? base + ' · ' + brand : base;

    const item = {
      name: nm.slice(0, 60),
      kcal: r1(kcal),
      p: r1(n.proteins_100g || 0),
      f: r1(n.fat_100g || 0),
      c: r1(n.carbohydrates_100g || 0),
      code, custom: true
    };
    if (p.serving_quantity) { item.portName = 'порция'; item.portG = Math.round(+p.serving_quantity); }

    S.scanned[code] = item;
    if (!S.customFoods.some(x => x.code === code)) S.customFoods.unshift(item);
    save();
    stopScan(); closeSheet2(); closeSheet();
    pickFood(item, meal);
  } catch (e) {
    stopScan();
    confirmSheet('Продукта нет в базе',
      'Код ' + code + ' не нашёлся в Open Food Facts (или там нет калорийности). Можно добавить вручную — дальше он останется в твоём списке.',
      'Добавить вручную', () => { closeSheet2(); newCustomFood(meal); });
  }
}

/* ---------- шаги ----------
   Samsung Health не отдаёт данные наружу: публичного веб-API у него нет,
   а Health Connect доступен только нативным приложениям. Поэтому вручную. */
function stepsToday() { return S.steps[FD_DATE] || 0; }

function setSteps(n) {
  n = Math.max(0, r0(num(n)));
  if (n) S.steps[FD_DATE] = n; else delete S.steps[FD_DATE];
  save(); renderFood(); buzz();
}

function openSteps() {
  const cur = stepsToday();
  sheet2(
    '<h2>Шаги за ' + h(humanDate(FD_DATE)) + '</h2>' +
    '<p class="muted small" style="margin:-8px 0 14px">Посмотри цифру в Samsung Health и впиши сюда — автоматически она не подтягивается.</p>' +
    '<div class="field"><label class="lbl">Сколько шагов</label>' +
    '<input class="inp" id="st-n" inputmode="numeric" value="' + (cur || '') + '" placeholder="8000"></div>' +
    '<div class="chips" id="st-add">' +
      [500, 1000, 2000, 5000].map(n => '<button class="chip" data-n="' + n + '">+' + n + '</button>').join('') +
    '</div>' +
    '<button class="btn" id="st-ok">Сохранить</button>' +
    (cur ? '<button class="btn dan" style="margin-top:8px" id="st-del">Стереть</button>' : '') +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet2()">Отмена</button>',
    { onOpen: () => {
        const inp = $('#st-n');
        $$('#st-add .chip').forEach(b => b.onclick = () => {
          inp.value = r0(num(inp.value) + +b.dataset.n);
        });
        $('#st-ok').onclick = () => { setSteps(inp.value); closeSheet2(); };
        if (cur) $('#st-del').onclick = () => { setSteps(0); closeSheet2(); };
        focusLater('#st-n');
      } }
  );
}
