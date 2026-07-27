import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Lock, CheckCircle } from "lucide-react";
import { useSubscription } from "@/state/subscription-state";
import { useAuth } from "@/state/auth-state";
import { useApp, type TabKey } from "@/state/app-state";

// Tabs that are always free — no subscription required
const FREE_TABS = new Set<TabKey>(["missionary"]);

// Additional free tabs unlocked when a specific module is active
const MODULE_FREE_TABS: Record<string, Set<TabKey>> = {
  "lds-missionary": new Set<TabKey>(["missionary", "discussions", "fieldPrep"]),
};

const PAYWALL_SEEN_KEY = "lt.paywallSeen";

interface Props {
  currentTab: TabKey;
  children: ReactNode;
}

export function SubscriptionGate({ children }: Props) {
  // DEMO MODE — all paywalls disabled
  return <>{children}</>;
}

function EnabledSubscriptionGate({ currentTab, children }: Props) {
  const { isActive, loading: subLoading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const { state } = useApp();

  const [paywallSeen, setPaywallSeen] = useState(false);

  useEffect(() => {
    try {
      setPaywallSeen(!!sessionStorage.getItem(PAYWALL_SEEN_KEY));
    } catch {
      // sessionStorage unavailable (private mode, etc.)
    }
  }, []);

  // Module-specific free tabs
  const activeModuleId = state.activeModuleId;
  const moduleFree =
    typeof activeModuleId === "string" ? MODULE_FREE_TABS[activeModuleId] : null;
  const isMissionaryModule = activeModuleId === "lds-missionary";

  // Free tabs bypass the gate entirely
  if (FREE_TABS.has(currentTab)) return <>{children}</>;
  if (moduleFree?.has(currentTab)) return <>{children}</>;

  // Wait for both auth + subscription to resolve
  if (authLoading || subLoading) return <>{children}</>;

  // Subscribed or trialing — full access
  if (isActive) return <>{children}</>;

  // Mark that paywall has been seen (for Fix #3 — suppress full overlay on repeat visits)
  function onFreeDismiss() {
    try {
      sessionStorage.setItem(PAYWALL_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setPaywallSeen(true);
  }

  // If missionary user has already seen and dismissed the paywall this session,
  // show a soft inline reminder instead of the full overlay
  if (isMissionaryModule && paywallSeen) {
    return (
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold/[0.05] px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            This section is part of the{" "}
            <Link to="/pricing" className="text-gold underline underline-offset-2">
              Pro plan
            </Link>
            .
          </p>
          <Link
            to="/"
            search={{ tab: "missionary" } as never}
            className="shrink-0 text-xs text-gold underline underline-offset-2"
          >
            Back to Missionary →
          </Link>
        </div>
        <div className="pointer-events-none select-none blur-sm opacity-30 max-h-48 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // Not signed in or no active subscription → paywall overlay
  return (
    <div className="relative min-h-[420px]">
      {/* Blurred preview of content */}
      <div className="pointer-events-none select-none blur-sm opacity-40 max-h-64 overflow-hidden">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
        <div className="mx-auto max-w-sm text-center px-6 py-8">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-gold/10 p-3 border border-gold/30">
              <Lock className="h-6 w-6 text-gold" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            {isMissionaryModule ? "Pro content" : "Start your free 7-day trial"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {isMissionaryModule
              ? "Your missionary discussions and field prep are always free. This section is part of the Pro plan."
              : "Full access to all professional Spanish content — construction, medical, sports, and more."}
            {!user && " Sign in to get started."}
          </p>

          <div className="space-y-2 text-left mb-6">
            {(isMissionaryModule
              ? [
                  "All 6 discussions — word for word",
                  "AI speaking partner for teaching practice",
                  "Grammar studio and vocabulary tools",
                  "Reader, stories, and drills in every language",
                ]
              : [
                  "270 construction lessons across 9 trades",
                  "390 medical lessons across 13 specialties",
                  "AI word cards with morphology",
                  "All games, drills, and tutor modes",
                ]
            ).map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Fix #2: missionary gets free option as PRIMARY button */}
          {isMissionaryModule ? (
            <>
              <Link
                to="/"
                search={{ tab: "missionary" } as never}
                onClick={onFreeDismiss}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 mb-3"
              >
                Continue free with Missionary Spanish →
              </Link>
              <Link
                to="/pricing"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                <Sparkles className="h-4 w-4 text-gold" />
                Upgrade to Pro — unlock everything
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Start Free Trial — 7 days free
              </Link>

              {!user && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Already subscribed?{" "}
                  <Link to="/" className="text-gold underline underline-offset-2">
                    Sign in
                  </Link>
                </p>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                <Link
                  to="/"
                  search={{ tab: "missionary" } as never}
                  onClick={onFreeDismiss}
                  className="underline underline-offset-2"
                >
                  Continue free with Missionary Spanish →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
