import assert from "node:assert/strict";
import test from "node:test";
import { flashcardWordGloss, hasDistinctFlashcardExample } from "../src/lib/flashcard-glosses.ts";

test("phrase gloss keeps Spanish order instead of repeating or zipping the natural English translation", () => {
  assert.deepEqual(
    flashcardWordGloss({ word: "Clavos para techo", language: "Spanish" }, "English"),
    [
      { word: "Clavos", meaning: "nails" },
      { word: "para", meaning: "for" },
      { word: "techo", meaning: "roof" },
    ],
  );
  assert.deepEqual(
    flashcardWordGloss({ word: "Pistola de clavos", language: "Spanish" }, "English")?.map(
      (p) => p.meaning,
    ),
    ["gun", "of", "nails"],
  );
});
test("glosses normalize accents/case and refuse unsupported phrases or language pairs", () => {
  const card = { word: "  LÁMINA METÁLICA  ", language: "Spanish" };
  assert.equal(flashcardWordGloss(card, "English")?.length, 2);
  assert.equal(flashcardWordGloss(card, "French"), null);
  assert.equal(flashcardWordGloss({ ...card, language: "Italian" }, "English"), null);
  assert.equal(
    flashcardWordGloss({ word: "Banco de pruebas", language: "Spanish" }, "English"),
    null,
  );
});
test("only a real example is shown; repeated card placeholders are omitted", () => {
  assert.equal(
    hasDistinctFlashcardExample({ word: "Clavos para techo", example: " clavos para techo " }),
    false,
  );
  assert.equal(
    hasDistinctFlashcardExample({ word: "Teja asfáltica", example: "Teja asfa\u0301ltica" }),
    false,
  );
  assert.equal(
    hasDistinctFlashcardExample({
      word: "Clavos para techo",
      example: "Necesito dos cajas de clavos para techo.",
    }),
    true,
  );
  assert.equal(hasDistinctFlashcardExample({ word: "Clavos para techo", example: "" }), false);
});
