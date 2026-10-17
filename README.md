# Ritmo

Tu semana en orden. Ritmo monta tu rutina a partir de tus clases de TeamUp, tu trabajo, tu deporte y tus ratos libres, y la reorganiza sola cuando una clase cambia.

**App:** https://enriquemb5.github.io/ritmo/

## Instalarla en el iPhone

1. Abre el enlace en **Safari**.
2. Toca **Compartir** → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, con su icono, y funciona sin conexión.

## Cómo funciona

- `index.html`, `engine.js`, `app.js`: la app. `engine.js` genera cada día a partir de tus respuestas al cuestionario y de las clases reales.
- `data/calendars.json`: calendarios de TeamUp que conoce la app.
- `data/teamup/<id>.json`: las clases de cada calendario. La acción **Sincronizar TeamUp** (`.github/workflows/sync-teamup.yml`) las descarga cada mañana y guarda los cambios. También se puede lanzar a mano desde la pestaña **Actions**.
- Tu rutina y tus notas se guardan en tu dispositivo. Nada personal se sube al repositorio.

### Añadir otro calendario de TeamUp (otros grados)

TeamUp no deja que otras webs lean sus calendarios desde el navegador, así que cada calendario se descarga aquí, en el repositorio:

- **Automático:** en la app, al pegar un enlace que Ritmo no conoce, sale **Pedir que se añada**. Abre una *issue* con la plantilla «Añadir un calendario de TeamUp» y la acción **Añadir calendario** lo añade a `data/calendars.json`, descarga sus clases y cierra la issue en un par de minutos. Hace falta una cuenta de GitHub.
- **A mano:** añade una entrada a `data/calendars.json` y lanza la acción **Sincronizar TeamUp**.
- **Al momento, sin pasar por el repositorio (opcional):** publica `proxy/teamup-worker.js` en Cloudflare Workers (gratis) y pon su dirección en `config.js` → `teamupProxy`. Así cualquier enlace funciona en cuanto se pega.

## Festivos

`data/festivos.json` tiene los festivos nacionales y de cada comunidad de 2026 y 2027 (BOE-A-2025-21667 y BOE-A-2026-21254) y los locales de los municipios que se van añadiendo (`"local": {"AN|Málaga": {...}}`). En el cuestionario cada persona dice dónde vive y dónde estudia o trabaja, y si los festivos le libran del trabajo. Los festivos locales que falten se marcan en **Agenda → Festivo**.

## Avisos

Cada cosa de la agenda puede llevar aviso (los exámenes y entregas, un día antes por defecto) y cada reunión fija también. Ritmo los muestra mientras está abierta o en segundo plano, y **Ajustes → Añadir avisos a mi calendario** los exporta a un `.ics` con alarmas para que el calendario del móvil avise aunque Ritmo esté cerrada.

## Horarios en PDF y oposiciones

- **PDF:** en «Mi propio horario» se puede subir el PDF del horario (tabla con días arriba y horas a la izquierda, o lista «Lunes 9:00–11:00 Asignatura»). Se lee en el propio móvil con pdf.js y luego se revisa.
- **Oposiciones:** el perfil «Oposiciones» reparte el temario por semanas, el estudio en bloques con descansos, un día de repaso, simulacros y las clases de academia.

## Sincronizar entre dispositivos (opcional)

Usa [Supabase](https://supabase.com) (plan gratuito):

1. Crea un proyecto.
2. En **SQL Editor**, ejecuta `supabase/schema.sql`.
3. En **Authentication → Email Templates → Magic Link**, añade `{{ .Token }}` al texto para que el email traiga un código de 6 cifras.
4. En **Authentication → URL Configuration**, pon como *Site URL* `https://enriquemb5.github.io/ritmo/`.
5. En **Project Settings → API**, copia la *Project URL* y la *anon public key* a `config.js`.

Luego, en la app: **Ajustes → Sincronizar entre dispositivos**, escribe tu email y el código que te llega. Haz lo mismo en el móvil y en el ordenador.
