import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";

export const Route = createFileRoute("/team_/accept")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: () => (
    <AuthProvider>
      <AcceptInvite />
    </AuthProvider>
  ),
});

function AcceptInvite() {
  const { user } = useAuth();
  const { token } = Route.useSearch();
  return (
    <OwnedAcceptInvite key={JSON.stringify([user?.id ?? null, token ?? null])} token={token} />
  );
}

function OwnedAcceptInvite({ token }: { token: string | undefined }) {
  const { user, loading, canUseReader } = useAuth();
  const actor = user?.id;
  const { capture } = usePracticeLifecycle(JSON.stringify(["team-invite", token ?? null]));
  const pending = useRef<AbortController | null>(null);
  const completed = useRef(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  async function accept() {
    const lease = capture();
    if (
      !actor ||
      !token ||
      loading ||
      !canUseReader(actor) ||
      !lease.isCurrent() ||
      pending.current ||
      completed.current
    )
      return;
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
      !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      await ownedTeamRequest(
        { userId: actor, isCurrent: current, signal: controller.signal },
        "/api/team",
        { action: "accept", token },
      );
      if (current()) {
        completed.current = true;
        setAccepted(true);
      }
    } catch (cause) {
      if (current())
        setError(cause instanceof Error ? cause.message : "Could not accept invitation.");
    } finally {
      if (lease.isCurrent() && pending.current === controller) setBusy(false);
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <ThemeToggle className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" />
        <p className="text-xs font-bold uppercase tracking-widest text-gold-ink dark:text-gold">
          Language Threshold Teams
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Company invitation</h1>
        {!token ? (
          <p className="mt-4 text-sm text-red-700 dark:text-red-300">
            This invitation link is missing its token.
          </p>
        ) : accepted ? (
          <>
            <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
              Your seat is ready. You can use every published module, starting with your team's
              focus.
            </p>
            <Link
              to="/team"
              className="mt-5 inline-block rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight"
            >
              Open team workspace
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in with the email address named on your invitation. Acceptance reserves your
              company seat and sets your first module focus. Your seat includes the full module
              library.
            </p>
            {loading ? (
              <p className="mt-4">Checking sign-in…</p>
            ) : user ? (
              <>
                <p className="mt-4 text-sm">
                  Signed in as <strong>{user.email}</strong>
                </p>
                <button
                  disabled={busy || !canUseReader(user.id)}
                  onClick={() => void accept()}
                  className="mt-4 rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight disabled:opacity-50"
                >
                  {busy ? "Accepting…" : "Accept invitation"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="mt-4 rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight"
                >
                  Sign in or create account
                </button>
                <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
              </>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
          </>
        )}
        <div className="mt-6">
          <Link to="/" className="text-sm text-muted-foreground underline">
            Return to learning app
          </Link>
        </div>
      </section>
    </main>
  );
}
