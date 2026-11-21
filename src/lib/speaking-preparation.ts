import { getCurriculum } from "../data/curriculum.ts";
import type { SpeakingMission } from "../data/speaking-missions.ts";
import { lessonWordPair } from "./speaking-lesson-words.ts";
import { lessonObjectiveId } from "./learning-identity.ts";

/** One catalog line a mission can be prepared from (CatalogLine.target / .native). */
export interface PreparationCatalogLine {
  target: string;
  native: string;
}

/** The catalog lesson number a mission was built from (its sourceObjectiveId), or null. */
export function missionSourceLessonNumber(mission: SpeakingMission): number | null {
  const n = Number(mission.sourceObjectiveId?.match(/\.lesson\.(\d+)$/)?.[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Some scenario concept banks are English planning labels, not target-language phrases. Phrases come
 * from the authored lesson words when the mission's language has a lesson-word column, else from the
 * pack's catalog lines for the source lesson (the caller loads them), else only the opening line.
 */
export function speakingPreparationPhrases(
  mission: SpeakingMission,
  catalogLines?: readonly PreparationCatalogLine[],
) {
  const lesson = mission.sourceObjectiveId
    ? getCurriculum(mission.moduleId)?.lessons.find(
        (item) => lessonObjectiveId(mission.moduleId, item.n) === mission.sourceObjectiveId,
      )
    : undefined;
  if (lesson?.words?.length) {
    const authored = lesson.words
      .slice(0, 5)
      .map((word) => lessonWordPair(mission.language, word))
      .filter((pair): pair is { target: string; meaning: string } => Boolean(pair?.target.trim()));
    if (authored.length > 0) return authored;
  }
  const lines = (catalogLines ?? []).filter((line) => line.target.trim()).slice(0, 5);
  if (lines.length > 0) return lines.map((line) => ({ target: line.target, meaning: line.native }));
  return [{ target: mission.openingLine, meaning: "" }];
}

export type SpeakingStep = "hear" | "respond" | "conversation";
export const SPEAKING_STEPS = [
  { id: "hear", label: "Hear & say" },
  { id: "respond", label: "Answer a prompt" },
  { id: "conversation", label: "Conversation" },
] as const;
