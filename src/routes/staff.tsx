import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";
import { STAFF_CODE, type StaffOffer } from "@/lib/staff-offer";
export const Route = createFileRoute("/staff")({
  component: () => (
    <AuthProvider>
      <StaffCoupon />
    </AuthProvider>
  ),
});
function StaffCoupon() {
  const { user } = useAuth();
  const r = useOwnerResource<{ offer: StaffOffer | null }>("/api/staff-offer");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ userId: string; text: string } | null>(null);
  return (
    <main className="mx-auto grid max-w-xl gap-5 px-5 py-12 text-foreground">
      <Link to="/" className="underline">
        Language Threshold
      </Link>
      <h1 className="text-3xl font-semibold">Two free months for cleaning staff</h1>
      <p>
        Use code <strong>{STAFF_CODE}</strong> after the owner adds your email. Create and confirm
        an account with that same email, then claim below. Your two months start on your first
        claim. No card, payment or automatic renewal.
      </p>
      <p>
        Includes a $10 total estimated paid AI/audio allowance for the two months. The allowance
        does not reset. Saved lessons, recordings and device voices remain available after it is
        used.
      </p>
      <AuthButton />
      {user && (
        <>
          {r.data?.offer?.claimed_at ? (
            <div role="status">
              <p>
                Your access ends {new Date(r.data.offer.expires_at!).toLocaleDateString()}. Claiming
                again does not extend it.
              </p>
              <p>
                Estimated AI/audio allowance remaining: $
                {Math.max(0, 10 - r.data.offer.budget_reserved_microusd / 1_000_000).toFixed(2)}.
              </p>
              <a className="underline" href="/app">
                Open the app
              </a>
            </div>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const userId = user.id;
                try {
                  const out = await r.run<{ notice: string }>({ code });
                  if (out) setMessage({ userId, text: out.notice });
                } catch (e) {
                  setMessage({
                    userId,
                    text:
                      e instanceof Error
                        ? e.message
                        : "Claim not confirmed. Refresh before retrying.",
                  });
                }
              }}
            >
              <label>
                Coupon code
                <input
                  className="mt-2 w-full rounded-lg border bg-background p-3"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={40}
                  required
                />
              </label>
              <button
                className="rounded-xl bg-primary p-4 text-primary-foreground disabled:opacity-50"
                disabled={r.busy || r.loading || !!r.error}
              >
                Claim my two free months
              </button>
            </form>
          )}
          {r.error && <p role="alert">{r.error}</p>}
          {message?.userId === user.id && <p role="status">{message.text}</p>}
        </>
      )}
      <Link to="/feedback" className="underline">
        Share feedback
      </Link>
    </main>
  );
}
