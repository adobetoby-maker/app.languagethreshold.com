import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveNextStep, nextCefrLevel, isLevelComplete } from "../src/lib/grammar-flow.ts";

const L = ["l1", "l2", "l3", "l4"];
const done = (...ids) => Object.fromEntries(ids.map((i) => [i, true]));

describe("grammar progression — canonical order", () => {
  test("middle lesson completed advances to the next canonical lesson", () => {
    const r = resolveNextStep("A1", L, "l2", done("l1", "l2"));
    assert.deepEqual(r, { kind: "next-lesson", lessonId: "l3" });
  });

  test("skips lessons already completed when moving forward", () => {
    const r = resolveNextStep("A1", L, "l1", done("l1", "l2", "l3"));
    assert.deepEqual(r, { kind: "next-lesson", lessonId: "l4" });
  });

  // The bug the review caught: last-in-array is NOT level-complete.
  test("last lesson with earlier work outstanding WRAPS, not level-complete", () => {
    const r = resolveNextStep("A1", L, "l4", done("l1", "l4"));
    assert.deepEqual(r, { kind: "next-lesson", lessonId: "l2" },
      "must wrap to the earliest outstanding lesson, not declare the level done");
  });

  test("display reordering cannot alter progression", () => {
    // LevelSidebar floats module-relevant lessons to the top for display.
    // Progression must read canonical order regardless.
    const displaySorted = ["l4", "l1", "l3", "l2"];
    const canonical = resolveNextStep("A1", L, "l1", done("l1"));
    const viaDisplay = resolveNextStep("A1", displaySorted, "l1", done("l1"));
    assert.deepEqual(canonical, { kind: "next-lesson", lessonId: "l2" });
    assert.notDeepEqual(viaDisplay, canonical,
      "sanity: the two orders genuinely differ, so the canonical-order rule matters");
  });
});

describe("grammar progression — level boundaries", () => {
  test("all complete in A1 yields level-complete with A2", () => {
    const r = resolveNextStep("A1", L, "l4", done(...L));
    assert.deepEqual(r, { kind: "level-complete", nextLevel: "A2" });
  });

  test("all complete in C2 yields course-complete, no fabricated next level", () => {
    const r = resolveNextStep("C2", L, "l4", done(...L));
    assert.deepEqual(r, { kind: "course-complete" });
  });

  test("nextCefrLevel walks the ladder and stops at C2", () => {
    assert.equal(nextCefrLevel("A1"), "A2");
    assert.equal(nextCefrLevel("B2"), "C1");
    assert.equal(nextCefrLevel("C2"), null);
  });
});

describe("grammar progression — degenerate input", () => {
  test("unknown current lesson id falls back safely instead of throwing", () => {
    const r = resolveNextStep("A1", L, "does-not-exist", done("l1"));
    assert.deepEqual(r, { kind: "next-lesson", lessonId: "l2" });
  });

  test("empty level is not reported complete", () => {
    assert.equal(isLevelComplete([], {}), false);
  });

  test("isLevelComplete agrees with resolveNextStep", () => {
    assert.equal(isLevelComplete(L, done(...L)), true);
    assert.equal(isLevelComplete(L, done("l1")), false);
  });
});

// DUO-003 regression suite — covers the four findings repaired in the
// integrate/duo-003-grammar-flow branch.
describe("DUO-003 regression — finding 1: level-complete carries nextLevel", () => {
  test("level-complete result includes the next CEFR level for Start button", () => {
    // The 'Start {nextLevel}' button label and onStartNextLevel callback both read
    // nextStep.nextLevel. If this field is missing, the button would be unlabelled
    // and the callback would receive undefined, reopening Finding 1.
    assert.deepEqual(resolveNextStep("A1", L, "l4", done(...L)), {
      kind: "level-complete",
      nextLevel: "A2",
    });
    assert.deepEqual(resolveNextStep("B2", L, "l4", done(...L)), {
      kind: "level-complete",
      nextLevel: "C1",
    });
    assert.deepEqual(resolveNextStep("C1", L, "l4", done(...L)), {
      kind: "level-complete",
      nextLevel: "C2",
    });
  });

  test("level-complete is NOT returned when any lesson is still outstanding", () => {
    // Guards against showing the 'Start {nextLevel}' panel prematurely.
    // Only a full level completion must trigger it.
    const r = resolveNextStep("B1", L, "l4", done("l4"));
    assert.equal(r.kind, "next-lesson",
      "partial completion (only last lesson done) must not show level-complete");
  });
});

describe("DUO-003 regression — finding 3: course-complete scope vs allLevelsComplete", () => {
  test("course-complete fires only when C2 lessons are all done", () => {
    // Completing all C2 lessons → course-complete; there is no fabricated next level.
    assert.deepEqual(resolveNextStep("C2", L, "l4", done(...L)), { kind: "course-complete" });
  });

  test("course-complete does NOT mean every CEFR level is finished", () => {
    // A learner can jump straight to C2 or finish C2 before A1–C1.
    // isLevelComplete must be checked for EACH level independently to know whether
    // allLevelsComplete is true — the UI copy gate in LessonView.tsx.
    assert.equal(isLevelComplete(L, done(...L)), true, "C2 level is complete");
    assert.equal(isLevelComplete(L, done("l1")), false, "A1 level still has outstanding lessons");
    assert.equal(isLevelComplete([], {}), false,
      "a level with no lessons loaded is never complete — prevents false positive");
  });

  test("isLevelComplete is the single truthful gate for allLevelsComplete copy", () => {
    // LessonView uses CEFR_ORDER.every(lvl => isLevelComplete(...)) to decide
    // between "Grammar path complete" and "C2 complete — explore other levels".
    // Verify that one outstanding lesson in any subset fails the check.
    assert.equal(isLevelComplete(L, done("l1", "l2", "l3")), false,
      "three of four lessons done is not complete");
    assert.equal(isLevelComplete(["x"], done("x")), true,
      "a single-lesson level counts as complete when that lesson is done");
  });
});
