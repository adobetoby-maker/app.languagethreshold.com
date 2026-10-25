import { getCurriculum } from "../data/curriculum.ts";
import type { SpeakingMission } from "../data/speaking-missions.ts";
import { lessonObjectiveId } from "./learning-identity.ts";

/** Some scenario concept banks are English planning labels, not target-language phrases. */
export function speakingPreparationPhrases(mission: SpeakingMission) {
  const lesson = mission.sourceObjectiveId
    ? getCurriculum(mission.moduleId)?.lessons.find(
        (item) => lessonObjectiveId(mission.moduleId, item.n) === mission.sourceObjectiveId,
      )
    : undefined;
  if (lesson?.words?.length && (mission.language === "Spanish" || mission.language === "English")) {
    return lesson.words
      .slice(0, 5)
      .map((word) => ({
        target: mission.language === "Spanish" ? word.es : word.en,
        meaning: mission.language === "Spanish" ? word.en : word.es,
      }))
      .filter((word) => word.target.trim());
  }
  return [{ target: mission.openingLine, meaning: "" }];
}

export type SpeakingStep = "hear" | "respond" | "conversation";
export const SPEAKING_STEPS = [
  { id: "hear", label: "Hear & say" },
  { id: "respond", label: "Answer a prompt" },
  { id: "conversation", label: "Conversation" },
] as const;
