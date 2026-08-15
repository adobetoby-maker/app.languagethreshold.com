import { lazy, type ComponentType } from "react";
import type { TabKey } from "@/state/app-state";

export type LearningStage = "Understand" | "Remember" | "Use" | "Grow" | "Specialize";
export type ActivityAccent = "reading" | "remember" | "speaking" | "progress" | "specialty";

export interface ToolMetadata {
  key: TabKey;
  name: string;
  purpose: string;
  stage: LearningStage;
  accent: ActivityAccent;
  gate?: {
    moduleIds: string[];
    description: string;
  };
}

const FIELD_PREP_MODULE_IDS = [
  "lds-missionary",
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
  "construction-foreman",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "framer",
  "construction-safety",
  "soccer",
  "baseball",
  "hockey",
  "tennis",
];

export const TOOL_CATALOG: Record<TabKey, ToolMetadata> = {
  reader: {
    key: "reader",
    name: "Reader",
    purpose: "Understand real text one word and sentence at a time.",
    stage: "Understand",
    accent: "reading",
  },
  grammar: {
    key: "grammar",
    name: "Grammar Studio",
    purpose: "Discover the patterns behind what you are reading.",
    stage: "Understand",
    accent: "reading",
  },
  story: {
    key: "story",
    name: "Daily Story",
    purpose: "Build reading fluency with a short story at your level.",
    stage: "Understand",
    accent: "reading",
  },
  dictionary: {
    key: "dictionary",
    name: "Dictionary",
    purpose: "Check forms, meanings, and usage when you need a precise reference.",
    stage: "Understand",
    accent: "reading",
  },
  cognates: {
    key: "cognates",
    name: "Cognate Bridge",
    purpose: "Turn familiar word roots into faster comprehension.",
    stage: "Understand",
    accent: "reading",
  },
  patterns: {
    key: "patterns",
    name: "Grammar Patterns",
    purpose: "Notice and rehearse reusable sentence patterns.",
    stage: "Understand",
    accent: "reading",
  },
  flashcards: {
    key: "flashcards",
    name: "Flashcards",
    purpose: "Strengthen recall before the words you saved fade.",
    stage: "Remember",
    accent: "remember",
  },
  wordMatch: {
    key: "wordMatch",
    name: "Word Match",
    purpose: "Build fast links between words and their meanings.",
    stage: "Remember",
    accent: "remember",
  },
  idiomMaster: {
    key: "idiomMaster",
    name: "Idiom Master",
    purpose: "Recognize expressions whose meaning is bigger than each word.",
    stage: "Remember",
    accent: "remember",
  },
  falseFriends: {
    key: "falseFriends",
    name: "False Friends",
    purpose: "Catch familiar-looking words that do not mean what you expect.",
    stage: "Remember",
    accent: "remember",
  },
  conjugation: {
    key: "conjugation",
    name: "Conjugation",
    purpose: "Make high-frequency verb forms easier to recall under pressure.",
    stage: "Remember",
    accent: "remember",
  },
  listeningDrill: {
    key: "listeningDrill",
    name: "Listening Drill",
    purpose: "Train your ear to recognize language at natural speed.",
    stage: "Use",
    accent: "speaking",
  },
  sentenceBuild: {
    key: "sentenceBuild",
    name: "Sentence Builder",
    purpose: "Turn known words into complete, useful sentences.",
    stage: "Use",
    accent: "speaking",
  },
  speak: {
    key: "speak",
    name: "Speak & Learn",
    purpose: "Practice turning recognition into spoken language.",
    stage: "Use",
    accent: "speaking",
  },
  penpal: {
    key: "penpal",
    name: "Pen Pal Practice",
    purpose: "Use your vocabulary and grammar in meaningful writing.",
    stage: "Use",
    accent: "speaking",
  },
  games: {
    key: "games",
    name: "Games Hub",
    purpose: "Build speed and confidence through short challenges.",
    stage: "Use",
    accent: "speaking",
  },
  kana: {
    key: "kana",
    name: "Kana",
    purpose: "Build the character recognition and writing needed for Japanese.",
    stage: "Use",
    accent: "speaking",
  },
  characters: {
    key: "characters",
    name: "Character Studio",
    purpose: "Study kanji and hanzi with radicals, stroke order, and mnemonics.",
    stage: "Use",
    accent: "speaking",
  },
  dashboard: {
    key: "dashboard",
    name: "Dashboard",
    purpose: "See what you have learned and what to practice next.",
    stage: "Grow",
    accent: "progress",
  },
  guide: {
    key: "guide",
    name: "Complete Toolkit",
    purpose: "See how every learning tool fits into your next step.",
    stage: "Grow",
    accent: "progress",
  },
  modules: {
    key: "modules",
    name: "Specialty Modules",
    purpose: "Focus your reading and practice around a profession or real-world goal.",
    stage: "Specialize",
    accent: "specialty",
  },
  missionary: {
    key: "missionary",
    name: "Missionary",
    purpose: "Prepare language for lessons, scripture, and respectful field conversations.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["lds-missionary"], description: "Choose the Missionary module" },
  },
  discussions: {
    key: "discussions",
    name: "Discussions",
    purpose: "Practice structured missionary teaching conversations.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["lds-missionary"], description: "Choose the Missionary module" },
  },
  orthopedics: {
    key: "orthopedics",
    name: "Orthopedics",
    purpose: "Practice accurate clinical language for orthopedic care.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["orthopedics"], description: "Choose the Orthopedics module" },
  },
  anatomy: {
    key: "anatomy",
    name: "Anatomy",
    purpose: "Connect body structures with the language used to discuss them.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["orthopedics"], description: "Choose the Orthopedics module" },
  },
  fieldPrep: {
    key: "fieldPrep",
    name: "Field Prep",
    purpose: "Rehearse the conversations your real setting demands.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: FIELD_PREP_MODULE_IDS, description: "Choose a supported specialty module" },
  },
  soccer: {
    key: "soccer",
    name: "Soccer",
    purpose: "Learn the commands, tactics, and vocabulary used on the field.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["soccer"], description: "Choose the Soccer module" },
  },
  baseball: {
    key: "baseball",
    name: "Baseball",
    purpose: "Practice positions, coaching language, and game-day communication.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["baseball"], description: "Choose the Baseball module" },
  },
  orEvs: {
    key: "orEvs",
    name: "OR & EVS",
    purpose: "Prepare precise language for sterile-field and hospital support work.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["or-evs"], description: "Choose the OR & EVS module" },
  },
  fmg: {
    key: "fmg",
    name: "FMG Clinical English",
    purpose: "Practice clear US clinical communication for international physicians.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["fmg"], description: "Choose the FMG module" },
  },
  climbing: {
    key: "climbing",
    name: "Rock Climbing",
    purpose: "Practice safety commands, gear vocabulary, and climbing conversations.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["rock-climbing"], description: "Choose the Rock Climbing module" },
  },
  fishing: {
    key: "fishing",
    name: "Sport Fishing",
    purpose: "Learn gear, conditions, and communication for time on the water.",
    stage: "Specialize",
    accent: "specialty",
    gate: { moduleIds: ["sport-fishing"], description: "Choose the Sport Fishing module" },
  },
};

export const TOOL_CATALOG_LIST = Object.values(TOOL_CATALOG);

export function isToolAvailable(tool: ToolMetadata, activeModuleId: string | null) {
  return !tool.gate || (!!activeModuleId && tool.gate.moduleIds.includes(activeModuleId));
}

const ParallelReader = lazy(() =>
  import("./reader/ParallelReader").then((m) => ({ default: m.ParallelReader })),
);
const GrammarStudio = lazy(() =>
  import("./grammar/GrammarStudio").then((m) => ({ default: m.GrammarStudio })),
);
const SpeakLearn = lazy(() =>
  import("./speak/SpeakLearn").then((m) => ({ default: m.SpeakLearn })),
);
const Dashboard = lazy(() =>
  import("./dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const MissionaryDiscussions = lazy(() =>
  import("./missionary/MissionaryDiscussions").then((m) => ({
    default: m.MissionaryDiscussions,
  })),
);
const MissionaryHome = lazy(() =>
  import("./missionary/MissionaryHome").then((m) => ({ default: m.MissionaryHome })),
);
const OrthopedicsHome = lazy(() =>
  import("./orthopedics/OrthopedicsHome").then((m) => ({ default: m.OrthopedicsHome })),
);
const AnatomyQuizPanel = lazy(() =>
  import("./anatomy/AnatomyQuizPanel").then((m) => ({ default: m.AnatomyQuizPanel })),
);
const ModulesPage = lazy(() =>
  import("./modules/ModulesPage").then((m) => ({ default: m.ModulesPage })),
);
const KanaPad = lazy(() => import("./kana/KanaPad").then((m) => ({ default: m.KanaPad })));
const CharacterStudio = lazy(() =>
  import("./characters/CharacterStudio").then((m) => ({ default: m.CharacterStudio })),
);
const ConjugationGame = lazy(() =>
  import("./conjugation/ConjugationGame").then((m) => ({ default: m.ConjugationGame })),
);
const SentenceBuilder = lazy(() =>
  import("./sentence-build/SentenceBuilder").then((m) => ({ default: m.SentenceBuilder })),
);
const GamesHub = lazy(() => import("./games/GamesHub").then((m) => ({ default: m.GamesHub })));
const ListeningDrill = lazy(() =>
  import("./listening-drill/ListeningDrill").then((m) => ({ default: m.ListeningDrill })),
);
const WordMatch = lazy(() =>
  import("./word-match/WordMatch").then((m) => ({ default: m.WordMatch })),
);
const IdiomMaster = lazy(() =>
  import("./idiom-master/IdiomMaster").then((m) => ({ default: m.IdiomMaster })),
);
const FalseFriends = lazy(() =>
  import("./false-friends/FalseFriends").then((m) => ({ default: m.FalseFriends })),
);
const SoccerHome = lazy(() =>
  import("./soccer/SoccerHome").then((m) => ({ default: m.SoccerHome })),
);
const BaseballHome = lazy(() =>
  import("./baseball/BaseballHome").then((m) => ({ default: m.BaseballHome })),
);
const OrEvsHome = lazy(() => import("./or-evs/OrEvsHome").then((m) => ({ default: m.OrEvsHome })));
const FmgHome = lazy(() => import("./fmg/FmgHome").then((m) => ({ default: m.FmgHome })));
const PenPalPad = lazy(() => import("./penpal/PenPalPad").then((m) => ({ default: m.PenPalPad })));
const PatternLab = lazy(() =>
  import("./patterns/PatternLab").then((m) => ({ default: m.PatternLab })),
);
const CognateBridge = lazy(() =>
  import("./cognates/CognateBridge").then((m) => ({ default: m.CognateBridge })),
);
const DailyStory = lazy(() =>
  import("./story/DailyStory").then((m) => ({ default: m.DailyStory })),
);
const AppGuide = lazy(() => import("./guide/AppGuide").then((m) => ({ default: m.AppGuide })));
const ClimbingHome = lazy(() =>
  import("./climbing/ClimbingHome").then((m) => ({ default: m.ClimbingHome })),
);
const FishingHome = lazy(() =>
  import("./fishing/FishingHome").then((m) => ({ default: m.FishingHome })),
);
const FieldPrepRouter = lazy(() =>
  import("./modules/FieldPrepRouter").then((m) => ({ default: m.FieldPrepRouter })),
);
const DictionaryTab = lazy(() =>
  import("./dictionary/DictionaryTab").then((m) => ({ default: m.DictionaryTab })),
);
const FlashcardsStudio = lazy(() =>
  import("./flashcards/FlashcardsStudio").then((m) => ({ default: m.FlashcardsStudio })),
);

export const TAB_COMPONENTS: Record<TabKey, ComponentType> = {
  missionary: MissionaryHome,
  orthopedics: OrthopedicsHome,
  reader: ParallelReader,
  grammar: GrammarStudio,
  speak: SpeakLearn,
  discussions: MissionaryDiscussions,
  dashboard: Dashboard,
  anatomy: AnatomyQuizPanel,
  modules: ModulesPage,
  kana: KanaPad,
  characters: CharacterStudio,
  conjugation: ConjugationGame,
  sentenceBuild: SentenceBuilder,
  games: GamesHub,
  listeningDrill: ListeningDrill,
  wordMatch: WordMatch,
  idiomMaster: IdiomMaster,
  falseFriends: FalseFriends,
  soccer: SoccerHome,
  baseball: BaseballHome,
  orEvs: OrEvsHome,
  fmg: FmgHome,
  penpal: PenPalPad,
  patterns: PatternLab,
  cognates: CognateBridge,
  story: DailyStory,
  guide: AppGuide,
  climbing: ClimbingHome,
  fishing: FishingHome,
  fieldPrep: FieldPrepRouter,
  dictionary: DictionaryTab,
  flashcards: FlashcardsStudio,
};

if (import.meta.env.DEV) {
  for (const [key, Component] of Object.entries(TAB_COMPONENTS)) {
    if (typeof Component !== "function" && typeof Component !== "object") {
      console.error(`[tab-registry] Tab "${key}" did not resolve to a component.`);
    }
  }
}
