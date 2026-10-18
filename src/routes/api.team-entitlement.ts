import { createFileRoute } from "@tanstack/react-router";
import { authenticatedUser, json, teamAdminClient, scopedTeamError } from "@/lib/team-server";

export const Route = createFileRoute("/api/team-entitlement")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          const { data: memberships, error } = await db
            .from("team_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("status", "active");
          if (error) throw error;
          const orgIds = (memberships ?? []).map((member) => member.organization_id);
          if (orgIds.length === 0) return json({ active: false });
          const { data: plans, error: planError } = await db
            .from("team_entitlements")
            .select("organization_id,status,period_end")
            .in("organization_id", orgIds)
            .in("status", ["active", "manual"]);
          if (planError) throw planError;
          return json({
            active: (plans ?? []).some(
              (plan) =>
                plan.status === "active" ||
                (plan.status === "manual" &&
                  !!plan.period_end &&
                  new Date(plan.period_end).getTime() > Date.now()),
            ),
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
