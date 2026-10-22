// Built by TAC — 2026-10-20
// How the Core 60 stage registry (src/data/core60-stages.ts) loads stage chunks on demand:
//   - server: only the stage a request needs, cached, a failed load retried after a short backoff;
//   - client: a failed chunk is "unavailable" and the Retry button loads it again at once;
//   - which code waits for which stages: only the reader that needs one calls ensureStageForModule
//     (there is no middleware and no request-body scan; see tests/core60-server-readers.test.mjs).
// The bundled-chunk path (import.meta.glob) only exists under a bundler, so the registry is built
// with esbuild here and `import.meta.glob` is replaced by a loader map the tests control.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(repoRoot, "node_modules", ".cache", "lle-tests");
mkdirSync(outRoot, { recursive: true });
const outDir = mkdtempSync(path.join(outRoot, "stage-loading-"));
const outfile = path.join(outDir, "core60-stages.mjs");
await build({
  entryPoints: [path.join(repoRoot, "src/data/core60-stages.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  logLevel: "silent",
  define: { "import.meta.glob": "globalThis.__core60Glob" },
});
test.after(() => rmSync(outDir, { recursive: true, force: true }));

const readStage = (id) =>
  JSON.parse(readFileSync(path.join(repoRoot, "src/data/core60/es", `${id}.json`), "utf8"));

let instance = 0;
/**
 * A fresh registry whose chunk loaders count their calls. `failures[id]` = how many times that
 * file's chunk fails before it loads.
 */
async function freshRegistry(failures = {}) {
  const calls = {};
  const left = { ...failures };
  const loaders = {};
  for (const id of ["foundation-electrician", "master-electrician", "foundation-nursing", "master-nursing"]) {
    loaders[`./core60/es/${id}.json`] = async () => {
      calls[id] = (calls[id] ?? 0) + 1;
      await Promise.resolve();
      if (left[id] > 0) {
        left[id] -= 1;
        throw new Error("Failed to fetch dynamically imported module");
      }
      return readStage(id);
    };
  }
  globalThis.__core60Glob = () => loaders;
  const registry = await import(`${pathToFileURL(outfile).href}?instance=${(instance += 1)}`);
  return { registry, calls };
}

test("the server loads only the stage a request needs, once, and caches it", async () => {
  const { registry, calls } = await freshRegistry();
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "loading");
  const [a, b] = await Promise.all([
    registry.ensureStageCurriculum("foundation-electrician"),
    registry.ensureStageCurriculum("foundation-electrician"),
  ]);
  assert.equal(a, b, "concurrent requests share one load");
  assert.equal(a.lessons.length, 10);
  assert.deepEqual(calls, { "foundation-electrician": 1 }, "no other stage was loaded");
  assert.equal(registry.stageCurriculum("foundation-electrician"), a);
  await registry.ensureStageCurriculum("foundation-electrician");
  assert.equal(calls["foundation-electrician"], 1, "cached");
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "ready");
  assert.equal(registry.stageCurriculumStatus("foundation-nursing"), "loading", "untouched stages stay unloaded");
  // Not a data-driven stage: nothing to load.
  assert.equal(await registry.ensureStageCurriculum("roofing"), null);
  assert.deepEqual(Object.keys(calls), ["foundation-electrician"]);
});

test("a stage that fails once is retried by a later request after the backoff, not left failed", async () => {
  const { registry, calls } = await freshRegistry({ "foundation-electrician": 1 });
  let clock = 1_000;
  const now = () => clock;
  assert.equal(await registry.ensureStageCurriculum("foundation-electrician", { now }), null);
  assert.equal(calls["foundation-electrician"], 1);
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "unavailable");
  assert.equal(registry.stageLoadFailed("foundation-electrician"), true, "a failed chunk is transient");
  // Inside the backoff window another request does not hit the failing chunk again...
  clock += registry.STAGE_RETRY_BACKOFF_MS - 1;
  assert.equal(await registry.ensureStageCurriculum("foundation-electrician", { now }), null);
  assert.equal(calls["foundation-electrician"], 1, "backoff: no second attempt yet");
  // ...and once it has passed, the next request retries and the stage is there for good.
  clock += 1;
  const curriculum = await registry.ensureStageCurriculum("foundation-electrician", { now });
  assert.equal(calls["foundation-electrician"], 2);
  assert.equal(curriculum.lessons.length, 10);
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "ready");
  assert.equal(registry.stageLoadFailed("foundation-electrician"), false, "loaded: no longer failed");
  assert.equal(registry.stageCurriculum("foundation-electrician"), curriculum);
});

test("the client Retry loads a failed stage at once, with no backoff", async () => {
  const { registry, calls } = await freshRegistry({ "foundation-electrician": 1 });
  const seen = [];
  const unsubscribe = registry.subscribeStageCurricula(() =>
    seen.push(registry.stageCurriculumStatus("foundation-electrician")),
  );
  assert.equal(await registry.loadStageCurriculum("foundation-electrician"), null);
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "unavailable");
  const retry = registry.retryStageCurriculum("foundation-electrician");
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "loading", "the page shows loading while it retries");
  const curriculum = await retry;
  unsubscribe();
  assert.equal(curriculum.lessons.length, 10);
  assert.equal(calls["foundation-electrician"], 2);
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "ready");
  assert.deepEqual(seen, ["unavailable", "loading", "ready"]);
  // Retrying a stage that has loaded changes nothing.
  assert.equal(await registry.retryStageCurriculum("foundation-electrician"), curriculum);
  assert.equal(calls["foundation-electrician"], 2);
});

test("loading several modules' stages is not remembered when one fails", async () => {
  const { registry, calls } = await freshRegistry({ "foundation-nursing": 1 });
  const ids = ["foundation-nursing", "foundation-nursing", "electrician", "foundation-roofing"];
  await registry.ensureStagesForModules(ids);
  assert.equal(registry.stageCurriculumStatus("foundation-nursing"), "unavailable");
  assert.equal(registry.stageLoadFailed("foundation-nursing"), true);
  assert.equal(registry.stageCurriculumStatus("foundation-electrician"), "loading", "ids not named are not loaded");
  await registry.ensureStagesForModules(ids);
  assert.equal(calls["foundation-nursing"], 1, "still inside the backoff window");
  const realNow = Date.now;
  Date.now = () => realNow() + registry.STAGE_RETRY_BACKOFF_MS + 1;
  try {
    await registry.ensureStagesForModules(ids);
  } finally {
    Date.now = realNow;
  }
  assert.equal(calls["foundation-nursing"], 2, "the next request retried the failed stage");
  assert.equal(registry.stageCurriculumStatus("foundation-nursing"), "ready");
  assert.deepEqual(
    calls,
    { "foundation-nursing": 2 },
    "duplicates, the Core 30 id and an unlisted stage loaded nothing extra",
  );
});

test("a stage that is not listed, or has no usable file, is never reported as a transient failure", async () => {
  const { registry } = await freshRegistry();
  for (const id of ["master-not-a-module", "foundation-roofing", "electrician", "master-roofing", "", null, undefined])
    assert.equal(registry.stageLoadFailed(id), false, String(id));
  // Listed and still loading (nothing has failed): false too.
  assert.equal(registry.stageLoadFailed("foundation-electrician"), false);
});

test("a scenario id names the stage to load; other scenarios name none", async () => {
  const { registry } = await freshRegistry();
  const { stageModuleIdOfScenario } = registry;
  assert.equal(
    stageModuleIdOfScenario("scenario_version_foundation-electrician_lesson_3_es_v1"),
    "foundation-electrician",
  );
  assert.equal(
    stageModuleIdOfScenario("scenario_version_foundation-nursing_challenge_2_es_v1"),
    "foundation-nursing",
  );
  assert.equal(
    stageModuleIdOfScenario("scenario_version_master-electrician_lesson_3_es_v1"),
    "master-electrician",
  );
  // Foundations and Masters that are listed name their stage too (plumber's pair is published and listed).
  assert.equal(
    stageModuleIdOfScenario("scenario_version_foundation-plumber_lesson_1_es_v1"),
    "foundation-plumber",
  );
  assert.equal(
    stageModuleIdOfScenario("scenario_version_master-plumber_lesson_3_es_v1"),
    "master-plumber",
  );
  // Core 30, roofing's hand-written stages, a stage no trade lists, curated, core and malformed ids.
  for (const id of [
    "scenario_version_electrician_lesson_3_es_v1",
    "scenario_version_master-roofing_lesson_3_es_v1",
    "scenario_version_master-not-a-module_lesson_3_es_v1",
    "scenario_version_foundation-roofing_lesson_1_es_v1",
    "scenario_version_construction_safety_briefing_es_v1",
    "scenario_version_core-speaking_verb_1_es_v1",
    "scenario_version_master-nursing_lesson_x_es_v1",
    "master-nursing_lesson_3_es_v1",
    "",
  ]) {
    assert.equal(stageModuleIdOfScenario(id), null, id);
  }
});

test("ensureStageForModule loads exactly the named stage and ignores every other id", async () => {
  const { registry, calls } = await freshRegistry();
  // Core 30 modules, roofing's hand-written stages, a stage no trade lists and arbitrary strings: no load.
  for (const id of ["electrician", "master-roofing", "foundation-roofing", "master-not-a-module", "../../etc/passwd", "", null, undefined]) {
    assert.equal(await registry.ensureStageForModule(id), null, String(id));
  }
  assert.deepEqual(calls, {});
  const curriculum = await registry.ensureStageForModule("foundation-nursing");
  assert.equal(curriculum.lessons.length, 10);
  assert.deepEqual(calls, { "foundation-nursing": 1 });
  assert.equal(registry.stageCurriculum("foundation-nursing"), curriculum);
});

test("the registry has no request-scanning API left", async () => {
  const { registry } = await freshRegistry();
  for (const name of ["stageLoadPlan", "applyStageLoadPlan", "stageModuleIdsIn", "preloadStageCurricula"])
    assert.equal(registry[name], undefined, name);
});

test("a base module knows its listed stage modules (the Speak catalog loads them when it opens)", async () => {
  const { registry } = await freshRegistry();
  assert.deepEqual(registry.stageModulesOfBase("electrician"), ["foundation-electrician", "master-electrician"]);
  assert.deepEqual(registry.stageModulesOfBase("nursing"), ["foundation-nursing", "master-nursing"]);
  // Plumber's Master is published and listed now, so it lists both (every listed trade has both stages).
  assert.deepEqual(registry.stageModulesOfBase("plumber"), ["foundation-plumber", "master-plumber"]);
  assert.deepEqual(registry.stageModulesOfBase("travel-breakfast"), ["foundation-travel-breakfast", "master-travel-breakfast"]);
  // Roofing's stages are hand-written (not data-driven), and a module with no stage has none.
  assert.deepEqual(registry.stageModulesOfBase("roofing"), []);
  assert.deepEqual(registry.stageModulesOfBase("not-a-module"), []);
});

test("Retry loads in the page when it can, and reloads the page when the browser keeps the failure", async () => {
  // The chunk comes back on the second try: loaded in place, no reload.
  const transient = await freshRegistry({ "foundation-electrician": 1 });
  assert.equal(await transient.registry.loadStageCurriculum("foundation-electrician"), null);
  let reloads = 0;
  assert.equal(await transient.registry.retryStageOrReload("foundation-electrician", () => (reloads += 1)), true);
  assert.equal(reloads, 0);
  assert.equal(transient.registry.stageCurriculumStatus("foundation-electrician"), "ready");

  // A browser caches a failed dynamic import for the whole document: every in-page retry fails.
  const cached = await freshRegistry({ "foundation-nursing": 99 });
  assert.equal(await cached.registry.loadStageCurriculum("foundation-nursing"), null);
  assert.equal(await cached.registry.retryStageOrReload("foundation-nursing", () => (reloads += 1)), false);
  assert.equal(reloads, 1, "the page is reloaded to fetch the chunk again");
  assert.equal(cached.registry.stageCurriculumStatus("foundation-nursing"), "unavailable");
});
