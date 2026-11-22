// Built by TAC — 2026-11-21
// The runtime language pack (language-pack model section 5): the catalog's "pack" object, which is
// the profile in core60-languages/languages/<code>.json minus its pipeline, release and review
// sections. Every language decision in the app reads one of these fields; no code compares a
// language name or code literal. Generated packs live next to this file (<code>.json); read them
// through ./index.ts.

export type AccentMode = "strict" | "fold" | "fold-except-protected";
export type Availability = "hidden" | "draft" | "native" | "online";

export interface VerbFormKey {
  key: string;
  label: string;
  imperativeLabel?: string;
  order: number;
  required: boolean;
  person?: 1 | 2 | 3;
  number?: "singular" | "plural";
  formal?: boolean;
  subjects?: string[];
  assessment?: boolean;
}

export interface LanguagePack {
  schemaVersion: 1;
  code: string;
  name: string;
  endonym: string;
  legacyNames: string[];
  native: { default: string; supported: string[]; names: Record<string, string> };
  variety: {
    tag: string;
    label: string;
    standard: string;
    alternates: { tag: string; label: string; taught: boolean; note?: string }[];
    avoid: string[];
  };
  status: { availability: Availability; speakAvailability: Availability; statusText: string };
  script: {
    iso15924: string[];
    direction: "ltr" | "rtl";
    wordSeparator: "space" | "none";
    hasCase: boolean;
    capitalizeNouns: boolean;
    segmenterLocale: string;
    readingAid: "none" | "furigana";
  };
  typography: {
    apostrophe: string;
    apostropheVariants: string[];
    spaceVariants: string[];
    quotes: string[];
    spaceBeforePunctuation: string[];
    punctuationSpace: string;
    trimCharacters: string;
    invertedPunctuation: boolean;
    wordInnerCharacters: string[];
    numberStyle: string;
  };
  keyboard: {
    ime: boolean;
    autocapitalization: "never" | "sentences" | "words";
    specialCharacters: string[];
    alphabet: string;
  };
  grammar: {
    verbForms: {
      axis: "person" | "form";
      keys: VerbFormKey[];
      includesSubject: boolean;
      imperativeIncludesSubject: boolean;
      formLeadWords: string[];
      imperativeKeys: string[];
      referenceTableTitle: string;
      assessmentPrompt: string;
      joinRules: { subject: string; beforePattern: string; replaceWith: string }[];
    };
    proDrop: "full" | "partial" | "none" | "n/a";
    subjectPronouns: Record<string, string[]>;
    preVerbParticles: string[];
    reflexivePronouns: string[];
    nounSystem: {
      type: "gender" | "noun-class" | "none";
      contentRule: "article-with-noun" | "class-note" | "bare";
      genders: string[];
      cases: string[];
      classes: { id: string; prefix: string; plural?: string; use: string; example?: string }[];
      articles: {
        definite?: string[];
        indefinite?: string[];
        partitive?: string[];
        contractions?: Record<string, string>;
        byCase?: Record<string, Record<string, string>>;
      };
      hiddenGenderMarkers: Record<string, string>;
    };
    formality: {
      forms: { id: string; pronoun: string; verbKey?: string; use: string }[];
      fromSpanish: Record<string, string>;
      patients: string;
      crew: string;
    };
    impersonalForms: string[];
    extraVerbForms: Record<string, string>[];
  };
  answerRules: {
    tokenizer: "words" | "graphemes";
    unicodeNormalization: "NFC" | "NFKC";
    caseHint: boolean;
    accentPolicy: { typed: AccentMode; speech: AccentMode; handwriting: AccentMode };
    accentHint: boolean;
    markName: string;
    fold: Record<string, string>;
    neverFold: string[];
    ligatures: Record<string, string>;
    typedAlternates: Record<string, string>;
    protectedPairs: string[][];
    articleOptional: "accept" | "hint" | "off";
    soundRules: { from: string; to: string; at: "any" | "start" | "end" }[];
    homophoneSets: string[][];
    speechScoring: {
      soundEquivalentCredit: number;
      similarityFloor: number;
      similarityCredit: number;
      minWordLength: number;
    };
    ocrConfusables: string[][];
    moreDetailKeywords: string[];
  };
  speech: {
    recognition: {
      mode: "on-device" | "none";
      languageCode: string;
      locales: string[];
      dictationName: string;
      keyboardName: string;
      fallback: "listen-and-compare" | "self-check";
    };
    tts: {
      languageCode: string;
      locales: string[];
      deviceVoice: boolean;
      rate: { normal: number; slow: number };
    };
    accents: { tag: string; label: string; default: boolean }[];
    handwriting: { mode: "vision" | "latin-fallback" | "self-check"; visionLanguages: string[] };
    partnerVoice: {
      available: boolean;
      provider: string | null;
      locale: string | null;
      female: string | null;
      male: string | null;
    };
    offlineVoices: {
      defaultEngine: "phonon" | "kokoro" | "device" | "none";
      phonon: unknown | null;
      kokoro: unknown | null;
    };
    remoteFallback: { provider: string; voiceId: string; languageCode: string } | null;
  };
  audio: {
    folder: string;
    manifest: string;
    watchFolder: string;
    voices: { id: string; label: string; gender: string; locale: string }[];
    coverage: "none" | "partial" | "full";
    requireReviewed: boolean;
    legacy: { manifest: string; folder: string; watchFolder: string } | null;
  };
  dictionary: {
    file: string | null;
    supplement: string | null;
    morphology: string | null;
    lookup: { elisionPrefixes: string[]; stripArticles: boolean; stripPrefixes: string[] };
    crossModuleIndex: boolean;
  };
  content: {
    catalog: string;
    lessonSourceRoot: string;
    missions: string | null;
    readerLibrary: string | null;
    partnerPack: string | null;
    sentencePatterns: string | null;
    placementGame: string | null;
    cmeActivities: string | null;
    guideTips: string | null;
    readingTracks: string | null;
    settingsGuide: string | null;
  };
  library: {
    defaultModule: string;
    coreBasics: string[];
    intro: string;
    guidance: Record<string, string>;
  };
  ids: {
    lessonPrefix: string;
    activity: string;
    legacyActivityPrefixes: string[];
    mission: string;
    missionCode: string;
    storageNamespace: string;
    legacyUnscopedStorage: boolean;
  };
  phrases: {
    register: string;
    soundCheckWord: string;
    soundCheckSentence: string;
    voicePreview: string;
    partnerPreview: string;
    clarification: string;
    greeting: string;
    paceCommands: { slower: string[]; normal: string[]; faster: string[]; simpler: string[] };
  };
  prompts: { languageName: string; replyInstruction: string; scriptNote: string; varietyNote: string };
  contentChecks: {
    targetMarkers: string;
    nativeMarkers: Record<string, string>;
    infinitivePattern: string;
    pronounFirstPattern: string;
  };
  features: {
    speaking: "native" | "web" | "none";
    speakingMissions: boolean;
    partnerChat: boolean;
    onlineTutor: boolean;
    verbsTab: boolean;
    placementGame: boolean;
    kanaPad: boolean;
    verbGames: boolean;
    handwriting: boolean;
  };
  branding?: Record<string, { productName: string; tagline: string; filePrefix: string }>;
}

/** One row of packs.json (the pipeline's out/packs.json): list languages without opening a catalog. */
export interface PackIndexEntry {
  code: string;
  name: string;
  endonym: string;
  availability: Availability;
  speakAvailability: Availability;
  catalog: string;
  packVersion: string;
  modules: {
    id: string;
    lessonCount: number;
    /** Catalog title ("French 101 · Start from zero"). */
    title?: string;
    /** Library group: core-basics, grammar, conjugation, cognates, medical, trade. */
    group?: string;
    /** Lessons per stage (foundation, working, master). */
    stages?: { foundation: number; working: number; master: number };
  }[];
}
