import { lazy, type ComponentType } from "react";
import type { TabKey } from "@/state/app-state";

/**
 * Each tab is rendered only when active, so we lazy-load every tab component
 * via `React.lazy` + dynamic `import()`. This keeps the initial bundle small —
 * Reader (epubjs), Missionary (leaflet), and the rest of the heavy tabs ship
 * as separate chunks that load on first activation.
 *
 * Components are exported as named functions (not default), so each lazy
 * loader maps the named export to the `{ default }` shape `lazy` expects.
 */
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
const FlashcardDecks = lazy(() =>
  import("./flashcards/FlashcardDecks").then((m) => ({ default: m.FlashcardDecks })),
);

/**
 * Exhaustive map of every TabKey -> component.
 *
 * TypeScript's `Record<TabKey, ...>` enforces that adding a new TabKey
 * without registering its component is a compile error, and any import
 * path here that does not resolve fails the dev/build step immediately
 * (instead of crashing at runtime when the user clicks the tab).
 */
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
  flashcards: FlashcardDecks,
};

if (import.meta.env.DEV) {
  for (const [key, Component] of Object.entries(TAB_COMPONENTS)) {
    if (typeof Component !== "function" && typeof Component !== "object") {
      // eslint-disable-next-line no-console
      console.error(`[tab-registry] Tab "${key}" did not resolve to a component.`);
    }
  }
}
