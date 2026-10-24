import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE30_PHILOSOPHY as BASE,
  buildCore30Philosophy,
  fillPlaceholders,
} from "../src/data/core30-philosophy.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";
import { CURRICULA } from "../src/data/curriculum.ts";

// The page copy is built per module and language; these are the cases it must get right.
function build(moduleId, language = "Spanish", nativeLanguage = "English") {
  const curriculum = CURRICULA[moduleId];
  return buildCore30Philosophy({
    moduleId,
    language,
    nativeLanguage,
    headline: curriculum?.headline ?? null,
    threshold: curriculum?.threshold ?? null,
  });
}
const ROOFING = build("roofing");
const ORTHO = build("orthopedics");
const FRENCH_ORTHO = build("orthopedics", "French");
const NO_MODULE = build(null, "German");
const CORE30_PHILOSOPHY = ROOFING;

const ORDER = ["see", "recall", "hear", "type", "say", "write"];
const LABELS = ["See it", "Recall it", "Hear it", "Type it", "Say it", "Write it"];
const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

test("the six ways exist, in the learner's order, each with non-empty copy", () => {
  const items = CORE30_PHILOSOPHY.ways.items;
  assert.deepEqual(
    items.map((w) => w.id),
    ORDER,
  );
  assert.deepEqual(
    items.map((w) => w.label),
    LABELS,
  );
  for (const w of items) {
    for (const field of ["stage", "doIt", "why"]) {
      assert.ok(nonEmpty(w[field]), `${w.id}.${field} is non-empty`);
    }
    assert.ok(nonEmpty(w.example.es), `${w.id} example Spanish`);
    assert.ok(nonEmpty(w.example.en), `${w.id} example English`);
  }
});

test("every example Spanish word or phrase exists in that lesson's roofing words", () => {
  for (const w of CORE30_PHILOSOPHY.ways.items) {
    const { es, en, lesson } = w.example;
    const words = ROOFING_LESSON_WORDS[lesson];
    assert.ok(Array.isArray(words), `${w.id}: roofing lesson ${lesson} exists`);
    const hit = words.find((word) => word.es === es);
    assert.ok(hit, `${w.id}: "${es}" is in roofing lesson ${lesson}`);
    assert.equal(
      hit.en.toLowerCase().includes(en.toLowerCase().replace(/\.$/, "")),
      true,
      `${w.id}: English "${en}" matches "${hit.en}"`,
    );
  }
});

test("Write it names the copy-then-recall sequence", () => {
  const write = CORE30_PHILOSOPHY.ways.items.find((w) => w.id === "write");
  assert.match(write.doIt, /copy/i);
  assert.match(write.doIt, /memory/i);
});

test("the opening promise is the current module's real end goal", () => {
  assert.equal(ROOFING.opening.promise, CURRICULA.roofing.threshold);
  assert.equal(ORTHO.opening.promise, CURRICULA.orthopedics.threshold);
  assert.equal(FRENCH_ORTHO.opening.promise, CURRICULA.orthopedics.threshold);
});

test("a module with no curriculum gets generic copy that names the language", () => {
  assert.match(NO_MODULE.opening.promise, /use German in the real situations/);
  assert.doesNotMatch(NO_MODULE.opening.promise, /roofing|crew|Spanish/i);
});

test("all six ways exist for every module and language", () => {
  for (const copy of [ROOFING, ORTHO, FRENCH_ORTHO, NO_MODULE]) {
    assert.deepEqual(
      copy.ways.items.map((w) => w.id),
      ORDER,
    );
    for (const w of copy.ways.items) {
      for (const field of ["doIt", "why", "exampleLabel"]) {
        assert.ok(nonEmpty(w[field]), `${w.id}.${field} is non-empty`);
      }
    }
  }
});

test("no placeholder is left in any built copy", () => {
  for (const copy of [ROOFING, ORTHO, FRENCH_ORTHO, NO_MODULE]) {
    assert.doesNotMatch(JSON.stringify(copy), /\{\w+\}/);
  }
  assert.match(JSON.stringify(BASE), /\{language\}/);
  assert.equal(
    fillPlaceholders("in {language}, {unknown}", { language: "French" }),
    "in French, {unknown}",
  );
});

test("the language being learned replaces the hard-coded Spanish", () => {
  const french = JSON.stringify({
    ways: FRENCH_ORTHO.ways.items.map((w) => [w.doIt, w.why]),
    opening: FRENCH_ORTHO.opening.body,
  });
  assert.match(french, /type the French yourself/);
  assert.match(french, /you will hear French/);
  assert.match(french, /teaches its words in French/);
  const learnerCopy = JSON.stringify([
    FRENCH_ORTHO.together,
    FRENCH_ORTHO.mastery,
    FRENCH_ORTHO.routine,
    FRENCH_ORTHO.teamLeads,
  ]);
  assert.doesNotMatch(learnerCopy, /Spanish/);
  for (const w of FRENCH_ORTHO.ways.items) {
    assert.doesNotMatch(`${w.doIt} ${w.why}`, /Spanish/, `${w.id} copy is language-neutral`);
  }
});

test("a non-roofing module makes no roofing-crew promise and labels the roofing examples", () => {
  assert.doesNotMatch(ORTHO.opening.promise, /roofing/i);
  assert.doesNotMatch(ORTHO.opening.body.join(" "), /built from the Roofing Supervisor course/);
  assert.match(ORTHO.opening.body[0], /same six-way pattern/);
  assert.match(ORTHO.opening.body[0], /The Clinical Core 30/);
  assert.match(ORTHO.opening.body[1], /come from the Roofing Supervisor course/);
  for (const w of ORTHO.ways.items) {
    assert.match(w.exampleLabel, /^Example from the Roofing Supervisor course \u00b7 Lesson \d+$/);
  }
  // Another target language also flags that the example words are Spanish.
  for (const w of FRENCH_ORTHO.ways.items) {
    assert.match(w.exampleLabel, /Roofing Supervisor course \(Spanish\) \u00b7 Lesson \d+$/);
  }
});

test("the roofing module keeps its roofing lines", () => {
  assert.match(ROOFING.opening.body[0], /built from the Roofing Supervisor course/);
  assert.match(ROOFING.opening.promise, /roofing crew/);
  for (const w of ROOFING.ways.items) {
    assert.match(w.exampleLabel, /^Example \u00b7 Lesson \d+$/);
  }
});

test("the offline tip says what works offline and what needs a connection", () => {
  const tip = ROOFING.routine.tips.find((t) => /offline/i.test(t.heading));
  assert.ok(tip, "an offline tip exists");
  for (const word of ["study", "flashcards", "memory match", "typing", "handwriting self-check"]) {
    assert.match(tip.text, new RegExp(word, "i"), word);
  }
  assert.match(tip.text, /listening audio you have already played/i);
  assert.match(
    tip.text,
    /speaking mission, word lookup, and having the app read your handwriting need a connection/,
  );
  assert.doesNotMatch(tip.text, /dead zone|saved for offline use/);
});

test("the passage toggle uses the learner's native language, not a side-by-side claim", () => {
  const see = ROOFING.ways.items.find((w) => w.id === "see");
  assert.match(see.doIt, /English toggle/);
  assert.doesNotMatch(see.doIt, /side by side/i);
  const portuguese = build("orthopedics", "Spanish", "Portuguese").ways.items.find(
    (w) => w.id === "see",
  );
  assert.match(portuguese.doIt, /Portuguese toggle/);
});

test("the stages cover every way once and mastery means all six", () => {
  const covered = CORE30_PHILOSOPHY.together.stages.flatMap((s) => s.ways).sort();
  assert.deepEqual(covered, [...ORDER].sort());
  assert.match(CORE30_PHILOSOPHY.together.mastery, /all six/i);
});

test("the 90-day rhythm matches the plan constants", () => {
  const text = JSON.stringify(CORE30_PHILOSOPHY.mastery.rhythm);
  assert.match(text, /every 3 days/i);
  assert.match(text, /every 4 days/i);
  assert.match(text, /Lesson 30 on day 88/);
});

test("routine, tips, and team-lead sections have content", () => {
  const { routine, teamLeads } = CORE30_PHILOSOPHY;
  assert.equal(routine.days.length, 2);
  for (const day of routine.days) {
    assert.ok(nonEmpty(day.label) && nonEmpty(day.length) && day.steps.length >= 3);
  }
  assert.ok(routine.tips.length >= 4);
  assert.ok(nonEmpty(teamLeads.text));
});

test("copy avoids banned hype words and emoji", () => {
  const text = JSON.stringify(CORE30_PHILOSOPHY);
  assert.doesNotMatch(text, /seamless|unlock|supercharge|game-changer|delve|10x/i);
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
});
