import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSEMBLY_PUZZLES,
  assemblyForModule,
  assemblySlot,
  assemblySlotPoint,
} from "../src/lib/picture-assembly.ts";
import { PICTURE_OBJECTS } from "../src/lib/picture-action.ts";
test("each module gets six distinct real items and six non-overlapping puzzle destinations", () => {
  assert.equal(ASSEMBLY_PUZZLES.length, 73);
  for (const p of ASSEMBLY_PUZZLES) {
    assert.equal(p.items.length, 6);
    assert.equal(new Set(p.items.map((i) => i.object)).size, 6);
    assert.deepEqual(
      p.items.map((i) => i.slot),
      [0, 1, 2, 3, 4, 5],
    );
    for (const i of p.items) {
      assert.ok(PICTURE_OBJECTS[i.object]);
      assert.ok(i.es && i.en);
      assert.equal(assemblySlot(assemblySlotPoint(i.slot)), i.slot);
    }
  }
  for (const pt of [
    { x: 0.01, y: 0.01 },
    { x: 0.5, y: 0.95 },
    { x: NaN, y: 0.4 },
  ])
    assert.equal(assemblySlot(pt), null);
});
test("packing container follows the module and stage aliases share a puzzle", () => {
  for (const [id, kind] of [
    ["soccer", "backpack"],
    ["sport-fishing", "tackle"],
    ["nursing", "worktable"],
    ["electrician", "toolbox"],
  ]) {
    assert.equal(assemblyForModule(id).kind, kind);
    assert.equal(assemblyForModule("master-" + id).id, id);
  }
});
