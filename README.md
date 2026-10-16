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

### Añadir otro calendario de TeamUp

Añade una entrada a `data/calendars.json` con el código del enlace (`teamup.com/ks…`) y lanza la acción **Sincronizar TeamUp**.

## Sincronizar entre dispositivos (opcional)

Usa [Supabase](https://supabase.com) (plan gratuito):

1. Crea un proyecto.
2. En **SQL Editor**, ejecuta `supabase/schema.sql`.
3. En **Authentication → Email Templates → Magic Link**, añade `{{ .Token }}` al texto para que el email traiga un código de 6 cifras.
4. En **Authentication → URL Configuration**, pon como *Site URL* `https://enriquemb5.github.io/ritmo/`.
5. En **Project Settings → API**, copia la *Project URL* y la *anon public key* a `config.js`.

Luego, en la app: **Ajustes → Sincronizar entre dispositivos**, escribe tu email y el código que te llega. Haz lo mismo en el móvil y en el ordenador.
