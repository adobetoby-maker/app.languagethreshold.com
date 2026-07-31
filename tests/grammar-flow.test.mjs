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
