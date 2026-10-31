import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { isSpeakingTestHost, SPEAKING_TEST_ACTOR_PREFIX } from "@/lib/speaking-test-access";

/** This identity owns only temporary speaking work; it is never a Supabase session. */
export function useSpeakingAuth() {
  const auth = useAuth();
  const accountIsCurrentUser = auth.isCurrentUser;
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (!isSpeakingTestHost(window.location?.hostname ?? "")) return;
    const activate = () => {
      const key = "lt.speaking-test.session";
      try {
        let id = sessionStorage.getItem(key);
        if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
          id = crypto.randomUUID();
          sessionStorage.setItem(key, id);
        }
        setGuestId(SPEAKING_TEST_ACTOR_PREFIX + id);
      } catch {
        // A blocked storage API still permits one in-memory test session.
        setGuestId(SPEAKING_TEST_ACTOR_PREFIX + crypto.randomUUID());
      }
    };
    try {
      if (sessionStorage.getItem("lt.speaking-test.adult") === "true") activate();
    } catch {
      /* Wait for explicit confirmation. */
    }
    window.addEventListener("lt-speaking-test-ready", activate);
    return () => window.removeEventListener("lt-speaking-test-ready", activate);
  }, []);
  const actor = auth.user?.id ?? guestId;
  const current = useRef(actor);
  current.current = actor;
  const isCurrentUser = useCallback(
    (id: string) =>
      id.startsWith(SPEAKING_TEST_ACTOR_PREFIX) ? current.current === id : accountIsCurrentUser(id),
    [accountIsCurrentUser],
  );
  const guestUser = useMemo(() => (guestId ? { id: guestId } : null), [guestId]);
  const guestSession = useMemo(() => (guestUser ? { user: guestUser } : null), [guestUser]);
  const user = auth.user ?? guestUser;
  const session = auth.session ?? guestSession;
  return { user, session, isCurrentUser, isTestGuest: !auth.user && !!guestId };
}
