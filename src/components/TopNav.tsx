import { useState } from "react";
import { Moon, Sun, Settings2, Sparkle, ChevronDown, Puzzle, BookmarkPlus } from "lucide-react";
import { useApp, LANGUAGES, NATIVE_LANGUAGES, type NativeLanguage } from "@/state/app-state";
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DeviceVoiceHelp } from "./settings/DeviceVoiceHelp";
import { AppVersion } from "./settings/AppVersion";
import { AudioRoutingSettings } from "./settings/AudioRoutingSettings";
import { VoiceSettings } from "./settings/VoiceSettings";
import { ADD_WORD_EVENT } from "./vocab/GlobalVocabCapture";
import { AuthButton } from "./auth/AuthButton";
import { PracticeBarSetting, PracticeTimeBar } from "./PracticeTimeBar";

// Uses the canonical list from app-state. A local copy here is how Chinese
// went missing from this switcher while the first-run gate offered it.

export function TopNav() {
  const { state, dispatch } = useApp();
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border/60 bg-background/85 backdrop-blur-xl [padding-top:env(safe-area-inset-top)] desktop:block">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:h-20 sm:flex-nowrap xl:gap-6 sm:px-6 sm:py-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Sparkle className="h-5 w-5 text-gold-ink" strokeWidth={1.5} fill="currentColor" />
          <span className="font-display text-lg font-semibold tracking-tight xl:text-2xl">
            Language Threshold
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="group order-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:order-none sm:w-auto sm:px-5 sm:text-xs">
            <span className="text-gold-ink">◈</span>
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
                onSelect={() => {
                  dispatch({ type: "SET_LANGUAGE", payload: lang });
                  if (lang === "English" && state.nativeLanguage === "English") {
                    dispatch({ type: "SET_NATIVE_LANGUAGE", payload: "Spanish" });
                  }
                }}
                className="font-mono text-xs uppercase tracking-[0.16em]"
              >
                <span className={state.selectedLanguage === lang ? "text-gold-ink" : "opacity-60"}>
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
          <Puzzle className="h-3.5 w-3.5 shrink-0 text-gold-ink" strokeWidth={1.8} />
          {getModule(state.activeModuleId) ? (
            <span className="truncate max-w-[100px] xl:max-w-[160px] font-mono text-sm font-bold uppercase tracking-[0.18em] text-gold-ink">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(ADD_WORD_EVENT))}
            aria-label="Add a word to My Vocab from this page"
            title="Add word"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground hover:text-gold-ink"
          >
            <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Learning settings"
                title="Learning settings"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              scrollBody
              align="end"
              className="max-h-[75vh] w-[min(440px,calc(100vw-2rem))] space-y-3 overflow-y-auto"
            >
              <p className="text-sm font-semibold">Learning settings</p>
              <VoiceSettings />
              <DeviceVoiceHelp />
              <AudioRoutingSettings
                learningContext={JSON.stringify([
                  state.currentTab,
                  state.activeModuleId,
                  state.selectedLanguage,
                ])}
              />
              <PracticeBarSetting />
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
                      <span
                        className={state.nativeLanguage === lang ? "text-gold-ink" : "opacity-60"}
                      >
                        ◈
                      </span>
                      {lang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Appearance</span>
                <button
                  onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
                  aria-label="Toggle theme"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/60 text-foreground/80 transition-all hover:border-gold/60 hover:text-gold-ink"
                >
                  {state.darkMode ? (
                    <Sun className="h-4 w-4" strokeWidth={1.6} />
                  ) : (
                    <Moon className="h-4 w-4" strokeWidth={1.6} />
                  )}
                </button>
              </div>
              <AppVersion />
            </PopoverContent>
          </Popover>

          <div className="shrink-0 whitespace-nowrap">
            <AuthButton />
          </div>
        </div>
      </div>
      <PracticeTimeBar edge="header" />
    </header>
  );
}
