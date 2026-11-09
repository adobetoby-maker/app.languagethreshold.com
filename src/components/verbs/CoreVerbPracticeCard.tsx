import { Repeat2, ArrowRight } from "lucide-react";
import { useApp } from "@/state/app-state";

/** Shared Core entry point; uses the same refreshable route as the main Verbs tab. */
export function CoreVerbPracticeCard({ compact = false }: { compact?: boolean }) {
  const { state } = useApp();
  const params = new URLSearchParams({
    tab: "verbs",
    module: state.activeModuleId ?? "core",
    target: state.selectedLanguage,
    native: state.nativeLanguage,
  });
  return (
    <section
      data-testid="core-verb-practice"
      className="my-4 rounded-xl border border-border bg-card p-4"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Repeat2 className="h-5 w-5 text-gold-ink" aria-hidden="true" />
        Verbs · ten minutes a day
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {compact
          ? "Keep practicing your verbs with games, conjugations and useful speaking patterns."
          : state.selectedLanguage === "Spanish" && state.nativeLanguage === "English"
            ? "Remember the verb, change its form, then use it. Practice with matching, Hangman and speaking patterns such as tener que, gerunds and past participles."
            : "Explore verb forms and speaking patterns available for your selected language."}
      </p>
      <a
        href={`/?${params}`}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 font-semibold text-foreground"
      >
        Open verb practice <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}
