import {
  createContext,
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
import { clearAuthReturn, consumeAuthReturn, rememberAuthReturn } from "@/lib/auth-return";
import { clearLessonDraftsForUser } from "@/lib/lesson-drafts";
import {
  clearExamDraftsForUser,
  hasUnsyncedExamDrafts,
  browserExamStorage,
} from "@/lib/assessments/drafts";
import { toast } from "sonner";
import { signOutWithDeviceSafety } from "@/lib/device-sign-out";
import { pendingLibraryChanges } from "@/lib/library-device";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCurrentUser: (userId: string) => boolean;
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
  const returnPath = consumeAuthReturn(window.location.pathname, !!session, window.localStorage);
  if (returnPath) window.location.replace(returnPath);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useRef<string | null>(null);
  const discardApprovedFor = useRef<string | null>(null);
  const signingOutFor = useRef<string | null>(null);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession to avoid missing events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const previousUser = currentUser.current;
      currentUser.current = s?.user.id ?? null;
      if (previousUser && previousUser !== currentUser.current) {
        try {
          clearLessonDraftsForUser(window.localStorage, previousUser);
          const reader = pendingLibraryChanges(window.localStorage, previousUser);
          if (signingOutFor.current !== previousUser && (reader.count || reader.unreadable))
            toast.warning(
              "Your session changed. Reader changes are kept on this device for the previous account. Sign back in to sync them.",
            );
          if (
            hasUnsyncedExamDrafts(window.localStorage, previousUser) &&
            discardApprovedFor.current !== previousUser
          )
            toast.warning(
              "Your session changed. Unsynced exam answers and recordings were cleared; synced answers remain saved.",
            );
        } catch {
          /* Storage may be blocked. */
        }
        clearExamDraftsForUser(browserExamStorage(), previousUser);
        discardApprovedFor.current = null;
      }
      setSession(s);
      restorePageAfterAuth(s);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        currentUser.current = data.session?.user.id ?? null;
        setSession(data.session);
        restorePageAfterAuth(data.session);
      })
      .catch(async (err) => {
        // Stale/invalid refresh token from a previous session — clear it silently.
        if (err?.code === "refresh_token_not_found" || err?.status === 400) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* noop */
          }
        }
        currentUser.current = null;
        setSession(null);
      })
      .finally(() => setLoading(false));

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    rememberAuthReturn(window.location.pathname, window.localStorage);
    const redirectUrl =
      window.location.pathname === "/team/accept"
        ? window.location.href
        : `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error || data.session) clearAuthReturn(window.localStorage);
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session,
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
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
    rememberAuthReturn(window.location.pathname, window.localStorage);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          window.location.pathname === "/team/accept"
            ? window.location.href
            : `${window.location.origin}/`,
      },
    });
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
    // Freeze account-bound writes before inspection/confirmation; late Reader requests cannot
    // add new device-only work between the warning and completed sign-out.
    if (scope !== "others") signingOutFor.current = userId;
    const storage = browserExamStorage();
    try {
      const result = await signOutWithDeviceSafety({
        actor: userId,
        scope,
        storage,
        examPending: !!userId && hasUnsyncedExamDrafts(storage, userId),
        confirmDiscard: (message) => typeof window !== "undefined" && window.confirm(message),
        signOut: () => supabase.auth.signOut({ scope }),
        onExamDiscardApproved: () => {
          discardApprovedFor.current = userId;
        },
        clearExamDrafts: () => {
          if (userId) clearExamDraftsForUser(storage, userId);
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
      discardApprovedFor.current = null;
      signingOutFor.current = null;
    }
  }, []);

  const isCurrentUser = useCallback(
    (userId: string) => currentUser.current === userId && signingOutFor.current !== userId,
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isCurrentUser,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
    }),
    [session, loading, isCurrentUser, signUp, signIn, signInWithGoogle, signOut, resetPassword],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallbackAuth: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  isCurrentUser: () => false,
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
