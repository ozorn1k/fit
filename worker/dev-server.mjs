/* Локальный запуск Worker-а для проверки без Cloudflare.
   Тот же самый обработчик, только KV — обычная Map в памяти.
   Запуск:  node dev-server.mjs [порт] */

import { createServer } from 'node:http';
import mod from './src/index.js';

const PORT = Number(process.argv[2] || 8790);
const store = new Map();
const env = {
  REPORTS: {
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, v); }
  }
};

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request('http://127.0.0.1:' + PORT + req.url, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
  });

  const out = await mod.fetch(request, env);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
}).listen(PORT, '127.0.0.1', () => {
  console.log('worker на http://127.0.0.1:' + PORT);
});
