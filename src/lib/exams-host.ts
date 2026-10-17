import { authReturnPath } from "./auth-return.ts";

export const EXAMS_HOST = "exams.languagethreshold.com";

/** The companion opens Exams; explicit lesson tabs remain on this staged build. */
export function examsHostEntry(requestUrl: string, method: string): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  const url = new URL(requestUrl);
  if (url.hostname !== EXAMS_HOST || url.pathname !== "/" || url.searchParams.has("tab"))
    return null;
  return authReturnPath("/exams" + url.search) ?? "/exams";
}
