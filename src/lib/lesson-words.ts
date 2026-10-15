// Built by TAC — 2026-10-15
// Client side of per-lesson word lists. Authored words (roofing, Spanish) are returned at
// once with no network. Any other lesson/language is generated once by the server function,
// cached in localStorage, and reused (also read-only by Core30Review).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurriculum, type LessonWord } from "@/data/curriculum";
import { generateLessonWords } from "@/fns/lesson-words.functions";
import {
  lessonWordsKey,
  pickAuthoredWords,
  readCachedWords,
  writeCachedWords,
  type LessonWordsStatus,
} from "@/lib/lesson-words-core";

export type { LessonWordsStatus };

export interface UseLessonWords {
  words: LessonWord[];
  status: LessonWordsStatus;
  /** Short reason when status is "error" (the server's message, or a generic one). */
  error: string | null;
  retry: () => void;
}

type Generate = (args: {
  data: { moduleId: string; lessonNumber: number; language: string; nativeLanguage: string };
}) => Promise<{ words: LessonWord[] | null; error: string | null }>;

// One request per cache key at a time, however many components ask for it.
const inflight = new Map<string, Promise<LessonWord[]>>();

function requestWords(
  key: string,
  generate: Generate,
  args: { moduleId: string; lessonNumber: number; language: string; nativeLanguage: string },
): Promise<LessonWord[]> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const result = await generate({ data: args });
    if (result.error || !result.words?.length) {
      throw new Error(result.error ?? "No words returned");
    }
    writeCachedWords(key, result.words);
    return result.words;
  })().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

interface Fetched {
  key: string;
  words: LessonWord[];
  error: string | null;
}

export function useLessonWords(
  moduleId: string,
  lessonNumber: number,
  language: string,
  nativeLanguage: string,
): UseLessonWords {
  const generate = useServerFn(generateLessonWords) as unknown as Generate;
  // Held in a ref so a new function identity never re-runs the effect (and never re-requests).
  const generateRef = useRef(generate);
  generateRef.current = generate;
  const authored = useMemo(() => {
    const lesson = getCurriculum(moduleId)?.lessons.find((item) => item.n === lessonNumber);
    return pickAuthoredWords(lesson?.words, language);
  }, [moduleId, lessonNumber, language]);
  const key = lessonWordsKey(moduleId, lessonNumber, language, nativeLanguage);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  // Retry count is tied to the key it was pressed for, so switching lessons starts at 0 again.
  const [retried, setRetried] = useState<{ key: string; n: number }>({ key: "", n: 0 });
  const attempt = retried.key === key ? retried.n : 0;

  useEffect(() => {
    if (authored) return;
    let live = true;
    // First try is a cache read (no network); a retry always goes to the server.
    const cached = attempt === 0 ? readCachedWords(key) : null;
    if (cached) {
      setFetched({ key, words: cached, error: null });
      return;
    }
    requestWords(key, generateRef.current, { moduleId, lessonNumber, language, nativeLanguage })
      .then((words) => {
        if (live) setFetched({ key, words, error: null });
      })
      .catch((error: unknown) => {
        if (live) {
          setFetched({
            key,
            words: [],
            error: error instanceof Error && error.message ? error.message : "Word list failed",
          });
        }
      });
    return () => {
      live = false;
    };
  }, [authored, key, attempt, moduleId, lessonNumber, language, nativeLanguage]);

  const retry = useCallback(() => {
    setFetched(null);
    setRetried((prev) => ({ key, n: prev.key === key ? prev.n + 1 : 1 }));
  }, [key]);

  if (authored) return { words: authored, status: "authored", error: null, retry };
  if (!fetched || fetched.key !== key) return { words: [], status: "loading", error: null, retry };
  if (fetched.error) return { words: [], status: "error", error: fetched.error, retry };
  return { words: fetched.words, status: "ready", error: null, retry };
}
