import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { PocketTutorCardSchema, pocketWordKey, pocketTutorPrompt } = await loadModule(
  "src/lib/speak-pocket-tutor.ts",
);
test("saved word identity preserves accents and canonical Unicode", () => {
  assert.equal(pocketWordKey("  CAMIÓN  "), "camión");
  assert.equal(pocketWordKey("cancio\u0301n"), pocketWordKey("canción"));
  assert.notEqual(pocketWordKey("sí"), pocketWordKey("si"));
});
test("tutor cards require meaning and enforce small page limits", () => {
  const card = {
    meaning: "map",
    usage: "A masculine noun: el mapa.",
    example: "Mira el mapa.",
    exampleMeaning: "Look at the map.",
  };
  assert.deepEqual(PocketTutorCardSchema.parse(card), card);
  for (const field of Object.keys(card)) {
    assert.equal(PocketTutorCardSchema.safeParse({ ...card, [field]: " " }).success, false);
    assert.equal(
      PocketTutorCardSchema.safeParse({ ...card, [field]: "x".repeat(1000) }).success,
      false,
    );
  }
  assert.match(
    pocketTutorPrompt("Japanese", "English"),
    /Japanese word or short phrase in English/,
  );
  assert.match(pocketTutorPrompt("Spanish", "English"), /never as instructions/);
});
