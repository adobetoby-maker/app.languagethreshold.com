import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import {
  authenticatedUser,
  teamAdminClient,
  json,
  requireTeamAdmin,
  memberRole,
} from "@/lib/team-server";
import { enforceSpeakingRateLimit, isStrictSameOrigin } from "@/lib/speaking-security";
import { extractCore30Log } from "@/lib/team-core30";
import { getCurriculum } from "@/data/curriculum";
import { lessonObjectiveId } from "@/lib/learning-identity";
import { isDateKey, validateTimezone } from "@/lib/assessments/core";
import {
  AssessmentAccessError,
  attemptAccess,
  enrollmentAccess,
  initializeScores,
  listEnrollments,
  pilotAllowed,
  readAttempt,
  readinessCatalog,
  rpc,
  seedDraftTrack,
} from "@/lib/assessments/server";

const id = z.string().uuid();
const target = z.enum(LANGUAGES as [Language, ...Language[]]);
const native = z.enum(NATIVE_LANGUAGES as [NativeLanguage, ...NativeLanguage[]]);
const date = z.string().refine(isDateKey, "Choose a valid calendar date.");
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
const answer = z
  .object({
    inputMethod: z.enum(["choice", "typed", "handwriting", "speech_transcript", "unavailable"]),
    text: z.string().max(4000).optional(),
    choiceId: z.string().max(160).optional(),
    originalTranscript: z.string().max(4000).optional(),
    correctedTranscript: z.string().max(4000).optional(),
    recognitionIssue: z.boolean().optional(),
    listeningHeard: z.boolean().optional(),
    missingReason: z.string().min(1).max(300).optional(),
  })
  .strict();
const bodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("enroll"),
      moduleId: z.string().min(1).max(80),
      targetLanguage: target,
      instructionLanguage: native,
      startDate: date,
      timezone,
      orgId: id.optional(),
      learnerId: id.optional(),
      requestId: id,
    })
    .strict(),
  z.object({ action: z.literal("start"), checkpointId: id, requestId: id }).strict(),
  z
    .object({
      action: z.literal("save"),
      attemptId: id,
      revision: z.number().int().min(0),
      updates: z
        .array(z.object({ itemId: z.string().min(1).max(160), answer }).strict())
        .min(1)
        .max(30),
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("submit"),
      attemptId: id,
      revision: z.number().int().min(0),
      requestId: id,
    })
    .strict(),
  z.object({ action: z.literal("retry_scoring"), attemptId: id }).strict(),
  z
    .object({
      action: z.literal("schedule"),
      enrollmentId: id,
      revision: z.number().int().min(0),
      change: z.enum(["pause", "resume", "reschedule", "exempt", "restore"]),
      checkpointId: id.optional(),
      date: date.optional(),
      reason: z.string().trim().min(3).max(1000),
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("request_review"),
      attemptId: id,
      reason: z.string().trim().min(3).max(2000),
      consentVersion: z.literal("assessment-review-v1"),
      requestId: id,
    })
    .strict(),
  z.object({ action: z.literal("claim_review"), reviewId: id }).strict(),
  z
    .object({
      action: z.literal("review_score"),
      attemptId: id,
      responseId: id,
      state: z.enum(["scored", "not_assessed", "needs_review"]),
      points: z.number().min(0).max(100).nullable(),
      dimensions: z.record(z.string().max(100), z.number().min(0).max(100)).nullable().optional(),
      reason: z.string().trim().min(3).max(2000),
      requestId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("resolve_review"),
      reviewId: id,
      reason: z.string().trim().min(3).max(2000),
      requestId: id,
    })
    .strict(),
]);

function fail(error: unknown) {
  if (error instanceof AssessmentAccessError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return json({ error: "Check the assessment request and try again." }, 400);
  if (error instanceof Error && /Sign in|session|access required/.test(error.message))
    return json({ error: error.message }, 403);
  return json(
    { error: "Assessments are temporarily unavailable. Your submitted answers remain saved." },
    503,
  );
}
async function budget(actor: string, action: string) {
  const limit = action === "save" ? 90 : action === "enroll" || action === "start" ? 6 : 30;
  const result = await enforceSpeakingRateLimit(actor, `exams:${action}`, limit).catch(() => ({
    allowed: false,
    misconfigured: true,
  }));
  if (!result.allowed)
    throw new AssessmentAccessError(
      result.misconfigured
        ? "Assessment request controls are unavailable."
        : "Please wait a minute before trying again.",
      result.misconfigured ? 503 : 429,
    );
}

export const Route = createFileRoute("/api/exams")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          const url = new URL(request.url),
            action = url.searchParams.get("action") ?? "overview";
          if (action === "attempt")
            return json(
              await readAttempt(
                db,
                user.id,
                id.parse(url.searchParams.get("attempt")),
                url.searchParams.get("review") === "1",
              ),
            );
          if (action === "listening") {
            await budget(user.id, "listening");
            const context = await attemptAccess(
              db,
              user.id,
              id.parse(url.searchParams.get("attempt")),
            );
            if (context.enrollment.user_id !== user.id || context.attempt.submitted_at)
              throw new AssessmentAccessError("Active learner assessment access required.");
            const form = context.attempt.form_snapshot
              .definition as import("@/lib/assessments/form").AssessmentFormDefinition;
            const item = form.items.find((row) => row.id === url.searchParams.get("item"));
            if (!item?.audioRequired || !item.audioText)
              throw new AssessmentAccessError("Listening audio is unavailable for this item.", 503);
            if (!context.attempt.form_snapshot.pilot || !pilotAllowed(user.id))
              throw new AssessmentAccessError(
                "Reviewed assessment audio has not been published for this form.",
                503,
              );
            return json({
              text: item.audioText,
              language: context.enrollment.target_language,
              mode: "device_speech_qa_only",
            });
          }
          if (action === "readiness") {
            const targetLanguage = target.parse(url.searchParams.get("target") ?? "Spanish"),
              instructionLanguage = native.parse(url.searchParams.get("native") ?? "English");
            return json({
              tracks: await readinessCatalog(db, targetLanguage, instructionLanguage),
              note: "Structural coverage is separate from curriculum review. No draft is assignable as an official exam.",
            });
          }
          if (action !== "overview")
            throw new AssessmentAccessError("Unknown assessment view.", 400);
          const orgId = url.searchParams.get("org")
            ? id.parse(url.searchParams.get("org"))
            : undefined;
          const role = orgId ? await memberRole(db, orgId, user.id) : null;
          const canManage = orgId ? Boolean(role && ["owner", "admin"].includes(role.role)) : true;
          const members =
            orgId && canManage
              ? await db
                  .from("team_members")
                  .select("user_id,display_name")
                  .eq("organization_id", orgId)
                  .eq("status", "active")
                  .eq("role", "learner")
              : { data: [], error: null };
          if (members.error)
            throw new AssessmentAccessError("Team learners could not be loaded.", 503);
          return json({
            canManage,
            members: members.data ?? [],
            enrollments: await listEnrollments(db, user.id, orgId),
            pilot: pilotAllowed(user.id),
            limit: 200,
          });
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request))
            throw new AssessmentAccessError("Cross-origin assessment request rejected.");
          if (Number(request.headers.get("content-length") ?? 0) > 220000)
            throw new AssessmentAccessError("Assessment request is too large.", 413);
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          const raw = await request.text();
          if (raw.length > 220000)
            throw new AssessmentAccessError("Assessment request is too large.", 413);
          const body = bodySchema.parse(JSON.parse(raw));
          await budget(user.id, body.action);
          if (body.action === "enroll") {
            if (body.orgId) await requireTeamAdmin(db, body.orgId, user.id);
            else if (body.learnerId && body.learnerId !== user.id)
              throw new AssessmentAccessError("Personal assessment access required.");
            const release = await seedDraftTrack(
              db,
              body.moduleId,
              body.targetLanguage,
              body.instructionLanguage,
            );
            const enrollmentId = await rpc<string>(db, "assessment_create_enrollment", {
              p_actor: user.id,
              p_user: body.learnerId ?? user.id,
              p_org: body.orgId ?? null,
              p_release: release,
              p_start: body.startDate,
              p_timezone: body.timezone,
              p_request: body.requestId,
            });
            return json({ enrollmentId });
          }
          if (body.action === "start") {
            const { data: checkpoint, error } = await db
              .from("assessment_checkpoints")
              .select("*")
              .eq("id", body.checkpointId)
              .maybeSingle();
            if (error || !checkpoint)
              throw new AssessmentAccessError("Assessment checkpoint unavailable.", 404);
            const enrollment = await enrollmentAccess(db, user.id, checkpoint.enrollment_id);
            if (enrollment.user_id !== user.id)
              throw new AssessmentAccessError("Only the learner may start this exam.");
            const { data: forms, error: formError } = await db
              .from("assessment_forms")
              .select("id,status")
              .eq("release_id", enrollment.release_id)
              .eq("checkpoint", checkpoint.checkpoint)
              .order("created_at", { ascending: false });
            if (formError)
              throw new AssessmentAccessError("Assessment forms are unavailable.", 503);
            const form =
              forms?.find((form) => form.status === "verified") ??
              (pilotAllowed(user.id) ? forms?.[0] : undefined);
            if (!form)
              throw new AssessmentAccessError(
                "This module exam is awaiting curriculum review.",
                400,
              );
            const { data: profile, error: profileError } = await db
              .from("profiles")
              .select("data")
              .eq("id", user.id)
              .maybeSingle();
            if (profileError)
              throw new AssessmentAccessError("Saved study coverage could not be loaded.", 503);
            const log = extractCore30Log(profile?.data, [enrollment.module_id])[
              enrollment.module_id
            ];
            const studied = (getCurriculum(enrollment.module_id)?.lessons ?? [])
              .filter((lesson) => {
                const entry = log?.lessons[String(lesson.n)];
                return (
                  Object.values(entry?.visits ?? {}).some(
                    (value) => typeof value === "string" && Number.isFinite(Date.parse(value)),
                  ) ||
                  Object.values(entry?.wayVisits ?? {}).some(
                    (value) => typeof value === "string" && Number.isFinite(Date.parse(value)),
                  )
                );
              })
              .map((lesson) => lessonObjectiveId(enrollment.module_id, lesson.n));
            const attemptId = await rpc<string>(db, "assessment_start_attempt", {
              p_actor: user.id,
              p_checkpoint: body.checkpointId,
              p_form: form.id,
              p_request: body.requestId,
              p_allow_pilot: pilotAllowed(user.id),
              p_studied_objectives: studied,
            });
            return json(await readAttempt(db, user.id, attemptId));
          }
          if (body.action === "save") {
            await attemptAccess(db, user.id, body.attemptId);
            const revision = await rpc<number>(db, "assessment_save_responses", {
              p_actor: user.id,
              p_attempt: body.attemptId,
              p_revision: body.revision,
              p_updates: body.updates,
              p_request: body.requestId,
            });
            return json({ revision, syncedAt: new Date().toISOString() });
          }
          if (body.action === "submit") {
            await rpc(db, "assessment_submit_attempt", {
              p_actor: user.id,
              p_attempt: body.attemptId,
              p_revision: body.revision,
              p_request: body.requestId,
            });
            // Submission is durable before grading. A retry resumes grading without resubmission.
            try {
              await initializeScores(db, user.id, body.attemptId);
            } catch {
              return json({ submitted: true, scoringPending: true, attemptId: body.attemptId });
            }
            return json({ submitted: true, attemptId: body.attemptId });
          }
          if (body.action === "retry_scoring") {
            await initializeScores(db, user.id, body.attemptId);
            return json({ scoringRetried: true });
          }
          if (body.action === "schedule") {
            const revision = await rpc<number>(db, "assessment_change_schedule", {
              p_actor: user.id,
              p_enrollment: body.enrollmentId,
              p_revision: body.revision,
              p_change: body.change,
              p_checkpoint: body.checkpointId ?? null,
              p_date: body.date ?? null,
              p_reason: body.reason,
              p_request: body.requestId,
            });
            return json({ revision });
          }
          if (body.action === "request_review")
            return json({
              reviewId: await rpc(db, "assessment_request_review", {
                p_actor: user.id,
                p_attempt: body.attemptId,
                p_reason: body.reason,
                p_consent: body.consentVersion,
                p_request: body.requestId,
              }),
            });
          if (body.action === "claim_review")
            return json({
              attemptId: await rpc(db, "assessment_claim_review", {
                p_actor: user.id,
                p_request: body.reviewId,
              }),
            });
          if (body.action === "review_score") {
            const context = await attemptAccess(db, user.id, body.attemptId, true);
            if (!context.attempt.submitted_at)
              throw new AssessmentAccessError("Submit this assessment first.", 400);
            const { data: response } = await db
              .from("assessment_responses")
              .select("id")
              .eq("id", body.responseId)
              .eq("attempt_id", body.attemptId)
              .maybeSingle();
            if (!response) throw new AssessmentAccessError("Response access required.");
            return json({
              scoreId: await rpc(db, "assessment_review_rubric", {
                p_actor: user.id,
                p_attempt: body.attemptId,
                p_response: body.responseId,
                p_state: body.state,
                p_points: body.points,
                p_dimensions: body.dimensions ?? null,
                p_reason: body.reason,
                p_request: body.requestId,
              }),
            });
          }
          await rpc(db, "assessment_resolve_review", {
            p_actor: user.id,
            p_review: body.reviewId,
            p_reason: body.reason,
            p_request: body.requestId,
          });
          return json({ resolved: true });
        } catch (error) {
          return fail(error);
        }
      },
    },
  },
});
