import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import type { LtAnalytics } from "@/lib/lt-analytics";
import { cn } from "@/lib/utils";

interface PostSessionFeedbackProps {
  analytics: LtAnalytics;
  scenarioId: string;
  scenarioTitle: string;
  language: string;
  missionArea?: string;
  onClose: () => void;
}

export function PostSessionFeedback({
  analytics,
  scenarioId,
  scenarioTitle,
  language,
  missionArea,
  onClose,
}: PostSessionFeedbackProps) {
  const alive = useRef(false);
  useOverlayHistory(true, onClose);
  const flight = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating || flight.current || !alive.current) return;
    flight.current = true;
    setError(null);
    setSubmitting(true);
    const saved = await analytics.submitFeedback({
      feedbackType: "field_prep_session",
      rating,
      comment: comment.trim() || undefined,
      scenarioId,
      language,
      missionArea,
    });
    flight.current = false;
    if (!alive.current) return;
    setSubmitting(false);
    if (!saved) {
      setError("Feedback save could not be confirmed. Try again.");
      return;
    }
    setSubmitted(true);
    closeTimer.current = setTimeout(() => {
      if (alive.current) onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <button
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Dismiss"
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-gold/30 bg-card/95 p-6 shadow-luxe backdrop-blur-xl">
        <button
          onClick={onClose}
          aria-label="Close session feedback"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-2xl">✦</p>
            <p className="font-display text-sm text-gold italic">Thank you!</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Your feedback helps improve Field Prep for every missionary.
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-display text-sm text-foreground">How was that session?</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {scenarioTitle} · {language}
            </p>

            {/* Stars */}
            <div className="mt-4 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      n <= (hovered || rating) ? "fill-gold text-gold" : "text-border",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 self-center font-mono text-[11px] text-muted-foreground">
                  {["", "Needs work", "Getting there", "Good", "Really good", "Excellent"][rating]}
                </span>
              )}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any thoughts? (optional)"
              rows={2}
              maxLength={2000}
              className="mt-4 w-full resize-none rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
            />

            {error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {/* Actions */}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="rounded-full border border-border/60 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Skip
              </button>
              <button
                onClick={submit}
                disabled={!rating || submitting}
                className="rounded-full bg-gold px-5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-midnight transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
