/** Teaching settings, not CEFR ratings or assessed learner ability. Pilot validation is pending. */
export type TeachingStage = "supported" | "connected" | "independent";
export interface RoofingTeachingSettings {
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

const CONTEXTS = [
  "Name today’s roof system and request one material from a crew member.",
  "Explain which layers you are looking at and ask where the edge material belongs.",
  "Ask a crew member to identify a flashing detail and a possible water-entry location.",
  "Describe the location of a vent or downspout and ask for confirmation.",
  "Request fasteners and sealant from a supplier and confirm the order.",
  "Give a morning briefing naming the work zone and the next task.",
  "Explain the tear-off scope and ask the crew to repeat what is included.",
  "Report a damaged deck panel and ask the lead what happens next.",
  "Ask two crew members to divide debris collection and nail cleanup.",
  "Tell the crew which unfinished area needs protection before departure.",
  "Explain the layout reference, then ask a new worker to confirm the starting point.",
  "Ask the lead to clarify the joint-stagger instruction in the product guide.",
  "Ask which drip-edge sequence the job instructions specify and confirm the answer.",
  "Explain that the overlap must follow the instructions and request a check.",
  "Describe the valley area and ask the lead to confirm the specified protection.",
  "Direct a worker to check the product’s nailing zone and explain it back.",
  "Ask someone to verify the required fastening pattern before continuing.",
  "Report an overdriven fastener, ask for clarification and confirm the next step.",
  "Describe the step-flashing location and ask the lead to review the detail.",
  "Summarize the finish work, identify an open item and confirm who will check it.",
  "Communicate an access concern, ask for the approved plan and confirm understanding.",
  "Report a concern about an anchor or lifeline and ask the lead to respond.",
  "Explain a footing or weather concern, request clarification and confirm the response.",
  "Check how a coworker feels in the heat, describe the concern and ask for help.",
  "Warn the crew about falling debris and confirm that everyone heard the message.",
  "Write a deck-repair note including the location, observation and outstanding question.",
  "Describe an inspection observation, distinguish checked and unchecked items and ask for follow-up.",
  "Coordinate ground cleanup, ask for confirmation and report what is still unfinished.",
  "Report completed work, unresolved items and who needs to respond next.",
  "Brief the crew, communicate a changed condition and give an end-of-day handoff.",
] as const;

export function roofingTeachingSettings(lessonNumber: number): RoofingTeachingSettings {
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 30)
    throw new Error("Unknown Roofing lesson.");
  const stage: TeachingStage =
    lessonNumber <= 10 ? "supported" : lessonNumber <= 20 ? "connected" : "independent";
  const context = CONTEXTS[lessonNumber - 1];
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
