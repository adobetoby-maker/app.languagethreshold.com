/** One projection for stored practice points and the change shown on the result. */
export function applyPracticePoints<T extends string>(
  tier: T,
  points: number,
  delta: number,
  tierOrder: readonly T[],
  pointsPerTier: number,
) {
  const oldTierIndex = tierOrder.indexOf(tier);
  let tierIndex = oldTierIndex;
  let nextPoints = Math.max(0, points + delta);
  if (delta > 0) {
    while (nextPoints >= pointsPerTier && tierIndex < tierOrder.length - 1) {
      nextPoints -= pointsPerTier;
      tierIndex += 1;
    }
    nextPoints = Math.min(nextPoints, pointsPerTier);
  }
  return {
    tier: tierOrder[tierIndex],
    points: nextPoints,
    appliedDelta: (tierIndex - oldTierIndex) * pointsPerTier + nextPoints - points,
  };
}
