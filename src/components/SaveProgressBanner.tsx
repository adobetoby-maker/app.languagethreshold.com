import { useState } from "react";
import { Bookmark, X } from "lucide-react";
import { useAuth } from "@/state/auth-state";
import { useApp } from "@/state/app-state";
import { AuthModal } from "./auth/AuthModal";

const DISMISSED_KEY = "lt.save-progress-dismissed";

export function SaveProgressBanner() {
  const { user, loading } = useAuth();
  const { state } = useApp();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const hasExperiencedValue =
    state.wordsLookedUp > 0 || state.tutorMessages > 0 || state.userVocab.length > 0;

  // Account prompts earn their space only after the learner has used the
  // signature interaction. Never pre-empt the first reading action.
  if (user || !hasExperiencedValue) return null;

  if (loading) return null;

  return (
    <>
      <div
        className={
          collapsed
            ? "border-b border-border/40 bg-card/40 px-4 py-1.5 sm:px-6"
            : "border-b border-gold/20 bg-gold/[0.04] px-4 py-2.5 sm:px-6"
        }
      >
        <div className="flex items-center gap-3">
          <Bookmark className="h-4 w-4 flex-shrink-0 text-gold" />
          <p className="flex-1 text-xs text-muted-foreground leading-snug min-w-0">
            {collapsed ? (
              <span>Your learning is saved on this device.</span>
            ) : (
              <>
                <span className="font-semibold text-foreground">Keep what you learned —</span>{" "}
                create a free account when you want to sync words, XP, and streaks across devices.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="flex-shrink-0 rounded-lg bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight font-semibold hover:opacity-90 transition-opacity"
          >
            {collapsed ? "Sync" : "Save progress →"}
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(DISMISSED_KEY, "1");
                } catch {
                  /* noop */
                }
                setCollapsed(true);
              }}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-muted-foreground/70 hover:bg-background/40 hover:text-foreground"
              aria-label="Collapse save progress prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
