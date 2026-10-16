import assert from "node:assert/strict";
import { test } from "node:test";
import { ConjugationOutput } from "../src/lib/conjugation-output.ts";
const valid = {
  phrase: "Yo ___ cada día.",
  phraseTranslation: "I [verb] every day.",
  infinitive: "hablar",
  infinitiveTranslation: "to speak",
  correctConjugation: "hablo",
  wrongOptions: ["hablas", "hablamos", "hablan"],
  explanation: "Yo takes hablo.",
  axisTested: "person",
  cefr: "A2",
};
test("malformed model output is rejected without inventing replacement answers", () => {
  for (const patch of [
    { wrongOptions: ["hablo", "hablas", "hablan"] },
    { wrongOptions: [" HABLO ", "hablas", "hablan"] },
    { wrongOptions: ["hablas", "hablas", "hablan"] },
    { wrongOptions: ["hablas", "hablar?", "hablan"] },
    { phrase: "Yo hablo." },
    { phrase: "Yo ___ y tú ___." },
    { phrase: "Yo ____." },
    { explanation: "" },
    { correctConjugation: null },
    { cefr: "unknown" },
  ]) {
    assert.equal(ConjugationOutput.safeParse({ ...valid, ...patch }).success, false);
  }
  assert.equal(ConjugationOutput.safeParse(null).success, false);
  assert.equal(ConjugationOutput.safeParse(valid).success, true);
});
test("case and Unicode-equivalent options cannot masquerade as distinct choices", () => {
  assert.equal(
    ConjugationOutput.safeParse({
      ...valid,
      correctConjugation: "hablé",
      wrongOptions: ["hable\u0301", "hablas", "hablan"],
    }).success,
    false,
  );
});
