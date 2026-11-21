// Built by TAC — 2026-11-21
// legacyPack adapter (language-pack model section 5, "Tables are deleted per language, not all at
// once"). The PWA teaches targets that have no reviewed profile yet (German, Portuguese, Chinese,
// Korean, Pashto, English), and French/Italian have only QA drafts. Until a language has a bundled
// pack its build may show, this adapter builds a pack object from the tables the app already used
// for it, so it behaves exactly as before. A language's row here is deleted when its reviewed pack
// ships (scripts/import-language-packs.mjs); the file is gone when the table is empty.
//
// Neutral defaults reproduce the PWA's language-neutral code paths: no accent folding in speech, no
// sound rules, edit-distance credit only, words tokenizer for Latin scripts, graphemes for CJK.

import type { LanguagePack } from "./types.ts";

interface LegacyRow {
  code: string;
  name: string;
  endonym: string;
  script: "Latn" | "Hani" | "Hang" | "Arab";
  accents: string[];
  specialCharacters: string[];
  /** Native explanation language the PWA pairs with this target by default. */
  nativeDefault: string;
  /** Every native the PWA's courses for this target are explained in (default: nativeDefault). */
  nativeSupported?: readonly string[];
  /** Stage ids of this language were written without a language suffix (manifest entries exist). */
  legacyUnscopedStorage: boolean;
  remoteFallback?: LanguagePack["speech"]["remoteFallback"];
  /** [key, label, subject pronouns] per required person form, in learning order. */
  verbForms?: readonly (readonly [string, string, readonly string[]])[];
  contentChecks?: LanguagePack["contentChecks"];
  /** Articles and leading words a headword lookup ignores ("the switch", "to cut"). */
  lookup?: { articles: readonly string[]; stripPrefixes: readonly string[] };
  /** The PWA already offers authored scenario speaking missions in this language. */
  speakingMissions?: boolean;
}

// English as a target (values moved from lesson-content-core.ts: ENGLISH_FORM_KEYS, FORM_LABELS,
// ENGLISH_MARKERS, SPANISH_MARKERS and the English verb rules).
const ENGLISH_VERB_FORMS = [
  ["i", "I", ["i"]],
  ["you", "you", ["you"]],
  ["he_she", "he / she", ["he", "she", "it"]],
  ["we", "we", ["we"]],
  ["they", "they", ["they"]],
] as const;
const ENGLISH_CHECKS: LanguagePack["contentChecks"] = {
  targetMarkers:
    "\\b(the|and|with|is|are|use|form|verb|command|stem|change|to|of|it|in|for|this|when|means|your|as|say|not|he|his|her|used|usually|often|like|after|before|also|only|than)\\b",
  nativeMarkers: {
    es: "\\b(es|muy|verbo|cambio|mandato|los|las|para|del|cuando|forma|la|el|que|con|se|una|un|en|por|pero|este|esta|tiene|persona|significa|termina)\\b",
  },
  infinitivePattern: "^(?!to\\s)[a-z]+( [a-z]+)?$",
  pronounFirstPattern: "^(i|you|he|she|it|we|they)\\s",
};

// Values copied from the PWA tables they replace: ACCENTS_BY_LANGUAGE (src/state/speech-state.tsx),
// SPECIAL_CHARS_BY_LANGUAGE and LANG_TAGS (src/lib/lesson-words-core.ts), REMOTE_TTS_BY_FAMILY
// (src/lib/tts.ts) and the ElevenLabs voice (src/lib/remote-speech-provider.ts).
const LEGACY_ROWS: readonly LegacyRow[] = [
  { code: "fr", name: "French", endonym: "français", script: "Latn", accents: ["fr-FR", "fr-CA"],
    specialCharacters: ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "ù", "û", "œ"],
    nativeDefault: "en", legacyUnscopedStorage: false },
  { code: "de", name: "German", endonym: "Deutsch", script: "Latn", accents: ["de-DE", "de-AT", "de-CH"],
    specialCharacters: ["ä", "ö", "ü", "ß"], nativeDefault: "en", legacyUnscopedStorage: false },
  { code: "it", name: "Italian", endonym: "italiano", script: "Latn", accents: ["it-IT"],
    specialCharacters: ["à", "è", "é", "ì", "ò", "ù"], nativeDefault: "en", legacyUnscopedStorage: false,
    speakingMissions: true },
  { code: "zh", name: "Chinese", endonym: "中文", script: "Hani", accents: ["zh-CN"],
    specialCharacters: [], nativeDefault: "en", legacyUnscopedStorage: false, speakingMissions: true },
  { code: "ko", name: "Korean", endonym: "한국어", script: "Hang", accents: ["ko-KR"],
    specialCharacters: [], nativeDefault: "en", legacyUnscopedStorage: false },
  { code: "pt", name: "Portuguese", endonym: "português", script: "Latn", accents: ["pt-BR", "pt-PT"],
    specialCharacters: ["á", "â", "ã", "à", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú"],
    nativeDefault: "en", legacyUnscopedStorage: false },
  { code: "ps", name: "Pashto", endonym: "پښتو", script: "Arab", accents: ["ps-AF"],
    specialCharacters: [], nativeDefault: "en", legacyUnscopedStorage: false,
    remoteFallback: { provider: "elevenlabs", voiceId: "XrExE9yKIg1WjnnlVkGX", languageCode: "ps" } },
  { code: "en", name: "English", endonym: "English", script: "Latn",
    accents: ["en-US", "en-GB", "en-CA", "en-IE", "en-AU", "en-NZ", "en-ZA"],
    specialCharacters: [], nativeDefault: "es", legacyUnscopedStorage: true,
    // The English-for-work modules are written for these natives (modules.ts nativeLanguages).
    nativeSupported: ["es", "ar", "hi", "zh", "pt"],
    verbForms: ENGLISH_VERB_FORMS, contentChecks: ENGLISH_CHECKS,
    lookup: { articles: ["the", "a", "an"], stripPrefixes: ["to"] }, speakingMissions: true },
];

export const LEGACY_PACK_CODES: readonly string[] = LEGACY_ROWS.map((row) => row.code);

function legacyPackFromRow(row: LegacyRow): LanguagePack {
  const cjk = row.script === "Hani" || row.script === "Hang";
  const rtl = row.script === "Arab";
  return {
    schemaVersion: 1,
    code: row.code,
    name: row.name,
    endonym: row.endonym,
    legacyNames: [row.name],
    native: {
      default: row.nativeDefault,
      supported: [...(row.nativeSupported ?? [row.nativeDefault])],
      names: {},
    },
    variety: { tag: row.accents[0], label: row.accents[0], standard: "", alternates: [], avoid: [] },
    // A legacy adapter keeps the course the PWA already offers; it carries no catalog.
    status: { availability: "online", speakAvailability: "online", statusText: "" },
    script: {
      iso15924: [row.script],
      direction: rtl ? "rtl" : "ltr",
      wordSeparator: cjk && row.script === "Hani" ? "none" : "space",
      hasCase: row.script === "Latn",
      capitalizeNouns: false,
      segmenterLocale: row.code,
      readingAid: "none",
    },
    typography: {
      apostrophe: "'",
      apostropheVariants: ["’", "ʼ", "‘"],
      spaceVariants: [" ", " "],
      quotes: [],
      spaceBeforePunctuation: [],
      punctuationSpace: "",
      trimCharacters: ".!?,;:\"“”«»()…",
      invertedPunctuation: false,
      wordInnerCharacters: [],
      numberStyle: "",
    },
    keyboard: {
      ime: cjk,
      autocapitalization: "never",
      specialCharacters: [...row.specialCharacters],
      alphabet: "",
    },
    grammar: {
      verbForms: {
        axis: "person",
        keys: (row.verbForms ?? []).map(([key, label, subjects], i) => ({
          key,
          label,
          order: i + 1,
          required: true,
          subjects: [...subjects],
          assessment: true,
        })),
        includesSubject: false,
        imperativeIncludesSubject: false,
        formLeadWords: [],
        imperativeKeys: [],
        referenceTableTitle: "Present tense",
        assessmentPrompt: "Which form goes with {label}?",
        joinRules: [],
      },
      proDrop: "n/a",
      subjectPronouns: {},
      preVerbParticles: [],
      reflexivePronouns: [],
      nounSystem: {
        type: "none",
        contentRule: "bare",
        genders: [],
        cases: [],
        classes: [],
        articles: { definite: [...(row.lookup?.articles ?? [])] },
        hiddenGenderMarkers: {},
      },
      formality: { forms: [], fromSpanish: {}, patients: "", crew: "" },
      impersonalForms: [],
      extraVerbForms: [],
    },
    answerRules: {
      tokenizer: cjk ? "graphemes" : "words",
      unicodeNormalization: cjk ? "NFKC" : "NFC",
      caseHint: false,
      // Today's PWA folds no marks for these languages in speech (speech-word-similarity.ts).
      accentPolicy: { typed: "fold", speech: "strict", handwriting: "strict" },
      accentHint: false,
      markName: "accent marks",
      fold: {},
      neverFold: [],
      ligatures: {},
      typedAlternates: {},
      protectedPairs: [],
      articleOptional: "off",
      soundRules: [],
      homophoneSets: [],
      speechScoring: {
        soundEquivalentCredit: 0.85,
        similarityFloor: 0.65,
        similarityCredit: 0.75,
        minWordLength: 4,
      },
      ocrConfusables: [],
      moreDetailKeywords: [],
    },
    speech: {
      recognition: {
        mode: "on-device",
        languageCode: row.code,
        locales: [...row.accents],
        dictationName: row.name,
        keyboardName: row.name,
        fallback: "self-check",
      },
      tts: {
        languageCode: row.code,
        locales: [...row.accents],
        deviceVoice: true,
        rate: { normal: 0.45, slow: 0.33 },
      },
      accents: row.accents.map((tag, i) => ({ tag, label: tag, default: i === 0 })),
      handwriting: { mode: "self-check", visionLanguages: [] },
      partnerVoice: { available: false, provider: null, locale: null, female: null, male: null },
      offlineVoices: { defaultEngine: "device", phonon: null, kokoro: null },
      remoteFallback: row.remoteFallback ?? null,
    },
    audio: {
      folder: "",
      manifest: "",
      watchFolder: "",
      voices: [],
      coverage: "none",
      requireReviewed: true,
      legacy: null,
    },
    dictionary: {
      file: null,
      supplement: null,
      morphology: null,
      lookup: {
        elisionPrefixes: [],
        stripArticles: Boolean(row.lookup),
        stripPrefixes: [...(row.lookup?.stripPrefixes ?? [])],
      },
      crossModuleIndex: false,
    },
    content: {
      catalog: `core60_${row.code}.json`,
      lessonSourceRoot: "",
      missions: null,
      readerLibrary: null,
      partnerPack: null,
      sentencePatterns: null,
      placementGame: null,
      cmeActivities: null,
      guideTips: null,
      readingTracks: null,
      settingsGuide: null,
    },
    library: { defaultModule: "", coreBasics: [], intro: "", guidance: {} },
    ids: {
      lessonPrefix: `${row.code}:`,
      activity: "core60:{code}:{native}:{module}:{n}",
      legacyActivityPrefixes: [],
      mission: "scenario_version_{module}_lesson_{n}_{missionCode}_v1",
      missionCode: row.code,
      storageNamespace: row.code,
      legacyUnscopedStorage: row.legacyUnscopedStorage,
    },
    phrases: {
      register: "",
      soundCheckWord: "",
      soundCheckSentence: "",
      voicePreview: "",
      partnerPreview: "",
      clarification: "",
      greeting: "",
      paceCommands: { slower: [], normal: [], faster: [], simpler: [] },
    },
    prompts: {
      languageName: row.name,
      replyInstruction: `Reply in ${row.name}.`,
      scriptNote: "",
      varietyNote: "",
    },
    contentChecks: row.contentChecks ?? { targetMarkers: "", nativeMarkers: {}, infinitivePattern: "", pronounFirstPattern: "" },
    features: {
      speaking: "web",
      speakingMissions: row.speakingMissions ?? false,
      partnerChat: false,
      onlineTutor: true,
      verbsTab: false,
      placementGame: false,
      kanaPad: false,
      verbGames: false,
      handwriting: false,
    },
  };
}

/** Adapter packs for every legacy row whose code is not in `bundledCodes`. */
export function legacyPacks(bundledCodes: ReadonlySet<string>): LanguagePack[] {
  return LEGACY_ROWS.filter((row) => !bundledCodes.has(row.code)).map(legacyPackFromRow);
}
