import { createFileRoute } from "@tanstack/react-router";
import { feedbackInput } from "@/lib/reddit-offer";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson } from "@/lib/team-request";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/product-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const p = await prepareTeamJson(request, feedbackInput, 20_000);
        if (p.response) return p.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          const r = await db.rpc("save_product_feedback", {
            p_id: p.data.id,
            p_user: user.id,
            p_category: p.data.category,
            p_message: p.data.message,
          });
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({ notice: "Thank you — your feedback has been saved." });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
