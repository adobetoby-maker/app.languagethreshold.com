import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { nextSectionSelection } from "../src/state/section-selection.ts";

const AVAILABLE = ["vocab", "verbs", "nouns", "pronouns", "grammar"];

describe("study-section selection (F3)", () => {
  test("F3: the reported case — tapping vocab from the default state FOCUSES it", () => {
    // Codex observed: deck 95 -> 94, saved word removed, core cards left visible.
    const next = nextSectionSelection(AVAILABLE, "vocab", AVAILABLE);
    assert.deepEqual(next, ["vocab"], "focuses the tapped section");
    assert.ok(next.includes("vocab"), "the learner's saved words are INCLUDED, not dropped");
  });

  test("F3: previously this removed it — guard against regressing to plain toggle", () => {
    const plainToggle = AVAILABLE.filter((c) => c !== "vocab");
    const next = nextSectionSelection(AVAILABLE, "vocab", AVAILABLE);
    assert.notDeepEqual(next, plainToggle, "must not subtract on the first tap");
  });

  test("mixing still works after focusing", () => {
    let sel = nextSectionSelection(AVAILABLE, "vocab", AVAILABLE);
    sel = nextSectionSelection(sel, "verbs", AVAILABLE);
    assert.deepEqual(sel, ["vocab", "verbs"], "second tap adds");
    sel = nextSectionSelection(sel, "nouns", AVAILABLE);
    assert.deepEqual(sel, ["vocab", "verbs", "nouns"]);
  });

  test("removing a section from a mixed selection still subtracts", () => {
    const sel = nextSectionSelection(["vocab", "verbs"], "verbs", AVAILABLE);
    assert.deepEqual(sel, ["vocab"]);
  });

  test("deselecting the last section returns to everything, never an empty deck", () => {
    const sel = nextSectionSelection(["vocab"], "vocab", AVAILABLE);
    assert.deepEqual(sel, AVAILABLE, "empty deck is never a useful answer");
  });

  test("topic blocks can be mixed in without triggering focus", () => {
    const sel = nextSectionSelection(["vocab"], "block:medical", AVAILABLE);
    assert.deepEqual(sel, ["vocab", "block:medical"]);
  });

  test("empty available set does not throw or focus spuriously", () => {
    assert.deepEqual(nextSectionSelection([], "vocab", []), ["vocab"]);
  });
});
