import { useId, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/state/auth-state";
import { ownedTeamRequest } from "@/lib/team-client";
import { correctionText } from "@/lib/lesson-correction";

interface Props {
  moduleId: string;
  lessonNumber: number;
  lessonTitle: string;
  language: string;
  nativeLanguage: string;
}

export function LessonCorrection(props: Props) {
  const { user, isCurrentUser } = useAuth();
  const id = useId();
  const flight = useRef(false);
  const requestId = useRef<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const context = { ...props, requestId: requestId.current ?? "", suggestion: suggestion.trim() };
  const mailto = `mailto:support@languagethreshold.com?subject=${encodeURIComponent(`Lesson correction: ${props.moduleId} / ${props.lessonNumber}`)}&body=${encodeURIComponent(correctionText(context))}`;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || flight.current) return;
    const actor = user.id;
    if (!isCurrentUser(actor)) return;
    flight.current = true;
    setPending(true);
    setError(null);
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await ownedTeamRequest<{ accepted: boolean }>(
        {
          userId: actor,
          isCurrent: () => isCurrentUser(actor),
          signal: AbortSignal.timeout(30_000),
        },
        "/api/lesson-correction",
        { ...props, suggestion: suggestion.trim(), requestId: requestId.current },
      );
      if (result.accepted && isCurrentUser(actor)) setSent(true);
    } catch (reason) {
      if (isCurrentUser(actor))
        setError(
          reason instanceof Error
            ? reason.message
            : "Sending could not be confirmed. Please try again later.",
        );
    } finally {
      flight.current = false;
      if (isCurrentUser(actor)) setPending(false);
    }
  }
  return (
    <details
      className="rounded-xl border border-border/60 bg-card/30 p-3"
      data-testid="lesson-correction"
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-foreground">
        Suggest a correction
      </summary>
      <div className="space-y-3 pt-2">
        <p className="text-sm text-foreground">
          <strong>Have a correction?</strong> Notice something we could improve? Let us know, and
          we’ll review it.
        </p>
        <p className="text-xs text-muted-foreground">
          {props.moduleId} · Lesson {props.lessonNumber}: {props.lessonTitle}
          <br />
          {props.language} · Instructions in {props.nativeLanguage}
        </p>
        {sent ? (
          <p role="status" className="text-sm text-gold">
            Thanks for helping us improve. Your suggestion has been sent for review.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm" htmlFor={id}>
              Suggested correction
            </label>
            <textarea
              id={id}
              value={suggestion}
              onChange={(event) => {
                setSuggestion(event.target.value);
                requestId.current = null;
              }}
              required
              minLength={5}
              maxLength={3000}
              rows={4}
              disabled={pending}
              placeholder="Tell us what to change and why…"
              className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {user ? (
              <button
                type="submit"
                disabled={pending || suggestion.trim().length < 5}
                className="min-h-11 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send for review"}
              </button>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  You can send your suggestion using your email app. The lesson details are
                  included.
                </p>
                <a
                  href={mailto}
                  className="inline-flex min-h-11 items-center rounded-xl border border-gold/50 px-4 text-sm text-gold"
                >
                  Open email with my suggestion →
                </a>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Suggestions go to support@languagethreshold.com. Please leave out personal or patient
              information.
            </p>
          </form>
        )}
      </div>
    </details>
  );
}
