import { examsLocation } from "@/lib/exam-navigation";
import {
  BookOpen,
  GraduationCap,
  Mic2,
  MessageCircle,
  BarChart3,
  Church,
  Activity,
  Flame,
  Star,
  Trophy,
  Repeat2,
  AlignLeft,
  Gamepad2,
  ListChecks,
  Headphones,
  Grid3x3,
  Quote,
  AlertTriangle,
  Mail,
  Layers,
  Sparkle,
  Compass,
  Puzzle,
  ChevronDown,
  Shield,
  LibraryBig,
  ArrowRightLeft,
  Menu,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
  RotateCcw,
  History,
  Volume2,
  NotebookPen,
  PenLine,
  BookmarkPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useApp,
  LANGUAGES,
  NATIVE_LANGUAGES,
  type TabKey,
  type Language,
  type NativeLanguage,
} from "@/state/app-state";
import { MultilingualNoteInput } from "@/components/notes/MultilingualNoteInput";
import { HandwritingCanvas } from "@/components/kana/HandwritingCanvas";
import { useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useSpeech } from "@/state/speech-state";
import { useTutor } from "@/state/tutor-state";
import { ADD_WORD_EVENT } from "@/components/vocab/GlobalVocabCapture";
import { useNotes } from "@/state/notes-state";
import { getModule } from "@/data/modules";
import { CountUp } from "./CountUp";
import { cn } from "@/lib/utils";
import { ModulePickerDialog } from "./ModulePickerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VoicePicker } from "./VoicePicker";
import { reloadNewestAppVersion, resetAppToFirstRun } from "@/lib/app-update";
import { PwaInstallControl } from "./PwaInstallControl";

// Uses the canonical list from app-state — see TopNav for why a local copy is
// a bug waiting to happen.

// Modules that get a Field Prep tab
const FIELD_PREP_MODULE_IDS = new Set([
  "lds-missionary",
  // medical
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
  // trades
  "construction-foreman",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "framer",
  "construction-safety",
  // sports
  "soccer",
  "baseball",
  "hockey",
  "tennis",
]);

const TAB_ITEMS: {
  key: TabKey;
  label: string;
  short: string;
  group: string;
  Icon: React.ElementType;
  moduleOnly?: string;
  moduleFilter?: (id: string | null) => boolean;
  languages?: Language[];
}[] = [
  // ── Orientation ──────────────────────────────────────────────────────────────
  { key: "guide", label: "App Guide", short: "Guide", group: "Orientation", Icon: Compass },
  {
    key: "dashboard",
    label: "Dashboard",
    short: "Progress",
    group: "Orientation",
    Icon: BarChart3,
  },
  { key: "exams", label: "Exams", short: "Exams", group: "Orientation", Icon: ListChecks },
  // ── Module-specific ──────────────────────────────────────────────────────────
  {
    key: "missionary",
    label: "Missionary",
    short: "Mission",
    group: "Module",
    Icon: Church,
    moduleOnly: "lds-missionary",
  },
  {
    key: "fieldPrep",
    label: "Field Prep",
    short: "Field Prep",
    group: "Module",
    Icon: Shield,
    moduleFilter: (id) => !!id && FIELD_PREP_MODULE_IDS.has(id),
  },
  {
    key: "discussions",
    label: "Discussions",
    short: "Discuss",
    group: "Module",
    Icon: MessageCircle,
    moduleOnly: "lds-missionary",
  },
  {
    key: "orthopedics",
    label: "Orthopedics",
    short: "Ortho",
    group: "Module",
    Icon: Activity,
    moduleOnly: "orthopedics",
  },
  // ── Core lessons ─────────────────────────────────────────────────────────────
  { key: "reader", label: "Reader", short: "Reader", group: "Core Lessons", Icon: BookOpen },
  {
    key: "characters",
    label: "Character Studio",
    short: "Characters",
    group: "Core Lessons",
    Icon: PenLine,
    languages: ["Japanese", "Chinese"],
  },
  { key: "story", label: "Daily Story", short: "Story", group: "Core Lessons", Icon: Sparkle },
  {
    key: "grammar",
    label: "Grammar Studio",
    short: "Grammar",
    group: "Core Lessons",
    Icon: GraduationCap,
  },
  {
    key: "patterns",
    label: "Grammar Patterns",
    short: "Patterns",
    group: "Core Lessons",
    Icon: Layers,
  },
  {
    key: "cognates",
    label: "Cognate Bridge",
    short: "Cognates",
    group: "Core Lessons",
    Icon: ArrowRightLeft,
  },
  {
    key: "conjugation",
    label: "Conjugation",
    short: "Conjugate",
    group: "Core Lessons",
    Icon: Repeat2,
  },
  {
    key: "sentenceBuild",
    label: "Sentence Builder",
    short: "Sentences",
    group: "Core Lessons",
    Icon: AlignLeft,
  },
  {
    key: "listeningDrill",
    label: "Listening Drill",
    short: "Listening",
    group: "Core Lessons",
    Icon: Headphones,
  },
  { key: "speak", label: "Speak & Learn", short: "Speak", group: "Core Lessons", Icon: Mic2 },
  { key: "penpal", label: "Pen Pal Practice", short: "Pen Pal", group: "Core Lessons", Icon: Mail },
  // ── Vocabulary ───────────────────────────────────────────────────────────────
  { key: "flashcards", label: "Flashcards", short: "Cards", group: "Vocabulary", Icon: Layers },
  { key: "dictionary", label: "Dictionary", short: "Dict.", group: "Vocabulary", Icon: LibraryBig },
  { key: "wordMatch", label: "Word Match", short: "Words", group: "Vocabulary", Icon: Grid3x3 },
  { key: "idiomMaster", label: "Idiom Master", short: "Idioms", group: "Vocabulary", Icon: Quote },
  {
    key: "falseFriends",
    label: "False Friends",
    short: "False Fr.",
    group: "Vocabulary",
    Icon: AlertTriangle,
  },
  // ── Play ─────────────────────────────────────────────────────────────────────
  { key: "games", label: "Games Hub", short: "Games", group: "Play", Icon: Gamepad2 },
  { key: "core30", label: "Core 30", short: "Core 30", group: "Play", Icon: ListChecks },
];

const TAB_GROUP_ORDER = ["Orientation", "Module", "Core Lessons", "Vocabulary", "Play"];

const VISITED_KEY = "lt.visitedTabs.session";
const TAB_XP = 5;

// Tabs that have their own slot in the bottom bar. Any other current tab (Core 30,
// Story, Dictionary...) lives behind More on a phone, so More is what lights up then.
const BAR_TABS: { key: TabKey; Icon: React.ElementType; label: string }[] = [
  { key: "reader", Icon: BookOpen, label: "Reader" },
  { key: "flashcards", Icon: Layers, label: "Cards" },
  { key: "grammar", Icon: GraduationCap, label: "Grammar" },
  { key: "games", Icon: Gamepad2, label: "Games" },
  { key: "speak", Icon: Mic2, label: "Speak" },
  { key: "dashboard", Icon: BarChart3, label: "Dashboard" },
];

function openAddWord() {
  window.dispatchEvent(new CustomEvent(ADD_WORD_EVENT));
}

/** Lives in its own component so tutor streaming re-renders only this button, not the sidebar. */
function TutorNavButton() {
  const tutor = useTutor();
  const open = tutor.state.open;
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("lt:open-tutor"))}
      aria-label="Ask Tutor"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[44px] transition-colors",
        open ? "text-gold" : "text-muted-foreground hover:text-gold",
      )}
    >
      {open && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gold" />
      )}
      <Sparkles className="h-5 w-5" strokeWidth={open ? 2 : 1.6} />
      <span className={cn("text-[9px] tracking-wide", open ? "font-bold" : "font-medium")}>
        Tutor
      </span>
    </button>
  );
}

function fieldPrepLabel(moduleId: string | null): { label: string; short: string } {
  if (!moduleId) return { label: "Field Prep", short: "Field" };
  if (moduleId === "lds-missionary") return { label: "Mission Prep", short: "Mission" };
  if (
    [
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
    ].includes(moduleId)
  )
    return { label: "Clinical Prep", short: "Clinical" };
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
    return { label: "Job-Site Prep", short: "Job Site" };
  if (["soccer", "baseball", "hockey", "tennis"].includes(moduleId))
    return { label: "Coaching Prep", short: "Coaching" };
  return { label: "Field Prep", short: "Field" };
}

export function AppSidebar({ onOpenMatch }: { onOpenMatch?: () => void }) {
  const { state, dispatch } = useApp();
  const { signOut } = useAuth();
  const mod = getModule(state.activeModuleId);
  const fiery = state.streak > 1;
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [updatingApp, setUpdatingApp] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingApp, setResettingApp] = useState(false);
  const { recentWords, speakWord } = useSpeech();
  const { annotations, add: addNote } = useNotes();

  // Recent-words collapse/expand — remembered across reloads. Default to
  // expanded (true) on first render (matches SSR output), then hydrate the
  // real value in an effect. The persist effect below MUST skip its first
  // invocation for the same reason as the recent-words persist effect in
  // speech-state.tsx: it runs in the same commit as hydration, before state
  // holds the value just read from localStorage.
  const RECENT_WORDS_OPEN_KEY = "lt.sidebar.recentWordsOpen.v1";
  const [recentWordsOpen, setRecentWordsOpen] = useState(true);
  const skipRecentWordsOpenPersist = useRef(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_WORDS_OPEN_KEY);
      if (raw === "0") setRecentWordsOpen(false);
      else if (raw === "1") setRecentWordsOpen(true);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (skipRecentWordsOpenPersist.current) {
      skipRecentWordsOpenPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(RECENT_WORDS_OPEN_KEY, recentWordsOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [recentWordsOpen]);

  // Free-text sidebar note — a standalone Annotation with a stable sentinel
  // textId so it doesn't collide with per-reading annotations.
  const SIDEBAR_NOTE_TEXT_ID = "sidebar";
  const sidebarNotes = annotations.filter(
    (a) => a.textId === SIDEBAR_NOTE_TEXT_ID && a.sentenceIndex === 0,
  );
  const lastSidebarNote = sidebarNotes[sidebarNotes.length - 1];
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteDrawMode, setNoteDrawMode] = useState(false);

  function saveSidebarNote() {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    addNote({
      textId: SIDEBAR_NOTE_TEXT_ID,
      pane: "left",
      sentenceIndex: 0,
      selectedText: "",
      noteText: trimmed,
    });
    setNoteDraft("");
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 2000);
  }

  const visible = TAB_ITEMS.filter((t) => {
    if (t.languages && !t.languages.includes(state.selectedLanguage)) return false;
    if (t.moduleFilter) return t.moduleFilter(state.activeModuleId);
    if (t.moduleOnly) return state.activeModuleId === t.moduleOnly;
    return true;
  });

  function switchTab(key: TabKey) {
    if (key === "exams") {
      window.location.assign(
        examsLocation({
          moduleId: state.activeModuleId,
          target: state.selectedLanguage,
          native: state.nativeLanguage,
          orgId: new URLSearchParams(window.location.search).get("org"),
        }),
      );
      return;
    }
    if (key === state.currentTab) return;
    dispatch({ type: "SET_TAB", payload: key });
    try {
      const visited: string[] = JSON.parse(sessionStorage.getItem(VISITED_KEY) ?? "[]");
      if (!visited.includes(key)) {
        sessionStorage.setItem(VISITED_KEY, JSON.stringify([...visited, key]));
        dispatch({ type: "ADD_XP", payload: TAB_XP });
      }
    } catch {
      dispatch({ type: "ADD_XP", payload: TAB_XP });
    }
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden desktop:flex flex-col w-[76px] shrink-0 border-r border-border/50 bg-card/20 sticky top-0 h-screen">
        {/* Module indicator */}
        <div className="flex h-10 shrink-0 items-center justify-center border-b border-border/40">
          {mod ? (
            <span className="text-2xl leading-none" title={mod.name}>
              {mod.emoji}
            </span>
          ) : (
            <span className="font-display text-gold text-lg leading-none">✦</span>
          )}
        </div>

        {/* Tab icons */}
        {/* Rail items share the column: each one grows to fill a tall screen (up to
            3.25rem) and shrinks to the 40px tap-target floor, so all of them, Core 30
            included, fit at 1440x900 without scrolling. overflow-y stays as a fallback
            for very short windows. */}
        <nav className="flex min-h-0 flex-1 flex-col items-stretch overflow-y-auto px-1 py-0.5">
          {visible.map((item) => {
            const { key, Icon } = item;
            const { label, short } =
              key === "fieldPrep"
                ? fieldPrepLabel(state.activeModuleId)
                : { label: item.label, short: item.short };
            const active = state.currentTab === key;
            return (
              <button
                key={key}
                data-tour={key}
                onClick={() => switchTab(key)}
                title={label}
                className={cn(
                  "relative flex min-h-10 max-h-[3.25rem] w-full flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-all",
                  active
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gold" />
                )}
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
                <span className="w-full truncate text-center font-mono text-[8.5px] leading-tight tracking-wide">
                  {short}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Language Match */}
        {onOpenMatch && (
          <div className="flex shrink-0 justify-center px-1">
            <button
              onClick={onOpenMatch}
              title="Language Match"
              className="flex min-h-10 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-muted-foreground transition-all hover:bg-card/80 hover:text-gold"
            >
              <Trophy className="h-[17px] w-[17px]" strokeWidth={1.6} />
              <span className="font-mono text-[8.5px] tracking-wide">Match</span>
            </button>
          </div>
        )}

        {/* Status */}
        <div className="shrink-0 space-y-1 border-t border-border/40 px-1 py-2">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            <span className="flex items-center gap-1">
              <Flame
                className={cn("h-3 w-3", fiery ? "text-gold" : "text-gold/50")}
                strokeWidth={1.8}
              />
              <span
                className={cn(
                  "font-mono text-[10px]",
                  fiery ? "font-bold text-gold" : "text-foreground",
                )}
              >
                {state.streak}d
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-gold/50" strokeWidth={1.8} />
              <CountUp value={state.xp} className="font-mono text-[10px] text-foreground" />
            </span>
          </div>
          <p className="truncate px-1 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            {state.tier}
          </p>
        </div>
      </aside>

      {/* ── Bottom nav ──────────────────────────────────────────
         Shown on BOTH mobile and desktop per product request. On desktop it starts at
         the right edge of the 76px rail (desktop:left-[76px]) so it never sits on top
         of the rail's bottom items. */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 desktop:left-[76px] z-40 flex flex-col border-t border-border/50 bg-background/95 backdrop-blur-xl [padding-bottom:env(safe-area-inset-bottom)]"
      >
        {/* Mobile-only: Add word + language + module + voice + theme. One tight row that
           fits 375px with nothing clipped: the module chip is the only flexible one and
           truncates; every control stays reachable. Add word lives here (not floating over
           page content), and on desktop it moves into the tab row below. */}
        <div className="flex items-center gap-1.5 border-b border-border/30 px-3 py-1 desktop:hidden">
          <button
            onClick={openAddWord}
            aria-label="Add a word to My Vocab from this page"
            title="Add word"
            className="flex shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-card/50 px-3 py-2.5 text-gold transition-colors hover:border-gold/70"
          >
            <BookmarkPlus className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>

          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Learning language: ${state.selectedLanguage}`}
              className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border/60 bg-card/50 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold focus:outline-none"
            >
              <span>{state.selectedLanguage}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="min-w-[180px] border-border/70 bg-popover/95 backdrop-blur-xl"
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onSelect={() => {
                    dispatch({ type: "SET_LANGUAGE", payload: lang });
                    if (lang === "English" && state.nativeLanguage === "English") {
                      dispatch({ type: "SET_NATIVE_LANGUAGE", payload: "Spanish" });
                    }
                  }}
                  className="font-mono text-xs uppercase tracking-[0.16em]"
                >
                  <span className={state.selectedLanguage === lang ? "text-gold" : "opacity-50"}>
                    ◈
                  </span>
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Module picker */}
          <button
            onClick={() => setModuleDialogOpen(true)}
            title={mod ? mod.name : "Core (Free)"}
            className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-border/60 bg-card/50 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold"
          >
            {/* The module emoji already says "module"; the puzzle icon only earns its width on Core. */}
            {!mod && <Puzzle className="h-3.5 w-3.5 shrink-0 text-gold/70" />}
            <span className="min-w-0 truncate">
              {mod ? `${mod.emoji} ${mod.name}` : "Core (Free)"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>

          {/* Site-wide voice choice must be reachable on phones, where TopNav is hidden. */}
          <div className="shrink-0">
            <VoicePicker compact />
          </div>

          {/* Theme toggle — icon-only to keep the strip compact */}
          <button
            onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
            aria-label={state.darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold"
          >
            {state.darkMode ? (
              <Sun className="h-3.5 w-3.5" strokeWidth={1.8} />
            ) : (
              <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Tab row. Only the item matching the current tab is highlighted. */}
        <div className="flex items-center justify-around">
          {/* Phone: full tab list. Lit when the current tab has no slot in this bar
             (Core 30, Story, Dictionary...) because that is where the tab lives. */}
          {(() => {
            const inBar = BAR_TABS.some((t) => t.key === state.currentTab);
            return (
              <button
                onClick={() => setMoreSheetOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[44px] transition-colors desktop:hidden",
                  inBar ? "text-muted-foreground hover:text-gold" : "text-gold",
                )}
              >
                {!inBar && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gold" />
                )}
                <Menu className="h-5 w-5" strokeWidth={inBar ? 1.6 : 2} />
                <span
                  className={cn("text-[9px] tracking-wide", inBar ? "font-medium" : "font-bold")}
                >
                  More
                </span>
              </button>
            );
          })()}
          {/* Desktop: Add word sits in the bar's first slot, so nothing floats over the labels. */}
          <button
            onClick={openAddWord}
            aria-label="Add a word to My Vocab from this page"
            className="relative hidden min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground transition-colors hover:text-gold desktop:flex"
          >
            <BookmarkPlus className="h-5 w-5" strokeWidth={1.6} />
            <span className="text-[9px] font-medium tracking-wide">Add word</span>
          </button>
          {BAR_TABS.map(({ key, Icon, label }) => {
            const active = state.currentTab === key;
            return (
              <button
                key={key}
                onClick={() => switchTab(key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors min-h-[44px]",
                  active ? "text-gold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gold" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active && "drop-shadow-[0_0_6px_rgba(var(--gold-rgb,212,175,55)/0.6)]",
                  )}
                  strokeWidth={active ? 2 : 1.6}
                />
                <span
                  className={cn("text-[9px] tracking-wide", active ? "font-bold" : "font-medium")}
                >
                  {label}
                </span>
              </button>
            );
          })}
          {/* Rightmost, fixed: Tutor. Docked here rather than a floating pill so it cannot
             cover Reader text, flashcards or Dashboard cards. Lit only while the tutor is open. */}
          <TutorNavButton />
        </div>
      </nav>

      {/* Mobile-only: full tab list, grouped the same way the desktop sidebar implies. */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto border-border/60 bg-background/98 backdrop-blur-xl [padding-top:calc(0.75rem+env(safe-area-inset-top))] [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] desktop:hidden"
        >
          {/* Which pair of languages you are working in, above everything else.
              The bottom strip shows the target only, and native was reachable
              solely from TopNav — which is desktop-only, so on a phone there was
              no way to see or change it. Plain <select> rather than a dropdown
              menu: inside a bottom sheet iOS gives the native picker wheel,
              which is easier to hit and cannot be mis-scrolled. */}
          {/* mt-8 clears the sheet's absolutely-positioned close button, which
              otherwise lands on the Native select's top-right corner. */}
          <div className="mt-8 mb-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
                Learning
              </span>
              <select
                value={state.selectedLanguage}
                onChange={(e) => {
                  const lang = e.target.value as Language;
                  dispatch({ type: "SET_LANGUAGE", payload: lang });
                  if (lang === "English" && state.nativeLanguage === "English") {
                    dispatch({ type: "SET_NATIVE_LANGUAGE", payload: "Spanish" });
                  }
                }}
                className="min-h-11 cursor-pointer rounded-xl border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground transition-colors focus:border-gold/40 focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
                Native
              </span>
              <select
                value={state.nativeLanguage}
                onChange={(e) =>
                  dispatch({
                    type: "SET_NATIVE_LANGUAGE",
                    payload: e.target.value as NativeLanguage,
                  })
                }
                className="min-h-11 cursor-pointer rounded-xl border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground transition-colors focus:border-gold/40 focus:outline-none"
              >
                {NATIVE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SheetTitle className="font-display text-lg text-foreground">All Tabs</SheetTitle>
          <SheetDescription className="sr-only">
            Every available tab, grouped by section. Tap one to switch.
          </SheetDescription>

          {/* Language Match is not listed here. It already has a card in Games
              Hub, and Games is a primary tab in the bottom nav — one tap, not
              two — so a second entry in this sheet was duplication. The desktop
              icon rail keeps its shortcut. */}

          {/* Recently looked-up words — collapsible history built from
              speech-state's setLastWord() calls (WordCard.tsx). Tap a word
              to hear it spoken again; re-opening the WordCard popup itself
              would require plumbing selection/position state that lives in
              ParallelReader.tsx, out of scope here, so this is
              display-plus-speak, not a full re-open. */}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
            Recent words
          </p>
          <button
            onClick={() => setRecentWordsOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3 transition-colors hover:border-gold/25 cursor-pointer min-h-[44px]"
          >
            <span className="flex items-center gap-2.5 text-sm text-foreground">
              <History className="h-4 w-4 text-gold/70" strokeWidth={1.6} />
              {recentWords.length > 0 ? `${recentWords.length} looked up` : "None looked up yet"}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                recentWordsOpen && "rotate-180",
              )}
            />
          </button>
          {recentWordsOpen && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-border/40 bg-card/30 px-4 py-3">
              {recentWords.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Tap a word in the reader to start building your history.
                </span>
              ) : (
                recentWords.map((word) => (
                  <button
                    key={word}
                    onClick={() => speakWord(word)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-gold/25 hover:text-gold cursor-pointer min-h-[44px]"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.6} />
                    {word}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Free-text note — saved through useNotes() with a stable
              sentinel textId so it never collides with per-reading
              annotations. */}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
            Quick note
          </p>
          <div className="mt-2 rounded-xl border border-border/40 bg-card/30 px-4 py-3">
            {/* Was a bare <textarea> — and this is the one note surface a phone
                user reaches in two taps, yet the only one that could not accept
                a drawn character or compose CJK properly. Now uses the same
                input and canvas as the Dashboard card and Reader panel. */}
            <MultilingualNoteInput
              language={state.selectedLanguage}
              value={noteDraft}
              onChange={setNoteDraft}
              onSave={saveSidebarNote}
              rows={3}
              className="border-border/40 bg-background/60"
            />
            {noteDrawMode && (
              <div className="mt-2 overflow-hidden rounded-xl border border-gold/20">
                <HandwritingCanvas
                  onRecognized={(text) => setNoteDraft((prev) => prev + text)}
                  insertLabel="Insert →"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setNoteDrawMode((v) => !v)}
              title="Draw a character to insert"
              className={`mt-2 flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                noteDrawMode
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3 w-3" /> Draw
            </button>
            <button
              onClick={saveSidebarNote}
              disabled={!noteDraft.trim()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold/25 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              <NotebookPen className="h-4 w-4 text-gold/70" strokeWidth={1.6} />
              Save note
            </button>
            {noteSaved && lastSidebarNote?.noteText && (
              <p className="mt-2 text-xs text-muted-foreground">
                Saved: <span className="text-foreground">{lastSidebarNote.noteText}</span>
              </p>
            )}
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
            App settings
          </p>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/30 px-4 py-3">
            <span className="text-sm text-foreground">Your account</span>
            <AuthButton />
          </div>

          {/* Theme toggle — labeled row so the setting is discoverable */}
          <button
            onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3 transition-colors hover:border-gold/25"
          >
            <span className="flex items-center gap-2.5 text-sm text-foreground">
              {state.darkMode ? (
                <Moon className="h-4 w-4 text-gold/70" strokeWidth={1.6} />
              ) : (
                <Sun className="h-4 w-4 text-gold/70" strokeWidth={1.6} />
              )}
              Appearance
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {state.darkMode ? "Dark — tap for light" : "Light — tap for dark"}
            </span>
          </button>

          <PwaInstallControl />

          <button
            onClick={() => {
              if (updatingApp) return;
              setUpdatingApp(true);
              void reloadNewestAppVersion();
            }}
            disabled={updatingApp}
            className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-gold/40 bg-gold/10 px-4 py-3 text-left transition-colors hover:border-gold/70 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-gold">
              <RefreshCw
                className={cn("h-4 w-4", updatingApp && "animate-spin")}
                strokeWidth={1.8}
              />
              {updatingApp ? "Updating app…" : "Update app"}
            </span>
            <span className="max-w-[46%] text-right text-[10px] leading-tight text-muted-foreground">
              Loads newest version · keeps progress
            </span>
          </button>

          <button
            onClick={() => {
              setMoreSheetOpen(false);
              setResetDialogOpen(true);
            }}
            disabled={resettingApp}
            className="mt-2 flex min-h-12 w-full items-center justify-between rounded-xl border border-destructive/45 bg-destructive/10 px-4 py-3 text-left transition-colors hover:border-destructive/75 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-destructive">
              <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
              Start app from beginning
            </span>
            <span className="max-w-[42%] text-right text-[10px] leading-tight text-muted-foreground">
              Signs out · clears this device
            </span>
          </button>

          <div className="mt-2 space-y-5">
            {TAB_GROUP_ORDER.map((group) => {
              const items = visible.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/70">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const { key, Icon } = item;
                      const { label } =
                        key === "fieldPrep"
                          ? fieldPrepLabel(state.activeModuleId)
                          : { label: item.label };
                      const active = state.currentTab === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            switchTab(key);
                            setMoreSheetOpen(false);
                          }}
                          className={cn(
                            "flex w-[31%] grow flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors min-h-[44px]",
                            active
                              ? "border-gold/40 bg-gold/15 text-gold"
                              : "border-border/40 bg-card/30 text-muted-foreground hover:border-gold/25 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.6} />
                          <span className="text-[10px] leading-tight tracking-wide">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-destructive/40">
          <AlertDialogHeader>
            <AlertDialogTitle>Start over on this device?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left leading-relaxed">
              <span className="block">
                This signs you out and removes progress, settings, and downloaded app files stored
                in this browser. Language Threshold will reopen at the first language-selection
                screen.
              </span>
              <span className="block font-medium text-foreground">
                Your account and cloud-saved data will not be deleted, and your other devices will
                stay signed in.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingApp}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resettingApp}
              onClick={() => {
                if (resettingApp) return;
                setResettingApp(true);
                void resetAppToFirstRun(() => signOut("local"));
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resettingApp ? "Starting over…" : "Sign out & start over"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModulePickerDialog open={moduleDialogOpen} onClose={() => setModuleDialogOpen(false)} />
    </>
  );
}
