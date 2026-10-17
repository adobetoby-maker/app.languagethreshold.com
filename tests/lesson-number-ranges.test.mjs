import test from "node:test";
import assert from "node:assert/strict";
import { lessonNumberRanges } from "../src/lib/lesson-number-ranges.ts";
test("consecutive gaps compact without losing isolated lessons or duplicates", () => {
  const input = [30, 2, 3, 4, 5, 9, 12, 10, 11, 30];
  assert.equal(lessonNumberRanges(input), "2–5, 9–12, 30");
  assert.deepEqual(input, [30, 2, 3, 4, 5, 9, 12, 10, 11, 30]);
});
test("actual all-missing, short-module and empty gaps remain clear", () => {
  assert.equal(lessonNumberRanges(Array.from({ length: 29 }, (_, index) => index + 2)), "2–30");
  assert.equal(lessonNumberRanges(Array.from({ length: 15 }, (_, index) => index + 16)), "16–30");
  assert.equal(lessonNumberRanges([1]), "1");
  assert.equal(lessonNumberRanges([]), "");
});
