import { z } from "zod";
import { teamAdminClient, TeamOperationError } from "@/lib/team-server";
import { readPrivateServiceJson } from "@/lib/private-service-json";
import { AssessmentAccessError } from "./errors";

export const REVIEWER_ADMIN_READ_MS = 8_000;
export const REVIEWER_ADMIN_LISTS = {
  assessment_reviewers: {
    projection:
      "user_id,module_id,target_language,instruction_language,active,revision,created_at,updated_at",
    limit: 201,
    bytes: 256 * 1024,
    order: "user_id.asc",
    filter: "user_id",
  },
  assessment_content_reviewers: {
    projection:
      "user_id,module_id,target_language,instruction_language,kind,active,revision,created_at,updated_at",
    limit: 601,
    bytes: 512 * 1024,
    order: "user_id.asc,kind.asc",
    filter: "user_id",
  },
  assessment_reviewer_admin_events: {
    projection:
      "id,actor_id,target_id,module_id,target_language,instruction_language,kind,active,revision,reason,created_at",
    limit: 50,
    bytes: 1024 * 1024,
    order: "created_at.desc,id.desc",
    filter: "target_id",
  },
} as const;
const timestamp = z.string().datetime({ offset: true });
const integer = z.number().int().min(-2147483648).max(2147483647);
const contentKind = z.enum(["curriculum", "fluent_language", "domain"]);

/** Selected projections only, within the caller-owned three-list phase. */
export function reviewerAdminReadFetch(
  projectUrl: string,
  signal: AbortSignal,
  fetcher: typeof fetch,
): typeof fetch {
  const base = new URL(projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const table = Object.keys(REVIEWER_ADMIN_LISTS).find(
      (key) => url.pathname === new URL("rest/v1/" + key, base).pathname,
    ) as keyof typeof REVIEWER_ADMIN_LISTS | undefined;
    const spec = table ? REVIEWER_ADMIN_LISTS[table] : undefined;
    const keys = [...url.searchParams.keys()];
    if (
      !spec ||
      method.toUpperCase() !== "GET" ||
      url.origin !== base.origin ||
      url.searchParams.get("select") !== spec.projection ||
      url.searchParams.get("limit") !== String(spec.limit) ||
      url.searchParams.get("order") !== spec.order ||
      !url.searchParams.get("module_id")?.startsWith("eq.") ||
      new Set(keys).size !== keys.length ||
      !keys.every((k) => ["select", "limit", "order", "module_id", spec.filter].includes(k)) ||
      (url.searchParams.has(spec.filter) && !url.searchParams.get(spec.filter)?.startsWith("eq."))
    )
      return fetcher(input, init);
    const target = url.searchParams.get(spec.filter)?.slice(3);
    const identity = target ? z.literal(target) : z.string().uuid();
    const shared = {
      module_id: z.literal(url.searchParams.get("module_id")!.slice(3)),
      target_language: z.string(),
      instruction_language: z.string(),
      active: z.boolean(),
    };
    const grant = z
      .object({
        ...shared,
        user_id: identity,
        revision: integer.positive(),
        created_at: timestamp,
        updated_at: timestamp,
      })
      .strict();
    const content = grant.extend({ kind: contentKind }).strict();
    const event = z
      .object({
        ...shared,
        id: z.string().uuid(),
        actor_id: z.string().uuid(),
        target_id: identity,
        // Historical event kinds are unconstrained text in SQL; retain them within the wire budget.
        kind: z.string(),
        revision: integer,
        reason: z.string().refine((value) => {
          const length = [...value.replace(/^ +| +$/g, "")].length;
          return length >= 3 && length <= 2000;
        }),
        created_at: timestamp,
      })
      .strict();
    const schema = z
      .array(
        table === "assessment_reviewers"
          ? grant
          : table === "assessment_content_reviewers"
            ? content
            : event,
      )
      .max(spec.limit);
    const active = () => {
      if (signal.aborted) throw Error("Reviewer list stopped");
    };
    let rejectAbort: (() => void) | undefined;
    try {
      active();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(Error("Reviewer list stopped"));
        signal.addEventListener("abort", rejectAbort, { once: true });
      });
      const pending = Promise.resolve().then(() => {
        active();
        return fetcher(input, { ...init, signal, cache: "no-store", redirect: "error" });
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
        throw Error("Reviewer list unavailable");
      }
      const rows = schema.parse(await readPrivateServiceJson(response, spec.bytes, signal));
      active();
      return Response.json(rows);
    } catch {
      return Response.json({ message: "Reviewer list unavailable" }, { status: 503 });
    } finally {
      if (rejectAbort) signal.removeEventListener("abort", rejectAbort);
    }
  };
}

/** Auth/owner/budget have already succeeded; this bounds only the parallel private list phase. */
export async function readReviewerAdministration(
  request: Request,
  module: string,
  targetAccount: string | null,
  fetcher: typeof fetch = fetch,
) {
  const unavailable = () =>
    new AssessmentAccessError("Reviewer administration could not be loaded.", 503);
  const current = () => {
    if (request.signal.aborted) throw new TeamOperationError("Assessment request cancelled.", 499);
  };
  current();
  const controller = new AbortController(),
    abort = () => controller.abort();
  const timer = setTimeout(abort, REVIEWER_ADMIN_READ_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  try {
    current();
    const stopped = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(unavailable());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    void stopped.catch(() => {});
    const db = teamAdminClient(
      reviewerAdminReadFetch(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
        controller.signal,
        fetcher,
      ),
      request,
    );
    const responseSpec = REVIEWER_ADMIN_LISTS.assessment_reviewers,
      contentSpec = REVIEWER_ADMIN_LISTS.assessment_content_reviewers,
      eventSpec = REVIEWER_ADMIN_LISTS.assessment_reviewer_admin_events;
    const pending = Promise.all([
      db
        .from("assessment_reviewers")
        .select(responseSpec.projection)
        .eq("module_id", module)
        .match(targetAccount ? { user_id: targetAccount } : {})
        .order("user_id")
        .limit(responseSpec.limit)
        .abortSignal(controller.signal)
        .retry(false),
      db
        .from("assessment_content_reviewers")
        .select(contentSpec.projection)
        .eq("module_id", module)
        .match(targetAccount ? { user_id: targetAccount } : {})
        .order("user_id")
        .order("kind")
        .limit(contentSpec.limit)
        .abortSignal(controller.signal)
        .retry(false),
      db
        .from("assessment_reviewer_admin_events")
        .select(eventSpec.projection)
        .eq("module_id", module)
        .match(targetAccount ? { target_id: targetAccount } : {})
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(eventSpec.limit)
        .abortSignal(controller.signal)
        .retry(false),
    ]);
    const [response, content, events] = await Promise.race([pending, stopped]);
    current();
    if (controller.signal.aborted || response.error || content.error || events.error)
      throw unavailable();
    return {
      grants: [
        ...(response.data ?? []).slice(0, 200).map((row) => ({ ...row, kind: "response" })),
        ...(content.data ?? []).slice(0, 600),
      ],
      limited: (response.data?.length ?? 0) > 200 || (content.data?.length ?? 0) > 600,
      events: events.data ?? [],
      eventLimit: 50,
    };
  } catch (error) {
    current();
    if (error instanceof AssessmentAccessError) throw error;
    throw unavailable();
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    controller.abort();
  }
}
