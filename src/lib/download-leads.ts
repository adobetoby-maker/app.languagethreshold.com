import { z } from "zod";
export const leadSites = [
  "medicalspanish.app",
  "constructionspanish.app",
  "languagethreshold.com",
] as const;
const path = z
  .string()
  .max(160)
  .regex(/^(?:\/[a-zA-Z0-9_./-]*)?$/);
const tag = z
  .string()
  .max(80)
  .regex(/^[a-zA-Z0-9_./-]*$/);
export const downloadLead = z
  .object({
    event_id: z.string().regex(/^[a-f0-9]{64}$/),
    site: z.enum(leadSites),
    email: z.string().trim().toLowerCase().email().max(255),
    resource_id: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    resource_title: z.string().min(1).max(160),
    signup_page: path,
    landing_page: path,
    referrer_host: z
      .string()
      .max(160)
      .regex(/^[a-zA-Z0-9.-]*$/),
    utm_source: tag,
    utm_medium: tag,
    utm_campaign: tag,
    utm_content: tag,
  })
  .strict();
export type DownloadLead = z.infer<typeof downloadLead>;
export function isSetupLead(email: string) {
  const canonical = email.replace(/\+[^@]*(?=@)/, "");
  return canonical === "adobetoby@gmail.com" || canonical === "toby@languagethreshold.com";
}
export type LeadSource = Omit<DownloadLead, "event_id" | "email"> & {
  requests: number;
  unique_emails: number;
};
export type LeadReport = {
  requests: number;
  uniqueEmails: number;
  newEmails: number;
  todayRequests: number;
  todayEmails: number;
  testsExcluded: number;
  trackingStartedAt: string;
  sources: LeadSource[];
  daily: { day: string; requests: number; unique_emails: number }[];
  recent: {
    created_at: string;
    site: string;
    email: string;
    resource_title: string;
    signup_page: string;
    landing_page: string;
    utm_source: string;
    utm_campaign: string;
    is_test: boolean;
  }[];
};
