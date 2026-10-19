/** Public price identifiers shared by the pricing UI and authenticated checkout allowlist. */
export const INDIVIDUAL_PRICES = {
  monthly: import.meta.env?.VITE_STRIPE_PRICE_MONTHLY || "price_1TbKk2QjohgWhWidZ7BQKWbL",
  annual: import.meta.env?.VITE_STRIPE_PRICE_ANNUAL || "price_1TbKk4QjohgWhWid1m86409i",
  family: import.meta.env?.VITE_STRIPE_PRICE_FAMILY || "price_1TbKk5QjohgWhWidSuAbMeTq",
};

export const INDIVIDUAL_PAYMENT_LINKS = {
  monthly: "https://buy.stripe.com/14A9AVemfg0l1zH8aqbfO08",
  annual: "https://buy.stripe.com/bJe7sN2Dx29v0vD76mbfO09",
  family: "https://buy.stripe.com/bJecN791V29v4LT76mbfO0a",
  junior: "https://buy.stripe.com/bJe8wRgun8xT6U1eyObfO0d",
};
