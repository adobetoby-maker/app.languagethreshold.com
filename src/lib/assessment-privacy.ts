/** Assessment/team identities and private content never belong in page-view telemetry. */
export function isPrivateAssessmentUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://app.languagethreshold.com");
    return (
      /^\/(?:exams|exam-content|exam-reviewers|team|owner|account|certificate|family-setup|subscribe)(?:\/|$)/.test(
        url.pathname,
      ) ||
      (url.pathname === "/" && url.searchParams.get("tab") === "exams") ||
      [
        "org",
        "attempt",
        "plan",
        "fromPlan",
        "enrollment",
        "token",
        "access_token",
        "refresh_token",
        "code",
        "email",
      ].some((key) => url.searchParams.has(key)) ||
      /(?:access_token|refresh_token|token)=/.test(url.hash)
    );
  } catch {
    return true;
  }
}
export function isPrivateAssessmentContext(): boolean {
  return (
    typeof window !== "undefined" &&
    (isPrivateAssessmentUrl(window.location.href) ||
      !!document.querySelector("[data-private-assessment]"))
  );
}
export function anonymousPageUrl(value: string): string {
  const url = new URL(value, "https://app.languagethreshold.com");
  return url.origin + url.pathname;
}
