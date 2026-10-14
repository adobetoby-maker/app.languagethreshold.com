type Entitlement = {
  seat_limit: number;
  status: string;
  period_end: string | null;
  stripe_subscription_id: string | null;
};

/** Keep pilot access separate from seats attached to a paid subscription. */
export function teamSeatMetrics(entitlements: Entitlement[], now = Date.now()) {
  let paid = 0;
  let pilot = 0;
  let enabled = 0;
  for (const entitlement of entitlements) {
    const livePilot =
      entitlement.status === "manual" &&
      !!entitlement.period_end &&
      new Date(entitlement.period_end).getTime() > now;
    if (entitlement.status === "active" || livePilot) enabled += entitlement.seat_limit;
    if (entitlement.status === "active" && entitlement.stripe_subscription_id) {
      paid += entitlement.seat_limit;
    } else if (livePilot) {
      pilot += entitlement.seat_limit;
    }
  }
  return { paid, pilot, enabled };
}
