// Recovery for stale code-split chunks after a deploy.
//
// A tab left open across a deploy still references the previous build's hashed
// chunks, which now 404. React.lazy caches the rejected import, so re-rendering
// can never recover; only a full page load fetches the new build. The first
// chunk failure reloads the page once. A sessionStorage timestamp stops that
// reload from repeating: within RELOAD_GUARD_MS of an automatic reload, the
// error is shown instead, and "Try again" does a hard reload.

export const CHUNK_RELOAD_KEY = "lt.chunk-reload-at";
/** An automatic reload within this window of the last one is skipped, so it can never loop. */
export const RELOAD_GUARD_MS = 5 * 60_000;

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i, // Chrome, Edge
  /importing a module script failed/i, // Safari
  /error loading dynamically imported module/i, // Firefox
  /unable to preload css/i, // Vite CSS preload
  /loading (css )?chunk [\w-]+ failed/i, // webpack-style ChunkLoadError message
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  if (typeof message !== "string") return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export interface ChunkReloadStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ChunkReloadRuntime {
  storage: ChunkReloadStorage | null;
  now: () => number;
  reload: () => void;
}

/** True when no automatic reload happened in the last RELOAD_GUARD_MS. False without storage, since the reload could not be guarded. */
export function canAutoReload(storage: ChunkReloadStorage | null, now: number): boolean {
  if (!storage) return false;
  let raw: string | null;
  try {
    raw = storage.getItem(CHUNK_RELOAD_KEY);
  } catch {
    return false;
  }
  if (!raw) return true;
  const last = Number(raw);
  if (!Number.isFinite(last)) return true;
  // A timestamp in the future (clock moved back) counts as recent: never risk a loop.
  return now - last >= RELOAD_GUARD_MS;
}

let reloadPending = false;

/**
 * Reload once for a chunk-load failure. Returns true when a reload is under way (started now or
 * earlier in this page's life), so the caller can show a loading state instead of the error.
 * Returns false for other errors, and when the guard says a reload already happened recently.
 */
export function reloadForChunkError(error: unknown, runtime: ChunkReloadRuntime): boolean {
  if (!isChunkLoadError(error)) return false;
  if (reloadPending) return true;
  const now = runtime.now();
  if (!canAutoReload(runtime.storage, now)) return false;
  try {
    runtime.storage?.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // Without a stored guard the next page could reload again; do not reload at all.
    return false;
  }
  reloadPending = true;
  runtime.reload();
  return true;
}

/** Test hook: forget a pending reload from a previous call in this module instance. */
export function resetChunkReloadForTests() {
  reloadPending = false;
}

function browserSessionStorage(): ChunkReloadStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function browserChunkReloadRuntime(): ChunkReloadRuntime {
  return {
    storage: browserSessionStorage(),
    now: () => Date.now(),
    reload: () => window.location.reload(),
  };
}

/**
 * Vite dispatches `vite:preloadError` on window when a dynamic import or its preloaded
 * dependencies fail to load. The error still propagates to the importer's error boundary.
 */
export function installChunkReloadListener(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPreloadError = (event: Event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    // Vite's payload is the original error; treat any preload failure as a stale chunk.
    const error = isChunkLoadError(payload)
      ? payload
      : { name: "ChunkLoadError", message: String(payload) };
    reloadForChunkError(error, browserChunkReloadRuntime());
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}
