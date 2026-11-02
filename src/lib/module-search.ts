import type { AppModule } from "../data/modules.ts";

const CORE_ALIASES: Record<string, string> = {
  "spanish-basics": "Spanish 101 beginner starter basic learning foundations",
  "spanish-102": "Spanish 102 next beginner basic learning",
  "spanish-frequent-verbs": "high frequency verbs frequent verbs common verbs",
  "spanish-conjugation-patterns": "verbs conjugation verb forms patterns",
  "spanish-usage-verbs": "high use verbs high frequency usage first verbs",
  "spanish-common-patterns":
    "high use grammar high frequency grammar basic grammar common patterns",
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function moduleMatchesSearch(module: AppModule, query: string): boolean {
  const base = module.id.replace(/^(foundation|master)-/, "");
  const text = normalize(
    [
      module.name,
      module.blurb,
      module.category,
      module.userRole,
      ...module.vocabFocus,
      CORE_ALIASES[base] ?? "",
    ].join(" "),
  );
  return normalize(query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}
