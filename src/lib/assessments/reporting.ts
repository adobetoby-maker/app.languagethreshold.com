import type { Language, NativeLanguage } from "@/data/languages";
import type { Checkpoint, ItemEvidence } from "./core";
export type OverviewState =
  "all" | "active" | "paused" | "needs_review" | "in_progress" | "overdue" | "upcoming";
export interface OverviewFilters {
  after?: string;
  afterId?: string;
  moduleId?: string;
  learnerId?: string;
  state?: OverviewState;
  checkpoint?: Checkpoint;
  target?: Language;
  native?: NativeLanguage;
}
export interface RawExamEnrollment {
  id: string;
  user_id: string;
  organization_id: string | null;
  organization_name: string | null;
  module_id: string;
  release_id: string;
  target_language: Language;
  instruction_language: NativeLanguage;
  role: "primary" | "support";
  scope: "personal" | "team";
  status: "active" | "paused" | "archived";
  revision: number;
  timezone: string;
  start_date: string;
  created_at: string;
  program_scope?: "full_module" | "support_units";
  support_capability_id?: string | null;
}
export interface RawExamCheckpoint {
  id: string;
  enrollment_id: string;
  checkpoint: Checkpoint;
  due_date: string;
  status: string;
  attempt_count: number;
}
export interface RawExamAttempt {
  id: string;
  checkpoint_id: string;
  attempt_number: number;
  form_id: string;
  status: string;
  revision: number;
  started_at: string;
  submitted_at: string | null;
  designated: boolean;
}
export interface OverviewPage {
  enrollments: RawExamEnrollment[];
  checkpoints: RawExamCheckpoint[];
  attempts: RawExamAttempt[];
  hasMore: boolean;
  nextCursor: { createdAt: string; id: string } | null;
}
export interface AttemptSummary {
  attemptId: string;
  checkpoint: Checkpoint;
  calibrated: boolean;
  equivalenceApproved: boolean;
  equivalenceGroup: string | null;
  evidence: ItemEvidence[];
}

import { ASSESSMENT_SKILLS, checkpointProfiles, compareSkillEvidence } from "./core.ts";
export function summarizedAttempt(
  checkpoint: Checkpoint,
  attempt: RawExamAttempt,
  summary?: AttemptSummary,
  baseline?: AttemptSummary,
) {
  const comparable =
    !!summary &&
    !!baseline &&
    summary.calibrated &&
    baseline.calibrated &&
    summary.equivalenceApproved &&
    baseline.equivalenceApproved &&
    !!summary.equivalenceGroup &&
    summary.equivalenceGroup === baseline.equivalenceGroup;
  return {
    ...attempt,
    profiles: summary ? checkpointProfiles(checkpoint, summary.evidence, summary.calibrated) : [],
    comparisons:
      summary && checkpoint !== "entrance"
        ? ASSESSMENT_SKILLS.map((skill) => ({
            skill,
            ...compareSkillEvidence(baseline?.evidence ?? [], summary.evidence, skill, comparable),
          }))
        : [],
  };
}
export type ReportedAttempt = ReturnType<typeof summarizedAttempt>;

export interface CheckpointHeads {
  checkpointId: string;
  attemptCount: number;
  attempts: RawExamAttempt[];
}
