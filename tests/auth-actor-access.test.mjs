import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthActorAccess } from "../src/lib/auth-actor-access.ts";
import { createDeferredAuthSync } from "../src/lib/deferred-auth-sync.ts";
import { signOutWithDeviceSafety } from "../src/lib/device-sign-out.ts";
import { createLibraryDevice } from "../src/lib/library-device.ts";

for (const profileFails of [false, true]) {
  test(`a profile ${profileFails ? "failure" : "response"} during failed sign-out still releases lesson navigation`, async () => {
    let actor = "learner",
      signingOut = null;
    const access = createAuthActorAccess(
      () => actor,
      () => signingOut,
    );
    let resolveProfile,
      rejectProfile,
      profileReady = null,
      cloudWriter = null;
    const loaded = new Promise((resolve, reject) => {
      resolveProfile = resolve;
      rejectProfile = reject;
    });
    let began;
    const started = new Promise((resolve) => (began = resolve));
    let applied;
    const settled = new Promise((resolve) => (applied = resolve));
    const sync = createDeferredAuthSync({
      reset() {},
      load() {
        began();
        return loaded;
      },
      apply(id) {
        if (access.isCurrentUser(id)) {
          profileReady = id;
          cloudWriter = id;
        }
        applied();
      },
      failed(id) {
        if (access.isCurrentUser(id)) profileReady = id;
        applied();
      },
    });
    sync.handle({ user: { id: actor } });
    await started;
    signingOut = actor;
    const result = await signOutWithDeviceSafety({
      actor,
      storage: null,
      examPending: false,
      confirmDiscard: () => true,
      async signOut() {
        assert.equal(access.canUseReader(actor), false);
        if (profileFails) rejectProfile(Error("profile offline"));
        else resolveProfile({});
        await settled;
        assert.equal(profileReady, actor, "profile must release incoming-link initialization");
        return { error: Error("sign-out offline") };
      },
      onExamDiscardApproved() {},
      clearExamDrafts() {},
    });
    signingOut = null;
    assert.equal(result.signedOut, false);
    assert.equal(access.canUseReader(actor), true);
    assert.equal(cloudWriter, profileFails ? null : actor);
    actor = "other";
    assert.equal(access.isCurrentUser("learner"), false);
    assert.equal(access.canUseReader("learner"), false);
    sync.dispose();
  });
}

test("cancelling sign-out resumes Reader changes without changing profile identity", async () => {
  let pending = null;
  const access = createAuthActorAccess(
    () => "learner",
    () => pending,
  );
  const entries = new Map();
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const device = createLibraryDevice({
    actor: "learner",
    storage,
    remote: null,
    isCurrent: () => access.canUseReader("learner"),
  });
  const book = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "QA",
    section: "custom",
    language: "Spanish",
    targetLabel: "Spanish",
    available: true,
    flag: "",
    sentences: [{ en: "A text", target: "Un texto" }],
  };
  device.add(book);
  pending = "learner";
  const result = await signOutWithDeviceSafety({
    actor: "learner",
    storage,
    examPending: false,
    confirmDiscard() {
      assert.equal(access.isCurrentUser("learner"), true);
      assert.throws(() => device.add(book), /account changed/);
      return false;
    },
    async signOut() {
      assert.fail("cancel must not call SDK");
    },
    onExamDiscardApproved() {},
    clearExamDrafts() {},
  });
  pending = null;
  assert.equal(result.cancelled, true);
  device.add({ ...book, title: "Recovered" });
  assert.equal(device.getSnapshot().books[0].title, "Recovered");
});
