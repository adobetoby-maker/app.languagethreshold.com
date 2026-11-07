import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson } from "@/lib/team-request";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { consumeServerRequestBudget } from "@/lib/speaking-security";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";

/** Separate from account creation and feedback: explicit request, then CRM email confirmation. */
export const Route = createFileRoute("/api/crm-signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const p = await prepareTeamJson(
          request,
          z.object({ consent: z.literal(true) }).strict(),
          1024,
        );
        if (p.response) return p.response;
        try {
          const key = process.env.LEADERCRM_FORM_KEY?.trim();
          if (!key)
            throw new TeamOperationError(
              "Follow-up email signup is not available yet. Your feedback can still be saved.",
              503,
            );
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          if (
            !user.email_confirmed_at ||
            !user.email ||
            (user.banned_until && Date.parse(user.banned_until) > Date.now())
          ) {
            throw new TeamOperationError(
              "Confirm your account email before requesting follow-ups.",
              403,
            );
          }
          if (
            !(await consumeServerRequestBudget(
              "leadercrm-signup:user",
              user.id,
              2,
              3600,
              request.signal,
            )) ||
            !(await consumeServerRequestBudget(
              "leadercrm-signup:global",
              "all",
              5,
              60,
              request.signal,
            ))
          ) {
            throw new TeamOperationError(
              "Please wait before requesting another confirmation email. Check your inbox first.",
              429,
            );
          }
          requireCurrentTeamRequest(db);
          const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)]);
          let response: Response;
          try {
            response = await fetch("https://toby.leaderhq.io/api/public/signup", {
              method: "POST",
              redirect: "error",
              cache: "no-store",
              signal,
              headers: { "Content-Type": "application/json", "X-Form-Key": key },
              body: JSON.stringify({
                email: user.email,
                name: String(user.user_metadata?.full_name || user.user_metadata?.name || "")
                  .trim()
                  .slice(0, 120),
                type: "Learner",
                source: "language-threshold-app-explicit-opt-in",
                website: "",
              }),
            });
          } catch {
            throw new TeamOperationError(
              "Subscription not confirmed. Check your inbox before requesting another email.",
              503,
            );
          }
          const accepted = response.ok;
          const limited = response.status === 429;
          void response.body?.cancel().catch(() => {});
          requireCurrentTeamRequest(db);
          if (!accepted)
            throw new TeamOperationError(
              limited
                ? "Please wait before requesting another confirmation email. Check your inbox first."
                : "Follow-up signup could not be confirmed. Your feedback can still be saved.",
              limited ? 429 : 503,
            );
          return json({
            notice:
              "Request received. Check your inbox to confirm your subscription. A request alone does not confirm email delivery or start follow-ups.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
