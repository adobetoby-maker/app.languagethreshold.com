import { useState } from "react";
import { Moon, Sun, Sparkle, ChevronDown, Puzzle } from "lucide-react";
import {
  useApp,
  LANGUAGES,
  NATIVE_LANGUAGES,
  type Language,
  type NativeLanguage,
  type TabKey,
} from "@/state/app-state";
import { getModule } from "@/data/modules";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModulePickerDialog } from "./ModulePickerDialog";
import { VoicePicker } from "./VoicePicker";
import { LanguageMatchButton } from "./match/LanguageMatchButton";
import { AuthButton } from "./auth/AuthButton";

// Uses the canonical list from app-state. A local copy here is how Chinese
// went missing from this switcher while the first-run gate offered it.


const TABS: { key: TabKey; label: string; module?: string; language?: Language }[] = [
  { key: "modules", label: "Modules" },
  { key: "missionary", label: "Missionary", module: "lds-missionary" },
  { key: "orthopedics", label: "Orthopedics", module: "orthopedics" },
  { key: "reader", label: "Reader" },
  { key: "flashcards", label: "Flashcards" },
  { key: "kana", label: "Kana Pad", language: "Japanese" },
  { key: "grammar", label: "Grammar Studio" },
  { key: "conjugation", label: "Conjugation" },
  { key: "sentenceBuild", label: "Sentence Builder" },
  { key: "listeningDrill", label: "Listening" },
  { key: "wordMatch", label: "Word Match" },
  { key: "idiomMaster", label: "Idioms" },
  { key: "falseFriends", label: "False Friends" },
  { key: "games", label: "Games" },
  { key: "speak", label: "Speak & Learn" },
  { key: "anatomy", label: "Anatomy" },
  { key: "discussions", label: "Discussions", module: "lds-missionary" },
  { key: "dashboard", label: "Dashboard" },
  { key: "guide", label: "App Guide" },
];

const TAB_VISIT_XP = 5;
const VISITED_TABS_KEY = "lt.visitedTabs.session";

export function TopNav({ onOpenMatch }: { onOpenMatch?: () => void }) {
  const { state, dispatch } = useApp();
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);

  function handleTabSwitch(key: TabKey) {
    if (key === state.currentTab) return;
    dispatch({ type: "SET_TAB", payload: key });
    try {
      const raw = sessionStorage.getItem(VISITED_TABS_KEY);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (!visited.includes(key)) {
        visited.push(key);
        sessionStorage.setItem(VISITED_TABS_KEY, JSON.stringify(visited));
        dispatch({ type: "ADD_XP", payload: TAB_VISIT_XP });
      }
    } catch {
      dispatch({ type: "ADD_XP", payload: TAB_VISIT_XP });
    }
  }

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border/60 bg-background/85 backdrop-blur-xl [padding-top:env(safe-area-inset-top)] desktop:block">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:h-20 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Sparkle className="h-5 w-5 text-gold" strokeWidth={1.5} fill="currentColor" />
          <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Language Threshold
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="group order-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:order-none sm:w-auto sm:px-5 sm:text-xs">
            <span className="text-gold">◈</span>
            <span>{state.selectedLanguage}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="min-w-[200px] border-border/70 bg-popover/95 backdrop-blur-xl"
          >
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang}
                onSelect={() => dispatch({ type: "SET_LANGUAGE", payload: lang })}
                className="font-mono text-xs uppercase tracking-[0.16em]"
              >
                <span className={state.selectedLanguage === lang ? "text-gold" : "opacity-60"}>
                  ◈
                </span>
                {lang}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setModuleDialogOpen(true)}
          title="Change module"
          className="group order-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 transition-all hover:border-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:order-none sm:w-auto sm:px-4"
        >
          <Puzzle className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.8} />
          {getModule(state.activeModuleId) ? (
            <span className="truncate max-w-[160px] font-mono text-sm font-bold uppercase tracking-[0.18em] text-gold">
              {getModule(state.activeModuleId)!.emoji} {getModule(state.activeModuleId)!.name}
            </span>
          ) : (
            <span className="truncate max-w-[140px] font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 sm:text-xs">
              Core (Free)
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
        <ModulePickerDialog open={moduleDialogOpen} onClose={() => setModuleDialogOpen(false)} />

        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              title={`Native language: ${state.nativeLanguage}`}
              className="group hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-gold/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              <span className="opacity-60">native</span>
              <span className="text-foreground/90">{state.nativeLanguage}</span>
              <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[60vh] min-w-[200px] overflow-y-auto border-border/70 bg-popover/95 backdrop-blur-xl"
            >
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Native language
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {NATIVE_LANGUAGES.map((lang: NativeLanguage) => (
                <DropdownMenuItem
                  key={lang}
                  onSelect={() => dispatch({ type: "SET_NATIVE_LANGUAGE", payload: lang })}
                  className="font-mono text-xs uppercase tracking-[0.16em]"
                >
                  <span className={state.nativeLanguage === lang ? "text-gold" : "opacity-60"}>
                    ◈
                  </span>
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block">
            <VoicePicker />
          </div>

          <button
            onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
            aria-label="Toggle theme"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/60 text-foreground/80 transition-all hover:border-gold/60 hover:text-gold"
          >
            {state.darkMode ? (
              <Sun className="h-4 w-4" strokeWidth={1.6} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.6} />
            )}
          </button>

          <AuthButton />
        </div>
      </div>

      <nav className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-1 gap-y-0 px-3 sm:gap-x-2 sm:px-6">
          {TABS.filter(
            (t) =>
              (!t.module || state.activeModuleId === t.module) &&
              (!t.language || state.selectedLanguage === t.language),
          ).map((tab) => {
            const active = state.currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabSwitch(tab.key)}
                data-active={active}
                className="gold-underline relative px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors data-[active=true]:text-foreground hover:text-foreground sm:px-3.5 sm:py-3 sm:text-[11px] sm:tracking-[0.2em]"
              >
                {tab.label}
              </button>
            );
          })}
          {onOpenMatch && (
            <div className="ml-1 py-1.5">
              <LanguageMatchButton onClick={onOpenMatch} />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
