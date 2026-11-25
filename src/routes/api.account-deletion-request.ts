import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { consumeServerRequestBudget } from "@/lib/speaking-security";
import { prepareTeamJson } from "@/lib/team-request";
import {
  authenticatedTeamUser,
  json,
  scopedTeamError,
  teamAdminClient,
  TeamOperationError,
} from "@/lib/team-server";

const input = z.object({ confirm: z.literal("delete my account") }).strict();

export const Route = createFileRoute("/api/account-deletion-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, input, 1024);
        if (prepared.response) return prepared.response;
        try {
          const user = await authenticatedTeamUser(request, teamAdminClient(undefined, request));
          const email = z.email().parse(user.email);
          if (!process.env.RESEND_API_KEY)
            throw new TeamOperationError("Account requests are temporarily unavailable.", 503);
          if (
            !(await consumeServerRequestBudget(
              "account-deletion",
              user.id,
              5,
              3600,
              request.signal,
            ))
          )
            throw new TeamOperationError("Please wait before sending another request.", 429);
          const response = await ownerServiceFetch(request.signal)(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `account-deletion/${user.id}/${new Date().toISOString().slice(0, 10)}`,
              },
              body: JSON.stringify({
                from: "Language Threshold <support@languagethreshold.com>",
                to: ["support@languagethreshold.com"],
                reply_to: email,
                subject: "Verified account deletion request",
                text: `A signed-in learner confirmed permanent deletion of their account and associated data.\nAccount ID: ${user.id}\nAccount email: ${email}\nReply to the account holder with confirmation when the request is complete.`,
              }),
            },
          );
          if (
            !response.ok ||
            !z.object({ id: z.string().min(1) }).safeParse(await response.json()).success
          )
            throw new TeamOperationError(
              "We could not confirm your request. Please try again.",
              503,
            );
          return json({ accepted: true });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
