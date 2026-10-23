/** Assessment/team identities and private content never belong in page-view telemetry. */
/**
 * The route path as the router matches it: percent-escapes decoded and case folded, because
 * TanStack routes are case-insensitive (/Team, /OWNER and /te%61m all reach the same page).
 * Returns null when the escapes are malformed, which callers must treat as private.
 */
export function privacyPathname(pathname: string): string | null {
  let value = pathname;
  try {
    // Decode repeatedly so a double-encoded path (/te%2561m) cannot slip past the first pass.
    for (let pass = 0; pass < 4; pass++) {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    }
  } catch {
    return null;
  }
  return value.toLowerCase();
}
const PRIVATE_PATH =
  /^\/(?:exams|exam-content|exam-reviewers|team|owner|account|certificate|family-setup|subscribe)(?:\/|$)/;
const PRIVATE_PARAMS = new Set([
  "org",
  "attempt",
  "plan",
  "fromplan",
  "enrollment",
  "token",
  "access_token",
  "refresh_token",
  "code",
  "email",
]);
/** Query value by key, ignoring key case (the router and the app read keys loosely). */
export function privacyParam(url: URL, key: string): string | null {
  for (const [name, value] of url.searchParams) if (name.toLowerCase() === key) return value;
  return null;
}
export function isPrivateAssessmentUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://app.languagethreshold.com");
    const path = privacyPathname(url.pathname);
    if (path === null) return true;
    const keys = new Set([...url.searchParams.keys()].map((key) => key.toLowerCase()));
    return (
      PRIVATE_PATH.test(path) ||
      (path === "/" && privacyParam(url, "tab")?.toLowerCase() === "exams") ||
      [...keys].some((key) => PRIVATE_PARAMS.has(key)) ||
      /(?:access_token|refresh_token|token)=/i.test(url.hash)
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
