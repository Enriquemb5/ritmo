// Descarga de TeamUp los calendarios de data/calendars.json y los guarda en data/teamup/<id>.json
// en el formato compacto que usa la app. Lo ejecuta cada día la acción "Sincronizar TeamUp".
import fs from 'node:fs';

const only = process.argv[2]; // node scripts/sync-teamup.mjs ks… → solo ese calendario
const cals = JSON.parse(fs.readFileSync('data/calendars.json', 'utf8')).filter(c => !only || c.id === only);
const now = new Date();
const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // curso de septiembre a julio
const start = `${y}-09-01`, end = `${y + 1}-07-31`;
const H = { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (Ritmo; +https://github.com)' };
const norm = t => t.replace(/\bloT\b/, 'IoT').replace(/\s*\((conferencia[^)]*|GTM)\)|\(GTM\)$/, '').trim();
const courseOf = name => { const n = String(name || ''); const d = (n.match(/\d/) || [''])[0]; return d ? d + (/\(B\)/i.test(n) ? 'B' : '') : n; };
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
let failed = 0;

for (const cal of cals) {
  const base = `https://teamup.com/${cal.id}`;
  try {
    const sc = await (await fetch(`${base}/subcalendars`, { headers: H })).json();
    const course = {};
    for (const s of sc.subcalendars || []) course[s.id] = (cal.courses && cal.courses[s.id]) || courseOf(s.name);
    const r = await fetch(`${base}/events?startDate=${start}&endDate=${end}&tz=Europe%2FMadrid`, { headers: H });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const { events } = await r.json();
    const S = [], L = [], E = [], si = {}, li = {};
    for (const e of events || []) {
      if (e.all_day || !e.title) continue;
      const c = course[e.subcalendar_id] || '?', t = norm(e.title), k = c + '|' + t;
      if (si[k] === undefined) { si[k] = S.length; S.push([t, c]); }
      const loc = e.location || '';
      if (li[loc] === undefined) { li[loc] = L.length; L.push(loc); }
      const row = [e.start_dt.slice(2, 10).replace(/-/g, ''), e.start_dt.slice(11, 16).replace(':', ''), e.end_dt.slice(11, 16).replace(':', ''), si[k], li[loc]];
      const note = strip(e.notes); if (note) row.push(note);
      E.push(row);
    }
    E.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
    if (!E.length) throw new Error('sin eventos');
    const sync = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' }).replace('.', '');
    fs.mkdirSync('data/teamup', { recursive: true });
    const file = `data/teamup/${cal.id}.json`;
    const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    const same = prev && JSON.stringify([prev.S, prev.L, prev.E]) === JSON.stringify([S, L, E]);
    fs.writeFileSync(file, JSON.stringify({ S, L, E, sync: same ? prev.sync : sync }));
    console.log(`${cal.id}: ${E.length} clases, ${S.length} asignaturas${same ? ' (sin cambios)' : ''}`);
  } catch (err) {
    failed++;
    console.error(`${cal.id}: no se ha podido sincronizar (${err.message}). Se mantiene la copia anterior.`);
  }
}
if (failed === cals.length) process.exit(1);
