import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeamCompletionJournal,
  pendingTeamCompletions,
  clearTeamCompletions,
  teamCompletionPrefix,
} from "../src/lib/team-completion-device.ts";
import { saveProfileSnapshot } from "../src/lib/profile-device-snapshot.ts";
const sessions = { "11111111-1111-4111-8111-111111111111": "22222222-2222-4222-8222-222222222222" };
function fixture() {
  const data = new Map();
  let quota = false;
  const storage = {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (quota) throw Error("quota");
      data.set(k, v);
    },
    removeItem: (k) => data.delete(k),
  };
  return {
    data,
    storage,
    quota: (v) => (quota = v),
    journal: (actor = "a", current = () => true) =>
      createTeamCompletionJournal(storage, actor, current),
  };
}
test("durable proof survives a fresh journal and is never replaced by a newer session", () => {
  const f = fixture();
  const old = f.journal().prepare("scope", "roofing", 1, sessions);
  const replacement = {
    "11111111-1111-4111-8111-111111111111": "33333333-3333-4333-8333-333333333333",
  };
  assert.deepEqual(f.journal().prepare("scope", "roofing", 1, replacement), old);
  assert.deepEqual(f.journal().read("scope", 1, "roofing"), [old]);
  assert.deepEqual(f.journal("b").read("scope", 1, "roofing"), []);
  assert.deepEqual(f.journal().read("other", 1, "roofing"), []);
  assert.throws(() => f.journal().read("scope", 1, "landscaping"));
});
test("acknowledgement remains until atomic owned profile proves local credit; pending proof is never inferred accepted", () => {
  const f = fixture();
  const record = f.journal().prepare("scope", "roofing", 1, sessions);
  saveProfileSnapshot(f.storage, "a", { lessonProgress: { scope: 1 } });
  assert.equal(f.journal().read("scope", 1, "roofing").length, 1);
  assert.equal(pendingTeamCompletions(f.storage, "a").count, 1);
  f.journal().acknowledge(record);
  saveProfileSnapshot(f.storage, "b", { lessonProgress: { scope: 9 } });
  saveProfileSnapshot(f.storage, "a", { lessonProgress: { scope: 0 } });
  assert.equal(f.journal().read("scope", 1, "roofing")[0].phase, "acknowledged");
  assert.equal(pendingTeamCompletions(f.storage, "a").count, 1);
  saveProfileSnapshot(f.storage, "a", { lessonProgress: { scope: 1 } });
  const before = f.data.size;
  assert.equal(pendingTeamCompletions(f.storage, "a").count, 0);
  assert.equal(f.data.size, before);
  assert.deepEqual(f.journal().read("scope", 1, "roofing"), []);
});
test("corrupt data and changed proof fail closed without overwriting original bytes", () => {
  const f = fixture();
  const record = f.journal().prepare("scope", "roofing", 1, sessions);
  const key = teamCompletionPrefix("a") + record.id;
  const raw = f.data.get(key);
  assert.throws(() => f.journal().acknowledge({ ...record, moduleId: "landscaping" }));
  assert.equal(f.data.get(key), raw);
  f.data.set(key, "{broken");
  assert.throws(() => f.journal().prepare("scope", "roofing", 1, sessions));
  assert.deepEqual(pendingTeamCompletions(f.storage, "a"), { count: 0, unreadable: true });
  assert.equal(f.data.get(key), "{broken");
});
test("cancelled owner and quota failure cannot silently replace or acknowledge proof", () => {
  const f = fixture();
  assert.throws(() => f.journal("a", () => false).prepare("scope", "roofing", 1, sessions), {
    name: "AbortError",
  });
  assert.equal(f.data.size, 0);
  f.quota(true);
  assert.throws(() => f.journal().prepare("scope", "roofing", 1, sessions));
  assert.equal(f.data.size, 0);
  f.quota(false);
  const record = f.journal().prepare("scope", "roofing", 1, sessions);
  const raw = [...f.data.values()][0];
  f.quota(true);
  assert.throws(() => f.journal().acknowledge(record));
  assert.equal([...f.data.values()][0], raw);
  assert.equal(f.journal().read("scope", 1, "roofing")[0].phase, "pending");
  assert.throws(() =>
    createTeamCompletionJournal(null, "a", () => true).read("scope", 1, "roofing"),
  );
});
test("bounded requests validate session proof and retain all prior records on overflow", () => {
  const f = fixture();
  for (const invalid of [{}, { org: "synthetic" }, []])
    assert.throws(() => f.journal().prepare("scope", "roofing", 1, invalid));
  for (let n = 1; n <= 50; n++) f.journal().prepare("scope", "roofing", n, sessions);
  const before = [...f.data];
  assert.throws(() => f.journal().prepare("scope", "roofing", 51, sessions));
  assert.deepEqual([...f.data], before);
  assert.equal(f.journal().prepare("scope", "roofing", 1, sessions).lessonNumber, 1);
});
test("explicit discard removes only selected account including unreadable records", () => {
  const f = fixture();
  f.journal().prepare("scope", "roofing", 1, sessions);
  f.journal("b").prepare("scope", "roofing", 1, sessions);
  f.data.set(teamCompletionPrefix("a") + "broken", "broken");
  f.data.set("legacy", "retained");
  assert.equal(clearTeamCompletions(f.storage, "a"), true);
  assert.equal(f.journal("b").read("scope", 1, "roofing").length, 1);
  assert.equal(f.data.get("legacy"), "retained");
  assert.equal(pendingTeamCompletions(f.storage, "a").count, 0);
});
