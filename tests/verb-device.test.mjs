// Built by TAC — 2026-10-21
import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_VERB_DEVICE,
  MASTERY,
  MAX_QUEUE,
  UNHYDRATED_DEVICE,
  familyMastery,
  hydrateDeviceBox,
  markStep,
  readVerbDevice,
  recordPicks,
  recordRound,
  sourceFilterFor,
  suggestedFamily,
  updateDeviceBox,
} from "../src/lib/verb-games/device.ts";
import { base, miniData, playHonest } from "./helpers/verb-fixture.mjs";

const sampleLog = {
  v: 1,
  clientRoundId: "sample",
  dataHash: "h",
  config: base("crush"),
  endedAt: "2026-10-21T10:00:00.000Z",
  events: [],
};
const sampleResult = { score: 100, moves: 5, picks: 5, correct: 5, bestStreak: 5, durationMs: 90_000, completions: [], misses: [], won: false };
const pick = (correct, infinitive = "tener", familyId = "es.present.go-yo") => ({ familyId, infinitive, correct });

test("sanitizes foreign or corrupt device data", () => {
  assert.deepEqual(readVerbDevice({ v: 2, queue: "x" }), EMPTY_VERB_DEVICE);
  assert.deepEqual(readVerbDevice(null), EMPTY_VERB_DEVICE);
  assert.deepEqual(readVerbDevice("junk"), EMPTY_VERB_DEVICE);
});

test("a v1 blob keeps valid fields and drops corrupt ones", () => {
  const s = readVerbDevice({
    v: 1,
    mastery: { "es.present.go-yo|tener": { picks: 4, correct: 3 }, bad: { picks: "x" }, neg: { picks: -1, correct: 0 } },
    bests: { "crush|L1:go-yo": { score: 9, moves: 2, at: "t" }, bad: 5 },
    queue: [{ ...sampleLog }, { nope: true }],
    settings: { source: "weird", listMode: "yes" },
    unitSteps: { "es.present.ar": ["see", "bogus", "see"], "es.present.nope": ["see"] },
  });
  assert.deepEqual(s.mastery, { "es.present.go-yo|tener": { picks: 4, correct: 3 } });
  assert.deepEqual(Object.keys(s.bests), ["crush|L1:go-yo"]);
  assert.equal(s.queue.length, 1);
  assert.deepEqual(s.settings, EMPTY_VERB_DEVICE.settings);
  assert.deepEqual(s.unitSteps, { "es.present.ar": ["see"] });
});

test("readVerbDevice never returns the shared EMPTY object", () => {
  const a = readVerbDevice(null);
  a.queue.push(sampleLog);
  assert.equal(EMPTY_VERB_DEVICE.queue.length, 0);
});

test("mastery needs 30 picks at 85%", () => {
  assert.deepEqual(MASTERY, { minPicks: 30, accuracy: 0.85 });
  let s = recordPicks(EMPTY_VERB_DEVICE, Array.from({ length: 29 }, () => pick(true)));
  assert.equal(familyMastery(s, "es.present.go-yo", ["tener"]).mastered, false);
  s = recordPicks(s, [pick(true)]);
  assert.deepEqual(familyMastery(s, "es.present.go-yo", ["tener"]), { picks: 30, correct: 30, mastered: true, verbsMastered: 1 });
  const weak = recordPicks(EMPTY_VERB_DEVICE, [...Array.from({ length: 25 }, () => pick(true)), ...Array.from({ length: 5 }, () => pick(false))]);
  assert.equal(familyMastery(weak, "es.present.go-yo", ["tener"]).mastered, false); // 25/30 = 0.83
  assert.equal(EMPTY_VERB_DEVICE.mastery["es.present.go-yo|tener"], undefined, "input state is not mutated");
});

test("bests keep the higher score, ties go to fewer moves; queue caps at 50", () => {
  const log = (id) => ({ ...sampleLog, clientRoundId: id });
  let s = recordRound(EMPTY_VERB_DEVICE, log("a"), { ...sampleResult, score: 300, moves: 12 }, { queue: true });
  s = recordRound(s, log("b"), { ...sampleResult, score: 300, moves: 10 }, { queue: true });
  assert.deepEqual(s.bests["crush|L1:go-yo"].moves, 10);
  s = recordRound(s, log("c"), { ...sampleResult, score: 300, moves: 11 }, { queue: true });
  assert.equal(s.bests["crush|L1:go-yo"].moves, 10);
  s = recordRound(s, log("d"), { ...sampleResult, score: 200, moves: 1 }, { queue: true });
  assert.equal(s.bests["crush|L1:go-yo"].score, 300);
  for (let i = 0; i < 60; i++) s = recordRound(s, log(`q${i}`), sampleResult, { queue: true });
  assert.equal(s.queue.length, MAX_QUEUE);
  assert.equal(s.queue[49].clientRoundId, "q59");
});

test("queue: false records the best but does not queue; a repeated round id queues once", () => {
  let s = recordRound(EMPTY_VERB_DEVICE, sampleLog, sampleResult, { queue: false });
  assert.equal(s.queue.length, 0);
  assert.equal(s.bests["crush|L1:go-yo"].score, 100);
  s = recordRound(s, sampleLog, sampleResult, { queue: true });
  s = recordRound(s, sampleLog, sampleResult, { queue: true });
  assert.equal(s.queue.length, 1);
});

test("list-mode rounds never set a best but are still queued", () => {
  const listLog = { ...sampleLog, clientRoundId: "list", config: { ...sampleLog.config, listMode: true } };
  let s = recordRound(EMPTY_VERB_DEVICE, listLog, { ...sampleResult, score: 999 }, { queue: true });
  assert.deepEqual(s.bests, {});
  assert.equal(s.queue.length, 1);
  assert.equal(s.queue[0].clientRoundId, "list");
  s = recordRound(s, sampleLog, sampleResult, { queue: true });
  assert.equal(s.bests["crush|L1:go-yo"].score, 100);
});

test("suggestedFamily is the first unmastered family by tier then order", () => {
  const data = miniData();
  const first = suggestedFamily(EMPTY_VERB_DEVICE, data);
  const infs = data.verbs.filter((v) => v.forms.some((f) => f.families.includes(first))).map((v) => v.infinitive);
  assert.ok(infs.length > 0);
  const mastered = recordPicks(EMPTY_VERB_DEVICE, Array.from({ length: 30 }, () => ({ familyId: first, infinitive: infs[0], correct: true })));
  const next = suggestedFamily(mastered, data);
  assert.notEqual(next, first);
});

test("markStep adds each step once, in the order marked", () => {
  let s = markStep(EMPTY_VERB_DEVICE, "es.present.ar", "see");
  s = markStep(s, "es.present.ar", "hear");
  s = markStep(s, "es.present.ar", "see");
  assert.deepEqual(s.unitSteps["es.present.ar"], ["see", "hear"]);
});

test("sourceFilterFor maps device settings and module id to a SourceFilter", () => {
  assert.deepEqual(sourceFilterFor({ source: "core" }, "m1"), { kind: "core" });
  assert.deepEqual(sourceFilterFor({ source: "module" }, "m1"), { kind: "module", moduleId: "m1" });
  assert.deepEqual(sourceFilterFor({ source: "both" }, "m1"), { kind: "both", moduleId: "m1" });
  for (const id of [null, undefined, ""]) {
    assert.deepEqual(sourceFilterFor({ source: "module" }, id), { kind: "core" });
    assert.deepEqual(sourceFilterFor({ source: "both" }, id), { kind: "core" });
  }
});

test("hydration: updates before hydration are ignored, so saved data is never overwritten", () => {
  const saved = recordPicks(EMPTY_VERB_DEVICE, [pick(true)]);
  let box = UNHYDRATED_DEVICE;
  assert.equal(box.hydrated, false);
  const early = updateDeviceBox(box, (s) => recordPicks(s, [pick(false)]));
  assert.equal(early, box, "ignored update returns the same box");
  box = hydrateDeviceBox(JSON.parse(JSON.stringify(saved)));
  assert.equal(box.hydrated, true);
  assert.deepEqual(box.state.mastery, saved.mastery);
  box = updateDeviceBox(box, (s) => recordPicks(s, [pick(true)]));
  assert.equal(box.state.mastery["es.present.go-yo|tener"].picks, 2);
});

test("hydration: a store with nothing saved hydrates to empty and then accepts updates", () => {
  const box = hydrateDeviceBox(null);
  assert.equal(box.hydrated, true);
  assert.deepEqual(box.state, EMPTY_VERB_DEVICE);
  assert.equal(updateDeviceBox(box, (s) => markStep(s, "es.present.ar", "see")).state.unitSteps["es.present.ar"][0], "see");
});

test("an honest replayed round records into the device state end to end", () => {
  const { log, result } = playHonest(miniData(), base("bubble"));
  const s = recordRound(EMPTY_VERB_DEVICE, log, result, { queue: true });
  assert.equal(s.queue.length, 1);
  assert.equal(s.bests["bubble|go-yo"].score, result.score);
});
