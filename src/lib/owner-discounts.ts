import { z } from "zod";
export const ownerDiscountAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    requestId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[a-zA-Z0-9-]+$/)
      .transform((v) => v.toUpperCase()),
    kind: z.enum(["percent", "usd"]),
    value: z.number().int().min(1).max(100000),
    duration: z.enum(["once", "forever"]),
    maxRedemptions: z.number().int().min(1).max(10000),
    expiresAt: z.string().datetime(),
  }),
  z.object({ action: z.literal("disable"), promotionId: z.string().regex(/^promo_[a-zA-Z0-9]+$/) }),
]);

export type OwnerDiscountAction = z.infer<typeof ownerDiscountAction>;
export type OwnerDiscount = {
  id: string;
  code: string;
  active: boolean;
  percentOff: number | null;
  amountOff: number | null;
  duration: string;
  expiresAt: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
};
export function checkDiscount(body: OwnerDiscountAction) {
  if (
    body.action === "create" &&
    ((body.kind === "percent" && body.value > 100) ||
      Date.parse(body.expiresAt) <= Date.now() ||
      Date.parse(body.expiresAt) > Date.now() + 366 * 86400000)
  )
    throw new Error("Use a discount of 1–100 percent and an expiry within one year.");
}
