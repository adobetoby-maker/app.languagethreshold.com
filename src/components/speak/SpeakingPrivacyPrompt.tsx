import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import {
  getSpeakingAgeAttestation,
  saveSpeakingAgeAttestation,
  SpeakingConsentSaveError,
} from "@/lib/speaking-client";
import { SpeakingConsentDialog } from "./SpeakingConsentDialog";
import {
  SPEAKING_CONSENT_CHANGED,
  SPEAKING_CONSENT_MANUAL_OPEN,
} from "@/lib/speaking-consent-events";

/** Startup is optional; the same prompt can be opened deliberately from Settings. */
export function SpeakingPrivacyPrompt({
  startup = false,
  ready = true,
  skipStartup = false,
}: {
  startup?: boolean;
  ready?: boolean;
  skipStartup?: boolean;
}) {
  const { user, loading, isCurrentUser } = useAuth();
  const { capture, key } = usePracticeLifecycle("speaking-privacy");
  const attempted = useRef(new Set<string>());
  const autoAllowed = useRef(ready && !skipStartup);
  autoAllowed.current = ready && !skipStartup;
  const pending = useRef<AbortController | null>(null);
  const acceptedRef = useRef(false);
  const unknownRef = useRef(false);
  const [owner, setOwner] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setSaving(false);
    setUnknown(false);
    setError(null);
    setOwner(null);
    acceptedRef.current = false;
    unknownRef.current = false;
  }, [key]);

  const check = useCallback(
    async (onlyIfNeeded: boolean) => {
      if (!user || loading || pending.current || !isCurrentUser(user.id)) return;
      const lease = capture();
      const controller = new AbortController();
      pending.current = controller;
      const release = lease.own(() => {
        controller.abort();
        if (pending.current === controller) pending.current = null;
      });
      const current = () =>
        lease.isCurrent() &&
        !controller.signal.aborted &&
        pending.current === controller &&
        isCurrentUser(user.id);
      setOwner(user.id);
      setSaving(true);
      setError(null);
      if (!onlyIfNeeded) {
        if (!startup) window.dispatchEvent(new Event(SPEAKING_CONSENT_MANUAL_OPEN));
        setOpen(true);
      }
      try {
        const accepted = await getSpeakingAgeAttestation(controller.signal, {
          userId: user.id,
          isCurrent: current,
        });
        if (!current()) return;
        if (onlyIfNeeded && !autoAllowed.current) return;
        acceptedRef.current = accepted;
        const wasUnknown = unknown;
        if (wasUnknown && !accepted) {
          setError(
            "The earlier confirmation may still finish. Check again later, or keep learning.",
          );
          return;
        }
        setUnknown(false);
        unknownRef.current = false;
        if (accepted) {
          if (onlyIfNeeded || wasUnknown) setOpen(false);
          window.dispatchEvent(new Event(SPEAKING_CONSENT_CHANGED));
        } else setOpen(true);
      } catch {
        if (current()) {
          // Unavailable controls never interrupt a lesson at startup.
          if (!onlyIfNeeded)
            setError(
              "We could not check your saved confirmation. Try again later; your lessons are still available.",
            );
        }
      } finally {
        if (current()) {
          setSaving(false);
          pending.current = null;
        }
        release();
      }
    },
    [user, loading, isCurrentUser, capture, unknown, startup],
  );

  useEffect(() => {
    if (!startup || !ready || loading || !user || attempted.current.has(user.id)) return;
    attempted.current.add(user.id);
    if (!skipStartup) void check(true);
  }, [startup, ready, skipStartup, loading, user, check]);

  useEffect(() => {
    if (startup && skipStartup) {
      pending.current?.abort();
      pending.current = null;
      setOpen(false);
      setSaving(false);
    }
  }, [startup, skipStartup]);

  useEffect(() => {
    if (!startup) return;
    const closeForSettings = () => {
      pending.current?.abort();
      pending.current = null;
      setSaving(false);
      setOpen(false);
    };
    window.addEventListener(SPEAKING_CONSENT_MANUAL_OPEN, closeForSettings);
    return () => window.removeEventListener(SPEAKING_CONSENT_MANUAL_OPEN, closeForSettings);
  }, [startup]);

  useEffect(() => {
    if (!startup || open) return;
    // A slow startup read must not interrupt someone who has already begun using the app.
    const learnerMovedOn = () => {
      if (!pending.current) return;
      autoAllowed.current = false;
      pending.current.abort();
      pending.current = null;
      setSaving(false);
    };
    window.addEventListener("pointerdown", learnerMovedOn, { capture: true });
    window.addEventListener("keydown", learnerMovedOn, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", learnerMovedOn, { capture: true });
      window.removeEventListener("keydown", learnerMovedOn, { capture: true });
    };
  }, [startup, open, key]);

  const confirm = async () => {
    if (!user || pending.current || unknownRef.current || !isCurrentUser(user.id)) return;
    if (acceptedRef.current) {
      setOpen(false);
      return;
    }
    const lease = capture();
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() &&
      !controller.signal.aborted &&
      pending.current === controller &&
      isCurrentUser(user.id);
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSpeakingAgeAttestation(true, controller.signal, current, {
        userId: user.id,
        isCurrent: current,
      });
      if (!current()) return;
      if (!saved) throw new SpeakingConsentSaveError("unknown");
      setOpen(false);
      acceptedRef.current = true;
      setUnknown(false);
      unknownRef.current = false;
      window.dispatchEvent(new Event(SPEAKING_CONSENT_CHANGED));
    } catch (cause) {
      if (current()) {
        unknownRef.current =
          cause instanceof SpeakingConsentSaveError && cause.outcome === "unknown";
        setUnknown(unknownRef.current);
        setError(
          "Confirmation could not be saved. You can keep learning and try again in Settings.",
        );
      }
    } finally {
      if (current()) {
        setSaving(false);
        pending.current = null;
      }
      release();
    }
  };

  return (
    <>
      {!startup && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <p className="font-medium">Speaking privacy</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional AI conversation consent. Other lesson activities stay available.
          </p>
          {user ? (
            <button
              type="button"
              onClick={() => void check(false)}
              className="mt-2 min-h-11 rounded-full border border-border px-4 py-2 text-xs"
            >
              Review speaking privacy
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sign in to enable AI conversation.</p>
          )}
        </div>
      )}
      <SpeakingConsentDialog
        open={open && !!user && owner === user.id}
        saving={saving}
        unknown={unknown}
        error={error}
        language="practice"
        audioSource="selected"
        onCheckSavedStatus={() => void check(false)}
        allowSkipWhileSaving
        onOpenChange={(next) => {
          if (!next) {
            pending.current?.abort();
            pending.current = null;
            setSaving(false);
          }
          setOpen(next);
        }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
