import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
export const Route = createFileRoute("/email-preferences")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: z.string().uuid().catch("").parse(s.token),
  }),
  component: EmailPreferences,
  head: () => ({
    meta: [
      { title: "Email preferences — Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});
function EmailPreferences() {
  const { token } = Route.useSearch();
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto grid max-w-xl gap-5 p-6 py-12">
      <h1 className="text-3xl font-semibold">Email preferences</h1>
      <p>
        Stop promotional emails from Language Threshold. Your account, learning access and essential
        password emails are unaffected.
      </p>
      <button
        disabled={!token || busy}
        className="rounded-lg border border-border p-3 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/customer-unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
              cache: "no-store",
            });
            if (!r.ok) throw Error();
            setNotice("Promotional emails stopped.");
          } catch {
            setNotice("Could not save your preference. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Stop promotional emails
      </button>
      {!token && <p role="alert">Use the unsubscribe link in your email.</p>}
      {notice && <p role="status">{notice}</p>}
    </main>
  );
}
