import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TeamOperationError, authenticatedUser, json, teamAdminClient } from "@/lib/team-server";
import { requireRegisteredAssessmentOwner } from "@/lib/assessments/content-server";
import { AssessmentAccessError, assessmentBudget, rpc } from "@/lib/assessments/server";
import { isStrictSameOrigin } from "@/lib/speaking-security";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { getModule } from "@/data/modules";
const scope = z
  .object({
    userId: z.string().uuid(),
    moduleId: z
      .string()
      .max(80)
      .refine((value) => !!getModule(value)),
    target: z.enum(LANGUAGES as [Language, ...Language[]]),
    native: z.enum(NATIVE_LANGUAGES as [NativeLanguage, ...NativeLanguage[]]),
    kind: z.enum(["response", "curriculum", "fluent_language", "domain"]),
    active: z.boolean(),
    expectedRevision: z.number().int().min(0),
    reason: z.string().trim().min(3).max(2000),
    requestId: z.string().uuid(),
    confirmScope: z.literal(true),
  })
  .strict();
function fail(error: unknown) {
  if (error instanceof AssessmentAccessError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json({ error: "Check the reviewer scope and confirmation." }, 400);
  if (error instanceof TeamOperationError && error.status === 403)
    return json({ error: "Registered platform owner access required." }, 403);
  return json({ error: "Reviewer access could not be updated. Refresh before trying again." }, 503);
}
export const Route = createFileRoute("/api/exam-reviewers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          await requireRegisteredAssessmentOwner(db, user);
          await assessmentBudget(user.id, "reviewer_admin_read");
          const query = new URL(request.url).searchParams;
          const module = z
            .string()
            .max(80)
            .refine((value) => !!getModule(value))
            .parse(query.get("module") ?? "roofing");
          const targetAccount = query.get("user")
            ? z.string().uuid().parse(query.get("user"))
            : null;
          const [response, content, events] = await Promise.all([
            db
              .from("assessment_reviewers")
              .select(
                "user_id,module_id,target_language,instruction_language,active,revision,created_at,updated_at",
              )
              .eq("module_id", module)
              .match(targetAccount ? { user_id: targetAccount } : {})
              .order("user_id")
              .limit(201),
            db
              .from("assessment_content_reviewers")
              .select(
                "user_id,module_id,target_language,instruction_language,kind,active,revision,created_at,updated_at",
              )
              .eq("module_id", module)
              .match(targetAccount ? { user_id: targetAccount } : {})
              .order("user_id")
              .order("kind")
              .limit(601),
            db
              .from("assessment_reviewer_admin_events")
              .select(
                "id,actor_id,target_id,module_id,target_language,instruction_language,kind,active,revision,reason,created_at",
              )
              .eq("module_id", module)
              .match(targetAccount ? { target_id: targetAccount } : {})
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .limit(50),
          ]);
          if (response.error || content.error || events.error)
            throw new AssessmentAccessError("Reviewer administration could not be loaded.", 503);
          return json({
            grants: [
              ...(response.data ?? []).slice(0, 200).map((row) => ({ ...row, kind: "response" })),
              ...(content.data ?? []).slice(0, 600),
            ],
            limited: (response.data?.length ?? 0) > 200 || (content.data?.length ?? 0) > 600,
            events: events.data ?? [],
            eventLimit: 50,
          });
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request))
            throw new AssessmentAccessError("Same-origin reviewer request required.", 403);
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          await requireRegisteredAssessmentOwner(db, user);
          await assessmentBudget(user.id, "reviewer_admin_write");
          const raw = await request.text();
          if (raw.length > 12000)
            throw new AssessmentAccessError("Reviewer request is too large.", 400);
          let body: unknown;
          try {
            body = JSON.parse(raw);
          } catch {
            throw new AssessmentAccessError("Invalid reviewer request.", 400);
          }
          const data = scope.parse(body);
          return json(
            await rpc(db, "assessment_manage_reviewer", {
              p_actor: user.id,
              p_user: data.userId,
              p_module: data.moduleId,
              p_target: data.target,
              p_native: data.native,
              p_kind: data.kind,
              p_active: data.active,
              p_expected: data.expectedRevision,
              p_reason: data.reason,
              p_request: data.requestId,
            }),
          );
        } catch (error) {
          return fail(error);
        }
      },
    },
  },
});
