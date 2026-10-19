import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { ownerDiscountAction } from "@/lib/owner-discounts";
import { ownerStripe, discountView, manageOwnerDiscount } from "@/lib/owner-discounts-server";
import {
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  teamAdminClient,
  json,
  scopedTeamError,
  audit,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/owner-discounts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          if (!process.env.STRIPE_SECRET_KEY)
            return json({ ready: false, discounts: [], hasMore: false });
          const after = z
            .string()
            .regex(/^promo_[a-zA-Z0-9]+$/)
            .optional()
            .parse(new URL(request.url).searchParams.get("after") ?? undefined);
          const list = await ownerStripe().promotionCodes.list({
            limit: 100,
            ...(after ? { starting_after: after } : {}),
            expand: ["data.promotion.coupon"],
          });
          requireCurrentTeamRequest(db);
          return json({
            ready: true,
            discounts: list.data
              .filter((p) => p.metadata?.lt_owner_discount === "1")
              .map(discountView),
            hasMore: list.has_more,
            nextCursor: list.data.at(-1)?.id ?? null,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(
          request,
          ownerDiscountAction,
          MAX_TEAM_WORKFLOW_BYTES,
        );
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          requireCurrentTeamRequest(db);
          const result = await manageOwnerDiscount(ownerStripe(), actor.id, prepared.data);
          await audit(db, actor.id, `discount.${prepared.data.action}`, undefined, {
            ...(prepared.data.action === "create"
              ? { requestId: prepared.data.requestId, code: prepared.data.code }
              : { promotionId: prepared.data.promotionId }),
          });
          return json(result);
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
