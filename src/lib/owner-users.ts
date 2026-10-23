import { z } from "zod";
import { DIRECTORY_FILTERS, DIRECTORY_SORTS } from "./owner-directory";

const future = z
  .string()
  .datetime()
  .refine((value) => {
    const t = Date.parse(value);
    return t > Date.now() && t <= Date.now() + 5 * 366 * 86400000;
  }, "Choose an end date within the next five years.");
export const ownerUserAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_tester"),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    until: future,
    reason: z.string().trim().min(3).max(500),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("password_invite"),
    userId: z.string().uuid(),
    delivery: z.enum(["email", "copy"]),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("free_access"),
    userId: z.string().uuid(),
    until: future,
    reason: z.string().trim().min(3).max(500),
  }),
]);
export type OwnerUserAction = z.infer<typeof ownerUserAction>;

const accountId = z.string().uuid();
const accountEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
/** Account controls. Each needs an explicit confirm step in the UI; the server re-checks it. */
export const ownerAccountAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("disable"),
    userId: accountId,
    confirmEmail: z.string().trim().min(3).max(254),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({ action: z.literal("enable"), userId: accountId }),
  z.object({ action: z.literal("resend_confirmation"), userId: accountId, requestId: z.string().uuid() }),
  z.object({ action: z.literal("force_confirm"), userId: accountId }),
  z.object({
    action: z.literal("change_email"),
    userId: accountId,
    email: accountEmail,
    confirmEmail: accountEmail,
    markConfirmed: z.boolean(),
  }),
  z.object({ action: z.literal("change_name"), userId: accountId, name: z.string().trim().min(1).max(120) }),
  z.object({
    action: z.literal("export_csv"),
    search: z.string().trim().max(160).default(""),
    filter: z.enum(DIRECTORY_FILTERS).default("all"),
    sort: z.enum(DIRECTORY_SORTS).default("created"),
  }),
]);
export type OwnerAccountAction = z.infer<typeof ownerAccountAction>;
export const OWNER_ACCOUNT_ACTIONS = new Set<string>(
  ownerAccountAction.options.map((option) => option.shape.action.value),
);
/** Every POST body /api/owner-users accepts. */
export const ownerUsersPost = z.discriminatedUnion("action", [
  ...ownerUserAction.options,
  ...ownerAccountAction.options,
]);
/** Confirmation links never use the request Host as their destination. */
export const CONFIRMATION_DESTINATION = "https://app.languagethreshold.com/";
export type OwnerUser = {
  id: string;
  email: string | null;
  displayName: string;
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  bannedUntil: string | null;
  subscriptionStatus: string;
  activeSeconds30d: number;
  activeDays30d: number;
  lastPracticeAt: string | null;
  freeUntil: string | null;
  freeActive: boolean;
};
export type OwnerDirectory = {
  users: OwnerUser[];
  total: number;
  page: number;
  pageSize: number;
  emailReady: boolean;
};
export type OwnerUsage = {
  module_id: string;
  activity: string;
  active_seconds: number;
  active_days: number;
  last_practice_at: string;
};
export type OwnerUserResult = {
  userId?: string;
  notice: string;
  link?: string;
  csv?: string;
  filename?: string;
};
/** Never accept the request Host as the destination of a password setup link. */
export const PASSWORD_DESTINATION = "https://app.languagethreshold.com/account/password";
export function verifiedPasswordLink(value: string, projectUrl: string) {
  const link = new URL(value),
    project = new URL(projectUrl);
  if (
    link.protocol !== "https:" ||
    link.origin !== project.origin ||
    link.pathname !== "/auth/v1/verify" ||
    link.searchParams.get("redirect_to") !== PASSWORD_DESTINATION
  )
    throw new Error("Unexpected password link");
  return link.toString();
}

/** HTML date inputs must use the operator's local calendar date, not the UTC date. */
export function ownerDateInput(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
