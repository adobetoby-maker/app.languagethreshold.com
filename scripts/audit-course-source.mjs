#!/usr/bin/env node
// Adapted from the module skill audit: published contextual vocabulary is validated
// separately from focused conjugation practice cards. Local, read-only source audit. Writes only an explicitly requested report path.
import { createRequire } from "node:module";
import {
  readFileSync,
  existsSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const value = (flag) => {
  const n = args.indexOf(flag);
  return n < 0 ? null : args[n + 1];
};
if (args.includes("--help")) {
  console.log(
    "node audit-module.mjs --repo /app/checkout (--module ID | --all) [--target LANGUAGE --native LANGUAGE] [--summary] [--output /report.json]",
  );
  process.exit(0);
}
if (!value("--repo") || (!value("--module") && !args.includes("--all")))
  throw new Error(
    "Supply --repo and either --module or --all; use --help for usage.",
  );
if (!!value("--target") !== !!value("--native"))
  throw new Error("Specify both --target and --native.");
const repo = realpathSync(resolve(value("--repo")));
if (!existsSync(join(repo, "src/data/modules.ts")))
  throw new Error("Not the Language Threshold app checkout.");
const require = createRequire(join(repo, "package.json"));
const { build } = require("esbuild");
const previousCwd = process.cwd();
process.chdir(repo); // The app's plain-Node stage loader resolves its source files from cwd.
try {
  const imports = {
    "src/data/modules.ts": ["MODULES", "moduleSupportsLearningPair"],
    "src/data/curriculum.ts": ["getCurriculum"],
    "src/data/speaking-missions.ts": ["getSpeakingMissions"],
    "src/lib/lesson-definition.ts": [
      "getLessonDefinition",
      "modulePracticeVersion",
    ],
    "src/lib/lesson-content-core.ts": [
      "contentLimitsFor",
      "validateLessonContent",
    ],
    "src/lib/authored-module-deck.ts": ["authoredModuleDeck"],
    "src/lib/offline-lesson-tracks.ts": ["offlineLessonPackId"],
    "src/data/module-starters.ts": ["getLessons"],
    "src/data/all-seeds.ts": ["ALL_SEEDS"],
  };
  const contents = Object.entries(imports)
    .map(
      ([path, names]) =>
        `export { ${names.join(",")} } from ${JSON.stringify(join(repo, path))};`,
    )
    .join("\n");
  const compiled = await build({
    stdin: { contents, resolveDir: repo, sourcefile: "module-audit-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    tsconfig: join(repo, "tsconfig.json"),
  });
  const app = await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled.outputFiles[0].contents).toString("base64")
  );
  const codes = {
    English: "en",
    Spanish: "es",
    French: "fr",
    German: "de",
    Italian: "it",
    Japanese: "ja",
    Chinese: "zh",
    Korean: "ko",
    Portuguese: "pt",
    Pashto: "ps",
  };
  const fileCache = new Map(),
    missionCache = new Map();
  const seeds = new Map(app.ALL_SEEDS.map((seed) => [seed.id, seed]));
  const getFile = (module, target, native, section = "lesson-content") => {
    const file = join(
      repo,
      `public/${section}/${codes[target] ?? target}/${module}.json`,
    );
    if (!fileCache.has(file))
      fileCache.set(
        file,
        existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null,
      );
    const raw = fileCache.get(file);
    return raw?.module === module &&
      raw.language === target &&
      raw.nativeLanguage === native
      ? raw
      : null;
  };
  const sourcePair = (m, target, native) =>
    app.moduleSupportsLearningPair(m, target, native);
  const checkStage = (id, expected, target, native) => {
    const module = app.MODULES.find((m) => m.id === id);
    const curriculum = module ? app.getCurriculum(id) : null;
    const raw = getFile(id, target, native),
      deckFile = getFile(id, target, native, "lesson-decks"),
      lessonNumbers = new Set((curriculum?.lessons ?? []).map((l) => l.n));
    const counts = {
      validAuthoredLessons: 0,
      vocabulary: 0,
      alignedReadings: 0,
      verbs: 0,
      mappedTeaching: 0,
      mappedReadings: 0,
      speakingCards: 0,
      fullReaderPassages: 0,
    };
    const gaps = [];
    const supported = !!module && sourcePair(module, target, native);
    if (!module) gaps.push("Module is not registered.");
    else if (!supported)
      gaps.push("Exact target/native pair is not catalog-supported.");
    if (!missionCache.has(target))
      missionCache.set(target, app.getSpeakingMissions(target));
    const missions = missionCache.get(target).filter((m) => m.moduleId === id);
    const registeredReaders = app.getLessons(id, target);
    const readerSources = registeredReaders
      .map((readerId) => seeds.get(readerId))
      .filter(
        (seed) =>
          seed?.language === target &&
          (seed.nativeLanguage
            ? seed.nativeLanguage === native
            : native === (target === "English" ? "Spanish" : "English")) &&
          seed.sentences?.length &&
          seed.sentences.every((s) => s.target?.trim() && s.en?.trim()),
      );
    counts.fullReaderPassages = readerSources.length;
    for (let n = 1; n <= expected; n++) {
      const d = supported
        ? app.getLessonDefinition({
            moduleId: id,
            lessonNumber: n,
            targetLanguage: target,
            instructionLanguage: native,
            contentVersion: app.modulePracticeVersion(id, target, native),
          })
        : null;
      const content = raw?.lessons?.[n];
      const words = content?.words?.length
        ? content.words
        : (d?.words?.length ? d.words : deckFile?.lessons?.[n]);
      const passage = d?.reading
        ? {
            title: d.reading.title,
            target: d.reading.sentences.map((s) => s.target),
            native: d.reading.sentences.map((s) => s.native),
          }
        : content?.passage;
      const verbs = content?.verbs;
      if (words?.length) counts.vocabulary++;
      if (
        passage?.target?.length &&
        passage.target.length === passage.native?.length &&
        passage.target.every((s, i) => s?.trim() && passage.native[i]?.trim())
      )
        counts.alignedReadings++;
      if (verbs?.length) counts.verbs++;
      if (d?.teaching && d?.modes?.length === 6) counts.mappedTeaching++;
      if (d?.reading?.sentences.length) counts.mappedReadings++;
      if (missions.some((m) => m.sourceObjectiveId === `${id}.lesson.${n}`))
        counts.speakingCards++;
      const errors = app.validateLessonContent(
        { words, passage, verbs },
        {
          language: target,
          nativeLanguage: native,
          parts: { words: true, passage: true, verbs: true },
          limits: app.contentLimitsFor(id),
        },
      );
      if (supported && lessonNumbers.has(n) && errors.length === 0)
        counts.validAuthoredLessons++;
      else
        gaps.push({
          lesson: n,
          issues: [
            ...(!lessonNumbers.has(n) ? ["Missing curriculum lesson."] : []),
            ...errors,
          ],
        });
    }
    const deck = supported ? app.authoredModuleDeck(id, target, native) : null;
    if (counts.mappedTeaching < expected)
      gaps.push(
        `Teaching settings mapped for ${counts.mappedTeaching}/${expected} lessons.`,
      );
    if (counts.mappedReadings < expected)
      gaps.push(
        `Shared reading definitions mapped for ${counts.mappedReadings}/${expected} lessons.`,
      );
    if (counts.speakingCards < expected)
      gaps.push(
        `Lesson-linked speaking cards found for ${counts.speakingCards}/${expected} lessons.`,
      );
    if (counts.fullReaderPassages < expected)
      gaps.push(
        `Full Reader has ${counts.fullReaderPassages} registered aligned passages for ${expected} lessons; check exact lesson ownership.`,
      );
    if (!deck)
      gaps.push(
        "No complete authored module deck is exposed by the shared deck builder.",
      );
    return {
      moduleId: id,
      expectedLessons: expected,
      curriculumLessons: curriculum?.lessons.length ?? 0,
      supported,
      counts,
      authoredModuleDeck: !!deck,
      deckPairs: deck?.pairs.length ?? 0,
      offlinePackRegistration: app.offlineLessonPackId(id, target, native),
      publicFileReviewFlag: raw?.reviewed ?? null,
      authoredComplete: counts.validAuthoredLessons === expected,
      mappedComplete:
        counts.validAuthoredLessons === expected &&
        counts.mappedTeaching === expected &&
        counts.mappedReadings === expected &&
        counts.speakingCards === expected &&
        counts.fullReaderPassages >= expected &&
        !!deck,
      gaps,
    };
  };
  const baseModules = app.MODULES.filter(
    (m) => !m.id.startsWith("foundation-") && !m.id.startsWith("master-"),
  );
  const wanted = value("--module");
  const selected = wanted
    ? baseModules.filter((m) => m.id === wanted)
    : baseModules;
  if (!selected.length)
    throw new Error(
      `Unknown base module: ${wanted}. Supply its base ID, without foundation-/master-.`,
    );
  const tracks = [];
  for (const module of selected) {
    const candidates = value("--target")
      ? [[value("--target"), value("--native")]]
      : module.learnDirection === "en-target"
        ? (module.nativeLanguages ?? ["Spanish"]).map((native) => [
            "English",
            native,
          ])
        : [
            ...Object.keys(codes)
              .filter((target) => target !== "English")
              .map((target) => [target, "English"]),
            ["English", "Spanish"],
          ].filter(([target, native]) => sourcePair(module, target, native));
    for (const [target, native] of candidates) {
      const stages = [
        checkStage(`foundation-${module.id}`, 10, target, native),
        checkStage(module.id, 30, target, native),
        checkStage(`master-${module.id}`, 20, target, native),
      ];
      const total = stages.reduce(
        (n, s) => n + s.counts.validAuthoredLessons,
        0,
      );
      const hasAuthoredMaterials = stages.some(
        (s) =>
          s.counts.vocabulary ||
          s.counts.alignedReadings ||
          s.counts.verbs ||
          s.counts.fullReaderPassages,
      );
      const state = stages.every((s) => s.mappedComplete)
        ? "mapped-60-draft"
        : stages.every((s) => s.authoredComplete)
          ? "authored-60-draft"
          : hasAuthoredMaterials
            ? "partial-authored"
            : "catalog-only";
      tracks.push({
        moduleId: module.id,
        name: module.name,
        targetLanguage: target,
        nativeLanguage: native,
        catalogSupported: sourcePair(module, target, native),
        state,
        hasAuthoredMaterials,
        validAuthoredLessons: total,
        stages,
      });
    }
  }
  const pairSummary = [];
  for (const key of [
    ...new Set(
      tracks.map((t) => JSON.stringify([t.targetLanguage, t.nativeLanguage])),
    ),
  ]) {
    const [target, native] = JSON.parse(key),
      group = tracks.filter(
        (t) => t.targetLanguage === target && t.nativeLanguage === native,
      );
    pairSummary.push({
      targetLanguage: target,
      nativeLanguage: native,
      catalogModules: group.filter((t) => t.catalogSupported).length,
      modulesWithAuthoredMaterials: group.filter((t) => t.hasAuthoredMaterials)
        .length,
      modulesWithValidatedLessons: group.filter(
        (t) => t.validAuthoredLessons > 0,
      ).length,
      authored60: group.filter((t) => t.validAuthoredLessons === 60).length,
      mapped60: group.filter((t) => t.state === "mapped-60-draft").length,
      authored60Modules: group
        .filter((t) => t.validAuthoredLessons === 60)
        .map((t) => t.moduleId),
      mapped60Modules: group
        .filter((t) => t.state === "mapped-60-draft")
        .map((t) => t.moduleId),
    });
  }
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
  const report = {
    schema: 1,
    auditedAt: new Date().toISOString(),
    repository: repo,
    revision,
    baseModuleCount: selected.length,
    scope:
      "Read-only source coverage. Not human review, production verification, speech quality, or installed offline readiness.",
    pairSummary,
    ...(args.includes("--summary") ? {} : { tracks }),
  };
  const encoded = JSON.stringify(report, null, 2) + "\n";
  if (value("--output")) {
    const destination = resolve(previousCwd, value("--output"));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, encoded);
    console.log(
      `Saved ${tracks.length} exact-pair source audits to ${destination}`,
    );
  } else process.stdout.write(encoded);
} finally {
  process.chdir(previousCwd);
}
