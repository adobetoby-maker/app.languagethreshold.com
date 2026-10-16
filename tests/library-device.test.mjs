import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLibraryDevice,
  libraryDeviceKey,
  readLibraryPreferences,
  saveLibraryPreferences,
} from "../src/lib/library-device.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const book = (n) => ({
  id: id(n),
  title: `QA text ${n}`,
  language: "Spanish",
  targetLabel: "Spanish",
  sentences: [{ en: "A text", target: "Un texto" }],
  section: "custom",
  flag: "",
  available: true,
});
const deviceStorage = () => {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const remoteStore = () => {
  const rows = new Map();
  let writes = 0;
  return {
    rows,
    get writes() {
      return writes;
    },
    remote: {
      async put(entry) {
        writes++;
        if (!rows.has(entry.id)) rows.set(entry.id, entry);
        return rows.get(entry.id);
      },
      async load() {
        return [...rows.values()];
      },
      async remove(key) {
        rows.delete(key);
      },
    },
  };
};

test("Reader caches separate guest and accounts and never upload an unowned legacy save", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore();
  const legacy = JSON.stringify([book(9)]);
  storage.setItem("lt.library.custom.v1", legacy);
  const guest = createLibraryDevice({ actor: null, storage, remote: null, isCurrent: () => true });
  guest.add(book(1));
  const a = createLibraryDevice({
    actor: "a",
    storage,
    remote: cloud.remote,
    isCurrent: () => true,
  });
  assert.equal(a.getSnapshot().legacySaved, true);
  assert.deepEqual(a.getSnapshot().books, []);
  await a.sync();
  assert.equal(cloud.writes, 0);
  assert.equal(storage.getItem("lt.library.custom.v1"), legacy);
  a.add(book(2));
  await a.sync();
  const b = createLibraryDevice({ actor: "b", storage, remote: null, isCurrent: () => true });
  assert.deepEqual(b.getSnapshot().books, []);
  assert.deepEqual(
    createLibraryDevice({ actor: null, storage, remote: null, isCurrent: () => true })
      .getSnapshot()
      .books.map((b) => b.id),
    [id(1)],
  );
  assert.deepEqual(
    createLibraryDevice({ actor: "a", storage, remote: null, isCurrent: () => true })
      .getSnapshot()
      .books.map((b) => b.id),
    [id(2)],
  );
});

test("a failed upload survives reload and retries the same stable identity without duplicates", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore();
  let uncertain = true;
  const remote = {
    ...cloud.remote,
    async put(entry, signal) {
      const saved = await cloud.remote.put(entry, signal);
      if (uncertain) {
        uncertain = false;
        throw Error("response lost after commit");
      }
      return saved;
    },
  };
  const first = createLibraryDevice({ actor: "a", storage, remote, isCurrent: () => true });
  first.add(book(1));
  await first.sync();
  assert.deepEqual(first.getSnapshot().pending, [id(1)]);
  assert.match(first.getSnapshot().error, /Couldn't sync/);
  const reloaded = createLibraryDevice({ actor: "a", storage, remote, isCurrent: () => true });
  assert.equal(reloaded.getSnapshot().books[0].title, "QA text 1");
  await reloaded.sync();
  assert.equal(cloud.rows.size, 1);
  assert.equal(cloud.writes, 2);
  assert.deepEqual(reloaded.getSnapshot().pending, []);
  assert.equal(reloaded.getSnapshot().error, null);
});

test("late account A network results cannot write a cache or become account B content", async () => {
  const storage = deviceStorage(),
    late = deferred();
  let current = true,
    loads = 0;
  const a = createLibraryDevice({
    actor: "a",
    storage,
    isCurrent: () => current,
    remote: {
      async put() {
        return late.promise;
      },
      async load() {
        loads++;
        return [];
      },
      async remove() {},
    },
  });
  a.add(book(1));
  const before = storage.getItem(libraryDeviceKey("a"));
  const flight = a.sync();
  await tick();
  current = false;
  a.cancel();
  late.resolve(book(1));
  await flight;
  assert.equal(loads, 0);
  assert.equal(storage.getItem(libraryDeviceKey("a")), before);
  assert.deepEqual(
    createLibraryDevice({ actor: "b", storage, remote: null, isCurrent: () => true }).getSnapshot()
      .books,
    [],
  );
});

test("a text added during cloud loading is retained and uploaded before sync finishes", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore(),
    late = deferred();
  let loads = 0;
  const replica = createLibraryDevice({
    actor: "a",
    storage,
    isCurrent: () => true,
    remote: {
      ...cloud.remote,
      async load() {
        loads++;
        return loads === 1 ? late.promise : [...cloud.rows.values()];
      },
    },
  });
  const flight = replica.sync();
  await tick();
  replica.add(book(1));
  late.resolve([]);
  await flight;
  assert.deepEqual(
    replica.getSnapshot().books.map((b) => b.id),
    [id(1)],
  );
  assert.deepEqual(replica.getSnapshot().pending, []);
  assert.equal(cloud.rows.size, 1);
});

test("deleting during an uncertain upload never resurrects the text", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore(),
    late = deferred();
  const replica = createLibraryDevice({
    actor: "a",
    storage,
    isCurrent: () => true,
    remote: {
      ...cloud.remote,
      async put(entry) {
        await cloud.remote.put(entry);
        await late.promise;
        return entry;
      },
    },
  });
  replica.add(book(1));
  const flight = replica.sync();
  await tick();
  replica.remove(id(1));
  late.resolve();
  await flight;
  assert.equal(replica.getSnapshot().books.length, 0);
  assert.equal(replica.getSnapshot().deleted.length, 0);
  assert.equal(cloud.rows.size, 0);
});

test("offline deletion persists its tombstone across reload and remote loading", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore();
  cloud.rows.set(id(1), book(1));
  const first = createLibraryDevice({
    actor: "a",
    storage,
    remote: cloud.remote,
    isCurrent: () => true,
  });
  await first.sync();
  first.remove(id(1));
  const reloaded = createLibraryDevice({
    actor: "a",
    storage,
    remote: {
      ...cloud.remote,
      async remove() {
        throw Error("offline");
      },
    },
    isCurrent: () => true,
  });
  await reloaded.sync();
  assert.equal(reloaded.getSnapshot().books.length, 0);
  assert.deepEqual(reloaded.getSnapshot().deleted, [id(1)]);
  const online = createLibraryDevice({
    actor: "a",
    storage,
    remote: cloud.remote,
    isCurrent: () => true,
  });
  await online.sync();
  assert.equal(cloud.rows.size, 0);
  assert.deepEqual(online.getSnapshot().deleted, []);
});

test("storage failure refuses a new save instead of claiming durable success", async () => {
  let writes = 0;
  const replica = createLibraryDevice({
    actor: "a",
    storage: {
      getItem() {
        return null;
      },
      setItem() {
        throw Error("quota");
      },
    },
    isCurrent: () => true,
    remote: {
      async put() {
        writes++;
        return book(1);
      },
      async load() {
        return [];
      },
      async remove() {},
    },
  });
  assert.throws(() => replica.add(book(1)), /Browser storage/);
  assert.equal(writes, 0);
  assert.deepEqual(replica.getSnapshot().books, []);
});

test("owner envelopes and reading preferences cannot be replayed into another account", () => {
  const storage = deviceStorage();
  const a = createLibraryDevice({ actor: "a", storage, remote: null, isCurrent: () => true });
  a.add(book(1));
  storage.setItem(libraryDeviceKey("b"), storage.getItem(libraryDeviceKey("a")));
  assert.deepEqual(
    createLibraryDevice({ actor: "b", storage, remote: null, isCurrent: () => true }).getSnapshot()
      .books,
    [],
  );
  assert.equal(
    saveLibraryPreferences(storage, "a", {
      selectedId: id(1),
      readStatus: { [id(1)]: "complete" },
    }),
    true,
  );
  assert.equal(readLibraryPreferences(storage, "b"), null);
  assert.equal(readLibraryPreferences(storage, "a").selectedId, id(1));
});

test("cancel and restart supports development remounts without stale acknowledgements", async () => {
  const storage = deviceStorage(),
    cloud = remoteStore();
  const first = deferred();
  let loads = 0;
  const replica = createLibraryDevice({
    actor: "a",
    storage,
    isCurrent: () => true,
    remote: {
      ...cloud.remote,
      async load() {
        loads++;
        return loads === 1 ? first.promise : [book(2)];
      },
    },
  });
  const stale = replica.sync();
  await tick();
  replica.cancel();
  await replica.sync();
  first.resolve([book(1)]);
  await stale;
  assert.deepEqual(
    replica.getSnapshot().books.map((b) => b.id),
    [id(2)],
  );
  assert.equal(replica.getSnapshot().syncing, false);
});

test("a storage-blocked browser can still read cloud books without claiming an offline copy", async () => {
  const cloud = remoteStore();
  cloud.rows.set(id(1), book(1));
  const replica = createLibraryDevice({
    actor: "a",
    storage: {
      getItem() {
        return null;
      },
      setItem() {
        throw Error("quota");
      },
    },
    remote: cloud.remote,
    isCurrent: () => true,
  });
  await replica.sync();
  assert.equal(replica.getSnapshot().books[0].id, id(1));
  assert.match(replica.getSnapshot().error, /Browser storage/);
});
