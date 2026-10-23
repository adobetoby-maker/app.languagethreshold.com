import type { ListeningDrillQuestion } from "@/fns/listening-drill.functions";

/** Prepare once when a question arrives; never reorder options during playback or answering. */
export function prepareListeningChoices(
  question: ListeningDrillQuestion,
  previousPositions: readonly number[],
  random: () => number = Math.random,
): ListeningDrillQuestion {
  const { phrase, options } = question;
  if (options.length !== 4 || new Set(options).size !== 4 || !options.includes(phrase)) {
    throw new Error("Listening choices must contain four distinct transcripts, including the audio phrase.");
  }
  // Use every letter before repeating one. Random tie-breaking avoids a fixed A/B/C/D cycle.
  const counts = options.map((_, index) => previousPositions.filter((p) => p === index).length);
  const least = Math.min(...counts);
  const positions = counts.flatMap((count, index) => count === least ? [index] : []);
  const correctIndex = positions[Math.floor(random() * positions.length)];
  const distractors = options.filter((option) => option !== phrase);
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const arranged = [...distractors];
  arranged.splice(correctIndex, 0, phrase);
  return { ...question, options: arranged, correctIndex };
}
