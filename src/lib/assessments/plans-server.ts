import "@tanstack/react-start/server-only";
import { studyPlanStart } from "./plan-timing";
import type { TeamDb } from "@/lib/team-server";
import { getModule } from "@/data/modules";
import { checkpointProfiles, type Checkpoint, type ItemEvidence } from "./core";
import { AssessmentAccessError, enrollmentAccess, rpc } from "./server";

async function canManage(db: TeamDb, actor: string, id: string) {
  try {
    await enrollmentAccess(db, actor, id, true);
    return true;
  } catch (error) {
    if (error instanceof AssessmentAccessError && error.status === 403) return false;
    throw error;
  }
}
export async function readAssessmentPlan(db: TeamDb, actor: string, id: string, sourceId?: string) {
  const enrollment = await enrollmentAccess(db, actor, id),
    manage = await canManage(db, actor, id);
  if (enrollment.role !== "primary")
    throw new AssessmentAccessError("Open the primary module to manage its supporting work.", 400);
  const [recommendations, assignments, revisions, checkpoints] = await Promise.all([
    db
      .from("assessment_recommendations")
      .select(
        "id,attempt_id,capability_id,capability_version,evidence,why,decision,decision_reason,decided_at,created_at",
      )
      .eq("enrollment_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("assessment_support_assignments")
      .select("*")
      .eq("enrollment_id", id)
      .order("approved_at", { ascending: false })
      .limit(50),
    db
      .from("assessment_plan_revisions")
      .select(
        "id,source_attempt_id,revision,suggested_lesson,focus_ways,catchup_objectives,rationale,evidence,created_at,review_every_days",
      )
      .eq("enrollment_id", id)
      .order("revision", { ascending: false })
      .limit(50),
    db.from("assessment_checkpoints").select("id,checkpoint").eq("enrollment_id", id),
  ]);
  if ([recommendations, assignments, revisions, checkpoints].some((result) => result.error))
    throw new AssessmentAccessError("The assessment plan could not be loaded.", 503);
  const cpIds = (checkpoints.data ?? []).map((row) => row.id);
  const { data: attempts, error: attemptError } = cpIds.length
    ? await db
        .from("assessment_attempts")
        .select("id,checkpoint_id,attempt_number,submitted_at,designated,status,form_snapshot")
        .in("checkpoint_id", cpIds)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };
  if (attemptError)
    throw new AssessmentAccessError("Assessment evidence could not be loaded.", 503);
  const source = sourceId
    ? (attempts ?? []).find((row) => row.id === sourceId)
    : (attempts ?? []).find((row) => row.designated);
  if (sourceId && !source)
    throw new AssessmentAccessError("Source assessment belongs to another plan.", 403);
  const summaries = source
    ? await rpc<
        {
          attemptId: string;
          checkpoint: Checkpoint;
          calibrated: boolean;
          evidence: ItemEvidence[];
        }[]
      >(db, "assessment_progress_summaries", { p_actor: actor, p_enrollments: [id] })
    : [];
  const summary = summaries.find((row) => row.attemptId === source?.id);
  const profiles = summary
    ? checkpointProfiles(summary.checkpoint, summary.evidence, summary.calibrated)
    : [];
  const accessAvailable = await assessmentContentAccess(
    db,
    enrollment.user_id,
    enrollment.organization_id,
  );
  const candidates =
    source && manage && accessAvailable
      ? await rpc<Record<string, unknown>[]>(db, "assessment_support_candidates", {
          p_actor: actor,
          p_enrollment: id,
          p_attempt: source.id,
        })
      : [];
  const childIds = (assignments.data ?? []).map((row) => row.support_enrollment_id);
  const { data: childCheckpoints, error: childError } = childIds.length
    ? await db
        .from("assessment_checkpoints")
        .select("id,enrollment_id,checkpoint,due_date,status")
        .in("enrollment_id", childIds)
    : { data: [], error: null };
  if (childError) throw new AssessmentAccessError("Supporting checks could not be loaded.", 503);
  const childCpIds = (childCheckpoints ?? []).map((row) => row.id);
  const { data: childAttempts, error: childAttemptError } = childCpIds.length
    ? await db
        .from("assessment_attempts")
        .select("id,checkpoint_id,status,attempt_number,submitted_at,designated")
        .in("checkpoint_id", childCpIds)
        .order("attempt_number", { ascending: false })
    : { data: [], error: null };
  if (childAttemptError)
    throw new AssessmentAccessError("Supporting check history could not be loaded.", 503);
  const capabilityIds = (recommendations.data ?? []).map((row) => row.capability_id);
  const { data: capabilities, error: capError } = capabilityIds.length
    ? await db
        .from("assessment_support_capabilities")
        .select("id,title,lesson_ids,weekly_minutes,offline_available,assignment_mode,release_id")
        .in("id", capabilityIds)
    : { data: [], error: null };
  if (capError)
    throw new AssessmentAccessError("Supporting unit descriptions could not be loaded.", 503);
  const hasGap = profiles.some(
    (profile) =>
      profile.coverage !== "transfer" &&
      profile.skills.some(
        (skill) => skill.score !== null && skill.score < 100 && !skill.provisional,
      ),
  );
  return {
    enrollment: {
      id: enrollment.id,
      moduleId: enrollment.module_id,
      userId: enrollment.user_id,
      scope: enrollment.scope,
      organizationId: enrollment.organization_id,
      targetLanguage: enrollment.target_language,
      instructionLanguage: enrollment.instruction_language,
      status: enrollment.status,
      timezone: enrollment.timezone,
    },
    canManage: manage,
    accessAvailable,
    isLearner: enrollment.user_id === actor,
    source: source
      ? {
          id: source.id,
          checkpoint: checkpoints.data?.find((cp) => cp.id === source.checkpoint_id)?.checkpoint,
          attemptNumber: source.attempt_number,
          submittedAt: source.submitted_at,
          designated: source.designated,
          pilot: source.form_snapshot.pilot === true,
          calibrated: source.form_snapshot.calibrated === true,
          profiles,
        }
      : null,
    availableSources: (attempts ?? []).map((row) => ({
      id: row.id,
      checkpoint: checkpoints.data?.find((cp) => cp.id === row.checkpoint_id)?.checkpoint,
      attemptNumber: row.attempt_number,
      submittedAt: row.submitted_at,
      designated: row.designated,
    })),
    candidates: candidates.filter((candidate) => getModule(String(candidate.moduleId))),
    availability: !accessAvailable
      ? "access_needed"
      : !source
        ? "assessment_needed"
        : source.form_snapshot.pilot === true || source.form_snapshot.calibrated !== true
          ? "awaiting_calibration"
          : !hasGap
            ? "evidence_needed"
            : candidates.length
              ? "ready"
              : "content_gap",
    recommendations: (recommendations.data ?? []).map((row) => ({
      ...row,
      capability: capabilities?.find((cap) => cap.id === row.capability_id),
    })),
    assignments: (assignments.data ?? []).map((row) => ({
      ...row,
      checkpoints: (childCheckpoints ?? [])
        .filter((cp) => cp.enrollment_id === row.support_enrollment_id)
        .map((cp) => ({
          ...cp,
          attempts: (childAttempts ?? []).filter((attempt) => attempt.checkpoint_id === cp.id),
        })),
    })),
    revisions: revisions.data ?? [],
    limit: 50,
  };
}

/** Learner-only daily guidance; no team-wide roster or private profile fields. */
export async function readDailyAssessmentPlans(
  db: TeamDb,
  actor: string,
  moduleId: string,
  target: string,
  native: string,
) {
  const { data: plans, error } = await db
    .from("assessment_enrollments")
    .select("id")
    .eq("user_id", actor)
    .eq("module_id", moduleId)
    .eq("target_language", target)
    .eq("instruction_language", native)
    .eq("role", "primary")
    .in("status", ["active", "paused"])
    .limit(20);
  if (error) throw new AssessmentAccessError("Daily assessment guidance could not be loaded.", 503);
  const results = await Promise.all(
    (plans ?? []).map(async (row) => {
      try {
        const en = await enrollmentAccess(db, actor, row.id);
        const { data: resumes, error: resumeError } = await db
          .from("assessment_events")
          .select("created_at,detail")
          .eq("enrollment_id", en.id)
          .eq("action", "schedule.changed")
          .eq("detail->>change", "resume")
          .order("created_at")
          .limit(1000);
        if (resumeError || (resumes?.length ?? 0) >= 1000)
          throw new AssessmentAccessError(
            "The plan pause history could not be loaded in full.",
            503,
          );
        const [revision, assignments, recommendations] = await Promise.all([
          db
            .from("assessment_plan_revisions")
            .select(
              "id,source_attempt_id,revision,suggested_lesson,focus_ways,catchup_objectives,rationale,created_at,review_every_days",
            )
            .eq("enrollment_id", en.id)
            .order("revision", { ascending: false })
            .limit(1),
          db
            .from("assessment_support_assignments")
            .select(
              "id,recommendation_id,capability_snapshot,mode,support_enrollment_id,primary_weekly_minutes,support_weekly_minutes,support_cap_percent,status,acknowledged_at",
            )
            .eq("enrollment_id", en.id)
            .in("status", ["active", "paused", "checkpoint_due"]),
          db
            .from("assessment_recommendations")
            .select("id,why,evidence")
            .eq("enrollment_id", en.id)
            .eq("decision", "approved"),
        ]);
        if (revision.error || assignments.error || recommendations.error)
          throw new AssessmentAccessError("Daily guidance is unavailable.", 503);
        const assignmentIds = (assignments.data ?? []).map((row) => row.support_enrollment_id);
        const { data: checks, error: checkError } = assignmentIds.length
          ? await db
              .from("assessment_checkpoints")
              .select("id,enrollment_id,checkpoint,due_date,status")
              .in("enrollment_id", assignmentIds)
          : { data: [], error: null };
        if (checkError)
          throw new AssessmentAccessError("Supporting checks could not be loaded.", 503);
        const checkIds = (checks ?? []).map((row) => row.id);
        const { data: attempts, error: attemptError } = checkIds.length
          ? await db
              .from("assessment_attempts")
              .select("id,checkpoint_id,status,attempt_number,submitted_at,designated")
              .in("checkpoint_id", checkIds)
              .order("attempt_number", { ascending: false })
          : { data: [], error: null };
        if (attemptError)
          throw new AssessmentAccessError("Supporting check history could not be loaded.", 503);
        return {
          enrollmentId: en.id,
          scope: en.scope,
          organizationId: en.organization_id,
          startDate: studyPlanStart(en.start_date, en.timezone, resumes ?? []),
          timezone: en.timezone,
          status: en.status,
          pausedOn: en.paused_on,
          revision: revision.data?.[0] ?? null,
          assignments: (assignments.data ?? []).map((assignment) => ({
            ...assignment,
            checkpoints: (checks ?? [])
              .filter((cp) => cp.enrollment_id === assignment.support_enrollment_id)
              .map((cp) => ({
                ...cp,
                attempts: (attempts ?? []).filter((attempt) => attempt.checkpoint_id === cp.id),
              })),
            reason:
              recommendations.data?.find((rec) => rec.id === assignment.recommendation_id)?.why ??
              "",
            primaryObjectives:
              recommendations.data
                ?.find((rec) => rec.id === assignment.recommendation_id)
                ?.evidence?.map((item: { objectiveId: string }) => item.objectiveId) ?? [],
          })),
        };
      } catch (error) {
        if (error instanceof AssessmentAccessError && error.status === 403) return null;
        throw error;
      }
    }),
  );
  const { data: supporting, error: supportError } = await db
    .from("assessment_support_assignments")
    .select("id,enrollment_id,capability_snapshot,status")
    .eq("user_id", actor)
    .in("status", ["active", "paused", "checkpoint_due"])
    .limit(50);
  if (supportError)
    throw new AssessmentAccessError("Supporting lesson context could not be loaded.", 503);
  const returns = await Promise.all(
    (supporting ?? [])
      .filter(
        (row) =>
          row.capability_snapshot.moduleId === moduleId &&
          row.capability_snapshot.targetLanguage === target &&
          row.capability_snapshot.instructionLanguage === native,
      )
      .map(async (row) => {
        try {
          const primary = await enrollmentAccess(db, actor, row.enrollment_id);
          return {
            assignmentId: row.id,
            primaryEnrollmentId: primary.id,
            primaryModuleId: primary.module_id,
            primaryModuleName: getModule(primary.module_id)?.name ?? primary.module_id,
            status: row.status,
            scope: primary.scope,
          };
        } catch (error) {
          if (error instanceof AssessmentAccessError && error.status === 403) return null;
          throw error;
        }
      }),
  );
  return { plans: results.filter(Boolean), returnContexts: returns.filter(Boolean), limit: 20 };
}

/** Follow the app's existing public-demo and subscription/seat rules. */
export async function assessmentContentAccess(
  db: TeamDb,
  userId: string,
  organizationId: string | null,
) {
  if (process.env.VITE_DEMO_MODE !== "false") return true;
  if (!organizationId) {
    const { data: profile, error } = await db
      .from("profiles")
      .select("subscriptionStatus:data->>subscription_status")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new AssessmentAccessError("Learning access could not be checked.", 503);
    if (profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing")
      return true;
  }
  const { data: members, error: memberError } = await db
    .from("team_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (memberError) throw new AssessmentAccessError("Learning access could not be checked.", 503);
  const ids = (members ?? [])
    .map((row) => row.organization_id)
    .filter((id) => !organizationId || id === organizationId);
  if (!ids.length) return false;
  const { data: plans, error } = await db
    .from("team_entitlements")
    .select("status,period_end")
    .in("organization_id", ids)
    .in("status", ["active", "manual"]);
  if (error) throw new AssessmentAccessError("Learning access could not be checked.", 503);
  return (plans ?? []).some(
    (plan) =>
      plan.status === "active" ||
      (plan.status === "manual" && !!plan.period_end && Date.parse(plan.period_end) > Date.now()),
  );
}
