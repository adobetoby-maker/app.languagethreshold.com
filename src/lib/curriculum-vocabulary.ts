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
  modules: { id: string; name: string; lessons: Record<string, string | undefined> }[];
  entries: (string | number)[][];
}
const normalized = (word: string) =>
  word
    .normalize("NFC")
    .trim()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
    .toLowerCase();
export function buildCurriculumVocabulary(data: CurriculumVocabularyData) {
  const spanish = new Map<string, CurriculumWordMatch[]>();
  const english = new Map<string, CurriculumWordMatch[]>();
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
              target: "Spanish",
              native: "English",
              lesson,
              way: "see",
            }),
    };
    for (const [table, word, meaning] of [
      [spanish, es, en],
      [english, en, es],
    ] as const) {
      // Slash-separated authored term alternatives are exact alternatives, never partial phrase matches.
      for (const term of word.split(/\s+\/\s+/u)) {
        const key = normalized(term).replace(
          table === spanish
            ? /^(?:el|la|los|las|un|una|unos|unas)\s+(?=\S+$)/u
            : /^(?:the|a|an|to)\s+(?=\S+$)/u,
          "",
        );
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
    if (!(
      (language === "Spanish" && native === "English") ||
      (language === "English" && native === "Spanish")
    ))
      return [];
    const found = [...((language === "Spanish" ? spanish : english).get(normalized(word)) ?? [])];
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
  if (!(
    (language === "Spanish" && native === "English") ||
    (language === "English" && native === "Spanish")
  ))
    return [];
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
