import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { redditClaim } from "@/lib/reddit-offer";
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
export const Route = createFileRoute("/api/reddit-offer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          const r = await db
            .from("promo_redemptions")
            .select("code,expires_at,feedback_email_consent,rewarded_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({ redemption: r.data });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
      POST: async ({ request }) => {
        const p = await prepareTeamJson(
          request,
          z.union([redditClaim, z.object({ feedbackEmailConsent: z.boolean() }).strict()]),
          2048,
        );
        if (p.response) return p.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          if (!user.email_confirmed_at)
            throw new TeamOperationError("Confirm your email before claiming your month.", 403);
          if (!("code" in p.data)) {
            const saved = await db
              .from("promo_redemptions")
              .update({
                feedback_email_consent: p.data.feedbackEmailConsent,
                consent_updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)
              .select("user_id")
              .maybeSingle();
            if (saved.error) throw saved.error;
            if (!saved.data)
              throw new TeamOperationError("Claim the offer before changing this preference.", 400);
            return json({ notice: "Feedback email preference saved." });
          }
          const r = await db.rpc("redeem_reddit_month", {
            p_user: user.id,
            p_email: user.email!,
            p_consent: p.data.feedbackEmailConsent,
          });
          if (r.error?.message === "Reddit offer redemption deadline has passed")
            throw new TeamOperationError(
              "This offer had to be claimed by December 1, 2026, at 11:59 p.m. Mountain Time.",
              400,
            );
          if (r.error) throw r.error;
          requireCurrentTeamRequest(db);
          return json({
            redemption: r.data,
            notice: "Your month is recorded. No card, payment or automatic renewal was created.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
