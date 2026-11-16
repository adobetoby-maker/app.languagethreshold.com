import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { SubscriptionProvider } from "@/state/subscription-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";
import {
  RESOURCE_OFFER_TERMS,
  type ResourceOfferPlan,
  type ResourceOfferView,
} from "@/lib/resource-offer";
export const Route = createFileRoute("/offer")({
  validateSearch: (search: Record<string, unknown>) => ({
    resource:
      typeof search.resource === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(search.resource)
        ? search.resource
        : "study-guide",
  }),
  component: () => (
    <AuthProvider>
      <SubscriptionProvider>
        <StudyOffer />
      </SubscriptionProvider>
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "Study-guide offer · Language Threshold" },
      {
        name: "description",
        content:
          "A one-use offer for parents and adult learners using Language Threshold study guides.",
      },
    ],
  }),
});
const plans: {
  id: ResourceOfferPlan;
  label: string;
  normal: string;
  first: string;
  period: string;
}[] = [
  { id: "monthly", label: "Individual monthly", normal: "$19", first: "$17.10", period: "month" },
  { id: "annual", label: "Individual annual", normal: "$149", first: "$134.10", period: "year" },
  {
    id: "family-monthly",
    label: "Family monthly",
    normal: "$35",
    first: "$31.50",
    period: "month",
  },
  { id: "family", label: "Family annual", normal: "$249", first: "$224.10", period: "year" },
];
function StudyOffer() {
  const { user } = useAuth(),
    { resource } = Route.useSearch();
  const claim = useOwnerResource<ResourceOfferView>("/api/resource-offer");
  const checkout = useOwnerResource("/api/resource-offer-checkout", false);
  const [adult, setAdult] = useState(false),
    [notice, setNotice] = useState<{ userId: string; text: string } | null>(null);
  const busy = claim.busy || checkout.busy,
    currentNotice = notice && notice.userId === user?.id ? notice.text : null;
  const offer = claim.data;
  return (
    <main className="mx-auto grid max-w-3xl gap-7 px-5 py-10 text-foreground">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="font-semibold underline">
          Language Threshold
        </Link>
        <AuthButton />
      </header>
      <section className="rounded-2xl border border-emerald-600/40 bg-emerald-50 p-6 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50">
        <p className="mb-3 inline-block rounded-full bg-emerald-800 px-4 py-2 font-semibold text-white">
          Study-guide offer · 10% off once
        </p>
        <h1 className="text-3xl font-semibold leading-tight">Keep the practice going.</h1>
        <p className="mt-4 text-base leading-relaxed">
          Use your printable alongside Language Threshold. Parents and adult learners can claim a
          personal code for one eligible paid subscription invoice.
        </p>
      </section>
      <section className="grid gap-3 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">How this offer works</h2>
        <p>{RESOURCE_OFFER_TERMS.discount}</p>
        <p>{RESOURCE_OFFER_TERMS.trial}</p>
        <p>{RESOURCE_OFFER_TERMS.eligiblePlans}</p>
        <p>{RESOURCE_OFFER_TERMS.excludedPlans}</p>
        <p>{RESOURCE_OFFER_TERMS.privacy}</p>
        {!user ? (
          <p className="font-semibold">
            Sign in or create your parent/adult account above, then return here to claim. Viewing
            this page does not start a subscription.
          </p>
        ) : offer?.enabled === false ? (
          <p role="status">
            This offer is being connected. Your free study guide remains yours to use; please check
            back shortly to claim the discount.
          </p>
        ) : claim.loading ? (
          <p role="status">Checking your offer…</p>
        ) : offer?.status === "redeemed" ? (
          <p role="status">
            This account has already used its one-time study-guide offer.{" "}
            <Link to="/account" className="underline">
              Manage your subscription
            </Link>
            .
          </p>
        ) : offer?.status === "needs_review" ? (
          <p role="status">
            An earlier offer request needs review. No replacement code or subscription was created.
            Please contact support@languagethreshold.com.
          </p>
        ) : offer?.code ? (
          <div className="grid gap-2 rounded-xl border p-4">
            <p>
              Your personal code: <strong className="break-all">{offer.code}</strong>
            </p>
            <p>This code is bound to your billing account and cannot be used by someone else.</p>
            {offer.status === "reserved" && (
              <p>
                The offer is reserved for an existing checkout or subscription. A new duplicate
                subscription will not be created.
              </p>
            )}
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user || !adult) return;
              const userId = user.id;
              try {
                const result = await claim.run<ResourceOfferView>({
                  adultConfirmed: true,
                  resource,
                });
                if (result)
                  setNotice({
                    userId,
                    text: result.code
                      ? "Your personal code is ready. Choose a plan below when you are ready; you have not subscribed or been charged."
                      : "Please refresh to check your offer.",
                  });
              } catch (e) {
                setNotice({
                  userId,
                  text:
                    e instanceof Error
                      ? e.message
                      : "Your claim could not be confirmed. Please refresh.",
                });
              }
            }}
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                required
              />
              <span>I am a parent or adult learner claiming my own offer.</span>
            </label>
            <button
              className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              disabled={busy || !adult || !!claim.error}
            >
              Claim my one-use offer
            </button>
          </form>
        )}
        {claim.error && <p role="alert">{claim.error}</p>}
        {currentNotice && <p role="status">{currentNotice}</p>}
      </section>
      {user && offer?.code && offer.status !== "needs_review" && offer.status !== "redeemed" && (
        <section className="grid gap-4">
          <h2 className="text-2xl font-semibold">Choose an eligible plan</h2>
          <p>
            The normal renewal price remains visible below. Your first eligible regular paid invoice
            after the seven-day trial receives the one-time 10% discount. Tax, if applicable, is
            shown in checkout.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.id} className="grid gap-3 rounded-2xl border bg-card p-5">
                <h3 className="text-lg font-semibold">{plan.label}</h3>
                <p>
                  <strong className="text-2xl">{plan.first}</strong> for the first eligible paid
                  invoice.
                </p>
                <p>
                  Then {plan.normal} per {plan.period}; renews until canceled.
                </p>
                <button
                  className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                  disabled={busy}
                  onClick={async () => {
                    const userId = user.id;
                    try {
                      const result = await checkout.run<{ url: string }>({ plan: plan.id });
                      if (!result) return;
                      if (!/^https:\/\/checkout\.stripe\.com\//.test(result.url))
                        throw Error("Checkout could not be verified. Please refresh.");
                      window.location.assign(result.url);
                    } catch (e) {
                      setNotice({
                        userId,
                        text:
                          e instanceof Error
                            ? e.message
                            : "Checkout could not be confirmed. No purchase was made.",
                      });
                    }
                  }}
                >
                  Continue to the seven-day trial
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className="grid gap-3 border-t pt-5">
        <p>
          Already subscribed?{" "}
          <Link to="/account" className="underline">
            Open your account
          </Link>{" "}
          to manage billing. This page does not change an existing subscription.
        </p>
        <p>
          Looking for the standalone kids-only plan?{" "}
          <a href="https://juniorlinguist.com/pricing" className="underline">
            See Junior Linguist pricing
          </a>
          . That separate plan is not included in this offer.
        </p>
        <Link to="/pricing" className="underline">
          Compare Language Threshold plans
        </Link>
      </footer>
    </main>
  );
}
