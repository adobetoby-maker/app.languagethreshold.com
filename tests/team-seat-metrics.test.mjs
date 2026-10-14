import assert from "node:assert/strict";
import { test } from "node:test";
import { teamSeatMetrics } from "../src/lib/team-seat-metrics.ts";

test("owner seat totals separate paid subscriptions from live pilot access", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  const entitlement = (seat_limit, status, stripe_subscription_id, period_end) => ({
    seat_limit,
    status,
    stripe_subscription_id,
    period_end,
  });
  assert.deepEqual(
    teamSeatMetrics(
      [
        entitlement(15, "active", "sub_paid", "2026-11-14T12:00:00Z"),
        entitlement(5, "manual", null, "2026-10-21T12:00:00Z"),
        entitlement(10, "manual", null, "2026-10-13T12:00:00Z"),
        entitlement(20, "canceled", "sub_old", "2026-10-13T12:00:00Z"),
        entitlement(25, "pending", null, null),
        entitlement(30, "active", null, "2026-11-14T12:00:00Z"),
      ],
      now,
    ),
    { paid: 15, pilot: 5, enabled: 50 },
  );
});

test("an empty site has no paid or pilot seats", () => {
  assert.deepEqual(teamSeatMetrics([]), { paid: 0, pilot: 0, enabled: 0 });
});
