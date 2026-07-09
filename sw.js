// Trips Hub service worker — stale-while-revalidate for app shell + CDN
const CACHE = "hub-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/icon.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  // cache app shell + the supabase-js CDN; never cache the live Supabase API
  const cacheable = u.origin === self.location.origin || u.hostname === "cdn.jsdelivr.net";
  if (!cacheable) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const cached = await c.match(e.request);
      const network = fetch(e.request)
        .then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
