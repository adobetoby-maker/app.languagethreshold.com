/** Public price identifiers shared by the pricing UI and authenticated checkout allowlist. */
export const INDIVIDUAL_PRICES = {
  monthly: import.meta.env?.VITE_STRIPE_PRICE_MONTHLY || "price_1TbKk2QjohgWhWidZ7BQKWbL",
  annual: import.meta.env?.VITE_STRIPE_PRICE_ANNUAL || "price_1TbKk4QjohgWhWid1m86409i",
  family: import.meta.env?.VITE_STRIPE_PRICE_FAMILY || "price_1TbKk5QjohgWhWidSuAbMeTq",
};
