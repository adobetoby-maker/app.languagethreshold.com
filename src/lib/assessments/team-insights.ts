import {
  ASSESSMENT_SKILLS,
  skillResults,
  type AssessmentSkill,
  type ItemEvidence,
} from "./core.ts";
export const TEAM_INSIGHT_MINIMUM = 5;
export interface InsightItem {
  id: string;
  objectiveId: string;
  skill: AssessmentSkill;
  maximum: number;
}
export interface InsightLearner {
  learnerId: string;
  attemptState: string;
  evidence: ItemEvidence[];
}
type InsightState =
  "scored" | "pending" | "needs_review" | "insufficient_coverage" | "not_assessed";
export interface InsightCell {
  id: string;
  kind: "skill" | "objective";
  skill: AssessmentSkill;
  objectiveId?: string;
  visibility: "available" | "suppressed";
  counts: Record<InsightState, number> | null;
  meanScore: number | null;
  scoredLearners: number | null;
}
export interface TeamInsightReport {
  status: "available" | "content_pending" | "small_group" | "too_large";
  minimumGroup: number;
  learnerCount: number | null;
  formVersion?: string;
  rubricVersion?: string;
  items: InsightCell[];
  hasMore: false;
  nextCursor: null;
  limit: number;
}
export function emptyTeamInsights(status: TeamInsightReport["status"]): TeamInsightReport {
  return {
    status,
    minimumGroup: TEAM_INSIGHT_MINIMUM,
    learnerCount: null,
    items: [],
    hasMore: false,
    nextCursor: null,
    limit: 0,
  };
}
/** No IDs, answers, item prompts or individual ratings leave this aggregation boundary. */
export function aggregateTeamInsights(
  expected: readonly InsightItem[],
  learners: readonly InsightLearner[],
): TeamInsightReport {
  if (new Set(learners.map((row) => row.learnerId)).size !== learners.length)
    throw new Error("Duplicate learner in insight cohort");
  if (learners.length < TEAM_INSIGHT_MINIMUM) return emptyTeamInsights("small_group");
  const normalized = learners.map((learner) =>
    expected.map((item) => {
      const found = learner.evidence.filter(
        (row) =>
          row.itemId === item.id &&
          row.skill === item.skill &&
          row.objectiveId === item.objectiveId,
      );
      if (found.length > 1) throw new Error("Duplicate evidence in insight cohort");
      if (found[0] && found[0].maximum !== item.maximum)
        return { ...found[0], state: "needs_review" as const, points: null, maximum: item.maximum };
      return (
        found[0] ?? {
          itemId: item.id,
          objectiveId: item.objectiveId,
          skill: item.skill,
          maximum: item.maximum,
          points: null,
          source: "deterministic" as const,
          state:
            learner.attemptState === "needs_review"
              ? ("needs_review" as const)
              : ["submitted", "scoring"].includes(learner.attemptState)
                ? ("pending" as const)
                : ("not_assessed" as const),
        }
      );
    }),
  );
  function cell(
    identity: Pick<InsightCell, "id" | "kind" | "skill" | "objectiveId">,
    values: { state: InsightState; score: number | null }[],
  ): InsightCell {
    const counts = {
      scored: 0,
      pending: 0,
      needs_review: 0,
      insufficient_coverage: 0,
      not_assessed: 0,
    };
    for (const value of values) counts[value.state]++;
    // Suppress the entire cell: publishing a complementary count could reveal a small category.
    if (Object.values(counts).some((n) => n > 0 && n < TEAM_INSIGHT_MINIMUM))
      return {
        ...identity,
        visibility: "suppressed",
        counts: null,
        scoredLearners: null,
        meanScore: null,
      };
    const scored = values.filter((value) => value.state === "scored" && value.score !== null);
    return {
      ...identity,
      visibility: "available",
      counts,
      scoredLearners: scored.length,
      meanScore: scored.length
        ? Math.round(scored.reduce((sum, value) => sum + value.score!, 0) / scored.length)
        : null,
    };
  }
  const profiles = normalized.map((rows) => skillResults(rows, true));
  const items: InsightCell[] = ASSESSMENT_SKILLS.map((skill) =>
    cell(
      { id: "skill:" + skill, kind: "skill", skill },
      profiles.map((rows) => rows.find((row) => row.skill === skill)!),
    ),
  );
  for (const objective of new Map(
    expected.map((item) => [item.skill + ":" + item.objectiveId, item]),
  ).values()) {
    const values = normalized.map((rows) => {
      const relevant = rows.filter(
        (row) => row.skill === objective.skill && row.objectiveId === objective.objectiveId,
      );
      const result = skillResults(relevant, true).find((row) => row.skill === objective.skill)!;
      if (result.reviewCount || result.pendingCount) return { state: result.state, score: null };
      if (result.evidenceCount === relevant.length && relevant.length > 0)
        return {
          state: "scored" as const,
          score: Math.round(
            (100 * relevant.reduce((sum, row) => sum + row.points!, 0)) /
              relevant.reduce((sum, row) => sum + row.maximum, 0),
          ),
        };
      return {
        state: result.evidenceCount
          ? ("insufficient_coverage" as const)
          : ("not_assessed" as const),
        score: null,
      };
    });
    items.push(
      cell(
        {
          id: "objective:" + objective.skill + ":" + objective.objectiveId,
          kind: "objective",
          skill: objective.skill,
          objectiveId: objective.objectiveId,
        },
        values,
      ),
    );
  }
  return {
    ...emptyTeamInsights("available"),
    learnerCount: learners.length,
    items,
    limit: items.length,
  };
}
