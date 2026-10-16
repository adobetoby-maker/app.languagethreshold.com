// Language Threshold — Service Worker
// Cache version: bump this string on every deploy to invalidate old caches.
const CACHE = "lt-v13";
if (typeof importScripts === "function") importScripts("/offline-lessons-worker.js");

function privateDocument(url) {
  return (
    /^\/(?:exams|exam-content|exam-reviewers|team|owner|account|certificate|family-setup|subscribe)(?:\/|$)/.test(
      url.pathname,
    ) ||
    (url.pathname === "/" && url.searchParams.get("tab") === "exams")
  );
}

function privateContext(url) {
  return [
    "org",
    "attempt",
    "plan",
    "enrollment",
    "token",
    "access_token",
    "refresh_token",
    "code",
    "email",
  ].some((key) => url.searchParams.has(key));
}

function cacheableResponse(response) {
  return (
    !!response?.ok &&
    !response.redirected &&
    !/(?:^|,)\s*(?:no-store|private)(?:\s*(?:=|,|$))/i.test(
      response.headers.get("Cache-Control") ?? "",
    )
  );
}

const PUBLIC_EXAMS_SHELL = "/.lt-public-exams-shell";
async function savePublicExamsShell() {
  // Fixed route, no identity/query/cookies/auth headers. Private navigation responses
  // are never stored. This public bootstrap lets the owned device draft UI reload.
  const response = await fetch("/exams?target=Spanish&native=English", {
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (
    !response.ok ||
    response.redirected ||
    !response.headers.get("Content-Type")?.includes("text/html")
  )
    return;
  await (await caches.open(CACHE)).put(PUBLIC_EXAMS_SHELL, response);
}

self.addEventListener("install", (event) => {
  // Activate immediately — no "waiting" state between deploys.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const shell = await fetch("/");
      if (cacheableResponse(shell)) await cache.put("/", shell);
    }),
  );
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => /^lt-v\d+$/.test(k) && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
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
    request.method !== "GET" ||
    request.headers.has("Authorization") ||
    url.origin !== self.location.origin ||
    (privateDocument(url) && url.pathname !== "/exams")
  ) {
    return;
  }

  if (request.mode === "navigate" && url.pathname === "/exams") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(savePublicExamsShell().catch(() => {}));
          return response;
        })
        .catch(
          async () =>
            (await (await caches.open(CACHE)).match(PUBLIC_EXAMS_SHELL)) ?? Response.error(),
        ),
    );
    return;
  }

  // Pre-built lesson word decks: stale-while-revalidate. Serve the cached deck at once (works
  // offline), refresh it in the background; with no cache, use the network.
  if (url.pathname.startsWith("/lesson-decks/") && url.pathname.endsWith(".json")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const refresh = fetch(request)
            .then((response) => {
              if (cacheableResponse(response)) cache.put(request, response.clone());
              return response;
            })
            .catch(() => undefined);
          if (cacheableResponse(cached)) {
            event.waitUntil(refresh);
            return cached;
          }
          return refresh.then((response) => response ?? Response.error());
        }),
      ),
    );
    return;
  }

  // Cache-first for content-hashed JS/CSS/fonts/images
  if (/\.(js|mjs|css|woff2?|png|svg|jpg|webp|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cacheableResponse(cached)) return cached;
        return fetch(request).then((response) => {
          if (cacheableResponse(response)) {
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
          if (!privateContext(url) && cacheableResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(
          async () =>
            (url.pathname === "/" && typeof offlineLessonShell === "function"
              ? await offlineLessonShell()
              : null) ??
            (!privateContext(url) ? await caches.match(request) : null) ??
            (await caches.match("/")) ??
            Response.error(),
        ),
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
