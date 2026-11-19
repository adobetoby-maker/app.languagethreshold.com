import practice from "./interests-spanish-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const INTEREST_READER_SEEDS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, lesson]) => ({
      id: `seed-es-${moduleId}-lesson-${n}`,
      title: `${lesson.stage === "foundation" ? "Foundation" : lesson.stage === "master" ? "Master" : "Core"} ${n}: ${lesson.reading.title}`,
      subtitle: `${moduleId.includes("dance-team") ? "Dance Team" : "Cosmetology: Hair & Nails"} · Spanish / English`,
      language: "Spanish",
      targetLabel: "Español",
      flag: "🇲🇽",
      section: "culture",
      category: "Culture",
      available: true,
      sentences: lesson.reading.target.map((target, i) => ({
        target,
        en: lesson.reading.native[i],
      })),
    })),
);
