/** Exact-pair typed checking for authored French and Japanese form prompts. */
export type FormPracticePair = "French:English" | "Japanese:English";

export interface FormPracticeAnswer {
  pairKey: FormPracticePair;
  frenchAnswer?: string;
  japaneseAnswer?: string;
  knownFrenchVariants?: readonly string[];
  knownJapaneseVariants?: readonly string[];
}

function normalizeFormAnswer(value: string, pair: FormPracticePair): string {
  const text = value.normalize("NFKC").toLowerCase();
  if (pair === "Japanese:English") {
    // Mixed-script source lines may have editorial spaces between Japanese and English.
    return text.replace(/[\p{P}\p{Z}\s]/gu, "");
  }
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Only explicitly authored variants count; no inferred translation or conjugation is accepted. */
export function isCorrectFormPracticeAnswer(
  input: string,
  prompt: FormPracticeAnswer,
  selectedPair: FormPracticePair,
): boolean {
  if (prompt.pairKey !== selectedPair) return false;
  const normalized = normalizeFormAnswer(input, selectedPair);
  if (!normalized) return false;
  const answers = selectedPair === "French:English"
    ? [prompt.frenchAnswer, ...(prompt.knownFrenchVariants ?? [])]
    : [prompt.japaneseAnswer, ...(prompt.knownJapaneseVariants ?? [])];
  return answers.some((answer) => answer && normalizeFormAnswer(answer, selectedPair) === normalized);
}
