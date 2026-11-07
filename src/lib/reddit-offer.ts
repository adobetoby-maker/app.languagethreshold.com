import { z } from "zod";
export const REDDIT_CODE = "REDDITMONTH";
// December 1 inclusive in the owner's America/Denver timezone (MST).
export const REDDIT_CLAIM_DEADLINE = "2026-12-02T07:00:00.000Z";
export const redditClaimOpen = (now = Date.now()) => now < Date.parse(REDDIT_CLAIM_DEADLINE);
export const redditClaim = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.literal(REDDIT_CODE)),
    feedbackEmailConsent: z.boolean(),
  })
  .strict();
export const feedbackInput = z
  .object({
    id: z.string().uuid(),
    category: z.enum(["idea", "problem", "experience"]),
    message: z.string().trim().min(10).max(4000),
    rating: z.number().int().min(1).max(5).optional(),
    easeRating: z.number().int().min(1).max(5).optional(),
    usefulnessRating: z.number().int().min(1).max(5).optional(),
    improvement: z.string().trim().max(1000).optional(),
    testimonialConsent: z.boolean().optional(),
  })
  .strict();
export function promoActive(expiresAt: unknown, now = Date.now()): boolean {
  return (
    typeof expiresAt === "string" &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) > now
  );
}
