import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/state/auth-state";
import { speakRemote } from "@/lib/tts";

/** Component-owned playback. Cleanup cannot cancel another surface's newer generation. */
export function useOwnedSpeaker(scope?: string) {
  return useOwnedPlayback(scope).speak;
}

/** Explicit Stop has the same actor/scope boundaries as starting playback. */
export function useOwnedPlayback(scope?: string) {
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const mounted = useRef(false);
  const activeScope = useRef(scope);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    activeScope.current = scope;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      pending.current = null;
    };
  }, [scope, actor]);
  const stop = useCallback(() => {
    if (
      !mounted.current ||
      activeScope.current !== scope ||
      (actor !== null && !isCurrentUser(actor))
    )
      return;
    pending.current?.abort();
    pending.current = null;
  }, [actor, isCurrentUser, scope]);
  const speak = useCallback(
    (text: string, locale: string, voiceURI?: string | null, rate = 0.9) => {
      if (
        !mounted.current ||
        activeScope.current !== scope ||
        (actor !== null && !isCurrentUser(actor)) ||
        !text
      )
        return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      void speakRemote(text, locale, { voiceURI, rate, signal: controller.signal })
        .catch(() => {
          /* Playback is optional; no late UI/actor callbacks. */
        })
        .finally(() => {
          if (pending.current === controller) pending.current = null;
        });
    },
    [actor, isCurrentUser, scope],
  );
  return { speak, stop };
}
