import { FounderStoryLink } from "../components/FounderStoryLink";
import { individualCheckoutUrl } from "@/lib/individual-checkout";
import { INDIVIDUAL_PRICES, INDIVIDUAL_PAYMENT_LINKS } from "@/lib/individual-pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { CheckCircle, Sparkles, ChevronRight, Users } from "lucide-react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { SubscriptionProvider, useSubscription } from "@/state/subscription-state";
import { trackEvent } from "@/lib/ga-events";

export const Route = createFileRoute("/pricing")({
  component: () => (
    <AuthProvider>
      <SubscriptionProvider>
        <PricingPage />
      </SubscriptionProvider>
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "Language Threshold Pricing — 7-Day Free Trial" },
      {
        name: "description",
        content:
          "Start free for 7 days. 660+ role-specific lessons in Spanish, French, German, Italian, Japanese, Korean, Portuguese and Pashto. Family plan includes Junior Linguist.",
      },
    ],
  }),
});

const MONTHLY_PRICE_ID = INDIVIDUAL_PRICES.monthly;
const ANNUAL_PRICE_ID = INDIVIDUAL_PRICES.annual;
const FAMILY_PRICE_ID = INDIVIDUAL_PRICES.family;

const JUNIOR_ANNUAL_LINK = INDIVIDUAL_PAYMENT_LINKS.junior;

async function startCheckout(
  plan: string,
  priceId: string | undefined,
  userId: string,
  userEmail?: string,
) {
  if (!priceId) throw new Error("This plan is temporarily unavailable. Please try again shortly.");
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session || auth.session.user.id !== userId) {
    window.location.href = "/?redirect=pricing";
    return;
  }
  const res = await fetch("/api/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.session.access_token}`,
    },
    body: JSON.stringify({ priceId, userId, userEmail }),
  });
  const url = await individualCheckoutUrl(res);
  trackEvent("begin_checkout", { plan, currency: "USD" });
  window.location.href = url;
}

const FEATURES_PRO = [
  "Every module — 660+ lessons across medical, construction, sports, missionary, climbing, and more",
  "AI speaking partner with real-time feedback",
  "AI grammar studio, tutor, and vocabulary tools",
  "Field Prep: roleplay real on-the-job conversations",
  "Listening drills, sentence builder, conjugation trainer",
  "Daily challenges, leaderboard, and streak tracking",
  "All future modules included — we add new professions constantly",
];

const FEATURES_FAMILY = [
  "Everything in Pro",
  "Up to 6 family member profiles",
  "Junior Linguist included — ages 4-12",
  "Kids vocabulary, stories, and games",
  "Shared family leaderboard",
  "Progress reports per child",
];

const FEATURES_FREE = [
  "Missionary Spanish — full access, always free",
  "Onboarding + language selection",
];

type BillingPlan = "monthly" | "annual" | "family" | "junior";
function isBillingPlan(value: string | null): value is BillingPlan {
  return value === "monthly" || value === "annual" || value === "family" || value === "junior";
}

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { teamActive, status } = useSubscription();
  const hasPlan = teamActive || status === "active" || status === "trialing";
  const [billing, setBilling] = useState<BillingPlan>("monthly");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("plan");
    try {
      const selected = requested ?? sessionStorage.getItem("lt.pricing.plan.v1");
      if (isBillingPlan(selected)) setBilling(selected);
      if (isBillingPlan(requested)) sessionStorage.setItem("lt.pricing.plan.v1", requested);
    } catch {
      if (isBillingPlan(requested)) setBilling(requested);
    }
  }, []);

  const [checkoutError, setCheckoutError] = useState("");
  const handleSubscribe = async () => {
    if (authLoading) return;
    if (!user) {
      try {
        sessionStorage.setItem("lt.pricing.plan.v1", billing);
      } catch {
        /* Keep sign-in usable when storage is blocked. */
      }
      window.location.href = "/?redirect=pricing";
      return;
    }
    setLoading(true);
    setCheckoutError("");
    try {
      if (billing === "junior") {
        trackEvent("begin_checkout", { plan: "junior", currency: "USD" });
        window.location.href = JUNIOR_ANNUAL_LINK;
      } else {
        const priceId =
          billing === "monthly"
            ? MONTHLY_PRICE_ID
            : billing === "annual"
              ? ANNUAL_PRICE_ID
              : FAMILY_PRICE_ID;
        await startCheckout(billing, priceId, user.id, user.email ?? undefined);
      }
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "We could not open checkout. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <Link
            to="/"
            className="inline-block mb-6 text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            ← Back to app
          </Link>
          <div className="flex justify-center mb-4">
            <span className="rounded-full bg-gold/10 border border-gold/30 px-4 py-1.5 text-xs font-semibold text-gold uppercase tracking-wider">
              {billing === "junior" ? "Annual kids plan" : "7-day free trial"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl mb-3">
            Individual or family. Clear pricing.
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            Individual: $19/month for one learner. Family: $249/year for up to 6 profiles, including
            Junior Linguist. Annual plans are billed once per year.
          </p>
        </div>

        {/* Already subscribed */}
        {hasPlan && (
          <div className="mb-8 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-gold">
              {teamActive && status !== "active" && status !== "trialing"
                ? "Your company team seat includes full access."
                : status === "trialing"
                  ? "You're in your free trial — enjoy full access!"
                  : "You have an active subscription."}
            </p>
            <Link to="/" className="mt-2 inline-block text-xs text-muted-foreground underline">
              Back to the app →
            </Link>
          </div>
        )}

        {checkoutError && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-red-500/40 bg-card p-4 text-sm text-foreground"
          >
            {checkoutError}
          </p>
        )}
        {!hasPlan && (
          <>
            {/* Billing toggle */}
            <div className="flex justify-center mb-8">
              <div
                role="group"
                aria-label="Choose billing plan"
                className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 text-sm sm:grid-cols-4"
              >
                <button
                  aria-pressed={billing === "monthly"}
                  onClick={() => setBilling("monthly")}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${billing === "monthly" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  aria-pressed={billing === "annual"}
                  onClick={() => setBilling("annual")}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${billing === "annual" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Annual
                  <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    SAVE $79/YEAR
                  </span>
                </button>
                <button
                  aria-pressed={billing === "family"}
                  onClick={() => setBilling("family")}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${billing === "family" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Family
                  <span className="ml-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
                    +JUNIOR
                  </span>
                </button>
                <button
                  aria-pressed={billing === "junior"}
                  onClick={() => setBilling("junior")}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${billing === "junior" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  🧒 Kids
                </button>
              </div>
            </div>

            {/* Pro tier */}
            {(billing === "monthly" || billing === "annual") && (
              <div className="rounded-2xl border border-gold/40 bg-card overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-gold/10 to-transparent border-b border-gold/20 px-6 py-5">
                  <h2 className="text-base font-semibold text-foreground mb-3">
                    {billing === "annual" ? "Individual annual" : "Individual monthly"} · 1 learner
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      {billing === "annual" ? "$149" : "$19"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {billing === "annual" ? "/year" : "/month"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {billing === "annual"
                      ? "$149 billed once per year. Save $79 versus 12 monthly payments (about 35%)."
                      : "$19 billed each month. Renews monthly until canceled."}
                  </p>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-gold" />
                    {billing === "annual"
                      ? "All modules included · First 7 days free · Cancel anytime"
                      : "First 7 days completely free — cancel anytime"}
                  </div>
                </div>
                <div className="px-6 py-5">
                  <ul className="space-y-2.5 mb-6">
                    {FEATURES_PRO.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleSubscribe}
                    disabled={loading || authLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      "Preparing checkout…"
                    ) : authLoading ? (
                      "Loading…"
                    ) : (
                      <>
                        Start free trial
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Seven-day trial · Payment details and renewal terms are shown in checkout
                  </p>
                </div>
              </div>
            )}

            {/* Junior Linguist tier */}
            {billing === "junior" && (
              <div className="rounded-2xl border border-violet-500/40 bg-card overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-violet-500/10 to-transparent border-b border-violet-500/20 px-6 py-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🧒</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                      Junior Linguist — Kids Plan
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">$79</span>
                    <span className="text-muted-foreground text-sm">/year</span>
                    <span className="text-xs line-through text-muted-foreground">$119.88</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-violet-400">
                    ~$6.58/month · Save 34%
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Annual subscription · Renewal terms shown in checkout
                  </div>
                </div>
                <div className="px-6 py-5">
                  <ul className="space-y-2.5 mb-6">
                    {[
                      "Ages 4-12, designed for little learners",
                      "18 themed vocabulary modules",
                      "Flashcards, quizzes, and memory games",
                      "AI tutor chat and pronunciation coach",
                      "Daily stories + listening drills",
                      "XP streaks and achievement badges",
                      "Username-only login — no email needed",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleSubscribe}
                    disabled={loading || authLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      "Preparing checkout…"
                    ) : (
                      <>
                        Continue to checkout <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Payment and renewal terms are shown in checkout
                  </p>
                </div>
              </div>
            )}

            {/* Family tier */}
            {billing === "family" && (
              <div className="rounded-2xl border border-violet-500/40 bg-card overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-violet-500/10 to-transparent border-b border-violet-500/20 px-6 py-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                      Family annual · Up to 6 profiles
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">$249</span>
                    <span className="text-muted-foreground text-sm">/year</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    $249 billed once per year. Equivalent to $20.75/month, billed annually. Includes
                    Junior Linguist for kids.
                  </div>
                </div>
                <div className="px-6 py-5">
                  <ul className="space-y-2.5 mb-6">
                    {FEATURES_FAMILY.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleSubscribe}
                    disabled={loading || authLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      "Preparing checkout…"
                    ) : (
                      <>
                        Start family plan <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    7-day trial · $249/year for up to 6 family profiles · Renewal terms in checkout
                  </p>
                </div>
              </div>
            )}

            {/* Free tier */}
            <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
              <div className="px-6 py-5">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-foreground">Free</span>
                  <span className="text-muted-foreground text-sm">forever</span>
                </div>
                <ul className="space-y-2.5">
                  {FEATURES_FREE.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/"
                  className="mt-5 inline-block text-xs text-gold underline underline-offset-2 hover:opacity-80"
                >
                  Continue with free access →
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Junior Linguist callout */}
        <div className="mt-8 rounded-xl border border-gold/30 bg-gold/5 px-5 py-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <div>
              <p className="mb-1 text-base font-semibold text-foreground">
                Training a crew or company?
              </p>
              <p className="text-sm text-muted-foreground">
                Teams start at five learner seats for $99/month. Seats 6–10 add $12/month each;
                seats 11 and up add $10/month each. Ten seats cost $159/month; 15 seats cost
                $209/month, $627 for three months, or $2,090 for one year. Every learner can use
                every published module. Company admins can assign a focus, invite employees, and
                review practice and certificates.
              </p>
              <Link
                to="/team"
                className="mt-3 inline-block text-sm font-semibold text-gold underline underline-offset-2"
              >
                Set up a team →
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 rounded-xl border border-border bg-card/40 px-5 py-5">
          <p className="text-base font-semibold">Need a specialty we have not published?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pro and Team include the full library. A custom module request costs $20 and includes
            review plus a content brief. Building and publishing a complete module is quoted
            separately.
          </p>
          <Link
            to="/module-request"
            className="mt-3 inline-block text-sm font-semibold text-gold underline underline-offset-2"
          >
            Request a custom module →
          </Link>
        </div>
        <div className="mt-8 rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧒</span>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Got kids? Try Junior Linguist
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                Designed for ages 4-12. Vocabulary games, stories, and speaking practice built for
                little learners. Included free with the Family Plan.
              </p>
              <a
                href="https://juniorlinguist.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 underline underline-offset-2 hover:opacity-80"
              >
                Try Junior Linguist free →
              </a>
            </div>
          </div>
        </div>

        {/* Affiliate section — language learning tools */}
        <div className="mt-8 rounded-xl border border-border bg-card/40 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Tools that accelerate your progress
          </p>
          <div className="space-y-3">
            <a
              href="https://www.amazon.com/s?k=Pimsleur+Spanish+audio&tag=langthresh-20"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm hover:border-gold/40 transition-colors group"
            >
              <span className="text-lg leading-none mt-0.5">🎧</span>
              <div className="min-w-0">
                <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                  Pimsleur Spanish Audio Course
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Train your ear during commutes. Spaced-repetition audio built for adult learners.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 ml-auto group-hover:text-gold transition-colors" />
            </a>

            <a
              href="https://www.amazon.com/s?k=Sony+WH1000XM5+noise+cancelling+headphones&tag=langthresh-20"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm hover:border-gold/40 transition-colors group"
            >
              <span className="text-lg leading-none mt-0.5">🎵</span>
              <div className="min-w-0">
                <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                  Sony WH-1000XM5 Headphones
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Noise-cancelling focus for listening drills. The difference between distracted and
                  immersed.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 ml-auto group-hover:text-gold transition-colors" />
            </a>

            <a
              href="https://www.amazon.com/s?k=Spanish+vocabulary+flashcards&tag=langthresh-20"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm hover:border-gold/40 transition-colors group"
            >
              <span className="text-lg leading-none mt-0.5">📇</span>
              <div className="min-w-0">
                <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                  Spanish Vocabulary Flashcards
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Physical cards for hands-on review — great offline companion to your digital
                  practice.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 ml-auto group-hover:text-gold transition-colors" />
            </a>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/60 leading-relaxed">
            As an Amazon Associate we earn from qualifying purchases. This does not affect our
            recommendations.
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground border-t border-border pt-6">
          <div className="mb-5">
            <FounderStoryLink />
          </div>
          Questions?{" "}
          <a href="/support" className="text-foreground underline">
            Contact support
          </a>{" "}
          or email{" "}
          <a href="mailto:support@languagethreshold.com" className="text-foreground underline">
            support@languagethreshold.com
          </a>
        </div>
      </div>
    </div>
  );
}
