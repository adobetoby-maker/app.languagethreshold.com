import assert from "node:assert/strict";
import { test } from "node:test";
import { teamPeriodCents, teamPriceTiers } from "../src/lib/team-pricing.ts";

test("five learner seats retain the $99 monthly offer", () => {
  assert.equal(teamPeriodCents(5, "monthly"), 9900);
  assert.equal(teamPeriodCents(5, "quarterly"), 29700);
  assert.equal(teamPeriodCents(5, "annual"), 99000);
});

test("ten and fifteen seats receive graduated volume pricing", () => {
  assert.equal(teamPeriodCents(10, "monthly"), 15900);
  assert.equal(teamPeriodCents(10, "quarterly"), 47700);
  assert.equal(teamPeriodCents(10, "annual"), 159000);
  assert.equal(teamPeriodCents(15, "monthly"), 20900);
  assert.equal(teamPeriodCents(15, "quarterly"), 62700);
  assert.equal(teamPeriodCents(15, "annual"), 209000);
});

test("the marginal seat price drops after ten seats without a total-price cliff", () => {
  for (const term of ["monthly", "quarterly", "annual"]) {
    const tiers = teamPriceTiers(term);
    for (let seats = 5; seats < 25; seats++) {
      const increase = teamPeriodCents(seats + 1, term) - teamPeriodCents(seats, term);
      assert.equal(increase, seats < 10 ? tiers.standardSeatCents : tiers.volumeSeatCents);
      assert.ok(increase > 0);
    }
  }
});

test("team checkout rejects fewer than five seats", () => {
  assert.throws(() => teamPeriodCents(4, "monthly"), /at least 5/);
});
