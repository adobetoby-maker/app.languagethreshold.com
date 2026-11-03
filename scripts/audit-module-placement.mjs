import { build } from "esbuild";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
const imports = {
  "src/data/modules.ts": ["MODULES", "moduleSupportsLearningPair"],
  "src/data/curriculum.ts": ["getCurriculum"],
  "src/lib/core60-path.ts": ["core60PathOf"],
  "src/data/spanish-basics.ts": ["spanishBasicsLesson"],
  "src/lib/lesson-reading.ts": ["authoredLessonReading"],
  "src/lib/lesson-words-core.ts": ["pickAuthoredWords", "authoredWordsPair"],
  "src/lib/module-placement.ts": ["placementBlocks", "placementCloze"],
};
const compiled = await build({
  stdin: {
    contents: Object.entries(imports)
      .map(([file, names]) => `export { ${names.join(",")} } from "./${file}";`)
      .join("\n"),
    resolveDir: process.cwd(),
    sourcefile: "placement-audit.ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const app = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString("base64")}`
);
const read = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
const rows = [];
for (const [target, native, code] of [
  ["Spanish", "English", "es"],
  ["English", "Spanish", "en"],
]) {
  for (const module of app.MODULES.filter(
    (m) => !/^(foundation|master)-/.test(m.id) && app.moduleSupportsLearningPair(m, target, native),
  )) {
    const path = app.core60PathOf(module.id);
    const ids = path?.steps.filter((s) => s.available).map((s) => s.moduleId) ?? [module.id];
    const lessons = ids.flatMap((id) => {
      const owner = app.MODULES.find((m) => m.id === id);
      const content = read(`public/lesson-content/${code}/${id}.json`);
      const deck = read(`public/lesson-decks/${code}/${id}.json`);
      return (app.getCurriculum(id)?.lessons ?? []).map((lesson) => {
        const raw = content?.nativeLanguage === native ? content.lessons[String(lesson.n)] : null;
        const words =
          app.pickAuthoredWords(
            lesson.words,
            target,
            native,
            app.authoredWordsPair(owner?.learnDirection),
          ) ??
          raw?.words ??
          (deck?.nativeLanguage === native ? deck.lessons[String(lesson.n)] : null) ??
          [];
        const basics = app.spanishBasicsLesson(id, lesson.n, target, native);
        const reading = app.authoredLessonReading(id, lesson.n, target, native);
        const examples =
          reading?.sentences.map((s) => ({ target: s.target, native: s.en })) ??
          raw?.passage?.target.map((s, i) => ({ target: s, native: raw.passage.native[i] })) ??
          words.filter((w) => w.kind === "phrase").map((w) => ({ target: w.es, native: w.en }));
        return {
          moduleId: id,
          n: lesson.n,
          stage: id.startsWith("foundation-")
            ? "foundation"
            : id.startsWith("master-")
              ? "master"
              : "core",
          title: lesson.title,
          words,
          checks: basics?.checks ?? app.placementCloze(words, examples),
        };
      });
    });
    const blocks = app.placementBlocks(lessons, "coverage-audit");
    const covered = blocks.reduce((sum, b) => sum + b.lessons.length, 0);
    rows.push({
      module: module.id,
      target,
      native,
      lessons: lessons.length,
      covered,
      questions: blocks.reduce((sum, b) => sum + b.questions.length, 0),
      gap: lessons[covered] ? `${lessons[covered].moduleId}:${lessons[covered].n}` : null,
    });
  }
}
const report = {
  schema: 1,
  version: "module-placement-v1",
  generatedAt: new Date().toISOString(),
  scope:
    "Independent lesson-derived placement; recognition and typed contextual recall. Not a supervised examination or human-reviewed proficiency certification.",
  policy: {
    blockLessons: 5,
    questionsPerLesson: 2,
    overallPass: 0.8,
    typedPass: 0.8,
    stopAtFirstWeakBlock: true,
    credit: "Explicit opt-in; contiguous passed blocks; independent pair-scoped progress only",
  },
  rows,
};
if (process.argv.includes("--write"))
  writeFileSync("docs/module-placement-coverage.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      modules: rows.length,
      ready: rows.filter((r) => r.covered === r.lessons && r.covered > 0).length,
      coreBasics: rows.filter((r) => r.module.startsWith("spanish")),
      gaps: rows.filter((r) => !r.covered || r.gap),
    },
    null,
    2,
  ),
);
