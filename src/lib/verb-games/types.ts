// Built by TAC — 2026-10-20
// Verb Games: shared pattern types. Type-only declarations plus PERSONS.

export type Person = "yo" | "tú" | "él_ella_usted" | "nosotros" | "ellos_ustedes";

/** Same order as SPANISH_FORM_KEYS in lesson-content-core.ts (no vosotros). */
export const PERSONS: readonly Person[] = ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"];

export type FamilyId =
  | "es.present.ar"
  | "es.present.er"
  | "es.present.ir"
  | "es.present.go-yo"
  | "es.present.e-ie"
  | "es.present.o-ue"
  | "es.present.e-i";

export interface PatternFamily {
  id: FamilyId;
  language: "es";
  tense: "present";
  kind: "regular-ending" | "yo-irregular" | "stem-change";
  label: string;
  /** Short text for card pills (the label can be longer than a pill allows). */
  pill: string;
  rule: string;
  appliesTo: Person[];
  frame: { person: Person; template: string };
  pieceKind: "ending" | "letters";
  tier: 1 | 2;
}

export interface VerbForm {
  person: Person;
  full: string;
  stem: string;
  ending: string;
  english: string;
  families: FamilyId[];
  sentence: { target: string; native: string } | null;
}

export type VerbSource = { kind: "module"; moduleId: string } | { kind: "core"; rank: number };

export interface VerbEntry {
  infinitive: string;
  english: string;
  status: "verified" | "classified";
  sources: VerbSource[];
  /** In PERSONS order, length 5. */
  forms: VerbForm[];
}

export interface CrushLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  persons: Person[] | "family";
  families: "picked" | FamilyId[];
  goalCount: number;
  moveBudget: number;
}

export interface PatternData {
  version: 1;
  language: "es";
  tense: "present";
  dataHash: string;
  reportSha256: string;
  signedOff: boolean;
  families: PatternFamily[];
  crushLevels: CrushLevel[];
  verbs: VerbEntry[];
}

/** Which verbs a round draws from. Declared here so later files import it without a type cycle. */
export type SourceFilter =
  | { kind: "core" }
  | { kind: "module"; moduleId: string }
  | { kind: "both"; moduleId: string };
