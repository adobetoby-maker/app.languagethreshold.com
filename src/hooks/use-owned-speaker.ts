import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/state/auth-state";
import { speakRemote } from "@/lib/tts";
import type {
  ListeningIssueReason,
  ListeningPlaybackSource,
  RecordingGender,
} from "@/lib/listening-audio";

/** Optional per-playback routing and callbacks; every callback is dropped once ownership is lost. */
export interface OwnedSpeakEvents {
  /** Told when this playback fails; with `cloudOnly`, also why HD audio could not play. */
  onerror?: (reason?: ListeningIssueReason) => void;
  /** HD only: never substitute a device voice. */
  cloudOnly?: boolean;
  /** Allow the public recording for this accent and voice gender without a cloud voice. */
  recordedGender?: RecordingGender;
  /** Why no cloud voice is selected yet, reported when HD-only finds no recording either. */
  unavailableReason?: ListeningIssueReason;
  /** Told what produced the sound once it is audible. */
  onstart?: (source?: ListeningPlaybackSource) => void;
}

/** Component-owned playback. Cleanup cannot cancel another surface's newer generation. */
export function useOwnedSpeaker(scope?: string) {
  return useOwnedPlayback(scope).speak;
}

/** Explicit Stop has the same actor/scope boundaries as starting playback. */
export function useOwnedPlayback(
  scope?: string,
  override?: { user: { id: string } | null; isCurrentUser(id: string): boolean },
) {
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
      events?: OwnedSpeakEvents,
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
      void speakRemote(text, locale, {
        voiceURI,
        rate,
        signal: controller.signal,
        onerror: events?.onerror,
        cloudOnly: events?.cloudOnly,
        recordedGender: events?.recordedGender,
        unavailableReason: events?.unavailableReason,
        onPlaybackStart: events?.onstart,
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
          if (mounted.current && pending.current === controller) events?.onerror?.();
        })
        .finally(() => {
          if (pending.current === controller) pending.current = null;
        });
    },
    [actor, isCurrentUser, scope],
  );
  return { speak, stop };
}
