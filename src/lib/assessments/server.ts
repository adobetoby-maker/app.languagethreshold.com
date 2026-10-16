import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import type { Language, NativeLanguage } from "@/data/languages";
import { getCurriculum } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair, MODULES } from "@/data/modules";
import { memberRole, type TeamDb } from "@/lib/team-server";
import { ROOFING_PRACTICE_VERSION } from "@/lib/lesson-definition";
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
          : /conflict|reused|already|immutable/.test(message)
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
    return {
      attempt,
      checkpoint,
      enrollment: await enrollmentAccess(db, actor, checkpoint.enrollment_id, review),
    };
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
    if (!request || !enrollment || enrollment.scope !== "personal") throw error;
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
export async function listEnrollments(db: TeamDb, actor: string, orgId?: string) {
  let query = db
    .from("assessment_enrollments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (orgId) {
    const role = await memberRole(db, orgId, actor);
    if (!role) throw new AssessmentAccessError("Team assessment access required.");
    query = query.eq("organization_id", orgId);
    if (!["owner", "admin"].includes(role.role)) query = query.eq("user_id", actor);
  } else query = query.eq("user_id", actor);
  const { data: rows, error } = await query;
  if (error) throw new AssessmentAccessError("Assessment storage is not ready.", 503);
  let permitted = rows ?? [];
  if (!orgId) {
    const { data: memberships, error: membershipError } = await db
      .from("team_members")
      .select("organization_id")
      .eq("user_id", actor)
      .eq("status", "active");
    if (membershipError)
      throw new AssessmentAccessError("Team assessment permissions could not be loaded.", 503);
    const active = new Set((memberships ?? []).map((row) => row.organization_id));
    permitted = permitted.filter(
      (row) => row.scope === "personal" || active.has(row.organization_id),
    );
  }
  const ids = permitted.map((enrollment) => enrollment.id);
  if (!ids.length) return [];
  const { data: checkpoints, error: cpError } = await db
    .from("assessment_checkpoints")
    .select("*")
    .in("enrollment_id", ids);
  if (cpError) throw new AssessmentAccessError("Assessment schedule could not be loaded.", 503);
  const checkpointIds = (checkpoints ?? []).map((row) => row.id);
  const { data: attempts, error: attemptError } = checkpointIds.length
    ? await db
        .from("assessment_attempts")
        .select(
          "id,checkpoint_id,attempt_number,form_id,status,revision,started_at,submitted_at,designated",
        )
        .in("checkpoint_id", checkpointIds)
        .order("attempt_number", { ascending: false })
    : { data: [], error: null };
  if (attemptError)
    throw new AssessmentAccessError("Assessment attempts could not be loaded.", 503);
  const { data: forms, error: formsError } = await db
    .from("assessment_forms")
    .select("id,release_id,checkpoint,status,calibrated")
    .in("release_id", [...new Set(permitted.map((row) => row.release_id))]);
  const { data: releases, error: releasesError } = await db
    .from("assessment_releases")
    .select("id,status")
    .in("id", [...new Set(permitted.map((row) => row.release_id))]);
  if (formsError || releasesError)
    throw new AssessmentAccessError("Assessment readiness could not be loaded.", 503);
  return permitted.map((enrollment) => ({
    ...enrollment,
    checkpoints: (checkpoints ?? [])
      .filter((cp) => cp.enrollment_id === enrollment.id)
      .map((cp) => ({
        ...cp,
        ready:
          (releases ?? []).some(
            (release) => release.id === enrollment.release_id && release.status === "verified",
          ) &&
          (forms ?? []).some(
            (form) =>
              form.release_id === enrollment.release_id &&
              form.checkpoint === cp.checkpoint &&
              form.status === "verified",
          ),
        pilotReady:
          pilotAllowed(actor) &&
          (forms ?? []).some(
            (form) =>
              form.release_id === enrollment.release_id && form.checkpoint === cp.checkpoint,
          ),
        attempts: (attempts ?? []).filter((attempt) => attempt.checkpoint_id === cp.id),
      })),
  }));
}
export function readinessCatalog(target: Language, native: NativeLanguage) {
  return MODULES.filter(
    (module) => getCurriculum(module.id) && moduleSupportsLearningPair(module, target, native),
  ).map((module) => {
    const curriculum = getCurriculum(module.id)!;
    const roofing = module.id === "roofing" && target === "Spanish" && native === "English";
    return {
      moduleId: module.id,
      name: module.name,
      emoji: module.emoji,
      targetLanguage: target,
      instructionLanguage: native,
      lessonCount: curriculum.lessons.length,
      requiredLessonCount: 30,
      authoredLessonLists: roofing
        ? curriculum.lessons.filter((lesson) => lesson.words?.length).length
        : 0,
      contextualPassages: roofing ? 30 : 0,
      exams: {
        entrance: roofing ? "draft" : "missing",
        day45: roofing ? "draft" : "missing",
        day90: roofing ? "draft" : "missing",
      },
      status: "upgrade_in_progress",
      reviewer: null,
      verifiedAt: null,
      offlineVerified: false,
    };
  });
}
export async function readAttempt(db: TeamDb, actor: string, id: string, review = false) {
  const { attempt, checkpoint, enrollment } = await attemptAccess(db, actor, id, review);
  const form = attempt.form_snapshot.definition as AssessmentFormDefinition;
  const { data: responses, error } = await db
    .from("assessment_responses")
    .select("id,item_id,answer,saved_at")
    .eq("attempt_id", id);
  if (error) throw new AssessmentAccessError("Saved responses could not be loaded.", 503);
  let evidence: ItemEvidence[] = [];
  if (attempt.submitted_at) {
    const responseIds = (responses ?? []).map((row) => row.id);
    const { data: scores, error: scoreError } = responseIds.length
      ? await db
          .from("assessment_score_events")
          .select("*")
          .in("response_id", responseIds)
          .order("revision", { ascending: false })
      : { data: [], error: null };
    if (scoreError) throw new AssessmentAccessError("Assessment results could not be loaded.", 503);
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
  return {
    id: attempt.id,
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
  for (const response of responses ?? []) {
    const item = form.items.find((item) => item.id === response.item_id);
    if (!item) throw new AssessmentAccessError("Frozen assessment item is unavailable.", 503);
    const evidence = initialItemEvidence(item, response.answer as AssessmentAnswer);
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
