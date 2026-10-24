// Server-only: protection shared by owner account and team controls. Platform staff (any
// platform_admin_roles row: owner or support) and PLATFORM_OWNER_EMAIL are never changed from
// the owner dashboard.
import { readPlatformRole, TeamOperationError, type TeamDb } from "@/lib/team-server";

export const PROTECTED_ACCOUNT_MESSAGE =
  "Platform owner and support accounts are protected and cannot be changed here.";

export function isPlatformOwnerEmail(email: string | null | undefined) {
  const owner = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  return !!owner && !!email && email.trim().toLowerCase() === owner;
}

/** Refuses when the user holds any platform role or uses PLATFORM_OWNER_EMAIL. */
export async function requireNotPlatformStaff(db: TeamDb, userId: string, email?: string | null) {
  const role = await readPlatformRole(db, userId);
  if (role?.role) throw new TeamOperationError(PROTECTED_ACCOUNT_MESSAGE, 403);
  if (isPlatformOwnerEmail(email)) throw new TeamOperationError(PROTECTED_ACCOUNT_MESSAGE, 403);
}
