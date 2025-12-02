
self.addEventListener('install', function(evt){
  self.skipWaiting();
});
self.addEventListener('activate', function(evt){
  self.clients.claim();
});
self.addEventListener('message', function(e){
  // simple message handler
  if(e.data && e.data.type === 'notify'){
    self.registration.showNotification(e.data.title, e.data.options || {});
  }
});
