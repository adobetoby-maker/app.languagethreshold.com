// Built by TAC — 2026-11-21
// Round-4 fixes for the owner rules of 2026-11-21: learners outside the released course packs keep
// the base app's verb games, exam letter row, dictionary and anatomy/soccer behaviour; French and
// Italian keep the Spanish course structure (library categories, sport games, Speak scope, course
// order) in its unavailable state where they have no content.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { packFor } from "../src/data/language-packs/registry.ts";
import { followsPackRules } from "../src/data/language-packs/pack-rules.ts";
import {
  BASE_TYPED_LETTERS,
  GAME_LETTERS,
  baseGameAnswer,
  baseGameSubjects,
} from "../src/lib/lesson-verb-games.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { MODULES, moduleSupportsLanguage } from "../src/data/modules.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("only French and Italian follow pack rules", () => {
  for (const code of ["fr", "it"]) assert.equal(followsPackRules(packFor(code)), true, code);
  for (const name of [
    "Spanish",
    "Japanese",
    "German",
    "Portuguese",
    "Chinese",
    "Korean",
    "Pashto",
    "English",
  ])
    assert.equal(followsPackRules(packFor(name)), false, name);
});

test("base verb games: letters, typed row, subjects and matcher are the base app's", () => {
  assert.equal(GAME_LETTERS.length, 33);
  assert.deepEqual(BASE_TYPED_LETTERS, [..."áéíóúüñ"]);
  // Punctuation is not stripped (round-3 O-1: "ich gehe." was accepted).
  assert.equal(baseGameAnswer("ich gehe", "ich gehe."), false);
  assert.equal(
    baseGameAnswer(
      "hablamos",
      "nosotras hablamos",
      baseGameSubjects("nosotros · hablar", "Spanish"),
    ),
    true,
  );
  // Subjects only for Spanish and English prompts.
  assert.deepEqual(baseGameSubjects("ich · gehen", "German"), []);
  assert.deepEqual(baseGameSubjects("I · go", "English"), ["I"]);
});

test("Italian Say it missions stay inside its own Study library; French has none", () => {
  const italian = getSpeakingMissions("Italian");
  const modules = new Set(italian.map((mission) => mission.moduleId));
  for (const id of modules) {
    if (id === "core-speaking") continue;
    const module = MODULES.find((candidate) => candidate.id === id);
    assert.ok(module && moduleSupportsLanguage(module, "Italian"), id);
  }
  assert.equal(getSpeakingMissions("French").length, 0);
});

test("French and Italian continue their courses in the Spanish order", () => {
  for (const [code, name] of [
    ["fr", "french"],
    ["it", "italian"],
  ])
    assert.deepEqual(packFor(code).library.coreBasics.slice(0, 5), [
      `${name}-basics`,
      `${name}-102`,
      `${name}-frequent-verbs`,
      `${name}-conjugation-patterns`,
      `${name}-usage-verbs`,
    ]);
});

test("rule-3 screens gate their pack behaviour on followsPackRules", () => {
  const dictionary = read("src/components/dictionary/DictionaryTab.tsx");
  assert.match(dictionary, /const chips = CATEGORY_CHIPS;/);
  assert.match(dictionary, /packRules && pack \? foldMarks/);
  const exams = read("src/components/exams2/QuestionInputs.tsx");
  assert.match(exams, /pack\?\.code === "es"\s*\?\s*SPANISH_KEYS/);
  for (const file of [
    "src/components/anatomy/AnatomyQuizPanel.tsx",
    "src/components/games/SoccerPositionsGame.tsx",
    "src/components/core30/LessonSayItCard.tsx",
    "src/lib/phone-dictation.ts",
  ])
    assert.match(read(file), /followsPackRules\(/, file);
  // /place-directions renders outside AppProvider: the game keeps its base Spanish/English defaults.
  const place = read("src/components/games/PlaceDirectionsGame.tsx");
  assert.match(place, /targetLanguage = "Spanish",\s*nativeLanguage = "English",/);
  assert.doesNotMatch(place, /useApp\(/);
});

test("French and Italian keep the sport game cards and library categories in their unavailable state", () => {
  const hub = read("src/components/games/GamesHub.tsx");
  assert.match(hub, /module-game-unavailable-/);
  const library = read("src/components/modules/ModulesPage.tsx");
  assert.match(library, /category-unavailable-/);
});
