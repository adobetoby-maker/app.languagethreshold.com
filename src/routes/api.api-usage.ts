import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  authenticatedTeamUser,
  json,
  requireCurrentTeamRequest,
  scopedTeamError,
  teamAdminClient,
} from "@/lib/team-server";

export const Route = createFileRoute("/api/api-usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          const result = await db.rpc("api_usage_summary", { p_user: actor.id });
          if (result.error) throw result.error;
          requireCurrentTeamRequest(db);
          return json({
            since: new Date(Date.now() - 30 * 86400000).toISOString(),
            coverage:
              "Recorded provider attempts since metering was enabled; older usage is unavailable.",
            rows: result.data ?? [],
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
