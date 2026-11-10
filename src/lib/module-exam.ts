import { placementBlockScore, placementCorrect, type PlacementBlock } from "./module-placement.ts";

export type ModuleExamMode = "placement" | "post-core";

/** Count only submitted answers; untested later lessons are not mistakes. */
export function placementAttemptSummary(
  blocks: PlacementBlock[],
  responses: Record<string, string>,
) {
  const attempted = blocks
    .flatMap((block) => block.questions)
    .filter((question) => Object.hasOwn(responses, question.id));
  const missed = attempted.filter(
    (question) => !placementCorrect(question, responses[question.id]),
  );
  return {
    answered: attempted.length,
    correct: attempted.length - missed.length,
    missed,
    blocks: blocks
      .filter((block) => block.questions.some((q) => Object.hasOwn(responses, q.id)))
      .map((block) => ({
        block,
        ...placementBlockScore(block, responses),
        typedTotal: block.questions.filter((q) => q.type === "typed").length,
        typedCorrect: block.questions.filter(
          (q) => q.type === "typed" && placementCorrect(q, responses[q.id] ?? ""),
        ).length,
      })),
  };
}

/** Placement stops at the first weak block; a post-Core check always tests the full module. */
export function nextModuleExamBlock(
  blocks: PlacementBlock[],
  responses: Record<string, string>,
  mode: ModuleExamMode,
) {
  return blocks.find((block) =>
    mode === "placement"
      ? !placementBlockScore(block, responses).passed
      : block.questions.some((question) => !Object.hasOwn(responses, question.id)),
  );
}

export function moduleExamScore(blocks: PlacementBlock[], responses: Record<string, string>) {
  const questions = blocks.flatMap((block) => block.questions);
  const correct = questions.filter((q) => placementCorrect(q, responses[q.id] ?? "")).length;
  return {
    correct,
    total: questions.length,
    percent: questions.length ? Math.round((100 * correct) / questions.length) : 0,
    complete: questions.length > 0 && questions.every((q) => Object.hasOwn(responses, q.id)),
    review: blocks.flatMap((block) =>
      block.lessons.filter((_, index) =>
        block.questions.some(
          (q) => q.lesson === index && !placementCorrect(q, responses[q.id] ?? ""),
        ),
      ),
    ),
  };
}
