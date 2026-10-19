import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";
export const Route = createFileRoute("/refer")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: z.string().uuid().catch("").parse(s.code),
  }),
  component: () => (
    <AuthProvider>
      <ReferralPage />
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "You’re invited — Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});
function ReferralPage() {
  const { code } = Route.useSearch();
  const { user } = useAuth();
  const r = useOwnerResource("/api/customer-referral", false);
  const [notice, setNotice] = useState("");
  return (
    <main className="mx-auto grid max-w-xl gap-5 p-6 py-12">
      <h1 className="text-3xl font-semibold">You’re invited to Language Threshold</h1>
      <p>Learn practical language for your work and everyday life.</p>
      <p>
        Create and confirm your account, then return to this link and record the referral within
        seven days of signing up. Referral tracking does not provide free access or a discount.
      </p>
      <AuthButton />
      {!code ? (
        <p role="alert">This referral link is incomplete.</p>
      ) : (
        user && (
          <button
            className="rounded-lg border border-border p-3 disabled:opacity-50"
            disabled={r.busy}
            onClick={async () => {
              try {
                const result = await r.run<{ notice: string }>({ code });
                if (result) setNotice(result.notice);
              } catch (e) {
                setNotice(e instanceof Error ? e.message : "Referral could not be confirmed.");
              }
            }}
          >
            Record this referral
          </button>
        )
      )}
      {notice && <p role="status">{notice}</p>}
      <a className="underline" href="/">
        Start learning
      </a>
    </main>
  );
}
