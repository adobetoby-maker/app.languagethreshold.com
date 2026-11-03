import { z } from "zod";
export const STAFF_CODE = "CLEANING2MONTHS";
export const staffEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const staffClaim = z
  .object({ code: z.string().trim().toUpperCase().pipe(z.literal(STAFF_CODE)) })
  .strict();
export type StaffOffer = {
  email: string;
  claimed_at: string | null;
  expires_at: string | null;
  budget_reserved_microusd: number;
};
