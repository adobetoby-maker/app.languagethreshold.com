// Built by TAC — 2026-10-23
import { isPrivateAssessmentContext } from "./assessment-privacy";
import { isSpeakingPrivacyMode, LANGUAGE_THRESHOLD_GA_ID } from "./speaking-privacy";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type GaEventParams = Record<string, string | number | boolean>;

const EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const PARAM_NAME = /^[a-z][a-z0-9_]{0,39}$/;
// Defence in depth: these keys can only carry personal data, so they are never forwarded.
const FORBIDDEN_PARAM =
  /email|user_?id|member|display_?name|full_?name|first_?name|last_?name|phone|token|password|note|comment|text|message|address/;
const MAX_STRING = 100;
const ONCE_PREFIX = "lt-ga-once:";
export const PENDING_EVENTS_KEY = "lt.ga.pending.v1";
export const PENDING_MAX_EVENTS = 10;
export const PENDING_MAX_AGE_MS = 30 * 60_000;
const sentThisPage = new Set<string>();

function cleanParams(params?: GaEventParams): GaEventParams {
  const clean: GaEventParams = {};
  if (!params) return clean;
  for (const [key, value] of Object.entries(params)) {
    if (!PARAM_NAME.test(key) || FORBIDDEN_PARAM.test(key)) continue;
    if (typeof value === "string") {
      if (value.length === 0 || value.length > MAX_STRING || value.includes("@")) continue;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
    } else if (typeof value !== "boolean") continue;
    clean[key] = value;
  }
  return clean;
}

function alreadySent(onceKey: string): boolean {
  if (sentThisPage.has(onceKey)) return true;
  try {
    return window.sessionStorage.getItem(ONCE_PREFIX + onceKey) !== null;
  } catch {
    return false;
  }
}

function markSent(onceKey: string) {
  sentThisPage.add(onceKey);
  try {
    window.sessionStorage.setItem(ONCE_PREFIX + onceKey, "1");
  } catch {
    /* storage unavailable: the in-memory set still dedupes this page load */
  }
}

type PendingEvent = { name: string; params: GaEventParams; ts: number; key?: string };

/** Reads the deferred queue, dropping anything expired, malformed or over the cap. */
function readPending(): PendingEvent[] {
  try {
    const raw = window.sessionStorage.getItem(PENDING_EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const events: PendingEvent[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const { name, params, ts, key } = item as Record<string, unknown>;
      if (typeof name !== "string" || !EVENT_NAME.test(name)) continue;
      if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
      if (now - ts > PENDING_MAX_AGE_MS || ts - now > PENDING_MAX_AGE_MS) continue;
      events.push({
        name,
        // Stored data is untrusted on the way back out: filter it again.
        params: cleanParams(params && typeof params === "object" ? (params as GaEventParams) : {}),
        ts,
        ...(typeof key === "string" && key.length > 0 && key.length <= 200 ? { key } : {}),
      });
    }
    return events.slice(-PENDING_MAX_EVENTS);
  } catch {
    return [];
  }
}

function writePending(events: PendingEvent[]) {
  try {
    if (events.length === 0) window.sessionStorage.removeItem(PENDING_EVENTS_KEY);
    else window.sessionStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(events));
  } catch {
    /* storage unavailable: nothing can be deferred */
  }
}

function gaIsActive(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.gtag === "function" &&
    window[`ga-disable-${LANGUAGE_THRESHOLD_GA_ID}`] !== true &&
    !isSpeakingPrivacyMode() &&
    !isPrivateAssessmentContext()
  );
}

function sendNow(name: string, params: GaEventParams, onceKey?: string): boolean {
  if (onceKey && alreadySent(onceKey)) return false;
  try {
    window.gtag?.("event", name, { ...params, transport_type: "beacon" });
  } catch {
    return false;
  }
  if (onceKey) markSent(onceKey);
  return true;
}

/**
 * Sends the events that were deferred on private pages. Runs only where GA is active
 * (gtag present, not disabled, no speaking privacy, public page). The queue is cleared before
 * sending, and each event with a key is sent at most once per session. Returns how many were sent.
 */
export function flushPendingEvents(): number {
  if (!gaIsActive()) return 0;
  const pending = readPending();
  if (pending.length === 0) return 0;
  writePending([]);
  let sent = 0;
  for (const event of pending) if (sendNow(event.name, event.params, event.key)) sent++;
  return sent;
}

function defer(name: string, params: GaEventParams, onceKey?: string) {
  if (onceKey && alreadySent(onceKey)) return;
  const pending = readPending();
  if (onceKey && pending.some((event) => event.key === onceKey)) return;
  pending.push({ name, params, ts: Date.now(), ...(onceKey ? { key: onceKey } : {}) });
  writePending(pending.slice(-PENDING_MAX_EVENTS));
}

/**
 * Sends one GA4 event. Returns true only when the event was handed to gtag right now.
 *
 * - Speaking privacy mode, a disabled tag, or a missing gtag on a public page: dropped.
 * - A private assessment/team/account/subscribe page (`isPrivateAssessmentContext()`): GA never
 *   loads there, so the event is held in sessionStorage (max 10, 30 minutes) and sent by
 *   `flushPendingEvents()` on the next public page where GA is active.
 *
 * Callers must pass only plan ids, module ids, counts and similar non-personal values: never
 * emails, user, member or organization ids, names, or free text. `onceKey` sends the event at most
 * once per browser session for that key, including events that were deferred.
 */
export function trackEvent(name: string, params?: GaEventParams, onceKey?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!EVENT_NAME.test(name)) return false;
  if (isSpeakingPrivacyMode()) return false;
  const clean = cleanParams(params);
  if (isPrivateAssessmentContext()) {
    defer(name, clean, onceKey);
    return false;
  }
  if (!gaIsActive()) return false;
  flushPendingEvents();
  return sendNow(name, clean, onceKey);
}
