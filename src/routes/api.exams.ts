import {
  speechStatus,
  uploadAssessmentSpeech,
  readAssessmentSpeech,
} from "@/lib/assessments/speech-server";
import { checkpointAttemptHistory } from "@/lib/assessments/reports-server";
import { requireCurrentLessonBinding } from "@/lib/assessments/lesson-binding";
import { officialFormAvailable } from "@/lib/assessments/release-readiness";
import { assessmentContentAccess } from "@/lib/assessments/plans-server";
import { proposeWritingReview } from "@/lib/assessments/ai-server";
import { readAssessmentListening } from "@/lib/assessments/audio-server";
import { officialListeningGaps, type AssessmentFormDefinition } from "@/lib/assessments/form";
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
import { isStrictSameOrigin } from "@/lib/speaking-security";
import { extractCore30Log } from "@/lib/team-core30";
import { core30ScopeKey } from "@/lib/core30-scope";
import { getCurriculum } from "@/data/curriculum";
import { lessonObjectiveId } from "@/lib/learning-identity";
import { isDateKey, validateTimezone } from "@/lib/assessments/core";
import {
  AssessmentAccessError,
  assessmentBudget as budget,
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
    mediaEvidenceId: id.optional(),
    missingReason: z.string().min(1).max(300).optional(),
  })
  .strict();
const bodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("speech_reviewed"),
      evidenceId: id,
      requestId: id,
      listened: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("speech_withdraw"), evidenceId: id, requestId: id }).strict(),
  z
    .object({
      action: z.literal("ai_writing"),
      attemptId: id,
      responseId: id,
      consentVersion: z.literal("assessment-ai-writing-v1"),
    })
    .strict(),
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
export const Route = createFileRoute("/api/exams")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          const url = new URL(request.url),
            action = url.searchParams.get("action") ?? "overview";
          if (action === "review_queue") {
            await budget(user.id, "review_queue");
            const org = url.searchParams.get("org"),
              after = url.searchParams.get("after"),
              afterId = url.searchParams.get("afterId");
            const queue = await rpc<Record<string, unknown>>(db, "assessment_review_queue", {
              p_actor: user.id,
              p_org: org ? id.parse(org) : null,
              p_after: after ? z.string().datetime({ offset: true }).parse(after) : null,
              p_after_id: afterId ? id.parse(afterId) : null,
            });
            const registry = !org
              ? await db
                  .from("assessment_reviewers")
                  .select("user_id")
                  .eq("user_id", user.id)
                  .eq("active", true)
                  .limit(1)
              : { data: [{ user_id: user.id }], error: null };
            if (registry.error)
              throw new AssessmentAccessError("Reviewer status could not be loaded.", 503);
            return json({ ...queue, eligible: !!registry.data?.length });
          }
          if (action === "checkpoint_history") {
            await budget(user.id, "history_read");
            return json(
              await checkpointAttemptHistory(
                db,
                user.id,
                id.parse(url.searchParams.get("checkpoint")),
                url.searchParams.has("before")
                  ? z.coerce.number().int().positive().parse(url.searchParams.get("before"))
                  : undefined,
              ),
            );
          }
          if (action === "attempt")
            return json(
              await readAttempt(
                db,
                user.id,
                id.parse(url.searchParams.get("attempt")),
                url.searchParams.get("review") === "1",
                url.searchParams.has("org") ? id.parse(url.searchParams.get("org")) : undefined,
              ),
            );
          if (action === "speech_status") {
            await budget(user.id, "speech_read");
            return json(await speechStatus(db, user.id, id.parse(url.searchParams.get("attempt"))));
          }
          if (action === "speech_playback") {
            await budget(user.id, "speech_read");
            return await readAssessmentSpeech(
              db,
              user.id,
              id.parse(url.searchParams.get("evidence")),
            );
          }
          if (action === "listening") {
            await budget(user.id, "listening");
            return await readAssessmentListening(
              db,
              user.id,
              id.parse(url.searchParams.get("attempt")),
              z.string().min(1).max(160).parse(url.searchParams.get("item")),
            );
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
          await budget(user.id, "overview_read");
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
          const memberships = !orgId
            ? await db
                .from("team_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("status", "active")
            : { data: [], error: null };
          if (memberships.error)
            throw new AssessmentAccessError("Team permissions could not be loaded.", 503);
          return json({
            canManage,
            activeOrganizationIds: (memberships.data ?? []).map((row) => row.organization_id),
            members: members.data ?? [],
            ...(await listEnrollments(db, user.id, orgId, {
              after: url.searchParams.get("after")
                ? z.string().datetime({ offset: true }).parse(url.searchParams.get("after"))
                : undefined,
              afterId: url.searchParams.get("afterId")
                ? id.parse(url.searchParams.get("afterId"))
                : undefined,
              moduleId: url.searchParams.get("module")
                ? z.string().min(1).max(80).parse(url.searchParams.get("module"))
                : undefined,
              learnerId: url.searchParams.get("learner")
                ? id.parse(url.searchParams.get("learner"))
                : undefined,
              state: z
                .enum([
                  "all",
                  "active",
                  "paused",
                  "needs_review",
                  "in_progress",
                  "overdue",
                  "upcoming",
                ])
                .parse(url.searchParams.get("state") ?? "all"),
              target: url.searchParams.get("target")
                ? target.parse(url.searchParams.get("target"))
                : undefined,
              native: url.searchParams.get("native")
                ? native.parse(url.searchParams.get("native"))
                : undefined,
            })),
            pilot: pilotAllowed(user.id),
          });
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request))
            throw new AssessmentAccessError("Cross-origin assessment request rejected.");
          if (new URL(request.url).searchParams.get("action") === "speech_upload") {
            const db = teamAdminClient(),
              user = await authenticatedUser(request, db);
            await budget(user.id, "speech_upload");
            return json(await uploadAssessmentSpeech(db, user.id, request));
          }
          if (Number(request.headers.get("content-length") ?? 0) > 220000)
            throw new AssessmentAccessError("Assessment request is too large.", 413);
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          const raw = await request.text();
          if (raw.length > 220000)
            throw new AssessmentAccessError("Assessment request is too large.", 413);
          const body = bodySchema.parse(JSON.parse(raw));
          await budget(user.id, body.action);
          if (body.action === "speech_reviewed") {
            await rpc(db, "assessment_ack_speech_review", {
              p_actor: user.id,
              p_evidence: body.evidenceId,
              p_request: body.requestId,
            });
            return json({ acknowledged: true });
          }
          if (body.action === "speech_withdraw") {
            await rpc(db, "assessment_withdraw_speech", {
              p_actor: user.id,
              p_evidence: body.evidenceId,
              p_request: body.requestId,
            });
            return json({ withdrawn: true });
          }
          if (body.action === "ai_writing")
            return json(await proposeWritingReview(db, user.id, body.attemptId, body.responseId));
          if (body.action === "enroll") {
            if (body.orgId) await requireTeamAdmin(db, body.orgId, user.id);
            else if (body.learnerId && body.learnerId !== user.id)
              throw new AssessmentAccessError("Personal assessment access required.");
            const prior = await db
              .from("assessment_enrollments")
              .select(
                "id,user_id,organization_id,module_id,target_language,instruction_language,start_date,timezone",
              )
              .eq("created_by", user.id)
              .eq("request_id", body.requestId)
              .maybeSingle();
            if (prior.error)
              throw new AssessmentAccessError("Assessment plan could not be checked.", 503);
            if (prior.data) {
              const row = prior.data;
              if (
                row.user_id !== (body.learnerId ?? user.id) ||
                row.organization_id !== (body.orgId ?? null) ||
                row.module_id !== body.moduleId ||
                row.target_language !== body.targetLanguage ||
                row.instruction_language !== body.instructionLanguage ||
                row.start_date !== body.startDate ||
                row.timezone !== body.timezone
              )
                throw new AssessmentAccessError(
                  "Enrollment request key reused with different details.",
                  409,
                );
              return json({ enrollmentId: row.id });
            }
            if (!(await assessmentContentAccess(db, body.learnerId ?? user.id, body.orgId ?? null)))
              throw new AssessmentAccessError(
                "Current module access is required to add an exam plan.",
              );
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
            if (!(await assessmentContentAccess(db, user.id, enrollment.organization_id)))
              throw new AssessmentAccessError(
                "Current module access is required to start an exam. Your saved responses remain available.",
              );
            let formQuery = db
              .from("assessment_forms")
              .select("id,status,calibrated,definition")
              .eq("release_id", enrollment.release_id)
              .eq("checkpoint", checkpoint.checkpoint)
              .eq("purpose", enrollment.program_scope === "support_units" ? "support" : "module");
            if (enrollment.program_scope === "support_units") {
              const { data: cap } = await db
                .from("assessment_support_capabilities")
                .select("status,before_form_id,after_form_id")
                .eq("id", enrollment.support_capability_id)
                .maybeSingle();
              if (cap?.status !== "verified")
                throw new AssessmentAccessError("Reviewed supporting checks are unavailable.", 400);
              formQuery = formQuery.eq(
                "id",
                checkpoint.checkpoint === "entrance" ? cap.before_form_id : cap.after_form_id,
              );
            }
            const { data: forms, error: formError } = await formQuery.order("created_at", {
              ascending: false,
            });
            if (formError)
              throw new AssessmentAccessError("Assessment forms are unavailable.", 503);
            const form =
              forms?.find(officialFormAvailable) ??
              (pilotAllowed(user.id) ? forms?.[0] : undefined);
            if (!form)
              throw new AssessmentAccessError(
                "This module exam is awaiting curriculum review.",
                400,
              );
            if (!pilotAllowed(user.id))
              await requireCurrentLessonBinding(db, enrollment.release_id, { officialStart: true });
            if (
              form.status === "verified" &&
              officialListeningGaps(form.definition as unknown as AssessmentFormDefinition).length
            )
              throw new AssessmentAccessError(
                "This exam needs reviewed, versioned listening clips before it can start.",
                503,
              );
            const { data: profile, error: profileError } = await db
              .from("profiles")
              .select("data")
              .eq("id", user.id)
              .maybeSingle();
            if (profileError)
              throw new AssessmentAccessError("Saved study coverage could not be loaded.", 503);
            const progressKey = core30ScopeKey(enrollment.module_id, {
              targetLanguage: enrollment.target_language,
              instructionLanguage: enrollment.instruction_language,
              enrollmentId: enrollment.id,
            });
            const log = extractCore30Log(profile?.data, [progressKey])[progressKey];
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
            const scheduled = await enrollmentAccess(db, user.id, body.enrollmentId, true);
            if (scheduled.role === "support")
              throw new AssessmentAccessError(
                "Adjust supporting work from the primary plan’s support controls.",
                400,
              );
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
