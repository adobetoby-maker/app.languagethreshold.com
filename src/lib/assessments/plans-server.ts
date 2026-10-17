import "@tanstack/react-start/server-only";
import type { CheckpointHeads } from "./reporting";
import { studyPlanStart } from "./plan-timing";
import type { TeamDb } from "@/lib/team-server";
import { getModule } from "@/data/modules";
import { checkpointProfiles } from "./core";
import { AssessmentAccessError, enrollmentAccess, rpc, selectedSummaries } from "./server";
import type { LearnerGoal } from "./goals";
const recommendationFields =
  "id,attempt_id,capability_id,capability_version,evidence,why,decision,decision_reason,decided_at,created_at,basis,goal_snapshot";

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
  const [recommendations, assignments, revisions, checkpoints, pending, current] =
    await Promise.all([
      db
        .from("assessment_recommendations")
        .select(recommendationFields)
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
      db
        .from("assessment_recommendations")
        .select(recommendationFields)
        .eq("enrollment_id", id)
        .in("decision", ["suggested", "deferred"]),
      db
        .from("assessment_support_assignments")
        .select("*")
        .eq("enrollment_id", id)
        .in("status", ["active", "paused", "checkpoint_due"]),
    ]);
  if (
    [recommendations, assignments, revisions, checkpoints, pending, current].some(
      (result) => result.error,
    )
  )
    throw new AssessmentAccessError("The assessment plan could not be loaded.", 503);
  const recommendationRows = [
    ...new Map(
      [...(recommendations.data ?? []), ...(pending.data ?? [])].map((row) => [row.id, row]),
    ).values(),
  ];
  const assignmentRows = [
    ...new Map(
      [...(assignments.data ?? []), ...(current.data ?? [])].map((row) => [row.id, row]),
    ).values(),
  ];
  const cpIds = (checkpoints.data ?? []).map((row) => row.id);
  const { data: attempts, error: attemptError } = cpIds.length
    ? await db
        .from("assessment_attempts")
        .select(
          "id,checkpoint_id,attempt_number,submitted_at,designated,status,pilot:form_snapshot->pilot,calibrated:form_snapshot->calibrated",
        )
        .in("checkpoint_id", cpIds)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };
  if (attemptError)
    throw new AssessmentAccessError("Assessment evidence could not be loaded.", 503);
  const heads = cpIds.length
    ? await rpc<CheckpointHeads[]>(db, "assessment_checkpoint_heads", {
        p_actor: actor,
        p_checkpoints: cpIds,
      })
    : [];
  const sourceRows = [...(attempts ?? [])];
  const extraIds = [
    ...new Set([
      ...heads.flatMap((head) =>
        head.attempts.filter((row) => row.submitted_at).map((row) => row.id),
      ),
      ...(sourceId ? [sourceId] : []),
    ]),
  ].filter((value) => !sourceRows.some((row) => row.id === value));
  if (extraIds.length) {
    const extra = await db
      .from("assessment_attempts")
      .select(
        "id,checkpoint_id,attempt_number,submitted_at,designated,status,pilot:form_snapshot->pilot,calibrated:form_snapshot->calibrated",
      )
      .in("id", extraIds)
      .in("checkpoint_id", cpIds)
      .not("submitted_at", "is", null);
    if (extra.error)
      throw new AssessmentAccessError("Original assessment sources could not be loaded.", 503);
    sourceRows.push(...(extra.data ?? []));
  }
  sourceRows.sort((a, b) => Date.parse(b.submitted_at ?? "") - Date.parse(a.submitted_at ?? ""));
  const source = sourceId
    ? sourceRows.find((row) => row.id === sourceId)
    : sourceRows.find((row) => row.designated);
  if (sourceId && !source)
    throw new AssessmentAccessError("Source assessment belongs to another plan.", 403);
  const summaries = source ? await selectedSummaries(db, actor, [id], [source.id]) : [];
  const summary = summaries.find((row) => row.attemptId === source?.id);
  const profiles = summary
    ? checkpointProfiles(summary.checkpoint, summary.evidence, summary.calibrated)
    : [];
  const accessAvailable = await assessmentContentAccess(
    db,
    enrollment.user_id,
    enrollment.organization_id,
  );
  const goalResult = await db
    .from("assessment_learner_goals")
    .select("revision,topics,offline_preferred,updated_at")
    .eq("enrollment_id", id)
    .maybeSingle();
  if (goalResult.error) throw new AssessmentAccessError("Learner goals could not be loaded.", 503);
  const goals = {
    revision: goalResult.data?.revision ?? 0,
    topics: (goalResult.data?.topics ?? []) as LearnerGoal[],
    offlinePreferred: goalResult.data?.offline_preferred === true,
    updatedAt: goalResult.data?.updated_at ?? null,
  };
  const candidates =
    manage && accessAvailable
      ? await rpc<Record<string, unknown>[]>(db, "assessment_support_candidates", {
          p_actor: actor,
          p_enrollment: id,
          p_attempt: source?.id ?? null,
        })
      : [];
  const childIds = assignmentRows.map((row) => row.support_enrollment_id);
  const { data: childCheckpoints, error: childError } = childIds.length
    ? await db
        .from("assessment_checkpoints")
        .select("id,enrollment_id,checkpoint,due_date,status")
        .in("enrollment_id", childIds)
    : { data: [], error: null };
  if (childError) throw new AssessmentAccessError("Supporting checks could not be loaded.", 503);
  const childCpIds = (childCheckpoints ?? []).map((row) => row.id);
  const childHeads = childCpIds.length
    ? await rpc<CheckpointHeads[]>(db, "assessment_checkpoint_heads", {
        p_actor: actor,
        p_checkpoints: childCpIds,
      })
    : [];
  const childAttempts = childHeads.flatMap((head) => head.attempts);
  const capabilityIds = recommendationRows.map((row) => row.capability_id);
  const { data: capabilities, error: capError } = capabilityIds.length
    ? await db
        .from("assessment_support_capabilities")
        .select(
          "id,version,title,lesson_ids,weekly_minutes,offline_available,assignment_mode,release_id",
        )
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
    goals,
    goalAvailability: !accessAvailable
      ? "access_needed"
      : !goals.topics.length
        ? "not_selected"
        : !manage
          ? "admin_review"
          : assignmentRows.some(
                (row) =>
                  ["active", "paused", "checkpoint_due"].includes(row.status) &&
                  row.capability_snapshot.basis === "learner_goal" &&
                  row.capability_snapshot.goalSnapshot?.topics?.some((topic: string) =>
                    goals.topics.includes(topic as LearnerGoal),
                  ),
              )
            ? "assigned"
            : candidates.some(
                  (row) =>
                    row.basis === "learner_goal" ||
                    (Array.isArray(row.matchedGoals) && row.matchedGoals.length > 0),
                )
              ? "ready"
              : recommendationRows.filter((row) => ["suggested", "deferred"].includes(row.decision))
                    .length >= 2 ||
                  recommendationRows.some(
                    (row) =>
                      row.basis === "learner_goal" &&
                      ["suggested", "deferred"].includes(row.decision),
                  )
                ? "review_pending"
                : "content_gap",
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
          pilot: source.pilot === true,
          calibrated: source.calibrated === true,
          profiles,
        }
      : null,
    availableSources: sourceRows.map((row) => ({
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
        : source.pilot === true || source.calibrated !== true
          ? "awaiting_calibration"
          : !hasGap
            ? "evidence_needed"
            : candidates.length
              ? "ready"
              : "content_gap",
    recommendations: recommendationRows.map((row) => ({
      ...row,
      capability: capabilities?.find(
        (cap) => cap.id === row.capability_id && cap.version === row.capability_version,
      ),
    })),
    assignments: assignmentRows.map((row) => ({
      ...row,
      checkpoints: (childCheckpoints ?? [])
        .filter((cp) => cp.enrollment_id === row.support_enrollment_id)
        .map((cp) => ({
          ...cp,
          attempt_count: childHeads.find((head) => head.checkpointId === cp.id)?.attemptCount ?? 0,
          attempts: childAttempts.filter((attempt) => attempt.checkpoint_id === cp.id),
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
  selectedPlanId?: string,
) {
  let planQuery = db
    .from("assessment_enrollments")
    .select("id")
    .eq("user_id", actor)
    .eq("module_id", moduleId)
    .eq("target_language", target)
    .eq("instruction_language", native)
    .eq("role", "primary")
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);
  if (selectedPlanId) planQuery = planQuery.eq("id", selectedPlanId);
  const { data: plans, error } = await planQuery;
  if (error) throw new AssessmentAccessError("Daily assessment guidance could not be loaded.", 503);
  if (selectedPlanId && !plans?.length)
    throw new AssessmentAccessError(
      "This learning plan is unavailable for this account and language track.",
      403,
    );
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
        const checkHeads = checkIds.length
          ? await rpc<CheckpointHeads[]>(db, "assessment_checkpoint_heads", {
              p_actor: actor,
              p_checkpoints: checkIds,
            })
          : [];
        const attempts = checkHeads.flatMap((head) => head.attempts);
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
                attempt_count:
                  checkHeads.find((head) => head.checkpointId === cp.id)?.attemptCount ?? 0,
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
