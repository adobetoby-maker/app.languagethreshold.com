export const RESOURCE_OFFER_CAMPAIGN = "study-guides-10-v1";
export const RESOURCE_OFFER_COUPON = "lt_study_guides_10_once_v1";
export const RESOURCE_OFFER_URL = "https://app.languagethreshold.com/offer";
export const RESOURCE_OFFER_PERCENT = 10;
export const RESOURCE_OFFER_PLANS = ["monthly", "annual", "family-monthly", "family"] as const;
export type ResourceOfferPlan = (typeof RESOURCE_OFFER_PLANS)[number];
export const RESOURCE_OFFER_TERMS = {
  eligiblePlans:
    "Language Threshold Individual monthly/annual and Family monthly/annual subscriptions.",
  excludedPlans:
    "Standalone Junior Linguist, team subscriptions, add-ons and document purchases are not included in this offer.",
  discount: "10% off one eligible regular paid subscription invoice, once per adult account.",
  trial:
    "Your existing seven-day free trial is unchanged. The discount is applied to the first eligible regular paid invoice after the trial, not to the $0 trial invoice. Later renewals are at the normal plan price.",
  privacy: "Claiming an offer does not subscribe you or your children to marketing emails.",
};
export type ResourceOfferView = {
  enabled: boolean;
  status: "not_claimed" | "pending" | "ready" | "reserved" | "redeemed" | "needs_review";
  code?: string;
  notice?: string;
  terms: typeof RESOURCE_OFFER_TERMS;
};
export function adultOfferAccount(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  return !!(
    user.email &&
    user.email_confirmed_at &&
    !user.app_metadata?.is_kid &&
    !user.user_metadata?.is_kid &&
    !user.email.toLowerCase().endsWith("@kids.languagethreshold.app")
  );
}
