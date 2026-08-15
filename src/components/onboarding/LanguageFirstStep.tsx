import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import {
  NATIVE_LANGUAGES,
  useApp,
  type Language,
  type NativeLanguage,
} from "@/state/app-state";

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
 *
 * English is a first-class target (ESL): same core grid as Spanish/Italian/etc.
 * Picking it still asks for native language so translations and coaching flip
 * the usual direction.
 */
const LANGUAGES: { id: Language; label: string; native: string }[] = [
  { id: "Spanish", label: "Spanish", native: "Español" },
  { id: "English", label: "English", native: "English — as a second language" },
  { id: "French", label: "French", native: "Français" },
  { id: "Italian", label: "Italian", native: "Italiano" },
  { id: "German", label: "German", native: "Deutsch" },
  { id: "Portuguese", label: "Portuguese", native: "Português" },
  { id: "Japanese", label: "Japanese", native: "日本語" },
  { id: "Korean", label: "Korean", native: "한국어" },
  { id: "Pashto", label: "Pashto", native: "پښتو" },
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

const NATIVE_LANGUAGE_LABELS: Record<NativeLanguage, string> = {
  English: "English",
  Spanish: "Español",
  French: "Français",
  German: "Deutsch",
  Italian: "Italiano",
  Portuguese: "Português",
  Dutch: "Nederlands",
  Polish: "Polski",
  Russian: "Русский",
  Turkish: "Türkçe",
  Arabic: "العربية",
  Hindi: "हिन्दी",
  "Chinese (Simplified)": "简体中文",
  Japanese: "日本語",
  Korean: "한국어",
};

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
  const [choosingEnglishNative, setChoosingEnglishNative] = useState(false);

  function finishChoice(lang: Language, nativeLanguage?: NativeLanguage) {
    dispatch({ type: "SET_LANGUAGE", payload: lang });
    if (nativeLanguage) {
      dispatch({ type: "SET_NATIVE_LANGUAGE", payload: nativeLanguage });
    }
    try {
      window.localStorage.setItem(CHOSEN_KEY, "1");
    } catch {
      /* private mode — the choice still applies for this session */
    }
    onChosen();
  }

  function pick(lang: Language) {
    if (lang === "English") {
      setChoosingEnglishNative(true);
      return;
    }
    finishChoice(lang);
  }

  if (choosingEnglishNative) {
    return (
      <div className="lt-safe-top-only fixed inset-0 z-[110] overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-lg items-center px-5 py-8">
          <div className="w-full">
            <button
              type="button"
              onClick={() => setChoosingEnglishNative(false)}
              className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              What language do you know best?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We’ll use it for translations and coaching while you learn English.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {NATIVE_LANGUAGES.filter((language) => language !== "English").map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => finishChoice("English", language)}
                  className="min-h-16 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
                >
                  <div className="text-sm font-medium text-foreground">{language}</div>
                  <div className="text-xs text-muted-foreground">
                    {NATIVE_LANGUAGE_LABELS[language]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-safe-top-only fixed inset-0 z-[110] overflow-y-auto bg-background">
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
            We'll open a beginner passage in that language, ready to read.
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
              Coming soon
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}

          {expanded && (
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
