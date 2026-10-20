// Built by TAC — 2026-10-19
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Master 20 "Say it" missions carry B1 and a surprise-complication flag, and only they get the
// complication instruction in the system prompt; every other module's mission is unchanged.
async function load() {
  const dir = mkdtempSync(join(tmpdir(), "master-say-it-"));
  try {
    const outfile = join(dir, "bundle.mjs");
    await build({
      stdin: {
        contents: `export {missionSystemPrompt} from './src/routes/api.speak';export {getAllSpeakingMissions,getSpeakingMissions} from './src/data/speaking-missions';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "stubs",
          setup(b) {
            b.onResolve(
              { filter: /^(@tanstack\/react-router|@anthropic-ai\/sdk|\.\.\/lib\/(speaking-security|sentry))$/ },
              (a) => ({ path: a.path, namespace: "stub" }),
            );
            b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
              contents:
                "export const createFileRoute=()=>x=>x;export default class Anthropic{};export const initSentry=()=>{};export const Sentry={};export const isStrictSameOrigin=()=>true;export const isSpeakingMissionLanguageEnabled=()=>true;export const enforceSpeakingPreAuthRateLimit=async()=>null;export const authenticateSpeakingRequest=async()=>null;export const enforceSpeakingRateLimit=async()=>null;export const hasSpeakingAgeAttestation=async()=>true;export const setSpeakingAgeAttestation=async()=>{};",
            }));
          },
        },
      ],
    });
    return await import(outfile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const prompt = (m, mission) =>
  m.missionSystemPrompt(mission, "English", "English", "man", null, null, [], []);

test("Master missions are B1 with the complication flag; their prompt carries the instruction", async () => {
  const m = await load();
  const missions = m.getAllSpeakingMissions().filter((mission) => mission.moduleId === "master-roofing");
  assert.ok(missions.length >= 20, "lesson missions exist for the Master module");
  for (const mission of missions) {
    assert.equal(mission.level, "B1", mission.id);
    assert.equal(mission.surpriseComplication, true, mission.id);
    // The learner-facing text never reveals the complication.
    const visible = JSON.stringify([
      mission.title,
      mission.summary,
      mission.objectives,
      mission.openingLine,
    ]);
    assert.doesNotMatch(visible, /complication|surprise|unannounced/i, mission.id);
    const system = prompt(m, mission);
    assert.match(system, /Surprise complication:/, mission.id);
    assert.match(system, /exactly ONE realistic complication/, mission.id);
    assert.match(system, /at B1-B2 level, in two to four sentences/, mission.id);
    assert.doesNotMatch(system, /in one or two short sentences/, mission.id);
  }
});

test("Master lesson missions drill every term and at least three phrases", async () => {
  const m = await load();
  const { MASTER_ROOFING_LESSONS } = await import("../src/data/master-roofing-curriculum.ts");
  const missions = m
    .getAllSpeakingMissions()
    .filter((mission) => mission.moduleId === "master-roofing" && mission.id.includes("_lesson_"))
    .filter((mission) => mission.language === "Spanish");
  assert.equal(missions.length, MASTER_ROOFING_LESSONS.length);
  for (const lesson of MASTER_ROOFING_LESSONS) {
    const mission = missions.find((x) => x.id.includes(`_lesson_${lesson.n}_`));
    const terms = lesson.words.filter((w) => w.kind === "term").length;
    const phrases = lesson.words.filter((w) => w.kind === "phrase");
    assert.ok(mission.vocabulary.length >= terms + 3, `lesson ${lesson.n}: ${mission.vocabulary.length}`);
    const included = phrases.filter((w) => mission.vocabulary.includes(w.es)).length;
    assert.ok(included >= 3, `lesson ${lesson.n}: ${included} phrases in mission vocabulary`);
  }
});

test("a Core 30 roofing mission keeps A2, no flag, and the original prompt wording", async () => {
  const m = await load();
  const roofing = m.getAllSpeakingMissions().filter((mission) => mission.moduleId === "roofing");
  assert.ok(roofing.length > 0);
  for (const mission of roofing) {
    assert.equal(mission.level, "A2", mission.id);
    assert.equal("surpriseComplication" in mission, false, mission.id);
    const system = prompt(m, mission);
    assert.doesNotMatch(system, /Surprise complication/, mission.id);
    assert.match(system, /at A2 level in one or two short sentences\./, mission.id);
  }
});
