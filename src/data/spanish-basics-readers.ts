import practice from "./spanish-basics-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const SPANISH_BASICS_READERS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, lesson]) => ({
      id: `seed-es-${moduleId}-lesson-${n}`,
      title: `Spanish 101 ${lesson.stage} ${n}: ${lesson.reading.title}`,
      subtitle: "Spanish with English support",
      language: "Spanish",
      targetLabel: "Spanish",
      flag: "🇪🇸",
      section: "culture",
      category: "Culture",
      available: true,
      sentences: lesson.reading.target.map((target, i) => ({
        target,
        en: lesson.reading.native[i],
      })),
    })),
);
