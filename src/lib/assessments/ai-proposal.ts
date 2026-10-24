import { z } from "zod";
import type { PrivateAssessmentItem, AssessmentAnswer } from "./form.ts";
export const ASSESSMENT_AI_MODEL = "claude-haiku-5-5";
export const ASSESSMENT_AI_CONSENT = "assessment-ai-writing-v1";
export function aiWritingEligible(item: PrivateAssessmentItem, answer: AssessmentAnswer) {
  return (
    item.type === "production" &&
    item.skill === "writing" &&
    !!item.rubric?.dimensions.length &&
    answer.inputMethod === "typed" &&
    !answer.recognitionIssue &&
    !answer.missingReason &&
    !!answer.text?.trim()
  );
}
export function validateWritingProposal(item: PrivateAssessmentItem, raw: unknown) {
  const parsed = z
    .object({
      dimensions: z.record(z.string(), z.number().finite().min(0).max(100)),
      confidence: z.number().finite().min(0).max(1),
      reason: z.string().trim().min(3).max(1200),
    })
    .strict()
    .parse(raw);
  const dimensions = item.rubric?.dimensions ?? [];
  if (
    !dimensions.length ||
    dimensions.length !== Object.keys(parsed.dimensions).length ||
    dimensions.some(
      (d) => !Object.hasOwn(parsed.dimensions, d.id) || parsed.dimensions[d.id] > d.maximum,
    ) ||
    dimensions.reduce((sum, d) => sum + d.maximum, 0) !== item.maximum
  )
    throw new Error("AI proposal does not match the frozen rubric.");
  return { ...parsed, points: dimensions.reduce((sum, d) => sum + parsed.dimensions[d.id], 0) };
}
export function writingProposalPayload(
  item: PrivateAssessmentItem,
  answer: AssessmentAnswer,
  target: string,
  native: string,
) {
  if (!aiWritingEligible(item, answer))
    throw new Error("Only available typed writing can receive an AI proposal.");
  return JSON.stringify({
    targetLanguage: target,
    instructionLanguage: native,
    prompt: item.prompt,
    passage: item.passage,
    rubric: item.rubric,
    response: answer.text,
  });
}
