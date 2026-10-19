import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson } from "@/lib/team-request";
import { teamAdminClient, json, scopedTeamError } from "@/lib/team-server";
export const Route = createFileRoute("/api/customer-unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(
          request,
          z.object({ token: z.string().uuid() }),
          1024,
        );
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const r = await db
            .from("customer_email_preferences")
            .update({ unsubscribed_at: new Date().toISOString() })
            .eq("unsubscribe_token", prepared.data.token);
          if (r.error) throw r.error;
          return json({
            notice:
              "Promotional emails stopped for this link. Account and password emails are unaffected.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
