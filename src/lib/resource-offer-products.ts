/** Fixed catalog independently verified from the two owned live Junior Payment Links. */
export const JUNIOR_OFFER_PRICES = {
  "junior-monthly": {
    id: "price_1TbL3nQjohgWhWidfF6UGvNK",
    product: "prod_UaW5IbHKFFx2iu",
    amount: 999,
    interval: "month",
  },
  "junior-annual": {
    id: "price_1TbWqsQjohgWhWidON8lfVxv",
    product: "prod_UaiHU3ys9H8Dvf",
    amount: 7900,
    interval: "year",
  },
} as const;
export const isJuniorOfferPlan = (plan: string | null | undefined) =>
  plan === "junior-monthly" || plan === "junior-annual";
// Owner-approved prospective policy: all public offer plans retain a seven-day trial.
export const resourceOfferTrialDays = (_plan: string): 0 | 7 => 7;
export const resourceOfferDiscountMode = (_plan: string): "checkout" | "deferred" => "deferred";
