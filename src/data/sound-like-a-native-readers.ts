import practice from "./sound-like-a-native-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const SOUND_READER_SEEDS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, lesson]) => ({
      id: `seed-es-${moduleId}-lesson-${n}`,
      title: `Sound Like a Native ${lesson.stage} ${n}: ${lesson.reading.title}`,
      subtitle: "Latin American Spanish · English support",
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
