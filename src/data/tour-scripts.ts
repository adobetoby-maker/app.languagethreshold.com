import type { TabKey } from "@/state/app-state";

export interface TourStep {
  target: TabKey | "xp-badge" | "streak-badge";
  title: string;
  body: string;
  tabKey?: TabKey;
  cta?: string;
}

// ─── Shared single-step definitions ─────────────────────────────────────────

const S: Record<string, TourStep> = {
  guide: {
    target: "guide",
    title: "App Guide — Start Here",
    body: "Your orientation hub. Shows your current lesson, daily flow, module-specific tips, and this walkthrough. Come back anytime you're not sure what to do next.",
    tabKey: "guide",
    cta: "Open Guide",
  },
  dashboard: {
    target: "dashboard",
    title: "Dashboard — Your Progress",
    body: "XP, streak, tier (Beginner → Maestro), achievements, and a 7-day activity chart. Open this first every session — it keeps you honest about consistency.",
    tabKey: "dashboard",
    cta: "See My Progress",
  },
  missionary: {
    target: "missionary",
    title: "Missionary Home",
    body: "Your module hub — structured lessons for the Restoration, Plan of Salvation, baptism commitments, and more. The Core 30 curriculum lives here.",
    tabKey: "missionary",
    cta: "Go to Mission Home",
  },
  fieldPrep: {
    target: "fieldPrep",
    title: "Field Prep — Voice Roleplay",
    body: "The AI plays a real person in your specialty — patient, client, athlete, or investigator. Voice mode on means it's a full hands-free spoken conversation. Your most important daily practice tool.",
    tabKey: "fieldPrep",
    cta: "Start Field Prep",
  },
  discussions: {
    target: "discussions",
    title: "Discussions",
    body: "Practice the six missionary discussions with an AI partner. It asks questions, pushes back on commitments, and gives feedback on doctrinal accuracy and language.",
    tabKey: "discussions",
    cta: "Practice Discussions",
  },
  orthopedics: {
    target: "orthopedics",
    title: "Specialty Module",
    body: "Your field-specific vocabulary — anatomy, clinical terms, patient-facing phrases. Start here for a focused drill of the 50 most-used terms in your specialty.",
    tabKey: "orthopedics",
    cta: "Go to Module",
  },
  reader: {
    target: "reader",
    title: "Reader",
    body: "Parallel text side-by-side in both languages. Tap any word for an instant definition — tapped words automatically go to Word Match for spaced-repetition review later.",
    tabKey: "reader",
    cta: "Open Reader",
  },
  story: {
    target: "story",
    title: "Daily Story",
    body: "A new short story every day, leveled to your progress. Reading in context builds retention far better than word lists alone. Takes about 5 minutes.",
    tabKey: "story",
    cta: "Read Today's Story",
  },
  grammar: {
    target: "grammar",
    title: "Grammar Studio",
    body: "Structured CEFR lessons from A1 to C2 — one rule per lesson, drilled with examples and exercises. Five consistent minutes here compounds into fluency over weeks.",
    tabKey: "grammar",
    cta: "Open Grammar",
  },
  patterns: {
    target: "patterns",
    title: "Grammar Patterns",
    body: "Master recurring sentence structures. One pattern unlocks hundreds of uses across every conversation. More practical than grammar rules for real speech.",
    tabKey: "patterns",
    cta: "Open Patterns",
  },
  conjugation: {
    target: "conjugation",
    title: "Conjugation Drills",
    body: "Drill any verb in every tense until conjugation is a reflex, not a calculation. Fluent speakers don't think about verb endings — they just speak. This is where that's built.",
    tabKey: "conjugation",
    cta: "Drill Verbs",
  },
  sentenceBuild: {
    target: "sentenceBuild",
    title: "Sentence Builder",
    body: "Rearrange scrambled sentences to lock in word-order intuition. Trains you to think in the language rather than translating from English word by word.",
    tabKey: "sentenceBuild",
    cta: "Build Sentences",
  },
  listeningDrill: {
    target: "listeningDrill",
    title: "Listening Drill",
    body: "Hear real dialogue and respond or transcribe. Understanding a native speaker in full flow is a separate skill from vocabulary — it requires dedicated ear training.",
    tabKey: "listeningDrill",
    cta: "Train Your Ear",
  },
  speak: {
    target: "speak",
    title: "Speak & Learn — Core First",
    body: "For Spanish, Italian, and English, start in Core Speaking: essential verbs, high-use grammar patterns, 53 daily-life situations, and 8 relationships and intimacy conversations. Japanese Core Speaking appears after its curriculum review gate is approved. Move into specialty missions when the foundation feels automatic.",
    tabKey: "speak",
    cta: "Start Speaking",
  },
  penpal: {
    target: "penpal",
    title: "Pen Pal Practice",
    body: "Write a message as if writing to a friend. The AI tutor gives live feedback on every sentence — grammar, word choice, naturalness. Written output is its own skill.",
    tabKey: "penpal",
    cta: "Start Writing",
  },
  wordMatch: {
    target: "wordMatch",
    title: "Word Match",
    body: "Spaced-repetition flash cards. Words you tap anywhere in the app — Reader, Field Prep, Daily Story — appear here automatically. The algorithm surfaces difficult words more often until they stick.",
    tabKey: "wordMatch",
    cta: "Review Words",
  },
  idiomMaster: {
    target: "idiomMaster",
    title: "Idiom Master",
    body: "Learn the idioms and expressions native speakers actually use day-to-day. Textbooks skip most of these — but they're what makes you sound natural, not just correct.",
    tabKey: "idiomMaster",
    cta: "Learn Idioms",
  },
  falseFriends: {
    target: "falseFriends",
    title: "False Friends",
    body: "Words that look like English but mean something different — like 'embarazada' (pregnant, not embarrassed). These trip up learners constantly. Learn them once and stop making the mistake.",
    tabKey: "falseFriends",
    cta: "Avoid Mistakes",
  },
  games: {
    target: "games",
    title: "Games Hub",
    body: "Mini-games that make vocabulary review feel like play. Good for a 5-minute break or commute. All games reinforce the same words you're studying in other tabs.",
    tabKey: "games",
    cta: "Play a Game",
  },
};

// ─── LDS Missionary Tour — all 14 icons ──────────────────────────────────────

export const LDS_MISSIONARY_TOUR: TourStep[] = [
  S.guide,
  S.dashboard,
  S.missionary,
  S.fieldPrep,
  S.discussions,
  S.reader,
  S.story,
  S.grammar,
  S.patterns,
  S.conjugation,
  S.sentenceBuild,
  S.listeningDrill,
  S.speak,
  S.penpal,
  S.wordMatch,
  S.idiomMaster,
  S.falseFriends,
  S.games,
];

// ─── Medical Tour — all core + specialty ─────────────────────────────────────

export const MEDICAL_TOUR: TourStep[] = [
  S.guide,
  S.dashboard,
  S.orthopedics,
  S.fieldPrep,
  S.reader,
  S.story,
  S.listeningDrill,
  S.sentenceBuild,
  S.speak,
  S.penpal,
  S.grammar,
  S.patterns,
  S.conjugation,
  S.wordMatch,
  S.idiomMaster,
  S.falseFriends,
  S.games,
];

// ─── Construction / Trades Tour ──────────────────────────────────────────────

export const TRADES_TOUR: TourStep[] = [
  S.guide,
  S.dashboard,
  S.fieldPrep,
  S.reader,
  S.story,
  S.sentenceBuild,
  S.speak,
  S.listeningDrill,
  S.penpal,
  S.grammar,
  S.patterns,
  S.conjugation,
  S.wordMatch,
  S.idiomMaster,
  S.falseFriends,
  S.games,
];

// ─── Sports Coaching Tour ─────────────────────────────────────────────────────

export const SPORTS_TOUR: TourStep[] = [
  S.guide,
  S.dashboard,
  S.fieldPrep,
  S.reader,
  S.story,
  S.sentenceBuild,
  S.speak,
  S.listeningDrill,
  S.penpal,
  S.grammar,
  S.patterns,
  S.conjugation,
  S.wordMatch,
  S.idiomMaster,
  S.falseFriends,
  S.games,
];

// ─── Default Tour — all 16 core icons ────────────────────────────────────────

export const DEFAULT_TOUR: TourStep[] = [
  S.guide,
  S.dashboard,
  S.reader,
  S.story,
  S.grammar,
  S.patterns,
  S.conjugation,
  S.sentenceBuild,
  S.listeningDrill,
  S.speak,
  S.penpal,
  S.wordMatch,
  S.idiomMaster,
  S.falseFriends,
  S.games,
];

// ─── Selector ────────────────────────────────────────────────────────────────

const MEDICAL_MODULE_IDS = [
  "orthopedics",
  "nursing",
  "emergency-medicine",
  "family-medicine",
  "fmg",
  "ob-gyn",
  "cardiology",
  "general-surgery",
  "physical-therapy",
  "pain-management",
  "medical-receptionist",
  "or-evs",
];

const TRADES_MODULE_IDS = [
  "construction-foreman",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "framer",
  "construction-safety",
];

const SPORTS_MODULE_IDS = ["soccer", "baseball", "hockey", "tennis"];

export function getTourScript(moduleId: string | null): TourStep[] {
  if (moduleId === "lds-missionary") return LDS_MISSIONARY_TOUR;
  if (moduleId && MEDICAL_MODULE_IDS.includes(moduleId)) return MEDICAL_TOUR;
  if (moduleId && TRADES_MODULE_IDS.includes(moduleId)) return TRADES_TOUR;
  if (moduleId && SPORTS_MODULE_IDS.includes(moduleId)) return SPORTS_TOUR;
  return DEFAULT_TOUR;
}
