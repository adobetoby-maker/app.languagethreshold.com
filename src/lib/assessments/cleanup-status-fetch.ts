import { z } from "zod";
import { readPrivateServiceJson } from "../private-service-json";
export const CLEANUP_OWNER_RESPONSE_BYTES = 4096;
export const CLEANUP_HISTORY_RESPONSE_BYTES = 32768;
const role = z.object({ role: z.enum(["owner", "support"]) }).strict();
const ownerResult = z.union([role, z.array(role).max(1), z.null()]);
const timestamp = z.string().max(64).datetime({ offset: true });
const count = z.number().int().min(0).max(250);
const run = z
  .object({
    source: z.enum(["operator", "scheduled_endpoint"]),
    status: z.enum(["running", "succeeded", "partial", "failed"]),
    started_at: timestamp,
    finished_at: timestamp.nullable(),
    selected_count: count,
    deleted_count: count,
    failed_count: count,
    may_have_more: z.boolean(),
    failure_code: z.enum(["worker_failed", "lease_expired"]).nullable(),
  })
  .strict()
  .refine((row) => row.deleted_count + row.failed_count <= row.selected_count)
  .refine((row) => (row.status === "running") === (row.finished_at === null))
  .refine(
    (row) =>
      row.status !== "succeeded" ||
      (row.failed_count === 0 && !row.may_have_more && row.failure_code === null),
  );

/** Only cleanup-status GETs; caller owns the owner/history phase deadline. */
export function cleanupStatusReadFetch(
  projectUrl: string | undefined,
  signal: AbortSignal,
  fetcher: typeof fetch,
): typeof fetch {
  const base = projectUrl ? (projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`) : null;
  const ownerUrl = base ? new URL("rest/v1/platform_admin_roles", base) : null;
  const historyUrl = base ? new URL("rest/v1/assessment_cleanup_runs", base) : null;
  const unavailable = () =>
    Response.json({ message: "Cleanup status read unavailable" }, { status: 503 });
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const owner = ownerUrl && url.origin === ownerUrl.origin && url.pathname === ownerUrl.pathname;
    const history =
      historyUrl && url.origin === historyUrl.origin && url.pathname === historyUrl.pathname;
    if (method.toUpperCase() !== "GET" || (!owner && !history)) return fetcher(input, init);
    let rejectAbort: (() => void) | undefined;
    const active = () => {
      if (signal.aborted) throw Error("Status read stopped");
    };
    try {
      active();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(Error("Status read stopped"));
        signal.addEventListener("abort", rejectAbort, { once: true });
      });
      const pending = Promise.resolve().then(() => {
        active();
        return fetcher(input, { ...init, signal, cache: "no-store" });
      });
      void pending.then(
        (response) => {
          if (signal.aborted) void response.body?.cancel().catch(() => {});
        },
        () => {},
      );
      const response = await Promise.race([pending, stopped]);
      active();
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        return unavailable();
      }
      const data = await readPrivateServiceJson(
        response,
        owner ? CLEANUP_OWNER_RESPONSE_BYTES : CLEANUP_HISTORY_RESPONSE_BYTES,
        signal,
      );
      active();
      const parsed = owner
        ? ownerResult.parse(data)
        : z
            .array(run)
            .max(url.searchParams.get("limit") === "1" ? 1 : 20)
            .parse(data);
      return Response.json(parsed, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return unavailable();
    } finally {
      if (rejectAbort) signal.removeEventListener("abort", rejectAbort);
    }
  };
}
