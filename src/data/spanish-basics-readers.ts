import basics from "./spanish-basics-practice.json" with { type: "json" };
import next from "./spanish-next-practice.json" with { type: "json" };

function courseTitle(id: string) {
  if (id.includes("spanish-usage-verbs")) return "Spanish Usage-First Verbs";
  if (id.includes("spanish-common-patterns")) return "Spanish Common Grammar Patterns";
  if (id.includes("spanish-102")) return "Spanish 102";
  if (id.includes("spanish-frequent-verbs")) return "Spanish Frequent Verbs";
  if (id.includes("spanish-conjugation-patterns")) return "Spanish Conjugation Patterns";
  return "Spanish 101";
}
import type { LibrarySeed } from "./library-seeds/_types";
function readers(practice: typeof basics | typeof next): LibrarySeed[] {
  return Object.entries(practice).flatMap(([moduleId, lessons]) =>
    Object.entries(lessons).map(([n, lesson]) => ({
      id: `seed-es-${moduleId}-lesson-${n}`,
      title: `${courseTitle(moduleId)} ${lesson.stage} ${n}: ${lesson.reading.title}`,
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
}
export const SPANISH_BASICS_READERS = readers(basics);
export const SPANISH_NEXT_READERS = readers(next);
