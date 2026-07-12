// Trips Hub service worker — network-first for the page (always fresh), cache-first for assets
const CACHE = "hub-v3";
const SHELL = ["/", "/index.html", "/lib/points.js", "/manifest.json", "/icon.png", "/icon-192.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const cacheable = u.origin === self.location.origin || u.hostname === "cdn.jsdelivr.net";
  if (!cacheable) return;

  // Page loads: network-first so updates appear immediately; cache only as offline fallback
  if (e.request.mode === "navigate" || u.pathname === "/" || u.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => { caches.open(CACHE).then((c) => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Assets: stale-while-revalidate
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
