import assert from "node:assert/strict";
import { test } from "node:test";
import { teamPeriodCents, teamPriceTiers } from "../src/lib/team-pricing.ts";

test("five learner seats retain the $99 monthly offer", () => {
  assert.equal(teamPeriodCents(5, "monthly"), 9900);
  assert.equal(teamPeriodCents(5, "quarterly"), 29700);
  assert.equal(teamPeriodCents(5, "annual"), 99000);
});

test("fifteen seats match the approved volume and term prices", () => {
  assert.equal(teamPeriodCents(15, "monthly"), 24900);
  assert.equal(teamPeriodCents(15, "quarterly"), 74700);
  assert.equal(teamPeriodCents(15, "annual"), 249000);
});

test("adding seats always increases the total price", () => {
  for (const term of ["monthly", "quarterly", "annual"])
    for (let seats = 5; seats < 25; seats++)
      assert.equal(
        teamPeriodCents(seats + 1, term) - teamPeriodCents(seats, term),
        teamPriceTiers(term).extraSeatCents,
      );
});

test("team checkout rejects fewer than five seats", () => {
  assert.throws(() => teamPeriodCents(4, "monthly"), /at least 5/);
});
