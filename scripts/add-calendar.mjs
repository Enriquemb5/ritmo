// Añade a data/calendars.json el calendario de TeamUp pedido en una issue (plantilla «calendario»).
// Lee el texto de la issue de la variable ISSUE_BODY y escribe el resultado en GITHUB_OUTPUT.
import fs from 'node:fs';

const body = process.env.ISSUE_BODY || '';
const out = (k, v) => process.env.GITHUB_OUTPUT && fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
const field = name => {
  const m = body.match(new RegExp(`###\\s*${name}\\s*\\n+([^\\n]+)`, 'i'));
  const v = m ? m[1].trim() : '';
  return v === '_No response_' ? '' : v.replace(/[<>`"\\]/g, '').replace(/\s+/g, ' ').slice(0, 80);
};
const m = body.match(/teamup\.com\/(ks[a-z0-9]{6,40})/i);
if (!m) { out('status', 'invalid'); console.log('No hay enlace de TeamUp'); process.exit(0); }
const id = m[1].toLowerCase();
out('id', id);
const cals = JSON.parse(fs.readFileSync('data/calendars.json', 'utf8'));
if (cals.some(c => c.id === id)) { out('status', 'exists'); console.log('Ya estaba'); process.exit(0); }
const grado = field('Grado') || 'Calendario de TeamUp', uni = field('Universidad');
cals.push({ id, name: uni ? `${grado} · ${uni}` : grado, short: (grado.replace(/^Grado en /i, '') + (uni ? ` · ${uni}` : '')).slice(0, 40) });
fs.writeFileSync('data/calendars.json', JSON.stringify(cals, null, 2) + '\n');
out('status', 'added');
console.log(`Añadido ${id}`);
