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

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function pushApi<T>(init?: RequestInit): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to manage practice reminders.");
  const response = await fetch("/api/push", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
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

export async function syncPushContext(context: LearningReminderContext) {
  return pushApi<{ ok: true }>({
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
