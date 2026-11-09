import { placementBlockScore, placementCorrect, type PlacementBlock } from "./module-placement.ts";

export type ModuleExamMode = "placement" | "post-core";

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
