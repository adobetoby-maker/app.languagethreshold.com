// Language Threshold — Service Worker
// Cache version: bump this string on every deploy to invalidate old caches.
const CACHE = "lt-v6";

self.addEventListener("install", (event) => {
  // Activate immediately — no "waiting" state between deploys.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/")));
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass cache for server functions, API routes, Supabase, and mutations
  if (
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("anthropic") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Cache-first for content-hashed JS/CSS/fonts/images
  if (/\.(js|mjs|css|woff2?|png|svg|jpg|webp|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Network-first for HTML navigation — fall back to cached shell if offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
  }
});
