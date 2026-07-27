import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/state/app-state";

/**
 * One-time Reader hint revealing the signature interaction. DUO-002 P0-2 / §8.3.
 *
 * The copy names BOTH panes deliberately. Word lookup works on the native side
 * too — tapping an English word opens the same card, with Ask Tutor and My
 * Vocab — and an earlier version of this hint (plus target-pane-only
 * underlines) implied otherwise. Underlining alone cannot express "either side,
 * and it leads to the Tutor", so the sentence carries that and the underlines
 * just mark tappability.
 *
 * The Reader's core move — tap a word, get it explained in its own sentence,
 * carry that into Tutor — was never taught anywhere in the product. Onboarding
 * routes elsewhere and the App Guide is buried, so a new learner had no way to
 * discover it.
 *
 * Deliberately not a tutorial or a modal: it does not block interaction, it
 * dismisses on the first real word tap (the moment it becomes redundant), and
 * the dismissal is remembered.
 */
const KEY = "lt.reader.tapHintSeen";

export function TapHint() {
  const { state } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) !== "1") setVisible(true);
    } catch {
      /* private mode — simply don't show it */
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // Self-dismiss once the learner actually taps a word: the hint has done its
  // job and should not linger.
  useEffect(() => {
    if (!visible) return;
    const onWord = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(".lt-word")) dismiss();
    };
    document.addEventListener("click", onWord, true);
    return () => document.removeEventListener("click", onWord, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="note"
      className="mb-3 flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2"
    >
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Your training demo
        </div>
        <span className="mt-1 block text-sm leading-relaxed text-foreground/85">
          Tap a word on either side — {state.nativeLanguage} or {state.selectedLanguage} — to see
          what it means in this sentence, ask the Tutor about it, then save it.
        </span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss training demo"
        className="ml-auto shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-gold/15 hover:text-gold"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
