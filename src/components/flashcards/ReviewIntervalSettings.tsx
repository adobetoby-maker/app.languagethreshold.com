import { useFlashcards } from "@/state/flashcard-state";
import type { ReviewIntervals } from "@/lib/srs";

const OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 45, 60, 90, 180, 365];

export function ReviewIntervalSettings({
  onStudyWholeDeck,
  deckCount,
}: {
  onStudyWholeDeck?: () => void;
  deckCount?: number;
}) {
  const { state, setReviewIntervals } = useFlashcards();
  const intervals = state.reviewIntervals;
  const update = (grade: keyof ReviewIntervals, days: number) =>
    setReviewIntervals({ ...intervals, [grade]: days });

  return (
    <section aria-label="Flashcard review settings" className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <h3 className="text-base font-semibold text-foreground">Flashcard review</h3>
      <p className="text-sm text-muted-foreground">Choose when a rated card returns. Again puts it back in the due queue.</p>
      <div className="grid grid-cols-3 gap-2">
        {(["hard", "good", "easy"] as const).map((grade) => (
          <label key={grade} className="text-sm font-medium capitalize text-foreground">
            {grade}
            <select
              aria-label={`${grade} review interval`}
              value={intervals[grade]}
              onChange={(event) => update(grade, Number(event.target.value))}
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              {[...new Set([...OPTIONS, intervals[grade]])].sort((a, b) => a - b).map((days) => (
                <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Changing these intervals affects future ratings only. Saved progress and existing review dates stay as they are.</p>
      {onStudyWholeDeck && (
        <button
          type="button"
          disabled={!deckCount}
          onClick={onStudyWholeDeck}
          className="min-h-11 w-full rounded-lg border border-gold/60 bg-gold/10 px-3 text-sm font-semibold text-gold-ink disabled:opacity-50"
        >
          Study whole deck again{deckCount ? ` · ${deckCount} cards` : ""}
        </button>
      )}
      {onStudyWholeDeck && <p className="text-xs text-muted-foreground">This starts a one-time review of the selected deck, including cards not due yet. It does not reset their history.</p>}
    </section>
  );
}
