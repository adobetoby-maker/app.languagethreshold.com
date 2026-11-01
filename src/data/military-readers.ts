import practice from "./military-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";

/** The full Reader and inline lessons use the same authored, aligned sentence pairs. */
export const MILITARY_READER_SEEDS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, lesson]) => ({
      id: `seed-en-${moduleId}-lesson-${n}`,
      title: `${moduleId.startsWith("foundation-") ? "Foundation" : moduleId.startsWith("master-") ? "Master" : "Core"} ${n}: ${lesson.reading.title}`,
      subtitle: "Military English · Español → English",
      language: "English",
      targetLabel: "English",
      flag: "🇺🇸",
      section: "culture",
      category: "English",
      available: true,
      sentences: lesson.reading.target.map((target, i) => ({
        target,
        en: lesson.reading.native[i],
      })),
    })),
);
