import { summarizedAttempt } from "./reporting";
import type { OverviewFilters, OverviewPage, AttemptSummary } from "./reporting";
import { enforceSpeakingRateLimit } from "@/lib/speaking-security";
import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import type { Language, NativeLanguage } from "@/data/languages";
import { getCurriculum } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair, MODULES } from "@/data/modules";
import { memberRole, type TeamDb } from "@/lib/team-server";
import { ROOFING_PRACTICE_VERSION } from "@/lib/lesson-definition";
import { lessonReleaseReadiness, officialFormAvailable } from "./release-readiness";
import { ROOFING_ASSESSMENT_RELEASE } from "./form";
import {
  publicAssessmentItem,
  initialItemEvidence,
  type AssessmentFormDefinition,
  type AssessmentAnswer,
} from "./form";
import { checkpointProfiles, type ItemEvidence, type Checkpoint } from "./core";

export class AssessmentAccessError extends Error {
  constructor(
    message: string,
    readonly status = 403,
  ) {
    super(message);
  }
}
export function pilotAllowed(userId: string): boolean {
  return (process.env.LT_EXAMS_PILOT_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .includes(userId);
}
export function stableRequestId(value: string): string {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function rpc<T>(db: TeamDb, name: string, args: Record<string, unknown>): Promise<T> {
  const result = await db.rpc(name, args);
  if (result.error) {
    const message = result.error.message;
    if (result.error.code === "P0001")
      throw new AssessmentAccessError(
        message,
        /access required|confirmation required/.test(message)
          ? 403
          : /conflict|reused|already|immutable|Speech upload expired/.test(message)
            ? 409
            : 400,
      );
    if (result.error.code === "23505")
      throw new AssessmentAccessError("This assessment already exists. Refresh to resume it.", 409);
    throw new AssessmentAccessError(
      "Assessment storage is unavailable. Your saved work has not been replaced.",
      503,
    );
  }
  return result.data as T;
}
export async function enrollmentAccess(db: TeamDb, actor: string, id: string, manage = false) {
  const { data: enrollment, error } = await db
    .from("assessment_enrollments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AssessmentAccessError("Assessment storage is not ready.", 503);
  if (!enrollment) throw new AssessmentAccessError("Assessment enrollment not found.", 404);
  if (enrollment.scope === "personal") {
    if (enrollment.user_id !== actor)
      throw new AssessmentAccessError("Personal assessment access required.");
  } else {
    const role = await memberRole(db, enrollment.organization_id, actor);
    const admin = role && ["owner", "admin"].includes(role.role);
    if (!role || (!admin && (manage || enrollment.user_id !== actor)))
      throw new AssessmentAccessError("Team assessment access required.");
  }
  return enrollment;
}
export async function attemptAccess(db: TeamDb, actor: string, id: string, review = false) {
  const { data: attempt, error } = await db
    .from("assessment_attempts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AssessmentAccessError("Assessment storage is not ready.", 503);
  if (!attempt) throw new AssessmentAccessError("Assessment attempt not found.", 404);
  const { data: checkpoint } = await db
    .from("assessment_checkpoints")
    .select("*")
    .eq("id", attempt.checkpoint_id)
    .single();
  if (!checkpoint) throw new AssessmentAccessError("Assessment checkpoint not found.", 404);
  try {
    const enrollment = await enrollmentAccess(db, actor, checkpoint.enrollment_id, review);
    if (review && enrollment.user_id === actor)
      throw new AssessmentAccessError("A different reviewer must review your assessment.");
    return { attempt, checkpoint, enrollment };
  } catch (error) {
    if (!(error instanceof AssessmentAccessError) || error.status !== 403 || !review) throw error;
    // Explicitly shared personal attempt only; no access to other attempts/profile/history.
    const { data: request } = await db
      .from("assessment_review_requests")
      .select("id")
      .eq("attempt_id", id)
      .eq("reviewer_id", actor)
      .eq("status", "claimed")
      .maybeSingle();
    const { data: enrollment } = await db
      .from("assessment_enrollments")
      .select("*")
      .eq("id", checkpoint.enrollment_id)
      .single();
    if (!request || !enrollment || enrollment.scope !== "personal" || enrollment.user_id === actor)
      throw error;
    const { data: reviewer } = await db
      .from("assessment_reviewers")
      .select("user_id")
      .eq("user_id", actor)
      .eq("module_id", enrollment.module_id)
      .eq("target_language", enrollment.target_language)
      .eq("instruction_language", enrollment.instruction_language)
      .eq("active", true)
      .maybeSingle();
    if (!reviewer) throw error;
    return { attempt, checkpoint, enrollment };
  }
}
export async function seedDraftTrack(
  db: TeamDb,
  moduleId: string,
  target: Language,
  native: NativeLanguage,
) {
  const module = getModule(moduleId),
    curriculum = getCurriculum(moduleId);
  if (
    target === native ||
    (target === "Chinese" && native === "Chinese (Simplified)") ||
    !module ||
    !curriculum ||
    !moduleSupportsLearningPair(module, target, native)
  )
    throw new AssessmentAccessError("This module does not support that language pair.", 400);
  const published = await db
    .from("assessment_releases")
    .select("id")
    .eq("module_id", moduleId)
    .eq("target_language", target)
    .eq("instruction_language", native)
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1);
  if (published.error)
    throw new AssessmentAccessError("Assessment releases could not be loaded.", 503);
  if (published.data?.[0]) return published.data[0].id;
  const roofing = moduleId === "roofing" && target === "Spanish" && native === "English";
  const releaseId = roofing
    ? ROOFING_ASSESSMENT_RELEASE
    : `${moduleId}-${target.toLowerCase().replace(/\W+/g, "-")}-${native.toLowerCase().replace(/\W+/g, "-")}-assessment-draft-v1`;
  const { error } = await db.from("assessment_releases").upsert(
    {
      id: releaseId,
      module_id: moduleId,
      target_language: target,
      instruction_language: native,
      content_version: roofing ? ROOFING_PRACTICE_VERSION : "legacy-draft-v1",
      status: "draft",
      lesson_manifest: {
        lessonCount: curriculum.lessons.length,
        requiredLessonCount: 30,
        lessonIds: curriculum.lessons.map((lesson) => `${moduleId}.lesson.${lesson.n}`),
        reviewed: false,
        offlineVerified: false,
      },
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw new AssessmentAccessError("Assessment storage is not ready.", 503);
  return releaseId;
}
export async function listEnrollments(
  db: TeamDb,
  actor: string,
  orgId?: string,
  filters: OverviewFilters = {},
) {
  const page = await rpc<OverviewPage>(db, "assessment_overview_page", {
    p_actor: actor,
    p_org: orgId ?? null,
    p_after: filters.after ?? null,
    p_after_id: filters.afterId ?? null,
    p_module: filters.moduleId ?? null,
    p_learner: filters.learnerId ?? null,
    p_state: filters.state ?? "all",
    p_target: filters.target ?? null,
    p_native: filters.native ?? null,
  });
  const permitted = page.enrollments,
    checkpoints = page.checkpoints,
    attempts = page.attempts;
  const ids = permitted.map((enrollment) => enrollment.id);
  if (!ids.length) return { enrollments: [], hasMore: page.hasMore, nextCursor: null, limit: 50 };
  const { data: forms, error: formsError } = await db
    .from("assessment_forms")
    .select("id,release_id,checkpoint,status,calibrated")
    .eq("purpose", "module")
    .in("release_id", [...new Set(permitted.map((row) => row.release_id))]);
  const { data: releases, error: releasesError } = await db
    .from("assessment_releases")
    .select("id,module_id,target_language,instruction_language,status,lesson_manifest")
    .in("id", [...new Set(permitted.map((row) => row.release_id))]);
  if (formsError || releasesError)
    throw new AssessmentAccessError("Assessment readiness could not be loaded.", 503);
  const bindings = await db
    .from("assessment_lesson_snapshots")
    .select("release_id,snapshot_text,fingerprint")
    .in("release_id", [...new Set(permitted.map((row) => row.release_id))]);
  if (bindings.error)
    throw new AssessmentAccessError("Lesson readiness could not be checked.", 503);
  const availableReleases = new Set(
    (
      await Promise.all(
        (releases ?? []).map(async (release) => ({
          id: release.id,
          readiness: await lessonReleaseReadiness(
            release,
            bindings.data?.find((row) => row.release_id === release.id),
          ),
        })),
      )
    )
      .filter((row) => row.readiness.available)
      .map((row) => row.id),
  );
  const summaries = await rpc<AttemptSummary[]>(db, "assessment_selected_summaries", {
    p_actor: actor,
    p_enrollments: ids,
    p_attempts: attempts.map((attempt) => attempt.id),
  });
  const enrollments = permitted.map((enrollment) => ({
    ...enrollment,
    checkpoints: (checkpoints ?? [])
      .filter((cp) => cp.enrollment_id === enrollment.id)
      .map((cp) => ({
        ...cp,
        ready:
          availableReleases.has(enrollment.release_id) &&
          (forms ?? []).some(
            (form) =>
              form.release_id === enrollment.release_id &&
              form.checkpoint === cp.checkpoint &&
              officialFormAvailable(form),
          ),
        pilotReady:
          pilotAllowed(actor) &&
          (forms ?? []).some(
            (form) =>
              form.release_id === enrollment.release_id && form.checkpoint === cp.checkpoint,
          ),
        attempts: (attempts ?? [])
          .filter((attempt) => attempt.checkpoint_id === cp.id)
          .map((attempt) => {
            const baselineCheckpoint = checkpoints.find(
              (row) => row.enrollment_id === enrollment.id && row.checkpoint === "entrance",
            );
            const original = attempts.find(
              (row) =>
                row.checkpoint_id === baselineCheckpoint?.id && row.designated && row.submitted_at,
            );
            return summarizedAttempt(
              cp.checkpoint,
              attempt,
              summaries.find((row) => row.attemptId === attempt.id),
              summaries.find((row) => row.attemptId === original?.id),
            );
          }),
      })),
  }));
  return {
    enrollments,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor
      ? { after: page.nextCursor.createdAt, afterId: page.nextCursor.id }
      : null,
    limit: 50,
  };
}
export async function readinessCatalog(db: TeamDb, target: Language, native: NativeLanguage) {
  const { data: releases, error } = await db
    .from("assessment_releases")
    .select(
      "id,module_id,target_language,instruction_language,status,lesson_manifest,review_records,verified_at,created_at",
    )
    .eq("target_language", target)
    .eq("instruction_language", native)
    .order("created_at", { ascending: false });
  if (error) throw new AssessmentAccessError("Curriculum readiness could not be loaded.", 503);
  const ids = (releases ?? []).map((row) => row.id);
  const { data: forms, error: formError } = ids.length
    ? await db
        .from("assessment_forms")
        .select("release_id,checkpoint,status,calibrated,review_records")
        .eq("purpose", "module")
        .in("release_id", ids)
    : { data: [], error: null };
  if (formError) throw new AssessmentAccessError("Exam readiness could not be loaded.", 503);
  const boundIds = (releases ?? [])
    .filter((release) => typeof release.lesson_manifest?.lessonSnapshotFingerprint === "string")
    .map((release) => release.id);
  const bindings = boundIds.length
    ? await db
        .from("assessment_lesson_snapshots")
        .select("release_id,snapshot_text,fingerprint")
        .in("release_id", boundIds)
    : { data: [], error: null };
  if (bindings.error)
    throw new AssessmentAccessError("Lesson readiness could not be checked.", 503);
  return Promise.all(
    MODULES.filter(
      (module) => getCurriculum(module.id) && moduleSupportsLearningPair(module, target, native),
    ).map(async (module) => {
      const curriculum = getCurriculum(module.id)!;
      const release =
        (releases ?? []).find((row) => row.module_id === module.id && row.status === "verified") ??
        (releases ?? []).find((row) => row.module_id === module.id);
      const readiness = await lessonReleaseReadiness(
        release ?? {
          module_id: module.id,
          target_language: target,
          instruction_language: native,
          status: "missing",
          lesson_manifest: null,
        },
        bindings.data?.find((row) => row.release_id === release?.id),
      );
      const sourceCoverage = readiness.coverage;
      const examStates = Object.fromEntries(
        (["entrance", "day45", "day90"] as const).map((checkpoint) => {
          const matching = (forms ?? []).filter(
            (row) => row.release_id === release?.id && row.checkpoint === checkpoint,
          );
          const chosen =
            matching.find(officialFormAvailable) ??
            matching.find((row) => row.status === "verified") ??
            matching[0];
          return [checkpoint, chosen?.status ?? "missing"];
        }),
      );
      const bindingCurrent = readiness.current;
      const reviewed = readiness.reviewed;
      const calibrated =
        !!release &&
        (["entrance", "day45", "day90"] as const).every((checkpoint) =>
          (forms ?? []).some(
            (form) =>
              form.release_id === release.id &&
              form.checkpoint === checkpoint &&
              officialFormAvailable(form),
          ),
        );
      const verified = readiness.available && calibrated;
      return {
        moduleId: module.id,
        name: module.name,
        emoji: module.emoji,
        targetLanguage: target,
        instructionLanguage: native,
        lessonCount: curriculum.lessons.length,
        requiredLessonCount: 30,
        authoredLessonLists: sourceCoverage.lessonsWithWords,
        contextualPassages: sourceCoverage.lessonsWithPassages,
        sourceCoverage,
        exams: examStates,
        status: verified ? "verified" : "upgrade_in_progress",
        contentReviewCount: Array.isArray(release?.review_records)
          ? release.review_records.length
          : 0,
        lessonsReviewed: reviewed,
        lessonSnapshotCurrent: bindingCurrent,
        calibrated,
        verifiedAt: verified ? release?.verified_at : null,
        offlineVerified: verified && release?.lesson_manifest?.offlineVerified === true,
      };
    }),
  );
}
export async function readAttempt(db: TeamDb, actor: string, id: string, review = false) {
  const { attempt, checkpoint, enrollment } = await attemptAccess(db, actor, id, review);
  const form = attempt.form_snapshot.definition as AssessmentFormDefinition;
  const { data: responses, error } = await db
    .from("assessment_responses")
    .select("id,item_id,answer,saved_at")
    .eq("attempt_id", id);
  if (error) throw new AssessmentAccessError("Saved responses could not be loaded.", 503);
  const mediaIds = (responses ?? [])
    .map((r) => r.answer?.mediaEvidenceId)
    .filter((id): id is string => typeof id === "string");
  const media = mediaIds.length
    ? await db
        .from("assessment_speech_evidence")
        .select("id,item_id,state,delete_requested_at,ready_at")
        .eq("attempt_id", id)
        .in("id", mediaIds)
    : { data: [], error: null };
  if (media.error)
    throw new AssessmentAccessError("Speech evidence status could not be loaded.", 503);
  let evidence: ItemEvidence[] = [];
  if (attempt.submitted_at) {
    const scores = await rpc<
      {
        response_id: string;
        objective_id: string;
        skill: ItemEvidence["skill"];
        state: ItemEvidence["state"];
        points: number | null;
        maximum: number;
        source: ItemEvidence["source"];
        comparison_group: string;
        coverage: ItemEvidence["coverage"];
        rationale: string;
      }[]
    >(db, "assessment_latest_scores", {
      p_actor: actor,
      p_attempt: id,
    });
    const seen = new Set<string>();
    evidence = (scores ?? [])
      .filter((score) => {
        if (seen.has(score.response_id)) return false;
        seen.add(score.response_id);
        return true;
      })
      .map((score) => ({
        itemId: (responses ?? []).find((row) => row.id === score.response_id)!.item_id,
        objectiveId: score.objective_id,
        skill: score.skill,
        state: score.state,
        points: score.points === null ? null : Number(score.points),
        maximum: Number(score.maximum),
        source: score.source,
        comparisonGroup: score.comparison_group,
        coverage: score.coverage,
        reason: score.rationale,
      }));
  }
  let canReview = false;
  if (enrollment.user_id !== actor && attempt.submitted_at) {
    try {
      await attemptAccess(db, actor, id, true);
      canReview = true;
    } catch {
      /* No review authority. */
    }
  }
  const { data: reviews, error: reviewError } = await db
    .from("assessment_review_requests")
    .select("id,status,reason,reviewer_id,created_at")
    .eq("attempt_id", id)
    .order("created_at", { ascending: false });
  if (reviewError) throw new AssessmentAccessError("Review history could not be loaded.", 503);
  const responseIds = (responses ?? []).map((row) => row.id);
  const priorForms = await db
    .from("assessment_attempts")
    .select("id")
    .eq("checkpoint_id", checkpoint.id)
    .eq("form_id", attempt.form_id)
    .lt("attempt_number", attempt.attempt_number)
    .limit(1);
  if (priorForms.error)
    throw new AssessmentAccessError("Assessment exposure history could not be loaded.", 503);
  const [jobs, proposals] =
    attempt.submitted_at && responseIds.length
      ? await Promise.all([
          db
            .from("assessment_grading_jobs")
            .select("response_id,status")
            .in("response_id", responseIds),
          db
            .from("assessment_events")
            .select("detail")
            .eq("enrollment_id", enrollment.id)
            .eq("action", "ai.proposal")
            .eq("detail->>attemptId", id),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
  if (jobs.error || proposals.error)
    throw new AssessmentAccessError("Review status could not be loaded.", 503);
  return {
    repeatedForm: !!priorForms.data?.length,
    studiedObjectiveCount: Array.isArray(attempt.form_snapshot.reportedStudiedObjectives)
      ? attempt.form_snapshot.reportedStudiedObjectives.length
      : 0,
    aiWritingAvailable:
      (attempt.form_snapshot.pilot === true && pilotAllowed(actor)) ||
      (attempt.form_snapshot.calibrated === true && form.status === "verified"),
    gradingJobs: jobs.data ?? [],
    aiProposals: (proposals.data ?? []).map(
      (row) =>
        row.detail as {
          responseId: string;
          dimensions: Record<string, number>;
          confidence: number;
          model: string;
          rubricVersion: string;
        },
    ),
    speechEvidence: (media.data ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      available: row.state === "ready" && !row.delete_requested_at,
      state: row.delete_requested_at ? "withdrawn" : row.state,
      readyAt: row.ready_at,
    })),
    id: attempt.id,
    isLearner: enrollment.user_id === actor,
    canReview,
    reviews: reviews ?? [],
    status: attempt.status,
    revision: attempt.revision,
    startedAt: attempt.started_at,
    savedAt: attempt.saved_at,
    submittedAt: attempt.submitted_at,
    attemptNumber: attempt.attempt_number,
    designated: attempt.designated,
    pilot: attempt.form_snapshot.pilot === true,
    enrollment: {
      id: enrollment.id,
      scope: enrollment.scope,
      programScope: enrollment.program_scope,
      role: enrollment.role,
      supportCapabilityId: enrollment.support_capability_id,
      organizationId: enrollment.organization_id,
      moduleId: enrollment.module_id,
      targetLanguage: enrollment.target_language,
      instructionLanguage: enrollment.instruction_language,
      status: enrollment.status,
      timezone: enrollment.timezone,
    },
    checkpoint: {
      id: checkpoint.id,
      checkpoint: checkpoint.checkpoint,
      dueDate: checkpoint.due_date,
      dueAt: checkpoint.due_at,
    },
    form: {
      id: form.id,
      version: form.version,
      rubricVersion: form.rubricVersion,
      estimatedMinutes: form.estimatedMinutes,
      items: form.items.map(publicAssessmentItem),
    },
    responses: responses ?? [],
    profiles: attempt.submitted_at
      ? checkpointProfiles(
          checkpoint.checkpoint as Checkpoint,
          evidence,
          attempt.form_snapshot.calibrated === true,
        )
      : [],
    evidence,
    feedback: attempt.submitted_at
      ? form.items.map((item) => ({
          itemId: item.id,
          accepted: item.accepted,
          correctOptionId: item.correctOptionId,
          rationale: item.rationale,
          rubric: item.rubric,
        }))
      : undefined,
  };
}
export async function initializeScores(db: TeamDb, actor: string, id: string) {
  const { attempt } = await attemptAccess(db, actor, id);
  if (!attempt.submitted_at) throw new AssessmentAccessError("Submit this assessment first.", 400);
  const form = attempt.form_snapshot.definition as AssessmentFormDefinition;
  const { data: responses, error } = await db
    .from("assessment_responses")
    .select("id,item_id,answer")
    .eq("attempt_id", id);
  if (error) throw new AssessmentAccessError("Submitted responses could not be loaded.", 503);
  const media = (responses ?? []).some((row) => row.answer?.mediaEvidenceId)
    ? await db
        .from("assessment_speech_evidence")
        .select("id,item_id,policy_version,state,delete_requested_at")
        .eq("attempt_id", id)
        .eq("state", "ready")
        .is("delete_requested_at", null)
    : { data: [], error: null };
  if (media.error)
    throw new AssessmentAccessError("Submitted recording status could not be loaded.", 503);
  const policies = media.data?.length
    ? await db
        .from("assessment_media_policies")
        .select("version")
        .in(
          "version",
          media.data.map((m) => m.policy_version),
        )
        .not("approved_at", "is", null)
    : { data: [], error: null };
  if (policies.error)
    throw new AssessmentAccessError("Recording consent policy could not be checked.", 503);
  const approved = new Set((policies.data ?? []).map((p) => p.version));
  for (const response of responses ?? []) {
    const item = form.items.find((item) => item.id === response.item_id);
    if (!item) throw new AssessmentAccessError("Frozen assessment item is unavailable.", 503);
    const verifiedSpeechId = media.data?.find(
      (m) =>
        m.id === response.answer?.mediaEvidenceId &&
        m.item_id === response.item_id &&
        approved.has(m.policy_version),
    )?.id;
    const evidence = initialItemEvidence(
      item,
      response.answer as AssessmentAnswer,
      verifiedSpeechId,
    );
    await rpc(db, "assessment_record_score", {
      p_actor: actor,
      p_response: response.id,
      p_state: evidence.state === "pending" ? "needs_review" : evidence.state,
      p_points: evidence.points,
      p_source: evidence.source,
      p_reason: evidence.reason ?? "Reviewed fixed answer policy applied.",
      p_confidence: null,
      p_model: null,
      p_request: stableRequestId(`initial:${response.id}:${form.rubricVersion}`),
    });
  }
}

export async function assessmentBudget(actor: string, action: string) {
  const limit =
    action === "ai_proposal" || action === "speech_upload"
      ? 3
      : action === "save"
        ? 90
        : action === "enroll" || action === "start"
          ? 6
          : 30;
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
