import { createFileRoute } from "@tanstack/react-router";
import { productFeedbackMessage } from "@/lib/product-feedback";
import { feedbackInput } from "@/lib/reddit-offer";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson } from "@/lib/team-request";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
  TeamOperationError,
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
          const message = productFeedbackMessage(p.data);
          if (message.length > 4000)
            throw new TeamOperationError("Please shorten your feedback or improvement suggestion.");
          const r = await db.rpc("save_product_feedback", {
            p_id: p.data.id,
            p_user: user.id,
            p_category: p.data.category,
            p_message: message,
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
