// Built by TAC — 2026-10-23
// Persistent client cache for rendered Google voice audio. A word or sentence
// rendered once by a given voice never changes, so replays (games, flashcards,
// Reader) play from the device instead of calling /api/mission-tts again.
//
// Tiers: an in-memory LRU of Blobs, then Cache Storage (falling back to
// IndexedDB). If neither exists the memory tier still works. Every storage call
// is wrapped: a cache failure must never break playback.
//
// Keys are sha256 of `${voiceName}|${languageCode}|${renderedRate}|${text}` and
// nothing else is stored with the audio (no user id, no account data).

/**
 * Cache Storage / IndexedDB name prefix; each signed-in user gets `${prefix}-${userHash}`.
 * Deliberately NOT "lt-*": app-update.ts purges lt- caches on every update.
 */
export const TTS_CACHE_PREFIX = "tts-audio-v1";
export const TTS_MEMORY_ENTRIES = 200;
export const TTS_PERSISTENT_MAX_ENTRIES = 1500;
export const TTS_PERSISTENT_MAX_BYTES = 60 * 1024 * 1024;

const ENTRY_PATH = "/__tts-cache/";
const INDEX_PATH = `${ENTRY_PATH}__index`;

export interface TtsAudioKeyParts {
  voiceName: string;
  languageCode: string;
  renderedRate: number;
  text: string;
}

export interface TtsAudioRequest {
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  text: string;
}

/** Stable sha256 hex key. Resolves null when Web Crypto is unavailable (insecure context). */
export async function ttsAudioCacheKey(parts: TtsAudioKeyParts): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const material = `${parts.voiceName}|${parts.languageCode}|${Number(parts.renderedRate)}|${parts.text.trim()}`;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Least-recently-used map: reads refresh recency, inserts evict the oldest past the limit. */
export class LruMap<V> {
  private readonly items = new Map<string, V>();
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  get size() {
    return this.items.size;
  }
  keys() {
    return [...this.items.keys()];
  }
  has(key: string) {
    return this.items.has(key);
  }
  get(key: string): V | undefined {
    if (!this.items.has(key)) return undefined;
    const value = this.items.get(key) as V;
    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }
  set(key: string, value: V) {
    this.items.delete(key);
    this.items.set(key, value);
    while (this.items.size > this.limit) {
      const oldest = this.items.keys().next();
      if (oldest.done) break;
      this.items.delete(oldest.value);
    }
  }
  delete(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

export interface IndexEntry {
  /** Epoch ms the audio was stored. Eviction removes the oldest first. */
  at: number;
  size: number;
}

export interface CacheIndex {
  entries: Record<string, IndexEntry>;
  /** Voices whose server render ignores the requested speaking rate (always rendered at 1). */
  rateLocked: string[];
}

const emptyIndex = (): CacheIndex => ({ entries: {}, rateLocked: [] });

/** Defensive parse of the persisted index; anything malformed becomes an empty index. */
export function parseCacheIndex(raw: unknown): CacheIndex {
  if (!raw || typeof raw !== "object") return emptyIndex();
  const source = raw as { entries?: unknown; rateLocked?: unknown };
  const index = emptyIndex();
  if (source.entries && typeof source.entries === "object") {
    for (const [key, value] of Object.entries(source.entries as Record<string, unknown>)) {
      const entry = value as Partial<IndexEntry> | null;
      if (
        entry &&
        typeof entry.at === "number" &&
        Number.isFinite(entry.at) &&
        typeof entry.size === "number" &&
        Number.isFinite(entry.size) &&
        entry.size >= 0
      ) {
        index.entries[key] = { at: entry.at, size: entry.size };
      }
    }
  }
  if (Array.isArray(source.rateLocked)) {
    index.rateLocked = source.rateLocked.filter((v): v is string => typeof v === "string");
  }
  return index;
}

/** Keys to delete (oldest stored first) until the store is within both caps. */
export function planEviction(
  entries: Record<string, IndexEntry>,
  maxEntries: number,
  maxBytes: number,
): string[] {
  const ordered = Object.entries(entries).sort(
    (a, b) => a[1].at - b[1].at || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  let count = ordered.length;
  let bytes = ordered.reduce((sum, [, entry]) => sum + entry.size, 0);
  const evict: string[] = [];
  for (const [key, entry] of ordered) {
    if (count <= maxEntries && bytes <= maxBytes) break;
    evict.push(key);
    count -= 1;
    bytes -= entry.size;
  }
  return evict;
}

export interface TtsPersistentBackend {
  readBlob(key: string): Promise<Blob | null>;
  writeBlob(key: string, blob: Blob): Promise<void>;
  deleteBlob(key: string): Promise<void>;
  readIndex(): Promise<unknown>;
  writeIndex(index: CacheIndex): Promise<void>;
  clear(): Promise<void>;
}

/** Plain in-process backend. Used by tests; production falls back to the memory LRU alone. */
export function createMemoryBackend(): TtsPersistentBackend {
  const blobs = new Map<string, Blob>();
  let index: unknown = null;
  return {
    readBlob: async (key) => blobs.get(key) ?? null,
    writeBlob: async (key, blob) => void blobs.set(key, blob),
    deleteBlob: async (key) => void blobs.delete(key),
    readIndex: async () => index,
    writeIndex: async (next) => {
      index = JSON.parse(JSON.stringify(next));
    },
    clear: async () => {
      blobs.clear();
      index = null;
    },
  };
}

async function openCacheStorageBackend(name: string): Promise<TtsPersistentBackend | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(name);
  return {
    async readBlob(key) {
      const response = await cache.match(ENTRY_PATH + key);
      return response ? await response.blob() : null;
    },
    async writeBlob(key, blob) {
      await cache.put(
        ENTRY_PATH + key,
        new Response(blob, { headers: { "Content-Type": blob.type || "audio/mpeg" } }),
      );
    },
    async deleteBlob(key) {
      await cache.delete(ENTRY_PATH + key);
    },
    async readIndex() {
      const response = await cache.match(INDEX_PATH);
      return response ? await response.json() : null;
    },
    async writeIndex(index) {
      await cache.put(
        INDEX_PATH,
        new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } }),
      );
    },
    async clear() {
      await caches.delete(name);
    },
  };
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function openIndexedDbBackend(name: string): Promise<TtsPersistentBackend | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("IndexedDB unavailable"));
    open.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  const store = (mode: IDBTransactionMode) => db.transaction("kv", mode).objectStore("kv");
  // Blobs are stored as bytes plus a type; older Safari versions mishandle Blobs in IndexedDB.
  return {
    async readBlob(key) {
      const record = (await idbRequest(store("readonly").get(`a:${key}`))) as
        { type: string; data: ArrayBuffer } | undefined;
      return record ? new Blob([record.data], { type: record.type }) : null;
    },
    async writeBlob(key, blob) {
      const data = await blob.arrayBuffer();
      await idbRequest(
        store("readwrite").put({ type: blob.type || "audio/mpeg", data }, `a:${key}`),
      );
    },
    async deleteBlob(key) {
      await idbRequest(store("readwrite").delete(`a:${key}`));
    },
    async readIndex() {
      return (await idbRequest(store("readonly").get("index"))) ?? null;
    },
    async writeIndex(index) {
      await idbRequest(store("readwrite").put(index, "index"));
    },
    async clear() {
      await idbRequest(store("readwrite").clear());
    },
  };
}

/** Cache Storage first; IndexedDB if it is missing or throws; null (memory only) otherwise. */
export async function openDefaultBackend(name: string): Promise<TtsPersistentBackend | null> {
  try {
    const backend = await openCacheStorageBackend(name);
    if (backend) return backend;
  } catch {
    // Safari private mode and some iOS PWA contexts reject caches.open; try IndexedDB next.
  }
  try {
    return await openIndexedDbBackend(name);
  } catch {
    return null;
  }
}

export interface TtsAudioCacheOptions {
  openBackend?: () => Promise<TtsPersistentBackend | null>;
  memoryEntries?: number;
  maxEntries?: number;
  maxBytes?: number;
  now?: () => number;
}

export interface TtsAudioHit {
  blob: Blob;
  renderedRate: number;
}

export function createTtsAudioCache(options: TtsAudioCacheOptions = {}) {
  const openBackend = options.openBackend ?? (async () => null);
  const maxEntries = options.maxEntries ?? TTS_PERSISTENT_MAX_ENTRIES;
  const maxBytes = options.maxBytes ?? TTS_PERSISTENT_MAX_BYTES;
  const now = options.now ?? Date.now;
  const memory = new LruMap<Blob>(options.memoryEntries ?? TTS_MEMORY_ENTRIES);
  const lockedVoices = new Set<string>();
  let backendPromise: Promise<TtsPersistentBackend | null> | undefined;
  let indexPromise: Promise<CacheIndex> | undefined;
  let queue: Promise<void> = Promise.resolve();

  const backend = () => {
    backendPromise ??= (async () => {
      try {
        return await openBackend();
      } catch {
        return null;
      }
    })();
    return backendPromise;
  };

  const index = () => {
    indexPromise ??= (async () => {
      const store = await backend();
      let loaded = emptyIndex();
      if (store) {
        try {
          loaded = parseCacheIndex(await store.readIndex());
        } catch {
          loaded = emptyIndex();
        }
      }
      for (const voice of loaded.rateLocked) lockedVoices.add(voice);
      loaded.rateLocked = [...lockedVoices];
      return loaded;
    })();
    return indexPromise;
  };

  /** Serialises persistent writes so the index never races itself; never rejects. */
  const enqueue = (task: () => Promise<void>) => {
    const run = queue.then(task).catch(() => undefined);
    queue = run;
    return run;
  };

  async function get(key: string): Promise<Blob | null> {
    const hot = memory.get(key);
    if (hot) return hot;
    try {
      const store = await backend();
      if (!store) return null;
      const blob = await store.readBlob(key);
      if (blob && blob.size > 0) {
        memory.set(key, blob);
        return blob;
      }
    } catch {
      // A broken read is a miss.
    }
    return null;
  }

  function put(key: string, blob: Blob): Promise<void> {
    if (blob.size === 0) return Promise.resolve();
    memory.set(key, blob);
    return enqueue(async () => {
      const store = await backend();
      if (!store) return;
      const current = await index();
      await store.writeBlob(key, blob);
      current.entries[key] = { at: now(), size: blob.size };
      for (const stale of planEviction(current.entries, maxEntries, maxBytes)) {
        delete current.entries[stale];
        await store.deleteBlob(stale).catch(() => undefined);
      }
      await store.writeIndex(current);
    });
  }

  function remove(key: string): Promise<void> {
    memory.delete(key);
    return enqueue(async () => {
      const store = await backend();
      if (!store) return;
      const current = await index();
      delete current.entries[key];
      await store.deleteBlob(key).catch(() => undefined);
      await store.writeIndex(current);
    });
  }

  async function isRateLocked(voiceName: string): Promise<boolean> {
    try {
      await index();
    } catch {
      // Memory set below is still authoritative for this session.
    }
    return lockedVoices.has(voiceName);
  }

  function markRateLocked(voiceName: string): Promise<void> {
    if (lockedVoices.has(voiceName)) return Promise.resolve();
    lockedVoices.add(voiceName);
    return enqueue(async () => {
      const store = await backend();
      if (!store) return;
      const current = await index();
      current.rateLocked = [...lockedVoices];
      await store.writeIndex(current);
    });
  }

  /** Cached audio for this request, or null. Never throws. */
  async function lookup(request: TtsAudioRequest): Promise<(TtsAudioHit & { key: string }) | null> {
    try {
      const renderedRate = (await isRateLocked(request.voiceName)) ? 1 : request.speakingRate;
      const key = await ttsAudioCacheKey({ ...request, renderedRate });
      if (!key) return null;
      const blob = await get(key);
      return blob ? { blob, renderedRate, key } : null;
    } catch {
      return null;
    }
  }

  /** Remember audio the server rendered at `renderedRate` for this request. Never throws. */
  async function store(request: TtsAudioRequest, renderedRate: number, blob: Blob): Promise<void> {
    try {
      if (renderedRate !== request.speakingRate) void markRateLocked(request.voiceName);
      const key = await ttsAudioCacheKey({ ...request, renderedRate });
      if (!key) return;
      await put(key, blob);
    } catch {
      // Caching is best effort.
    }
  }

  async function forget(key: string): Promise<void> {
    try {
      await remove(key);
    } catch {
      // Best effort.
    }
  }

  function clear(): Promise<void> {
    memory.clear();
    lockedVoices.clear();
    return enqueue(async () => {
      const store = await backend();
      if (store) await store.clear();
      // Cache Storage handles go stale after deleting the cache, so reopen lazily.
      backendPromise = undefined;
      indexPromise = undefined;
    });
  }

  return {
    get,
    put,
    remove,
    lookup,
    store,
    forget,
    clear,
    isRateLocked,
    markRateLocked,
    /** Forget the in-memory tier only (a different user took over). */
    dropMemory: () => memory.clear(),
    /** Resolves when queued persistent writes have finished (tests, sign-out). */
    settled: () => queue,
    memoryKeys: () => memory.keys(),
  };
}

export type TtsAudioCache = ReturnType<typeof createTtsAudioCache>;

// Per-user namespacing: one persistent store per signed-in user, so a different account
// can never read another's clips even if a clear fails. Signed-out callers (no user id)
// and runtimes without Web Crypto get a memory-only cache.

async function userNamespace(userId: string): Promise<string | null> {
  const key = await ttsAudioCacheKey({
    voiceName: "namespace",
    languageCode: "user",
    renderedRate: 0,
    text: userId,
  });
  return key ? key.slice(0, 24) : null;
}

let active: { id: string; cache: TtsAudioCache } | undefined;

/** Browser-only: SSR and non-DOM runtimes get no cache at all. */
async function cacheFor(userId?: string | null): Promise<TtsAudioCache | null> {
  if (typeof document === "undefined") return null;
  const namespace = userId ? await userNamespace(userId) : null;
  const id = namespace ?? "";
  if (!active || active.id !== id) {
    active?.cache.dropMemory();
    const name = `${TTS_CACHE_PREFIX}-${namespace}`;
    active = {
      id,
      cache: createTtsAudioCache({
        openBackend: namespace ? () => openDefaultBackend(name) : async () => null,
      }),
    };
  }
  return active.cache;
}

export async function lookupTtsAudio(request: TtsAudioRequest, userId?: string | null) {
  return (await (await cacheFor(userId))?.lookup(request)) ?? null;
}

export async function storeTtsAudio(
  request: TtsAudioRequest,
  renderedRate: number,
  blob: Blob,
  userId?: string | null,
) {
  await (await cacheFor(userId))?.store(request, renderedRate, blob);
}

export async function forgetTtsAudio(key: string, userId?: string | null) {
  await (await cacheFor(userId))?.forget(key);
}

/** Resolves when queued persistent writes for the active user have finished. */
export async function flushTtsAudioCache() {
  await active?.cache.settled();
}

async function deletePersistentStores(namespace: string | null): Promise<void> {
  const wanted = (name: string) =>
    namespace ? name === `${TTS_CACHE_PREFIX}-${namespace}` : name.startsWith(TTS_CACHE_PREFIX);
  try {
    if (typeof caches !== "undefined") {
      for (const name of (await caches.keys()).filter(wanted)) await caches.delete(name);
    }
  } catch {
    // Best effort.
  }
  try {
    if (typeof indexedDB !== "undefined") {
      const names = namespace
        ? [`${TTS_CACHE_PREFIX}-${namespace}`]
        : ((await indexedDB.databases?.()) ?? []).flatMap((db) => (db.name ? [db.name] : []));
      for (const name of names.filter(wanted)) {
        await new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = request.onerror = request.onblocked = () => resolve();
        });
      }
    }
  } catch {
    // Best effort.
  }
}

/**
 * Wipe cached clips. Pass the departing user's id to remove their store; with no id every
 * user's store on this device goes. Call on sign-out, session end and user switch: Reader
 * can speak user-supplied text. Never throws.
 */
export async function clearTtsAudioCache(userId?: string | null): Promise<void> {
  try {
    const departing = active;
    const namespace = userId ? await userNamespace(userId) : null;
    if (departing && (!userId || departing.id === namespace || !namespace)) {
      active = undefined;
      departing.cache.dropMemory();
      await departing.cache.settled();
    }
    if (userId && !namespace) return; // memory-only runtime: nothing persisted
    await deletePersistentStores(userId ? namespace : null);
  } catch {
    // Best effort.
  }
}

// Sticky voice retry policy: pure, so tts.ts can import it without pulling in mission-tts.

export const STICKY_RETRY_MAX_WAIT_MS = 8000;
/** Matches the Retry-After the route sends when it does not know the window. */
export const STICKY_RETRY_UNKNOWN_SECONDS = 20;

export type StickyRetryDecision = { action: "retry"; waitMs: number } | { action: "fallback" };

/**
 * Keep the learner's Google voice through a rate-limit blip: wait the server's
 * Retry-After (capped) once on 429, otherwise fall back to the device voice.
 */
export function decideStickyRetry({
  status,
  retryAfterSeconds,
  alreadyRetried,
}: {
  status: number | null;
  retryAfterSeconds: number | null;
  alreadyRetried: boolean;
}): StickyRetryDecision {
  if (alreadyRetried || status !== 429) return { action: "fallback" };
  const seconds =
    retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
      ? retryAfterSeconds
      : STICKY_RETRY_UNKNOWN_SECONDS;
  return {
    action: "retry",
    waitMs: Math.min(STICKY_RETRY_MAX_WAIT_MS, Math.round(seconds * 1000)),
  };
}
