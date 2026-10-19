/** Read-only structural inventory. It does not call AI, mutate learner data or approve content. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { loadModule } from "../tests/helpers/bundle.mjs";
const [
  { MODULES, moduleSupportsLearningPair },
  { getCurriculum },
  { ALL_SEEDS },
  { getAvailableModuleLessons },
  { LANGUAGES, NATIVE_LANGUAGES },
  { lessonSourceCoverage },
  { parseLessonContent, lessonContentPath, contentNativeLanguage },
] = await Promise.all([
  loadModule("src/data/modules.ts"),
  loadModule("src/data/curriculum.ts"),
  loadModule("src/data/all-seeds.ts"),
  loadModule("src/data/module-starters.ts"),
  loadModule("src/state/app-state.tsx", { stubs: [/^sonner$/, /supabase\/client$/] }),
  loadModule("src/lib/lesson-source-coverage.ts"),
  loadModule("src/lib/lesson-content-core.ts"),
]);
// This public runtime layer is separate from frozen lesson definitions and release records.
const contentFiles = new Map();
function generatedContent(moduleId, target, native, lessons) {
  if (native !== contentNativeLanguage(target)) return null;
  const path = `public${lessonContentPath(moduleId, target)}`;
  if (!contentFiles.has(path)) {
    if (!existsSync(path)) contentFiles.set(path, null);
    else {
      const bytes = readFileSync(path);
      const file = parseLessonContent(JSON.parse(bytes.toString("utf8")), {
        moduleId,
        language: target,
      });
      if (!file || file.nativeLanguage !== native)
        throw new Error(`Unusable generated lesson-content identity: ${path}`);
      contentFiles.set(path, {
        file,
        path,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  const entry = contentFiles.get(path);
  if (!entry) return null;
  const present = lessons.filter((lesson) => entry.file.lessons[String(lesson.n)]);
  const count = (predicate) =>
    present.filter((lesson) => predicate(entry.file.lessons[String(lesson.n)])).length;
  return {
    path: entry.path,
    bytes: entry.bytes,
    sha256: entry.sha256,
    fileReviewedFlag: entry.file.reviewed,
    lessons: present.length,
    wordLists: count((lesson) => !!lesson.words?.length),
    passages: count((lesson) => !!lesson.passage),
    verbSets: count((lesson) => !!lesson.verbs.length),
    missingLessonNumbers: lessons
      .filter((lesson) => !entry.file.lessons[String(lesson.n)])
      .map((lesson) => lesson.n),
    releaseApproval: "not-inferred",
  };
}
const codes = {
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Japanese: "ja",
  Chinese: "zh",
  Korean: "ko",
  Portuguese: "pt",
  Pashto: "ps",
  English: "en",
};
const canonicalLanguage = (language) =>
  language === "Chinese (Simplified)" ? "Chinese" : language;
const meetsVocabularyBaseline = (words) => {
  if (
    !Array.isArray(words) ||
    !words.every(
      (w) => typeof w?.en === "string" && w.en.trim() && typeof w?.es === "string" && w.es.trim(),
    )
  )
    return false;
  const terms = words.filter((w) => w.kind === "term").length;
  const phrases = words.filter((w) => w.kind === "phrase").length;
  return terms >= 8 && terms <= 12 && phrases >= 4 && phrases <= 6;
};
const modules = MODULES.map((module) => {
  const lessons = getCurriculum(module.id)?.lessons ?? [];
  const missingRecallSteps = lessons
    .filter((l) => !l.steps.some((s) => ["wordMatch", "games"].includes(s.tab)))
    .map((l) => l.n);
  const tracks = [];
  for (const target of LANGUAGES)
    for (const native of NATIVE_LANGUAGES) {
      if (
        canonicalLanguage(target) === canonicalLanguage(native) ||
        !moduleSupportsLearningPair(module, target, native)
      )
        continue;
      const ids = getAvailableModuleLessons(module.id, target, ALL_SEEDS);
      const authoredLists =
        target === "Spanish" && native === "English"
          ? lessons.filter((l) => l.words?.length).map((l) => l.n)
          : [];
      const mapped = lessons
        .filter((l) => ids.includes(l.readingTemplate?.replace("{lang}", codes[target])))
        .map((l) => l.n);
      const sourceCoverage = lessonSourceCoverage(module.id, target, native);
      let packLessons = [];
      let packListsWithinBaseline = 0;
      const file = `public/lesson-decks/${codes[target]}/${module.id}.json`;
      if (existsSync(file)) {
        const pack = JSON.parse(readFileSync(file, "utf8"));
        if (
          pack.module === module.id &&
          pack.language === target &&
          pack.nativeLanguage === native
        ) {
          packListsWithinBaseline = lessons.filter((l) =>
            meetsVocabularyBaseline(pack.lessons?.[l.n]),
          ).length;
          packLessons = lessons
            .filter((l) => Array.isArray(pack.lessons?.[l.n]) && pack.lessons[l.n].length)
            .map((l) => l.n);
        }
      }
      tracks.push({
        targetLanguage: target,
        instructionLanguage: native,
        authoredWordLists: authoredLists.length,
        authoredListsWithinVocabularyBaseline:
          target === "Spanish" && native === "English"
            ? lessons.filter((l) => meetsVocabularyBaseline(l.words)).length
            : 0,
        generatedPackWordLists: packLessons.length,
        generatedListsWithinVocabularyBaseline: packListsWithinBaseline,
        loadedTargetReaderTexts: ids.length,
        instructionLanguageScaffold: "unverified",
        lessonsWithMappedReader: mapped.length,
        lessonSpecificPassages: sourceCoverage.lessonsWithPassages,
        lessonsWithToolkitSettings: sourceCoverage.lessonsWithTeachingSettings,
        sharedDefinitionsStructurallyComplete: sourceCoverage.structurallyComplete,
        generatedContent: generatedContent(module.id, target, native, lessons),
        reviewState: "unverified",
        exams: { entrance: "unverified", day45: "unverified", day90: "unverified" },
      });
    }
  return {
    id: module.id,
    name: module.name,
    category: module.category,
    lessonCount: lessons.length,
    requiredLessons: 30,
    lessonNumbers: lessons.map((l) => l.n),
    lessonsWithoutExplicitRecallStep: missingRecallSteps,
    explicitSourceLevels: lessons.filter((l) => l.level).length,
    note: "An absent explicit recall step is a curriculum mapping gap; the embedded practice kit may still provide matching. Counts show structural presence, not quality or reviewed readiness.",
    tracks,
  };
});
const report = {
  schemaVersion: 2,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  generatedAt: new Date().toISOString(),
  scope:
    "Every module and every distinct language pair advertised by the current compatibility function, normalizing the Chinese source-language alias. Compatibility is not a reviewed release.",
  limits: [
    "No learner data or paid generation accessed.",
    "Practice and media runtime behavior require separate verification.",
    "Exams and reviewer approvals require explicit release records; this structural audit never infers them.",
    "Generated content counts use the runtime parser and current curriculum numbers; they are separate from shared definitions and do not establish quality, human review, offline readiness or release approval.",
  ],
  modules,
};
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      modules: modules.length,
      lessons: modules.reduce((n, m) => n + m.lessonCount, 0),
      compatibleTracks: modules.reduce((n, m) => n + m.tracks.length, 0),
      generatedContentFiles: modules.flatMap((m) => m.tracks).filter((t) => t.generatedContent)
        .length,
      generatedContentLessons: modules
        .flatMap((m) => m.tracks)
        .reduce((n, t) => n + (t.generatedContent?.lessons ?? 0), 0),
      modulesBelow30: modules.filter((m) => m.lessonCount < 30).map((m) => m.id),
      lessonsWithoutExplicitRecallStep: modules.reduce(
        (n, m) => n + m.lessonsWithoutExplicitRecallStep.length,
        0,
      ),
      output: output ?? null,
    },
    null,
    2,
  ),
);
