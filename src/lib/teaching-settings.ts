/** Teaching settings, not CEFR ratings or assessed learner ability. Pilot validation is pending. */
export type TeachingStage = "supported" | "connected" | "independent";
export interface LessonTeachingSettings {
  stage: TeachingStage;
  /** Suggestions rather than restrictions: replay and translation remain accessible. */
  translationInitiallyVisible: boolean;
  matchingBatchSize: number;
  listening: {
    kind: "word-and-phrase" | "short-instruction" | "connected-scenario";
    suggestedReplays: number | null;
  };
  response: {
    kind: "modeled-phrase" | "short-response" | "connected-response";
    suggestedSentences: number;
  };
  speaking: { wordBank: "visible" | "collapsed" | "on-request"; context: string };
  writing: { copyFirst: true; prompt: string };
}

export function lessonTeachingSettings(
  lessonNumber: number,
  context: string,
): LessonTeachingSettings {
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 30)
    throw new Error("Unknown lesson.");
  const stage: TeachingStage =
    lessonNumber <= 10 ? "supported" : lessonNumber <= 20 ? "connected" : "independent";
  return {
    stage,
    translationInitiallyVisible: stage === "supported",
    matchingBatchSize: stage === "supported" ? 4 : stage === "connected" ? 6 : 8,
    listening: {
      kind:
        stage === "supported"
          ? "word-and-phrase"
          : stage === "connected"
            ? "short-instruction"
            : "connected-scenario",
      suggestedReplays: stage === "supported" ? null : stage === "connected" ? 3 : 2,
    },
    response: {
      kind:
        stage === "supported"
          ? "modeled-phrase"
          : stage === "connected"
            ? "short-response"
            : "connected-response",
      suggestedSentences: stage === "supported" ? 1 : stage === "connected" ? 2 : 3,
    },
    speaking: {
      wordBank:
        stage === "supported" ? "visible" : stage === "connected" ? "collapsed" : "on-request",
      context,
    },
    writing: { copyFirst: true, prompt: context },
  };
}
