import { useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { useAuth } from "@/state/auth-state";
import { AuthModal } from "./auth/AuthModal";

const DISMISSED_KEY = "lt.save-progress-dismissed";

export function SaveProgressBanner() {
  const { user, loading } = useAuth();
  // Unmount guest eligibility and open auth UI at every authenticated/loading boundary.
  if (user || loading) return null;
  return <GuestSaveProgressBanner />;
}

function GuestSaveProgressBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  // Eligibility describes this guest visit only. Old device-wide flags may
  // originate from another learner and are deliberately left unread/untouched.
  const [earned, setEarned] = useState(false);
  const [wordCardOpen, setWordCardOpen] = useState(false);

  useEffect(() => {
    const onMeaningfulAction = () => {
      setEarned(true);
    };
    const onWordCardState = (event: Event) => {
      setWordCardOpen(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener("lt:meaningful-learning-action", onMeaningfulAction);
    window.addEventListener("lt:word-card-state", onWordCardState);
    return () => {
      window.removeEventListener("lt:meaningful-learning-action", onMeaningfulAction);
      window.removeEventListener("lt:word-card-state", onWordCardState);
    };
  }, []);

  if (dismissed || !earned || wordCardOpen) return null;

  return (
    <>
      <div className="lt-safe-top-only border-b border-gold/20 bg-gold/[0.04] px-3 sm:px-6">
        <div className="flex min-h-11 items-center gap-2">
          <Bookmark className="h-4 w-4 flex-shrink-0 text-gold" />
          <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Keep this progress</span>
            <span className="hidden sm:inline">
              {" "}
              — sync My Vocab, XP, and streaks across devices.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="min-h-11 flex-shrink-0 rounded-lg px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-ink transition-colors hover:bg-gold/10 sm:px-3"
          >
            Save →
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(DISMISSED_KEY, "1");
              } catch {
                /* noop */
              }
              setDismissed(true);
            }}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-background/50 hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
