// Built by TAC — 2026-10-22
// Verb pattern series: per-step progress in the device state (additive to the v1 blob).
import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_VERB_DEVICE,
  readVerbDevice,
  recordSeriesStep,
  seriesMastered,
  seriesProgress,
  stepUnlocked,
} from "../src/lib/verb-games/device.ts";
import { readFileSync } from "node:fs";
import { createRng } from "../src/lib/verb-games/rng.ts";
import { SERIES_STEPS, choicePassed, personPrompt, readChoices, seriesItems } from "../src/lib/verb-games/series.ts";

const F = "es.present.go-yo";
const AT = "2026-10-22T10:00:00.000Z";
const pass = (s, step, score = 9) => recordSeriesStep(s, F, step, { score, passed: true, at: AT });

test("progress unlocks the steps in order", () => {
  let s = EMPTY_VERB_DEVICE;
  assert.deepEqual(
    SERIES_STEPS.map((step) => stepUnlocked(s, F, step)),
    [true, false, false, false, false],
  );
  // A later step cannot be passed before its predecessor.
  assert.equal(pass(s, "match"), s);
  s = pass(s, "pick");
  assert.deepEqual(seriesProgress(s, F).passed, ["pick"]);
  assert.equal(stepUnlocked(s, F, "match"), true);
  assert.equal(stepUnlocked(s, F, "cards"), false);
  s = pass(s, "match");
  s = pass(s, "cards");
  s = pass(s, "listen");
  assert.equal(stepUnlocked(s, F, "type"), true);
  assert.equal(seriesMastered(s, F), false);
  // Steps stay replayable: passing again changes nothing but the best.
  const again = pass(s, "pick", 10);
  assert.deepEqual(seriesProgress(again, F).passed, ["pick", "match", "cards", "listen"]);
  assert.equal(seriesProgress(again, F).best.pick, 10);
  assert.equal(EMPTY_VERB_DEVICE.series[F], undefined, "input not mutated");
});

test("passing step 5 marks the family mastered", () => {
  let s = EMPTY_VERB_DEVICE;
  for (const step of SERIES_STEPS.slice(0, 4)) s = pass(s, step);
  s = recordSeriesStep(s, F, "type", { score: 7, passed: false, at: AT });
  assert.equal(seriesMastered(s, F), false);
  assert.equal(seriesProgress(s, F).best.type, 7);
  s = pass(s, "type", 8);
  assert.equal(seriesMastered(s, F), true);
  assert.equal(seriesProgress(s, F).masteredAt, AT);
  assert.equal(seriesMastered(s, "es.present.ar"), false);
  // A later pass keeps the first mastered date.
  s = recordSeriesStep(s, F, "type", { score: 10, passed: true, at: "2027-01-01T00:00:00.000Z" });
  assert.equal(seriesProgress(s, F).masteredAt, AT);
});

test("a failed run records the best but unlocks nothing; best never goes down", () => {
  let s = recordSeriesStep(EMPTY_VERB_DEVICE, F, "pick", { score: 6, passed: false, at: AT });
  assert.deepEqual(seriesProgress(s, F).passed, []);
  assert.equal(seriesProgress(s, F).best.pick, 6);
  assert.equal(stepUnlocked(s, F, "match"), false);
  s = recordSeriesStep(s, F, "pick", { score: 4, passed: false, at: AT });
  assert.equal(seriesProgress(s, F).best.pick, 6);
});

test("saved state from before the series loads unchanged, with an empty series", () => {
  const old = {
    v: 1,
    mastery: { "es.present.go-yo|tener": { picks: 4, correct: 3 } },
    bests: { "bubble|go-yo": { score: 9, moves: 2, at: "t" } },
    ranks: {},
    queue: [],
    settings: { source: "both", listMode: true, mode: { kind: "forever" } },
    unitSteps: { "es.present.ar": ["see"] },
  };
  const s = readVerbDevice(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.series, {});
  assert.deepEqual(s.mastery, old.mastery);
  assert.deepEqual(s.bests, old.bests);
  assert.deepEqual(s.settings, old.settings);
  assert.deepEqual(s.unitSteps, old.unitSteps);
  assert.deepEqual(readVerbDevice(null).series, {});
});

test("series sanitizer keeps valid in-order progress and drops the rest", () => {
  const s = readVerbDevice(
    JSON.parse(
      JSON.stringify({
        v: 1,
        series: {
          "es.present.go-yo": { passed: ["pick", "match", "match", "bogus"], best: { pick: 9, match: 5, nope: 3, cards: -1, listen: "x" } },
          // "cards" without "match" is out of order: only the in-order prefix counts.
          "es.present.ar": { passed: ["pick", "cards"], best: {} },
          "es.present.e-ie": { passed: ["pick", "match", "cards", "listen", "type"], best: { type: 10 }, masteredAt: AT },
          // masteredAt without a passed Type it is dropped.
          "es.present.o-ue": { passed: ["pick"], best: {}, masteredAt: AT },
          "es.present.nope": { passed: ["pick"], best: {} },
          "es.present.e-i": "junk",
        },
      }),
    ),
  );
  assert.deepEqual(s.series["es.present.go-yo"], { passed: ["pick", "match"], best: { pick: 9, match: 5 } });
  assert.deepEqual(s.series["es.present.ar"], { passed: ["pick"], best: {} });
  assert.deepEqual(s.series["es.present.e-ie"], { passed: [...SERIES_STEPS], best: { type: 10 }, masteredAt: AT });
  assert.deepEqual(s.series["es.present.o-ue"], { passed: ["pick"], best: {} });
  assert.equal("es.present.nope" in s.series, false);
  assert.equal("es.present.e-i" in s.series, false);
  assert.deepEqual(readVerbDevice({ v: 1, series: "junk" }).series, {});
  assert.deepEqual(readVerbDevice({ v: 1, series: [1, 2] }).series, {});
});

test("prototype keys in the stored series are dropped, never written through", () => {
  const raw = JSON.parse(
    '{"v":1,"series":{"__proto__":{"passed":["pick"],"best":{}},"constructor":{"passed":["pick"],"best":{}},' +
      '"es.present.ar":{"passed":["pick"],"best":{"__proto__":{"x":1},"pick":8}}}}',
  );
  const s = readVerbDevice(raw);
  assert.deepEqual(Object.keys(s.series), ["es.present.ar"]);
  assert.equal(Object.getPrototypeOf(s.series), Object.prototype);
  assert.deepEqual(s.series["es.present.ar"].best, { pick: 8 });
  assert.equal(Object.getPrototypeOf(s.series["es.present.ar"].best), Object.prototype);
  assert.equal({}.passed, undefined, "Object.prototype untouched");
});

test("Listen passed by reading instead of hearing is the same step-4 pass and unlocks Type it", () => {
  const real = JSON.parse(readFileSync(new URL("../src/data/verb-patterns/es.json", import.meta.url), "utf8"));
  let s = EMPTY_VERB_DEVICE;
  for (const step of ["pick", "match", "cards"]) s = pass(s, step);
  assert.equal(stepUnlocked(s, F, "type"), false);
  // A learner without audio: every form is read, and the person + English is picked. Two misses.
  const items = seriesItems(real, F, { kind: "core" }, 21);
  const rng = createRng(21);
  let score = 0;
  items.forEach((item, i) => {
    const choices = readChoices(real, item, rng);
    const picked = i < 2 ? choices.find((c) => c !== personPrompt(item)) : choices.find((c) => c === personPrompt(item));
    if (picked === personPrompt(item)) score++;
  });
  assert.equal(score, 8);
  const run = { score, total: items.length, passed: choicePassed(score, items.length) };
  assert.equal(run.passed, true);
  const viaReading = recordSeriesStep(s, F, "listen", { score: run.score, passed: run.passed, at: AT });
  const viaAudio = recordSeriesStep(s, F, "listen", { score: 8, passed: true, at: AT });
  assert.deepEqual(viaReading, viaAudio, "recorded exactly like an audio pass");
  assert.deepEqual(seriesProgress(viaReading, F).passed, ["pick", "match", "cards", "listen"]);
  assert.equal(stepUnlocked(viaReading, F, "type"), true);
  // And mastery is reachable from there.
  assert.equal(seriesMastered(recordSeriesStep(viaReading, F, "type", { score: 9, passed: true, at: AT }), F), true);
});

test("Match keeps the real mistakes and the board size, even with more mistakes than pairs", () => {
  let s = pass(EMPTY_VERB_DEVICE, "pick");
  s = recordSeriesStep(s, F, "match", { score: 1, passed: false, at: AT, pairs: 5, mistakes: 7 });
  assert.deepEqual(seriesProgress(s, F).match, { pairs: 5, mistakes: 7 });
  assert.equal(seriesProgress(s, F).best.match, 1);
  // A worse run changes nothing.
  assert.equal(recordSeriesStep(s, F, "match", { score: 0, passed: false, at: AT, pairs: 5, mistakes: 9 }), s);
  // Same clean pairs with fewer mistakes replaces the record.
  s = recordSeriesStep(s, F, "match", { score: 1, passed: false, at: AT, pairs: 5, mistakes: 4 });
  assert.deepEqual(seriesProgress(s, F).match, { pairs: 5, mistakes: 4 });
  s = recordSeriesStep(s, F, "match", { score: 4, passed: true, at: AT, pairs: 4, mistakes: 1 });
  assert.deepEqual(seriesProgress(s, F).match, { pairs: 4, mistakes: 1 });
  assert.deepEqual(seriesProgress(s, F).passed, ["pick", "match"]);
  // Saved and read back; junk is dropped.
  const back = readVerbDevice(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(seriesProgress(back, F).match, { pairs: 4, mistakes: 1 });
  for (const match of [{ pairs: 0, mistakes: 1 }, { pairs: 5, mistakes: -1 }, { pairs: "5", mistakes: 0 }, "junk"]) {
    const raw = { v: 1, series: { [F]: { passed: ["pick", "match"], best: { match: 3 }, match } } };
    assert.equal(seriesProgress(readVerbDevice(raw), F).match, undefined, JSON.stringify(match));
  }
});
