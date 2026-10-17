import type { WordCardData } from "../fns/word-lookup.functions.ts";
import { tutorLessonThread, type TutorLessonReference } from "./lesson-tutor-context.ts";
export function wordCardCacheKey(
  request: { language: string; word: string; sentence: string; lesson?: TutorLessonReference },
  nativeLanguage: string,
) {
  return JSON.stringify([
    request.language,
    nativeLanguage,
    request.word,
    request.sentence,
    request.lesson ? tutorLessonThread(request.lesson) : null,
  ]);
}
/** One factory per account-keyed app subtree; never module-global or persisted. */
export function createWordCardCache() {
  const entries = new Map<string, WordCardData>();
  return {
    get(key: string) {
      return entries.get(key) ?? null;
    },
    set(key: string, value: WordCardData) {
      entries.delete(key);
      entries.set(key, value);
      if (entries.size > 200) entries.delete(entries.keys().next().value!);
    },
    clear() {
      entries.clear();
    },
  };
}
