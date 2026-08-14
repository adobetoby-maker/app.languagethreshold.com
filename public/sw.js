// Language Threshold — Service Worker
// Cache version: bump this string on every deploy to invalidate old caches.
const CACHE = "lt-v9";

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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title =
    typeof payload.title === "string" ? payload.title.slice(0, 120) : "Language Threshold";
  const body =
    typeof payload.body === "string" ? payload.body.slice(0, 300) : "Your next practice is ready.";
  const url =
    typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/?tab=speak";
  const tag =
    typeof payload.tag === "string" ? payload.tag.slice(0, 120) : "language-threshold-practice";
  const badgeCount = Number.isFinite(payload.badgeCount)
    ? Math.max(0, Math.min(999, payload.badgeCount))
    : 1;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
      }),
      typeof self.navigator?.setAppBadge === "function"
        ? self.navigator.setAppBadge(badgeCount).catch(() => {})
        : Promise.resolve(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    typeof event.notification.data?.url === "string" && event.notification.data.url.startsWith("/")
      ? event.notification.data.url
      : "/?tab=speak";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const destination = new URL(target, self.location.origin).href;
      for (const client of clients) {
        if ("navigate" in client) await client.navigate(destination);
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(destination);
    }),
  );
});
