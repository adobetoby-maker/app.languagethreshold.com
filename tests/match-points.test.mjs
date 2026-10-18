import test from "node:test";
import assert from "node:assert/strict";
import { applyPracticePoints as project } from "../src/lib/practice-points.ts";
import { loadModule } from "./helpers/bundle.mjs";
const { RANK_ORDER, POINTS_PER_TIER, POINTS_WIN, POINTS_LOSS } = await loadModule(
  "src/state/match-state.tsx",
  {
    stubs: [/^@\/hooks\/use-learner-device-store$/],
  },
);
const applyPracticePoints = (tier, points, delta) =>
  project(tier, points, delta, RANK_ORDER, POINTS_PER_TIER);

test("practice losses report only points that can actually be removed, without demotion", () => {
  assert.deepEqual(applyPracticePoints("Bronze", 0, -POINTS_LOSS), {
    tier: "Bronze",
    points: 0,
    appliedDelta: 0,
  });
  assert.deepEqual(applyPracticePoints("Gold", 2, -POINTS_LOSS), {
    tier: "Gold",
    points: 0,
    appliedDelta: -2,
  });
  assert.deepEqual(applyPracticePoints("Gold", 30, -POINTS_LOSS), {
    tier: "Gold",
    points: 27,
    appliedDelta: -3,
  });
});

test("wins retain overflow through a practice tier and report the actual maximum cap", () => {
  assert.deepEqual(applyPracticePoints("Bronze", 95, POINTS_WIN), {
    tier: "Silver",
    points: 5,
    appliedDelta: 10,
  });
  assert.deepEqual(applyPracticePoints("Champion", 95, POINTS_WIN), {
    tier: "Unreal",
    points: 5,
    appliedDelta: 10,
  });
  assert.deepEqual(applyPracticePoints("Unreal", 97, POINTS_WIN), {
    tier: "Unreal",
    points: 100,
    appliedDelta: 3,
  });
  assert.deepEqual(applyPracticePoints("Unreal", 100, POINTS_WIN), {
    tier: "Unreal",
    points: 100,
    appliedDelta: 0,
  });
});

test("shown practice deltas equal the stored total change at every valid tier balance", () => {
  const total = (value) => RANK_ORDER.indexOf(value.tier) * POINTS_PER_TIER + value.points;
  for (const tier of RANK_ORDER) {
    for (let points = 0; points <= POINTS_PER_TIER; points++) {
      for (const delta of [POINTS_WIN, -POINTS_LOSS, 0]) {
        const before = { tier, points };
        const after = applyPracticePoints(tier, points, delta);
        const expectedTotal =
          delta < 0
            ? Math.max(RANK_ORDER.indexOf(tier) * POINTS_PER_TIER, total(before) + delta)
            : Math.min(RANK_ORDER.length * POINTS_PER_TIER, total(before) + delta);
        assert.equal(total(after), expectedTotal);
        assert.equal(after.appliedDelta, total(after) - total(before));
        assert.ok(after.points >= 0 && after.points <= POINTS_PER_TIER);
        assert.ok(
          delta < 0
            ? after.tier === tier
            : RANK_ORDER.indexOf(after.tier) >= RANK_ORDER.indexOf(tier),
        );
        if (delta === 0) assert.deepEqual(after, { ...before, appliedDelta: 0 });
      }
    }
  }
});
