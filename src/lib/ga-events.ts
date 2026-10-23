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

/**
 * Sends one GA4 event. Returns true only when the event was handed to gtag.
 * It is a silent no-op when gtag is absent, GA is disabled for this tab, speaking privacy
 * mode is on, or the page is a private assessment/team/account page. Callers must pass
 * only plan ids, module ids, counts and similar non-personal values: never emails, user,
 * member or organization ids, names, or free text.
 * `onceKey` sends the event at most once per browser session for that key.
 */
export function trackEvent(name: string, params?: GaEventParams, onceKey?: string): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  if (window[`ga-disable-${LANGUAGE_THRESHOLD_GA_ID}`] === true) return false;
  if (isSpeakingPrivacyMode()) return false;
  if (isPrivateAssessmentContext()) return false;
  if (!EVENT_NAME.test(name)) return false;
  if (onceKey && alreadySent(onceKey)) return false;
  try {
    window.gtag("event", name, { ...cleanParams(params), transport_type: "beacon" });
  } catch {
    return false;
  }
  if (onceKey) markSent(onceKey);
  return true;
}
