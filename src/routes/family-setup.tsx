import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Plus, CheckCircle, Loader2, ArrowLeft, User } from "lucide-react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { SubscriptionProvider, useSubscription } from "@/state/subscription-state";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/family-setup")({
  component: () => (
    <AuthProvider>
      <SubscriptionProvider>
        <FamilySetupPage />
      </SubscriptionProvider>
    </AuthProvider>
  ),
  head: () => ({
    meta: [{ title: "Family Setup — Language Threshold" }],
  }),
});

interface KidProfile {
  id: string;
  username: string;
}

function AddKidForm({ onAdded }: { onAdded: (kid: KidProfile) => void }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setLoading(false);
      setErr("Sign in again to add a kid.");
      return;
    }
    const res = await fetch("/api/family-add-kid", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: username.trim(), pin }),
    });
    const json = (await res.json()) as { id?: string; username?: string; error?: string };
    setLoading(false);
    if (!res.ok || json.error) {
      setErr(json.error ?? "Something went wrong.");
      return;
    }
    onAdded({ id: json.id!, username: json.username! });
    setUsername("");
    setPin("");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. SophieLearns"
            maxLength={24}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            4-digit PIN
          </label>
          <input
            type="password"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/40 tracking-widest"
          />
        </div>
      </div>
      {err && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">{err}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Add kid
      </button>
    </form>
  );
}

function FamilySetupPage() {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [showForm, setShowForm] = useState(false);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground text-sm mb-4">Sign in to manage your family.</p>
          <Link to="/" className="text-xs text-gold underline underline-offset-2">← Back to app</Link>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-border p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Family plan required</h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Kid profiles are included with the Family Plan. Upgrade to add up to 5 kids, each with
            their own username and PIN.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-background hover:opacity-90 transition-opacity"
          >
            See Family Plan →
          </Link>
          <div className="mt-4">
            <Link to="/" className="text-xs text-muted-foreground underline underline-offset-2">← Back to app</Link>
          </div>
        </div>
      </div>
    );
  }

  const MAX_KIDS = 5;

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to app
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-full bg-violet-500/10 border border-violet-500/30 p-2">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-400">
              Family Plan
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Family Setup</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Add up to {MAX_KIDS} kids. Each gets their own username and 4-digit PIN — no email needed.
            Kids can sign in at{" "}
            <a
              href="https://juniorlinguist.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 underline underline-offset-2"
            >
              juniorlinguist.com
            </a>{" "}
            or through the Junior Linguist app.
          </p>
        </div>

        {/* Parent account */}
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 font-display text-sm font-bold text-gold">
              {(user.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.email}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Parent account</p>
            </div>
          </div>
        </div>

        {/* Kid profiles */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Kid profiles ({kids.length}/{MAX_KIDS})
            </h2>
            {kids.length < MAX_KIDS && !showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add kid
              </button>
            )}
          </div>

          {kids.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed border-border/60 px-5 py-8 text-center">
              <User className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No kid profiles yet.</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-400 hover:opacity-80"
              >
                + Add your first kid →
              </button>
            </div>
          )}

          {kids.length > 0 && (
            <div className="space-y-2 mb-4">
              {kids.map(kid => (
                <div
                  key={kid.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 font-display text-sm font-bold text-violet-400">
                    {kid.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{kid.username}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">Username · PIN login</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
              ))}
            </div>
          )}

          {showForm && kids.length < MAX_KIDS && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-4 mt-3">
              <h3 className="text-sm font-semibold text-foreground mb-3">New kid profile</h3>
              <AddKidForm
                onAdded={kid => {
                  setKids(prev => [...prev, kid]);
                  setShowForm(false);
                }}
              />
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* How kids log in */}
        <div className="rounded-xl border border-border bg-card/50 px-5 py-4 text-sm text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono mb-2">
            How kids sign in
          </p>
          <ol className="space-y-1.5 list-decimal list-inside text-xs">
            <li>Go to <span className="text-violet-400">juniorlinguist.com</span> (or the JL app)</li>
            <li>Tap <span className="text-foreground font-medium">Kid login</span></li>
            <li>Enter their username and 4-digit PIN</li>
          </ol>
          <p className="mt-3 text-xs">
            Progress syncs across devices. PINs can be reset here by deleting and re-adding the profile.
          </p>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="rounded-xl bg-gold px-6 py-3 text-sm font-bold text-background hover:opacity-90 transition-opacity"
          >
            Done — back to app →
          </button>
        </div>
      </div>
    </div>
  );
}
