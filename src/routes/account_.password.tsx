import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { supabase } from "@/integrations/supabase/client";
import { passwordInputError, setOwnAccountPassword } from "@/lib/account-password";

export const Route = createFileRoute("/account_/password")({
  component: () => (
    <AuthProvider>
      <PasswordPage />
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "Create your password — Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

function PasswordPage() {
  const { user, loading, isCurrentUser, resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requested, setRequested] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    const invalid = passwordInputError(password, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }
    const actor = user.id;
    setBusy(true);
    setError(null);
    const nextError = await setOwnAccountPassword(
      supabase,
      actor,
      isCurrentUser,
      password,
      confirmation,
    );
    setPassword("");
    setConfirmation("");
    setBusy(false);
    if (!isCurrentUser(actor)) return;
    setError(nextError);
    setDone(!nextError);
  }
  async function requestLink(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await resetPassword(email.trim());
      if (result.error) setError("We could not send a password link. Please try again later.");
      else setRequested(true);
    } catch {
      setError("We could not send a password link. Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  const input = "w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground";
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <section
        className="mx-auto max-w-md space-y-5 rounded-2xl border border-border bg-card p-6"
        aria-label="Password setup"
      >
        <h1 className="font-display text-2xl">Create your password</h1>
        {loading ? (
          <p role="status">Checking your secure link…</p>
        ) : done ? (
          <>
            <p role="status">
              Your password has been saved. You can now sign in with your email and password.
            </p>
            <Link to="/" className="inline-block rounded-lg bg-gold px-4 py-3 text-midnight">
              Open Language Threshold
            </Link>
          </>
        ) : user ? (
          <form onSubmit={save} className="space-y-4">
            <p className="break-all text-sm text-muted-foreground">For {user.email}</p>
            <label className="block space-y-2">
              <span>New password</span>
              <input
                className={input}
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span>Confirm password</span>
              <input
                className={input}
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Use 12–128 characters. Keep your password private.
            </p>
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg bg-gold px-4 py-3 text-midnight disabled:opacity-50"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        ) : (
          <>
            <p>This link has expired or has not signed you in. Request a new password link.</p>
            {requested ? (
              <p role="status">
                If that email has an account, a new link will arrive shortly. Check spam too.
              </p>
            ) : (
              <form onSubmit={requestLink} className="space-y-4">
                <label className="block space-y-2">
                  <span>Email</span>
                  <input
                    className={input}
                    type="email"
                    autoComplete="email"
                    required
                    disabled={busy}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-11 rounded-lg bg-gold px-4 py-3 text-midnight disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? "Sending…" : "Send new password link"}
                </button>
              </form>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
