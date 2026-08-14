import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  CreditCard,
  TrendingUp,
  Gift,
  Users2,
  X,
  Check,
  Copy,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/state/auth-state";
import { useSubscription } from "@/state/subscription-state";
import { PwaInstallControl } from "@/components/PwaInstallControl";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Account — Language Threshold" }],
  }),
});

// Stripe payment links
const ANNUAL_LINK = import.meta.env.VITE_STRIPE_PRICE_ANNUAL
  ? null
  : "https://buy.stripe.com/bJe7sN2Dx29v0vD76mbfO09";
const MONTHLY_LINK = import.meta.env.VITE_STRIPE_PRICE_MONTHLY
  ? null
  : "https://buy.stripe.com/14A9AVemfg0l1zH8aqbfO08";

const CANCEL_REASONS = [
  { id: "too_busy", label: "Time — life got busy" },
  { id: "wrong_content", label: "Not the vocab area I needed" },
  { id: "lost_interest", label: "Lost interest" },
  { id: "not_enough", label: "Not enough content yet" },
  { id: "other", label: "Something else" },
];

function planLabel(priceId: string | undefined, status: string): string {
  if (!priceId) return status === "trialing" ? "Free trial" : "Pro";
  if (priceId.includes("family")) return "Family Plan";
  if (priceId.includes("annual") || priceId.includes("yearly")) return "Pro Annual";
  return "Pro Monthly";
}

function CancelModal({
  periodEnd,
  onCancel,
  onClose,
}: {
  periodEnd: number | null;
  onCancel: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    if (!reason) return;
    setLoading(true);
    await onCancel(reason);
    setLoading(false);
    setDone(true);
  }

  const endDate = periodEnd
    ? new Date(periodEnd * 1000).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the end of your billing period";

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Cancellation scheduled</h2>
          <p className="text-sm text-muted-foreground mb-5">
            You have full access until <strong className="text-foreground">{endDate}</strong>.
            No further charges. Come back anytime.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-background hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Cancel subscription</h2>
            <p className="text-xs text-muted-foreground mt-1">
              You keep full access until {endDate}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Help us improve — what's your reason?
        </p>

        <div className="space-y-2 mb-5">
          {CANCEL_REASONS.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
                reason === r.id
                  ? "border-gold/60 bg-gold/8 text-foreground"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  reason === r.id ? "border-gold bg-gold" : "border-muted-foreground/40"
                }`}
              >
                {reason === r.id && <Check className="h-2.5 w-2.5 text-midnight" />}
              </span>
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={confirm}
          disabled={!reason || loading}
          className="w-full rounded-xl border border-destructive/50 bg-destructive/8 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/15 transition-colors disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            "Cancel at end of period"
          )}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Keep my subscription
        </button>
      </div>
    </div>
  );
}

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const { isActive, status, refresh } = useSubscription();
  const navigate = useNavigate();

  const [showCancel, setShowCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Sign in to manage your account.</p>
          <Link to="/" className="text-xs text-gold underline underline-offset-2">← Back to app</Link>
        </div>
      </div>
    );
  }

  // Pull sub data from user metadata (set by webhook)
  const meta = (user as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
  // We read from profiles.data via subscription-state; for richer data we'd need a server fetch.
  // For now show what we have from the auth token + subscription state.

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/pricing?ref=${user.id.slice(0, 8)}`
    : "";

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  async function handleCancel(reason: string) {
    setCancelError(null);
    const res = await fetch("/api/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id, reason }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || json.error) {
      setCancelError(json.error ?? "Something went wrong. Please contact support.");
      return;
    }
    await refresh();
  }

  const giftLink = ANNUAL_LINK ?? `${typeof window !== "undefined" ? window.location.origin : ""}/pricing`;

  return (
    <>
      {showCancel && (
        <CancelModal
          periodEnd={null}
          onCancel={handleCancel}
          onClose={() => { setShowCancel(false); setCancelError(null); }}
        />
      )}

      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>

          <div className="flex items-center gap-2.5 mb-8">
            <Settings className="h-5 w-5 text-gold" />
            <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          </div>

          <PwaInstallControl variant="card" />

          {/* ── Plan card ── */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gold" />
              <h2 className="text-sm font-semibold text-foreground">Your plan</h2>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isActive ? planLabel(undefined, status) : "Free"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {status === "trialing" && "7-day free trial — no charge yet"}
                    {status === "active" && "Active — billed automatically"}
                    {status === "canceled" && "Canceled — access ends at period end"}
                    {(status === "none" || !isActive) && "No active subscription"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">{user.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
                    status === "trialing"
                      ? "bg-gold/10 text-gold"
                      : status === "active"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "trialing" ? "Trial" : status === "active" ? "Active" : status}
                </span>
              </div>
            </div>
          </section>

          {/* ── Upgrade to annual ── */}
          {isActive && status !== "canceled" && (
            <section className="rounded-2xl border border-gold/30 bg-gold/5 overflow-hidden mb-4">
              <div className="px-5 py-4 flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Switch to annual — save 35%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    $149/year vs $228/year monthly. Same full access.
                  </p>
                </div>
                <a
                  href={ANNUAL_LINK ?? "/pricing?billing=annual"}
                  className="shrink-0 rounded-lg bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight font-semibold hover:opacity-90 transition-opacity"
                >
                  Upgrade →
                </a>
              </div>
            </section>
          )}

          {/* ── Gift language ── */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
              <Gift className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-foreground">Gift a subscription</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Give someone a year of Language Threshold — great for a coworker, spouse, or anyone learning Spanish on the job.
              </p>
              <a
                href={giftLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-400 hover:opacity-80 transition-opacity"
              >
                <Gift className="h-3 w-3" />
                Send a gift link →
              </a>
            </div>
          </section>

          {/* ── Referral ── */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">Refer a friend</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Share your link. When they subscribe, you both get a free month added.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[10px] text-muted-foreground select-all truncate"
                />
                <button
                  type="button"
                  onClick={copyReferral}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground hover:border-gold/40 hover:text-gold transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </section>

          {/* ── Family setup ── */}
          {isActive && (
            <section className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-violet-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Family profiles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Add kids with username + PIN login</p>
                  </div>
                </div>
                <Link
                  to="/family-setup"
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  Manage →
                </Link>
              </div>
            </section>
          )}

          {/* ── Cancel ── */}
          {isActive && status !== "canceled" && (
            <section className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold text-foreground">Cancel subscription</h2>
              </div>
              <div className="px-5 py-4">
                {cancelError && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/8 px-3 py-2.5 mb-3">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{cancelError}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  You'll keep full access through the end of your current billing period.
                  No partial refunds, no hassle.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  className="rounded-lg border border-destructive/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive hover:bg-destructive/8 transition-colors"
                >
                  Cancel subscription
                </button>
              </div>
            </section>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Questions?{" "}
            <a href="mailto:support@languagethreshold.com" className="text-gold underline underline-offset-2">
              support@languagethreshold.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
