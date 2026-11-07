import practice from "./japanese-basics-practice.json" with { type: "json" };
import type { LibrarySeed } from "./library-seeds/_types";

const stages = [
  ["foundation-japanese-basics", "Foundation"],
  ["japanese-basics", "Core"],
  ["master-japanese-basics", "Master"],
] as const;

export const JAPANESE_BASICS_READERS: LibrarySeed[] = stages.flatMap(([moduleId, stage]) =>
  Object.entries(practice[moduleId]).map(([n, lesson]) => ({
    id: `seed-ja-${moduleId}-lesson-${n}`,
    title: `Japanese 101 ${stage} ${n}: ${lesson.reading.title}`,
    subtitle: "Japanese with English support · draft",
    language: "Japanese",
    targetLabel: "Japanese",
    flag: "🇯🇵",
    section: "culture",
    category: "Culture",
    available: true,
    sentences: lesson.reading.target.map((target, i) => ({ target, en: lesson.reading.native[i] })),
  })),
);
