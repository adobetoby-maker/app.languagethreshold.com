import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { OWNER_ACCOUNT_ACTIONS, ownerUsersPost, type OwnerAccountAction, type OwnerUserAction } from "@/lib/owner-users";
import { directoryPage, directoryQuery } from "@/lib/owner-directory";
import { loadDirectoryUsers } from "@/lib/owner-directory-server";
import { manageOwnerAccount } from "@/lib/owner-accounts-server";
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
          const query = directoryQuery.parse({
            search: params.get("search") ?? undefined,
            page: params.get("page") ?? undefined,
            filter: params.get("filter") ?? undefined,
            sort: params.get("sort") ?? undefined,
          });
          // The paged RPC filters by search only; filters and sorts apply to the full result.
          const { users, truncated } = await loadDirectoryUsers(db, query.search);
          requireCurrentTeamRequest(db);
          await audit(db, actor.id, "user.directory_view", undefined, {
            page: query.page,
            searchUsed: !!query.search,
            filter: query.filter,
            sort: query.sort,
          });
          return json({ ...directoryPage(users, query), truncated, emailReady: ownerEmailReady() });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, ownerUsersPost, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const body = prepared.data;
          return json(
            OWNER_ACCOUNT_ACTIONS.has(body.action)
              ? await manageOwnerAccount(db, actor.id, body as OwnerAccountAction)
              : await manageOwnerUser(db, actor.id, body as OwnerUserAction),
          );
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
