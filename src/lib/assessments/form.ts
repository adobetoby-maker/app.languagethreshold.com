import { routingPolicyIssues, type AssessmentRoutingPolicy } from "./routing-contract.ts";
export const ROOFING_ASSESSMENT_RELEASE = "roofing-es-en-assessment-draft-20261016";
import type { AnswerPolicy, AssessmentSkill, Checkpoint, ItemEvidence } from "./core.ts";
import { scoreFixedAnswer } from "./core.ts";
import { validAssessmentAudioAsset, type AssessmentAudioAsset } from "./audio.ts";

export interface AssessmentOption {
  id: string;
  text: string;
}
export interface PublicAssessmentItem {
  id: string;
  objectiveId: string;
  skill: AssessmentSkill;
  type: "choice" | "recall" | "production";
  prompt: string;
  passage?: string;
  options?: AssessmentOption[];
  audioRequired?: boolean;
  coverage: "module" | "studied" | "transfer";
  /** Input choice is accessibility metadata; it does not change the skill being assessed. */
  inputMethods: ("choice" | "typed" | "handwriting" | "speech")[];
}
export interface PrivateAssessmentItem extends PublicAssessmentItem {
  maximum: number;
  comparisonGroup: string;
  accepted?: string[];
  correctOptionId?: string;
  policy?: AnswerPolicy;
  audioText?: string;
  audioAsset?: AssessmentAudioAsset;
  rubric?: {
    id: string;
    dimensions: { id: string; label: string; maximum: number; description: string }[];
  };
  rationale: string;
}
export interface AssessmentFormDefinition {
  id: string;
  checkpoint: Checkpoint;
  version: string;
  rubricVersion: string;
  targetLanguage: string;
  instructionLanguage: string;
  items: PrivateAssessmentItem[];
  estimatedMinutes: number;
  /** Private draft routing policy; runtime remains gated until durable selection is implemented. */
  routing?: AssessmentRoutingPolicy;
  /** Drafts are only usable in the explicitly scoped QA pilot, not published assessments. */
  status: "draft" | "in_review" | "verified";
}
export interface AssessmentAnswer {
  inputMethod: "choice" | "typed" | "handwriting" | "speech_transcript" | "unavailable";
  text?: string;
  choiceId?: string;
  originalTranscript?: string;
  correctedTranscript?: string;
  recognitionIssue?: boolean;
  missingReason?: string;
  mediaEvidenceId?: string;
  listeningHeard?: boolean;
}

/** Whitelist public fields: adding a private rubric/key property cannot leak it into the exam UI. */
export function publicAssessmentItem(item: PrivateAssessmentItem): PublicAssessmentItem {
  return {
    id: item.id,
    objectiveId: item.objectiveId,
    skill: item.skill,
    type: item.type,
    prompt: item.prompt,
    ...(item.passage ? { passage: item.passage } : {}),
    ...(item.options ? { options: item.options.map(({ id, text }) => ({ id, text })) } : {}),
    ...(item.audioRequired ? { audioRequired: true } : {}),
    coverage: item.coverage,
    inputMethods: [...item.inputMethods],
  };
}

/** Deterministic only. Open production stays pending until a reviewed rubric result exists. */
export function initialItemEvidence(
  item: PrivateAssessmentItem,
  answer: AssessmentAnswer,
  verifiedSpeechId?: string,
): ItemEvidence {
  const base = {
    itemId: item.id,
    objectiveId: item.objectiveId,
    skill: item.skill,
    comparisonGroup: item.comparisonGroup,
    coverage: item.coverage,
    maximum: item.maximum,
    source: "deterministic" as const,
  };
  const missing = (reason: string): ItemEvidence => ({
    ...base,
    state: "not_assessed",
    points: null,
    reason,
  });
  if (answer.inputMethod === "unavailable" || answer.missingReason)
    return missing(answer.missingReason ?? "Input unavailable");
  if (item.audioRequired && answer.listeningHeard !== true)
    return missing("Listening playback was not confirmed; no wrong-answer score assigned.");
  if (answer.recognitionIssue)
    return {
      ...base,
      state: "needs_review",
      points: null,
      reason: "Recognition needs review; no wrong-answer score assigned.",
    };
  if (item.skill === "speaking") {
    if (
      verifiedSpeechId &&
      answer.mediaEvidenceId === verifiedSpeechId &&
      answer.inputMethod === "speech_transcript"
    )
      return {
        ...base,
        state: "needs_review",
        points: null,
        reason: "Protected recording saved; independent speaking rubric review pending.",
      };
    return missing(
      "Spoken production needs authorized audio evidence and review; a typed or unverified transcript is not a spoken score.",
    );
  }
  if (item.type === "production") {
    const text = (
      answer.correctedTranscript ??
      answer.text ??
      answer.originalTranscript ??
      ""
    ).trim();
    return text
      ? { ...base, state: "pending", points: null, reason: "Rubric review pending." }
      : missing("No production response submitted");
  }
  if (item.type === "choice") {
    if (!answer.choiceId) return missing("No choice submitted");
    if (!item.options?.some((option) => option.id === answer.choiceId))
      throw new Error("Choice is not part of this frozen item.");
    if (!item.correctOptionId) throw new Error("Reviewed answer key is missing.");
    return {
      ...base,
      state: "scored",
      points: answer.choiceId === item.correctOptionId ? item.maximum : 0,
    };
  }
  const text = (
    answer.correctedTranscript ??
    answer.text ??
    answer.originalTranscript ??
    ""
  ).trim();
  if (!text) return missing("No recall response submitted");
  if (!item.policy || !item.accepted?.length) throw new Error("Reviewed answer policy is missing.");
  return {
    ...base,
    state: "scored",
    points: scoreFixedAnswer(text, item.accepted, item.policy) ? item.maximum : 0,
  };
}

export function validateFormDefinition(form: AssessmentFormDefinition): string[] {
  const gaps: string[] = routingPolicyIssues(form);
  const ids = new Set<string>();
  for (const item of form.items) {
    if (ids.has(item.id)) gaps.push(`Duplicate item: ${item.id}`);
    ids.add(item.id);
    if (
      !item.objectiveId ||
      !item.prompt.trim() ||
      !Number.isFinite(item.maximum) ||
      item.maximum <= 0
    )
      gaps.push(`Invalid item: ${item.id}`);
    if (
      item.type === "choice" &&
      (!item.options ||
        item.options.length < 3 ||
        new Set(item.options.map((o) => o.id)).size !== item.options.length ||
        !item.options.some((o) => o.id === item.correctOptionId))
    )
      gaps.push(`Missing reviewed choices/key: ${item.id}`);
    if (item.type === "recall" && (!item.accepted?.length || !item.policy))
      gaps.push(`Missing recall policy: ${item.id}`);
    if (
      item.type === "production" &&
      (!item.rubric ||
        item.rubric.dimensions.reduce((sum, d) => sum + d.maximum, 0) !== item.maximum)
    )
      gaps.push(`Missing production rubric: ${item.id}`);
    if (item.audioRequired && !item.audioText) gaps.push(`Missing listening source: ${item.id}`);
    if (item.audioAsset && !validAssessmentAudioAsset(item.audioAsset))
      gaps.push(`Invalid private audio reference: ${item.id}`);
  }
  for (const skill of [
    "recognition",
    "recall",
    "listening",
    "reading",
    "writing",
    "speaking",
  ] as AssessmentSkill[]) {
    const objectives = new Set(
      form.items.filter((item) => item.skill === skill).map((item) => item.objectiveId),
    );
    if (objectives.size < 3) gaps.push(`${skill} needs at least three objectives.`);
  }
  return form.status === "verified" ? [...gaps, ...officialListeningGaps(form)] : gaps;
}

/** Targeted support checks intentionally do not assess all six skills. */
export function officialListeningGaps(form: Pick<AssessmentFormDefinition, "items">): string[] {
  return form.items
    .filter(
      (item) =>
        (item.skill === "listening" || item.audioRequired) &&
        (!item.audioRequired || !item.audioText || !validAssessmentAudioAsset(item.audioAsset)),
    )
    .map((item) => `Official listening requires a versioned private clip: ${item.id}`);
}
