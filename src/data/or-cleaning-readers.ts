import practice from "./or-cleaning-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const OR_CLEANING_READERS: LibrarySeed[] = Object.entries(practice).flatMap(
  ([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, l]) => ({
      id: `seed-${l.target === "English" ? "en" : "es"}-${moduleId}-lesson-${n}`,
      title: `${l.stage} ${n}: ${l.reading.title}`,
      subtitle: `OR Cleaning Crew · ${l.native} → ${l.target}`,
      language: l.target,
      targetLabel: l.target,
      flag: l.target === "English" ? "🇺🇸" : "🇲🇽",
      section: "culture",
      category: "Medical",
      available: true,
      sentences: l.reading.target.map((target, i) => ({ target, en: l.reading.native[i] })),
    })),
);
