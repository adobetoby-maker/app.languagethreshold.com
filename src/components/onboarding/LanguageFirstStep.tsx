import { LearningEntryModal } from "./LearningEntryModal";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import { useApp, type Language, type NativeLanguage } from "@/state/app-state";
import { cn } from "@/lib/utils";
import {
  hasCharacterStudio,
  languageOptions,
  nativeChoicesFor,
  needsNativeQuestion,
} from "@/lib/language-menu";

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
  // A target whose course is not explained in the learner's current native language asks for it
  // (never inferred from the target).
  const [askNative, setAskNative] = useState<Language | null>(null);
  const languages = languageOptions();
  const studioNames = languages.filter((l) => hasCharacterStudio(l.pack)).map((l) => l.label);

  function finish(lang: Language, native: NativeLanguage | null) {
    dispatch({ type: "SET_LANGUAGE", payload: lang });
    if (native) dispatch({ type: "SET_NATIVE_LANGUAGE", payload: native });
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    window.setTimeout(() => onChosen(), 180);
  }

  function choose(lang: Language) {
    setPicked(lang);
    if (needsNativeQuestion(lang, state.nativeLanguage)) {
      setAskNative(lang);
      return;
    }
    finish(lang, null);
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
          {askNative ? (
            <div data-testid="native-question">
              <h2 className="text-xl font-semibold mb-1">What is your native language?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                {askNative} lessons are explained in your own language. Choose it.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {nativeChoicesFor(askNative).map((native) => (
                  <button
                    key={native}
                    type="button"
                    onClick={() => finish(askNative, native)}
                    className="cursor-pointer rounded-xl border border-border/60 bg-background/40 p-3 text-left text-sm font-medium transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
                  >
                    {native}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAskNative(null);
                  setPicked(null);
                }}
                className="mt-4 cursor-pointer text-xs text-muted-foreground underline"
              >
                Choose another language
              </button>
            </div>
          ) : (
          <>
          <h2 className="text-xl font-semibold mb-1">
            What are you learning?
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            We&apos;ll open a passage and tools tailored to that language. You can change this
            later.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {languages.map((l) => (
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
            {studioNames.join(" & ")} unlock Character Studio (kanji / hanzi + radicals).
          </p>
          </>
          )}
        </div>
      </div>
    </LearningEntryModal>
  );
}
