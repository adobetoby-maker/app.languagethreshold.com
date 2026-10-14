/** Apply assignment links after the saved profile, once for each signed-in identity. */
export function learningLinkIdentity({
  hydrated,
  authLoading,
  userId,
  profileReadyUserId,
  appliedFor,
}: {
  hydrated: boolean;
  authLoading: boolean;
  userId: string | null;
  profileReadyUserId: string | null;
  appliedFor: string | null;
}) {
  if (!hydrated || authLoading) return null;
  if (userId && profileReadyUserId !== userId) return null;
  const identity = userId ?? "guest";
  return appliedFor === identity ? null : identity;
}
