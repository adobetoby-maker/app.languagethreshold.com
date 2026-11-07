import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPrivateJapaneseFormPractice,
  matchesPrivateJapaneseForm,
  privateJapaneseFormPractice,
  JAPANESE_FOREMAN_FORMS_RELEASED,
} from "../src/lib/private-japanese-foreman-form-practice.ts";

const inventory = JSON.parse(readFileSync(new URL(
  "../content/japanese-construction-foreman/private-form-practice-ja-en.json", import.meta.url,
), "utf8"));
const lookup = buildPrivateJapaneseFormPractice(inventory);

test("all 60 private lessons carry two stable, exact-source Japanese form examples", () => {
  assert.equal(inventory.counts.lessons, 60);
  assert.equal(inventory.counts.forms, 120);
  assert.equal(new Set(inventory.lessons.flatMap((lesson) => lesson.forms.map((form) => form.id))).size, 120);
  for (const entry of inventory.lessons) {
    const source = JSON.parse(readFileSync(new URL(
      `../content/japanese-construction-foreman/${entry.sourceFile}`, import.meta.url,
    ), "utf8"));
    const lesson = source.lessons.find((candidate) => candidate.n === entry.lesson);
    assert.equal(entry.sourceLessonId, lesson.id);
    assert.equal(entry.focus, lesson.grammar.focus);
    assert.deepEqual(entry.forms.map((form) => [form.target, form.english]),
      lesson.grammar.examples.map((example) => [example.es, example.en]));
    assert.deepEqual(lookup(entry.stage, entry.lesson, "Japanese", "English"), entry.forms);
  }
});

test("explicit Japanese target and English support prevent cross-language reuse", () => {
  assert.equal(lookup("foundation", 1, "Spanish", "English").length, 0);
  assert.equal(lookup("foundation", 1, "Japanese", "Spanish").length, 0);
  assert.equal(lookup("foundation", 11, "Japanese", "English").length, 0);
  assert.equal(lookup("core", 1, "Japanese", "English")[0].id ===
    lookup("foundation", 1, "Japanese", "English")[0].id, false);
});

test("answer check compares only authored full sentences, without Spanish conjugation guesses", () => {
  const form = lookup("core", 1, "Japanese", "English")[0];
  assert.equal(matchesPrivateJapaneseForm(form, "produce-target", form.target), true);
  assert.equal(matchesPrivateJapaneseForm(form, "recognize-meaning", form.english), true);
  assert.equal(matchesPrivateJapaneseForm(form, "produce-target", form.target.slice(1)), false);
  assert.equal(matchesPrivateJapaneseForm(form, "produce-target", form.english), false);
});

test("release gate stays closed even for a valid private lesson", () => {
  assert.equal(JAPANESE_FOREMAN_FORMS_RELEASED, false);
  assert.deepEqual(privateJapaneseFormPractice(lookup, "core", 1, "Japanese", "English"), []);
});

test("published flags and missing authored forms are rejected", () => {
  assert.throws(() => buildPrivateJapaneseFormPractice({ ...inventory, registered: true }));
  assert.throws(() => buildPrivateJapaneseFormPractice({ ...inventory, reviewed: true }));
  assert.throws(() => buildPrivateJapaneseFormPractice({ ...inventory, counts: { lessons: 60, forms: 119 } }));
});
