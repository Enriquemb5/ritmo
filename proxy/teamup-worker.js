/* Ritmo · proxy de TeamUp (opcional) para Cloudflare Workers (plan gratuito).
   TeamUp no deja que otras webs lean sus calendarios desde el navegador. Este worker solo
   reenvía dos rutas públicas de solo lectura y añade la cabecera que lo permite.
   1. dash.cloudflare.com → Workers → Create → pega este archivo → Deploy.
   2. Copia la dirección (https://….workers.dev) en config.js → teamupProxy. */
const ORIGINS = ['https://enriquemb5.github.io']; // webs que pueden usarlo

export default {
  async fetch(req) {
    const origin = req.headers.get('origin') || '';
    const cors = { 'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], vary: 'origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'access-control-allow-methods': 'GET' } });
    const u = new URL(req.url);
    if (req.method !== 'GET' || !/^\/ks[a-z0-9]{6,40}\/(events|subcalendars)$/i.test(u.pathname))
      return new Response('No encontrado', { status: 404, headers: cors });
    const r = await fetch('https://teamup.com' + u.pathname + u.search, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (Ritmo)' },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    return new Response(r.body, {
      status: r.status,
      headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
    });
  },
};
