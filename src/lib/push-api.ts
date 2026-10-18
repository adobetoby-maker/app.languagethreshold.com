import type { LearningReminderContext } from "@/lib/learning-reminders";
import { supabase } from "@/integrations/supabase/client";

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

export async function pushApi<T>(owner: PushRequestOwner, init?: RequestInit): Promise<T> {
  requireCurrent(owner);
  const { data } = await supabase.auth.getSession();
  requireCurrent(owner);
  if (!data.session?.access_token || data.session.user.id !== owner.userId)
    throw new Error("Sign in to manage practice reminders.");
  const response = await fetch("/api/push", {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers).entries()),
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    cache: "no-store",
    signal: owner.signal,
  });
  requireCurrent(owner);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  requireCurrent(owner);
  if (!response.ok) throw new Error(payload.error ?? "Practice reminders are unavailable.");
  return payload;
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
