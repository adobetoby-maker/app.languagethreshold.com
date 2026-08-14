const APP_CACHE_PREFIX = "lt-";
const UPDATE_QUERY_PARAM = "lt-update";

export async function reloadNewestAppVersion() {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const cacheNames = await window.caches.keys().catch(() => []);
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX))
          .map((cacheName) => window.caches.delete(cacheName)),
      );
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(
        registrations.map((registration) => registration.update().catch(() => null)),
      );
    }
  } finally {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(UPDATE_QUERY_PARAM, Date.now().toString());
    window.location.replace(nextUrl.toString());
  }
}
