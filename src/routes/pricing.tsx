import { RefundGuaranteeCallout } from "../components/legal/RefundGuarantee";
import { FounderStoryLink } from "../components/FounderStoryLink";
import { individualCheckoutUrl } from "@/lib/individual-checkout";
import { INDIVIDUAL_PRICES, INDIVIDUAL_PAYMENT_LINKS } from "@/lib/individual-pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { CheckCircle, ChevronRight, Users } from "lucide-react";
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
          "Compare Individual and Family Language Threshold plans. Start with a 7-day free trial. Family includes Junior Linguist.",
      },
    ],
  }),
});

const MONTHLY_PRICE_ID = INDIVIDUAL_PRICES.monthly;
const ANNUAL_PRICE_ID = INDIVIDUAL_PRICES.annual;
const FAMILY_PRICE_ID = INDIVIDUAL_PRICES.family;
const FAMILY_MONTHLY_PRICE_ID = INDIVIDUAL_PRICES.familyMonthly;

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
  "Every published professional module",
  "Reading, listening, and speaking practice",
  "Your own learning progress",
];

const FEATURES_FAMILY = [
  "Pro access for up to 6 family members",
  "Junior Linguist for kids ages 4–12",
  "Separate family profiles and progress",
];

const FEATURES_FREE = [
  "Missionary Spanish — full access, always free",
  "Onboarding + language selection",
];

const PLAN_GROUPS = [
  {
    title: "Individual",
    subtitle: "One learner · every published module",
    options: [
      { id: "monthly", name: "Monthly", price: "$19", period: "/month", billing: "$19 charged monthly after the 7-day trial. Renews monthly until canceled.", comparison: "", savings: "" },
      { id: "annual", name: "Annual", price: "$149", period: "/year", billing: "$149 charged once per year after the 7-day trial. About $12.42/month, billed annually.", comparison: "$228/year in 12 monthly payments", savings: "Save $79 a year" },
    ],
  },
  {
    title: "Family",
    subtitle: "Up to 6 profiles · includes Junior Linguist",
    options: [
      { id: "family-monthly", name: "Monthly", price: "$35", period: "/month", billing: "$35 charged monthly after the 7-day trial. Renews monthly until canceled.", comparison: "", savings: "" },
      { id: "family", name: "Annual", price: "$249", period: "/year", billing: "$249 charged once per year after the 7-day trial. About $20.75/month, billed annually.", comparison: "$420/year in 12 monthly payments", savings: "Save $171 a year" },
    ],
  },
] as const;

type BillingPlan = "monthly" | "annual" | "family-monthly" | "family" | "junior";
function isBillingPlan(value: string | null): value is BillingPlan {
  return value === "monthly" || value === "annual" || value === "family-monthly" || value === "family" || value === "junior";
}

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { teamActive, status } = useSubscription();
  const hasPlan = teamActive || status === "active" || status === "trialing";
  const [billing, setBilling] = useState<BillingPlan>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);
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
  const handleSubscribe = async (plan: BillingPlan) => {
    if (authLoading) return;
    setBilling(plan);
    if (!user) {
      try {
        sessionStorage.setItem("lt.pricing.plan.v1", plan);
      } catch {
        /* Keep sign-in usable when storage is blocked. */
      }
      window.location.href = "/?redirect=pricing";
      return;
    }
    setLoadingPlan(plan);
    setCheckoutError("");
    try {
      if (plan === "junior") {
        trackEvent("begin_checkout", { plan: "junior", currency: "USD" });
        window.location.href = JUNIOR_ANNUAL_LINK;
      } else {
        const priceId =
          plan === "monthly"
            ? MONTHLY_PRICE_ID
            : plan === "annual"
              ? ANNUAL_PRICE_ID
              : plan === "family-monthly"
                ? FAMILY_MONTHLY_PRICE_ID
              : FAMILY_PRICE_ID;
        await startCheckout(plan, priceId, user.id, user.email ?? undefined);
      }
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "We could not open checkout. Please try again.",
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
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
              7-day free trial
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl mb-3">
            Individual or family. Clear pricing.
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Individual: $19/month or $149/year for one learner. Family: $35/month or $249/year
            for up to 6 profiles, including Junior Linguist.
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
        <p className="mb-8 rounded-xl border border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
          Start with 7 days free. Your chosen price starts after the trial; payment and renewal terms are shown in checkout.
        </p>
        {PLAN_GROUPS.map((group) => (
          <section key={group.title} className="mb-9" aria-label={group.title + " plans"}>
            <div className="mb-4 sm:flex sm:items-baseline sm:gap-4">
              <h2 className="text-2xl font-semibold text-gold">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.subtitle}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.options.map((option) => {
                const plan = option.id as BillingPlan;
                const unavailable = plan === "family-monthly" && !FAMILY_MONTHLY_PRICE_ID;
                const features = group.title === "Family" ? FEATURES_FAMILY : FEATURES_PRO;
                return (
                  <article
                    key={plan}
                    className={`flex min-w-0 flex-col rounded-2xl border bg-card p-5 sm:p-6 ${billing === plan ? "border-gold" : "border-border"}`}
                    aria-label={group.title + " " + option.name}
                  >
                    <h3 className="text-lg font-semibold">{option.name}</h3>
                    {option.comparison && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="line-through">{option.comparison.split(" in ")[0]}</span>
                        {" in " + option.comparison.split(" in ")[1]}
                        <strong className="ml-2 text-gold">{option.savings}</strong>
                      </p>
                    )}
                    <p className="mt-2 flex items-baseline gap-2">
                      <strong className="text-4xl">{option.price}</strong>
                      <span className="text-sm text-muted-foreground">{option.period}</span>
                    </p>
                    <p className="mt-3 rounded-lg bg-background/50 p-3 text-sm text-muted-foreground">{option.billing}</p>
                    <ul className="my-5 flex-1 space-y-2">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan)}
                      disabled={hasPlan || authLoading || loadingPlan !== null || unavailable}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {hasPlan ? "Your access is active" : unavailable ? "Checkout being prepared" : loadingPlan === plan ? "Preparing checkout…" : `Choose ${group.title} ${option.name.toLowerCase()}`}
                      {!hasPlan && !unavailable && loadingPlan !== plan && <ChevronRight className="h-4 w-4" />}
                    </button>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      {unavailable ? "Monthly pricing preview · Checkout is not available yet" : "7-day trial · Review renewal terms in checkout"}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
        <RefundGuaranteeCallout />
        <div className="mb-7 text-center">
          <button type="button" onClick={() => setBilling(billing === "junior" ? "monthly" : "junior")} className="text-sm font-semibold text-gold underline">
            {billing === "junior" ? "Hide" : "See"} Junior Linguist kids-only plan
          </button>
        </div>
        {!hasPlan && billing === "junior" && (
          <>
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
                    onClick={() => handleSubscribe("junior")}
                    disabled={loadingPlan !== null || authLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loadingPlan === "junior" ? (
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

          </>
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

        {/* Team plans */}
        <div className="mt-8 rounded-xl border border-gold/40 bg-gold/5 px-5 py-6 sm:px-7">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <div>
              <p className="mb-1 text-base font-semibold text-foreground">
                Crew lead? Get what you need for your team.
              </p>
              <p className="text-sm text-muted-foreground">
                Train your crew with flexible seats and a plan that fits your team. Plans start at
                $99/month for five learner seats.
              </p>
              <Link
                to="/team"
                className="mt-4 inline-block rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background hover:opacity-90"
              >
                See team pricing →
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
