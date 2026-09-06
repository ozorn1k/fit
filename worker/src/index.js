/* Короткие ссылки на отчёт.

   Приложение остаётся офлайновым: Worker нужен только в момент «поделиться».
   Он принимает уже упакованный payload (тот самый хвост после #),
   кладёт его в KV под коротким кодом и потом отдаёт редирект обратно
   на report.html с этим payload в hash.

   Отчёт не расшифровывается и не разбирается — для Worker это просто строка. */

const REPORT_URL = 'https://ozorn1k.github.io/fit/report.html';
const TTL = 60 * 60 * 24 * 365;                       // год, дальше запись сама исчезает
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';  // без похожих 0/O/1/l/I
const MAX_PAYLOAD = 8000;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function makeId(len) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    /* сохранить отчёт и вернуть код */
    if (request.method === 'POST' && url.pathname === '/s') {
      const payload = (await request.text()).trim();

      if (!payload || payload.length > MAX_PAYLOAD) {
        return new Response(JSON.stringify({ error: 'bad payload' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      // короткий код; при маловероятном совпадении берём длиннее
      let id = null;
      for (const len of [5, 5, 6, 7, 9]) {
        const candidate = makeId(len);
        if (!(await env.REPORTS.get(candidate))) { id = candidate; break; }
      }
      if (!id) {
        return new Response(JSON.stringify({ error: 'no free id' }), {
          status: 503, headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      await env.REPORTS.put(id, payload, { expirationTtl: TTL });

      return new Response(JSON.stringify({ id, url: url.origin + '/' + id }), {
        headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }

    /* открыть отчёт по коду */
    if (request.method === 'GET') {
      const id = url.pathname.slice(1);

      if (!id) {
        return new Response('Короткие ссылки на отчёты о тренировках.', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      if (!/^[0-9A-Za-z]{4,12}$/.test(id)) {
        return new Response('Not found', { status: 404 });
      }

      const payload = await env.REPORTS.get(id);
      if (!payload) {
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<style>body{font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;display:grid;place-items:center;' +
          'min-height:100vh;background:#f6f5f7;color:#191720;padding:24px;text-align:center}' +
          'div{max-width:420px}b{display:block;font-size:20px;margin-bottom:8px}p{color:#6d6a7a}</style>' +
          '<div><b>Отчёт не найден</b><p>Ссылка устарела или скопирована не полностью. ' +
          'Попроси прислать её заново — отдельным сообщением.</p></div>',
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      return Response.redirect(REPORT_URL + '#' + payload, 302);
    }

    return new Response('Method not allowed', { status: 405 });
  }
};
