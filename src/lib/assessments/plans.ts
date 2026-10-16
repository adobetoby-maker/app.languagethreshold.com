import type { checkpointProfiles, AssessmentSkill } from "./core";
import type { LearnerGoals, LearnerGoal } from "./goals";
export interface PlanEvidence {
  itemId: string;
  scoreEventId: string;
  objectiveId: string;
  skill: AssessmentSkill;
  points: number;
  maximum: number;
}
export interface SupportCandidate {
  capabilityId: string;
  version: string;
  moduleId: string;
  title: string;
  lessonIds: string[];
  weeklyMinutes: number;
  offlineAvailable: boolean;
  assignmentMode: "units" | "full_module";
  sourceAttemptId: string | null;
  assessedAt: string | null;
  basis: "assessment_gap" | "learner_goal";
  goalRevision: number | null;
  matchedGoals: LearnerGoal[];
  evidence: PlanEvidence[];
}
export interface PlanRevision {
  id: string;
  source_attempt_id: string;
  revision: number;
  suggested_lesson: number;
  focus_ways: string[];
  catchup_objectives: string[];
  rationale: string;
  created_at: string;
  review_every_days: number;
}
export interface SupportRecommendation {
  id: string;
  attempt_id: string | null;
  basis: "assessment_gap" | "learner_goal";
  goal_snapshot: { revision: number; topics: LearnerGoal[]; offlinePreferred: boolean } | null;
  capability_id: string;
  capability_version: string;
  evidence: PlanEvidence[];
  why: string;
  decision: "suggested" | "deferred" | "approved" | "dismissed";
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
  capability?: {
    id: string;
    title: string;
    lesson_ids: string[];
    weekly_minutes: number;
    offline_available: boolean;
    assignment_mode: "units" | "full_module";
  };
}
export interface SupportAssignment {
  id: string;
  recommendation_id: string;
  enrollment_id: string;
  mode: "units" | "full_module";
  support_enrollment_id: string;
  capability_snapshot: {
    moduleId: string;
    title: string;
    lessonIds: string[];
    targetLanguage: string;
    instructionLanguage: string;
    version: string;
    offlineAvailable: boolean;
    estimatedWeeklyMinutes: number;
    basis?: "assessment_gap" | "learner_goal";
    goalSnapshot?: { revision: number; topics: LearnerGoal[]; offlinePreferred: boolean } | null;
  };
  primary_weekly_minutes: number;
  support_weekly_minutes: number;
  support_cap_percent: number;
  budget_reason: string;
  status: "active" | "paused" | "checkpoint_due" | "completed" | "withdrawn";
  approved_at: string;
  acknowledged_at: string | null;
  checkpoints: {
    id: string;
    checkpoint: "entrance" | "day45" | "day90";
    due_date: string;
    status: string;
    attempt_count?: number;
    attempts: {
      id: string;
      status: string;
      attempt_number: number;
      submitted_at: string | null;
      designated: boolean;
    }[];
  }[];
}
export interface AssessmentPlanView {
  goals: LearnerGoals;
  goalAvailability:
    | "not_selected"
    | "content_gap"
    | "ready"
    | "review_pending"
    | "access_needed"
    | "admin_review"
    | "assigned";
  enrollment: {
    id: string;
    moduleId: string;
    userId: string;
    scope: "personal" | "team";
    organizationId: string | null;
    targetLanguage: string;
    instructionLanguage: string;
    status: string;
    timezone: string;
  };
  canManage: boolean;
  isLearner: boolean;
  accessAvailable: boolean;
  source: {
    id: string;
    checkpoint: string;
    attemptNumber: number;
    submittedAt: string;
    designated: boolean;
    pilot: boolean;
    calibrated: boolean;
    profiles: ReturnType<typeof checkpointProfiles>;
  } | null;
  availableSources: {
    id: string;
    checkpoint: string;
    attemptNumber: number;
    submittedAt: string;
    designated: boolean;
  }[];
  candidates: SupportCandidate[];
  availability:
    | "access_needed"
    | "assessment_needed"
    | "awaiting_calibration"
    | "evidence_needed"
    | "ready"
    | "content_gap";
  recommendations: SupportRecommendation[];
  assignments: SupportAssignment[];
  revisions: PlanRevision[];
  limit: number;
}
