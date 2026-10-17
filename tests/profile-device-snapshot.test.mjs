import assert from "node:assert/strict";
import { test } from "node:test";
import {
  profileSnapshotKey,
  readProfileSnapshot,
  saveProfileSnapshot,
  hasUnassignedProfileSnapshot,
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
