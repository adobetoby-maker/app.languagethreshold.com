import { analytics, type HeyCatchCapturedEvent } from "@heycatch/sdk";
import { isPrivateAssessmentContext, isPrivateAssessmentUrl } from "./assessment-privacy";
import { isSpeakingPrivacyMode } from "./speaking-privacy";

/** Keep the existing assessment/voice privacy boundary for the new collector too. */
export function sanitizeHeyCatchEvent(event: HeyCatchCapturedEvent | null) {
  if (!event || typeof window === "undefined") return null;
  if (isPrivateAssessmentContext() || isSpeakingPrivacyMode()) return null;
  const current = new URL(window.location.href);
  if (/^\/documents(?:\/|$)/i.test(current.pathname)) return null;
  if (["documents", "exams"].includes(current.searchParams.get("tab") || "")) return null;
  if (document.querySelector("[data-private-assessment]")) return null;
  const properties = { ...event.properties };
  if (typeof properties.$current_url === "string" && isPrivateAssessmentUrl(properties.$current_url))
    return null;
  // Never forward query strings, auth-return hashes, DOM text, element attributes or user input.
  for (const key of Object.keys(properties)) {
    if (/\$(?:elements|el_text|search|hash|initial_referring_domain)/.test(key)) {
      delete properties[key];
    } else if (/url|referrer/i.test(key) && typeof properties[key] === "string") {
      try {
        const url = new URL(properties[key] as string);
        properties[key] = url.origin + url.pathname;
      } catch {
        delete properties[key];
      }
    }
  }
  return { ...event, properties };
}

// Static root import: this runs before routing and is a no-op during SSR.
analytics.init({
  projectKey: "hck_pk_AdWii_SQRPrQGJYtK5SsfFMdaepUiyaM",
  install: { framework: "react", frameworkVersion: "19", agent: "codex" },
  maskAllText: true,
  maskAllElementAttributes: true,
  respectDnt: true,
  beforeSend: sanitizeHeyCatchEvent,
});

export function identifyHeyCatchUser(userId: string | null) {
  if (!userId) {
    analytics.resetIdentity();
  } else if (!isPrivateAssessmentContext() && !isSpeakingPrivacyMode()) {
    // Internal account id only. No email, name, document content or voice transcript.
    analytics.setIdentity(userId);
  }
}

/** Mirror already-confirmed, allowlisted product outcomes; never count a button as a sale. */
export function trackHeyCatchOutcome(name: string, properties: Record<string, string | number | boolean>) {
  const events: Record<string, string> = {
    sign_up: "signup_completed",
    login: "login_completed",
    begin_checkout: "checkout_started",
    purchase: "purchase_completed",
    lesson_mastered: "lesson_mastered",
  };
  const event = events[name];
  if (event) analytics.trackEvent(event, properties);
}
