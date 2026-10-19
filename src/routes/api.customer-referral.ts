import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson } from "@/lib/team-request";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/customer-referral")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(
          request,
          z.object({ code: z.string().uuid() }),
          1024,
        );
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          const r = await db.rpc("customer_claim_referral", {
            p_user: actor.id,
            p_code: prepared.data.code,
          });
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({
            notice: r.data
              ? "Referral recorded. You can start learning."
              : "Referral not recorded. It may already be recorded, inactive, or this account is not eligible. You can still use Language Threshold.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
