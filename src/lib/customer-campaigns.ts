import { z } from "zod";

export const campaignAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("prepare"),
      id: z.string().uuid(),
      subject: z
        .string()
        .trim()
        .min(1)
        .max(160)
        .regex(/^[^\r\n]+$/),
      body: z.string().trim().min(1).max(8000),
      permissionConfirmed: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("send_batch"), id: z.string().uuid() }).strict(),
]);

export type CampaignSummary = {
  id: string;
  subject: string;
  created_at: string;
  recipients: number;
  draft: number;
  accepted: number;
  unconfirmed: number;
  skipped: number;
};
export type CampaignData = {
  ready: boolean;
  eligible: number;
  campaigns: CampaignSummary[];
};
