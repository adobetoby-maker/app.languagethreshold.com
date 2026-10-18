import type { LearningReminderContext } from "@/lib/learning-reminders";
import { supabase } from "@/integrations/supabase/client";
import { withPushRequest, readPushResponse } from "@/lib/push-response";

export interface PushSettingsResponse {
  configured: boolean;
  enabled: boolean;
  reminderHour: number;
  timezone: string;
  publicKey: string | null;
}

const enabledKey = (userId: string) => `lt.push.enabled.${userId}`;

export interface PushRequestOwner {
  userId: string;
  isCurrent: () => boolean;
  signal: AbortSignal;
}
function requireCurrent(owner: PushRequestOwner) {
  if (!owner.userId || owner.signal.aborted || !owner.isCurrent())
    throw new DOMException("Reminder request cancelled.", "AbortError");
}

function validPushSettings(value: unknown): value is PushSettingsResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.configured === "boolean" &&
    typeof row.enabled === "boolean" &&
    Number.isInteger(row.reminderHour) &&
    Number(row.reminderHour) >= 0 &&
    Number(row.reminderHour) <= 23 &&
    typeof row.timezone === "string" &&
    row.timezone.length > 0 &&
    row.timezone.length <= 80 &&
    (row.publicKey === null ||
      (typeof row.publicKey === "string" &&
        row.publicKey.length > 0 &&
        row.publicKey.length <= 2048))
  );
}

export class PushRequestError extends Error {
  constructor(readonly outcome: "not_started" | "unknown" | "unavailable") {
    super(
      outcome === "not_started"
        ? "The reminder request did not start. Please try again."
        : outcome === "unknown"
          ? "The reminder change could not be confirmed."
          : "Practice reminders are unavailable.",
    );
  }
}
class PushSignInError extends Error {
  constructor() {
    super("Sign in to manage practice reminders.");
  }
}
export async function pushApi<T>(owner: PushRequestOwner, init?: RequestInit): Promise<T> {
  requireCurrent(owner);
  const writing = init?.method?.toUpperCase() === "POST";
  let dispatched = false;
  try {
    return await withPushRequest(owner.signal, owner.isCurrent, async (signal) => {
      const check = () => {
        requireCurrent(owner);
        signal.throwIfAborted();
      };
      const { data } = await supabase.auth.getSession();
      check();
      if (!data.session?.access_token || data.session.user.id !== owner.userId)
        throw new PushSignInError();
      dispatched = true;
      const pending = fetch("/api/push", {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
        signal,
      });
      void pending.then(
        (response) => {
          if (signal.aborted || !owner.isCurrent()) void response.body?.cancel().catch(() => {});
        },
        () => {},
      );
      const response = await pending;
      try {
        check();
        if (!response.ok) throw new Error("Unconfirmed response");
        const payload = await readPushResponse(response, signal);
        check();
        if (writing) {
          if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload) ||
            !("ok" in payload) ||
            payload.ok !== true
          )
            throw new Error("Unconfirmed response");
        } else if (!validPushSettings(payload)) throw new Error("Unavailable settings");
        return payload as T;
      } catch (error) {
        void response.body?.cancel().catch(() => {});
        throw error;
      }
    });
  } catch (error) {
    requireCurrent(owner);
    if (error instanceof PushSignInError) throw error;
    throw new PushRequestError(writing ? (dispatched ? "unknown" : "not_started") : "unavailable");
  }
}

export function rememberPushEnabled(userId: string, enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(enabledKey(userId), "1");
    else localStorage.removeItem(enabledKey(userId));
  } catch {
    // Storage is only a sync optimization; the server remains authoritative.
  }
}

export function wasPushEnabled(userId: string) {
  try {
    return localStorage.getItem(enabledKey(userId)) === "1";
  } catch {
    return false;
  }
}

export async function syncPushContext(owner: PushRequestOwner, context: LearningReminderContext) {
  return pushApi<{ ok: true }>(owner, {
    method: "POST",
    body: JSON.stringify({ action: "sync-context", context }),
  });
}

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
