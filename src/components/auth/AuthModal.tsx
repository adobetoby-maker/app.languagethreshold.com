import { useState } from "react";
import { Loader2, Sparkle, Mail, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/state/auth-state";
import { trackEvent } from "@/lib/ga-events";

type Mode = "signin" | "signup" | "forgot" | "check-email";

export function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkEmailMsg, setCheckEmailMsg] = useState("");

  function reset(nextMode: Mode) {
    setErr(null);
    setMode(nextMode);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (mode === "forgot") {
      if (!email.includes("@")) { setErr("Enter a valid email."); return; }
      setBusy(true);
      const { error } = await resetPassword(email);
      setBusy(false);
      if (error) { setErr(error); return; }
      setCheckEmailMsg("Password reset link sent — check your inbox.");
      setMode("check-email");
      return;
    }

    if (!email.includes("@")) { setErr("Enter a valid email."); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }

    setBusy(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      setBusy(false);
      if (error) { setErr(error); return; }
      onOpenChange(false);
    } else {
      const { error, needsConfirmation } = await signUp(email, password);
      setBusy(false);
      if (error) { setErr(error); return; }
      trackEvent("sign_up", { method: "email" });
      if (needsConfirmation) {
        setCheckEmailMsg(
          `We sent a confirmation link to ${email}. Click it to activate your account, then sign in.`,
        );
        setMode("check-email");
      } else {
        onOpenChange(false);
      }
    }
    setEmail("");
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "check-email" && "Check your email"}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.18em]">
            {mode === "signin" && "Sign in to sync your progress across devices"}
            {mode === "signup" && "Your progress will sync across all your devices"}
            {mode === "forgot" && "We'll send a reset link to your email"}
            {mode === "check-email" && "One more step"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Check-email screen ── */}
        {mode === "check-email" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-5 py-6 text-center">
              <Mail className="h-8 w-8 text-gold" strokeWidth={1.4} />
              <p className="text-sm text-muted-foreground leading-relaxed">{checkEmailMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => reset("signin")}
              className="w-full font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── OAuth + form ── */}
        {mode !== "check-email" && (
          <div className="space-y-3">
            {/* Social buttons — hidden on forgot screen */}
            {mode !== "forgot" && (
              <>
                <div>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {/* Email/password form */}
            <form onSubmit={submit} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                autoComplete="email"
                className="font-display"
              />

              {mode !== "forgot" && (
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder={mode === "signin" ? "Password" : "Password (min 6 characters)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="font-display pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {err && (
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">
                  {err}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gold text-midnight hover:bg-gold/90"
              >
                {busy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkle className="mr-1 h-3.5 w-3.5" fill="currentColor" />
                )}
                {mode === "signin" && "Sign in"}
                {mode === "signup" && "Create account"}
                {mode === "forgot" && "Send reset link"}
              </Button>

              {(mode === "signin" || mode === "signup") && (
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  By continuing, you agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                {mode === "signin" && (
                  <>
                    <button
                      type="button"
                      onClick={() => reset("signup")}
                      className="w-full font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                    >
                      No account? Create one →
                    </button>
                    <button
                      type="button"
                      onClick={() => reset("forgot")}
                      className="w-full font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      Forgot password?
                    </button>
                  </>
                )}
                {(mode === "signup" || mode === "forgot") && (
                  <button
                    type="button"
                    onClick={() => reset("signin")}
                    className="w-full font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
