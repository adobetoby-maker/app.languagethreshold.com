export const learningResetKey = (actor: string) =>
  `lt.learning-reset.v1.${encodeURIComponent(actor)}`;
export function readLearningResetId(
  storage: { getItem(key: string): string | null } | null,
  actor: string | null,
): string | null {
  try {
    return actor ? (storage?.getItem(learningResetKey(actor)) ?? null) : null;
  } catch {
    return null;
  }
}
