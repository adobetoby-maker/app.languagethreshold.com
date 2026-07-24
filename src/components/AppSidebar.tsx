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
  Headphones,
  Grid3x3,
  Quote,
  AlertTriangle,
  Mail,
  Layers,
  Sparkle,
  Compass,
  Globe2,
  Puzzle,
  ChevronDown,
  Shield,
  LibraryBig,
  ArrowRightLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useApp, type TabKey, type Language } from "@/state/app-state";
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

const LANGUAGES: Language[] = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
];

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
}[] = [
  // ── Orientation ──────────────────────────────────────────────────────────────
  { key: "guide", label: "App Guide", short: "Guide", group: "Orientation", Icon: Compass },
  { key: "dashboard", label: "Dashboard", short: "Progress", group: "Orientation", Icon: BarChart3 },
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
  { key: "story", label: "Daily Story", short: "Story", group: "Core Lessons", Icon: Sparkle },
  { key: "grammar", label: "Grammar Studio", short: "Grammar", group: "Core Lessons", Icon: GraduationCap },
  { key: "patterns", label: "Grammar Patterns", short: "Patterns", group: "Core Lessons", Icon: Layers },
  { key: "cognates", label: "Cognate Bridge", short: "Cognates", group: "Core Lessons", Icon: ArrowRightLeft },
  { key: "conjugation", label: "Conjugation", short: "Conjugate", group: "Core Lessons", Icon: Repeat2 },
  { key: "sentenceBuild", label: "Sentence Builder", short: "Sentences", group: "Core Lessons", Icon: AlignLeft },
  { key: "listeningDrill", label: "Listening Drill", short: "Listening", group: "Core Lessons", Icon: Headphones },
  { key: "speak", label: "Speak & Learn", short: "Speak", group: "Core Lessons", Icon: Mic2 },
  { key: "penpal", label: "Pen Pal Practice", short: "Pen Pal", group: "Core Lessons", Icon: Mail },
  // ── Vocabulary ───────────────────────────────────────────────────────────────
  { key: "dictionary", label: "Dictionary", short: "Dict.", group: "Vocabulary", Icon: LibraryBig },
  { key: "wordMatch", label: "Word Match", short: "Words", group: "Vocabulary", Icon: Grid3x3 },
  { key: "idiomMaster", label: "Idiom Master", short: "Idioms", group: "Vocabulary", Icon: Quote },
  { key: "falseFriends", label: "False Friends", short: "False Fr.", group: "Vocabulary", Icon: AlertTriangle },
  // ── Play ─────────────────────────────────────────────────────────────────────
  { key: "games", label: "Games Hub", short: "Games", group: "Play", Icon: Gamepad2 },
];

const TAB_GROUP_ORDER = ["Orientation", "Module", "Core Lessons", "Vocabulary", "Play"];

const VISITED_KEY = "lt.visitedTabs.session";
const TAB_XP = 5;

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
  const mod = getModule(state.activeModuleId);
  const fiery = state.streak > 1;
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const visible = TAB_ITEMS.filter((t) => {
    if (t.moduleFilter) return t.moduleFilter(state.activeModuleId);
    if (t.moduleOnly) return state.activeModuleId === t.moduleOnly;
    return true;
  });

  function switchTab(key: TabKey) {
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
      <aside className="hidden lg:flex flex-col w-[76px] shrink-0 border-r border-border/50 bg-card/20 sticky top-0 h-screen">
        {/* Module indicator */}
        <div className="flex h-16 items-center justify-center border-b border-border/40">
          {mod ? (
            <span className="text-2xl leading-none" title={mod.name}>
              {mod.emoji}
            </span>
          ) : (
            <span className="font-display text-gold text-lg leading-none">✦</span>
          )}
        </div>

        {/* Tab icons */}
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 px-1">
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
                  "relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-all",
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
          <div className="flex justify-center px-1 pb-1">
            <button
              onClick={onOpenMatch}
              title="Language Match"
              className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-muted-foreground transition-all hover:bg-card/80 hover:text-gold"
            >
              <Trophy className="h-[17px] w-[17px]" strokeWidth={1.6} />
              <span className="font-mono text-[8.5px] tracking-wide">Match</span>
            </button>
          </div>
        )}

        {/* Status */}
        <div className="border-t border-border/40 px-2 py-4 space-y-2.5">
          <div className="flex items-center justify-center gap-1.5">
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
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Star className="h-3 w-3 text-gold/50" strokeWidth={1.8} />
            <CountUp value={state.xp} className="font-mono text-[10px] text-foreground" />
          </div>
          <p className="text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 truncate px-1">
            {state.tier}
          </p>
        </div>
      </aside>

      {/* ── Bottom nav ──────────────────────────────────────────
         Shown on BOTH mobile and desktop per product request. */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex flex-col border-t border-border/50 bg-background/95 backdrop-blur-xl [padding-bottom:env(safe-area-inset-bottom)]">
        {/* Mobile-only: language + module strip */}
        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1 lg:hidden">
          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold focus:outline-none">
              <Globe2 className="h-3.5 w-3.5 text-gold/70" />
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
                  onSelect={() => dispatch({ type: "SET_LANGUAGE", payload: lang })}
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Puzzle className="h-3.5 w-3.5 text-gold/70" />
            <span className="truncate max-w-[100px]">
              {mod ? `${mod.emoji} ${mod.name}` : "Core (Free)"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </div>

        {/* Tab row */}
        <div className="flex items-center justify-around">
          {(
            [
              { key: "reader" as TabKey, Icon: BookOpen, label: "Reader" },
              { key: "grammar" as TabKey, Icon: GraduationCap, label: "Grammar" },
              { key: "games" as TabKey, Icon: Gamepad2, label: "Games" },
              { key: "speak" as TabKey, Icon: Mic2, label: "Speak" },
              { key: "dashboard" as TabKey, Icon: BarChart3, label: "Dashboard" },
            ] as const
          ).map(({ key, Icon, label }) => {
            const active = state.currentTab === key;
            return (
              <button
                key={key}
                onClick={() => switchTab(key)}
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
          {onOpenMatch && (
            <button
              onClick={onOpenMatch}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[44px] text-muted-foreground transition-colors hover:text-gold"
            >
              <Trophy className="h-5 w-5" strokeWidth={1.6} />
              <span className="text-[9px] font-medium tracking-wide">Match</span>
            </button>
          )}
          {/* Mobile-only: opens the full tab list — every tab the desktop sidebar has,
             not just the 5 curated quick-access buttons in this row. */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[44px] text-muted-foreground transition-colors hover:text-gold lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.6} />
            <span className="text-[9px] font-medium tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile-only: full tab list, grouped the same way the desktop sidebar implies. */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto border-border/60 bg-background/98 backdrop-blur-xl [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <SheetTitle className="font-display text-lg text-foreground">All Tabs</SheetTitle>
          <SheetDescription className="sr-only">
            Every available tab, grouped by section. Tap one to switch.
          </SheetDescription>
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

      <ModulePickerDialog open={moduleDialogOpen} onClose={() => setModuleDialogOpen(false)} />
    </>
  );
}
