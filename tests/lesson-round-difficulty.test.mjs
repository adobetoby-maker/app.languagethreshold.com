import assert from "node:assert/strict";
import test from "node:test";
import { splitRounds } from "../src/lib/lesson-practice.ts";
test("lesson-sized matching rounds retain every term once without singleton rounds", () => {
  for (const limit of [3, 4, 6, 8])
    for (let n = 2; n <= 40; n++) {
      const words = Array.from({ length: n }, (_, i) => i);
      const rounds = splitRounds(words, limit);
      assert.deepEqual(rounds.flat(), words);
      assert.ok(
        rounds.every((round) => round.length >= 2 && round.length <= limit),
        `${n} words / limit ${limit}`,
      );
    }
  assert.throws(() => splitRounds([1, 2, 3], 2));
  assert.throws(() => splitRounds([1, 2, 3], Number.NaN));
});
