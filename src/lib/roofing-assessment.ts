import { createHash, randomInt } from "node:crypto";
import {
  ROOFING_GUIDE_MATERIALS,
  ROOFING_GUIDE_PHRASES,
  ROOFING_EXTRA_MATERIALS,
  ROOFING_EXTRA_PHRASES,
} from "../data/roofing-content.ts";

type Pair = { en: string; es: string };
export type RoofingArea = "materials" | "tearOff" | "installation" | "safety" | "closeout";
export type RoofingQuestion = { id: string; area: RoofingArea; prompt: string; answer: string };

const groups: Record<RoofingArea, Pair[]> = {
  materials: [...ROOFING_GUIDE_MATERIALS, ...ROOFING_EXTRA_MATERIALS],
  tearOff: [...ROOFING_GUIDE_PHRASES.tearOff, ...ROOFING_EXTRA_PHRASES.briefing],
  installation: [...ROOFING_GUIDE_PHRASES.installation, ...ROOFING_EXTRA_PHRASES.quality],
  safety: [...ROOFING_GUIDE_PHRASES.safety, ...ROOFING_EXTRA_PHRASES.safetyStopWork],
  closeout: ROOFING_EXTRA_PHRASES.closeout,
};
const blueprint: Record<RoofingArea, number> = {
  materials: 5,
  tearOff: 5,
  installation: 7,
  safety: 5,
  closeout: 3,
};

export const ROOFING_QUESTION_BANK: RoofingQuestion[] = Object.entries(groups).flatMap(
  ([area, pairs]) =>
    pairs.map((pair, index) => ({
      id: `roofing-v1-${area}-${index + 1}`,
      area: area as RoofingArea,
      prompt: `Choose the Spanish for: ${pair.en}`,
      answer: pair.es,
    })),
);

const byId = new Map(ROOFING_QUESTION_BANK.map((q) => [q.id, q]));
export function roofingQuestion(id: string) {
  return byId.get(id);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawRoofingQuestions(): string[] {
  return Object.entries(blueprint).flatMap(([area, count]) =>
    shuffle(ROOFING_QUESTION_BANK.filter((q) => q.area === area))
      .slice(0, count)
      .map((q) => q.id),
  );
}

function rank(seed: string, id: string) {
  return createHash("sha256").update(`${seed}:${id}`).digest("hex");
}
export function publicRoofingQuestion(id: string, attemptId: string) {
  const question = roofingQuestion(id);
  if (!question) throw new Error("Unknown assessment question.");
  const distractors = ROOFING_QUESTION_BANK.filter(
    (q) => q.area === question.area && q.id !== id && q.answer !== question.answer,
  )
    .sort((a, b) => rank(attemptId + id, a.id).localeCompare(rank(attemptId + id, b.id)))
    .slice(0, 3);
  const options = [question.answer, ...distractors.map((q) => q.answer)].sort((a, b) =>
    rank(attemptId + id, a).localeCompare(rank(attemptId + id, b)),
  );
  return { id: question.id, area: question.area, prompt: question.prompt, options };
}

export function scoreRoofingAnswers(questionIds: string[], answers: Record<string, string>) {
  const areaScores: Record<string, { correct: number; total: number }> = {};
  let correct = 0;
  for (const id of questionIds) {
    const question = roofingQuestion(id);
    if (!question) throw new Error("Question bank version mismatch.");
    const area = areaScores[question.area] ?? { correct: 0, total: 0 };
    area.total++;
    if (answers[id] === question.answer) {
      correct++;
      area.correct++;
    }
    areaScores[question.area] = area;
  }
  return { correct, total: questionIds.length, areaScores };
}
