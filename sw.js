/* Ritmo: funciona sin conexión. La app se sirve desde caché; el calendario se pide primero a la red. */
const V='ritmo-v8';
const SHELL=['./','index.html','engine.js','tools.js','app.js','config.js','manifest.webmanifest','icons/icon-192.png','icons/apple-touch-icon.png','data/calendars.json','data/festivos.json','widget.html','widget.webmanifest','icons/logo.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const net=()=>fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r});
  if(u.pathname.includes('/data/')||u.pathname.endsWith('.js')||u.pathname.endsWith('/')||u.pathname.endsWith('.html')){
    e.respondWith(net().catch(()=>caches.match(e.request)));return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||net()));
});
/* al tocar un aviso se abre la app */
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs.find(x=>'focus' in x);return c?c.focus():self.clients.openWindow('./')}))});
