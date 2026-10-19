import { INDIVIDUAL_PRICES } from "@/lib/individual-pricing";
import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import {
  authenticatedTeamUser,
  teamAdminClient,
  json,
  scopedTeamError,
  TeamOperationError,
  requireCurrentTeamRequest,
} from "@/lib/team-server";
const schema = z.object({
  priceId: z.string().min(1).max(100),
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
});
export const Route = createFileRoute("/api/create-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, schema, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(undefined, request),
            user = await authenticatedTeamUser(request, db);
          if (prepared.data.userId !== user.id)
            throw new TeamOperationError("Sign in with the account purchasing this plan.", 403);
          const prices = Object.values(INDIVIDUAL_PRICES);
          if (!prices.includes(prepared.data.priceId))
            throw new TeamOperationError("This plan is not available. Refresh the pricing page.");
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) throw new TeamOperationError("Stripe is not configured.", 503);
          requireCurrentTeamRequest(db);
          const stripe = new Stripe(key, {
            apiVersion: "2026-04-22.dahlia",
            maxNetworkRetries: 0,
            timeout: 15000,
          });
          const origin = new URL(request.url).origin;
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            allow_promotion_codes: true,
            integration_identifier: `lt-individual-${randomBytes(4).toString("hex")}`,
            branding_settings: { display_name: "Language Threshold" },
            line_items: [{ price: prepared.data.priceId, quantity: 1 }],
            subscription_data: { trial_period_days: 7, metadata: { userId: user.id } },
            client_reference_id: user.id,
            customer_email: user.email,
            success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/pricing`,
            metadata: { userId: user.id },
          });
          return json({ url: session.url });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
