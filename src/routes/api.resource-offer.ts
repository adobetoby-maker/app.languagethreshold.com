import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson } from "@/lib/team-request";
import {
  authenticatedTeamUser,
  teamAdminClient,
  json,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";
import { ownerStripe } from "@/lib/owner-discounts-server";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { adultOfferAccount, RESOURCE_OFFER_TERMS } from "@/lib/resource-offer";
import { resourceOfferRepo } from "@/lib/resource-offer-repo";
import { resourceOfferService, verifyOfferInvoiceWebhook } from "@/lib/resource-offer-server";
import { consumeServerRequestBudget } from "@/lib/speaking-security";
const schema = z
  .object({
    adultConfirmed: z.literal(true),
    resource: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
      .default("study-guide"),
  })
  .strict();
export const Route = createFileRoute("/api/resource-offer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (process.env.RESOURCE_OFFER_ENABLED !== "true")
            return json({ enabled: false, status: "not_claimed", terms: RESOURCE_OFFER_TERMS });
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            user = await authenticatedTeamUser(request, db);
          if (!adultOfferAccount(user))
            throw new TeamOperationError(
              "Sign in with a confirmed parent or adult learner account to claim an offer.",
              403,
            );
          const service = resourceOfferService({
            stripe: ownerStripe(),
            repo: resourceOfferRepo(db),
            active: () => request.signal.throwIfAborted(),
          });
          return json(await service.status(user.id));
        } catch (e) {
          return scopedTeamError(e);
        }
      },
      POST: async ({ request }) => {
        const p = await prepareTeamJson(request, schema, 2048);
        if (p.response) return p.response;
        try {
          if (process.env.RESOURCE_OFFER_ENABLED !== "true")
            throw new TeamOperationError(
              "The study-guide offer is being connected. Please check back shortly.",
              503,
            );
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            user = await authenticatedTeamUser(request, db);
          if (!adultOfferAccount(user))
            throw new TeamOperationError(
              "Sign in with a confirmed parent or adult learner account to claim an offer.",
              403,
            );
          if (
            !(await consumeServerRequestBudget(
              "resource-offer-claim",
              user.id,
              5,
              3600,
              request.signal,
            ))
          )
            throw new TeamOperationError("Please wait before requesting this offer again.", 429);
          const stripe = ownerStripe();
          if (!process.env.STRIPE_WEBHOOK_SECRET)
            throw new TeamOperationError("The discount connection is not ready yet.", 503);
          await verifyOfferInvoiceWebhook(
            stripe,
            "https://app.languagethreshold.com/api/stripe-webhook",
          );
          const journal = teamAdminClient(ownerServiceFetch(AbortSignal.timeout(120000)));
          const service = resourceOfferService({
            stripe,
            repo: resourceOfferRepo(journal),
            active: () => request.signal.throwIfAborted(),
          });
          return json(await service.claim({ id: user.id, email: user.email! }, p.data.resource));
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
