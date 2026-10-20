// Built by TAC — 2026-10-20
// Every server reader of a Core 60 stage curriculum loads its own stage first
// (ensureStageForModule); src/start.ts reads no request body. The stage chunks only exist under a
// bundler, so each module is bundled with esbuild and `import.meta.glob` replaced by a loader map
// the tests control: the registry starts COLD, as it does on a fresh serverless instance.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { loadModule } from "./helpers/bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The shipped (Opus) stages listed in the manifest.
const STAGES = ["foundation-electrician", "foundation-nursing", "master-electrician", "master-nursing"];
// Every stage file on disk: the loader map offers them all, the registry asks for the listed.
const FILES = [...STAGES];
// A stage id that is in no manifest and has no file.
const UNLISTED = "master-plumbing";
const readStage = (id) =>
  JSON.parse(readFileSync(path.join(repoRoot, "src/data/core60/es", `${id}.json`), "utf8"));
const SERVER_ONLY = /^@tanstack\/react-start\/server-only$/;
const define = { "import.meta.glob": "globalThis.__core60Glob" };

/** Installs cold chunk loaders for the next bundle that loads; `calls` counts each chunk fetch. */
function coldLoaders(failures = {}) {
  const calls = {};
  const left = { ...failures };
  const loaders = {};
  for (const id of FILES) {
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
  return calls;
}

const entry = () =>
  loadModule("tests/helpers/core60-server-entry.ts", { stubs: [SERVER_ONLY], define });

const reference = (moduleId, lessonNumber = 1) => ({
  moduleId,
  lessonNumber,
  targetLanguage: "Spanish",
  instructionLanguage: "English",
  contentVersion: "unversioned-app-draft",
});

test("cold instance: a stage lesson does not resolve until its reader loads the stage", async () => {
  const calls = coldLoaders();
  const m = await entry();
  const ref = reference("foundation-electrician");
  assert.equal(m.resolveTutorLesson(ref), null, "the stage is not loaded yet: this was the 400");
  assert.equal(m.getCurriculum("foundation-electrician"), null);
  await m.ensureStageForModule("foundation-electrician");
  const lesson = m.resolveTutorLesson(ref);
  assert.equal(lesson?.lessonNumber, 1);
  assert.equal(lesson.moduleId, "foundation-electrician");
  assert.deepEqual(calls, { "foundation-electrician": 1 }, "only the requested stage loaded");
});

test("/api/tutor: a Foundation or Master lesson parses on a cold instance", async () => {
  for (const moduleId of ["foundation-electrician", "foundation-nursing"]) {
    const calls = coldLoaders();
    const { parseTutorRequest } = await loadModule("src/routes/api.tutor.ts", {
      stubs: [/^@anthropic-ai\/sdk$/, /^@tanstack\/react-router$/, /lib\/sentry$/],
      define,
    });
    const body = (lesson, language = "Spanish") => ({
      messages: [{ role: "user", content: "Help me with this lesson" }],
      context: { language, nativeLanguage: "English", level: "A1", lesson },
    });
    const parsed = await parseTutorRequest(body(reference(moduleId, 2)));
    assert.equal(parsed.context.lesson.moduleId, moduleId);
    assert.deepEqual(Object.keys(calls), [moduleId], "only the lesson's own stage loaded");
    // The validation is intact: a wrong language or lesson number still asks to reopen the lesson.
    await assert.rejects(parseTutorRequest(body(reference(moduleId, 2), "Italian")), {
      message: "Reopen the lesson in your selected language before using Tutor.",
    });
    await assert.rejects(parseTutorRequest(body(reference(moduleId, 55))), {
      message: "Reopen the lesson in your selected language before using Tutor.",
    });
  }
});

test("/api/tutor: a Core 30 lesson or a request with no lesson loads no stage", async () => {
  const calls = coldLoaders();
  const { parseTutorRequest } = await loadModule("src/routes/api.tutor.ts", {
    stubs: [/^@anthropic-ai\/sdk$/, /^@tanstack\/react-router$/, /lib\/sentry$/],
    define,
  });
  const messages = [{ role: "user", content: "hello" }];
  await parseTutorRequest({ messages, context: { language: "Spanish", level: "A1" } });
  await parseTutorRequest({
    messages,
    context: {
      language: "Spanish",
      nativeLanguage: "English",
      level: "A1",
      lesson: reference("electrician", 3),
    },
  });
  assert.deepEqual(calls, {}, "nothing was fetched");
});

test("a stage module's lesson review snapshot and release readiness load the stage first", async () => {
  coldLoaders();
  const m = await loadModule("tests/helpers/core60-server-entry.ts", {
    stubs: [SERVER_ONLY],
    define,
  });
  const snapshot = await m.loadCurrentLessonReviewSnapshot("foundation-electrician", "Spanish", "English");
  assert.ok(snapshot, "cold: the snapshot of a stage lesson exists");
  assert.equal(snapshot.lessons.length, 10);
  const { lessonReleaseReadiness } = await loadModule("src/lib/assessments/release-readiness.ts", {
    stubs: [SERVER_ONLY],
    define,
  });
  const readiness = await lessonReleaseReadiness(
    {
      module_id: "foundation-electrician",
      target_language: "Spanish",
      instruction_language: "English",
      status: "draft",
      lesson_manifest: null,
    },
    null,
  );
  // Foundation has 10 lessons: 20 of the 30 a full release needs are missing, not all 30.
  assert.equal(readiness.coverage.missingLessonNumbers.length, 20);
  assert.equal(readiness.coverage.lessonsWithWords, 10);
});

test("Speak catalog counts are the same before and after the stage chunks load", async () => {
  const calls = coldLoaders();
  const m = await entry();
  const count = (id, language = "Spanish") =>
    m.speakingCatalogMissionCount(m.getSpeakingMissions(language), id, language);
  const rawListed = (id) =>
    m.getSpeakingMissions("Spanish").filter((mission) => mission.moduleId === id).length;
  const bases = ["electrician", "nursing", "roofing", "plumber"];
  const cold = Object.fromEntries(bases.map((id) => [id, count(id)]));
  const listedCold = rawListed("electrician");
  assert.deepEqual(calls, {}, "counting loads nothing");

  // Half loaded: only one trade's Foundation.
  await m.ensureStageForModule("foundation-electrician");
  assert.equal(count("electrician"), cold.electrician, "a partly loaded base keeps its count");

  await m.ensureStagesForModules(STAGES);
  for (const id of bases) assert.equal(count(id), cold[id], `${id}: count after load`);
  // The test is not vacuous: before loading, the listed missions alone were 30 short per trade.
  const loaded = m.getSpeakingMissions("Spanish");
  const listedWarm = loaded.filter((mission) => mission.moduleId === "electrician").length;
  assert.equal(listedWarm, listedCold, "the base module's own missions did not change");
  for (const id of ["electrician", "nursing"]) {
    const stageLessonMissions = loaded.filter(
      (mission) => /_lesson_\d+_es_v1$/.test(mission.id) && mission.moduleId.endsWith(`-${id}`),
    ).length;
    assert.equal(stageLessonMissions, 30, `${id}: 10 Foundation + 20 Master lesson missions`);
  }
  // Stage modules are Spanish only: other languages never get a pending count.
  assert.equal(count("electrician", "Italian"), m.getSpeakingMissions("Italian").filter(
    (mission) => mission.moduleId === "electrician").length);
});

test("a stage that failed to load still counts in its card; the retry changes nothing", async () => {
  const calls = coldLoaders({ "foundation-nursing": 1 });
  const m = await entry();
  const count = () => m.speakingCatalogMissionCount(m.getSpeakingMissions("Spanish"), "nursing", "Spanish");
  const before = count();
  await m.ensureStagesForModules(["foundation-nursing"]);
  assert.equal(m.stageCurriculumStatus("foundation-nursing"), "unavailable");
  assert.equal(count(), before, "the failed Foundation still counts as pending: the cold total");
  const realNow = Date.now;
  Date.now = () => realNow() + 5_000;
  try {
    await m.ensureStageForModule("foundation-nursing");
  } finally {
    Date.now = realNow;
  }
  assert.equal(calls["foundation-nursing"], 2);
  assert.equal(count(), before);
});

test("/api/tutor: a stage whose chunk failed to load is 503 try-again, not a reopen-the-lesson 400", async () => {
  const calls = coldLoaders({ "foundation-electrician": 1 });
  const { parseTutorRequest } = await loadModule("src/routes/api.tutor.ts", {
    stubs: [/^@anthropic-ai\/sdk$/, /^@tanstack\/react-router$/, /lib\/sentry$/],
    define,
  });
  const body = (moduleId) => ({
    messages: [{ role: "user", content: "Help me with this lesson" }],
    context: { language: "Spanish", nativeLanguage: "English", level: "A1", lesson: reference(moduleId, 2) },
  });
  const unavailable = { message: /temporarily unavailable/, status: 503 };
  await assert.rejects(parseTutorRequest(body("foundation-electrician")), unavailable);
  // Inside the backoff window the stage is not fetched again, and it is still 503 (not a 400).
  await assert.rejects(parseTutorRequest(body("foundation-electrician")), unavailable);
  assert.equal(calls["foundation-electrician"], 1, "backoff: one fetch");
  // A lesson of a stage that loaded fine, or a stage that was never listed, is unaffected.
  const ok = await parseTutorRequest(body("foundation-nursing"));
  assert.equal(ok.context.lesson.moduleId, "foundation-nursing");
  await assert.rejects(parseTutorRequest(body(UNLISTED)), {
    message: "Reopen the lesson in your selected language before using Tutor.",
    status: 400,
  });
  // After the backoff the retry succeeds and the same request parses.
  const realNow = Date.now;
  Date.now = () => realNow() + 5_000;
  try {
    const parsed = await parseTutorRequest(body("foundation-electrician"));
    assert.equal(parsed.context.lesson.moduleId, "foundation-electrician");
  } finally {
    Date.now = realNow;
  }
  assert.equal(calls["foundation-electrician"], 2);
});

// ─── readinessCatalog is the same on a cold and a loaded instance ────────────

/** A db that returns the given release rows and nothing else. */
function releaseDb(moduleIds) {
  const releases = moduleIds.map((module_id) => ({
    id: `release-${module_id}`,
    module_id,
    target_language: "Spanish",
    instruction_language: "English",
    status: "draft",
    lesson_manifest: null,
    review_records: [],
    verified_at: null,
    created_at: "2026-10-20T00:00:00Z",
  }));
  const query = (table) => {
    const q = {
      select: () => q,
      is: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      then: (resolve, reject) =>
        Promise.resolve({ data: table === "assessment_releases" ? releases : [], error: null }).then(
          resolve,
          reject,
        ),
    };
    return q;
  };
  return { from: query, rpc: async () => ({ data: [], error: null }) };
}

test("readinessCatalog lists a stage module only through its release row, loaded or not", async () => {
  const ids = (catalog) => catalog.map((track) => track.moduleId);
  const isDataStage = (id) => STAGES.includes(id);

  // No release row for any stage: cold and loaded instances list the same modules, no stage among them.
  coldLoaders();
  const withoutRow = await entry();
  const cold = ids(await withoutRow.readinessCatalog(releaseDb(["roofing"]), "Spanish", "English"));
  await withoutRow.ensureStagesForModules(STAGES);
  assert.ok(withoutRow.getCurriculum("foundation-electrician"), "the stage is loaded now");
  const loaded = ids(await withoutRow.readinessCatalog(releaseDb(["roofing"]), "Spanish", "English"));
  assert.deepEqual(loaded, cold, "loading a stage elsewhere does not add it to the list");
  assert.ok(cold.includes("roofing") && cold.includes("electrician"), "Core 30 modules are listed");
  assert.deepEqual(cold.filter(isDataStage), [], "a stage without a release row is not listed");

  // With a release row the stage is listed, on a cold instance (the catalog loads it) and a loaded one.
  coldLoaders();
  const withRow = await entry();
  const rows = ["roofing", "foundation-electrician"];
  const coldRow = ids(await withRow.readinessCatalog(releaseDb(rows), "Spanish", "English"));
  assert.deepEqual(coldRow.filter(isDataStage), ["foundation-electrician"]);
  coldLoaders();
  const warmRow = await entry();
  await warmRow.ensureStagesForModules(STAGES);
  const loadedRow = ids(await warmRow.readinessCatalog(releaseDb(rows), "Spanish", "English"));
  assert.deepEqual(loadedRow, coldRow, "cold and loaded instances return the same list");
  assert.deepEqual(
    coldRow.filter((id) => !isDataStage(id)),
    cold,
    "the release row adds only its own stage",
  );
});

// ─── src/start.ts never reads a request body ────────────────────────────────

async function startMiddleware() {
  const outfile = path.join(repoRoot, "node_modules", ".cache", "lle-tests", `start-${process.pid}.mjs`);
  const virtual = {
    "@tanstack/react-start": `
      export const createMiddleware = () => ({ server: (fn) => ({ fn }) });
      export const createCsrfMiddleware = () => ({ csrf: true });
      export const createStart = (factory) => factory;`,
    "@tanstack/react-start/server": "export const getResponseHeader = () => undefined;",
  };
  await build({
    entryPoints: [path.join(repoRoot, "src/start.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    logLevel: "silent",
    plugins: [
      {
        name: "virtual-start",
        setup(b) {
          b.onResolve({ filter: /^@tanstack\/react-start(\/server)?$/ }, (args) => ({
            path: args.path,
            namespace: "virtual-start",
          }));
          b.onLoad({ filter: /.*/, namespace: "virtual-start" }, (args) => ({
            contents: virtual[args.path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const { startInstance } = await import(`file://${outfile}?${Date.now()}`);
  return startInstance().requestMiddleware.filter((middleware) => typeof middleware.fn === "function");
}

test("src/start.ts middleware never touches the request body, with or without Content-Length", async () => {
  const middleware = await startMiddleware();
  assert.ok(middleware.length >= 1);
  const forbidden = (name) => () => {
    throw new Error(`middleware touched request.${name}`);
  };
  for (const handlerType of ["serverFn", "router"]) {
    for (const headers of [{}, { "content-length": "999999999" }, { "content-length": "10" }]) {
      // 1. A request object whose every body accessor throws.
      const guarded = {
        url: "https://app.example/_serverFn/abc?payload=master-electrician",
        method: "POST",
        headers: new Headers(headers),
        signal: new AbortController().signal,
        get body() {
          throw new Error("middleware touched request.body");
        },
        get bodyUsed() {
          throw new Error("middleware touched request.bodyUsed");
        },
        clone: forbidden("clone"),
        text: forbidden("text"),
        json: forbidden("json"),
        arrayBuffer: forbidden("arrayBuffer"),
        blob: forbidden("blob"),
        formData: forbidden("formData"),
      };
      // 2. A real streaming request with no length: nothing may pull from it.
      let pulls = 0;
      const stream = new ReadableStream(
        { pull: (controller) => (pulls += 1, controller.enqueue(new Uint8Array(65536))) },
        { highWaterMark: 0 },
      );
      const streaming = new Request("https://app.example/_serverFn/abc", {
        method: "POST",
        headers,
        body: stream,
        duplex: "half",
      });
      const bodyBefore = streaming.body;
      for (const request of [guarded, streaming]) {
        for (const { fn } of middleware) {
          const result = await fn({
            handlerType,
            request,
            next: async () => ({ request, response: new Response("ok") }),
          });
          assert.ok(result, "the chain still produces a response");
        }
      }
      assert.equal(pulls, 0, "no byte of the body was read");
      assert.equal(streaming.body, bodyBefore, "the request was not cloned");
      assert.equal(streaming.bodyUsed, false);
    }
  }
});

test("src/start.ts carries no stage loading and no body access at all", () => {
  const source = readFileSync(path.join(repoRoot, "src/start.ts"), "utf8").replace(/\/\/.*$/gm, "");
  for (const needle of [
    "core60-stages",
    "stageLoadPlan",
    "request.clone",
    "request.text",
    "request.json",
    "request.arrayBuffer",
    "request.formData",
    "request.blob",
    "request.body",
    "content-length",
  ])
    assert.equal(source.includes(needle), false, needle);
});

// ─── every server reader loads its own stage ────────────────────────────────

function sourceFiles(dir) {
  return readdirSync(path.join(repoRoot, dir)).flatMap((name) => {
    const relative = `${dir}/${name}`;
    return statSync(path.join(repoRoot, relative)).isDirectory()
      ? sourceFiles(relative)
      : /\.(ts|tsx)$/.test(name)
        ? [relative]
        : [];
  });
}

test("every server file that reads a curriculum loads the stage first", () => {
  const READS = /\b(getCurriculum|getLessonDefinition|resolveTutorLesson|findSpeakingMission|getSpeakingMissions|currentLessonReviewSnapshot|lessonSourceCoverage)\(/;
  const LOADS = /\b(ensureStageForModule|ensureStagesForModules|ensureStageCurriculum|loadCurrentLessonReviewSnapshot)\b/;
  // Server surfaces: API routes, server functions, and server-only libraries.
  const server = sourceFiles("src").filter((file) => {
    if (/^src\/routes\/api\./.test(file) || /^src\/fns\/.*\.functions\.ts$/.test(file)) return true;
    if (!file.startsWith("src/lib/")) return false;
    return readFileSync(path.join(repoRoot, file), "utf8").includes("@tanstack/react-start/server-only");
  });
  assert.ok(server.length > 40, "the scan found the server files");
  const unloaded = server.filter((file) => {
    const text = readFileSync(path.join(repoRoot, file), "utf8");
    return READS.test(text) && !LOADS.test(text);
  });
  assert.deepEqual(unloaded, [], "these server files read a curriculum without loading its stage");
});
