import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { ownerUserAction } from "@/lib/owner-users";
import { manageOwnerUser, ownerEmailReady } from "@/lib/owner-users-server";
import {
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  teamAdminClient,
  json,
  scopedTeamError,
  audit,
} from "@/lib/team-server";

export const Route = createFileRoute("/api/owner-users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const params = new URL(request.url).searchParams,
            userId = params.get("userId");
          if (userId) {
            z.string().uuid().parse(userId);
            const [usage, memberships, grant, invitation] = await Promise.all([
              db.rpc("platform_user_usage", { p_user: userId }),
              db
                .from("team_members")
                .select(
                  "organization_id,role,status,team_organizations(name,team_entitlements(status,period_end))",
                )
                .eq("user_id", userId)
                .limit(101),
              db
                .from("platform_user_grants")
                .select("reason,updated_at")
                .eq("user_id", userId)
                .maybeSingle(),
              db
                .from("platform_owner_operations")
                .select("status,created_at")
                .eq("target_user_id", userId)
                .eq("action", "password_invite")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);
            if (usage.error || memberships.error || grant.error || invitation.error)
              throw usage.error || memberships.error || grant.error || invitation.error;
            if ((memberships.data?.length ?? 0) > 100) throw Error("Membership overflow");
            requireCurrentTeamRequest(db);
            await audit(db, actor.id, "user.details_view", undefined, { userId });
            return json({
              usage: usage.data ?? [],
              memberships: memberships.data ?? [],
              grant: grant.data,
              invitation: invitation.data,
            });
          }
          const search = z
            .string()
            .trim()
            .max(160)
            .parse(params.get("search") ?? "");
          const page = z.coerce
            .number()
            .int()
            .min(0)
            .max(100000)
            .parse(params.get("page") ?? 0);
          const result = await db.rpc("platform_user_directory", {
            p_search: search,
            p_page: page,
          });
          if (result.error) throw result.error;
          requireCurrentTeamRequest(db);
          await audit(db, actor.id, "user.directory_view", undefined, {
            page,
            searchUsed: !!search,
          });
          return json({ ...result.data, emailReady: ownerEmailReady() });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, ownerUserAction, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return json(await manageOwnerUser(db, actor.id, prepared.data));
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
