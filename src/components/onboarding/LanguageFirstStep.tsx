import { LearningEntryModal } from "./LearningEntryModal";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { languageOptions, nativeOnPick } from "@/lib/language-menu";

const STORAGE_KEY = "lt.languageChosen";

export function hasChosenLanguage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function LanguageFirstStep({
  onChosen,
  onDismiss,
}: {
  onChosen: () => void;
  onDismiss: () => void;
}) {
  const { state, dispatch } = useApp();
  const [picked, setPicked] = useState<Language | null>(null);

  function choose(lang: Language) {
    setPicked(lang);
    dispatch({ type: "SET_LANGUAGE", payload: lang });
    const native = nativeOnPick(lang, state.nativeLanguage);
    if (native) dispatch({ type: "SET_NATIVE_LANGUAGE", payload: native });
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    window.setTimeout(() => onChosen(), 180);
  }

  return (
    <LearningEntryModal
      title="Choose your learning language"
      onDismiss={onDismiss}
      description="Choose a language to continue. You can change it later."
      className="lt-safe-top-only fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/98 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-gold" strokeWidth={1.5} fill="currentColor" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Language Threshold
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-2xl">
          <h2 className="text-xl font-semibold mb-1">
            What are you learning? / ¿Qué quieres aprender?
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            We&apos;ll open a passage and tools tailored to that language. You can change this
            later.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {languageOptions().map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => choose(l.id)}
                className={cn(
                  "rounded-xl border border-border/60 bg-background/40 p-3 text-left transition-colors hover:border-gold/60 hover:bg-gold/[0.06]",
                  picked === l.id && "border-gold/70 bg-gold/10",
                )}
              >
                <div className="text-sm font-medium">{l.label}</div>
                <div className="text-xs text-muted-foreground">{l.native}</div>
              </button>
            ))}
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Japanese &amp; Chinese unlock Character Studio (kanji / hanzi + radicals).
          </p>
        </div>
      </div>
    </LearningEntryModal>
  );
}
