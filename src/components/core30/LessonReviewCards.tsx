import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useOwnedSpeaker } from "@/hooks/use-owned-speaker";
import type { LessonReviewController } from "@/hooks/use-lesson-review";
import { SrsRatingButtons } from "@/components/flashcards/SrsRatingButtons";
import { useApp } from "@/state/app-state";
import { useSpeech } from "@/state/speech-state";

export function LessonReviewCards({
  review,
  onClose,
  onContinue,
}: {
  review: LessonReviewController;
  onClose: () => void;
  onContinue: () => void;
}) {
  const { state } = useApp();
  const [flipped, setFlipped] = useState(false);
  const { accent, voiceURI } = useSpeech();
  const speak = useOwnedSpeaker(
    JSON.stringify([
      "lesson-review",
      state.selectedLanguage,
      review.currentCard?.id,
      accent,
      voiceURI,
    ]),
  );
  const card = review.currentCard;
  const round = review.round;
  if (!round) return null;
  const done = round.queue.length === 0;
  return (
    <section data-testid="lesson-review-cards" className="mx-auto max-w-xl space-y-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {round.checkpoint === null ? "Due review" : `Lesson ${round.checkpoint} review`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {round.attempts} reviewed · {round.queue.length} remaining · {round.total} cards ·{" "}
            {review.dueCount} due
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-border px-3 text-sm"
        >
          Save & exit
        </button>
      </header>
      {review.storageError && (
        <p role="alert" className="text-sm text-destructive">
          Your browser could not save this round. Keep this page open to continue.
        </p>
      )}
      {done ? (
        <div className="space-y-4 rounded-2xl border border-gold/40 bg-card p-6 text-center">
          <h3 className="font-display text-2xl">Review complete</h3>
          <p className="text-sm text-muted-foreground">
            Your ratings set each card’s next review. Difficult cards stay available for future
            practice.
          </p>
          <button
            type="button"
            onClick={() => {
              review.finish();
              onContinue();
            }}
            className="min-h-12 rounded-xl bg-gold px-5 font-semibold text-midnight"
          >
            Continue learning
          </button>
        </div>
      ) : card ? (
        <>
          <button
            type="button"
            data-testid="lesson-review-flip"
            aria-label="Flip review card"
            aria-pressed={flipped}
            onClick={() => setFlipped((v) => !v)}
            className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-gold/40 bg-card p-8 text-center"
          >
            <span className="text-sm text-muted-foreground">
              {flipped ? state.nativeLanguage : state.selectedLanguage}
            </span>
            <span className="font-display text-3xl font-semibold break-words">
              {flipped ? card.translation : card.word}
            </span>
            <span className="text-sm text-muted-foreground">Tap to flip</span>
          </button>
          <button
            type="button"
            onClick={() => speak(card.word, accent, voiceURI)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm"
          >
            <Volume2 className="h-4 w-4" /> Pronounce
          </button>
          <SrsRatingButtons
            fields={card.srs}
            disabled={!flipped}
            onRate={(grade) => {
              review.rate(grade);
              setFlipped(false);
            }}
          />
          <p className="text-sm text-muted-foreground">
            Flip, then rate your recall. Again and Hard may return once after other cards; every
            round ends within 18 ratings. Intervals are calculated from your saved schedule.
          </p>
        </>
      ) : (
        <div role="status">
          <p>This card is no longer in your collection.</p>
          <button type="button" className="min-h-11 underline" onClick={review.skipMissing}>
            Skip removed card
          </button>
        </div>
      )}
    </section>
  );
}
