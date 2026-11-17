import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
} from "@/lib/team-server";
import { ownerMarketingStream } from "@/lib/owner-marketing-server";
export const Route = createFileRoute("/api/owner-marketing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const result = await ownerMarketingStream(
            new URL(request.url).searchParams.get("cursor"),
            request.signal,
          );
          requireCurrentTeamRequest(db);
          return json(result);
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
