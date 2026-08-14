import type { LearningReminderContext } from "@/lib/learning-reminders";

export interface StoredPushSubscription {
  user_id: string;
  endpoint_hash: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  context?: LearningReminderContext;
  timezone?: string;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function pushServerConfigured() {
  return Boolean(
    supabaseUrl() &&
      serviceRoleKey() &&
      process.env.WEB_PUSH_PUBLIC_KEY &&
      process.env.WEB_PUSH_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT,
  );
}

export function webPushPublicKey() {
  return process.env.WEB_PUSH_PUBLIC_KEY || null;
}

export async function pushSupabase(path: string, init?: RequestInit) {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) throw new Error("Push storage is unavailable.");
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

export async function hashPushEndpoint(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validTimeZone(timeZone: string) {
  if (!timeZone || timeZone.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function localDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
