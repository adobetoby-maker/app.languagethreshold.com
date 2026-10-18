import assert from "node:assert/strict";
import { test } from "node:test";
import { signOutWithDeviceSafety } from "../src/lib/device-sign-out.ts";
import {
  createLibraryDevice,
  libraryDeviceKey,
  pendingLibraryChanges,
  readLibraryPreferences,
  clearLibraryDeviceForUser,
} from "../src/lib/library-device.ts";
const id = "00000000-0000-4000-8000-000000000001";
const book = {
  id,
  title: "QA device text",
  section: "custom",
  language: "Spanish",
  targetLabel: "Spanish",
  available: true,
  flag: "",
  sentences: [{ en: "A text", target: "Un texto" }],
};
function storage() {
  const entries = new Map();
  return {
    entries,
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => entries.set(k, v),
    removeItem: (k) => entries.delete(k),
  };
}
function setup() {
  const disk = storage();
  const device = createLibraryDevice({
    actor: "a",
    storage: disk,
    remote: null,
    isCurrent: () => true,
  });
  device.add(book);
  device.savePreferences({ selectedId: id });
  const calls = [];
  return {
    disk,
    device,
    calls,
    options: {
      actor: "a",
      storage: disk,
      examPending: false,
      confirmDiscard: (message) => {
        calls.push({ confirm: message });
        return true;
      },
      signOut: async () => {
        calls.push("sdk");
        return { error: null };
      },
      onExamDiscardApproved: () => calls.push("examApproved"),
      clearExamDrafts: () => calls.push("clearExams"),
    },
  };
}

test("cancelled Reader loss warning keeps the session and durable queue untouched", async () => {
  const { disk, options, calls } = setup(),
    before = new Map(disk.entries);
  const result = await signOutWithDeviceSafety({
    ...options,
    confirmDiscard: (message) => {
      assert.match(message, /Reader texts or library changes/);
      return false;
    },
  });
  assert.equal(result.cancelled, true);
  assert.deepEqual(calls, []);
  assert.deepEqual(disk.entries, before);
});
test("approved sign-out clears only that account cache/preferences after SDK success", async () => {
  const { disk, options, calls } = setup();
  disk.setItem("lt.library.custom.v1", "unknown legacy");
  const guest = createLibraryDevice({
    actor: null,
    storage: disk,
    remote: null,
    isCurrent: () => true,
  });
  guest.add(book);
  const other = createLibraryDevice({
    actor: "b",
    storage: disk,
    remote: null,
    isCurrent: () => true,
  });
  other.add(book);
  const untouched = ["lt.library.custom.v1", libraryDeviceKey(null), libraryDeviceKey("b")].map(
    (k) => [k, disk.getItem(k)],
  );
  const result = await signOutWithDeviceSafety(options);
  assert.equal(result.signedOut, true);
  assert.equal(result.cleanupComplete, true);
  assert.equal(disk.getItem(libraryDeviceKey("a")), null);
  assert.equal(readLibraryPreferences(disk, "a"), null);
  assert.equal(calls[1], "sdk");
  assert.equal(calls[2], "clearExams");
  for (const [k, v] of untouched) assert.equal(disk.getItem(k), v);
});
test("SDK rejection and thrown network failure preserve recoverable Reader work", async () => {
  for (const signOut of [
    async () => ({ error: Error("offline") }),
    async () => {
      throw Error("offline");
    },
  ]) {
    const { disk, options } = setup(),
      before = new Map(disk.entries);
    const result = await signOutWithDeviceSafety({ ...options, signOut });
    assert.equal(result.signedOut, false);
    assert.equal(result.cancelled, false);
    assert.deepEqual(disk.entries, before);
  }
});
test("exams and Reader share one loss confirmation and exam approval precedes SDK", async () => {
  const { options, calls } = setup();
  await signOutWithDeviceSafety({ ...options, examPending: true });
  assert.match(calls[0].confirm, /exam answers or recordings and Reader/);
  assert.deepEqual(calls.slice(1), ["examApproved", "sdk", "clearExams"]);
});
test("signing out other devices never prompts or clears this device", async () => {
  const { disk, options, calls } = setup(),
    before = new Map(disk.entries);
  const result = await signOutWithDeviceSafety({ ...options, scope: "others", examPending: true });
  assert.equal(result.signedOut, true);
  assert.deepEqual(calls, ["sdk"]);
  assert.deepEqual(disk.entries, before);
});
test("an unreadable owned cache requires explicit approval before cleanup", async () => {
  const { disk, options, calls } = setup();
  disk.setItem(libraryDeviceKey("a"), "unreadable saved changes");
  const result = await signOutWithDeviceSafety({
    ...options,
    confirmDiscard: (message) => {
      assert.match(message, /could not check/);
      return false;
    },
  });
  assert.equal(result.cancelled, true);
  assert.equal(disk.getItem(libraryDeviceKey("a")), "unreadable saved changes");
  assert.deepEqual(calls, []);
});
test("cleanup invalidates old account replicas before they can rewrite cleared books or preferences", async () => {
  const { disk, device, options } = setup();
  await signOutWithDeviceSafety(options);
  assert.throws(() => device.add({ ...book, title: "late result" }), /account changed/);
  assert.equal(device.savePreferences({ selectedId: "late" }), false);
  assert.equal(disk.getItem(libraryDeviceKey("a")), null);
  const newSession = createLibraryDevice({
    actor: "a",
    storage: disk,
    remote: null,
    isCurrent: () => true,
  });
  newSession.add(book);
  assert.equal(pendingLibraryChanges(disk, "a").count, 1);
  assert.equal(newSession.getSnapshot().books[0].id, id);
});
test("a successful in-flight upload cannot recreate the cache after explicit sign-out", async () => {
  const disk = storage();
  let resolve;
  const late = new Promise((r) => (resolve = r));
  let loads = 0;
  const device = createLibraryDevice({
    actor: "a",
    storage: disk,
    isCurrent: () => true,
    remote: {
      async put() {
        return late;
      },
      async load() {
        loads++;
        return [book];
      },
      async remove() {},
    },
  });
  device.add(book);
  const flight = device.sync();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(clearLibraryDeviceForUser(disk, "a"), true);
  resolve(book);
  await flight;
  assert.equal(loads, 0);
  assert.equal(disk.getItem(libraryDeviceKey("a")), null);
});
test("unexpected identity loss preserves Reader work for reauthentication", async () => {
  const { disk, device } = setup(),
    before = disk.getItem(libraryDeviceKey("a"));
  device.cancel();
  assert.equal(disk.getItem(libraryDeviceKey("a")), before);
  const restored = createLibraryDevice({
    actor: "a",
    storage: disk,
    remote: null,
    isCurrent: () => true,
  });
  assert.deepEqual(restored.getSnapshot().pending, [id]);
  assert.equal(
    createLibraryDevice({
      actor: "b",
      storage: disk,
      remote: null,
      isCurrent: () => true,
    }).getSnapshot().books.length,
    0,
  );
});
test("browser cleanup failure reports incomplete cleanup without pretending sign-out failed", async () => {
  const { disk, options } = setup();
  const result = await signOutWithDeviceSafety({
    ...options,
    storage: {
      ...disk,
      removeItem() {
        throw Error("blocked");
      },
    },
  });
  assert.equal(result.signedOut, true);
  assert.equal(result.cleanupComplete, false);
});
test("exam cleanup failure does not prevent owned Reader cleanup", async () => {
  const { disk, options } = setup();
  const result = await signOutWithDeviceSafety({
    ...options,
    clearExamDrafts() {
      throw Error("blocked");
    },
  });
  assert.equal(result.signedOut, true);
  assert.equal(result.cleanupComplete, false);
  assert.equal(disk.getItem(libraryDeviceKey("a")), null);
});
test("a fully synced Reader cache needs no loss prompt and cloud records are untouched", async () => {
  const disk = storage();
  const rows = new Map([[id, book]]);
  let writes = 0;
  const device = createLibraryDevice({
    actor: "a",
    storage: disk,
    isCurrent: () => true,
    remote: {
      async load() {
        return [...rows.values()];
      },
      async put(entry) {
        writes++;
        return entry;
      },
      async remove() {
        writes++;
      },
    },
  });
  await device.sync();
  const result = await signOutWithDeviceSafety({
    actor: "a",
    storage: disk,
    examPending: false,
    confirmDiscard() {
      assert.fail("no unsynced changes");
    },
    async signOut() {
      return { error: null };
    },
    onExamDiscardApproved() {},
    clearExamDrafts() {},
  });
  assert.equal(result.cleanupComplete, true);
  assert.equal(writes, 0);
  assert.equal(rows.size, 1);
});

test("a full browser can free approved owned cache space and then invalidate old tabs", async () => {
  const { disk, device, options } = setup();
  const full = {
    ...disk,
    setItem(key, value) {
      if (key.endsWith(".epoch") && disk.getItem(libraryDeviceKey("a"))) throw Error("quota");
      disk.setItem(key, value);
    },
  };
  const result = await signOutWithDeviceSafety({ ...options, storage: full });
  assert.equal(result.cleanupComplete, true);
  assert.equal(disk.getItem(libraryDeviceKey("a")), null);
  assert.throws(() => device.add(book), /account changed/);
});

test("pending completion loss requires approval and SDK success before account-scoped discard", async () => {
  const { createTeamCompletionJournal, pendingTeamCompletions } =
    await import("../src/lib/team-completion-device.ts");
  const { discardPrivateLearningDrafts } = await import("../src/lib/private-draft-discard.ts");
  for (const outcome of ["cancel", "failure", "others", "success"]) {
    const { disk, options } = setup();
    Object.defineProperty(disk, "length", { get: () => disk.entries.size });
    disk.key = (i) => [...disk.entries.keys()][i] ?? null;
    const sessions = {
      "11111111-1111-4111-8111-111111111111": "22222222-2222-4222-8222-222222222222",
    };
    for (const actor of ["a", "b"])
      createTeamCompletionJournal(disk, actor, () => true).prepare("scope", "roofing", 1, sessions);
    let sdkCalls = 0,
      prompts = 0;
    const result = await signOutWithDeviceSafety({
      ...options,
      scope: outcome === "others" ? "others" : "local",
      completionPending: true,
      confirmDiscard: (message) => {
        prompts++;
        assert.match(message, /pending team lesson completions/);
        return outcome !== "cancel";
      },
      signOut: async () => {
        sdkCalls++;
        return { error: outcome === "failure" ? Error("offline") : null };
      },
      clearExamDrafts: () => assert.equal(discardPrivateLearningDrafts(disk, "a"), true),
    });
    assert.equal(prompts, outcome === "others" ? 0 : 1);
    assert.equal(sdkCalls, outcome === "cancel" ? 0 : 1);
    assert.equal(pendingTeamCompletions(disk, "a").count, outcome === "success" ? 0 : 1);
    assert.equal(pendingTeamCompletions(disk, "b").count, 1);
    assert.equal(result.signedOut, ["success", "others"].includes(outcome));
  }
});
