// Built by TAC — 2026-10-15
// Client side of per-lesson word lists. Order: authored words (roofing, Spanish; no network)
// -> authored lesson content (/lesson-content, words written with the lesson's passage and verbs)
// -> pre-built static deck (/lesson-decks, one fetch per module+language, cached offline by
// the service worker) -> localStorage cache -> generated once by the server function and
// cached. Core30Review reads the localStorage cache only.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurriculum, type LessonWord } from "@/data/curriculum";
import { generateLessonWords } from "@/fns/lesson-words.functions";
import { loadedLessonContent, loadLessonContent } from "@/lib/lesson-content";
import { pickContentWords } from "@/lib/lesson-content-core";
import {
  deckNativeLanguage,
  lessonDeckPath,
  lessonWordsKey,
  parseLessonDeck,
  pickAuthoredWords,
  pickDeckWords,
  readCachedWords,
  writeCachedWords,
  type LessonDeck,
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

// ─── Static decks ────────────────────────────────────────────────────────────

// One fetch per module+language for the whole session. null = no deck (404 / unusable).
const decks = new Map<string, LessonDeck | null>();
const deckRequests = new Map<string, Promise<LessonDeck | null>>();

function deckKey(moduleId: string, language: string): string {
  return `${moduleId}|${language}`;
}

/** True when this module+language has authored words, so no deck is ever needed. */
function hasAuthoredWords(moduleId: string, language: string): boolean {
  const lessons = getCurriculum(moduleId)?.lessons ?? [];
  return lessons.some((lesson) => pickAuthoredWords(lesson.words, language) !== null);
}

/**
 * Loads (once) the pre-built deck for a module+language. Resolves null when there is no deck
 * or it is unusable; never throws. A network failure is not remembered, so a later call can
 * retry (and the service worker may answer it from its cache when offline).
 */
export function loadLessonDeck(moduleId: string, language: string): Promise<LessonDeck | null> {
  const key = deckKey(moduleId, language);
  if (decks.has(key)) return Promise.resolve(decks.get(key) ?? null);
  const existing = deckRequests.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const response = await fetch(lessonDeckPath(moduleId, language));
      if (response.status === 404) {
        decks.set(key, null);
        return null;
      }
      if (!response.ok) return null;
      const deck = parseLessonDeck(await response.json(), { moduleId, language });
      decks.set(key, deck);
      return deck;
    } catch (error) {
      // Offline with nothing cached, or a body that is not JSON (dev server fallback page).
      if (error instanceof SyntaxError) decks.set(key, null);
      return null;
    }
  })().finally(() => {
    deckRequests.delete(key);
  });
  deckRequests.set(key, promise);
  return promise;
}

/**
 * Fetches the whole module deck in the background so every lesson is ready at once and the
 * service worker has stored it for offline use. Safe to call on every mount.
 */
export function prefetchLessonDeck(moduleId: string, language: string, nativeLanguage: string) {
  if (typeof fetch !== "function" || !moduleId) return;
  // Decks exist only for the default pairing of each target language.
  if (nativeLanguage !== deckNativeLanguage(language)) return;
  if (hasAuthoredWords(moduleId, language)) return;
  void loadLessonDeck(moduleId, language);
}

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
    const show = (words: LessonWord[]) => {
      if (live) setFetched({ key, words, error: null });
    };
    const generateWords = () =>
      requestWords(key, generateRef.current, { moduleId, lessonNumber, language, nativeLanguage })
        .then(show)
        .catch((error: unknown) => {
          if (live) {
            setFetched({
              key,
              words: [],
              error: error instanceof Error && error.message ? error.message : "Word list failed",
            });
          }
        });
    // A retry always goes to the server. A first try reads the static deck, then the cache.
    if (attempt > 0) {
      void generateWords();
      return () => {
        live = false;
      };
    }
    const fromCache = () => {
      const cached = readCachedWords(key);
      if (cached) show(cached);
      else void generateWords();
    };
    const fromDeck = () => {
      const deckKnown = decks.has(deckKey(moduleId, language));
      if (deckKnown) {
        const hit = pickDeckWords(
          decks.get(deckKey(moduleId, language)),
          lessonNumber,
          nativeLanguage,
        );
        if (hit) show(hit);
        else fromCache();
      } else {
        void loadLessonDeck(moduleId, language).then((deck) => {
          const hit = pickDeckWords(deck, lessonNumber, nativeLanguage);
          if (hit) show(hit);
          else if (live) fromCache();
        });
      }
    };
    // Authored lesson content comes before the saved deck. A module without a content file
    // costs one cached 404 per session and falls through.
    const fromContent = (file: Parameters<typeof pickContentWords>[0]) => {
      const hit = pickContentWords(file, lessonNumber, nativeLanguage);
      if (hit) show(hit);
      else fromDeck();
    };
    const knownContent = loadedLessonContent(moduleId, language);
    if (knownContent !== undefined) {
      fromContent(knownContent);
    } else {
      void loadLessonContent(moduleId, language).then((file) => {
        if (live) fromContent(file);
      });
    }
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
