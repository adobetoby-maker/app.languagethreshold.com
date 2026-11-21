// Built by TAC — 2026-11-21
// App data a language carries in this PWA only (language-pack model section 5: "Tables are deleted
// per language, not all at once"). The shared profile schema has no field yet for a handful of
// things the PWA already authors per language: typing placeholders written in the language,
// mission opening lines, the recorded-audio reader that serves it, the dictionary dataset it ships,
// prompt notes, and so on. Rather than keep each one as a table keyed by a language code inside
// app logic, every language keeps them in one data file, ./app/<code>.json, read through
// appData(pack). App logic asks this module; it never names a language.
//
// A file may also carry `pack`: corrections to the bundled runtime pack for this app (deep-merged
// over ./<code>.json by the registry). They exist where the PWA must keep behaviour the shared
// profile does not describe yet, and each one says why in `_why`. Upstream them into the profile
// in core60-languages, then delete them here.
//
// This module imports no registry (the registry imports it), so it is keyed by pack code.

import type { LanguagePack } from "./types.ts";
import app_de from "./app/de.json" with { type: "json" };
import app_en from "./app/en.json" with { type: "json" };
import app_es from "./app/es.json" with { type: "json" };
import app_fr from "./app/fr.json" with { type: "json" };
import app_it from "./app/it.json" with { type: "json" };
import app_ja from "./app/ja.json" with { type: "json" };
import app_ko from "./app/ko.json" with { type: "json" };
import app_ps from "./app/ps.json" with { type: "json" };
import app_pt from "./app/pt.json" with { type: "json" };
import app_zh from "./app/zh.json" with { type: "json" };

/** Labels of the six reference-table persons (s1 = first singular … p3 = third plural). */
export interface PersonLabels {
  s1: string;
  s2: string;
  s3: string;
  p1: string;
  p2: string;
  p3: string;
}

/** Language-specific wording of the authored-lesson prompt (lesson-content-prompt.ts). */
export interface ContentPromptNotes {
  /** The register paragraph; `{native}` is the learner's native language as described by its own file. */
  registerNote: string;
  /** How this language is described when it is the learner's native language. */
  asNative?: string;
  /** The near-future construction named in the A2-B1 level guide. */
  nearFuture?: string;
  /** The regional-variety rule of the passage rules. */
  regionRule?: string;
  /** The colon example of reported speech in the passage section. */
  reportedSpeech?: string;
  /** The direct-speech rule's good and bad examples. */
  directSpeech?: { good: string; bad: string };
  /** The bare-term example of the words section ("césped" and "lawn", not "el césped" and "the lawn"). */
  termsWithoutArticles?: string;
  /** How the infinitive is asked for in the verbs section. */
  infinitive?: string;
  /** Appended to "the meaning in {native}", by native code ("*" for any native). */
  nativeMeaning?: Record<string, string>;
  /** Appended after the forms key list in the verbs section. */
  formsNote?: string;
  /** The units example of the translate rule. */
  unitsExample?: string;
  /** The attribution examples ("según el plano", ...) and the one a worker repeats. */
  attribution?: { examples: string; repeated: string };
}

export interface MissionLines {
  /** Opening line per mission specialty (Core, Medical, Trades, ...). */
  opening: Record<string, string>;
  /** Opening line per travel module id. */
  travel: Record<string, string>;
  /** Opening line per relationship topic id. */
  relationship: Record<string, string>;
}

export interface AppPackData {
  /**
   * The PWA's first course. Modules written before packs (no `languages`, no `authoredPair`) are
   * authored in this language with its default native; the starter deck, the six-ways examples and
   * profiles stored before a language setting existed are in it too. Exactly one file sets it.
   */
  historicalCourse: boolean;
  /** learnDirection "en-target" modules (English for Work) teach this language. */
  workplaceCourse: boolean;
  /** Typing-field placeholders written in the language; null: English wording with the name. */
  typingPlaceholders: { typeIn: string; typeForm: string } | null;
  /** Letter buttons under a course cloze check; null: the pack's keyboard letters. */
  clozeLetters: string[] | null;
  /** Device voices preferred by name when the browser offers them. */
  preferredDeviceVoices: string[];
  /** Id of the recorded-audio reader serving this language (src/lib/recorded-audio.ts); null: none. */
  recordedAudio: string | null;
  /** The language has an HD listening voice (recordings first, then the HD cloud voice). */
  hdListening: boolean;
  /** Speaking curriculum built but awaiting sign-off (src/lib/speaking-review.ts). */
  speakingReviewPending: boolean;
  /** Id of the bundled dictionary dataset (DictionaryTab); null: the catalog dictionary, if any. */
  dictionary: string | null;
  /** Id of the compiled verb-pattern file (src/lib/verb-games/load-patterns.ts); null: none. */
  verbPatterns: string | null;
  /** Labels of the dictionary's six-person table, when the language authors its own. */
  referenceTableLabels: PersonLabels | null;
  /** Person labels while the language's pack carries no person-axis verb keys (legacy adapter). */
  personLabels: PersonLabels | null;
  /** Name of the past table a conjugation set carries (Preterite, Imperfect, ...). */
  pastTenseLabel: string | null;
  /** Authored lesson-reading tracks by native code (src/lib/lesson-reading.ts). */
  readingTracks: Record<string, string[]>;
  /** The library written for learners of this language ("esl-…" ids); null: the seed-<code> ids. */
  libraryIdPrefix: string | null;
  /** Speaking-partner lines written in the language. */
  phrases: {
    partnerSample?: { woman: string; man: string };
    missionClarification?: string;
    /** "Where does it hurt?" as a clinician asks it, quoted by the guide's medical flow. */
    whereDoesItHurt?: string;
  };
  /** Mission opening lines written in the language; null: no authored missions. */
  missions: MissionLines | null;
  /** Lesson-content prompt wording; null: the pack's variety and prompt fields only. */
  contentPrompt: ContentPromptNotes | null;
  /** Sentence-builder tokenization example ("私は学生です" → [...]). */
  sentenceBuilderExample: string | null;
  /** Core 60 generator profile id (src/lib/core60-generator-core.ts); null: no generator. */
  generator: string | null;
  /** Flag shown beside the language in menus, the library and matches; "" for none. */
  flag: string;
  /** Countries culture readings are set in. */
  countries: string[];
  /** Practice-match opponent display names. */
  opponentNames: string[];
  /** Note field placeholder written in the language. */
  notePlaceholder: string | null;
  /** BCP-47 tag for writing the language (keyboard, fonts, spellcheck); null: the pack code. */
  writingTag: string | null;
}

interface AppOverlayFile {
  code: string;
  app?: Partial<AppPackData>;
  pack?: Record<string, unknown>;
}

const DEFAULTS: AppPackData = {
  historicalCourse: false,
  workplaceCourse: false,
  typingPlaceholders: null,
  clozeLetters: null,
  preferredDeviceVoices: [],
  recordedAudio: null,
  hdListening: false,
  speakingReviewPending: false,
  dictionary: null,
  verbPatterns: null,
  referenceTableLabels: null,
  personLabels: null,
  pastTenseLabel: null,
  readingTracks: {},
  libraryIdPrefix: null,
  phrases: {},
  missions: null,
  contentPrompt: null,
  sentenceBuilderExample: null,
  generator: null,
  flag: "",
  countries: [],
  opponentNames: [],
  notePlaceholder: null,
  writingTag: null,
};

const FILES: readonly AppOverlayFile[] = [
  app_de,
  app_en,
  app_es,
  app_fr,
  app_it,
  app_ja,
  app_ko,
  app_ps,
  app_pt,
  app_zh,
] as readonly AppOverlayFile[];

const BY_CODE = new Map(
  FILES.map((file) => [file.code, { ...DEFAULTS, ...file.app } as AppPackData] as const),
);
const OVERRIDES = new Map(FILES.map((file) => [file.code, file.pack] as const));

if (FILES.filter((file) => file.app?.historicalCourse).length !== 1)
  throw new Error("Exactly one language app file must set historicalCourse");
if (FILES.filter((file) => file.app?.workplaceCourse).length !== 1)
  throw new Error("Exactly one language app file must set workplaceCourse");

/** This app's data for a language (defaults when it has no file). */
export function appData(pack: Pick<LanguagePack, "code">): AppPackData {
  return BY_CODE.get(pack.code) ?? DEFAULTS;
}

/** Codes of the languages whose app file sets `flag`. */
export function appCodesWith(flag: "historicalCourse" | "workplaceCourse"): string[] {
  return FILES.filter((file) => file.app?.[flag]).map((file) => file.code);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith("_")) continue;
    out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

/** A bundled pack with this app's corrections (the file's `pack` block) applied. */
export function withAppCorrections(pack: LanguagePack): LanguagePack {
  const patch = OVERRIDES.get(pack.code);
  return patch ? deepMerge(pack, patch) : pack;
}

/** The flag of a language by stored name or code ("" when it has none). */
export function flagOf(pack: Pick<LanguagePack, "code"> | null): string {
  return pack ? appData(pack).flag : "";
}
