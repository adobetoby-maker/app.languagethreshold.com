import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import {
  initialItemEvidence,
  publicAssessmentItem,
  validateFormDefinition,
  type AssessmentAnswer,
  type AssessmentFormDefinition,
} from "./form.ts";
import {
  hasAdaptiveRouting,
  routingPolicyIssues,
  type AssessmentRoutingPolicy,
} from "./routing-contract.ts";

type Response = { itemId: string; answer: AssessmentAnswer };
export interface FrozenRoutingDecision {
  schema: 1;
  attemptId: string;
  sourceRevision: number;
  formId: string;
  formVersion: string;
  rubricVersion: string;
  policyVersion: string;
  branchId: string;
  reason: "score_band" | "insufficient_evidence";
  scoredCount: number;
  scoredObjectives: number;
  percent: number | null;
  sourceDigest: string;
}
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, value]) => JSON.stringify(key) + ":" + canonical(value))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
};
function policy(form: AssessmentFormDefinition): AssessmentRoutingPolicy {
  if (
    !hasAdaptiveRouting(form) ||
    routingPolicyIssues(form).length ||
    validateFormDefinition(form).length ||
    !form.id ||
    !form.version ||
    !form.rubricVersion
  )
    throw new Error("Valid frozen routing form required.");
  return form.routing!;
}

/** Server-only calculation. It does not persist a decision, change answers or approve a policy. */
export function evaluateRouting(
  form: AssessmentFormDefinition,
  attemptId: string,
  sourceRevision: number,
  responses: readonly Response[],
):
  | { state: "core_incomplete"; remainingCount: number }
  | { state: "decision"; decision: FrozenRoutingDecision } {
  const p = policy(form);
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(attemptId) ||
    !Number.isSafeInteger(sourceRevision) ||
    sourceRevision < 0
  )
    throw new Error("Frozen attempt identity and revision required.");
  const answers = new Map<string, AssessmentAnswer>();
  const known = new Set(form.items.map((item) => item.id));
  for (const row of responses) {
    if (!known.has(row.itemId) || answers.has(row.itemId))
      throw new Error("Invalid routing response references.");
    answers.set(row.itemId, row.answer);
  }
  const completed = (id: string) => {
    const answer = answers.get(id),
      item = form.items.find((item) => item.id === id)!;
    if (!answer) return false;
    if (
      answer.inputMethod === "unavailable" ||
      answer.missingReason?.trim() ||
      answer.recognitionIssue
    )
      return true;
    if (item.type === "choice") return !!answer.choiceId?.trim();
    if (item.skill === "speaking") return !!answer.mediaEvidenceId;
    return !!(answer.correctedTranscript ?? answer.text ?? answer.originalTranscript ?? "").trim();
  };
  const remainingCount = p.coreItemIds.filter((id) => !completed(id)).length;
  if (remainingCount) return { state: "core_incomplete", remainingCount };
  const core = p.coreItemIds.map((id) => form.items.find((item) => item.id === id)!);
  const evidence = core
    .filter(
      (item) => item.type !== "production" && item.skill !== "speaking" && item.skill !== "writing",
    )
    .map((item) => initialItemEvidence(item, answers.get(item.id)!))
    .filter(
      (row) => row.state === "scored" && row.source === "deterministic" && row.points !== null,
    );
  const scoredObjectives = new Set(evidence.map((row) => row.objectiveId)).size;
  const sufficient =
    evidence.length >= p.minimumEvidence && scoredObjectives >= p.minimumObjectives;
  const maximum = evidence.reduce((sum, row) => sum + row.maximum, 0);
  if (
    evidence.some(
      (row) =>
        !Number.isFinite(row.maximum) ||
        row.maximum <= 0 ||
        !Number.isFinite(row.points) ||
        row.points! < 0 ||
        row.points! > row.maximum,
    ) ||
    !Number.isFinite(maximum)
  )
    throw new Error("Invalid routing score evidence.");
  const percent = sufficient
    ? (evidence.reduce((sum, row) => sum + row.points!, 0) / maximum) * 100
    : null;
  const band = sufficient
    ? p.bands.find(
        (band) =>
          percent! >= band.minimumPercent &&
          (percent! < band.maximumPercent || (percent === 100 && band.maximumPercent === 100)),
      )
    : null;
  if (sufficient && !band) throw new Error("Routing score is outside reviewed bands.");
  return {
    state: "decision",
    decision: {
      schema: 1,
      attemptId,
      sourceRevision,
      formId: form.id,
      formVersion: form.version,
      rubricVersion: form.rubricVersion,
      policyVersion: p.version,
      branchId: band?.branchId ?? p.insufficientEvidenceBranchId,
      reason: sufficient ? "score_band" : "insufficient_evidence",
      scoredCount: evidence.length,
      scoredObjectives,
      percent,
      sourceDigest: createHash("sha256")
        .update(
          canonical({
            attemptId,
            sourceRevision,
            form,
            core: p.coreItemIds.map((itemId) => ({ itemId, answer: answers.get(itemId) })),
          }),
        )
        .digest("hex"),
    },
  };
}

/** Given a trusted durable decision, never project an unselected branch or the private policy. */
export function routingPublicItems(
  form: AssessmentFormDefinition,
  attemptId: string,
  decision: FrozenRoutingDecision | null,
) {
  const p = policy(form);
  let branch: AssessmentRoutingPolicy["branches"][number] | undefined;
  if (decision) {
    branch = p.branches.find((branch) => branch.id === decision.branchId);
    const objectiveItems = form.items.filter(
      (item) =>
        p.coreItemIds.includes(item.id) &&
        item.type !== "production" &&
        item.skill !== "speaking" &&
        item.skill !== "writing",
    );
    const sufficient =
      decision.scoredCount >= p.minimumEvidence && decision.scoredObjectives >= p.minimumObjectives;
    const band =
      typeof decision.percent === "number" && Number.isFinite(decision.percent)
        ? p.bands.find(
            (band) =>
              decision.percent! >= band.minimumPercent &&
              (decision.percent! < band.maximumPercent ||
                (decision.percent === 100 && band.maximumPercent === 100)),
          )
        : undefined;
    if (
      decision.schema !== 1 ||
      decision.attemptId !== attemptId ||
      !Number.isSafeInteger(decision.sourceRevision) ||
      decision.sourceRevision < 0 ||
      decision.formId !== form.id ||
      decision.formVersion !== form.version ||
      decision.rubricVersion !== form.rubricVersion ||
      decision.policyVersion !== p.version ||
      !branch ||
      !Number.isInteger(decision.scoredCount) ||
      decision.scoredCount < 0 ||
      decision.scoredCount > objectiveItems.length ||
      !Number.isInteger(decision.scoredObjectives) ||
      decision.scoredObjectives < 0 ||
      decision.scoredObjectives >
        Math.min(
          decision.scoredCount,
          new Set(objectiveItems.map((item) => item.objectiveId)).size,
        ) ||
      (decision.scoredCount > 0 && decision.scoredObjectives === 0) ||
      !(
        (decision.reason === "insufficient_evidence" &&
          !sufficient &&
          decision.percent === null &&
          decision.branchId === p.insufficientEvidenceBranchId) ||
        (decision.reason === "score_band" && sufficient && band?.branchId === decision.branchId)
      ) ||
      !/^[a-f0-9]{64}$/.test(decision.sourceDigest)
    )
      throw new Error("Routing decision does not match the frozen form.");
  }
  return [...p.coreItemIds, ...(branch?.itemIds ?? [])].map((id) =>
    publicAssessmentItem(form.items.find((item) => item.id === id)!),
  );
}

/** Growth anchors remain the same fixed core even when branches differ. */
export function routingComparisonItems(form: AssessmentFormDefinition) {
  return [...policy(form).coreItemIds];
}
