import { readReviewerAdministration } from "@/lib/assessments/reviewer-admin-read";
import { readPrivateJson, PrivateJsonRequestError } from "@/lib/private-json-request";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  TeamOperationError,
  authenticatedAssessmentUser,
  json,
  teamAdminClient,
} from "@/lib/team-server";
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
  if (error instanceof PrivateJsonRequestError)
    return json(
      {
        error:
          error.status === 413
            ? "Reviewer request is too large."
            : error.status === 408
              ? "The reviewer upload took too long. Please try again."
              : error.status === 499
                ? "Assessment request cancelled."
                : "Invalid reviewer request.",
      },
      error.status,
    );
  if (error instanceof TeamOperationError && error.status === 499)
    return json({ error: "Assessment request cancelled." }, 499);
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
          const db = teamAdminClient(undefined, request),
            user = await authenticatedAssessmentUser(request, db);
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
          return json(await readReviewerAdministration(request, module, targetAccount));
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request)) {
            void request.body?.cancel().catch(() => {});
            throw new AssessmentAccessError("Same-origin reviewer request required.", 403);
          }
          // Covers the schema's full escaped-Unicode reason; bytes and wait are bounded before SDK work.
          const data = scope.parse(await readPrivateJson(request, 16 * 1024));
          if (request.signal.aborted) throw new PrivateJsonRequestError(499);
          const db = teamAdminClient(undefined, request),
            user = await authenticatedAssessmentUser(request, db);
          await requireRegisteredAssessmentOwner(db, user);
          await assessmentBudget(user.id, "reviewer_admin_write");
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
