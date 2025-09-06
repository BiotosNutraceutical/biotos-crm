// Biotos CRM – cache v1.2-full
const CACHE = 'biotos-crm-v1-2-full';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./sw.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil((async ()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch', e=>{ if(e.request.method!=='GET') return; e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(cc=>cc.put(e.request,copy)).catch(()=>{}); return r; }).catch(()=>caches.match('./index.html')))); });
