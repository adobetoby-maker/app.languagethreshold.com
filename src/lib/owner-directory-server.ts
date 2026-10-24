// Server-only: reads the whole owner directory through the existing paged RPC
// (platform_user_directory, 50 per page) so filters and sorts need no new migration.
import { requireCurrentTeamRequest, TeamOperationError, type TeamDb } from "./team-server";
import type { OwnerUser } from "./owner-users";

/** 100 pages × 50 = the newest 5,000 accounts; beyond that the result says it is truncated. */
export const DIRECTORY_MAX_PAGES = 100;
const CONCURRENCY = 4;

type Page = { users?: OwnerUser[]; total?: number };

async function readPage(db: TeamDb, search: string, page: number): Promise<Page> {
  const result = await db.rpc("platform_user_directory", { p_search: search, p_page: page });
  if (result.error) throw result.error;
  requireCurrentTeamRequest(db);
  return (result.data ?? {}) as Page;
}

export async function loadDirectoryUsers(db: TeamDb, search: string) {
  const first = await readPage(db, search, 0);
  const total = Number(first.total ?? 0);
  if (!Number.isFinite(total) || total < 0)
    throw new TeamOperationError("The account directory could not be read.", 503);
  const pages = Math.min(Math.ceil(total / 50), DIRECTORY_MAX_PAGES);
  const byId = new Map<string, OwnerUser>();
  for (const user of first.users ?? []) byId.set(user.id, user);
  for (let start = 1; start < pages; start += CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pages - start) }, (_, i) =>
        readPage(db, search, start + i),
      ),
    );
    for (const page of batch) for (const user of page.users ?? []) byId.set(user.id, user);
  }
  return { users: [...byId.values()], total, truncated: total > DIRECTORY_MAX_PAGES * 50 };
}
