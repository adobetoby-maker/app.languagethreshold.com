// Owner activity log (platform_audit_events): query schema, detail summary and CSV. Client-safe.
import { z } from "zod";
import { assessmentCsv } from "./assessments/export";

export const ACTIVITY_PAGE_SIZE = 100;
export const ACTIVITY_EXPORT_LIMIT = 5000;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const activityQuery = z.object({
  action: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9_.]*$/)
    .default(""),
  org: z.string().uuid().optional(),
  from: date.optional(),
  to: date.optional(),
  page: z.coerce.number().int().min(0).max(10000).default(0),
  hideViews: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .transform((v) => v === true || v === "true" || v === "1")
    .default(true),
});
export type ActivityQuery = z.infer<typeof activityQuery>;
export const activityExport = z.object({ action: z.literal("export"), filters: activityQuery });

export type ActivityEvent = {
  id: number;
  created_at: string;
  action: string;
  actor_user_id: string | null;
  actor_email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  detail: Record<string, unknown>;
  summary: string;
};
export type ActivityPage = {
  events: ActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
};

/** One short line from an audit detail object; never more than six keys or ~240 characters. */
export function summarizeAuditDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return "";
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(detail as Record<string, unknown>).slice(0, 6)) {
    if (raw === null || raw === undefined || raw === "") continue;
    let value =
      typeof raw === "string" ? raw : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
    value = value.replace(/\s+/g, " ");
    if (value.length > 60) value = value.slice(0, 57) + "…";
    parts.push(`${key}: ${value}`);
  }
  const line = parts.join(" · ");
  return line.length > 240 ? line.slice(0, 239) + "…" : line;
}

/** PostgREST LIKE pattern for an action prefix; `_` and `%` are matched literally. */
export function actionPrefixPattern(prefix: string) {
  return prefix.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
}

export function activityCsv(events: ActivityEvent[]) {
  return assessmentCsv([
    ["Time (UTC)", "Actor", "Action", "Company", "Detail"],
    ...events.map((e) => [
      e.created_at,
      e.actor_email ?? e.actor_user_id ?? "system",
      e.action,
      e.organization_name ?? e.organization_id ?? "",
      e.summary,
    ]),
  ]);
}
