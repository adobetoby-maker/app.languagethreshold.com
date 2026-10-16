import { z } from "zod";

const text = z.string().trim().min(1).max(1600);
const answer = z.string().trim().min(1).max(120);
const normalized = (value: string) => value.normalize("NFC").toLocaleLowerCase();

/** Structural checks only: passing these does not certify grammatical correctness. */
export const ConjugationOutput = z
  .object({
    phrase: text.refine(
      (value) => (value.match(/___/g) ?? []).length === 1 && !value.includes("____"),
    ),
    phraseTranslation: text,
    infinitive: answer,
    infinitiveTranslation: answer,
    correctConjugation: answer,
    wrongOptions: z.array(answer).length(3),
    explanation: text,
    axisTested: z.enum(["tense", "person", "number", "mood", "mixed"]),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  })
  .superRefine((question, context) => {
    const options = [question.correctConjugation, ...question.wrongOptions].map(normalized);
    if (new Set(options).size !== 4 || options.some((option) => option.includes("?"))) {
      context.addIssue({ code: "custom", message: "Four distinct verb forms are required." });
    }
  });
