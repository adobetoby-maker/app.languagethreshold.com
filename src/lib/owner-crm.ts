import { z } from "zod";
import { referralLink } from "./customer-communications";

const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\r\n]*$/);
export const crmContact = z
  .object({
    id: z.string().uuid(),
    name: line(120).min(1),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    expertise: z.string().trim().max(1000),
    notes: z.string().trim().max(4000),
    status: z.enum(["new", "follow_up", "waiting", "done"]),
    follow_up_on: z.union([z.literal(""), z.iso.date()]),
    user_id: z.string().uuid().nullable(),
  })
  .strict();
export const crmAsset = z
  .object({
    id: z.string().uuid(),
    title: line(160).min(1),
    category: line(80),
    url: z
      .string()
      .url()
      .max(1000)
      .refine((value) => {
        const u = new URL(value);
        return (
          u.protocol === "https:" &&
          u.hostname === "drive.google.com" &&
          /^\/file\/d\/[\w-]+\/view$/.test(u.pathname) &&
          !u.username &&
          !u.password &&
          !u.hash &&
          !u.search
        );
      }, "Use the canonical Google Drive file viewing link, without query parameters."),
  })
  .strict();
export const crmDraft = z
  .object({
    id: z.string().uuid(),
    contact_id: z.string().uuid(),
    subject: line(160).min(1),
    body: z.string().trim().min(1).max(6000),
    asset_ids: z
      .array(z.string().uuid())
      .max(24)
      .refine((a) => new Set(a).size === a.length),
    include_referral: z.boolean(),
    referral_user_id: z.string().uuid().nullable().default(null),
  })
  .strict();
export const crmAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("contact"), contact: crmContact }).strict(),
  z.object({ action: z.literal("assets"), assets: z.array(crmAsset).min(1).max(40) }).strict(),
  z.object({ action: z.literal("draft"), draft: crmDraft }).strict(),
  z.object({ action: z.literal("generate"), brief: z.string().trim().min(10).max(2000) }).strict(),
]);
export const aiEmailDraft = z
  .object({ subject: line(160).min(1), body: z.string().trim().min(1).max(6000) })
  .strict();
export type CrmContact = z.infer<typeof crmContact>;
export type CrmAsset = z.infer<typeof crmAsset>;
export type CrmDraft = z.infer<typeof crmDraft> & { created_at?: string };
export type CrmData = {
  contacts: CrmContact[];
  assets: CrmAsset[];
  drafts: CrmDraft[];
  referrals: { user_id: string; code: string; active: boolean }[];
  aiReady: boolean;
};
export function packetText(body: string, assets: CrmAsset[], referralCode?: string) {
  return [
    body.trim(),
    assets.length
      ? "Ads for review:\n" + assets.map((a, i) => `${i + 1}. ${a.title}\n${a.url}`).join("\n\n")
      : "",
    referralCode ? `Optional referral link:\n${referralLink(referralCode)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function emailDraftFile(to: string, subject: string, body: string) {
  const recipient = z.string().email().max(254).parse(to);
  // ASCII headers prevent header injection; UTF-8 body remains editable in the mail client.
  const encodedSubject = btoa(
    String.fromCharCode(...new TextEncoder().encode(line(160).min(1).parse(subject))),
  );
  return `To: ${recipient}\r\nSubject: =?UTF-8?B?${encodedSubject}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nX-Unsent: 1\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}\r\n`;
}
