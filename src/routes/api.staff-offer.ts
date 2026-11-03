import { createFileRoute } from "@tanstack/react-router";
import { staffClaim } from "@/lib/staff-offer";
import { prepareTeamJson } from "@/lib/team-request";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  authenticatedTeamUser,
  teamAdminClient,
  json,
  scopedTeamError,
  TeamOperationError,
  requireCurrentTeamRequest,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/staff-offer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          const r = await db
            .from("staff_coupon_recipients")
            .select("email,claimed_at,expires_at,budget_reserved_microusd")
            .eq("user_id", user.id)
            .maybeSingle();
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({ offer: r.data });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
      POST: async ({ request }) => {
        const p = await prepareTeamJson(request, staffClaim, 2048);
        if (p.response) return p.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          const r = await db.rpc("claim_staff_coupon", { p_user: user.id });
          if (r.error?.message === "Staff coupon is not available for this confirmed email")
            throw new TeamOperationError(
              "Confirm your email and ask the owner to add it to the cleaning-staff offer.",
              403,
            );
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({
            offer: r.data,
            notice: "Your two free months are recorded. No card or renewal is required.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
