import { useVerbHabit } from "@/hooks/use-verb-habit";
export const FINISH_STUDY_EVENT = "lt:finish-study";
export function VerbHabitSettings() {
  const { enabled, setEnabled } = useVerbHabit();
  return (
    <section className="mt-3 space-y-2 rounded-xl border border-border bg-card p-4">
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
        <span>Before you go, study your verbs</span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Before you go, study your verbs"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-5 accent-amber-500"
        />
      </label>
      <p className="text-sm text-muted-foreground">
        Offer a short verb review before finishing a session. If the browser closes immediately,
        remind me when I return. Stops after ten minutes of verb practice today.
      </p>
      <button
        className="min-h-11 rounded-lg border px-3 py-2 text-sm"
        onClick={() => window.dispatchEvent(new Event(FINISH_STUDY_EVENT))}
      >
        Finish study session
      </button>
    </section>
  );
}
