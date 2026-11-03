import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";
import { REDDIT_CODE, promoActive, redditClaimOpen } from "@/lib/reddit-offer";
type Redemption = {
  expires_at: string;
  feedback_email_consent: boolean;
  rewarded_at?: string | null;
  budget_reserved_microusd?: number;
};
export const Route = createFileRoute("/reddit")({
  component: () => (
    <AuthProvider>
      <RedditOffer />
    </AuthProvider>
  ),
});
function RedditOffer() {
  const { user } = useAuth();
  const r = useOwnerResource<{ redemption: Redemption | null }>("/api/reddit-offer");
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const redemption = r.data?.redemption;
  useEffect(() => {
    setConsent(redemption?.feedback_email_consent ?? false);
    setNotice("");
  }, [user?.id, redemption?.feedback_email_consent]);
  return (
    <main className="mx-auto grid max-w-xl gap-5 px-5 py-12 text-foreground">
      <Link to="/" className="underline">
        Language Threshold
      </Link>
      <h1 className="text-3xl font-semibold">A free month for Reddit learners</h1>
      <p>
        Use code <strong>{REDDIT_CODE}</strong> to try Language Threshold for one month. No card
        required. Access expires automatically; subscribe only if you choose.
      </p>
      <p>
        Create and confirm your account, then return here to claim your month. One redemption per
        account. Existing subscriptions are unchanged.
      </p>
      <p>
        <strong>Claim by December 1, 2026, at 11:59 p.m. Mountain Time.</strong> Your full month
        starts when you claim.
      </p>
      <p>
        Share thoughtful, specific feedback about what works or needs improvement and receive two
        additional free months after owner review. Critical feedback is welcome. One feedback reward
        per coupon user.
      </p>
      <p>
        Limited to 100 testers. Each account has a $10 estimated paid AI/audio usage allowance for
        this campaign, shared across the trial and any bonus months. It does not reset monthly and
        has no cash value. Saved lessons, recordings and device voices remain available when the
        allowance is used.
      </p>
      <AuthButton />
      {user && (
        <>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            You may email me to ask about my experience with this Reddit offer. Optional; this does
            not sign me up for general marketing. I can change this preference here.
          </label>
          {!redemption ? (
            <button
              disabled={r.busy || r.loading || !!r.error || !redditClaimOpen()}
              className="rounded-xl bg-primary p-4 text-primary-foreground disabled:opacity-50"
              onClick={async () => {
                try {
                  const out = await r.run<{ notice: string }>({
                    code: REDDIT_CODE,
                    feedbackEmailConsent: consent,
                  });
                  if (out) setNotice(out.notice);
                } catch (e) {
                  setNotice(
                    e instanceof Error
                      ? e.message
                      : "Claim could not be confirmed. Refresh before trying again.",
                  );
                }
              }}
            >
              {redditClaimOpen() ? "Claim my free month" : "Offer redemption has closed"}
            </button>
          ) : (
            <>
              <p role="status">
                {promoActive(redemption.expires_at)
                  ? "Your free access ends"
                  : "Your free access ended"}{" "}
                {new Date(redemption.expires_at).toLocaleDateString()}. Claiming again will not
                extend it.
              </p>
              <button
                className="rounded-xl border p-3"
                disabled={r.busy}
                onClick={async () => {
                  try {
                    const out = await r.run<{ notice: string }>({ feedbackEmailConsent: consent });
                    if (out) setNotice(out.notice);
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : "Preference could not be saved.");
                  }
                }}
              >
                Save feedback email preference
              </button>
            </>
          )}
        </>
      )}
      {r.error && <p role="alert">{r.error}</p>}
      {notice && <p role="status">{notice}</p>}
      <a href="/" className="underline">
        Start learning
      </a>
      <Link to="/feedback" className="underline">
        Share feedback
      </Link>
    </main>
  );
}
