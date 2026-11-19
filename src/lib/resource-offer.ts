export const RESOURCE_OFFER_CAMPAIGN = "study-guides-10-v1";
export const RESOURCE_OFFER_COUPON = "lt_study_guides_10_once_v1";
export const RESOURCE_OFFER_URL = "https://app.languagethreshold.com/offer";
export const RESOURCE_OFFER_PERCENT = 10;
export const RESOURCE_OFFER_PLANS = [
  "monthly",
  "annual",
  "family-monthly",
  "family",
  "junior-monthly",
  "junior-annual",
] as const;
export type ResourceOfferPlan = (typeof RESOURCE_OFFER_PLANS)[number];
export const RESOURCE_OFFER_TERMS = {
  eligiblePlans:
    "Junior Linguist monthly/annual and Language Threshold Individual monthly/annual and Family monthly/annual subscriptions.",
  excludedPlans:
    "Team subscriptions, add-ons and document purchases are not included in this offer.",
  discount: "10% off one eligible regular paid subscription invoice, once per adult account.",
  trial:
    "Junior Linguist, Language Threshold Individual and Family include a seven-day trial through this secure offer. The discount applies to the first eligible regular paid invoice after the trial, not the $0 trial invoice. Later renewals are at the normal plan price. Existing subscription agreements keep their original terms.",
  privacy: "Claiming an offer does not subscribe you or your children to marketing emails.",
};
export type ResourceOfferView = {
  enabled: boolean;
  juniorEnabled?: boolean;
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
    !["@kids.languagethreshold.app", "@kids.juniorlinguist.app"].some((domain) =>
      user.email!.toLowerCase().endsWith(domain),
    )
  );
}
