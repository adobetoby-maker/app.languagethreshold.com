import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLibraryDevice,
  libraryDeviceKey,
  clearLibraryDeviceForUser,
} from "../src/lib/library-device.ts";
import { LEGACY_LIBRARY_KEY, inspectLegacyLibrary } from "../src/lib/legacy-library.ts";
const book = {
  id: "legacy-reader-book",
  title: "Fictional QA book",
  language: "Spanish",
  targetLabel: "Español",
  section: "custom",
  available: true,
  sentences: [{ en: "First page", target: "Primera página" }],
  chapters: [
    { title: "Chapter one", sentences: [{ en: "First page", target: "Primera página" }] },
    { title: "Chapter two", sentences: [{ en: "Last page", target: "Última página" }] },
  ],
};
function fixture() {
  const values = new Map([[LEGACY_LIBRARY_KEY, JSON.stringify([book])]]);
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const rows = new Map();
  let current = true,
    online = false,
    writes = 0;
  const remote = {
    load: async () => [...rows.values()],
    remove: async (id) => {
      rows.delete(id);
    },
    put: async (entry) => {
      if (!online) throw Error("QA offline");
      writes++;
      if (!rows.has(entry.id)) rows.set(entry.id, entry);
      return rows.get(entry.id);
    },
  };
  return {
    values,
    storage,
    rows,
    get writes() {
      return writes;
    },
    device: (actor) => createLibraryDevice({ actor, storage, remote, isCurrent: () => current }),
    online: () => {
      online = true;
    },
    expire: () => {
      current = false;
    },
  };
}
test("older multi-chapter books require ownership confirmation, keep originals and sync once after reconnect", async () => {
  const f = fixture(),
    a = f.device("a"),
    original = f.values.get(LEGACY_LIBRARY_KEY);
  await a.sync();
  assert.equal(f.writes, 0);
  assert.deepEqual(a.getSnapshot().books, []);
  assert.throws(() => a.recoverLegacy(false), /confirm/);
  assert.throws(() => f.device(null).recoverLegacy(true), /Sign in/);
  assert.equal(a.recoverLegacy(true), 1);
  const saved = a.getSnapshot().books[0];
  assert.notEqual(saved.id, book.id);
  assert.deepEqual(saved.chapters, book.chapters);
  assert.equal(a.getSnapshot().pending.length, 1);
  await a.sync();
  assert.equal(a.getSnapshot().pending.length, 1);
  const reopened = f.device("a");
  assert.equal(reopened.getSnapshot().books[0].id, saved.id);
  assert.equal(reopened.recoverLegacy(true), 0);
  assert.deepEqual(f.device("b").getSnapshot().books, []);
  assert.deepEqual(inspectLegacyLibrary(f.storage, "b"), { status: "other-account", count: 0 });
  assert.throws(() => f.device("b").recoverLegacy(true), /another account/);
  f.online();
  await reopened.sync();
  assert.equal(f.rows.size, 1);
  assert.equal(f.writes, 1);
  assert.equal(reopened.getSnapshot().pending.length, 0);
  assert.equal(f.values.get(LEGACY_LIBRARY_KEY), original);
  assert.equal(clearLibraryDeviceForUser(f.storage, "a"), true);
  const afterSignOut = f.device("a");
  assert.equal(afterSignOut.recoverLegacy(true), 1);
  assert.equal(afterSignOut.getSnapshot().books[0].id, saved.id);
  await afterSignOut.sync();
  assert.equal(f.rows.size, 1);
});
test("failed destination persistence reserves ownership and preserves retry IDs and unrelated current books", () => {
  const f = fixture(),
    a = f.device("a");
  const own = { ...book, id: crypto.randomUUID(), title: "Current own book" };
  a.add(own);
  const set = f.storage.setItem;
  f.storage.setItem = (key, value) => {
    if (key === libraryDeviceKey("a")) throw Error("QA quota");
    set(key, value);
  };
  assert.throws(() => a.recoverLegacy(true), /storage/);
  assert.equal(a.getSnapshot().books.length, 1);
  assert.equal(inspectLegacyLibrary(f.storage, "b").status, "other-account");
  f.storage.setItem = set;
  assert.equal(a.recoverLegacy(true), 1);
  assert.equal(a.recoverLegacy(true), 0);
  assert.equal(a.getSnapshot().books.length, 2);
  assert.deepEqual(
    a.getSnapshot().books.find((e) => e.id === own.id),
    own,
  );
});
test("malformed older books, duplicate IDs and corrupt destination never replace owned or original data", () => {
  for (const source of [
    "bad JSON",
    JSON.stringify([{ ...book, chapters: [{ title: "Bad", sentences: [{ target: 42 }] }] }]),
    JSON.stringify([book, book]),
  ]) {
    const f = fixture();
    f.values.set(LEGACY_LIBRARY_KEY, source);
    const before = new Map(f.values);
    assert.equal(inspectLegacyLibrary(f.storage, "a").status, "unreadable");
    assert.throws(() => f.device("a").recoverLegacy(true));
    assert.deepEqual(f.values, before);
  }
  const f = fixture();
  f.values.set(libraryDeviceKey("a"), "bad destination");
  const before = new Map(f.values);
  assert.throws(() => f.device("a").recoverLegacy(true), /current library/);
  assert.deepEqual(f.values, before);
});
test("expired identities cannot claim old books or repopulate explicit sign-out caches", () => {
  const f = fixture(),
    a = f.device("a");
  f.expire();
  assert.throws(() => a.recoverLegacy(true), /Sign in/);
  assert.equal(f.values.size, 1);
  const g = fixture(),
    stale = g.device("a");
  clearLibraryDeviceForUser(g.storage, "a");
  assert.throws(() => stale.recoverLegacy(true), /Sign in/);
  assert.equal(g.values.has(libraryDeviceKey("a")), false);
});
test("an explicitly removed recovered book is not silently resurrected by retry", () => {
  const f = fixture(),
    a = f.device("a");
  a.recoverLegacy(true);
  const id = a.getSnapshot().books[0].id;
  a.remove(id);
  assert.equal(a.recoverLegacy(true), 0);
  assert.deepEqual(a.getSnapshot().books, []);
  assert.deepEqual(a.getSnapshot().deleted, [id]);
});
