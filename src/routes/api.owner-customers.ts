import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { customerAction } from "@/lib/customer-communications";
import { manageCustomer, customerEmailReady } from "@/lib/customer-communications-server";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
  audit,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/owner-customers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const id = z.string().uuid().parse(new URL(request.url).searchParams.get("userId"));
          const [pref, link, refs, messages] = await Promise.all([
            db
              .from("customer_email_preferences")
              .select("unsubscribed_at")
              .eq("user_id", id)
              .maybeSingle(),
            db
              .from("customer_referral_links")
              .select("code,active")
              .eq("user_id", id)
              .maybeSingle(),
            db
              .from("customer_referrals")
              .select("referred_user_id", { count: "exact", head: true })
              .eq("referrer_user_id", id),
            db
              .from("customer_email_messages")
              .select("id,subject,body,status,created_at")
              .eq("user_id", id)
              .order("created_at", { ascending: false })
              .limit(20),
          ]);
          if (pref.error || link.error || refs.error || messages.error)
            throw Error("Customer data unavailable");
          requireCurrentTeamRequest(db);
          return json({
            ready: customerEmailReady(),
            unsubscribed: !!pref.data?.unsubscribed_at,
            referral: link.data,
            referralCount: refs.count ?? 0,
            messages: messages.data ?? [],
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, customerAction, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const result = await manageCustomer(db, actor.id, prepared.data, request.signal);
          requireCurrentTeamRequest(db);
          await audit(
            db,
            actor.id,
            `customer.${prepared.data.action}`,
            undefined,
            "userId" in prepared.data
              ? { userId: prepared.data.userId }
              : { messageId: prepared.data.id },
          );
          return json(result);
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
