import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useState } from "react";
import { Sparkles, Mail, ArrowRight, Lock, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/state/app-state";
import { cn } from "@/lib/utils";

interface Props {
  mode: "email" | "paywall";
  onEmailCaptured: () => void;
  onClose: () => void;
}

export function AiGateModal({ mode, onEmailCaptured, onClose }: Props) {
  const { state } = useApp();
  useOverlayHistory(true, onClose);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          moduleId: state.activeModuleId ?? null,
          callCount: 3,
        }),
      });
      const result = (await res.json()) as { ok: boolean };

      if (result.ok) {
        onEmailCaptured();
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="rounded-2xl border border-border/60 bg-card/95 p-7 shadow-2xl">
          {mode === "email" ? (
            <>
              {/* Email gate */}
              <div className="flex justify-center mb-5">
                <div className="rounded-full bg-gold/10 p-3 border border-gold/30">
                  <Mail className="h-6 w-6 text-gold" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-center mb-1">You're getting it.</h2>
              <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                Drop your email to keep going — no password, no card. Free through August 2026 while
                we're in beta.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  className={cn(
                    "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors",
                    "placeholder:text-muted-foreground/50",
                    "focus:border-gold/60 focus:ring-1 focus:ring-gold/30",
                    error ? "border-destructive/60" : "border-border/60",
                  )}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "One sec…" : "Continue free"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-4 text-center text-[11px] text-muted-foreground/50">
                No spam. Unsubscribe anytime.
              </p>
            </>
          ) : (
            <>
              {/* Post-beta paywall */}
              <div className="flex justify-center mb-5">
                <div className="rounded-full bg-gold/10 p-3 border border-gold/30">
                  <Lock className="h-6 w-6 text-gold" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-center mb-1">
                Beta is over — thanks for being here early.
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                Language Threshold is now a paid product. Start a 7-day free trial to keep your
                streak going.
              </p>

              <Link
                to="/pricing"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 mb-3"
              >
                <Sparkles className="h-4 w-4" />
                Start free trial — 7 days free
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-border/40 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                Maybe later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
