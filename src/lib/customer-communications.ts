import { z } from "zod";
export const customerAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("draft"),
    userId: z.string().uuid(),
    id: z.string().uuid(),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[^\r\n]+$/),
    body: z.string().trim().min(1).max(8000),
  }),
  z.object({
    action: z.literal("send"),
    id: z.string().uuid(),
    permissionConfirmed: z.literal(true),
  }),
  z.object({ action: z.literal("referral"), userId: z.string().uuid() }),
  z.object({ action: z.literal("disable_referral"), userId: z.string().uuid() }),
]);
export const referralLink = (code: string) =>
  `https://app.languagethreshold.com/refer?code=${z.string().uuid().parse(code)}`;
export function customerEmailText(body: string, address: string, unsubscribe: string) {
  return `${body}\n\nLanguage Threshold\n${address}\nStop promotional emails: ${unsubscribe}`;
}
export type CustomerData = {
  ready: boolean;
  unsubscribed: boolean;
  referral: { code: string; active: boolean } | null;
  referralCount: number;
  messages: { id: string; subject: string; body: string; status: string; created_at: string }[];
};
