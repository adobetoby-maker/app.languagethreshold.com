import { dictWords } from "../src/components/dictionary/wordData.ts";
import { writeFileSync } from "node:fs";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { PACKS } from "../src/data/language-packs/registry.ts";
import { historicalAuthoredPair, authoredWordsPairForModule, deckNativeLanguage } from "../src/lib/lesson-words-core.ts";
// Public authored term pairs only. Never scrape private/generated learner content.
const rows: {
  es: string;
  en: string;
  moduleId: string;
  moduleName: string;
  lesson: number;
  title: string;
  target?: string;
  native?: string;
}[] = [];
// One pass per registered target language. Each row is [target text, native text]; the module's
// pair comes from its own record (authoredPair, or learnDirection), never from a Spanish default.
for (const pack of Object.values(PACKS)) {
  for (const module of MODULES) {
    const native = deckNativeLanguage(pack.name);
    const target = pack.name;
    if (!native || !moduleSupportsLearningPair(module, target as never, native as never)) continue;
    const authored = authoredWordsPairForModule(module);
    if (authored.language !== target || authored.nativeLanguage !== native) continue;
    for (const lesson of getCurriculum(module.id, target, native)?.lessons ?? []) {
      for (const word of lesson.words ?? []) {
        if (word.kind !== "term" || !word.es.trim() || !word.en.trim()) continue;
        rows.push({
          es: word.es.trim(),
          en: word.en.trim(),
          target,
          native,
          moduleId: module.id,
          moduleName: module.name,
          lesson: lesson.n,
          title: lesson.title,
        });
      }
    }
  }
}
for (const word of dictWords) {
  if (word.partOfSpeech === "phrase") continue;
  rows.push({
    es: word.word,
    en: word.english,
    target: historicalAuthoredPair().language,
    native: historicalAuthoredPair().nativeLanguage,
    moduleId: "app-dictionary",
    moduleName: "App dictionary",
    lesson: 0,
    title: "App dictionary",
  });
}
const modules: {
  id: string;
  name: string;
  target?: string;
  native?: string;
  columns: [string | undefined, string | undefined];
  lessons: Record<string, string>;
}[] = [];
const moduleIndices = new Map<string, number>();
const entries = rows.map((row) => {
  let index = moduleIndices.get(row.moduleId);
  if (index === undefined) {
    index = modules.length;
    moduleIndices.set(row.moduleId, index);
    modules.push({
      id: row.moduleId,
      name: row.moduleName,
      target: row.target,
      native: row.native,
      columns: [row.target, row.native],
      lessons: {},
    });
  }
  modules[index].lessons[String(row.lesson)] = row.title;
  return [row.es, row.en, index, row.lesson];
});
writeFileSync(
  new URL("../src/data/curriculum-word-index.json", import.meta.url),
  JSON.stringify({ modules, entries }),
);
console.log(
  `Indexed ${rows.length} authored vocabulary entries from ${new Set(rows.map((row) => row.moduleId)).size} modules.`,
);
