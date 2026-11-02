export function SpeakingConversationControls({
  text,
  feedback,
  voice,
  onText,
  onFeedback,
  onVoice,
  onRepeat,
  repeatDisabled,
}: {
  text: boolean;
  feedback: boolean;
  voice: boolean;
  onText(): void;
  onFeedback(): void;
  onVoice(): void;
  onRepeat(): void;
  repeatDisabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Conversation controls"
      className="sticky bottom-0 z-10 grid shrink-0 grid-cols-4 gap-1 rounded-2xl border border-border bg-background p-1 shadow-sm"
    >
      {[
        { label: "Text", name: "Reply text", active: text, action: onText },
        { label: "Feedback", name: "Coaching feedback", active: feedback, action: onFeedback },
        { label: "Voice", name: "Automatic voice replies", active: voice, action: onVoice },
      ].map((item) => (
        <button
          key={item.name}
          type="button"
          aria-label={item.name}
          aria-pressed={item.active}
          onClick={item.action}
          className={`min-h-11 rounded-xl px-1 text-sm font-medium ${item.active ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
        >
          {item.label}
          <span
            aria-hidden="true"
            className={`mx-auto mt-1 block h-1 w-4 rounded-full ${item.active ? "bg-primary" : "bg-border"}`}
          />
        </button>
      ))}
      <button
        type="button"
        aria-label="Repeat reply"
        disabled={repeatDisabled}
        onClick={onRepeat}
        className="min-h-11 rounded-xl border-l border-border px-1 text-sm font-medium text-foreground disabled:opacity-40"
      >
        Repeat
      </button>
    </div>
  );
}
