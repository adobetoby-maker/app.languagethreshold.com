import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import {
  activityCsv,
  activityExport,
  activityQuery,
  ACTIVITY_EXPORT_LIMIT,
  ACTIVITY_PAGE_SIZE,
} from "@/lib/owner-activity";
import { readActivity } from "@/lib/owner-activity-server";
import {
  audit,
  authenticatedTeamUser,
  json,
  requirePlatformOwner,
  scopedTeamError,
  teamAdminClient,
} from "@/lib/team-server";

const EXPORT_CHUNK = 500;

// Platform owner only: the audit log with actor email, company name and a detail summary.
export const Route = createFileRoute("/api/owner-activity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const params = new URL(request.url).searchParams;
          const filters = activityQuery.parse({
            action: params.get("action") ?? undefined,
            org: params.get("org") || undefined,
            from: params.get("from") || undefined,
            to: params.get("to") || undefined,
            page: params.get("page") ?? undefined,
            hideViews: params.get("hideViews") ?? undefined,
          });
          const result = await readActivity(db, filters);
          await audit(db, actor.id, "activity.view", filters.org, {
            page: filters.page,
            action: filters.action,
          });
          return json({ ...result, page: filters.page, pageSize: ACTIVITY_PAGE_SIZE });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, activityExport, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const filters = prepared.data.filters;
          // Chunks stay under the PostgREST row cap and the owner transport's response bound.
          const events: Awaited<ReturnType<typeof readActivity>>["events"] = [];
          let total = 0;
          for (let offset = 0; offset < ACTIVITY_EXPORT_LIMIT; offset += EXPORT_CHUNK) {
            const chunk = await readActivity(db, filters, { offset, limit: EXPORT_CHUNK });
            total = chunk.total;
            events.push(...chunk.events);
            if (chunk.events.length < EXPORT_CHUNK || events.length >= total) break;
          }
          await audit(db, actor.id, "activity.export", filters.org, {
            rows: events.length,
            total,
            action: filters.action,
            from: filters.from ?? null,
            to: filters.to ?? null,
          });
          return json({
            notice: `Exported ${events.length} of ${total} events.`,
            csv: activityCsv(events),
            filename: `language-threshold-activity-${new Date().toISOString().slice(0, 10)}.csv`,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
