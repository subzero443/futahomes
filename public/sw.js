/* Safe minimal app-shell PWA. Never caches API, private media, or auth responses. */
const CACHE='futa-homes-shell-v1';
self.addEventListener('install', event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/', '/app-icon.svg', '/manifest.webmanifest'])));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const req=event.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api')||url.pathname.startsWith('/media'))return;
  if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/')));return;}
  if(url.pathname.startsWith('/assets/')||url.pathname==='/app-icon.svg'){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone))}return res})))
  }
});
