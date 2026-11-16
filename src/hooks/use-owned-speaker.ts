import { toast } from "sonner";
import { useHdAudioPolicy } from "@/state/hd-audio-policy";
import { hdCourseVoice } from "@/lib/hd-course-voice";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/state/auth-state";
import { speakRemote } from "@/lib/tts";

/** Component-owned playback. Cleanup cannot cancel another surface's newer generation. */
export function useOwnedSpeaker(scope?: string) {
  return useOwnedPlayback(scope).speak;
}

/** Explicit Stop has the same actor/scope boundaries as starting playback. */
export function useOwnedPlayback(
  scope?: string,
  override?: { user: { id: string } | null; isCurrentUser(id: string): boolean },
) {
  const hdOnly = useHdAudioPolicy();
  scope = hdOnly ? JSON.stringify([scope, "hd-only"]) : scope;
  const auth = useAuth();
  const { user, isCurrentUser } = override ?? auth;
  const actor = user?.id ?? null;
  const mounted = useRef(false);
  const activeScope = useRef(scope);
  const activeActor = useRef(actor);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    activeScope.current = scope;
    activeActor.current = actor;
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
      activeActor.current !== actor ||
      (actor !== null && !isCurrentUser(actor))
    )
      return;
    pending.current?.abort();
    pending.current = null;
  }, [actor, isCurrentUser, scope]);
  const speak = useCallback(
    (
      text: string,
      locale: string,
      voiceURI?: string | null,
      rate = 0.9,
      /** Optional: told when this playback fails (no voice, a speech error, a failed fetch). */
      events?: { onerror?: () => void; cloudOnly?: boolean },
    ) => {
      if (
        !mounted.current ||
        activeScope.current !== scope ||
        activeActor.current !== actor ||
        (actor !== null && !isCurrentUser(actor)) ||
        !text
      )
        return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      const playbackError = () => {
        if (events?.onerror) events.onerror();
        else if (hdOnly)
          toast.error(
            actor
              ? "HD audio is unavailable. Check your connection and try again."
              : "Sign in to play HD audio for this lesson.",
          );
      };
      void speakRemote(text, locale, {
        voiceURI: hdOnly ? hdCourseVoice(locale, voiceURI) : voiceURI,
        rate,
        signal: controller.signal,
        onerror: playbackError,
        cloudOnly: hdOnly || events?.cloudOnly,
        hdOnly,
        owner: {
          userId: actor ?? "",
          isCurrent: () =>
            mounted.current &&
            activeScope.current === scope &&
            activeActor.current === actor &&
            pending.current === controller &&
            (actor === null || isCurrentUser(actor)),
        },
      })
        .catch(() => {
          /* Playback is optional; no late UI/actor callbacks. */
          if (mounted.current && pending.current === controller) playbackError();
        })
        .finally(() => {
          if (pending.current === controller) pending.current = null;
        });
    },
    [actor, isCurrentUser, scope, hdOnly],
  );
  return { speak, stop };
}
