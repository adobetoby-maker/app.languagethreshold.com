import { assessmentHistoryCsv } from "@/lib/assessments/history-export-server";
import { assessmentAuditHistory } from "@/lib/assessments/reports-server";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { getModule } from "@/data/modules";
import { LEARNER_GOALS, type LearnerGoal } from "@/lib/assessments/goals";
import {
  TeamOperationError,
  authenticatedAssessmentUser,
  teamAdminClient,
  json,
} from "@/lib/team-server";
import { isStrictSameOrigin } from "@/lib/speaking-security";
import { isDateKey, validateTimezone } from "@/lib/assessments/core";
import {
  AssessmentAccessError,
  assessmentBudget,
  enrollmentAccess,
  rpc,
} from "@/lib/assessments/server";
import {
  assessmentContentAccess,
  readAssessmentPlan,
  readDailyAssessmentPlans,
} from "@/lib/assessments/plans-server";
const id = z.string().uuid(),
  reason = z.string().trim().min(3).max(2000);
const date = z.string().refine(isDateKey, "Choose a valid date.");
const timezone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      validateTimezone(value);
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone.");
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save_goals"),
      enrollmentId: id,
      topics: z
        .array(z.enum(Object.keys(LEARNER_GOALS) as [LearnerGoal, ...LearnerGoal[]]))
        .max(3)
        .refine((topics) => new Set(topics).size === topics.length),
      offlinePreferred: z.boolean(),
      expectedRevision: z.number().int().min(0),
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("suggest_goal"),
      enrollmentId: id,
      capabilityId: z.string().min(3).max(160),
      goalRevision: z.number().int().min(1),
      reason,
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("suggest"),
      enrollmentId: id,
      attemptId: id,
      capabilityId: z.string().min(3).max(160),
      reason,
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      recommendationId: id,
      reason,
      units: z.array(z.string().max(160)).min(1).max(30).optional(),
      primaryMinutes: z.number().int().min(20).max(1200),
      supportMinutes: z.number().int().min(1).max(180),
      capPercent: z.number().int().min(1).max(50).default(20),
      mode: z.enum(["units", "full_module"]),
      startDate: date,
      timezone,
      followupDays: z.number().int().min(1).max(90).default(7),
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("decide"),
      recommendationId: id,
      decision: z.enum(["deferred", "dismissed"]),
      reason,
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("change_support"),
      assignmentId: id,
      status: z.enum(["active", "paused", "completed", "withdrawn"]),
      reason,
      requestId: id,
    })
    .strict(),
  z.object({ action: z.literal("acknowledge"), assignmentId: id, requestId: id }).strict(),
  z
    .object({
      action: z.literal("revise"),
      enrollmentId: id,
      attemptId: id,
      startLesson: z.number().int().min(1).max(30),
      focusWays: z
        .array(z.enum(["see", "recall", "hear", "type", "say", "write"]))
        .min(1)
        .max(6),
      catchupObjectives: z.array(z.string().max(160)).max(30),
      reviewEveryDays: z.number().int().min(1).max(30).default(4),
      reason,
      requestId: id,
    })
    .strict(),
]);
function fail(error: unknown) {
  if (error instanceof TeamOperationError && error.status === 499)
    return json({ error: "Assessment request cancelled." }, 499);
  if (error instanceof AssessmentAccessError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json({ error: "Check the plan details and try again." }, 400);
  if (error instanceof TeamOperationError && error.status === 403)
    return json({ error: error.message }, 403);
  return json(
    { error: "The assessment plan could not be updated. Saved records remain available." },
    503,
  );
}
export const Route = createFileRoute("/api/exam-plans")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request),
            user = await authenticatedAssessmentUser(request, db);
          await assessmentBudget(user.id, "plan_read", request);
          if (request.signal.aborted)
            throw new AssessmentAccessError("Assessment request cancelled.", 499);
          const query = new URL(request.url).searchParams,
            action = query.get("action") ?? "plan";
          if (action === "daily") {
            const moduleId = z.string().min(1).max(80).parse(query.get("module"));
            if (!getModule(moduleId)) throw new AssessmentAccessError("Module not found.", 404);
            const target = z
              .enum(LANGUAGES as [Language, ...Language[]])
              .parse(query.get("target"));
            const native = z
              .enum(NATIVE_LANGUAGES as [NativeLanguage, ...NativeLanguage[]])
              .parse(query.get("native"));
            return json(
              await readDailyAssessmentPlans(
                db,
                user.id,
                moduleId,
                target,
                native,
                query.get("plan") ? id.parse(query.get("plan")) : undefined,
              ),
            );
          }
          if (action === "history_export") {
            const enrollmentId = id.parse(query.get("enrollment"));
            await enrollmentAccess(db, user.id, enrollmentId);
            await assessmentBudget(user.id, "history_export", request);
            if (request.signal.aborted)
              throw new AssessmentAccessError("Assessment request cancelled.", 499);
            const exported = await assessmentHistoryCsv(db, user.id, enrollmentId, request.signal);
            return new Response(exported.csv, {
              headers: {
                "Content-Type": "text/csv;charset=utf-8",
                "Content-Disposition": 'attachment; filename="language-threshold-plan-history.csv"',
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
                "X-Robots-Tag": "noindex,nofollow",
                "X-Content-Type-Options": "nosniff",
                "X-LT-Export-Events": String(exported.eventCount),
              },
            });
          }
          if (action === "history")
            return json(
              await assessmentAuditHistory(
                db,
                user.id,
                id.parse(query.get("enrollment")),
                query.get("after")
                  ? z.string().datetime({ offset: true }).parse(query.get("after"))
                  : undefined,
                query.get("afterId") ? id.parse(query.get("afterId")) : undefined,
              ),
            );
          if (action !== "plan") throw new AssessmentAccessError("Unknown plan view.", 400);
          return json(
            await readAssessmentPlan(
              db,
              user.id,
              id.parse(query.get("enrollment")),
              query.get("attempt") ? id.parse(query.get("attempt")) : undefined,
            ),
          );
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request))
            throw new AssessmentAccessError("Same-origin plan request required.");
          const db = teamAdminClient(undefined, request),
            user = await authenticatedAssessmentUser(request, db),
            raw = await request.text();
          if (raw.length > 20000)
            throw new AssessmentAccessError("Plan request is too large.", 400);
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw new AssessmentAccessError("Invalid plan request.", 400);
          }
          const body = command.parse(parsed);
          await assessmentBudget(user.id, `plan_${body.action}`, request);
          if (request.signal.aborted)
            throw new AssessmentAccessError("Assessment request cancelled.", 499);
          if (body.action === "save_goals")
            return json({
              revision: await rpc(db, "assessment_save_goals", {
                p_actor: user.id,
                p_enrollment: body.enrollmentId,
                p_topics: body.topics,
                p_offline: body.offlinePreferred,
                p_expected: body.expectedRevision,
                p_request: body.requestId,
              }),
            });
          if (
            body.action === "suggest" ||
            body.action === "suggest_goal" ||
            body.action === "approve"
          ) {
            let enrollmentId = body.action !== "approve" ? body.enrollmentId : null;
            if (body.action === "approve") {
              const { data: recommendation } = await db
                .from("assessment_recommendations")
                .select("enrollment_id")
                .eq("id", body.recommendationId)
                .maybeSingle();
              if (!recommendation)
                throw new AssessmentAccessError("Support approval access required.");
              enrollmentId = recommendation.enrollment_id;
            }
            const enrollment = await enrollmentAccess(db, user.id, enrollmentId!, true);
            if (
              !(await assessmentContentAccess(db, enrollment.user_id, enrollment.organization_id))
            )
              throw new AssessmentAccessError(
                "Learning access is required before adding supporting work.",
                403,
              );
          }
          if (body.action === "suggest_goal")
            return json({
              recommendationId: await rpc(db, "assessment_suggest_goal_support", {
                p_actor: user.id,
                p_enrollment: body.enrollmentId,
                p_capability: body.capabilityId,
                p_revision: body.goalRevision,
                p_why: body.reason,
                p_request: body.requestId,
              }),
            });
          if (body.action === "suggest")
            return json({
              recommendationId: await rpc(db, "assessment_suggest_support", {
                p_actor: user.id,
                p_enrollment: body.enrollmentId,
                p_attempt: body.attemptId,
                p_capability: body.capabilityId,
                p_why: body.reason,
                p_request: body.requestId,
              }),
            });
          if (body.action === "approve" || body.action === "decide")
            return json(
              await rpc(db, "assessment_decide_support", {
                p_actor: user.id,
                p_recommendation: body.recommendationId,
                p_decision: body.action === "approve" ? "approved" : body.decision,
                p_reason: body.reason,
                p_units: body.action === "approve" ? (body.units ?? null) : null,
                p_primary_minutes: body.action === "approve" ? body.primaryMinutes : null,
                p_support_minutes: body.action === "approve" ? body.supportMinutes : null,
                p_cap_percent: body.action === "approve" ? body.capPercent : null,
                p_mode: body.action === "approve" ? body.mode : null,
                p_start: body.action === "approve" ? body.startDate : null,
                p_timezone: body.action === "approve" ? body.timezone : null,
                p_followup_days: body.action === "approve" ? body.followupDays : null,
                p_request: body.requestId,
              }),
            );
          if (body.action === "change_support")
            return json({
              status: await rpc(db, "assessment_change_support", {
                p_actor: user.id,
                p_assignment: body.assignmentId,
                p_status: body.status,
                p_reason: body.reason,
                p_request: body.requestId,
              }),
            });
          if (body.action === "acknowledge")
            return json({
              acknowledged: await rpc(db, "assessment_acknowledge_support", {
                p_actor: user.id,
                p_assignment: body.assignmentId,
                p_request: body.requestId,
              }),
            });
          return json({
            revisionId: await rpc(db, "assessment_revise_plan", {
              p_actor: user.id,
              p_enrollment: body.enrollmentId,
              p_attempt: body.attemptId,
              p_start_lesson: body.startLesson,
              p_ways: body.focusWays,
              p_catchup: body.catchupObjectives,
              p_reason: body.reason,
              p_request: body.requestId,
              p_review_every_days: body.reviewEveryDays,
            }),
          });
        } catch (error) {
          return fail(error);
        }
      },
    },
  },
});
