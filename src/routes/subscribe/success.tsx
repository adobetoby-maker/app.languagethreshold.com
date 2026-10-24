import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle, Sparkles, Users } from "lucide-react";
import { useSubscription } from "@/state/subscription-state";
import { trackEvent } from "@/lib/ga-events";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/subscribe/success")({
  component: SuccessPage,
  head: () => ({
    meta: [{ title: "Welcome — Language Threshold" }],
  }),
});

// Junior Linguist annual Stripe Payment Link — 50% off cross-sell
const JUNIOR_50_OFF = "https://buy.stripe.com/eVqeVf0vpcO9guB2Q6bfO0c";

function SuccessPage() {
  const { refresh } = useSubscription();

  useEffect(() => {
    // Count the purchase only after the server confirms this Stripe session was completed by the
    // signed-in learner. The session id is an order reference, not personal data.
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId || !/^cs_(?:test|live)_[A-Za-z0-9]{8,200}$/.test(sessionId)) return;
    const controller = new AbortController();
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(
        `/api/verify-checkout?sessionId=${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) return;
      const result = (await response.json()) as { paid?: unknown };
      if (result.paid === true)
        trackEvent(
          "purchase",
          { transaction_id: sessionId, currency: "USD" },
          `purchase:${sessionId}`,
        );
    })().catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => refresh(), 2000);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-md">
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-emerald-500/10 p-4 border border-emerald-500/30">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gold">
              Trial activated
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">You're in.</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Your 7-day free trial has started. Full access to all professional Spanish lessons —
            construction, medical, sports, and more. Cancel any time before day 7 to pay nothing.
          </p>

          <div className="flex flex-col items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-3.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              Start learning →
            </Link>
            <Link
              to="/family-setup"
              className="inline-flex items-center gap-2 text-xs text-violet-400 hover:opacity-80 underline underline-offset-2"
            >
              <Users className="h-3.5 w-3.5" />
              Set up family / kid profiles →
            </Link>
          </div>
        </div>

        {/* Junior Linguist cross-sell */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧒</span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Special offer — Junior Linguist 50% off
                </p>
                <p className="text-xs text-muted-foreground">Only for new Language Threshold subscribers</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Junior Linguist is built for ages 4-12 — vocabulary games, stories, and speaking
              practice kids actually enjoy. Normally $9.99/month, yours for{" "}
              <strong className="text-violet-400">$4.99/month</strong> as a Language Threshold
              subscriber.
            </p>
            <a
              href={JUNIOR_50_OFF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              Get Junior Linguist — 50% off →
            </a>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Or{" "}
              <a
                href="https://juniorlinguist.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 underline underline-offset-2"
              >
                try it free first
              </a>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          A receipt has been sent to your email. Questions?{" "}
          <a
            href="mailto:support@languagethreshold.com"
            className="text-gold underline underline-offset-2"
          >
            support@languagethreshold.com
          </a>
        </p>
      </div>
    </div>
  );
}
