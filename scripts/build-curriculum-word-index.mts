import { dictWords } from "../src/components/dictionary/wordData.ts";
import { writeFileSync } from "node:fs";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
// Public authored term pairs only. Never scrape private/generated learner content.
const rows: {
  es: string;
  en: string;
  moduleId: string;
  moduleName: string;
  lesson: number;
  title: string;
}[] = [];
for (const module of MODULES) {
  if (!moduleSupportsLearningPair(module, "Spanish", "English")) continue;
  for (const lesson of getCurriculum(module.id)?.lessons ?? []) {
    for (const word of lesson.words ?? []) {
      if (word.kind !== "term" || !word.es.trim() || !word.en.trim()) continue;
      rows.push({
        es: word.es.trim(),
        en: word.en.trim(),
        moduleId: module.id,
        moduleName: module.name,
        lesson: lesson.n,
        title: lesson.title,
      });
    }
  }
}
for (const word of dictWords) {
  if (word.partOfSpeech === "phrase") continue;
  rows.push({
    es: word.word,
    en: word.english,
    moduleId: "app-dictionary",
    moduleName: "App dictionary",
    lesson: 0,
    title: "App dictionary",
  });
}
const modules: { id: string; name: string; lessons: Record<string, string> }[] = [];
const moduleIndices = new Map<string, number>();
const entries = rows.map((row) => {
  let index = moduleIndices.get(row.moduleId);
  if (index === undefined) {
    index = modules.length;
    moduleIndices.set(row.moduleId, index);
    modules.push({ id: row.moduleId, name: row.moduleName, lessons: {} });
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
