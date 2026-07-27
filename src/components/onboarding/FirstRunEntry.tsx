import { useState } from "react";
import { ArrowRight, BookOpen, BookmarkPlus, MessageCircle, MousePointer2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { LanguageFirstStep, hasChosenLanguage } from "./LanguageFirstStep";

export function FirstRunEntry() {
  const { state, dispatch } = useApp();
  // Language is settled before the landing. Track A's entry screen asks nothing,
  // so selectedLanguage stayed on its "Spanish" default and "Start reading"
  // could open the wrong language entirely. DUO-002 P0-4.
  const [languageChosen, setLanguageChosen] = useState(() => hasChosenLanguage());

  if (!state.hydrated || state.onboardingComplete) return null;

  if (!languageChosen) {
    return <LanguageFirstStep onChosen={() => setLanguageChosen(true)} />;
  }

  function enter(tab: "reader" | "guide") {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    dispatch({ type: "SET_TAB", payload: tab });
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center px-5 py-8 sm:px-8">
        <main className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-ink">
              <span aria-hidden>✦</span>
              Language Threshold
            </div>

            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.03] text-foreground sm:text-6xl">
              Understand what you read.
              <span className="block text-gold-ink">Remember what matters.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Open a real passage, tap any word, and ask Tutor why it works in that exact sentence.
              Save it once; practice it whenever you are ready.
            </p>

            <button
              type="button"
              onClick={() => enter("reader")}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-midnight shadow-gold transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Start reading
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span>No account needed</span>
              <span aria-hidden>·</span>
              <span>Beginner passage ready</span>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => enter("guide")}
                className="min-h-11 rounded-lg px-2 text-foreground underline decoration-gold/60 underline-offset-4 hover:text-gold-ink"
              >
                Explore all tools
              </button>
            </div>
          </section>

          <section
            aria-label="How the learning loop works"
            className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-luxe sm:p-6"
          >
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Your first minute
            </p>
            <ol className="space-y-3">
              {[
                {
                  Icon: MousePointer2,
                  tone: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
                  title: "Tap a word",
                  body: "See what it means inside the sentence—not in isolation.",
                },
                {
                  Icon: MessageCircle,
                  tone: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
                  title: "Ask about it",
                  body: "Tutor continues with the word, sentence, and passage attached.",
                },
                {
                  Icon: BookmarkPlus,
                  tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                  title: "Save and practice",
                  body: "Keep it in My Vocab and strengthen recall with Flashcards.",
                },
              ].map(({ Icon, tone, title, body }, index) => (
                <li
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-border/45 bg-background/55 p-3.5"
                >
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {index + 1}. {title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Personalize for your profession and level later from the complete toolkit.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
