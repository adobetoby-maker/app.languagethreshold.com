import { z } from "zod";

export const supportId = z.string().regex(/^\d{13}-[a-f0-9-]{36}$/);
export const supportTicket = z.object({
  id: supportId,
  from: z.string().max(320),
  to: z.string().max(320),
  subject: z.string().max(300),
  messageId: z.string().max(998).optional(),
  receivedAt: z.iso.datetime(),
  status: z.enum(["needs_reply", "resolved"]),
  forwarding: z.enum(["pending", "request_completed", "failed"]),
  previewUnavailable: z.boolean(),
  preview: z.string().max(8000).optional(),
});
export type SupportTicket = z.infer<typeof supportTicket>;
export type SupportPage = { tickets: SupportTicket[]; nextCursor: string | null };
export const supportAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("status"),
      id: supportId,
      status: z.enum(["needs_reply", "resolved"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("reply"),
      id: supportId,
      text: z.string().trim().min(1).max(8000),
      requestId: z.uuid(),
    })
    .strict(),
]);
