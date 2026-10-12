import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { z } from "zod";

const BodySchema = z.object({
  priceId: z.string().min(1),
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
});

export const Route = createFileRoute("/api/create-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
        if (!SECRET_KEY) {
          return new Response(
            JSON.stringify({ error: "Stripe not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Invalid input" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const stripe = new Stripe(SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          branding_settings: { display_name: "Language Threshold" },
          payment_method_types: ["card"],
          line_items: [{ price: body.priceId, quantity: 1 }],
          subscription_data: {
            trial_period_days: 7,
            metadata: { userId: body.userId },
          },
          client_reference_id: body.userId,
          customer_email: body.userEmail,
          success_url: `${new URL(request.url).origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${new URL(request.url).origin}/pricing`,
          metadata: { userId: body.userId },
        });

        return new Response(
          JSON.stringify({ url: session.url }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
