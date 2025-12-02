
const CACHE_NAME = 'juros-pro-v1';
const FILES = ['index.html','style.css','app.js','manifest.json','icon.png'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(resp=>resp||fetch(e.request)));
});
