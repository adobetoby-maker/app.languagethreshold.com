import assert from "node:assert/strict";
import { test } from "node:test";
import {
  profileSnapshotKey,
  readProfileSnapshot,
  saveProfileSnapshot,
  hasUnassignedProfileSnapshot,
  inspectProfileSnapshot,
} from "../src/lib/profile-device-snapshot.ts";
import { createDeferredAuthSync } from "../src/lib/deferred-auth-sync.ts";

function device() {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}
const turn = () => new Promise((resolve) => setTimeout(resolve, 10));

test("inspection distinguishes missing data from denied or invalid data without exposing a foreign envelope", () => {
  const storage = device();
  assert.deepEqual(inspectProfileSnapshot(storage, "a"), { status: "absent" });
  assert.deepEqual(inspectProfileSnapshot(null, "a"), { status: "unreadable" });
  storage.setItem(
    profileSnapshotKey("a"),
    JSON.stringify({ schema: 1, userId: "b", data: { privateNote: "other learner" } }),
  );
  assert.deepEqual(inspectProfileSnapshot(storage, "a"), { status: "unreadable" });
  storage.entries.delete(profileSnapshotKey("a"));
  saveProfileSnapshot(storage, "a", { xp: 3 });
  assert.deepEqual(inspectProfileSnapshot(storage, "a"), { status: "ready", data: { xp: 3 } });
});

test("ordinary persistence retains unreadable or mismatched device envelopes instead of replacing them", () => {
  for (const actor of [null, "a", "b"]) {
    for (const raw of [
      "",
      "broken",
      "null",
      "[]",
      JSON.stringify({ schema: 2, userId: actor, data: { xp: 80 } }),
      JSON.stringify({ schema: 1, userId: "foreign", data: { xp: 80 } }),
      JSON.stringify({ schema: 1, userId: actor, data: [] }),
      "x".repeat(8 * 1024 * 1024 + 1),
    ]) {
      const storage = device(),
        key = profileSnapshotKey(actor);
      storage.setItem(key, raw);
      // AppProvider sees no usable snapshot and hydrates defaults. Its normal writer must preserve the original.
      assert.equal(readProfileSnapshot(storage, actor), null);
      assert.equal(saveProfileSnapshot(storage, actor, { xp: 0, userNotes: [] }), false);
      assert.equal(storage.getItem(key), raw);
    }
  }
});
test("a denied read cannot be treated as an empty slot even when writes are permitted", () => {
  let writes = 0;
  const storage = {
    getItem() {
      throw Error("read denied");
    },
    setItem() {
      writes++;
    },
  };
  assert.equal(saveProfileSnapshot(storage, "a", { xp: 0 }), false);
  assert.equal(writes, 0);
});
test("writer rechecks ownership and validity after an earlier successful restore", () => {
  const storage = device();
  saveProfileSnapshot(storage, "a", { xp: 10 });
  assert.equal(readProfileSnapshot(storage, "a").xp, 10);
  const replacement = JSON.stringify({ schema: 1, userId: "b", data: { xp: 90 } });
  storage.setItem(profileSnapshotKey("a"), replacement);
  assert.equal(saveProfileSnapshot(storage, "a", { xp: 11 }), false);
  assert.equal(storage.getItem(profileSnapshotKey("a")), replacement);
});
test("valid same-actor writes still update while guest, other-account and legacy bytes remain untouched", () => {
  const storage = device();
  saveProfileSnapshot(storage, null, { xp: 1 });
  saveProfileSnapshot(storage, "b", { xp: 2 });
  storage.setItem("lt.app.v2", "old unassigned bytes");
  const untouched = new Map(storage.entries);
  assert.equal(saveProfileSnapshot(storage, "a", { xp: 3 }), true);
  assert.equal(saveProfileSnapshot(storage, "a", { xp: 4, userNotes: [] }), true);
  assert.equal(readProfileSnapshot(storage, "a").xp, 4);
  for (const [k, v] of untouched) assert.equal(storage.getItem(k), v);
});
test("outgoing invalid envelopes, serialization errors and quota failures do not damage an existing profile", () => {
  const storage = device();
  saveProfileSnapshot(storage, "a", { xp: 12 });
  const original = storage.getItem(profileSnapshotKey("a"));
  const circular = {};
  circular.self = circular;
  for (const value of [
    null,
    [],
    {
      toJSON() {
        return null;
      },
    },
    circular,
  ]) {
    assert.equal(saveProfileSnapshot(storage, "a", value), false);
    assert.equal(storage.getItem(profileSnapshotKey("a")), original);
  }
  const failing = {
    ...storage,
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(saveProfileSnapshot(failing, "a", { xp: 13 }), false);
  assert.equal(storage.getItem(profileSnapshotKey("a")), original);
});

test("guest and two learners restore only their own device progress", () => {
  const storage = device();
  for (const [actor, xp] of [
    [null, 12],
    ["learner-a", 40],
    ["learner-b", 7],
  ])
    assert.equal(saveProfileSnapshot(storage, actor, { xp, notes: [actor] }), true);
  assert.deepEqual(readProfileSnapshot(storage, "learner-b"), { xp: 7, notes: ["learner-b"] });
  assert.deepEqual(readProfileSnapshot(storage, null), { xp: 12, notes: [null] });
  assert.deepEqual(readProfileSnapshot(storage, "learner-a"), { xp: 40, notes: ["learner-a"] });
  assert.equal(readProfileSnapshot(storage, "new-learner"), null);
});

test("mismatched account envelopes are refused and retained for recovery", () => {
  const storage = device();
  saveProfileSnapshot(storage, "a", { xp: 900 });
  const raw = storage.getItem(profileSnapshotKey("a"));
  storage.setItem(profileSnapshotKey("b"), raw);
  assert.equal(readProfileSnapshot(storage, "b"), null);
  assert.equal(storage.getItem(profileSnapshotKey("b")), raw);
});

test("unowned legacy progress is never assigned to a guest or signed-in learner", () => {
  const storage = device();
  for (const key of ["lt.app", "lt.app.v1", "lt.app.v2"])
    storage.setItem(key, JSON.stringify({ xp: 900, notes: ["unknown owner"] }));
  const before = new Map(storage.entries);
  assert.equal(hasUnassignedProfileSnapshot(storage), true);
  assert.equal(readProfileSnapshot(storage, null), null);
  assert.equal(readProfileSnapshot(storage, "a"), null);
  saveProfileSnapshot(storage, "a", { xp: 0 });
  for (const [key, value] of before) assert.equal(storage.getItem(key), value);
});

test("corrupt, unsupported, and oversized snapshots fail closed without deletion", () => {
  const storage = device();
  for (const raw of [
    "broken",
    "null",
    JSON.stringify({ schema: 2, userId: "a", data: {} }),
    JSON.stringify({ schema: 1, userId: "a", data: [] }),
    "x".repeat(8 * 1024 * 1024 + 1),
  ]) {
    storage.setItem(profileSnapshotKey("a"), raw);
    assert.equal(readProfileSnapshot(storage, "a"), null);
    assert.equal(storage.getItem(profileSnapshotKey("a")), raw);
  }
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(readProfileSnapshot(blocked, "a"), null);
  assert.equal(saveProfileSnapshot(blocked, "a", {}), false);
  assert.equal(hasUnassignedProfileSnapshot(blocked), false);
  assert.equal(saveProfileSnapshot(null, "a", {}), false);
});

test("a stale cloud read cannot merge account A into B's restored snapshot", async () => {
  const storage = device();
  saveProfileSnapshot(storage, "a", { xp: 50 });
  saveProfileSnapshot(storage, "b", { xp: 2 });
  let state;
  const pending = new Map();
  const sync = createDeferredAuthSync({
    reset() {},
    load: (id) => new Promise((resolve) => pending.set(id, resolve)),
    apply(id, remote) {
      const local = readProfileSnapshot(storage, id);
      state = { actor: id, xp: Math.max(local.xp, remote.xp) };
      saveProfileSnapshot(storage, id, { xp: state.xp });
    },
  });
  sync.handle({ user: { id: "a" } });
  await turn();
  sync.handle(null);
  sync.handle({ user: { id: "b" } });
  await turn();
  pending.get("b")({ xp: 3 });
  pending.get("a")({ xp: 500 });
  await turn();
  assert.deepEqual(state, { actor: "b", xp: 3 });
  assert.equal(readProfileSnapshot(storage, "a").xp, 50);
  assert.equal(readProfileSnapshot(storage, "b").xp, 3);
  sync.dispose();
});
