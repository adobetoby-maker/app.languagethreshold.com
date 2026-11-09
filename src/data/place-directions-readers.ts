import practice from "./place-directions-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const PLACE_READER_SEEDS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, l]) => ({
      id: `seed-es-${moduleId}-lesson-${n}`,
      title: `${l.stage} ${n}: ${l.reading.title}`,
      subtitle: "Place & Directions · Spanish / English",
      language: "Spanish",
      targetLabel: "Español",
      flag: "🇲🇽",
      section: "culture",
      category: "Culture",
      available: true,
      sentences: l.reading.target.map((target, i) => ({ target, en: l.reading.native[i] })),
    })),
);
