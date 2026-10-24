import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { ownerTeamAction } from "@/lib/owner-teams";
import { manageOwnerTeam, readOwnerTeam } from "@/lib/owner-teams-server";
import {
  authenticatedTeamUser,
  json,
  requirePlatformOwner,
  scopedTeamError,
  teamAdminClient,
} from "@/lib/team-server";

// Platform owner only: manage any company's members, invitations and assignments.
export const Route = createFileRoute("/api/owner-teams")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const orgId = z.string().uuid().parse(new URL(request.url).searchParams.get("org"));
          return json(await readOwnerTeam(db, actor.id, orgId));
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, ownerTeamAction, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return json(
            await manageOwnerTeam(db, actor.id, prepared.data, new URL(request.url).origin),
          );
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
