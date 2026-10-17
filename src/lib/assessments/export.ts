/** Spreadsheet programs execute formula prefixes even in quoted CSV cells. */
export function assessmentCsv(rows: readonly (readonly unknown[])[]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const raw = value === null || value === undefined ? "" : String(value);
            const safe = /^[\s\p{Cc}]*[=+@-]/u.test(raw) ? `'${raw}` : raw;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}

import type { SkillResult } from "./core";
export interface AssessedExportPlan {
  user_id: string;
  role: string;
  module_id: string;
  scope: string;
  instruction_language: string;
  target_language: string;
  timezone: string;
  status: string;
  checkpoints: {
    checkpoint: string;
    due_date: string;
    status: string;
    ready?: boolean;
    pilotReady?: boolean;
    attempts: {
      attempt_number: number;
      designated: boolean;
      status: string;
      submitted_at: string | null;
      profiles: { coverage: string; skills: SkillResult[] }[];
      comparisons: { skill: string; change: number | null }[];
    }[];
  }[];
}
/** Include scheduled and unfinished work without manufacturing a score or missing baseline. */
export function assessedProgressRows(
  plans: readonly AssessedExportPlan[],
  labels: {
    learner: (id: string) => string;
    module: (id: string) => string;
    skill: (id: string) => string;
  },
): unknown[][] {
  const rows: unknown[][] = [
    [
      "Learner",
      "Learner ID",
      "Plan role",
      "Module",
      "Scope",
      "Language pair",
      "Timezone",
      "Plan status",
      "Checkpoint",
      "Due date",
      "Attempt",
      "Original",
      "Status",
      "Submitted",
      "Coverage",
      "Skill",
      "Score",
      "State",
      "Scored items",
      "Objectives",
      "Needs review",
      "Not assessed",
      "Provisional",
      "Change on comparable objectives",
    ],
  ];
  for (const plan of plans)
    for (const cp of plan.checkpoints) {
      const context = [
        labels.learner(plan.user_id),
        plan.user_id,
        plan.role,
        labels.module(plan.module_id),
        plan.scope,
        `${plan.instruction_language} → ${plan.target_language}`,
        plan.timezone,
        plan.status,
        cp.checkpoint,
        cp.due_date,
      ];
      if (!cp.attempts.length) {
        const state =
          cp.status === "exempt"
            ? "exempt"
            : cp.ready
              ? "not_started"
              : cp.pilotReady
                ? "qa_draft_available"
                : "content_pending";
        rows.push([
          ...context,
          "",
          "",
          state,
          "",
          "",
          "",
          null,
          state,
          "",
          "",
          "",
          "",
          "",
          "Not comparable",
        ]);
      }
      for (const attempt of cp.attempts) {
        const identity = [
          ...context,
          attempt.attempt_number,
          attempt.designated,
          attempt.status,
          attempt.submitted_at,
        ];
        if (!attempt.profiles.some((profile) => profile.skills.length))
          rows.push([
            ...identity,
            "",
            "",
            null,
            ["submitted", "scoring"].includes(attempt.status) ? "pending" : "not_assessed",
            "",
            "",
            "",
            "",
            "",
            "Not comparable",
          ]);
        for (const profile of attempt.profiles)
          for (const skill of profile.skills)
            rows.push([
              ...identity,
              profile.coverage,
              labels.skill(skill.skill),
              skill.score,
              skill.state,
              skill.evidenceCount,
              skill.objectives.length,
              skill.reviewCount,
              skill.missingCount,
              skill.provisional,
              profile.coverage === "transfer"
                ? "Not comparable (transfer tasks)"
                : (attempt.comparisons.find((row) => row.skill === skill.skill)?.change ??
                  "Not comparable"),
            ]);
      }
    }
  return rows;
}
