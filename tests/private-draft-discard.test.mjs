import test from "node:test";
import assert from "node:assert/strict";
import {
  discardPrivateLearningDrafts,
  privateDraftDiscardActor,
} from "../src/lib/private-draft-discard.ts";
import { examDraftKey, saveExamDraft, readExamDraft } from "../src/lib/assessments/drafts.ts";
import {
  lessonDraftKey,
  saveLessonDraft,
  readLessonDraft,
  hasUnsyncedLessonDrafts,
  lessonPositionKey,
  saveLessonPosition,
} from "../src/lib/lesson-drafts.ts";
import { createAuthActorAccess } from "../src/lib/auth-actor-access.ts";
const storage = () => {
  const values = new Map();
  return {
    values,
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
const exam = {
  formId: "qa",
  revision: 1,
  index: 0,
  sequence: 1,
  pending: { item: { answer: { inputMethod: "typed", text: "QA pending" }, edit: 1 } },
  flight: null,
  savedAt: "now",
};
const lesson = {
  version: "qa",
  text: "QA lesson",
  ink: null,
  transcript: "",
  checks: [],
  savedAt: "now",
};
test("an explicit discard removes only the approved account and publishes a bounded cross-tab notice", () => {
  const s = storage();
  for (const actor of ["owner", "other"]) {
    saveExamDraft(s, examDraftKey(actor, "attempt"), exam);
    saveLessonDraft(s, lessonDraftKey(actor, "lesson", "write"), lesson);
  }
  s.setItem("lt.library.custom.v1", "unassigned legacy");
  assert.equal(discardPrivateLearningDrafts(s, "owner"), true);
  assert.equal(readExamDraft(s, examDraftKey("owner", "attempt")), null);
  assert.equal(readLessonDraft(s, lessonDraftKey("owner", "lesson", "write")), null);
  assert.equal(
    readExamDraft(s, examDraftKey("other", "attempt")).pending.item.answer.text,
    "QA pending",
  );
  assert.equal(s.getItem("lt.library.custom.v1"), "unassigned legacy");
  const marker = [...s.values].find(([key]) => key.startsWith("lt.privateDraftDiscard.v1."));
  assert.equal(privateDraftDiscardActor(...marker), "owner");
  assert.equal(privateDraftDiscardActor(marker[0], null), null);
  assert.equal(privateDraftDiscardActor("other-key", "notice"), null);
  assert.equal(privateDraftDiscardActor("lt.privateDraftDiscard.v1.%", "notice"), null);
});
test("full storage retries its discard marker after freeing the approved draft, and removal failure stays unconfirmed", () => {
  const s = storage();
  saveExamDraft(s, examDraftKey("quota-owner", "a"), exam);
  const write = s.setItem;
  s.setItem = (key, value) => {
    if (key.startsWith("lt.privateDraftDiscard") && s.values.has(examDraftKey("quota-owner", "a")))
      throw Error("quota");
    write(key, value);
  };
  assert.equal(discardPrivateLearningDrafts(s, "quota-owner"), true);
  const blocked = storage();
  saveLessonDraft(blocked, lessonDraftKey("blocked-owner", "lesson", "type"), lesson);
  blocked.removeItem = () => {
    throw Error("blocked");
  };
  assert.equal(discardPrivateLearningDrafts(blocked, "blocked-owner"), false);
});
test("lesson-loss warnings ignore browsing position and other accounts but include typed or handwritten work", () => {
  const s = storage();
  saveLessonPosition(s, lessonPositionKey("learner", "roofing", "Spanish", "English"), {
    lesson: 2,
    way: "write",
    at: "now",
  });
  saveLessonDraft(s, lessonDraftKey("other", "a", "write"), lesson);
  assert.equal(hasUnsyncedLessonDrafts(s, "learner"), false);
  saveLessonDraft(s, lessonDraftKey("learner", "a", "write"), { ...lesson, text: "", ink: "aW5r" });
  assert.equal(hasUnsyncedLessonDrafts(s, "learner"), true);
});
test("an earlier identity lease never becomes valid again after same-account re-authentication", () => {
  let actor = "learner",
    version = 1;
  const previous = createAuthActorAccess(
    () => actor,
    () => null,
    { version, current: () => version },
  );
  assert.equal(previous.isCurrentUser("learner"), true);
  actor = null;
  version++;
  assert.equal(previous.isCurrentUser("learner"), false);
  actor = "learner";
  version++;
  assert.equal(previous.isCurrentUser("learner"), false);
  const current = createAuthActorAccess(
    () => actor,
    () => null,
    { version, current: () => version },
  );
  assert.equal(current.isCurrentUser("learner"), true);
});
