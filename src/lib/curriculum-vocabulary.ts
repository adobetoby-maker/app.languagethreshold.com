import { moduleLessonUrl } from "./learning-link.ts";
import { packFor } from "../data/language-packs/registry.ts";
import { nativeLanguageCode } from "../data/languages.ts";
import { historicalAuthoredPair } from "./lesson-words-core.ts";
import { stripLeadingArticle } from "./lesson-word-card.ts";
export interface CurriculumWordMatch {
  word: string;
  meaning: string;
  moduleId: string;
  moduleName: string;
  lesson: number;
  title: string;
  href: string;
}
export interface CurriculumVocabularyData {
  modules: {
    id: string;
    name: string;
    target?: string;
    native?: string;
    /** Languages of the entry's two text columns; absent in older files (the unlabelled pair). */
    columns?: [string, string];
    lessons: Record<string, string | undefined>;
  }[];
  entries: (string | number)[][];
}
const normalized = (word: string) =>
  word
    .normalize("NFC")
    .trim()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
    .toLowerCase();
/** The pair an index row without target/native was written for (the app dictionary, older files). */
const UNLABELLED_PAIR = historicalAuthoredPair();

export function buildCurriculumVocabulary(data: CurriculumVocabularyData) {
  // One table per (target, native) pair: a row is a forward entry of its own pair and a reverse
  // entry of the opposite pair, so a word is only ever offered for the pair it was authored for.
  const tables = new Map<string, Map<string, CurriculumWordMatch[]>>();
  const tableFor = (target: string, native: string) => {
    const key = `${packFor(target)?.code ?? target}\u0000${packFor(native)?.code ?? nativeLanguageCode(native) ?? native}`;
    let table = tables.get(key);
    if (!table) tables.set(key, (table = new Map()));
    return table;
  };
  for (const [es, en, index, lesson] of data.entries) {
    if (
      typeof es !== "string" ||
      typeof en !== "string" ||
      typeof index !== "number" ||
      typeof lesson !== "number"
    )
      continue;
    const module = data.modules[index];
    if (!module) continue;
    const target = module.target ?? UNLABELLED_PAIR.language;
    const native = module.native ?? UNLABELLED_PAIR.nativeLanguage;
    const [first, second] = module.columns ?? [UNLABELLED_PAIR.language, UNLABELLED_PAIR.nativeLanguage];
    const base = {
      moduleId: module.id,
      moduleName: module.name,
      lesson,
      title: module.lessons[String(lesson)] ?? "",
      href:
        lesson === 0
          ? `/?tab=dictionary&target=${encodeURIComponent(target)}&native=${encodeURIComponent(native)}`
          : moduleLessonUrl({ moduleId: module.id, target, native, lesson, way: "see" }),
    };
    for (const [table, word, meaning, language] of [
      [tableFor(first, second), es, en, first],
      [tableFor(second, first), en, es, second],
    ] as const) {
      const pack = packFor(language);
      // Slash-separated authored term alternatives are exact alternatives, never partial phrase matches.
      for (const term of word.split(/\s+\/\s+/u)) {
        const key = stripLeadingArticle(normalized(term), pack);
        if (!key || /\s/u.test(key)) continue;
        const matches = table.get(key) ?? [];
        if (
          !matches.some(
            (m) => m.moduleId === module.id && m.lesson === lesson && m.meaning === meaning,
          )
        )
          matches.push({ ...base, word: term, meaning });
        table.set(key, matches);
      }
    }
  }
  return (word: string, language: string, native: string, preferredModule?: string) => {
    const found = [
      ...(tableFor(language, native).get(
        stripLeadingArticle(normalized(word), packFor(language)),
      ) ?? []),
    ];
    if (preferredModule)
      found.sort(
        (a, b) => Number(b.moduleId === preferredModule) - Number(a.moduleId === preferredModule),
      );
    // Keep different meanings visible before filling the remaining lesson suggestions.
    const meanings = new Set<string>(),
      chosen: CurriculumWordMatch[] = [];
    for (const match of found)
      if (!meanings.has(match.meaning)) {
        meanings.add(match.meaning);
        chosen.push(match);
      }
    for (const match of found) if (!chosen.includes(match)) chosen.push(match);
    return chosen.slice(0, 5);
  };
}
let vocabulary: Promise<ReturnType<typeof buildCurriculumVocabulary>> | undefined;
/** Static app asset, loaded once. No AI, database, user text upload or paid lookup API. */
export async function curriculumVocabulary(
  word: string,
  language: string,
  native: string,
  preferredModule?: string,
) {
  vocabulary ??= import("../data/curriculum-word-index.json").then((data) =>
    buildCurriculumVocabulary(data.default as unknown as CurriculumVocabularyData),
  );
  try {
    return (await vocabulary)(word, language, native, preferredModule);
  } catch (error) {
    vocabulary = undefined;
    throw error;
  }
}
