import test from "node:test";
import assert from "node:assert/strict";
import { noteInWrongLanguage } from "../src/lib/core60-generator-core.ts";

test("English grammar notes with a Spanish example are English", () => {
  for (const note of [
    "Feminine noun that takes el: el agua fría.",
    "A feminine word that takes el: el agua fría.",
    "Adjectives agree: el hilo afilado, la cuchilla afilada.",
  ]) assert.equal(noteInWrongLanguage(note, "English"), false, note);
});

test("a Spanish-only note is still caught", () => {
  assert.equal(noteInWrongLanguage("Se usa con el verbo tener para la edad.", "English"), true);
});
