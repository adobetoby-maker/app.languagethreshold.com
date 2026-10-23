// Built by TAC — 2026-10-23
import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { z } from "zod";
import {
  authenticatedTeamUser,
  json,
  scopedTeamError,
  TeamOperationError,
  teamAdminClient,
} from "@/lib/team-server";

const sessionIdSchema = z.string().regex(/^cs_(?:test|live)_[A-Za-z0-9]{8,200}$/);

/**
 * Confirms that an individual Stripe Checkout session (created by /api/create-checkout) was
 * completed by the signed-in learner. Used only so analytics counts a purchase after the server
 * has seen it. The answer is a bare boolean: no amounts, ids, emails or customer data.
 */
export const Route = createFileRoute("/api/verify-checkout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          const sessionId = sessionIdSchema.parse(
            new URL(request.url).searchParams.get("sessionId"),
          );
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) throw new TeamOperationError("Stripe is not configured.", 503);
          const stripe = new Stripe(key, {
            apiVersion: "2026-04-22.dahlia",
            maxNetworkRetries: 0,
            timeout: 15000,
          });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          // create-checkout sets client_reference_id to the purchasing account. A session that
          // belongs to someone else, or is still open, is simply "not paid" for this caller.
          const paid =
            session.mode === "subscription" &&
            session.status === "complete" &&
            session.client_reference_id === user.id &&
            (session.payment_status === "paid" || session.payment_status === "no_payment_required");
          return json({ paid });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
