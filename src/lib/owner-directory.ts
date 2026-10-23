// Owner user directory: filter, sort, page and CSV. Pure and client-safe (no secrets, no network).
import { z } from "zod";
import { assessmentCsv } from "./assessments/export";
import { dayKeys } from "./owner-analytics";
import type { OwnerUser } from "./owner-users";

export const DIRECTORY_FILTERS = [
  "all",
  "paid",
  "active30",
  "free",
  "disabled",
  "unconfirmed",
] as const;
export const DIRECTORY_SORTS = ["created", "last_sign_in", "activity"] as const;
export type DirectoryFilter = (typeof DIRECTORY_FILTERS)[number];
export type DirectorySort = (typeof DIRECTORY_SORTS)[number];
export const DIRECTORY_PAGE_SIZE = 50;
export const DIRECTORY_FILTER_LABELS: Record<DirectoryFilter, string> = {
  all: "All accounts",
  paid: "Paid subscription",
  active30: "Active in 30 days",
  free: "Free access",
  disabled: "Disabled",
  unconfirmed: "Email unconfirmed",
};
export const DIRECTORY_SORT_LABELS: Record<DirectorySort, string> = {
  created: "Newest accounts",
  last_sign_in: "Last sign-in",
  activity: "Most practice (30 days)",
};

export const directoryQuery = z.object({
  search: z.string().trim().max(160).default(""),
  page: z.coerce.number().int().min(0).max(100000).default(0),
  filter: z.enum(DIRECTORY_FILTERS).default("all"),
  sort: z.enum(DIRECTORY_SORTS).default("created"),
});
export type DirectoryQuery = z.infer<typeof directoryQuery>;

const PAID = new Set(["active", "trialing", "past_due"]);
const time = (value: string | null | undefined) => {
  const t = value ? Date.parse(value) : NaN;
  return Number.isFinite(t) ? t : 0;
};
export const isDisabled = (u: Pick<OwnerUser, "bannedUntil">, now = Date.now()) =>
  time(u.bannedUntil) > now;

export function accountStatus(u: Partial<OwnerUser>, now = Date.now()) {
  if (isDisabled({ bannedUntil: u.bannedUntil ?? null }, now)) return "Disabled";
  if (!u.confirmed) return "Email unconfirmed";
  return "Active";
}

export function matchesFilter(u: Partial<OwnerUser>, filter: DirectoryFilter, now = Date.now()) {
  switch (filter) {
    case "all":
      return true;
    case "paid":
      return PAID.has(u.subscriptionStatus ?? "none");
    case "active30":
      return (u.activeDays30d ?? 0) > 0;
    case "free":
      return !!u.freeActive;
    case "disabled":
      return isDisabled({ bannedUntil: u.bannedUntil ?? null }, now);
    case "unconfirmed":
      return !u.confirmed;
  }
}

export function sortUsers<T extends Partial<OwnerUser>>(users: T[], sort: DirectorySort): T[] {
  const key = (u: T) =>
    sort === "activity"
      ? (u.activeSeconds30d ?? 0)
      : sort === "last_sign_in"
        ? time(u.lastSignInAt)
        : time(u.createdAt);
  return [...users].sort(
    (a, b) =>
      key(b) - key(a) ||
      time(b.createdAt) - time(a.createdAt) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

export function filterDirectory<T extends Partial<OwnerUser>>(
  users: T[],
  query: Pick<DirectoryQuery, "filter" | "sort">,
  now = Date.now(),
): T[] {
  return sortUsers(
    users.filter((u) => matchesFilter(u, query.filter, now)),
    query.sort,
  );
}

export function directoryPage<T extends Partial<OwnerUser>>(
  users: T[],
  query: DirectoryQuery,
  now = Date.now(),
) {
  const matched = filterDirectory(users, query, now);
  const start = query.page * DIRECTORY_PAGE_SIZE;
  return {
    users: matched.slice(start, start + DIRECTORY_PAGE_SIZE),
    total: matched.length,
    page: query.page,
    pageSize: DIRECTORY_PAGE_SIZE,
  };
}

/** Spreadsheet-safe CSV (formula prefixes neutralized) of the columns the owner asked for. */
export function ownerUsersCsv(users: Partial<OwnerUser>[], now = Date.now()) {
  return assessmentCsv([
    ["Email", "Name", "Created", "Last sign-in", "Status"],
    ...users.map((u) => [
      u.email ?? "",
      u.displayName ?? "",
      u.createdAt ?? "",
      u.lastSignInAt ?? "",
      accountStatus(u, now),
    ]),
  ]);
}

/** Sign-ups per UTC day in the range; older accounts are ignored. */
export function signupsByDay(users: Partial<OwnerUser>[], range: number, today = new Date()) {
  const keys = dayKeys(range, today);
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const u of users) {
    const t = time(u.createdAt);
    const day = t ? new Date(t).toISOString().slice(0, 10) : "";
    if (counts.has(day)) counts.set(day, counts.get(day)! + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date)! }));
}
