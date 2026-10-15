import type { CognateFrequency, CognateRule, CognateSourceLanguage } from "../cognate-patterns.ts";
import type { Language } from "@/state/app-state";

const CODE: Record<string, string> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  Italian: "it",
  German: "de",
  Portuguese: "pt",
  Japanese: "ja",
  Chinese: "zh",
  Korean: "ko",
  Pashto: "ps",
};

/** One example row: [word in the source language, word in the target language, English gloss]. */
export type ExampleRow = [source: string, target: string, gloss: string];

/**
 * Builds a cognate rule. `from` and `to` are the patterns shown on the card.
 *
 * tests/cognate-patterns.test.mjs checks every example against them, so a typo in a
 * word fails the test. Pattern syntax (alternatives separated by " / "):
 *   "-ción"   the word ENDS with "ción"
 *   "es-"     the word STARTS with "es"
 *   "ph"      the word CONTAINS "ph"
 *   "~..."    descriptive only (for scripts or shifts that are not a letter pattern); not checked
 */
export function cognateRule(o: {
  source: CognateSourceLanguage;
  target: Language;
  frequency: CognateFrequency;
  from: string;
  to: string;
  name: string;
  reliability: number;
  hook: string;
  examples: ExampleRow[];
  watchOut?: string;
  /** Optional id suffix. Required when `from` is not Latin text (the default slug would be empty). */
  id?: string;
}): CognateRule {
  const slug = (o.id ?? o.from)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^~/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    id: `${CODE[o.source]}-${CODE[o.target]}-${slug || "rule"}`,
    sourceLanguage: o.source,
    targetLanguage: o.target,
    frequency: o.frequency,
    sourcePattern: o.from,
    targetPattern: o.to,
    name: o.name,
    reliability: o.reliability,
    hook: o.hook,
    examples: o.examples.map(([source, target, gloss]) => ({ source, target, gloss })),
    ...(o.watchOut ? { watchOut: o.watchOut } : {}),
  };
}
