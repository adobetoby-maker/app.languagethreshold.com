import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { processAppleNotification } from "@/lib/apple-billing/server";
import { readPrivateJson } from "@/lib/private-json-request";
import { json, scopedTeamError, teamAdminClient } from "@/lib/team-server";

export const Route = createFileRoute("/api/apple-subscription-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { signedPayload } = z
            .object({ signedPayload: z.string().min(1).max(96000) })
            .parse(await readPrivateJson(request, 100000));
          await processAppleNotification(teamAdminClient(), signedPayload);
          return json({ received: true });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
