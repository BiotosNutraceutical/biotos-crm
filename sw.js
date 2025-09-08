// Biotos CRM – Service Worker v2.5
const CACHE = 'biotos-crm-v2-5';
const ASSETS = [
  './','./index.html','./medici.html','./farmacie.html','./visite.html','./agenda.html','./followup.html','./report.html','./io.html',
  './styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      return cached || fetch(e.request).then(resp=>{
        const copy=resp.clone(); caches.open(CACHE).then(cc=>cc.put(e.request, copy)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
