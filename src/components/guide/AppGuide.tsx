import { examsLocation } from "@/lib/exam-navigation";
import { offlineLessonPackId } from "@/lib/offline-lesson-tracks";
import { core30ScopeKey } from "@/lib/core30-scope";
import { LegacyCore30History } from "@/components/core30/LegacyCore30History";
import type { AssessedPlanTiming } from "@/components/exams/DailyLessonPlan";
import {
  requestedLesson,
  lessonLocation,
  lessonOverviewLocation,
  canRestoreLessonReturn,
} from "@/lib/learning-link";
import { lazy, Suspense, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  GraduationCap,
  Mic2,
  BarChart3,
  Repeat2,
  AlignLeft,
  Headphones,
  Grid3x3,
  Quote,
  AlertTriangle,
  Gamepad2,
  Mail,
  Layers,
  Sparkle,
  Trophy,
  Activity,
  Puzzle,
  CheckCircle2,
  Circle,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Check,
  Eye,
  Keyboard,
  Mic,
  PenLine,
  Star,
  Map,
} from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import {
  createTeamCompletionJournal,
  browserTeamCompletionStorage,
} from "@/lib/team-completion-device";
import { ownedTeamRequest, type TeamRequestOwner } from "@/lib/team-client";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { useAuth } from "@/state/auth-state";
import { useLibrary } from "@/state/library-state";
import { cn } from "@/lib/utils";
import { getCurriculum, getCurrentLesson, type Lesson } from "@/data/curriculum";
import { AppTour } from "@/components/onboarding/AppTour";
import { getTourScript } from "@/data/tour-scripts";
import { LessonPracticeKit, type PracticeMode } from "@/components/core30/LessonPracticeKit";
import { Core30PlanCard } from "@/components/core30/Core30PlanCard";
import { LessonSpeakingPractice } from "@/components/core30/LessonSpeakingPractice";
import { OfflineLessonDownload } from "@/components/core30/OfflineLessonDownload";
import { Core30Review } from "@/components/core30/Core30Review";
import { Core30Philosophy } from "@/components/core30/Core30Philosophy";
import { LessonReader } from "@/components/core30/LessonReader";
import { LessonResponsePractice } from "@/components/core30/LessonResponsePractice";
import {
  browserReturnStorage,
  clearLessonReturn,
  lessonMissionPrefix,
  readLessonReturn,
  writeLessonReturn,
} from "@/lib/lesson-return";
import { prefetchLessonDeck, useLessonWords } from "@/lib/lesson-words";
import { getLessonDefinition, modulePracticeVersion } from "@/lib/lesson-definition";
import {
  lessonPositionKey,
  readLessonPosition,
  saveLessonPosition,
  type LessonPosition,
} from "@/lib/lesson-drafts";
import {
  masteredLessons,
  openedWayCount,
  wayVisitAt,
  planToday,
  toDateKey,
  type Core30Way,
} from "@/lib/core30-plan";

const DailyLessonPlan = lazy(() =>
  import("@/components/exams/DailyLessonPlan").then((module) => ({
    default: module.DailyLessonPlan,
  })),
);

// ─── Legacy daily-flow fallback (for modules without a Core 30) ────────────

interface FlowStep {
  time: string;
  icon: string;
  title: string;
  tab: string;
  value: string;
}

const DEFAULT_FLOW: FlowStep[] = [
  {
    time: "1 min",
    icon: "📊",
    title: "Check in",
    tab: "Dashboard",
    value: "See your streak and XP — keeps you honest about daily progress.",
  },
  {
    time: "8 min",
    icon: "✨",
    title: "Daily Story",
    tab: "Daily Story",
    value: "Read a short story at your level. New one each day — builds reading fluency.",
  },
  {
    time: "5 min",
    icon: "🎓",
    title: "Grammar drill",
    tab: "Grammar Studio",
    value: "Advance one lesson. Steady grammar study compounds fast over weeks.",
  },
  {
    time: "4 min",
    icon: "🎯",
    title: "Vocab lock-in",
    tab: "Word Match",
    value: "Flash your saved words. Spaced repetition moves them to long-term memory.",
  },
  {
    time: "3 min",
    icon: "🎤",
    title: "Speak it",
    tab: "Speak & Learn",
    value: "Say one real sentence out loud. Your brain cements what your mouth produces.",
  },
];

const MISSIONARY_FLOW: FlowStep[] = [
  {
    time: "2 min",
    icon: "📊",
    title: "Check streak",
    tab: "Dashboard",
    value: "Missionaries who track daily show 3× faster vocab growth.",
  },
  {
    time: "8 min",
    icon: "📖",
    title: "Read the lesson",
    tab: "Reader",
    value: "Open a Restoration or Plan of Salvation text. Tap any word for instant definition.",
  },
  {
    time: "5 min",
    icon: "🕊️",
    title: "Discussions drill",
    tab: "Discussions",
    value: "Practice teaching a commitment question or baptismal question out loud.",
  },
  {
    time: "4 min",
    icon: "🎓",
    title: "Grammar pattern",
    tab: "Grammar Patterns",
    value: "One pattern = one grammar structure you can apply across every lesson.",
  },
  {
    time: "2 min",
    icon: "🎤",
    title: "Speak it aloud",
    tab: "Speak & Learn",
    value: "Say the opening greeting of a lesson. Confidence comes from repetition.",
  },
];

const MEDICAL_FLOW: FlowStep[] = [
  {
    time: "1 min",
    icon: "📊",
    title: "Check in",
    tab: "Dashboard",
    value: "Track your streak — consistency beats intensity in language acquisition.",
  },
  {
    time: "7 min",
    icon: "🦴",
    title: "Module terms",
    tab: "Orthopedics",
    value: "Drill 5 anatomy or clinical terms. Say them while you type them.",
  },
  {
    time: "5 min",
    icon: "📖",
    title: "Patient scenario",
    tab: "Reader",
    value: "Read a clinical passage. Tap unfamiliar terms — they save to Word Match.",
  },
  {
    time: "4 min",
    icon: "🎧",
    title: "Listening drill",
    tab: "Listening Drill",
    value: "Understand a patient complaint. Hard at first — your ear calibrates within days.",
  },
  {
    time: "3 min",
    icon: "🎤",
    title: "Say it",
    tab: "Speak & Learn",
    value: "'¿Dónde le duele?' Practice until it's automatic.",
  },
];

const TRADES_FLOW: FlowStep[] = [
  {
    time: "1 min",
    icon: "📊",
    title: "Check in",
    tab: "Dashboard",
    value: "See where you are. Streaks make the difference.",
  },
  {
    time: "7 min",
    icon: "📖",
    title: "Site vocabulary",
    tab: "Reader",
    value: "Read a site safety or construction scenario. Tap every tool name you don't know.",
  },
  {
    time: "5 min",
    icon: "↔",
    title: "Sentence Builder",
    tab: "Sentence Builder",
    value: "Practice giving commands: 'Bring me the...', 'Don't touch the...'",
  },
  {
    time: "4 min",
    icon: "🎯",
    title: "Vocab drill",
    tab: "Word Match",
    value: "Material names, safety terms, positions — flash them until instant.",
  },
  {
    time: "3 min",
    icon: "🎤",
    title: "Give an order",
    tab: "Speak & Learn",
    value: "Practice a crew instruction. The words your crew hears need to be yours.",
  },
];

function getFlow(moduleId: string | null): FlowStep[] {
  if (!moduleId) return DEFAULT_FLOW;
  if (moduleId === "lds-missionary") return MISSIONARY_FLOW;
  if (
    [
      "orthopedics",
      "nursing",
      "emergency-medicine",
      "family-medicine",
      "ob-gyn",
      "cardiology",
      "general-surgery",
      "physical-therapy",
      "pain-management",
      "medical-receptionist",
    ].includes(moduleId)
  )
    return MEDICAL_FLOW;
  if (
    [
      "construction-foreman",
      "plumber",
      "drywall",
      "electrician",
      "landscaper",
      "framer",
      "construction-safety",
    ].includes(moduleId)
  )
    return TRADES_FLOW;
  return DEFAULT_FLOW;
}

// ─── Feature map ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: Sparkle,
    label: "Daily Story",
    value: "A new short story every day, leveled to your progress.",
  },
  {
    Icon: BookOpen,
    label: "Reader",
    value: "Parallel text in both languages. Tap any word for definition and morphology.",
  },
  {
    Icon: GraduationCap,
    label: "Grammar Studio",
    value: "Structured CEFR lessons A1→C2. Each one drills a rule until it sticks.",
  },
  {
    Icon: Layers,
    label: "Grammar Patterns",
    value: "Master recurring sentence structures. One pattern = thousands of uses.",
  },
  {
    Icon: Repeat2,
    label: "Conjugation",
    value: "Drill every tense for any verb. Automatic conjugation makes speech feel natural.",
  },
  {
    Icon: AlignLeft,
    label: "Sentence Builder",
    value: "Rearrange scrambled words. Trains word-order intuition without translating.",
  },
  {
    Icon: Headphones,
    label: "Listening Drill",
    value: "Hear it, transcribe or respond. Real comprehension comes from training your ear.",
  },
  {
    Icon: Grid3x3,
    label: "Word Match",
    value: "Flash cards with spaced repetition. Words you tap in Reader appear here.",
  },
  {
    Icon: Quote,
    label: "Idiom Master",
    value: "Learn idioms native speakers actually use — textbooks rarely teach these.",
  },
  {
    Icon: AlertTriangle,
    label: "False Friends",
    value: "Words that look like English but mean something different.",
  },
  {
    Icon: Gamepad2,
    label: "Games Hub",
    value: "Mini-games that make review feel like play. Good for a 5-min commute.",
  },
  {
    Icon: Mail,
    label: "Pen Pal Practice",
    value: "Write a message. AI tutor gives live feedback on every sentence.",
  },
  {
    Icon: Mic2,
    label: "Speak & Learn",
    value: "Record yourself. Get pronunciation feedback. Your mouth cements what you produce.",
  },
  {
    Icon: Trophy,
    label: "Language Match",
    value: "Live 1v1 vocabulary battles. Competitive pressure accelerates recall.",
  },
  {
    Icon: BarChart3,
    label: "Dashboard",
    value: "XP, streak, tier, achievements, and a 7-day activity chart.",
  },
  {
    Icon: Puzzle,
    label: "Modules",
    value: "Profession-specific vocabulary packs. Each one unlocks field-specific content.",
  },
];

// ─── Module tips ──────────────────────────────────────────────────────────────

interface ModuleTip {
  headline: string;
  tips: string[];
  cognates?: { word: string; meaning: string }[];
  priority?: string[];
}

const MODULE_TIPS: Record<string, ModuleTip> = {
  "lds-missionary": {
    headline: "Missionary Tips",
    tips: [
      "Spanish cognates cover ~40% of missionary vocabulary — most lesson terms have obvious English parallels.",
      "Commit questions and baptismal questions should be memorized, not translated on the fly.",
      "Practice the first 30 seconds of each lesson until it's automatic — confidence in the opening carries the whole discussion.",
    ],
    cognates: [
      { word: "restauración", meaning: "Restoration" },
      { word: "profeta", meaning: "prophet" },
      { word: "bautismo", meaning: "baptism" },
      { word: "espiritual", meaning: "spiritual" },
      { word: "eterno", meaning: "eternal" },
      { word: "familia", meaning: "family" },
      { word: "arrepentimiento", meaning: "repentance" },
      { word: "principio", meaning: "principle" },
      { word: "divino", meaning: "divine" },
      { word: "confirmación", meaning: "confirmation" },
    ],
    priority: [
      "Restoration",
      "Plan of Salvation",
      "Baptism commitment",
      "Weekly schedule phrases",
      "Prayer vocabulary",
    ],
  },
  orthopedics: {
    headline: "Orthopedics & Clinical Tips",
    tips: [
      "Latin root words unlock entire categories: -itis = inflammation, -ectomy = removal, -algia = pain.",
      "The most critical phrases: '¿Dónde le duele?', '¿Puede moverlo?', '¿Cuándo pasó esto?'",
      "Patients understand simple Spanish better than medical jargon — practice plain language first.",
    ],
    cognates: [
      { word: "fractura", meaning: "fracture" },
      { word: "articulación", meaning: "joint" },
      { word: "inflamación", meaning: "inflammation" },
      { word: "tendón", meaning: "tendon" },
      { word: "cartílago", meaning: "cartilage" },
      { word: "cirugía", meaning: "surgery" },
      { word: "diagnóstico", meaning: "diagnosis" },
      { word: "dolor", meaning: "pain" },
    ],
    priority: [
      "Pain questions",
      "Body part names",
      "Range of motion",
      "Surgical consent phrases",
      "Post-op instructions",
    ],
  },
  "construction-foreman": {
    headline: "Construction & Trades Tips",
    tips: [
      "Command verbs are your highest-priority vocab: traer, poner, mover, cortar, limpiar.",
      "Safety phrases come first — 'Cuidado', 'Peligro', '¡Para!' should be automatic.",
      "Most of your crew understands simple direct commands better than complex sentences.",
    ],
    cognates: [
      { word: "material", meaning: "material" },
      { word: "concreto", meaning: "concrete" },
      { word: "estructura", meaning: "structure" },
      { word: "inspección", meaning: "inspection" },
      { word: "instalación", meaning: "installation" },
      { word: "ventilación", meaning: "ventilation" },
    ],
    priority: [
      "Stop/danger/careful",
      "Tool names",
      "Bring/take/move",
      "Measurements",
      "Site areas",
    ],
  },
  soccer: {
    headline: "Soccer / Fútbol Tips",
    tips: [
      "Soccer is Spanish culture — your players already know many Spanish terms from the sport.",
      "Short direct commands work best on the field — practice 3-word drills over full sentences.",
      "Positions, formations, and tactical calls are your core vocabulary. Learn those first.",
    ],
    cognates: [
      { word: "posición", meaning: "position" },
      { word: "defensa", meaning: "defense" },
      { word: "formación", meaning: "formation" },
      { word: "portero", meaning: "goalkeeper" },
      { word: "penalti", meaning: "penalty" },
      { word: "área", meaning: "box/area" },
    ],
    priority: [
      "Position names",
      "Tactical calls",
      "Drill instructions",
      "Encouragement phrases",
      "Game-day commands",
    ],
  },
};

function getModuleTip(moduleId: string | null): ModuleTip | null {
  if (!moduleId) return null;
  if (
    moduleId !== "orthopedics" &&
    [
      "nursing",
      "emergency-medicine",
      "family-medicine",
      "fmg",
      "or-evs",
      "cardiology",
      "general-surgery",
      "physical-therapy",
    ].includes(moduleId)
  ) {
    return MODULE_TIPS["orthopedics"];
  }
  if (
    moduleId !== "construction-foreman" &&
    ["plumber", "electrician", "drywall", "landscaper", "framer", "construction-safety"].includes(
      moduleId,
    )
  ) {
    return MODULE_TIPS["construction-foreman"];
  }
  if (["baseball", "hockey", "tennis"].includes(moduleId)) return MODULE_TIPS["soccer"];
  return MODULE_TIPS[moduleId] ?? null;
}

// ─── Lesson Runner ────────────────────────────────────────────────────────────

function formatOpenedDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type SectionId = Core30Way;

interface SectionDef {
  id: SectionId;
  label: string;
  why: string;
  Icon: typeof Eye;
}

/** The six ways of learning, in the order the learner works through them. */
const SECTIONS: SectionDef[] = [
  {
    id: "see",
    label: "See it",
    why: "Start with this lesson's reading or word list.",
    Icon: Eye,
  },
  {
    id: "recall",
    label: "Recall it",
    why: "Pull each word back from memory with cards and matching.",
    Icon: Layers,
  },
  {
    id: "hear",
    label: "Hear it",
    why: "Train your ear on how the words really sound.",
    Icon: Headphones,
  },
  { id: "type", label: "Type it", why: "Spell the words from memory.", Icon: Keyboard },
  { id: "say", label: "Say it", why: "Use the words out loud in a short role-play.", Icon: Mic },
  {
    id: "write",
    label: "Write it",
    why: "Copy the words, recall their spelling, then write a response.",
    Icon: PenLine,
  },
];

/** The sections that live in the one practice kit. */
const KIT_SECTIONS: SectionId[] = ["recall", "hear", "type", "write"];

function sectionForMode(mode: PracticeMode): SectionId {
  const m: string = mode;
  if (m === "listen") return "hear";
  if (m === "type") return "type";
  if (m === "write") return "write";
  return "recall";
}

/** The kit mode a section opens in; Recall keeps Study, Cards or Match if one is already open. */
function modeForSection(section: SectionId, current: PracticeMode): PracticeMode {
  if (section === "hear") return "listen";
  if (section === "type") return "type";
  if (section === "write") return "write";
  return sectionForMode(current) === "recall" ? current : "flashcards";
}

function scrollBehavior(): ScrollBehavior {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return reduce ? "auto" : "smooth";
}

/**
 * How far down the page the desktop top bar reaches. It is sticky and wraps onto two rows at
 * some widths, so a fixed number would leave the step bar hidden behind it. 0 when there is no
 * top bar (phones and tablets: the lesson's own step bar is the sticky element there).
 */
function stickyTopOffset(): number {
  if (typeof document === "undefined") return 0;
  const bar = document.querySelector<HTMLElement>("header.sticky");
  if (!bar || getComputedStyle(bar).display === "none") return 0;
  return Math.max(0, Math.ceil(bar.getBoundingClientRect().bottom));
}

/** Scrolls the lesson's step bar to the top of the page, just below any sticky top bar. */
function scrollStepBarIntoView(el: HTMLElement | null, behavior: ScrollBehavior) {
  if (!el) return;
  const offset = stickyTopOffset();
  if (offset > 0) el.style.scrollMarginTop = `${offset + 8}px`;
  else el.style.removeProperty("scroll-margin-top");
  el.scrollIntoView({ behavior, block: "start" });
}

function LessonRunner(props: Parameters<typeof OwnedLessonRunner>[0]) {
  const { user } = useAuth();
  const { state } = useApp();
  return (
    <OwnedLessonRunner
      key={JSON.stringify([
        user?.id,
        props.moduleId,
        props.lesson.n,
        state.selectedLanguage,
        state.nativeLanguage,
        props.enrollmentId,
      ])}
      {...props}
    />
  );
}
function OwnedLessonRunner({
  enrollmentId,
  lesson,
  moduleId,
  totalLessons,
  initialSection,
  syncLocation = false,
  onComplete,
  onExit,
  onNavigate,
  onSectionChange,
}: {
  enrollmentId?: string;
  lesson: Lesson;
  moduleId: string;
  totalLessons: number;
  /** Section to open on (a learner returning from the Speak tab or the full Reader). */
  initialSection?: SectionId;
  syncLocation?: boolean;
  onComplete: () => void;
  onExit: () => void;
  onNavigate: (n: number) => void;
  onSectionChange?: (section: SectionId) => void;
}) {
  const { state, dispatch } = useApp();
  const { user, canUseReader } = useAuth();
  const userId = user?.id;
  const progressContext = useMemo(
    () => ({
      targetLanguage: state.selectedLanguage,
      instructionLanguage: state.nativeLanguage,
      enrollmentId,
    }),
    [state.selectedLanguage, state.nativeLanguage, enrollmentId],
  );
  const progressKey = core30ScopeKey(moduleId, progressContext);
  const teamSessions = useRef<Record<string, string>>({});
  const sessionStart = useRef<Promise<{ sessions?: Record<string, string> }> | null>(null);
  const { capture, cancel } = usePracticeLifecycle(
    JSON.stringify([moduleId, lesson.n, progressKey, state.hydrated]),
  );
  const markFlight = useRef<AbortController | null>(null);
  const completed = useRef(false);
  const leaving = useRef(false);
  const journalRef = useRef<ReturnType<typeof createTeamCompletionJournal> | null>(null);
  const [teamRecovery, setTeamRecovery] = useState("");
  const [hasTeamRecovery, setHasTeamRecovery] = useState(false);
  const { dispatch: libDispatch } = useLibrary();

  const [marking, setMarking] = useState(false);
  // In-flight guard: a completion (team post + counter + chain) must never run twice at once.
  const completionLock = useRef(false);
  const navRef = useRef<HTMLElement>(null);
  const masteryRef = useRef<HTMLElement>(null);
  const [section, setSection] = useState<SectionId>(initialSection ?? "see");
  const [kitMode, setKitMode] = useState<PracticeMode>(() =>
    modeForSection(initialSection ?? "see", "flashcards"),
  );
  // Authored words (roofing, Spanish) arrive at once; any other lesson gets a generated list.
  const lessonWords = useLessonWords(
    moduleId,
    lesson.n,
    state.selectedLanguage,
    state.nativeLanguage,
  );
  const words = lessonWords.words;
  const hasWords = words.length > 0;
  const definition = getLessonDefinition({
    moduleId,
    lessonNumber: lesson.n,
    targetLanguage: state.selectedLanguage,
    instructionLanguage: state.nativeLanguage,
    contentVersion: modulePracticeVersion(moduleId, state.selectedLanguage, state.nativeLanguage),
  });

  const totalMin = lesson.steps.reduce((s, step) => s + step.durationMin, 0);
  // The sequential counter (lessonProgress) only moves for the lesson it is currently on.
  const isCurrentSequential =
    getCurrentLesson(moduleId, state.lessonProgress, progressKey)?.n === lesson.n;
  const lessonLog = state.core30Log[progressKey]?.lessons[String(lesson.n)];
  const masteredAt = lessonLog?.masteredAt;
  const needsPractice = Boolean(lessonLog?.needsPractice);
  // Preserve old curriculum-step evidence; new mode evidence is independent below.
  const readerStep = lesson.steps.findIndex((step) => step.tab === "reader");
  const wordDrillStep = lesson.steps.findIndex((step) => step.tab === "wordMatch");
  const speakStep = lesson.steps.findIndex((step) => step.tab === "speak");
  const stepForSection: Record<SectionId, number> = {
    see: readerStep,
    recall: wordDrillStep,
    hear: wordDrillStep,
    type: wordDrillStep,
    say: speakStep,
    write: -1,
  };
  // Steps with no section of their own (grammar, sentence builder, a module's tab) stay reachable.
  const otherSteps = lesson.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => !["reader", "wordMatch", "speak"].includes(step.tab));
  const speakInstruction =
    lesson.steps[speakStep]?.instruction ?? "Say the lesson's words out loud in a short role-play.";
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section);
  const activeDef = SECTIONS[sectionIndex];
  const nextDef = SECTIONS[sectionIndex + 1];
  const inKit = KIT_SECTIONS.includes(section);

  useEffect(() => {
    dispatch({
      type: "CORE30_WAY_OPENED",
      payload: {
        moduleId,
        context: progressContext,
        lesson: lesson.n,
        way: section,
        at: new Date().toISOString(),
      },
    });
    onSectionChange?.(section);
    if (syncLocation) {
      const next = lessonLocation(
        window.location.href,
        {
          moduleId,
          target: state.selectedLanguage,
          native: state.nativeLanguage,
        },
        { lesson: lesson.n, way: section },
      );
      if (next && next !== window.location.pathname + window.location.search + window.location.hash)
        window.history.replaceState(window.history.state, "", next);
    }
    try {
      const storage = userId ? window.localStorage : window.sessionStorage;
      saveLessonPosition(
        storage,
        lessonPositionKey(
          userId ?? "anonymous",
          moduleId,
          state.selectedLanguage,
          state.nativeLanguage,
          enrollmentId,
        ),
        { lesson: lesson.n, way: section, at: new Date().toISOString() },
      );
    } catch {
      /* The lesson remains usable when device storage is unavailable. */
    }
  }, [
    dispatch,
    moduleId,
    lesson.n,
    section,
    onSectionChange,
    userId,
    state.selectedLanguage,
    state.nativeLanguage,
    syncLocation,
    progressKey,
    progressContext,
    enrollmentId,
  ]);

  useEffect(() => {
    teamSessions.current = {};
    sessionStart.current = null;
    if (!userId || !state.hydrated) return;
    const lease = capture();
    if (!lease.isCurrent()) return;
    // The existing sign-out guard also freezes private completion writes while approval is pending.
    const journal = createTeamCompletionJournal(
      browserTeamCompletionStorage(),
      userId,
      () => lease.isCurrent() && canUseReader(userId),
    );
    journalRef.current = journal;
    try {
      const saved = journal.read(progressKey, lesson.n, moduleId)[0];
      if (saved) {
        teamSessions.current = saved.sessions;
        sessionStart.current = Promise.resolve({ sessions: saved.sessions });
        setTeamRecovery(
          "An earlier team-completion request is saved on this device. Retry uses its original session proof and adds no extra XP.",
        );
        setHasTeamRecovery(true);
        return;
      }
    } catch (error) {
      setTeamRecovery(
        error instanceof Error ? error.message : "Saved team completion could not be checked.",
      );
      setHasTeamRecovery(true);
      return;
    }
    const controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const current = () => lease.isCurrent() && canUseReader(userId) && !controller.signal.aborted;
    const promise = ownedTeamRequest<{ sessions?: Record<string, string> }>(
      { userId, isCurrent: current, signal: controller.signal },
      "/api/team-activity",
      {
        action: "lesson_start",
        moduleId,
        lessonNumber: lesson.n,
      },
    );
    sessionStart.current = promise;
    void promise
      .then((result) => {
        if (current()) teamSessions.current = result.sessions ?? {};
      })
      .catch((error) => {
        if (current()) {
          if (sessionStart.current === promise) sessionStart.current = null;
          if (!markFlight.current)
            toast.error(
              error instanceof Error ? error.message : "Team lesson tracking is unavailable.",
            );
        }
      })
      .finally(release);
    return () => {
      controller.abort();
      release();
    };
  }, [userId, moduleId, lesson.n, progressKey, state.hydrated, capture, canUseReader]);

  // Later practice steps resume at their controls. Starting/reopening See it
  // keeps the lesson title and Previous/Next controls visible at the page top.
  useEffect(() => {
    if (!initialSection || initialSection === "see") return;
    const frame = requestAnimationFrame(() => scrollStepBarIntoView(navRef.current, "auto"));
    return () => cancelAnimationFrame(frame);
  }, [initialSection]);

  /** Records that the learner opened step `i` (first open wins in the reducer). */
  function recordStepOpened(i: number) {
    if (i < 0) return;
    dispatch({
      type: "CORE30_STEP_OPENED",
      payload: {
        moduleId,
        context: progressContext,
        lesson: lesson.n,
        step: i,
        at: new Date().toISOString(),
      },
    });
  }

  function selectSection(next: SectionId, scroll = false) {
    setSection(next);
    if (KIT_SECTIONS.includes(next)) setKitMode((current) => modeForSection(next, current));
    // Opening a way of learning is the record; the passage (See it) is recorded on first use.
    if (next !== "see") recordStepOpened(stepForSection[next]);
    if (scroll) {
      requestAnimationFrame(() => scrollStepBarIntoView(navRef.current, scrollBehavior()));
    }
  }

  function onKitModeChange(mode: PracticeMode) {
    setKitMode(mode);
    setSection(sectionForMode(mode));
  }

  /** Record the opened practice without leaving the lesson. */
  function goSay() {
    recordStepOpened(speakStep);
  }

  /** See it, full size: the whole Reader, with a way straight back to this lesson. */
  function openFullReader(passageId: string) {
    leaveLesson(() => {
      recordStepOpened(readerStep);
      writeLessonReturn(browserReturnStorage(), {
        moduleId,
        lesson: lesson.n,
        section: "see",
        at: Date.now(),
        ref: passageId,
      });
      libDispatch({ type: "SELECT", payload: passageId });
      dispatch({ type: "SET_TAB", payload: "reader" });
    });
  }

  /** A step with no section of its own opens its own tab, as before. */
  function openOtherStep(i: number) {
    leaveLesson(() => {
      const step = lesson.steps[i];
      recordStepOpened(i);
      dispatch({ type: "SET_TAB", payload: step.tab });
    });
  }

  /** Posts lesson `n` to the team workspace. True when there is nothing to post or the post worked. */
  async function postTeamLesson(
    n: number,
    sessions: Record<string, string>,
    owner: TeamRequestOwner | null,
    current: () => boolean,
  ): Promise<boolean> {
    if (!current()) return false;
    if (!owner || !Object.keys(sessions).length) return true;
    try {
      const journal = journalRef.current;
      if (!journal)
        throw new Error(
          "This device could not save a recovery copy. Keep the lesson open and retry.",
        );
      const request = journal.prepare(progressKey, moduleId, n, sessions);
      setHasTeamRecovery(true);
      setTeamRecovery("Team completion is pending. Its original request is saved on this device.");
      const result = await ownedTeamRequest<{ recorded: number }>(owner, "/api/team-activity", {
        action: "lesson",
        moduleId: request.moduleId,
        lessonNumber: request.lessonNumber,
        sessions: request.sessions,
      });
      if (!current()) return false;
      if (result.recorded !== Object.keys(request.sessions).length)
        throw new Error(
          "Some teams could not confirm this completion. The saved request remains for retry; no new local credit was added.",
        );
      journal.acknowledge(request);
      setTeamRecovery(
        "The team request was acknowledged. Finish this lesson if local practice progress still needs updating.",
      );
      return current();
    } catch (error) {
      if (current())
        toast.error(error instanceof Error ? error.message : "Team lesson could not be recorded.");
      return false;
    }
  }

  /** After lesson `fromN` completes, keep advancing over lessons the learner already mastered. */
  async function advancePastMastered(
    fromN: number,
    owner: TeamRequestOwner | null,
    current: () => boolean,
  ) {
    const lessonsLog = state.core30Log[progressKey]?.lessons ?? {};
    const total = getCurriculum(moduleId)?.lessons.length ?? 0;
    let n = fromN + 1;
    while (n <= total && lessonsLog[String(n)]?.masteredAt) {
      let sessions: Record<string, string> = {};
      if (!current()) return;
      if (owner) {
        try {
          const saved = journalRef.current?.read(progressKey, n, moduleId)[0];
          const started = saved
            ? { sessions: saved.sessions }
            : await ownedTeamRequest<{ sessions?: Record<string, string> }>(
                owner,
                "/api/team-activity",
                { action: "lesson_start", moduleId, lessonNumber: n },
              );
          if (!current()) return;
          sessions = started.sessions ?? {};
        } catch (error) {
          if (current())
            toast.error(
              error instanceof Error ? error.message : "Team lesson tracking is unavailable.",
            );
          return;
        }
      }
      if (!(await postTeamLesson(n, sessions, owner, current)) || !current()) return;
      dispatch({ type: "COMPLETE_LESSON", payload: { moduleId, context: progressContext } });
      dispatch({ type: "ADD_XP", payload: 50 });
      n += 1;
    }
  }

  /**
   * Team post + sequential counter + XP for THIS lesson, then the chain over later lessons that
   * are already mastered. COMPLETE_LESSON only ever fires for the lesson the counter is on.
   * Returns false when nothing was recorded (team post failed, or not the current lesson).
   */
  async function recordSequentialCompletion(
    owner: TeamRequestOwner | null,
    current: () => boolean,
  ): Promise<boolean> {
    if (!current()) return false;
    if (completionLock.current) return false;
    if ((state.lessonProgress[progressKey] ?? 0) + 1 !== lesson.n) return false;
    completionLock.current = true;
    try {
      let sessions = teamSessions.current;
      if (owner) {
        try {
          const saved = journalRef.current?.read(progressKey, lesson.n, moduleId)[0];
          if (saved) sessionStart.current = Promise.resolve({ sessions: saved.sessions });
          let start = sessionStart.current;
          if (!start) {
            start = ownedTeamRequest<{ sessions?: Record<string, string> }>(
              owner,
              "/api/team-activity",
              { action: "lesson_start", moduleId, lessonNumber: lesson.n },
            );
            sessionStart.current = start;
          }
          const started = await start;
          if (!current()) return false;
          sessions = started.sessions ?? {};
          teamSessions.current = sessions;
        } catch (error) {
          if (current()) {
            sessionStart.current = null;
            toast.error(
              error instanceof Error ? error.message : "Team lesson tracking is unavailable.",
            );
          }
          return false;
        }
      }
      if (!(await postTeamLesson(lesson.n, sessions, owner, current)) || !current()) return false;
      dispatch({ type: "COMPLETE_LESSON", payload: { moduleId, context: progressContext } });
      dispatch({ type: "ADD_XP", payload: 50 });
      await advancePastMastered(lesson.n, owner, current);
      return current();
    } finally {
      completionLock.current = false;
    }
  }

  /** One mounted completion action, including any team requests and mastered-lesson chain. */
  async function finishLesson(mark: boolean) {
    const lease = capture();
    if (
      !state.hydrated ||
      !lease.isCurrent() ||
      (userId && !canUseReader(userId)) ||
      leaving.current ||
      markFlight.current ||
      completed.current
    )
      return;
    const controller = new AbortController();
    markFlight.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() &&
      (!userId || canUseReader(userId)) &&
      markFlight.current === controller &&
      !controller.signal.aborted;
    const owner = userId ? { userId, isCurrent: current, signal: controller.signal } : null;
    setMarking(true);
    try {
      const sequential = isCurrentSequential;
      if (!mark && !sequential) return;
      if (sequential && !(await recordSequentialCompletion(owner, current))) return;
      if (!current()) return;
      if (mark)
        dispatch({
          type: "CORE30_SET_MASTERED",
          payload: {
            moduleId,
            context: progressContext,
            lesson: lesson.n,
            mastered: true,
            at: new Date().toISOString(),
          },
        });
      completed.current = sequential;
      if (sequential) onComplete();
    } finally {
      if (lease.isCurrent() && markFlight.current === controller) setMarking(false);
      if (markFlight.current === controller) markFlight.current = null;
      release();
      controller.abort();
    }
  }
  function recordAlreadyMastered() {
    return finishLesson(false);
  }
  function markMastered() {
    return finishLesson(true);
  }

  async function retrySavedTeamCompletion() {
    const lease = capture();
    if (
      !state.hydrated ||
      !userId ||
      !canUseReader(userId) ||
      !lease.isCurrent() ||
      leaving.current ||
      markFlight.current
    )
      return;
    const controller = new AbortController();
    markFlight.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() &&
      canUseReader(userId) &&
      markFlight.current === controller &&
      !controller.signal.aborted;
    setMarking(true);
    try {
      const request = journalRef.current?.read(progressKey, lesson.n, moduleId)[0];
      if (!request) {
        setHasTeamRecovery(false);
        setTeamRecovery(
          "No saved request remains for this lesson. Use the lesson controls to finish your practice.",
        );
        return;
      }
      await postTeamLesson(
        request.lessonNumber,
        request.sessions,
        { userId, isCurrent: current, signal: controller.signal },
        current,
      );
    } catch (error) {
      if (current())
        setTeamRecovery(
          error instanceof Error ? error.message : "Saved team completion could not be checked.",
        );
    } finally {
      if (lease.isCurrent() && markFlight.current === controller) setMarking(false);
      if (markFlight.current === controller) markFlight.current = null;
      release();
      controller.abort();
    }
  }

  function leaveLesson(action: () => void) {
    if (leaving.current || !capture().isCurrent()) return;
    leaving.current = true;
    markFlight.current?.abort();
    cancel();
    action();
  }

  /** Each mode shows its own first visit; older step records cannot imply a mode visit. */
  function openedNote(id: SectionId) {
    const openedAt = wayVisitAt(lessonLog, id);
    if (!openedAt) return null;
    return (
      <p
        data-testid="core30-step-opened"
        className="mt-1.5 flex items-center gap-1 text-[11px] text-gold/80"
      >
        <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
        Opened {formatOpenedDate(openedAt)}
      </p>
    );
  }

  const lessonButtons = (position: "top" | "bottom") => (
    <div className="flex items-center justify-between gap-2" data-testid={`lesson-nav-${position}`}>
      <button
        type="button"
        onClick={() => leaveLesson(() => onNavigate(lesson.n - 1))}
        disabled={lesson.n <= 1}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Lesson {Math.max(lesson.n - 1, 1)}
      </button>
      <button
        type="button"
        onClick={() => leaveLesson(() => onNavigate(lesson.n + 1))}
        disabled={lesson.n >= totalLessons}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:text-white/70"
      >
        Lesson {Math.min(lesson.n + 1, totalLessons)}
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );

  const nextButton = (
    <button
      type="button"
      data-testid="lesson-next-section"
      onClick={() => {
        if (nextDef) selectSection(nextDef.id, true);
        else masteryRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      }}
      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/40 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
    >
      {nextDef ? `Next: ${nextDef.label}` : "On to mastery"}
      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
    </button>
  );

  const panelClass = "rounded-2xl border border-white/[0.08] bg-card/40 p-4";
  const panelHeader = (def: SectionDef, n: number) => (
    <header>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
        Step {n} of {SECTIONS.length}
      </p>
      <h4 className="mt-0.5 font-display text-lg font-semibold text-foreground">{def.label}</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{def.why}</p>
      {openedNote(def.id)}
    </header>
  );

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70 mb-1">
              Lesson {lesson.n} · {totalMin} min
            </p>
            <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
          </div>
          <button
            onClick={() => leaveLesson(onExit)}
            className="min-h-11 shrink-0 px-1 text-[11px] text-white/50 transition-colors hover:text-white/80"
          >
            ✕ Exit
          </button>
        </div>
        <p className="text-sm text-white/60 mt-1">
          <span className="text-gold/80 mr-1">Goal:</span>
          {lesson.objective}
        </p>
        <div className="mt-3">{lessonButtons("top")}</div>
      </div>

      {/* Six ways of learning, one lesson, one page */}
      <nav
        ref={navRef}
        aria-label="Ways of learning this lesson"
        data-testid="lesson-section-nav"
        className="sticky top-0 z-20 -mx-1 scroll-mt-2 desktop:scroll-mt-44 grid grid-cols-6 gap-1 rounded-xl border border-border/50 bg-background/95 p-1 backdrop-blur desktop:static"
      >
        {SECTIONS.map(({ id, label, Icon }) => {
          const active = section === id;
          const opened = Boolean(wayVisitAt(lessonLog, id));
          return (
            <button
              key={id}
              type="button"
              data-testid={`lesson-nav-${id}`}
              aria-current={active ? "step" : undefined}
              aria-label={label}
              onClick={() => selectSection(id)}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[11px] font-bold transition-colors",
                active
                  ? "bg-gold text-background"
                  : "text-muted-foreground hover:bg-gold/10 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label.replace(" it", "")}
              {opened && (
                <Check
                  className={cn(
                    "absolute right-0.5 top-0.5 h-3 w-3",
                    active ? "text-background" : "text-gold",
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* 1 · See it */}
      <section data-testid="lesson-section-see" hidden={section !== "see"} className={panelClass}>
        {panelHeader(SECTIONS[0], 1)}
        <div className="mt-3">
          <LessonReader
            moduleId={moduleId}
            readingTemplate={lesson.readingTemplate}
            lessonNumber={lesson.n}
            initialTranslationVisible={definition?.teaching?.translationInitiallyVisible}
            words={words}
            onInteract={() => recordStepOpened(readerStep)}
            onOpenFullReader={openFullReader}
          />
        </div>
        {section === "see" && nextButton}
      </section>

      {/* 2, 3, 4, 6 · Recall it, Hear it, Type it, Write it: one practice kit, four ways in */}
      <section data-testid="lesson-section-kit" hidden={!inKit} className={panelClass}>
        {inKit && panelHeader(activeDef, sectionIndex + 1)}
        {hasWords && (
          <div
            data-testid="lesson-practice-section"
            className="mt-3 scroll-mt-44 border-t border-border/40 pt-3"
          >
            <h5 className="text-sm font-semibold text-white">
              Practice this lesson's words ({words.length})
            </h5>
            <div className="mt-3">
              <LessonPracticeKit
                // A fresh kit per word list, so a regenerated list never shows stale rounds.
                key={`${state.selectedLanguage}:${state.nativeLanguage}:${words.length}`}
                words={words}
                moduleId={moduleId}
                lessonNumber={lesson.n}
                matchingBatchSize={definition?.teaching?.matchingBatchSize}
                listeningItems={
                  definition?.teaching && definition.teaching.stage !== "supported"
                    ? definition.listeningItems
                    : undefined
                }
                language={state.selectedLanguage}
                // Authored words keep English as the native side, whatever the app's native setting.
                nativeLanguage={
                  lessonWords.status === "authored" ? "English" : state.nativeLanguage
                }
                mode={kitMode}
                onModeChange={onKitModeChange}
                onActivity={() => recordStepOpened(wordDrillStep)}
              />
            </div>
          </div>
        )}
        {lessonWords.status === "loading" && (
          <div
            data-testid="lesson-words-loading"
            aria-busy="true"
            className="mt-3 border-t border-border/40 pt-3"
          >
            <p className="text-sm font-semibold text-white">Building this lesson's word list…</p>
            <div className="mt-3 space-y-2" aria-hidden="true">
              <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        )}
        {lessonWords.status === "error" && (
          <div
            data-testid="lesson-words-error"
            className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.05] p-4"
          >
            <p className="text-sm font-semibold text-amber-300">Couldn't build the word list</p>
            <p className="mt-1 text-xs text-white/60">
              {lessonWords.error ? `${lessonWords.error}. ` : ""}You can still practice with the
              Word Match tab.
            </p>
            <button
              type="button"
              onClick={lessonWords.retry}
              className="mt-3 min-h-11 rounded-lg border border-white/15 px-4 text-xs font-semibold text-white hover:border-white/30"
            >
              Retry
            </button>
          </div>
        )}
        {definition?.teaching &&
          (["type", "write"] as const).map((mode) => (
            <div
              key={`${userId ?? "anonymous"}:${definition.id}:${mode}`}
              hidden={section !== mode}
            >
              <LessonResponsePractice definition={definition} mode={mode} />
            </div>
          ))}

        {inKit && nextButton}
      </section>

      {/* 5 · Say it */}

      <section data-testid="lesson-section-say" hidden={section !== "say"} className={panelClass}>
        {panelHeader(SECTIONS[4], 5)}
        {section === "say" && (
          <LessonSpeakingPractice
            key={`${moduleId}:${lesson.n}:${state.selectedLanguage}:${state.nativeLanguage}`}
            missionPrefix={lessonMissionPrefix(moduleId, lesson.n)}
            instruction={speakInstruction}
            definition={definition}
            words={words}
            language={state.selectedLanguage}
            onOpen={goSay}
          />
        )}
        {section === "say" && nextButton}
      </section>

      {/* Steps that have no section of their own */}
      {otherSteps.length > 0 && (
        <section className={panelClass}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
            Also in this lesson
          </p>
          <ul className="mt-2 space-y-2">
            {otherSteps.map(({ step, i }) => {
              const openedAt = lessonLog?.visits?.[String(i)];
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.08] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{step.tabLabel}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                      {step.instruction}
                    </p>
                    {openedAt && (
                      <p
                        data-testid="core30-step-opened"
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-gold/80"
                      >
                        <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                        Opened {formatOpenedDate(openedAt)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openOtherStep(i)}
                    className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/60 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Go <ChevronRight className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {teamRecovery && (
        <section
          className="rounded-xl border border-border p-3 text-sm"
          aria-label="Saved team completion"
        >
          <p role="status">{teamRecovery}</p>
          {hasTeamRecovery && (
            <button
              type="button"
              disabled={marking}
              onClick={() => void retrySavedTeamCompletion()}
              className="mt-2 min-h-11 rounded-xl border border-border px-4 disabled:opacity-50"
            >
              Check saved team request
            </button>
          )}
        </section>
      )}

      {/* Mastery: the learner's call. The app records the visits above; this records the verdict. */}
      <section ref={masteryRef} className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
        {masteredAt && !needsPractice ? (
          <>
            <p
              data-testid="core30-mastered-status"
              className="flex items-center gap-2 text-sm font-semibold text-gold"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Mastered on {formatOpenedDate(masteredAt)}
            </p>
            {isCurrentSequential && (
              <button
                type="button"
                data-testid="core30-record-complete-button"
                onClick={() => void recordAlreadyMastered()}
                disabled={marking}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
                  color: "#0B0B0F",
                }}
              >
                <Star className="h-4 w-4" strokeWidth={2} />
                Record lesson {lesson.n} complete
              </button>
            )}
          </>
        ) : (
          <>
            {needsPractice && (
              <p className="mb-3 text-sm font-semibold text-amber-300">
                Needs practice — review again
              </p>
            )}
            <button
              type="button"
              data-testid="core30-mastered-button"
              onClick={() => void markMastered()}
              disabled={marking}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
                color: "#0B0B0F",
              }}
            >
              <Star className="h-4 w-4" strokeWidth={2} />
              {needsPractice ? "I've mastered it again" : "I've mastered this lesson"}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/40">
              Only you decide this. Opened steps are recorded automatically.
            </p>
          </>
        )}
      </section>

      {lessonButtons("bottom")}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const XP_TIERS = [
  { name: "Beginner", min: 0, emoji: "🌱", color: "#6b7280" },
  { name: "Apprentice", min: 200, emoji: "📖", color: "#60a5fa" },
  { name: "Scholar", min: 600, emoji: "🎓", color: "#a78bfa" },
  { name: "Linguist", min: 1400, emoji: "🗣️", color: "#34d399" },
  { name: "Maestro", min: 3000, emoji: "✦", color: "#d4af37" },
];

function scrollLessonPageToTop() {
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
}

export function AppGuide() {
  useEffect(scrollLessonPageToTop, []);
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const moduleId = state.activeModuleId ?? "";
  const curriculum = getCurriculum(moduleId);

  const flow = getFlow(state.activeModuleId);
  const tip = getModuleTip(state.activeModuleId);
  const tourSteps = getTourScript(state.activeModuleId);

  // XP tier progress
  const xp = state.xp ?? 0;
  const currentTierIdx = XP_TIERS.reduce((best, t, i) => (xp >= t.min ? i : best), 0);
  const nextTier = XP_TIERS[currentTierIdx + 1];
  const curTier = XP_TIERS[currentTierIdx];
  const tierPct = nextTier
    ? Math.round(((xp - curTier.min) / (nextTier.min - curTier.min)) * 100)
    : 100;

  function go(tab: TabKey) {
    dispatch({ type: "SET_TAB", payload: tab });
  }

  return (
    <>
      {tourOpen && <AppTour onClose={() => setTourOpen(false)} />}
      <div className="mx-auto max-w-2xl space-y-8 pb-12">
        {/* ── Lesson Planner ────────────────────────────────────────────── */}
        {curriculum ? (
          <Core30Section
            key={`${user?.id ?? "guest"}:${state.activeModuleId}:${state.selectedLanguage}:${state.nativeLanguage}`}
          />
        ) : (
          /* ── Fallback: legacy daily flow for modules without Core 30 ── */
          <section>
            <div className="mb-4">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                App Guide
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your daily flow, feature map, and module-specific tips.
              </p>
            </div>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
              Daily Flow · ~20 min
            </h2>
            <div className="relative space-y-0">
              {flow.map((step, i) => (
                <div key={i} className="relative flex gap-4">
                  {i < flow.length - 1 && (
                    <span className="absolute left-5 top-10 bottom-0 w-px bg-border/40" />
                  )}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/60 text-lg">
                    {step.icon}
                  </div>
                  <div className="pb-5 pt-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{step.title}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-gold/70">
                        {step.time}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">→ {step.tab}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                      {step.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Module Tips ─────────────────────────────────────────────────── */}
        {tip && (
          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
              {tip.headline}
            </h2>
            <div className="space-y-2 mb-5">
              {tip.tips.map((t, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3"
                >
                  <span className="text-gold/70 font-bold shrink-0">·</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t}</p>
                </div>
              ))}
            </div>

            {tip.priority && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Learn in this order
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tip.priority.map((p, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-medium",
                        i === 0
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-border/50 bg-card/40 text-muted-foreground",
                      )}
                    >
                      {i + 1}. {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tip.cognates && (
              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  High-value cognates
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {tip.cognates.map((c) => (
                    <div
                      key={c.word}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-gold">{c.word}</span>
                      <span className="text-[11px] text-muted-foreground">{c.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Feature Map (collapsible) ────────────────────────────────────── */}
        <section>
          <button
            onClick={() => setFeaturesOpen((o) => !o)}
            className="flex items-center gap-2 mb-3 group"
          >
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
              The Toolkit
            </h2>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-gold/60 transition-transform",
                featuresOpen && "rotate-90",
              )}
            />
          </button>
          {featuresOpen && (
            <div className="space-y-1.5">
              {FEATURES.map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/30 px-4 py-3 hover:border-border/60 transition-colors"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card/80 border border-border/40">
                    <Icon className="h-3.5 w-3.5 text-gold/80" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Change Module CTA ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gold/20 bg-gold/5 p-5">
          <div className="flex items-start gap-4">
            <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold">Switch your module anytime</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Medical, trades, sports, faith — each module unlocks a vocabulary pack and a Core 30
                curriculum tuned to your field.
              </p>
              <button
                onClick={() => go("modules")}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
              >
                Change module <Activity className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Optional personalization remains reachable after module selection ─── */}
        <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-gold/5 p-5">
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {state.activeModuleId ? "Adjust your learning setup" : "Personalize for your goals"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Reader works without setup. Choose or update your profession and level to tailor
                Tutor, readings, and relevant practice. Current level: {state.level}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("lt:open-personalization"))}
                  className="flex min-h-11 items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/15 px-4 py-2 text-xs font-semibold text-gold-ink hover:bg-gold/25 transition-colors"
                >
                  {state.activeModuleId ? "Update profession or level" : "Personalize my learning"}{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── App Tour Banner ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card/80 to-card/40 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
              <Map className="h-4.5 w-4.5 text-gold" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">App Walkthrough</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Highlights every icon in your sidebar — {tourSteps.length} stops tailored to
                {state.activeModuleId
                  ? ` your ${state.activeModuleId.replace(/-/g, " ")} module`
                  : " your learning goals"}
                .
              </p>
              <button
                onClick={() => setTourOpen(true)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-mono font-medium text-gold hover:bg-gold/20 transition-colors uppercase tracking-widest"
              >
                Start Tour <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* ── How Core 30 works ──────────────────────────────────────────── */}
        {curriculum && (
          <section className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
                <BookOpen className="h-4 w-4 text-gold" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">How Core 30 works</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The thinking behind the 30 lessons, the six ways you learn each one, and the
                  90-day rhythm.
                </p>
                <button
                  type="button"
                  data-testid="guide-core30-how"
                  onClick={() => {
                    requestCore30Philosophy();
                    go("core30");
                  }}
                  className="mt-3 flex min-h-11 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
                >
                  Read how it works <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Progress Overview ────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
            Your Progress
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-card/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{xp.toLocaleString()}</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                XP
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {state.streak ?? 0}
                <span className="text-base ml-0.5">🔥</span>
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Day Streak
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/40 p-3 text-center col-span-2">
              <p className="text-lg font-semibold" style={{ color: curTier.color }}>
                {curTier.emoji} {curTier.name}
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Current Tier
              </p>
            </div>
          </div>

          {/* XP Tier progress */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">
                {curTier.emoji} {curTier.name}
              </span>
              {nextTier && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {nextTier.emoji} {nextTier.name} at {nextTier.min.toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-border/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tierPct}%`,
                  background: `linear-gradient(90deg, ${curTier.color}99, ${curTier.color})`,
                }}
              />
            </div>
            {nextTier ? (
              <p className="font-mono text-[10px] text-muted-foreground text-right">
                {(nextTier.min - xp).toLocaleString()} XP to {nextTier.name}
              </p>
            ) : (
              <p className="font-mono text-[10px] text-gold text-center">✦ Maximum tier reached</p>
            )}
          </div>

          {/* How XP works */}
          <details className="group rounded-xl border border-border/30 bg-card/20">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors list-none">
              How XP works
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 space-y-1.5">
              {[
                ["Open a new tab", "+5 XP"],
                ["Send a message in Speak or Field Prep", "+8 XP"],
                ["Start a scenario or session", "+10 XP"],
                ["Complete a Guide lesson", "+50 XP"],
              ].map(([action, reward]) => (
                <div
                  key={action}
                  className="flex items-center justify-between py-1 border-b border-border/20 last:border-0"
                >
                  <span className="text-xs text-muted-foreground">{action}</span>
                  <span className="font-mono text-[11px] text-gold">{reward}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>
    </>
  );
}

// ─── Core 30 ──────────────────────────────────────────────────────────────────

/** The module's 30-lesson path: progress, the next lesson and the lesson runner.
 *  Shown inside the App Guide and as the standalone Core 30 tab. */
const CORE30_VIEW_KEY = "lt.core30.view";

/** Ask the Core 30 tab to open on "How Core 30 works" (read once by the tab). */
function requestCore30Philosophy() {
  try {
    window.sessionStorage.setItem(CORE30_VIEW_KEY, "how");
  } catch {
    // Blocked storage: the learner lands on Core 30 and uses the "How Core 30 works" link.
  }
}

function consumeCore30Philosophy(): boolean {
  try {
    const asked = window.sessionStorage.getItem(CORE30_VIEW_KEY) === "how";
    window.sessionStorage.removeItem(CORE30_VIEW_KEY);
    return asked;
  } catch {
    return false;
  }
}

/** The module's 30-lesson path: progress, the next lesson and the lesson runner.
 *  Shown inside the App Guide and as the standalone Core 30 tab. `restoreView` (the tab only)
 *  reopens the lesson a learner left for the Speak tab or the Reader, and honors a request to
 *  open on "How Core 30 works". */
function Core30Section({ restoreView = false }: { restoreView?: boolean }) {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const moduleId = state.activeModuleId ?? "";
  const downloadPackId = offlineLessonPackId(
    moduleId,
    state.selectedLanguage,
    state.nativeLanguage,
  );
  const [activeAssessmentPlan] = useState(() => {
    if (typeof window === "undefined") return undefined;
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("module") !== moduleId ||
      params.get("target") !== state.selectedLanguage ||
      params.get("native") !== state.nativeLanguage
    )
      return undefined;
    const value = params.get("plan");
    return value && /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
  });
  const progressContext = useMemo(
    () => ({
      targetLanguage: state.selectedLanguage,
      instructionLanguage: state.nativeLanguage,
      enrollmentId: activeAssessmentPlan,
    }),
    [state.selectedLanguage, state.nativeLanguage, activeAssessmentPlan],
  );
  const progressKey = core30ScopeKey(moduleId, progressContext);
  const [approvedPlanTiming, setApprovedPlanTiming] = useState<AssessedPlanTiming | null>(
    activeAssessmentPlan ? null : { reviewEveryDays: 4 },
  );
  const positionKey = lessonPositionKey(
    user?.id ?? "anonymous",
    moduleId,
    state.selectedLanguage,
    state.nativeLanguage,
    activeAssessmentPlan,
  );
  const [savedPositionState, setSavedPositionState] = useState<{
    key: string;
    position: LessonPosition | null;
  }>({ key: positionKey, position: null });
  const savedPosition = savedPositionState.key === positionKey ? savedPositionState.position : null;
  const [returnTarget] = useState(() => {
    if (
      !restoreView ||
      !canRestoreLessonReturn(window.location.href, {
        moduleId,
        target: state.selectedLanguage,
        native: state.nativeLanguage,
      })
    )
      return null;
    const marker = readLessonReturn(browserReturnStorage(), Date.now());
    const total = getCurriculum(moduleId)?.lessons.length ?? 0;
    return marker && marker.moduleId === moduleId && marker.lesson <= total ? marker : null;
  });
  const [linkedLesson] = useState(() =>
    restoreView &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("target") === state.selectedLanguage &&
    new URLSearchParams(window.location.search).get("native") === state.nativeLanguage
      ? requestedLesson(
          new URLSearchParams(window.location.search),
          moduleId,
          getCurriculum(moduleId)?.lessons.length ?? 0,
        )
      : null,
  );
  const [openLessonN, setOpenLessonN] = useState<number | null>(
    linkedLesson?.lesson ?? returnTarget?.lesson ?? null,
  );
  const [initialWay, setInitialWay] = useState<SectionId | undefined>(
    (linkedLesson?.way as SectionId | undefined) ?? returnTarget?.section,
  );
  useEffect(() => {
    try {
      const storage = user?.id ? window.localStorage : window.sessionStorage;
      const position = readLessonPosition(storage, positionKey);
      const valid =
        position && getCurriculum(moduleId)?.lessons.some((l) => l.n === position.lesson)
          ? position
          : null;
      setSavedPositionState({ key: positionKey, position: valid });
    } catch {
      setSavedPositionState({ key: positionKey, position: null });
    }
  }, [positionKey, moduleId, user?.id, openLessonN]);
  useEffect(() => {
    if (!restoreView || openLessonN !== null) return;
    const next = lessonOverviewLocation(window.location.href, {
      moduleId,
      target: state.selectedLanguage,
      native: state.nativeLanguage,
    });
    if (next && next !== window.location.pathname + window.location.search + window.location.hash)
      window.history.replaceState(window.history.state, "", next);
  }, [restoreView, openLessonN, moduleId, state.selectedLanguage, state.nativeLanguage]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [howOpen, setHowOpen] = useState(() => (restoreView ? consumeCore30Philosophy() : false));
  const [listOpen, setListOpen] = useState(false);
  // A return marker is spent the moment Core 30 opens, however the learner got here (return
  // pill, auto-return, tab bar or the App Guide). The lesson to reopen was read above.
  useEffect(() => {
    clearLessonReturn(browserReturnStorage());
  }, []);

  const curriculum = getCurriculum(moduleId);
  const hasCurriculum = Boolean(curriculum);
  // Fetch the module's whole pre-built word deck once the learner opens Core 30, so every
  // lesson is ready and the service worker has it for offline use.
  useEffect(() => {
    if (hasCurriculum) prefetchLessonDeck(moduleId, state.selectedLanguage, state.nativeLanguage);
  }, [hasCurriculum, moduleId, state.selectedLanguage, state.nativeLanguage]);
  if (!curriculum) return null;
  const core30Log = state.core30Log[progressKey];
  const practiceLesson = curriculum.lessons.find(
    (lesson) => core30Log?.lessons[String(lesson.n)]?.needsPractice,
  );
  const currentLesson =
    practiceLesson ?? getCurrentLesson(moduleId, state.lessonProgress, progressKey);
  const openLesson =
    openLessonN === null ? null : (curriculum.lessons.find((l) => l.n === openLessonN) ?? null);
  const runnerActive = openLesson !== null;
  const masteredSet = new Set(masteredLessons(core30Log));
  const completedCount = state.lessonProgress[progressKey] ?? 0;
  const totalLessons = curriculum.lessons.length;
  const progressPct = (completedCount / totalLessons) * 100;
  const allDone = completedCount >= totalLessons;
  const planStarted = planToday(core30Log, totalLessons, toDateKey(new Date())).started;

  function openLessonFromPlan(n: number, way: SectionId = "see") {
    if (!restoreView) {
      // All entry points use the standalone runner, which owns refreshable
      // lesson/way links. Set the location before mounting that runner so it
      // reads the requested position rather than falling back to the overview.
      const next = lessonLocation(
        window.location.href,
        { moduleId, target: state.selectedLanguage, native: state.nativeLanguage },
        { lesson: n, way },
      );
      if (next) window.history.replaceState(window.history.state, "", next);
      dispatch({ type: "SET_TAB", payload: "core30" });
      scrollLessonPageToTop();
      return;
    }
    setReviewOpen(false);
    setHowOpen(false);
    setInitialWay(way);
    setOpenLessonN(n);
    scrollLessonPageToTop();
  }

  function handleComplete() {
    setInitialWay(undefined);
    setOpenLessonN(null);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 4000);
  }

  return (
    <section>
      {/* Curriculum header (an open lesson takes the whole page) */}
      {!runnerActive && (
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {curriculum.headline}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{curriculum.threshold}</p>
          <a
            className="mr-4 mt-2 inline-flex min-h-11 items-center text-sm text-gold underline"
            href={examsLocation({
              moduleId,
              target: state.selectedLanguage,
              native: state.nativeLanguage,
              returnPlanId: activeAssessmentPlan,
              orgId: approvedPlanTiming?.organizationId,
            })}
          >
            Entrance, day 45 and day 90 exams
          </a>
          {!howOpen && (
            <button
              type="button"
              data-testid="core30-how-link"
              onClick={() => {
                setReviewOpen(false);
                setOpenLessonN(null);
                setHowOpen(true);
                window.scrollTo({ top: 0, behavior: scrollBehavior() });
              }}
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-foreground underline decoration-gold/50 underline-offset-4 hover:text-gold"
            >
              How Core 30 works
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* How Core 30 works, in place */}
      {howOpen && <Core30Philosophy onBack={() => setHowOpen(false)} />}

      {!howOpen && (
        <>
          {/* Celebration banner */}
          {justCompleted && (
            <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center animate-in fade-in duration-300">
              <p className="text-gold font-semibold">✓ Lesson complete! +50 XP</p>
              <p className="text-xs text-white/60 mt-1">
                Continue when you’re ready, or follow the dates in your plan.
              </p>
            </div>
          )}

          {/* Review session */}
          {reviewOpen && (
            <Core30Review
              enrollmentId={activeAssessmentPlan}
              moduleId={moduleId}
              lessons={curriculum.lessons}
              onClose={() => setReviewOpen(false)}
            />
          )}

          {/* Any lesson opened from the plan or the lesson list */}
          {!reviewOpen && openLesson && (
            <LessonRunner
              enrollmentId={activeAssessmentPlan}
              key={`${progressKey}:${openLesson.n}`}
              lesson={openLesson}
              moduleId={moduleId}
              totalLessons={totalLessons}
              initialSection={initialWay}
              onSectionChange={setInitialWay}
              syncLocation={restoreView}
              onComplete={handleComplete}
              onExit={() => setOpenLessonN(null)}
              onNavigate={openLessonFromPlan}
            />
          )}

          {/* Current lesson card or all-done state */}
          {!reviewOpen && !runnerActive && (!allDone || practiceLesson) && currentLesson && (
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card to-card/60 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70 mb-1">
                    {practiceLesson ? "Practice again" : "Next Up"} · Lesson {currentLesson.n}
                  </p>
                  <h3 className="text-xl font-semibold text-white">{currentLesson.title}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0 rounded-full border border-gold/25 bg-gold/10 px-3 py-1">
                  <span className="text-[11px] font-mono text-gold">
                    ~{currentLesson.steps.reduce((s, st) => s + st.durationMin, 0)} min
                  </span>
                </div>
              </div>

              <p className="text-sm text-white/60 mb-4">
                <span className="text-gold/80">Goal: </span>
                {currentLesson.objective}
              </p>

              {/* Start stays reachable before the detailed six-mode preview. */}
              <button
                onClick={() => openLessonFromPlan(currentLesson.n)}
                className={cn(
                  "mb-4 w-full min-h-11 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90",
                  planStarted && "border border-gold/40 bg-transparent text-gold",
                )}
                style={
                  planStarted
                    ? undefined
                    : {
                        background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
                        color: "#0B0B0F",
                      }
                }
              >
                {practiceLesson ? "Practice" : "Start"} Lesson {currentLesson.n}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>

              {/* Step preview */}
              <div className="space-y-1.5 mb-5">
                {SECTIONS.map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/40">
                      {i + 1}
                    </span>
                    <span className="text-xs text-white/70 flex-1">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Every lesson, with the app's record (opened) next to the learner's (mastered) */}
          {!reviewOpen && !runnerActive && savedPosition && (
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl border border-gold/30 px-4 py-3 text-left text-sm text-gold"
              onClick={() => openLessonFromPlan(savedPosition.lesson, savedPosition.way)}
            >
              {masteredSet.has(savedPosition.lesson) ? "Review" : "Resume"} Lesson{" "}
              {savedPosition.lesson} · {SECTIONS.find((s) => s.id === savedPosition.way)?.label}
            </button>
          )}
          {!reviewOpen && !runnerActive && (
            <div className="mt-4">
              <button
                type="button"
                data-testid="core30-all-lessons-toggle"
                aria-expanded={listOpen}
                onClick={() => setListOpen((v) => !v)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/[0.05] px-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-gold/10"
              >
                <span>
                  All {totalLessons} lessons
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {masteredSet.size} mastered
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-gold transition-transform",
                    listOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              {listOpen && (
                <ul className="mt-2 space-y-1">
                  {curriculum.lessons.map((l) => {
                    const entry = core30Log?.lessons?.[String(l.n)];
                    const opened = openedWayCount(entry);
                    const priorSteps = Object.keys(entry?.visits ?? {}).filter((key) =>
                      /^\d+$/.test(key),
                    ).length;
                    const mastered = masteredSet.has(l.n);
                    return (
                      <li key={l.n}>
                        <button
                          type="button"
                          onClick={() => openLessonFromPlan(l.n)}
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left hover:border-white/20"
                        >
                          {mastered ? (
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-gold"
                              strokeWidth={1.8}
                              aria-label="Mastered"
                            />
                          ) : (
                            <Circle
                              className="h-4 w-4 shrink-0 text-white/20"
                              strokeWidth={1.5}
                              aria-label="Not mastered"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-xs text-white/80">
                            {l.n}. {l.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-mono text-white/40">
                            {entry?.needsPractice
                              ? "needs practice"
                              : opened > 0
                                ? `${opened}/6 ways opened`
                                : priorSteps > 0
                                  ? `${priorSteps} prior steps opened`
                                  : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {!reviewOpen && (
            <Suspense fallback={null}>
              <DailyLessonPlan
                moduleId={moduleId}
                target={state.selectedLanguage}
                native={state.nativeLanguage}
                lessonNumber={openLesson?.n}
                lessonWay={initialWay}
                activePlanId={activeAssessmentPlan}
                onPlanTiming={setApprovedPlanTiming}
              />
            </Suspense>
          )}

          {/* Planning and progress follow the lesson actions on every screen size. */}
          {/* 90-day plan: start date, today's lesson, review cadence */}
          {!reviewOpen && !runnerActive && approvedPlanTiming === null && (
            <p role="status" className="my-4 text-sm">
              This plan’s schedule is not available. Your lesson list remains available.
            </p>
          )}
          {!reviewOpen && !runnerActive && approvedPlanTiming !== null && (
            <Core30PlanCard
              enrollmentId={activeAssessmentPlan}
              reviewEveryDays={approvedPlanTiming.reviewEveryDays}
              assessedTiming={activeAssessmentPlan ? approvedPlanTiming : undefined}
              managedPlanUrl={
                activeAssessmentPlan
                  ? examsLocation({
                      moduleId,
                      target: state.selectedLanguage,
                      native: state.nativeLanguage,
                      orgId: approvedPlanTiming.organizationId,
                      returnPlanId: activeAssessmentPlan,
                    })
                  : undefined
              }
              moduleId={moduleId}
              totalLessons={totalLessons}
              onOpenLesson={openLessonFromPlan}
              onStartReview={() => {
                setOpenLessonN(null);
                setReviewOpen(true);
              }}
            />
          )}

          {!runnerActive && <LegacyCore30History moduleId={moduleId} context={progressContext} />}

          {/* Progress bar */}
          {!runnerActive && (
            <div className="mb-5 rounded-2xl border border-white/[0.07] bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  {completedCount} / {totalLessons} lessons complete
                </span>
                <span className="text-xs font-mono text-gold">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg, #C9A84C, #E8C878)",
                  }}
                />
              </div>
              {allDone && (
                <p className="mt-2 text-xs text-gold text-center">
                  🎉 Curriculum complete! You are past the threshold.
                </p>
              )}
            </div>
          )}

          {!reviewOpen && !runnerActive && downloadPackId && (
            <OfflineLessonDownload
              key={`${moduleId}:${state.selectedLanguage}:${state.nativeLanguage}`}
              packId={downloadPackId}
            />
          )}

          {/* Completed lessons list (collapsed) */}
          {completedCount > 0 && !runnerActive && !reviewOpen && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-[11px] text-white/30 hover:text-white/60 transition-colors select-none list-none flex items-center gap-2">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                {completedCount} completed lesson{completedCount !== 1 ? "s" : ""}
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {curriculum.lessons.slice(0, completedCount).map((l) => (
                  <div key={l.n} className="flex items-center gap-2 text-xs text-white/30 py-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gold/50 shrink-0" strokeWidth={1.5} />
                    Lesson {l.n} — {l.title}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/** Standalone Core 30 tab. Without a module that has a Core 30, it points to Modules. */
export function Core30Tab() {
  useEffect(scrollLessonPageToTop, []);
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const hasCore30 = Boolean(getCurriculum(state.activeModuleId ?? ""));
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {hasCore30 ? (
        <Core30Section
          key={`${user?.id ?? "guest"}:${state.activeModuleId}:${state.selectedLanguage}:${state.nativeLanguage}`}
          restoreView
        />
      ) : (
        <section className="rounded-2xl border border-gold/30 bg-gold/5 p-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Core 30</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Each module has a 30-lesson path built for your field. Choose a module to start yours.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_TAB", payload: "modules" })}
            className="mt-4 min-h-11 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/20"
          >
            Choose a module
          </button>
        </section>
      )}
    </div>
  );
}
