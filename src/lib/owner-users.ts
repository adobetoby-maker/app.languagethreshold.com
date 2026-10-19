import { z } from "zod";

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
export type OwnerUserResult = { userId?: string; notice: string; link?: string };
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
