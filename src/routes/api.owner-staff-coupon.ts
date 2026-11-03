import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { staffEmail } from "@/lib/staff-offer";
import { prepareTeamJson } from "@/lib/team-request";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  authenticatedTeamUser,
  teamAdminClient,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/owner-staff-coupon")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            user = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, user);
          const after = z
            .string()
            .email()
            .max(254)
            .optional()
            .parse(new URL(request.url).searchParams.get("after") ?? undefined);
          let query = db
            .from("staff_coupon_recipients")
            .select("email,claimed_at,expires_at,budget_reserved_microusd")
            .order("email")
            .limit(51);
          if (after) query = query.gt("email", after);
          const r = await query;
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({
            recipients: r.data.slice(0, 50),
            hasMore: r.data.length > 50,
            nextCursor: r.data[49]?.email ?? null,
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
      POST: async ({ request }) => {
        const p = await prepareTeamJson(request, z.object({ email: staffEmail }).strict(), 2048);
        if (p.response) return p.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            user = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, user);
          const r = await db.rpc("add_staff_coupon_recipient", {
            p_actor: user.id,
            p_email: p.data.email,
          });
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({
            notice: "Staff email added. Two months begin on first claim. No email was sent.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
