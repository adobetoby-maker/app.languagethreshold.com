#!/usr/bin/env node
// Compare authored lesson material for the exact Spanish/French/Japanese 101 pairs.
// Counts are inventory evidence, never a quality, review, or release verdict.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const arg = (name) => {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : process.argv[at + 1];
};
const frenchRoot = resolve(arg("--french-root") ?? root);
const frenchFormsRoot = resolve(arg("--french-forms-root") ?? frenchRoot);
const japaneseFormsRoot = resolve(arg("--japanese-forms-root") ?? root);
const output = arg("--output");
const read = (base, path) => JSON.parse(readFileSync(resolve(base, path), "utf8"));
const readTracked = (base, path) => JSON.parse(execFileSync("git", ["show", `HEAD:${path}`], { cwd: base, encoding: "utf8" }));
const revision = (base) => execFileSync("git", ["rev-parse", "HEAD"], { cwd: base, encoding: "utf8" }).trim();
const stageNames = ["foundation", "core", "master"];
const stageLengths = { foundation: 10, core: 30, master: 20 };
const stagePrefix = { foundation: "foundation-", core: "", master: "master-" };
const modeNames = ["see", "recall", "hear", "type", "say", "write"];
const frenchPath = (stage) => `content/french-basics/private-runtime-${stage}-1-${stageLengths[stage]}.json`;
const lessonPath = (language, stage) =>
  `public/lesson-content/${language}/${stagePrefix[stage]}${language === "es" ? "spanish" : "japanese"}-basics.json`;
const lineCount = (passage) => passage?.target?.length ?? passage?.sentences?.length ?? 0;
const frenchLineCount = (support) => support.reader?.sentences?.length ?? support.reader?.target?.length ?? 0;
const cell = (value) => String(value ?? "—").replaceAll("|", "\\|");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const formPrompts = (base, language, pair) => {
  const directory = resolve(base, `content/${language}-basics`);
  const names = readdirSync(directory).filter((name) => /^private-form-practice-(?:foundation|core|master)-\d+-\d+-(?:fr|ja)-en\.json$/.test(name));
  const byLesson = { foundation: new Map(), core: new Map(), master: new Map() };
  for (const name of names) {
    const stage = name.split("-")[3];
    const fixture = read(base, `content/${language}-basics/${name}`);
    if (fixture.pairKey !== pair || fixture.registered !== false || fixture.reviewed !== false)
      throw new Error(`${name}: pair or review gate changed`);
    const sourceCandidates = [resolve(base, fixture.sourceFile), resolve(directory, fixture.sourceFile)];
    const source = sourceCandidates.find(existsSync);
    if (!source || sha256(source) !== fixture.sourceSha256) throw new Error(`${name}: source SHA-256 mismatch`);
    for (const lesson of fixture.lessons) {
      const number = lesson.lesson;
      if (byLesson[stage].has(number) || number < 1 || number > stageLengths[stage])
        throw new Error(`${name}: duplicate or invalid ${stage} lesson ${number}`);
      if (!Array.isArray(lesson.prompts) || lesson.prompts.length === 0 || lesson.reviewed !== false)
        throw new Error(`${name}: empty or reviewed prompt set for ${stage} ${number}`);
      for (const prompt of lesson.prompts) {
        if (prompt.reviewed !== false || !prompt.id || !prompt.englishPrompt || !(prompt.frenchAnswer || prompt.japaneseAnswer))
          throw new Error(`${name}: incomplete form prompt for ${stage} ${number}`);
      }
      byLesson[stage].set(number, lesson.prompts.length);
    }
  }
  for (const stage of stageNames) if (byLesson[stage].size !== stageLengths[stage])
    throw new Error(`${language}: expected ${stageLengths[stage]} ${stage} form lessons; got ${byLesson[stage].size}`);
  return { byLesson, names };
};
const frenchForms = formPrompts(frenchFormsRoot, "french", "French:English");
const japaneseForms = formPrompts(japaneseFormsRoot, "japanese", "Japanese:English");
const frenchModeDirectory = resolve(frenchFormsRoot, "content/french-basics");
const frenchModeFiles = readdirSync(frenchModeDirectory).filter((name) => /^private-foundation-\d+-\d+-mode-prompts-fr-en\.json$/.test(name));
const frenchModeLessons = new Set();
let frenchAuthoredModePrompts = 0;
for (const name of frenchModeFiles) {
  const fixture = read(frenchFormsRoot, `content/french-basics/${name}`);
  if (fixture.pairKey !== "French:English" || fixture.reviewed !== false || fixture.registered !== false ||
      sha256(resolve(frenchFormsRoot, fixture.sourceFile)) !== fixture.sourceSha256)
    throw new Error(`${name}: pair, source hash, or review gate changed`);
  for (const lesson of fixture.lessons) {
    if (frenchModeLessons.has(lesson.lesson) || lesson.stableLessonKey !== `foundation-french-basics:${lesson.lesson}` ||
        modeNames.some((mode) => !lesson.modes?.[mode]?.prompt || !lesson.modes?.[mode]?.targetText))
      throw new Error(`${name}: duplicate or incomplete lesson ${lesson.lesson}`);
    frenchModeLessons.add(lesson.lesson);
    frenchAuthoredModePrompts += modeNames.length;
  }
}
const frenchModeCandidatePath = "content/french-basics/private-runtime-foundation-1-10-authored-modes.json";
const frenchModeCandidate = read(frenchFormsRoot, frenchModeCandidatePath);
const frenchBaseFoundation = read(frenchFormsRoot, frenchPath("foundation"));
if (frenchModeCandidate.registered !== false || frenchModeCandidate.reviewed !== false ||
    JSON.stringify(frenchModeCandidate.stageFile) !== JSON.stringify(frenchBaseFoundation.stageFile) ||
    frenchModeCandidate.support.length !== 10 || frenchModeCandidate.authoredModeSources.length !== frenchModeFiles.length)
  throw new Error("French authored-mode candidate changed pair, stage, or release gate");
let frenchCandidateModePrompts = 0;
for (const [index, lesson] of frenchModeCandidate.support.entries()) {
  if (lesson.stableLessonKey !== `foundation-french-basics:${index + 1}`)
    throw new Error(`French authored-mode candidate lesson ${index + 1}: stable key changed`);
  for (const mode of modeNames) {
    if (!lesson.modes?.[mode]?.authoredPrompt?.prompt || !lesson.modes?.[mode]?.authoredPrompt?.targetText)
      throw new Error(`French authored-mode candidate lesson ${index + 1}: ${mode} missing`);
    frenchCandidateModePrompts++;
  }
}
if (frenchCandidateModePrompts !== frenchAuthoredModePrompts) throw new Error("French mode candidate and sidecars differ");
const frenchCoreModePaths = readdirSync(frenchModeDirectory)
  .filter((name) => /^private-core-\d+-\d+-mode-prompts-fr-en\.json$/.test(name))
  .map((name) => `content/french-basics/${name}`);
const frenchCoreCoveredLessons = new Set();
for (const path of frenchCoreModePaths) {
  const fixture = read(frenchFormsRoot, path);
  if (fixture.pairKey !== "French:English" || fixture.reviewed !== false || fixture.registered !== false ||
      sha256(resolve(frenchFormsRoot, fixture.sourceFile)) !== fixture.sourceSha256)
    throw new Error(`${path}: French Core mode source or release gate changed`);
  for (const lesson of fixture.lessons) {
    if (frenchCoreCoveredLessons.has(lesson.lesson) || lesson.stableLessonKey !== `french-basics:${lesson.lesson}`)
      throw new Error(`${path}: duplicate or mismatched Core lesson ${lesson.lesson}`);
    frenchCoreCoveredLessons.add(lesson.lesson);
  }
}
const frenchCoreCoverage = [...frenchCoreCoveredLessons].sort((a, b) => a - b);
const frenchCoreCandidate = read(frenchFormsRoot, "content/french-basics/private-runtime-core-1-30-authored-modes.json");
const frenchBaseCore = read(frenchFormsRoot, frenchPath("core"));
if (frenchCoreCandidate.reviewed !== false || frenchCoreCandidate.registered !== false ||
    JSON.stringify(frenchCoreCandidate.coreCurriculum) !== JSON.stringify(frenchBaseCore.coreCurriculum) ||
    JSON.stringify(frenchCoreCandidate.authoredModeCoverage) !== JSON.stringify(frenchCoreCoverage) ||
    frenchCoreCandidate.authoredModeSources.length !== frenchCoreModePaths.length)
  throw new Error("French Core authored-mode source, stable curriculum, or release gate changed");
let frenchCoreModePrompts = 0;
for (const [index, lesson] of frenchCoreCandidate.support.entries()) {
  if (lesson.stableLessonKey !== `french-basics:${index + 1}`)
    throw new Error(`French Core candidate lesson ${index + 1}: stable key changed`);
  for (const mode of modeNames) {
    const prompt = lesson.modes?.[mode]?.authoredPrompt;
    if (frenchCoreCoveredLessons.has(index + 1) && (!prompt?.prompt || !prompt?.targetText))
      throw new Error(`French Core candidate lesson ${index + 1}: ${mode} missing`);
    if (!frenchCoreCoveredLessons.has(index + 1) && prompt) throw new Error(`French Core candidate lesson ${index + 1}: unexpected ${mode}`);
    if (prompt) frenchCoreModePrompts++;
  }
}
const frenchMasterModePaths = readdirSync(frenchModeDirectory)
  .filter((name) => /^private-master-\d+-\d+-mode-prompts-fr-en\.json$/.test(name))
  .map((name) => `content/french-basics/${name}`);
const frenchMasterCoveredLessons = new Set();
for (const path of frenchMasterModePaths) {
  const fixture = read(frenchFormsRoot, path);
  if (fixture.pairKey !== "French:English" || fixture.reviewed !== false || fixture.registered !== false ||
      sha256(resolve(frenchFormsRoot, fixture.sourceFile)) !== fixture.sourceSha256)
    throw new Error(`${path}: French Master mode source or release gate changed`);
  for (const lesson of fixture.lessons) {
    if (frenchMasterCoveredLessons.has(lesson.lesson) || lesson.stableLessonKey !== `master-french-basics:${lesson.lesson}`)
      throw new Error(`${path}: duplicate or mismatched Master lesson ${lesson.lesson}`);
    frenchMasterCoveredLessons.add(lesson.lesson);
  }
}
const frenchMasterCoverage = [...frenchMasterCoveredLessons].sort((a, b) => a - b);
const frenchMasterCandidate = read(frenchFormsRoot, "content/french-basics/private-runtime-master-1-20-authored-modes.json");
const frenchBaseMaster = read(frenchFormsRoot, frenchPath("master"));
if (frenchMasterCandidate.reviewed !== false || frenchMasterCandidate.registered !== false ||
    JSON.stringify(frenchMasterCandidate.masterStageFragment) !== JSON.stringify(frenchBaseMaster.masterStageFragment) ||
    JSON.stringify(frenchMasterCandidate.authoredModeCoverage) !== JSON.stringify(frenchMasterCoverage) ||
    frenchMasterCandidate.authoredModeSources.length !== frenchMasterModePaths.length)
  throw new Error("French Master authored-mode source, stable stage, or release gate changed");
let frenchMasterModePrompts = 0;
for (const [index, lesson] of frenchMasterCandidate.support.entries()) {
  if (lesson.stableLessonKey !== `master-french-basics:${index + 1}`)
    throw new Error(`French Master candidate lesson ${index + 1}: stable key changed`);
  for (const mode of modeNames) {
    const prompt = lesson.modes?.[mode]?.authoredPrompt;
    if (frenchMasterCoveredLessons.has(index + 1) && (!prompt?.prompt || !prompt?.targetText))
      throw new Error(`French Master candidate lesson ${index + 1}: ${mode} missing`);
    if (!frenchMasterCoveredLessons.has(index + 1) && prompt) throw new Error(`French Master candidate lesson ${index + 1}: unexpected ${mode}`);
    if (prompt) frenchMasterModePrompts++;
  }
}
const spanishPractice = readTracked(root, "src/data/spanish-basics-practice.json");
const japanesePractice = readTracked(root, "src/data/japanese-basics-practice.json");
const lines = [
  "# 101 lesson material parity: Spanish → French and Japanese",
  "",
  `- Spanish/Japanese source commit: \`${revision(root)}\``,
  `- French private draft commit: \`${revision(frenchRoot)}\``,
  `- French contextual forms commit: \`${revision(frenchFormsRoot)}\`; Japanese contextual forms commit: \`${revision(japaneseFormsRoot)}\``,
  "- Scope: Spanish 101 lesson-content files, Japanese 101 lesson-content files, and French 101 private runtime fixture. Counts indicate authored material only; they do not validate language quality, lesson flow, live registration, audio, or native app availability.",
  "- French fixture is unregistered and `reviewed:false`. Japanese 101 is a mapped draft with `reviewed:false`. No draft is counted as a released course.",
  "",
];
const totals = { spanishWords: 0, spanishLines: 0, spanishVerbs: 0, frenchCards: 0, frenchLines: 0, frenchVerbs: 0, japaneseWords: 0, japaneseLines: 0, japaneseVerbs: 0, frenchForms: 0, japaneseForms: 0 };
const missing = [];
const practiceTotals = { spanishChecks: 0, japaneseChecks: 0, spanishExamples: 0, japaneseExamples: 0, frenchChecks: 0, frenchModeDescriptors: 0, frenchTextPrompts: 0 };
for (const stage of stageNames) {
  const spanish = read(root, lessonPath("es", stage));
  const japanese = read(root, lessonPath("ja", stage));
  const french = read(frenchRoot, frenchPath(stage));
  if (spanish.language !== "Spanish" || japanese.language !== "Japanese" || french.target && french.target !== "French")
    throw new Error(`${stage}: target-language mismatch`);
  if (french.registered !== false || french.reviewed !== false) throw new Error(`${stage}: French fixture release status changed; re-audit before reporting`);
  if (spanish.nativeLanguage !== "English" || japanese.nativeLanguage !== "English" || french.native && french.native !== "English")
    throw new Error(`${stage}: support-language mismatch`);
  const support = new Map(french.support.map((entry) => [entry.n, entry]));
  const spanishPracticeStage = spanishPractice[`${stage === "core" ? "" : `${stage}-`}spanish-basics`];
  const japanesePracticeStage = japanesePractice[`${stage === "core" ? "" : `${stage}-`}japanese-basics`];
  if (support.size !== stageLengths[stage] || Object.keys(spanish.lessons).length !== stageLengths[stage] || Object.keys(japanese.lessons).length !== stageLengths[stage])
    throw new Error(`${stage}: lesson count mismatch`);
  if (Object.keys(spanishPracticeStage ?? {}).length !== stageLengths[stage] || Object.keys(japanesePracticeStage ?? {}).length !== stageLengths[stage])
    throw new Error(`${stage}: practice record count mismatch`);
  lines.push(`## ${stage[0].toUpperCase()}${stage.slice(1)} (${stageLengths[stage]})`, "",
    "| Lesson | Spanish words | French cards | Japanese words | Spanish Reader lines | French Reader lines | Japanese Reader lines | Spanish verb refs | French verb refs | Japanese verb refs | French form prompts | Japanese form prompts |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (let n = 1; n <= stageLengths[stage]; n++) {
    const es = spanish.lessons[String(n)];
    const ja = japanese.lessons[String(n)];
    const fr = support.get(n);
    if (!es || !ja || !fr || fr.stableLessonKey !== `${stage === "core" ? "" : `${stage}-`}french-basics:${n}`)
      throw new Error(`${stage} ${n}: stable lesson key or lesson missing`);
    const esPractice = spanishPracticeStage[String(n)];
    const jaPractice = japanesePracticeStage[String(n)];
    if (!esPractice || !jaPractice || !esPractice.openingLine || !jaPractice.openingLine ||
        !esPractice.partnerRole || !jaPractice.partnerRole ||
        !esPractice.speaking || !jaPractice.speaking ||
        !modeNames.every((mode) => fr.modes?.[mode]))
      throw new Error(`${stage} ${n}: practice record or French mode descriptor missing`);
    practiceTotals.spanishChecks += esPractice.checks?.length ?? 0;
    practiceTotals.japaneseChecks += jaPractice.checks?.length ?? 0;
    practiceTotals.spanishExamples += esPractice.grammar?.examples?.length ?? 0;
    practiceTotals.japaneseExamples += jaPractice.grammar?.examples?.length ?? 0;
    practiceTotals.frenchChecks += fr.checks?.length ?? 0;
    practiceTotals.frenchModeDescriptors += modeNames.length;
    practiceTotals.frenchTextPrompts += modeNames.filter((mode) =>
      Object.entries(fr.modes[mode]).some(([key, value]) =>
        !["recordedAudio", "speakingBrief"].includes(key) && typeof value === "string" && value.trim().length > 0)).length;
    const row = {
      spanishWords: es.words?.length ?? 0,
      frenchCards: fr.cards?.length ?? 0,
      japaneseWords: ja.words?.length ?? 0,
      spanishLines: lineCount(es.passage),
      frenchLines: frenchLineCount(fr),
      japaneseLines: lineCount(ja.passage),
      spanishVerbs: es.verbs?.length ?? 0,
      frenchVerbs: fr.verbs?.length ?? 0,
      japaneseVerbs: ja.verbs?.length ?? 0,
      frenchForms: frenchForms.byLesson[stage].get(n),
      japaneseForms: japaneseForms.byLesson[stage].get(n),
    };
    for (const key of Object.keys(totals)) totals[key] += row[key];
    if (row.frenchVerbs < row.spanishVerbs || row.japaneseVerbs < row.spanishVerbs)
      missing.push(`${stage} ${n}: Spanish ${row.spanishVerbs}, French ${row.frenchVerbs}, Japanese ${row.japaneseVerbs}`);
    lines.push(`| ${n} | ${Object.values(row).map(cell).join(" | ")} |`);
  }
  lines.push("");
}
lines.push("## Totals and next gate", "", `- Spanish: ${totals.spanishWords} words, ${totals.spanishLines} Reader lines, ${totals.spanishVerbs} verb references.`,
  `- French draft: ${totals.frenchCards} cards, ${totals.frenchLines} Reader lines, ${totals.frenchVerbs} verb references.`,
  `- Japanese draft: ${totals.japaneseWords} words, ${totals.japaneseLines} Reader lines, ${totals.japaneseVerbs} verb references.`,
  `- French contextual forms: ${totals.frenchForms} exact-pair prompts across 60 private lessons. Japanese contextual forms: ${totals.japaneseForms} exact-pair prompts across 60 private lessons. These are authored sentence/form tasks, not the same unit as Spanish LessonVerb references.`,
  `- Lessons with fewer LessonVerb entries than Spanish: ${missing.length}/60 for both French and Japanese. This is a data-model difference, not a verdict that their contextual grammar practice is missing.`,
  "- Next: review the French and Japanese contextual form prompts for grammatical accuracy and coverage, then integrate them into the reviewed exact-pair learner runtime. Decide whether separate language-specific verb study is needed by lesson; do not copy Spanish morphology or infer completion from these unlike inventory units.", "");
lines.push("## Practice record evidence", "",
  `- Spanish and Japanese each have 60 stage-keyed practice records with speaking openings and partner roles. Spanish has ${practiceTotals.spanishChecks} checks and ${practiceTotals.spanishExamples} grammar examples; Japanese has ${practiceTotals.japaneseChecks} checks and ${practiceTotals.japaneseExamples} grammar examples. Counts alone do not establish equivalent pedagogy or fluent review.`,
  `- The original French private fixture has ${practiceTotals.frenchChecks} checks and ${practiceTotals.frenchModeDescriptors} six-mode descriptors across 60 lessons. Only ${practiceTotals.frenchTextPrompts} descriptors contain a mode-specific text prompt beyond a speaking brief; the other descriptors are counts or audio flags.`,
  `- Source-pinned French Foundation sidecars contain ${frenchAuthoredModePrompts} mode prompts across ${frenchModeLessons.size}/10 lessons, all embedded in a private runtime candidate. French Core has ${frenchCoreModePrompts} authored prompts across ${frenchCoreCoveredLessons.size}/30 lessons; Master has ${frenchMasterModePrompts} across ${frenchMasterCoveredLessons.size}/20 in separate private candidates. Stable lesson IDs and the base curricula are unchanged. All candidates remain unreviewed and unregistered.`,
  "- Release gap: verify authored See, Recall, Hear, Type, Say, and Write behavior lesson by lesson in the exact French and Japanese runtimes; validate aligned Reader, cards, dictionary, speaking, audio, progress, offline, phone, and native behavior before promotion.", "");
const report = lines.join("\n");
if (output) writeFileSync(resolve(output), report);
else process.stdout.write(report);
