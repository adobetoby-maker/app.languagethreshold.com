import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticatedTeamUser, json, scopedTeamError, teamAdminClient } from "@/lib/team-server";
import { applePlan } from "@/lib/apple-billing/access";
import { recordApplePurchase } from "@/lib/apple-billing/server";
import { readPrivateJson } from "@/lib/private-json-request";
import { hasActivePlan } from "@/lib/active-plan";

export const Route = createFileRoute("/api/apple-subscription")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          const env =
            new URL(request.url).searchParams.get("environment") === "Sandbox"
              ? "Sandbox"
              : "Production";
          const [apple, web, promo] = await Promise.all([
            applePlan(db, user.id, env),
            hasActivePlan(db, user.id),
            db
              .from("promo_redemptions")
              .select("expires_at")
              .eq("user_id", user.id)
              .gt("expires_at", new Date().toISOString())
              .limit(1)
              .maybeSingle(),
          ]);
          if (promo.error) throw promo.error;
          return json({
            accountId: user.id,
            appleProduct: apple?.product_id ?? null,
            expiresAt: apple?.expires_at ?? null,
            webActive: web || !!promo.data,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          const { signedTransaction } = z
            .object({ signedTransaction: z.string().min(1).max(32000) })
            .parse(await readPrivateJson(request, 36000));
          await recordApplePurchase(db, signedTransaction, user.id);
          return json({ received: true });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
