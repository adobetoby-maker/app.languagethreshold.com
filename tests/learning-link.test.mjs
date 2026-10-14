import assert from "node:assert/strict";
import { test } from "node:test";
import { learningLinkIdentity } from "../src/lib/learning-link.ts";

const ready = {
  hydrated: true,
  authLoading: false,
  userId: "learner",
  profileReadyUserId: "learner",
  appliedFor: null,
};

test("an assigned Roofing link waits until profile restoration cannot overwrite it", () => {
  assert.equal(learningLinkIdentity({ ...ready, hydrated: false }), null);
  assert.equal(learningLinkIdentity({ ...ready, authLoading: true }), null);
  assert.equal(learningLinkIdentity({ ...ready, profileReadyUserId: null }), null);
  assert.equal(learningLinkIdentity(ready), "learner");
});

test("the assignment link applies once and does not prevent later module choices", () => {
  assert.equal(learningLinkIdentity({ ...ready, appliedFor: "learner" }), null);
});

test("guest links still open without an account", () => {
  assert.equal(learningLinkIdentity({ ...ready, userId: null, profileReadyUserId: null }), "guest");
});

test("signing in after following a guest link reapplies it after cloud restoration", () => {
  assert.equal(
    learningLinkIdentity({ ...ready, appliedFor: "guest", profileReadyUserId: null }),
    null,
  );
  assert.equal(learningLinkIdentity({ ...ready, appliedFor: "guest" }), "learner");
});

test("a previous account's restoration cannot authorize the new account's link", () => {
  assert.equal(learningLinkIdentity({ ...ready, profileReadyUserId: "old-learner" }), null);
});
