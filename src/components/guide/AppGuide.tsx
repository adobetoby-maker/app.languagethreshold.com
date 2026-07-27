import { useState } from "react";
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
  Star,
  Map,
} from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import { useLibrary } from "@/state/library-state";
import { cn } from "@/lib/utils";
import {
  getCurriculum,
  getCurrentLesson,
  getModuleReadingId,
  type Lesson,
} from "@/data/curriculum";
import { AppTour } from "@/components/onboarding/AppTour";
import { getTourScript } from "@/data/tour-scripts";
import { isToolAvailable, TOOL_CATALOG_LIST, type LearningStage } from "@/components/tab-registry";

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

function LessonRunner({
  lesson,
  moduleId,
  onComplete,
  onExit,
}: {
  lesson: Lesson;
  moduleId: string;
  onComplete: () => void;
  onExit: () => void;
}) {
  const { dispatch } = useApp();
  const { state: lib } = useLibrary();
  const { dispatch: libDispatch } = useLibrary();
  const [done, setDone] = useState<Set<number>>(new Set());

  const allDone = done.size === lesson.steps.length;
  const totalMin = lesson.steps.reduce((s, step) => s + step.durationMin, 0);

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function goToTab(tab: TabKey, readingTemplate?: string) {
    if (readingTemplate) {
      // Resolve {lang} from current selected reading's language or a default
      const langEntry = lib.entries.find((e) => e.id === lib.selectedId);
      const lang = langEntry?.language ?? "Spanish";
      const resolved = getModuleReadingId(moduleId, lang, lib.entries);
      if (resolved) libDispatch({ type: "SELECT", payload: resolved });
    }
    dispatch({ type: "SET_TAB", payload: tab });
  }

  function complete() {
    dispatch({ type: "COMPLETE_LESSON", payload: moduleId });
    dispatch({ type: "ADD_XP", payload: 50 });
    onComplete();
  }

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
            onClick={onExit}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors mt-1 shrink-0"
          >
            ✕ Exit
          </button>
        </div>
        <p className="text-sm text-white/60 mt-1">
          <span className="text-gold/80 mr-1">Goal:</span>
          {lesson.objective}
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {lesson.steps.map((step, i) => {
          const isDone = done.has(i);
          return (
            <div
              key={i}
              className={cn(
                "rounded-xl border transition-all",
                isDone ? "border-gold/25 bg-gold/[0.04]" : "border-white/[0.08] bg-card/40",
              )}
            >
              <div className="flex items-start gap-3 p-4">
                <button onClick={() => toggle(i)} className="mt-0.5 shrink-0 transition-colors">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-gold" strokeWidth={1.8} />
                  ) : (
                    <Circle
                      className="h-5 w-5 text-white/20 hover:text-white/50"
                      strokeWidth={1.5}
                    />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isDone ? "text-gold/70 line-through" : "text-white",
                      )}
                    >
                      Step {i + 1} — {step.tabLabel}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono">
                      {step.durationMin} min
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      isDone ? "text-white/30" : "text-white/60",
                    )}
                  >
                    {step.instruction}
                  </p>
                </div>
                <button
                  onClick={() =>
                    goToTab(step.tab, step.tab === "reader" ? lesson.readingTemplate : undefined)
                  }
                  className="flex items-center gap-1 shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/60 hover:text-white hover:border-white/20 transition-colors mt-0.5"
                >
                  Go <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete button */}
      {allDone ? (
        <button
          onClick={complete}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
            color: "#0B0B0F",
          }}
        >
          <Star className="h-4 w-4" strokeWidth={2} />
          Complete Lesson {lesson.n} · +50 XP
        </button>
      ) : (
        <p className="text-center text-xs text-white/30">
          Check off each step when done · {lesson.steps.length - done.size} remaining
        </p>
      )}
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

export function AppGuide() {
  const { state, dispatch } = useApp();
  const [runnerActive, setRunnerActive] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const moduleId = state.activeModuleId ?? "";
  const curriculum = getCurriculum(moduleId);
  const currentLesson = curriculum ? getCurrentLesson(moduleId, state.lessonProgress) : null;
  const completedCount = state.lessonProgress[moduleId] ?? 0;
  const totalLessons = curriculum?.lessons.length ?? 30;
  const progressPct = curriculum ? (completedCount / totalLessons) * 100 : 0;
  const allDone = curriculum && completedCount >= totalLessons;

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

  function handleComplete() {
    setRunnerActive(false);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 4000);
  }

  return (
    <>
      {tourOpen && <AppTour onClose={() => setTourOpen(false)} />}
      <div className="mx-auto max-w-2xl space-y-8 pb-12">
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
                <button
                  onClick={() => go("modules")}
                  className="min-h-11 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Browse specialty modules
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-ink">
              Complete toolkit
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground">
              One system, not a pile of tabs
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Start with Reader, keep important words in My Vocab, then choose the kind of practice
              that moves them toward real use.
            </p>
          </div>

          {(["Understand", "Remember", "Use", "Grow", "Specialize"] as LearningStage[]).map(
            (stage) => {
              const tools = TOOL_CATALOG_LIST.filter((tool) => tool.stage === stage);
              return (
                <div key={stage}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {stage}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tools.map((tool) => {
                      const available = isToolAvailable(tool, state.activeModuleId);
                      return (
                        <article
                          key={tool.key}
                          data-activity={tool.accent}
                          className="tool-purpose flex min-h-[116px] flex-col rounded-xl border bg-card/45 p-3.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="tool-purpose-dot h-2.5 w-2.5 shrink-0 rounded-full"
                              aria-hidden
                            />
                            <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
                          </div>
                          <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                            {tool.purpose}
                          </p>
                          <button
                            type="button"
                            onClick={() => go(available ? tool.key : "modules")}
                            className="mt-3 min-h-11 self-start rounded-lg px-3 py-2 text-xs font-semibold text-foreground underline decoration-gold/50 underline-offset-4 hover:text-gold-ink"
                          >
                            {available ? "Open" : tool.gate?.description}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
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

        {/* ── Lesson Planner ────────────────────────────────────────────── */}
        {curriculum ? (
          <section>
            {/* Curriculum header */}
            <div className="mb-4">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {curriculum.headline}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{curriculum.threshold}</p>
            </div>

            {/* Progress bar */}
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

            {/* Celebration banner */}
            {justCompleted && (
              <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center animate-in fade-in duration-300">
                <p className="text-gold font-semibold">✓ Lesson complete! +50 XP</p>
                <p className="text-xs text-white/60 mt-1">Come back tomorrow for the next one.</p>
              </div>
            )}

            {/* Current lesson card or all-done state */}
            {!allDone &&
              currentLesson &&
              (runnerActive ? (
                <LessonRunner
                  lesson={currentLesson}
                  moduleId={moduleId}
                  onComplete={handleComplete}
                  onExit={() => setRunnerActive(false)}
                />
              ) : (
                <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card to-card/60 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70 mb-1">
                        Next Up · Lesson {currentLesson.n}
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

                  {/* Step preview */}
                  <div className="space-y-1.5 mb-5">
                    {currentLesson.steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/40">
                          {i + 1}
                        </span>
                        <span className="text-xs text-white/70 flex-1">{step.tabLabel}</span>
                        <span className="text-[10px] font-mono text-white/30">
                          {step.durationMin}m
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setRunnerActive(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
                      color: "#0B0B0F",
                    }}
                  >
                    Start Lesson {currentLesson.n}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              ))}

            {/* Completed lessons list (collapsed) */}
            {completedCount > 0 && !runnerActive && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-[11px] text-white/30 hover:text-white/60 transition-colors select-none list-none flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  {completedCount} completed lesson{completedCount !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 space-y-1 pl-4">
                  {curriculum.lessons.slice(0, completedCount).map((l) => (
                    <div key={l.n} className="flex items-center gap-2 text-xs text-white/30 py-0.5">
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-gold/50 shrink-0"
                        strokeWidth={1.5}
                      />
                      Lesson {l.n} — {l.title}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
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
                Browse modules <Activity className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
