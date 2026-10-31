// Built by TAC — 2026-10-23
import { isPrivateAssessmentContext, privacyParam, privacyPathname } from "./assessment-privacy";
import { isSpeakingPrivacyMode, LANGUAGE_THRESHOLD_GA_ID } from "./speaking-privacy";
import { trackHeyCatchOutcome } from "./heycatch";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type GaEventParams = Record<string, string | number | boolean>;

const PARAM_NAME = /^[a-z][a-z0-9_]{0,39}$/;
/**
 * The only events this module sends, with the only parameters each may carry. Any other event
 * name is refused and any other parameter key is dropped, when sending and again when a deferred
 * event is stored or read back. Values are plan ids, module ids, counts, currency and Stripe order
 * references: never emails, user, member or organization ids, names or free text.
 */
export const EVENT_PARAMS: Readonly<Record<string, ReadonlySet<string>>> = {
  purchase: new Set(["transaction_id", "currency", "value"]),
  begin_checkout: new Set(["plan", "term", "seats", "currency", "value"]),
  sign_up: new Set(["method"]),
  login: new Set(["method"]),
  lesson_mastered: new Set(["module_id", "lesson"]),
  team_seat_assigned: new Set(["module_id"]),
  team_invite_sent: new Set(["role", "count"]),
};
const isKnownEvent = (name: unknown): name is string =>
  typeof name === "string" && Object.hasOwn(EVENT_PARAMS, name);
const MAX_STRING = 100;
const ONCE_PREFIX = "lt-ga-once:";
export const PENDING_EVENTS_KEY = "lt.ga.pending.v1";
export const PENDING_MAX_EVENTS = 10;
export const PENDING_MAX_AGE_MS = 30 * 60_000;

// Only these events may be deferred, and only from the routes below. Everything else raised on a
// private page is dropped. Exam and assessment pages never defer anything.
export type DeferralRoute = "team" | "subscribe" | "auth-return";
export const DEFERRABLE_EVENTS: ReadonlySet<string> = new Set([
  "purchase",
  "begin_checkout",
  "team_seat_assigned",
  "team_invite_sent",
  "sign_up",
  "login",
]);
const ROUTE_EVENTS: Record<DeferralRoute, ReadonlySet<string>> = {
  team: new Set(["purchase", "begin_checkout", "team_seat_assigned", "team_invite_sent"]),
  subscribe: new Set(["purchase"]),
  "auth-return": new Set(["sign_up", "login"]),
};
const SITE_ORIGIN = "https://app.languagethreshold.com";
// Query keys that mean the page carries assessment, enrollment or identity data. A team return
// legitimately carries `org`, so it is not listed here.
const NEVER_DEFER_PARAMS = ["attempt", "plan", "fromPlan", "enrollment", "email"];
const CREDENTIAL_PARAMS = ["token", "access_token", "refresh_token"];
const sentThisPage = new Set<string>();

function cleanParams(name: string, params?: GaEventParams): GaEventParams {
  const clean: GaEventParams = {};
  const allowed = EVENT_PARAMS[name];
  if (!params || !allowed) return clean;
  for (const [key, value] of Object.entries(params)) {
    if (!PARAM_NAME.test(key) || !allowed.has(key)) continue;
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
      if (!isKnownEvent(name) || !DEFERRABLE_EVENTS.has(name)) continue;
      if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
      if (now - ts > PENDING_MAX_AGE_MS || ts - now > PENDING_MAX_AGE_MS) continue;
      events.push({
        name,
        // Stored data is untrusted on the way back out: filter it again.
        params: cleanParams(
          name,
          params && typeof params === "object" ? (params as GaEventParams) : {},
        ),
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

function disableFlagKey() {
  return `ga-disable-${LANGUAGE_THRESHOLD_GA_ID}` as const;
}

// The href the disable flag was last known to describe. The root layout rewrites the flag in an
// effect that runs after child effects, so on a client-side navigation the flag still describes the
// previous page when a child raises an event. When the href has moved on, the flag is recomputed
// from the current URL, exactly as the root layout does. On the same page it is trusted as is.
let flagHref: string | null = null;
function refreshFlagIfStale() {
  const href = window.location.href;
  if (flagHref !== null && flagHref !== href)
    window[disableFlagKey()] = isSpeakingPrivacyMode() || isPrivateAssessmentContext();
  flagHref = href;
}

function gaIsActive(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.gtag === "function" &&
    window[disableFlagKey()] !== true &&
    !isSpeakingPrivacyMode() &&
    !isPrivateAssessmentContext()
  );
}

/**
 * The only private routes where an event may wait for a public page: the team workspace return,
 * the individual subscribe success page, and the sign-in return to `/`. Anything with an
 * assessment, enrollment or identity parameter, or an exam/owner/account page, is refused.
 */
export function deferralRoute(href: string): DeferralRoute | null {
  let url: URL;
  try {
    url = new URL(href, SITE_ORIGIN);
  } catch {
    return null;
  }
  const keys = new Set([...url.searchParams.keys()].map((key) => key.toLowerCase()));
  const has = (key: string) => keys.has(key.toLowerCase());
  if (privacyParam(url, "tab")?.toLowerCase() === "exams") return null;
  if (NEVER_DEFER_PARAMS.some(has)) return null;
  const credentialInHash = /(?:access_token|refresh_token|token)=/i.test(url.hash);
  const credentialInQuery = CREDENTIAL_PARAMS.some(has);
  // Routes are matched the way the router matches them: percent-escapes decoded, case folded.
  const folded = privacyPathname(url.pathname);
  if (folded === null) return null;
  const path = folded.replace(/\/+$/, "") || "/";
  if (path === "/team") return credentialInQuery || has("code") || credentialInHash ? null : "team";
  if (path === "/subscribe/success")
    return credentialInQuery || has("code") || has("org") || credentialInHash ? null : "subscribe";
  if (path === "/" && !has("org") && (has("code") || credentialInHash)) return "auth-return";
  return null;
}

function sendNow(name: string, params: GaEventParams, onceKey?: string): boolean {
  if (onceKey && alreadySent(onceKey)) return false;
  try {
    window.gtag?.("event", name, { ...params, transport_type: "beacon" });
  } catch {
    return false;
  }
  if (onceKey) markSent(onceKey);
  trackHeyCatchOutcome(name, params);
  return true;
}

/**
 * Makes gtag available on a public page that was reached by client-side navigation from a private
 * one (GA is only loaded by the server-rendered page, and never on a private page). It mirrors the
 * snippet in `src/routes/__root.tsx`: anonymized IP, page_location without query or hash, and
 * page_referrer reduced to origin and path. Never runs on a private page, in speaking privacy mode
 * or while the tag is disabled. Returns true when gtag is usable afterwards.
 */
export function ensureGaLoaded(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  refreshFlagIfStale();
  if (isSpeakingPrivacyMode() || isPrivateAssessmentContext()) return false;
  if (window[disableFlagKey()] === true) return false;
  if (typeof window.gtag === "function") return true;
  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js only understands `arguments` objects in the dataLayer, not arrays.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    // Only the app's own pages are reported as a referrer. Anything else, including a Stripe
    // checkout page whose path carries an order reference, is blanked.
    let referrer = "";
    try {
      const r = new URL(document.referrer);
      if (r.origin === window.location.origin) referrer = r.origin + r.pathname;
    } catch {
      /* no usable referrer */
    }
    window.gtag("config", LANGUAGE_THRESHOLD_GA_ID, {
      anonymize_ip: true,
      // The loader runs after an in-app navigation, so it must not report a page view of its own.
      send_page_view: false,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: referrer,
    });
    const src = `https://www.googletagmanager.com/gtag/js?id=${LANGUAGE_THRESHOLD_GA_ID}`;
    const present = Array.from(document.scripts).some((script) => script.src === src);
    if (!present) {
      const script = document.createElement("script");
      script.async = true;
      script.src = src;
      document.head.appendChild(script);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends the events that were deferred on private pages. Runs only on a public page where GA is
 * active, loading it first when a client-side navigation left gtag missing. The queue is cleared
 * before sending, and each event with a key is sent at most once per session. Returns how many
 * were sent.
 */
export function flushPendingEvents(): number {
  if (typeof window === "undefined") return 0;
  refreshFlagIfStale();
  if (isSpeakingPrivacyMode() || isPrivateAssessmentContext()) return 0;
  const pending = readPending();
  if (pending.length === 0) return 0;
  if (!ensureGaLoaded() || !gaIsActive()) return 0;
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
 * - Speaking privacy mode or a disabled tag: dropped.
 * - A private page: dropped, unless the event name is on the deferral allowlist AND the page is
 *   one of the three routes in `deferralRoute()` AND no `[data-private-assessment]` content is
 *   mounted. Then the event waits in sessionStorage (max 10, 30 minutes) for
 *   `flushPendingEvents()` on the next public page. Exam and assessment pages never defer.
 * - A public page: pending events are flushed first, loading GA if a client-side navigation left
 *   it missing, then the event is sent.
 *
 * The private or public decision is recomputed from the current URL on every call, so a flag left
 * behind by the previous page cannot block or leak an event.
 *
 * Callers must pass only plan ids, module ids, counts and similar non-personal values: never
 * emails, user, member or organization ids, names, or free text. `onceKey` sends the event at most
 * once per browser session for that key, including events that were deferred.
 */
export function trackEvent(name: string, params?: GaEventParams, onceKey?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isKnownEvent(name)) return false;
  if (isSpeakingPrivacyMode()) return false;
  const clean = cleanParams(name, params);
  refreshFlagIfStale();
  if (isPrivateAssessmentContext()) {
    if (document.querySelector("[data-private-assessment]")) return false;
    const route = deferralRoute(window.location.href);
    if (route && DEFERRABLE_EVENTS.has(name) && ROUTE_EVENTS[route].has(name))
      defer(name, clean, onceKey);
    return false;
  }
  flushPendingEvents();
  if (!ensureGaLoaded() || !gaIsActive()) return false;
  return sendNow(name, clean, onceKey);
}
