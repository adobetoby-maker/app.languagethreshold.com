import practice from "./finance-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";
export const FINANCE_READERS: LibrarySeed[] = Object.entries(practice).flatMap(([id, lessons]) =>
  Object.entries(lessons).map(([n, l]) => ({
    id: `seed-${l.target === "English" ? "en" : "es"}-${id}-lesson-${n}`,
    title: `${l.stage} ${n}: ${l.reading.title}`,
    subtitle: `Money conversations · ${l.native} → ${l.target}`,
    language: l.target,
    targetLabel: l.target,
    flag: l.target === "English" ? "🇺🇸" : "🇲🇽",
    section: "culture",
    category: id.includes("travel-money") ? "Travel" : "Finance",
    available: true,
    sentences: l.reading.target.map((target, i) => ({ target, en: l.reading.native[i] })),
  })),
);
