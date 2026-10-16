import type { LibraryEntry } from "../state/library-state";

export interface LibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface Cache {
  books: LibraryEntry[];
  pending: string[];
  deleted: string[];
}
export interface LibraryDeviceSnapshot extends Cache {
  syncing: boolean;
  error: string | null;
  legacySaved: boolean;
}
export interface LibraryRemote {
  load(signal: AbortSignal): Promise<LibraryEntry[]>;
  put(entry: LibraryEntry, signal: AbortSignal): Promise<LibraryEntry>;
  remove(id: string, signal: AbortSignal): Promise<void>;
}
const MAX_BYTES = 8 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const libraryDeviceKey = (actor: string | null) =>
  `lt.library-device.v1.${actor === null ? "guest" : `user.${encodeURIComponent(actor)}`}`;
const preferencesKey = (actor: string | null) => libraryDeviceKey(actor) + ".preferences";

function readOwned(storage: LibraryStorage | null, key: string, actor: string | null) {
  try {
    const raw = storage?.getItem(key);
    if (!raw || raw.length > MAX_BYTES) return null;
    const value = JSON.parse(raw);
    return value?.schema === 1 &&
      value.actor === actor &&
      value.data &&
      typeof value.data === "object"
      ? value.data
      : null;
  } catch {
    return null;
  }
}
function writeOwned(
  storage: LibraryStorage | null,
  key: string,
  actor: string | null,
  data: object,
) {
  const raw = JSON.stringify({ schema: 1, actor, data });
  if (!storage || raw.length > MAX_BYTES) throw Error("storage");
  storage.setItem(key, raw);
}
export function readLibraryPreferences(storage: LibraryStorage | null, actor: string | null) {
  return readOwned(storage, preferencesKey(actor), actor);
}
export function saveLibraryPreferences(
  storage: LibraryStorage | null,
  actor: string | null,
  data: object,
) {
  try {
    writeOwned(storage, preferencesKey(actor), actor, data);
    return true;
  } catch {
    return false;
  }
}
function loadCache(storage: LibraryStorage | null, actor: string | null): Cache {
  const empty = { books: [], pending: [], deleted: [] };
  const value = readOwned(storage, libraryDeviceKey(actor), actor);
  if (
    !value ||
    !Array.isArray(value.books) ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.deleted)
  )
    return empty;
  const validIds = (ids: unknown[]) => ids.every((id) => typeof id === "string" && UUID.test(id));
  if (
    !validIds(value.pending) ||
    !validIds(value.deleted) ||
    value.books.some(
      (book: LibraryEntry) =>
        !book ||
        !UUID.test(book.id) ||
        book.section !== "custom" ||
        typeof book.title !== "string" ||
        typeof book.language !== "string" ||
        !Array.isArray(book.sentences),
    )
  )
    return empty;
  return {
    books: value.books,
    pending: [...new Set<string>(value.pending)],
    deleted: [...new Set<string>(value.deleted)],
  };
}
function legacyPresent(storage: LibraryStorage | null) {
  try {
    return storage?.getItem("lt.library.custom.v1") !== null && !!storage;
  } catch {
    return false;
  }
}

/** Account-owned Reader cache and durable upload/delete queue. Never imports unowned legacy books. */
export function createLibraryDevice({
  actor,
  storage,
  remote,
  isCurrent,
}: {
  actor: string | null;
  storage: LibraryStorage | null;
  remote: LibraryRemote | null;
  isCurrent: () => boolean;
}) {
  let snapshot: LibraryDeviceSnapshot = {
    ...loadCache(storage, actor),
    syncing: false,
    error: null,
    legacySaved: legacyPresent(storage),
  };
  const listeners = new Set<() => void>();
  let generation = 0;
  let flight: { abort: AbortController; promise: Promise<void> } | null = null;
  function notify(patch: Partial<LibraryDeviceSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }
  function commit(cache: Cache) {
    if (!isCurrent()) throw Error("Your account changed. Reopen this text in the current account.");
    try {
      writeOwned(storage, libraryDeviceKey(actor), actor, cache);
    } catch {
      throw Error(
        "Browser storage is full or unavailable. Keep your text open and try saving again.",
      );
    }
    notify({ ...cache, error: null });
  }
  function currentCache(): Cache {
    return { books: snapshot.books, pending: snapshot.pending, deleted: snapshot.deleted };
  }
  const device = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    add(entry: LibraryEntry) {
      if (!UUID.test(entry.id) || entry.section !== "custom") throw Error("Invalid personal text.");
      commit({
        ...currentCache(),
        books: [entry, ...snapshot.books.filter((book) => book.id !== entry.id)],
        pending: actor ? [...new Set([...snapshot.pending, entry.id])] : [],
        deleted: snapshot.deleted.filter((id) => id !== entry.id),
      });
    },
    remove(id: string) {
      if (!snapshot.books.some((book) => book.id === id)) return;
      commit({
        books: snapshot.books.filter((book) => book.id !== id),
        pending: snapshot.pending.filter((value) => value !== id),
        deleted: actor ? [...new Set([...snapshot.deleted, id])] : [],
      });
    },
    cancel() {
      generation++;
      flight?.abort.abort();
      flight = null;
      notify({ syncing: false });
    },
    sync(): Promise<void> {
      if (!actor || !remote || !isCurrent()) return Promise.resolve();
      if (flight) return flight.promise;
      const current = ++generation;
      const abort = new AbortController();
      const active = () => generation === current && !abort.signal.aborted && isCurrent();
      notify({ syncing: true, error: null });
      const timeout = setTimeout(() => {
        if (active()) {
          notify({
            error:
              "Library sync timed out. Reconnect and retry; saved device changes remain queued.",
          });
          abort.abort();
        }
      }, 30000);
      const promise = Promise.resolve()
        .then(async () => {
          // Bound a reconnect batch; the visible Retry action can drain any remainder.
          let remaining = 50;
          do {
            while (
              active() &&
              remaining > 0 &&
              (snapshot.pending.length || snapshot.deleted.length)
            ) {
              remaining--;
              const removed = snapshot.deleted[0];
              if (removed) {
                await remote.remove(removed, abort.signal);
                if (!active()) return;
                commit({
                  ...currentCache(),
                  deleted: snapshot.deleted.filter((id) => id !== removed),
                });
                continue;
              }
              const id = snapshot.pending[0];
              const entry = snapshot.books.find((book) => book.id === id);
              if (!entry) {
                commit({
                  ...currentCache(),
                  pending: snapshot.pending.filter((value) => value !== id),
                });
                continue;
              }
              const saved = await remote.put(entry, abort.signal);
              if (!active()) return;
              if (saved.id !== id) throw Error("Library save could not be confirmed.");
              // A delete while the upload was in flight must not resurrect the book.
              if (snapshot.pending.includes(id) && !snapshot.deleted.includes(id))
                commit({
                  ...currentCache(),
                  books: snapshot.books.map((book) => (book.id === id ? saved : book)),
                  pending: snapshot.pending.filter((value) => value !== id),
                });
            }
            if (!active()) return;
            const cloud = await remote.load(abort.signal);
            if (!active()) return;
            const pending = new Set(snapshot.pending),
              deleted = new Set(snapshot.deleted);
            const cache = {
              ...currentCache(),
              books: [
                ...snapshot.books.filter((book) => pending.has(book.id) && !deleted.has(book.id)),
                ...cloud.filter((book) => !pending.has(book.id) && !deleted.has(book.id)),
              ],
            };
            try {
              commit(cache);
            } catch (error) {
              if (!active()) return;
              // Online reading can continue even when this browser cannot keep an offline copy.
              notify({
                books: cache.books,
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not save an offline library copy.",
              });
              return;
            }
            // New edits made during the cloud read remain queued, never overwritten.
          } while (
            active() &&
            remaining > 0 &&
            (snapshot.pending.length || snapshot.deleted.length)
          );
        })
        .catch((error) => {
          if (active())
            notify({
              error:
                error instanceof Error && /Browser storage/.test(error.message)
                  ? error.message
                  : "Couldn't sync your library. Saved device changes are still waiting to sync.",
            });
        })
        .finally(() => {
          clearTimeout(timeout);
          if (generation === current) {
            flight = null;
            notify({ syncing: false });
          }
        });
      flight = { abort, promise };
      return promise;
    },
  };
  return device;
}
