import { moduleLessonUrl } from "./learning-link.ts";
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
const pairKey = (language: string, native: string) => `${language}\u0000${native}`;
const articlePattern = (language: string) =>
  language === "Spanish" ? /^(?:el|la|los|las|un|una|unos|unas)\s+(?=\S+$)/u
  : language === "French" ? /^(?:le|la|les|un|une|des)\s+(?=\S+$)|^l[’'](?=\S+$)/u
  : language === "English" ? /^(?:the|a|an|to)\s+(?=\S+$)/u
  : null;
function lookupKeys(term: string, language: string): string[] {
  const exact = normalized(term);
  const pattern = articlePattern(language);
  const bare = pattern ? exact.replace(pattern, "") : exact;
  // Match an authored phrase only in full, and keep article+noun terms clickable.
  if (!exact) return [];
  return [...new Set([exact, bare].filter(Boolean))];
}
export function buildCurriculumVocabulary(data: CurriculumVocabularyData) {
  const tables = new Map<string, Map<string, CurriculumWordMatch[]>>();
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
    const target = module.target ?? "Spanish";
    const native = module.native ?? "English";
    if (target === native) continue;
    const base = {
      moduleId: module.id,
      moduleName: module.name,
      lesson,
      title: module.lessons[String(lesson)] ?? "",
      href:
        lesson === 0
          ? "/?tab=dictionary&target=Spanish&native=English"
          : moduleLessonUrl({
              moduleId: module.id,
              target,
              native,
              lesson,
              way: "see",
            }),
    };
    for (const [language, support, word, meaning] of [
      [target, native, es, en],
      [native, target, en, es],
    ] as const) {
      const key = pairKey(language, support);
      const table = tables.get(key) ?? new Map<string, CurriculumWordMatch[]>();
      tables.set(key, table);
      // Slash-separated authored term alternatives are exact alternatives, never partial phrase matches.
      for (const term of word.split(/\s+\/\s+/u)) {
        for (const lookupKey of lookupKeys(term, language)) {
          const matches = table.get(lookupKey) ?? [];
          if (!matches.some(m => m.moduleId === module.id && m.lesson === lesson && m.meaning === meaning))
            matches.push({ ...base, word: term, meaning });
          table.set(lookupKey, matches);
        }
      }
    }
  }
  return (word: string, language: string, native: string, preferredModule?: string) => {
    const found = [...(tables.get(pairKey(language, native))?.get(normalized(word)) ?? [])];
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
    buildCurriculumVocabulary(data.default),
  );
  try {
    return (await vocabulary)(word, language, native, preferredModule);
  } catch (error) {
    vocabulary = undefined;
    throw error;
  }
}
