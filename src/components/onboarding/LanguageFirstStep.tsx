import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";

/**
 * Language selection — the first thing a new learner sees, ahead of the
 * reader-first landing. DUO-002 P0-4.
 *
 * Track A replaced the old wizard with FirstRunEntry, which is a better entry
 * screen but asks nothing. `selectedLanguage` therefore stayed on its "Spanish"
 * default, so a learner who came for French got Spanish content with no
 * explanation. Everything downstream keys off this value — the Reader passage,
 * Tutor context, and the vocabLang gate on saved words — so it has to be
 * settled before "Start reading" means anything.
 *
 * Shown in each language's own script, so a learner recognises their own.
 */
const LANGUAGES: { id: Language; label: string; native: string }[] = [
  { id: "Spanish", label: "Spanish", native: "Español" },
  { id: "French", label: "French", native: "Français" },
  { id: "Italian", label: "Italian", native: "Italiano" },
  { id: "German", label: "German", native: "Deutsch" },
  { id: "Portuguese", label: "Portuguese", native: "Português" },
  { id: "Japanese", label: "Japanese", native: "日本語" },
  { id: "Korean", label: "Korean", native: "한국어" },
  { id: "Pashto", label: "Pashto", native: "پښتو" },
];

/**
 * Shipped but secondary. English has 30 seeded texts
 * (data/library-seeds/english-target-seeds.ts) and real en-target module
 * support, so "English as a second language" is a genuine option — it simply
 * isn't the common case for this audience, so it sits behind the expander
 * rather than in the primary grid.
 */
const MORE_AVAILABLE: { id: Language; label: string; native: string }[] = [
  { id: "English", label: "English", native: "English — as a second language" },
];

/**
 * Roadmap only. These have no seeded passages, so they are shown as a promise
 * and are deliberately NOT selectable — offering a language that opens an empty
 * Reader would be worse than not offering it. Adding one later means seeding
 * content and moving its entry up into LANGUAGES; the structure is already here.
 */
const COMING_SOON = [
  "Swahili",
  "Greek",
  "Hebrew",
  "Arabic",
  "Russian",
  "Mongolian",
];

const CHOSEN_KEY = "lt.onboarding.languageChosen";

export function hasChosenLanguage(): boolean {
  try {
    return window.localStorage.getItem(CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function LanguageFirstStep({ onChosen }: { onChosen: () => void }) {
  const { dispatch } = useApp();
  const [expanded, setExpanded] = useState(false);

  function pick(lang: Language) {
    dispatch({ type: "SET_LANGUAGE", payload: lang });
    try {
      window.localStorage.setItem(CHOSEN_KEY, "1");
    } catch {
      /* private mode — the choice still applies for this session */
    }
    onChosen();
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-lg items-center px-5 py-8">
        <div className="w-full">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-ink">
            <span aria-hidden>✦</span>
            Language Threshold
          </div>

          <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            What are you learning?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            We&apos;ll open a beginner passage in that language, ready to read.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => pick(l.id)}
                className="min-h-16 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
              >
                <div className="text-sm font-medium text-foreground">{l.label}</div>
                <div className="text-xs text-muted-foreground">{l.native}</div>
              </button>
            ))}
          </div>

          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-gold"
            >
              More languages
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}

          {expanded && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2">
                {MORE_AVAILABLE.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => pick(l.id)}
                    className="col-span-2 min-h-16 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
                  >
                    <div className="text-sm font-medium text-foreground">{l.label}</div>
                    <div className="text-xs text-muted-foreground">{l.native}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Coming soon
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMING_SOON.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-border/40 px-2.5 py-1 text-xs text-muted-foreground/70"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80">
                We add a language once it has real passages to read — these are on the way.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
