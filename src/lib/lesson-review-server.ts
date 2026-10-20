import "@tanstack/react-start/server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { getCurriculum } from "../data/curriculum.ts";
import { ensureStageForModule } from "../data/core60-stages.ts";
import {
  contentNativeLanguage,
  lessonContentPath,
  parseLessonContent,
} from "./lesson-content-core.ts";
import { lessonReviewSnapshot, type GeneratedReviewMaterial } from "./lesson-review.ts";

/** Deployment entry owns this absolute path; no URL/request input chooses a filesystem root. */
export function readGeneratedReviewMaterial(
  moduleId: string,
  target: string,
  native: string,
  root = process.env.LT_INTERNAL_LESSON_CONTENT_ROOT ?? resolve("public/lesson-content"),
): GeneratedReviewMaterial {
  if (!getCurriculum(moduleId)) throw new Error("Unknown lesson module.");
  if (native !== contentNativeLanguage(target)) return { file: null, source: null };
  const path = lessonContentPath(moduleId, target);
  const relative = path.slice("/lesson-content/".length);
  // A missing deployment inventory is a service failure, never evidence of absent content.
  const index = JSON.parse(readFileSync(resolve(root, "index.json"), "utf8"));
  if (index.version !== 1 || !Array.isArray(index.files))
    throw new Error("Lesson content inventory is unavailable.");
  const matches = index.files.filter(
    (entry: { module?: unknown; language?: unknown }) =>
      entry?.module === moduleId && entry.language === relative.split("/")[0],
  );
  if (matches.length === 0) return { file: null, source: null };
  if (matches.length !== 1) throw new Error("Lesson content inventory is ambiguous.");
  const bytes = readFileSync(resolve(root, relative));
  const file = parseLessonContent(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    { moduleId, language: target },
  );
  if (!file || file.nativeLanguage !== native)
    throw new Error("Lesson content does not match this track.");
  return { file, source: { path, sha256: createHash("sha256").update(bytes).digest("hex") } };
}

/** Exact packaged public source, not a network response or browser-supplied substitute. */
export function currentLessonReviewSnapshot(moduleId: string, target: string, native: string) {
  if (!getCurriculum(moduleId)) return null;
  return lessonReviewSnapshot(
    moduleId,
    target,
    native,
    readGeneratedReviewMaterial(moduleId, target, native),
  );
}

/**
 * currentLessonReviewSnapshot for server code: loads the module's Core 60 stage first (a cold
 * instance has no stage curricula), so a stage module is not reported as "Unknown lesson module".
 */
export async function loadCurrentLessonReviewSnapshot(
  moduleId: string,
  target: string,
  native: string,
) {
  await ensureStageForModule(moduleId);
  return currentLessonReviewSnapshot(moduleId, target, native);
}
