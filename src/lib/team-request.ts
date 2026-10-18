import { readPrivateJson, PrivateJsonRequestError } from "./private-json-request.ts";
export const MAX_TEAM_ACTIVITY_BYTES = 16 * 1024;
export const MAX_TEAM_ASSESSMENT_BYTES = 64 * 1024;
// Covers escaped Unicode in bounded custom-module briefs, plus ordinary team/admin payloads.
export const MAX_TEAM_WORKFLOW_BYTES = 64 * 1024;
function denied(status: number) {
  return Response.json(
    {
      error:
        status === 403
          ? "Open your team workspace to continue."
          : status === 413
            ? "This team request is too large."
            : status === 408
              ? "The team upload took too long. Please try again."
              : status === 499
                ? "Team request cancelled."
                : "Check your team request and try again.",
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
/** Input only; existing auth, entitlement, write and certificate phases stay separate. */
export async function prepareTeamJson<T>(
  request: Request,
  schema: { parse(value: unknown): T },
  maxBytes: number,
): Promise<{ data: T; response?: never } | { response: Response; data?: never }> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    void request.body?.cancel().catch(() => {});
    return { response: denied(403) };
  }
  try {
    const data = schema.parse(await readPrivateJson(request, maxBytes));
    if (request.signal.aborted) return { response: denied(499) };
    return { data };
  } catch (error) {
    return { response: denied(error instanceof PrivateJsonRequestError ? error.status : 400) };
  }
}
