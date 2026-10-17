import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { preparationMinutes } = await loadModule("src/lib/assessments/preparation.ts");
test("effort disclosure uses authored positive timing without inventing a fallback", () => {
  for (const value of [undefined, null, "15", 0, -1, NaN, Infinity])
    assert.equal(preparationMinutes({ estimatedMinutes: value }, false), null);
  assert.equal(preparationMinutes({ estimatedMinutes: 12.5 }, false), 12.5);
  assert.equal(preparationMinutes({ estimatedMinutes: 12.5 }, true), null);
});
