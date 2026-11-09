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
const revision = (base) => execFileSync("git", ["rev-parse", "HEAD"], { cwd: base, encoding: "utf8" }).trim();
const stageNames = ["foundation", "core", "master"];
const stageLengths = { foundation: 10, core: 30, master: 20 };
const stagePrefix = { foundation: "foundation-", core: "", master: "master-" };
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
  if (support.size !== stageLengths[stage] || Object.keys(spanish.lessons).length !== stageLengths[stage] || Object.keys(japanese.lessons).length !== stageLengths[stage])
    throw new Error(`${stage}: lesson count mismatch`);
  lines.push(`## ${stage[0].toUpperCase()}${stage.slice(1)} (${stageLengths[stage]})`, "",
    "| Lesson | Spanish words | French cards | Japanese words | Spanish Reader lines | French Reader lines | Japanese Reader lines | Spanish verb refs | French verb refs | Japanese verb refs | French form prompts | Japanese form prompts |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (let n = 1; n <= stageLengths[stage]; n++) {
    const es = spanish.lessons[String(n)];
    const ja = japanese.lessons[String(n)];
    const fr = support.get(n);
    if (!es || !ja || !fr || fr.stableLessonKey !== `${stage === "core" ? "" : `${stage}-`}french-basics:${n}`)
      throw new Error(`${stage} ${n}: stable lesson key or lesson missing`);
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
  `- Lessons below the Spanish verb-reference count: ${missing.length}/60 for both French and Japanese.`,
  "- Next: review the French and Japanese contextual form prompts for grammatical accuracy and coverage, then integrate them into the exact-pair runtime. Decide whether separate language-specific verb study is needed by lesson; do not copy Spanish morphology or infer completion from these unlike inventory units.", "");
const report = lines.join("\n");
if (output) writeFileSync(resolve(output), report);
else process.stdout.write(report);
