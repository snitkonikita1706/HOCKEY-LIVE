/* HOCKEY LIVE v2.2.2: navigation and scoreboards are network-first.
   Offline shell is only a fallback; never replace fresh results with stale scores. */
const CACHE='hockey-live-v17';
const SHELL=['./','./index.html','./manifest.webmanifest?v=icon-3','./icon-180.png?v=icon-3','./icon-192.png?v=icon-3','./icon-512.png?v=icon-3','./assets/hockey-goal-bg.jpg?v=2.3.1'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 const navigation=req.mode==='navigate'||url.pathname.endsWith('/index.html');
 const data=/\/data\/(?:klhl|khl)\.json$/.test(url.pathname);
 if(navigation||data){
   event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{
     if(!response.ok)throw new Error('HTTP '+response.status);
     if(navigation) caches.open(CACHE).then(c=>c.put('./index.html',response.clone())).catch(()=>{});
     return response;
   }).catch(async()=>navigation?(await caches.match('./index.html'))||Response.error():Response.error()));
 }
});
