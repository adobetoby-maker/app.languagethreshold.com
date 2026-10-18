// Built by TAC — 2026-10-17
// Client side of authored lesson content (passage, words, verbs): one static JSON file per
// module and target language under /lesson-content, fetched once per session and cached offline
// by the service worker. A missing file (404, or the dev server's HTML fallback) is remembered
// as "no content" and the app falls back to the library reading and generated word lists.
import { useEffect, useState } from "react";
import {
  contentNativeLanguage,
  lessonContentPath,
  parseLessonContent,
  type LessonContentFile,
} from "@/lib/lesson-content-core";

export type LessonContentStatus = "loading" | "ready" | "none";

// null = no file / unusable. A key that is absent has not been resolved yet.
const files = new Map<string, LessonContentFile | null>();
const requests = new Map<string, Promise<LessonContentFile | null>>();

const keyOf = (moduleId: string, language: string) => `${moduleId}|${language}`;

/** What is already loaded: the file, null for "no content", undefined when not asked yet. */
export function loadedLessonContent(
  moduleId: string,
  language: string,
): LessonContentFile | null | undefined {
  const key = keyOf(moduleId, language);
  return files.has(key) ? (files.get(key) ?? null) : undefined;
}

/**
 * Loads (once) the content file for a module+language. Resolves null when there is none or it
 * is unusable; never throws. A network failure is not remembered, so a later call can retry
 * (and the service worker may answer from its cache when offline).
 */
export function loadLessonContent(
  moduleId: string,
  language: string,
): Promise<LessonContentFile | null> {
  const key = keyOf(moduleId, language);
  if (files.has(key)) return Promise.resolve(files.get(key) ?? null);
  const existing = requests.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      // A stalled request must not hold See it on its loading skeleton.
      const response = await fetch(lessonContentPath(moduleId, language), {
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404) {
        files.set(key, null);
        return null;
      }
      if (!response.ok) return null;
      const file = parseLessonContent(await response.json(), { moduleId, language });
      files.set(key, file);
      return file;
    } catch (error) {
      // Offline with nothing cached, or a body that is not JSON (dev server fallback page).
      if (error instanceof SyntaxError) files.set(key, null);
      return null;
    }
  })().finally(() => {
    requests.delete(key);
  });
  requests.set(key, promise);
  return promise;
}

/**
 * Fetches the module's content file in the background so every lesson is ready at once and
 * the service worker has it stored for offline use. Safe to call on every mount.
 */
export function prefetchLessonContent(moduleId: string, language: string, nativeLanguage: string) {
  if (typeof fetch !== "function" || !moduleId) return;
  // Files exist only for the default pairing of each target language.
  if (nativeLanguage !== contentNativeLanguage(language)) return;
  void loadLessonContent(moduleId, language);
}

export interface UseLessonContent {
  content: LessonContentFile | null;
  status: LessonContentStatus;
}

/** The module's authored content for the learner's pairing. "none" once it is known to be absent. */
export function useLessonContent(
  moduleId: string,
  language: string,
  nativeLanguage: string,
): UseLessonContent {
  const eligible = nativeLanguage === contentNativeLanguage(language);
  const key = keyOf(moduleId, language);
  // Which key a fetch last settled for (also when it failed without being remembered).
  const [settled, setSettled] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible || files.has(key)) return;
    let live = true;
    void loadLessonContent(moduleId, language).then(() => {
      if (live) setSettled(key);
    });
    return () => {
      live = false;
    };
  }, [eligible, key, moduleId, language]);

  if (!eligible) return { content: null, status: "none" };
  if (files.has(key)) {
    const content = files.get(key) ?? null;
    return { content, status: content ? "ready" : "none" };
  }
  return { content: null, status: settled === key ? "none" : "loading" };
}
