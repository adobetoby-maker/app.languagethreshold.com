import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  authenticationRedirectUrl,
  browserAuthReturnStorage,
  clearAuthReturn,
  consumeAuthReturn,
  rememberAuthReturn,
} from "@/lib/auth-return";
import { hasUnsyncedLessonDrafts } from "@/lib/lesson-drafts";
import { hasUnsyncedExamDrafts, browserExamStorage } from "@/lib/assessments/drafts";
import { toast } from "sonner";
import { signOutWithDeviceSafety } from "@/lib/device-sign-out";
import { pendingLibraryChanges } from "@/lib/library-device";
import { createAuthActorAccess } from "@/lib/auth-actor-access";
import { clearSpeechForUser, unsavedSpeechCount } from "@/lib/assessments/speech-device";
import {
  clearPrivateLearningDrafts,
  discardPrivateLearningDrafts,
  privateDraftDiscardActor,
} from "@/lib/private-draft-discard";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCurrentUser: (userId: string) => boolean;
  canUseReader: (userId: string) => boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: (scope?: "global" | "local" | "others") => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthContextValue | null>(null);

function restorePageAfterAuth(session: Session | null) {
  const returnPath = consumeAuthReturn(
    window.location.pathname + window.location.search,
    !!session,
    browserAuthReturnStorage(),
  );
  if (returnPath) window.location.replace(returnPath);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useRef<string | null>(null);
  const identityVersion = useRef(0);
  const [identityEpoch, setIdentityEpoch] = useState(0);
  const signingOutFor = useRef<string | null>(null);

  useEffect(() => {
    let sessionEvents = 0;
    const acceptSession = (s: Session | null, discarded = false) => {
      sessionEvents++;
      const previousUser = currentUser.current;
      const nextUser = s?.user.id ?? null;
      if (previousUser !== nextUser) {
        identityVersion.current++;
        setIdentityEpoch(identityVersion.current);
      }
      currentUser.current = nextUser;
      if (previousUser && previousUser !== nextUser) {
        const storage = browserExamStorage();
        const hadRecording = unsavedSpeechCount(previousUser) > 0;
        // Identity loss always stops a microphone. Durable owner-scoped answers stay
        // recoverable until an explicit, successful sign-out discards them.
        clearSpeechForUser(previousUser);
        if (!discarded && signingOutFor.current !== previousUser) {
          const reader = pendingLibraryChanges(storage, previousUser);
          const retained =
            hasUnsyncedExamDrafts(storage, previousUser) ||
            hasUnsyncedLessonDrafts(storage, previousUser) ||
            reader.count ||
            reader.unreadable;
          if (retained || hadRecording)
            toast.warning(
              "Your session changed. Saved answers, lesson drafts and Reader changes remain under the previous account on this device. Sign back into that account to recover them. " +
                (hadRecording ? "Unsaved recordings were discarded. " : "") +
                "Clear this app’s site data before sharing the browser.",
              { id: `lt-auth-recovery-${previousUser}`, duration: Infinity },
            );
        }
      }
      setSession(s);
      if (nextUser) toast.dismiss(`lt-auth-recovery-${nextUser}`);
      setLoading(false);
      restorePageAfterAuth(s);
    };
    const onDiscard = (event: StorageEvent) => {
      const actor = privateDraftDiscardActor(event.key, event.newValue);
      if (!actor) return;
      clearPrivateLearningDrafts(browserExamStorage(), actor);
      toast.dismiss(`lt-auth-recovery-${actor}`);
      if (currentUser.current === actor) acceptSession(null, true);
    };
    window.addEventListener("storage", onDiscard);
    // CRITICAL: subscribe BEFORE getSession to avoid missing events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => acceptSession(s));

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (sessionEvents === 0) acceptSession(data.session);
      })
      .catch(async (err) => {
        if (sessionEvents !== 0) return;
        // Stale/invalid refresh token from a previous session — clear it silently.
        if (err?.code === "refresh_token_not_found" || err?.status === 400) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* noop */
          }
        }
        if (sessionEvents === 0) acceptSession(null);
      })
      .finally(() => setLoading(false));

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onDiscard);
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    rememberAuthReturn(
      window.location.pathname + window.location.search,
      browserAuthReturnStorage(),
    );
    const redirectUrl = authenticationRedirectUrl(window.location.href);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error || data.session) clearAuthReturn(browserAuthReturnStorage());
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session,
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    clearAuthReturn(browserAuthReturnStorage());
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("wrong"))
      return { error: "Incorrect email or password." };
    if (msg.includes("email not confirmed"))
      return { error: "Please confirm your email first — check your inbox." };
    if (msg.includes("too many"))
      return { error: "Too many attempts. Wait a moment and try again." };
    return { error: error.message };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    rememberAuthReturn(
      window.location.pathname + window.location.search,
      browserAuthReturnStorage(),
    );
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authenticationRedirectUrl(window.location.href),
        },
      });
      if (error) throw error;
    } catch {
      clearAuthReturn(browserAuthReturnStorage());
      toast.error("Google sign-in could not start. Try again or use email sign-in.");
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async (scope: "global" | "local" | "others" = "local") => {
    const userId = currentUser.current;
    if (signingOutFor.current) return false;
    // Freeze Reader writes before inspection/confirmation; late Reader requests cannot
    // add new device-only work between the warning and completed sign-out.
    if (scope !== "others") signingOutFor.current = userId;
    const storage = browserExamStorage();
    try {
      const result = await signOutWithDeviceSafety({
        actor: userId,
        scope,
        storage,
        examPending: !!userId && hasUnsyncedExamDrafts(storage, userId),
        lessonPending: !!userId && hasUnsyncedLessonDrafts(storage, userId),
        confirmDiscard: (message) => typeof window !== "undefined" && window.confirm(message),
        signOut: () => supabase.auth.signOut({ scope }),
        onExamDiscardApproved: () => {},
        clearExamDrafts: () => {
          if (userId && !discardPrivateLearningDrafts(storage, userId))
            throw new Error("Private device cleanup could not be confirmed.");
        },
      });
      if (!result.signedOut && !result.cancelled)
        toast.error("Sign out could not finish. Check your connection before trying again.");
      if (result.signedOut && !result.cleanupComplete)
        toast.warning(
          "You are signed out, but this browser could not fully clear saved device data. Clear this app’s site data before sharing the device.",
        );
      return result.signedOut;
    } finally {
      signingOutFor.current = null;
    }
  }, []);

  const { isCurrentUser, canUseReader } = useMemo(
    () =>
      createAuthActorAccess(
        () => currentUser.current,
        () => signingOutFor.current,
        { version: identityEpoch, current: () => identityVersion.current },
      ),
    [identityEpoch],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isCurrentUser,
      canUseReader,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
    }),
    [
      session,
      loading,
      isCurrentUser,
      canUseReader,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      <Fragment key={identityEpoch}>{children}</Fragment>
    </Ctx.Provider>
  );
}

const fallbackAuth: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  isCurrentUser: () => false,
  canUseReader: () => false,
  signUp: async () => ({ error: "Auth not ready", needsConfirmation: false }),
  signIn: async () => ({ error: "Auth not ready" }),
  signInWithGoogle: async () => {},
  signOut: async () => false,
  resetPassword: async () => ({ error: "Auth not ready" }),
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx);
  // During SSR or if used outside provider, return a safe fallback so that
  // consumers (e.g. LibraryProvider) don't crash the render tree.
  return c ?? fallbackAuth;
}
