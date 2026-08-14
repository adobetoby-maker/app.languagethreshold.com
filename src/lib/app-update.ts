const APP_CACHE_PREFIX = "lt-";
const UPDATE_QUERY_PARAM = "lt-update";
const START_OVER_QUERY_PARAM = "lt-start-over";

export interface AppResetRuntime {
  clearCaches: () => Promise<void>;
  unregisterServiceWorkers: () => Promise<void>;
  clearLocalStorage: () => void;
  clearSessionStorage: () => void;
  restart: () => void;
}

function browserResetRuntime(): AppResetRuntime {
  return {
    clearCaches: async () => {
      if (!("caches" in window)) return;
      const cacheNames = await window.caches.keys().catch(() => []);
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    },
    unregisterServiceWorkers: async () => {
      if (!("serviceWorker" in navigator)) return;
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(
        registrations.map((registration) => registration.unregister().catch(() => false)),
      );
    },
    clearLocalStorage: () => window.localStorage.clear(),
    clearSessionStorage: () => window.sessionStorage.clear(),
    restart: () => {
      const nextUrl = new URL("/", window.location.origin);
      nextUrl.searchParams.set(START_OVER_QUERY_PARAM, Date.now().toString());
      window.location.replace(nextUrl.toString());
    },
  };
}

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

export async function resetAppToFirstRun(
  signOutThisDevice: () => Promise<void>,
  runtime?: AppResetRuntime,
) {
  if (typeof window === "undefined" && !runtime) return;
  const activeRuntime = runtime ?? browserResetRuntime();

  try {
    await signOutThisDevice();
  } catch {
    // Clearing the browser session below still signs this device out when the
    // network is unavailable or the auth session has already expired.
  }

  await Promise.allSettled([
    activeRuntime.clearCaches(),
    activeRuntime.unregisterServiceWorkers(),
  ]);

  try {
    activeRuntime.clearLocalStorage();
  } catch {
    // Storage can be unavailable in private browsing; continue to restart.
  }
  try {
    activeRuntime.clearSessionStorage();
  } catch {
    // Storage can be unavailable in private browsing; continue to restart.
  }
  activeRuntime.restart();
}
