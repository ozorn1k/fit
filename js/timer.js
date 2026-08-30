/* ============================================================
   timer.js — секундомер и таймер обратного отсчёта
   Работают отдельно от таймера отдыха в тренировке.
   ============================================================ */

const TMR = { mode: 'up', ms: 0, target: 0, running: false, iv: null, last: 0 };

function openTimer() {
  sheet('<div id="tmr-wrap"></div>', { onOpen: drawTimer });
}

function fmtMs(ms) {
  const neg = ms < 0;
  ms = Math.abs(ms);
  const m = Math.floor(ms / 60000);
  const s = Math.floor(ms / 1000) % 60;
  const d = Math.floor(ms / 100) % 10;
  return (neg ? '-' : '') + m + ':' + String(s).padStart(2, '0') + '.' + d;
}

function drawTimer() {
  const w = $('#tmr-wrap');
  if (!w) return;
  w.innerHTML =
    '<h2>Таймер</h2>' +
    '<div class="chips" style="margin-bottom:6px">' +
      '<button class="chip' + (TMR.mode === 'up' ? ' on' : '') + '" onclick="tmrMode(\'up\')">Секундомер</button>' +
      '<button class="chip' + (TMR.mode === 'down' ? ' on' : '') + '" onclick="tmrMode(\'down\')">Обратный отсчёт</button>' +
    '</div>' +

    '<div class="card" style="text-align:center;padding:26px 16px">' +
      '<div id="tmr-d" style="font-size:56px;font-weight:700;letter-spacing:-2px;font-variant-numeric:tabular-nums;line-height:1">' +
        fmtMs(TMR.mode === 'down' ? Math.max(0, TMR.target - TMR.ms) : TMR.ms) +
      '</div>' +
    '</div>' +

    (TMR.mode === 'down'
      ? '<div class="chips" id="tmr-pre">' +
          [['30 сек', 30], ['45 сек', 45], ['1 мин', 60], ['90 сек', 90], ['2 мин', 120], ['3 мин', 180], ['5 мин', 300]]
            .map(([l, s]) => '<button class="chip' + (TMR.target === s * 1000 ? ' on' : '') + '" onclick="tmrSet(' + s + ')">' + l + '</button>').join('') +
        '</div>'
      : '') +

    '<div class="btn2" style="margin-top:8px">' +
      '<button class="btn" onclick="tmrToggle()">' + (TMR.running ? 'Пауза' : 'Старт') + '</button>' +
      '<button class="btn sec" onclick="tmrReset()">Сброс</button>' +
    '</div>' +
    '<button class="btn sec" style="margin-top:8px" onclick="closeSheet()">Закрыть</button>';
}

function tmrMode(m) {
  tmrStop();
  TMR.mode = m; TMR.ms = 0;
  if (m === 'down' && !TMR.target) TMR.target = 60000;
  drawTimer();
}

function tmrSet(sec) {
  tmrStop();
  TMR.target = sec * 1000; TMR.ms = 0;
  drawTimer();
}

function tmrToggle() {
  if (TMR.running) { tmrStop(); drawTimer(); return; }
  if (TMR.mode === 'down' && !TMR.target) return toast('Выбери время');
  TMR.running = true;
  TMR.last = Date.now();
  buzz();
  TMR.iv = setInterval(tmrTick, 100);
  drawTimer();
}

function tmrTick() {
  const el = $('#tmr-d');
  if (!el) return tmrStop();               // шторку закрыли — сами останавливаемся

  const now = Date.now();
  TMR.ms += now - TMR.last;
  TMR.last = now;

  if (TMR.mode === 'down') {
    const left = TMR.target - TMR.ms;
    el.textContent = fmtMs(Math.max(0, left));
    if (left <= 0) {
      tmrStop();
      beep(); buzz('heavy');
      toast('Время вышло');
      drawTimer();
    }
  } else {
    el.textContent = fmtMs(TMR.ms);
  }
}

function tmrStop() {
  clearInterval(TMR.iv); TMR.iv = null; TMR.running = false;
}

function tmrReset() {
  tmrStop();
  TMR.ms = 0;
  drawTimer();
}
