/** Explicit team routes must never substitute personal or other-team attempts. */
export function attemptMatchesOrganization(
  attempt: { enrollment: { scope?: string; organizationId?: string | null } },
  organizationId?: string,
): boolean {
  return (
    organizationId === undefined ||
    (attempt.enrollment.scope === "team" && attempt.enrollment.organizationId === organizationId)
  );
}
