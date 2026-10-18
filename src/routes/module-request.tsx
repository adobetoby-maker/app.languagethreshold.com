import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";

export const Route = createFileRoute("/module-request")({
  component: () => (
    <AuthProvider>
      <ModuleRequestPage />
    </AuthProvider>
  ),
});

type RequestItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner_note: string;
};
type Organization = {
  organization_id: string;
  role: string;
  team_organizations: { name: string };
};

const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground";

function ModuleRequestPage() {
  const { user, loading } = useAuth();
  return <OwnedModuleRequestPage key={JSON.stringify([user?.id ?? null, loading])} />;
}

function OwnedModuleRequestPage() {
  const { user, loading: authLoading, canUseReader } = useAuth();
  const actor = user?.id;
  const { capture } = usePracticeLifecycle(JSON.stringify(["module-request", authLoading]));
  const pending = useRef<AbortController | null>(null);
  const readFlight = useRef<AbortController | null>(null);
  const checkoutStarted = useRef(false);
  const revision = useRef(0);
  const renderedRevision = revision.current;
  const [authOpen, setAuthOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [situations, setSituations] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(window.location.hostname.endsWith(".vercel.app"));
  }, []);

  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const lease = capture();
    if (
      !actor ||
      authLoading ||
      !canUseReader(actor) ||
      !lease.isCurrent() ||
      pending.current ||
      checkoutStarted.current
    )
      return;
    const controller = new AbortController();
    readFlight.current?.abort();
    readFlight.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (readFlight.current === controller) readFlight.current = null;
    });
    const current = () =>
      lease.isCurrent() &&
      canUseReader(actor) &&
      readFlight.current === controller &&
      !controller.signal.aborted;
    const owner = { userId: actor, isCurrent: current, signal: controller.signal };
    setReady(false);
    setError("");
    setRequests([]);
    setOrganizations([]);
    try {
      const [own, teams] = await Promise.all([
        ownedTeamRequest<{ requests: RequestItem[] }>(owner, "/api/module-request"),
        ownedTeamRequest<{ organizations: Organization[] }>(owner, "/api/team"),
      ]);
      if (!current()) return;
      setRequests(own.requests);
      setOrganizations(
        teams.organizations.filter((org) => org.role === "owner" || org.role === "admin"),
      );
      setReady(true);
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : "Could not load requests.");
    } finally {
      if (readFlight.current === controller) readFlight.current = null;
      release();
      controller.abort();
    }
  }, [actor, authLoading, canUseReader, capture]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function edit(write: () => void) {
    if (
      !capture().isCurrent() ||
      authLoading ||
      pending.current ||
      checkoutStarted.current ||
      renderedRevision !== revision.current ||
      (actor && !canUseReader(actor))
    )
      return;
    revision.current += 1;
    write();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lease = capture();
    if (
      typeof window === "undefined" ||
      window.location.hostname.endsWith(".vercel.app") ||
      authLoading ||
      !lease.isCurrent() ||
      pending.current ||
      checkoutStarted.current ||
      renderedRevision !== revision.current
    )
      return;
    if (!actor) {
      setAuthOpen(true);
      return;
    }
    if (!ready || readFlight.current || !canUseReader(actor)) return;
    if (organizationId && !organizations.some((org) => org.organization_id === organizationId)) {
      setError("Choose an available company or your own account.");
      return;
    }
    if (
      title.trim().length < 3 ||
      title.trim().length > 120 ||
      audience.trim().length < 3 ||
      audience.trim().length > 300 ||
      situations.trim().length < 10 ||
      situations.trim().length > 2000 ||
      vocabulary.trim().length > 2000
    ) {
      setError("Complete the required fields within their length limits.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() &&
      canUseReader(actor) &&
      pending.current === controller &&
      !controller.signal.aborted &&
      renderedRevision === revision.current;
    setBusy(true);
    setError("");
    try {
      const result = await ownedTeamRequest<{ url: string }>(
        { userId: actor, isCurrent: current, signal: controller.signal },
        "/api/module-request",
        { title, audience, situations, vocabulary, organizationId: organizationId || null },
      );
      if (current()) {
        const target = new URL(result.url);
        if (target.origin !== "https://checkout.stripe.com" || target.username || target.password)
          throw new Error("Checkout returned an invalid destination.");
        checkoutStarted.current = true;
        window.location.assign(target.href);
      }
    } catch (cause) {
      checkoutStarted.current = false;
      if (current())
        setError(
          (cause instanceof Error ? cause.message : "Could not start checkout.") +
            " A request may already have been created. Check your requests or contact support before retrying.",
        );
    } finally {
      if (lease.isCurrent() && pending.current === controller && !checkoutStarted.current)
        setBusy(false);
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }

  const checkout =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("checkout");
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm text-gold-ink underline underline-offset-2 dark:text-gold"
          >
            ← Back to learning app
          </Link>
          <ThemeToggle className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
        <div className="mt-8 rounded-2xl border border-gold/30 bg-card/70 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-ink dark:text-gold">
            Custom specialty
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Request a custom module</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Pro and Team already include every published module. If your work needs a specialty we
            have not covered, send a $20 request. The fee covers review and a content brief with
            recommended topics. A fully built, reviewed module requires a separate proposal before
            work begins.
          </p>
          {checkout === "success" && (
            <p
              className="mt-4 rounded-lg border border-emerald-500/40 p-3 text-sm text-emerald-700 dark:text-emerald-300"
              role="status"
            >
              Checkout returned. This return link does not confirm payment. Your request will show
              as submitted after payment confirmation.
            </p>
          )}
          {checkout === "cancel" && (
            <p
              className="mt-4 rounded-lg border border-border p-3 text-sm text-muted-foreground"
              role="status"
            >
              You returned from checkout. Payment status has not been confirmed.
            </p>
          )}
          {error && (
            <p
              className="mt-4 rounded-lg border border-red-500/50 p-3 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}
          {isPreview && (
            <p
              className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-gold-ink dark:text-gold"
              role="status"
            >
              This preview is for reviewing the form. Sign-in and checkout for custom requests will
              be available after the live setup is complete.
            </p>
          )}
          {!user && !authLoading && !isPreview && (
            <p className="mt-4 text-sm text-muted-foreground">
              You can review the form now. Sign in before sending your request to checkout.
            </p>
          )}
          {actor && !ready && !authLoading && (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy || !canUseReader(actor)}
              className="mt-4 text-sm underline"
            >
              Reload requests and companies
            </button>
          )}
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <label className="block text-sm">
              Specialty or module name
              <input
                className={input + " mt-1"}
                value={title}
                disabled={busy || authLoading}
                onChange={(event) => edit(() => setTitle(event.target.value))}
                minLength={3}
                maxLength={120}
                required
                placeholder="e.g. Commercial roofing inspections"
              />
            </label>
            <label className="block text-sm">
              Who will use it?
              <input
                className={input + " mt-1"}
                value={audience}
                disabled={busy || authLoading}
                onChange={(event) => edit(() => setAudience(event.target.value))}
                minLength={3}
                maxLength={300}
                required
                placeholder="e.g. Foremen who coordinate Spanish-speaking crews"
              />
            </label>
            <label className="block text-sm">
              Work situations to cover
              <textarea
                className={input + " mt-1 min-h-28"}
                value={situations}
                disabled={busy || authLoading}
                onChange={(event) => edit(() => setSituations(event.target.value))}
                minLength={10}
                maxLength={2000}
                required
                placeholder="Describe the conversations your team needs to practice."
              />
            </label>
            <label className="block text-sm">
              Important words or phrases (optional)
              <textarea
                className={input + " mt-1 min-h-20"}
                value={vocabulary}
                disabled={busy || authLoading}
                onChange={(event) => edit(() => setVocabulary(event.target.value))}
                maxLength={2000}
                placeholder="Include trade terms, product names, and regional wording."
              />
            </label>
            {organizations.length > 0 && (
              <label className="block text-sm">
                Request for
                <select
                  className={input + " mt-1"}
                  value={organizationId}
                  disabled={busy || authLoading}
                  onChange={(event) => edit(() => setOrganizationId(event.target.value))}
                >
                  <option value="">My account</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.team_organizations.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={
                busy || authLoading || isPreview || (!!actor && (!ready || !canUseReader(actor)))
              }
              className="rounded-lg bg-gold px-5 py-3 font-semibold text-midnight disabled:opacity-50"
            >
              {isPreview
                ? "Review preview · no payment"
                : busy
                  ? "Opening checkout…"
                  : authLoading
                    ? "Loading account…"
                    : user
                      ? "Submit request · $20"
                      : "Sign in to continue"}
            </button>
            <p className="text-xs text-muted-foreground">
              Payment is collected by Stripe. Requests are reviewed by Language Threshold.
            </p>
          </form>
          <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        </div>
        {user && requests.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-card/50 p-6">
            <h2 className="text-lg font-semibold">Your requests</h2>
            <div className="mt-3 space-y-3">
              {requests.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <strong>{item.title}</strong>
                    <span className="capitalize text-gold-ink dark:text-gold">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  {item.owner_note && (
                    <p className="mt-2 text-muted-foreground">{item.owner_note}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
