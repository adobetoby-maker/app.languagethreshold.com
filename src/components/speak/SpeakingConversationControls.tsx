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
          <svg
            aria-hidden="true"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="lt-native-control-icon"
          >
            {item.label === "Text" ? (
              <path d="M4 5h16M4 10h10M4 15h16M4 20h10" />
            ) : item.label === "Feedback" ? (
              <>
                <path d="M9 18h6M10 21h4M8 14c-4-5-2-11 4-11s8 6 4 11l-1 3H9z" />
              </>
            ) : (
              <>
                <path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14" />
              </>
            )}
          </svg>
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
        <svg
          aria-hidden="true"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="lt-native-control-icon"
        >
          <path d="M7 4H3v-4M3 4a9 9 0 1 1-1 10" transform="translate(2 3)" />
        </svg>
        Repeat
      </button>
    </div>
  );
}
