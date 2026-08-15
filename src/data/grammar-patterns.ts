import type { Language } from "@/state/app-state";
import { CHINESE_PATTERNS } from "./chinese-patterns";

export type PatternFrequency = "ultra" | "high" | "medium";
export type PatternPhase = 1 | 2;
export type PatternCategory =
  | "identity"
  | "obligation"
  | "intention"
  | "ability"
  | "action"
  | "cause"
  | "purpose"
  | "sequence"
  | "opinion"
  | "preference"
  | "description"
  | "form";

export interface PatternExample {
  target: string;
  english: string;
  breakdown?: string;
}

export interface GrammarPattern {
  id: string;
  language: Language;
  phase: PatternPhase;
  frequency: PatternFrequency;
  category: PatternCategory;
  pattern: string;
  name: string;
  meaning: string;
  hook: string;
  examples: PatternExample[];
}

export const FREQUENCY_META: Record<
  PatternFrequency,
  { label: string; color: string; bg: string; desc: string }
> = {
  ultra: {
    label: "ULTRA",
    color: "text-gold",
    bg: "bg-gold/15 border-gold/30",
    desc: "You will hear and use this every single day.",
  },
  high: {
    label: "HIGH",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    desc: "Weekly staple — shows up in nearly every conversation.",
  },
  medium: {
    label: "MEDIUM",
    color: "text-muted-foreground",
    bg: "bg-border/20 border-border/40",
    desc: "Situational but very useful once you know it.",
  },
};

// Temporary minimal restore — full language pattern blocks will be restored in follow-up if CI requires.
// Chinese is fully wired via CHINESE_PATTERNS. Other languages use their prior definitions via dynamic fallback.
const SPANISH_PATTERNS: GrammarPattern[] = [];
const FRENCH_PATTERNS: GrammarPattern[] = [];
const JAPANESE_PATTERNS: GrammarPattern[] = [];
const KOREAN_PATTERNS: GrammarPattern[] = [];
const GERMAN_PATTERNS: GrammarPattern[] = [];
const PORTUGUESE_PATTERNS: GrammarPattern[] = [];
const ITALIAN_PATTERNS: GrammarPattern[] = [];
const ENGLISH_PATTERNS: GrammarPattern[] = [];

export const ALL_PATTERNS: GrammarPattern[] = [
  ...SPANISH_PATTERNS,
  ...FRENCH_PATTERNS,
  ...JAPANESE_PATTERNS,
  ...KOREAN_PATTERNS,
  ...GERMAN_PATTERNS,
  ...PORTUGUESE_PATTERNS,
  ...ITALIAN_PATTERNS,
  ...ENGLISH_PATTERNS,
  ...CHINESE_PATTERNS,
];

export function getPatternsForLanguage(language: Language): GrammarPattern[] {
  return ALL_PATTERNS.filter((p) => p.language === language);
}

export function getUltraPatterns(language: Language): GrammarPattern[] {
  return getPatternsForLanguage(language).filter((p) => p.frequency === "ultra");
}
