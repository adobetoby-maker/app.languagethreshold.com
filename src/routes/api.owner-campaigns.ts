import { createFileRoute } from "@tanstack/react-router";
import { campaignAction } from "@/lib/customer-campaigns";
import { customerEmailReady, manageCustomer } from "@/lib/customer-communications-server";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import {
  audit,
  authenticatedTeamUser,
  json,
  requireCurrentTeamRequest,
  requirePlatformOwner,
  scopedTeamError,
  teamAdminClient,
  TeamOperationError,
} from "@/lib/team-server";

export const Route = createFileRoute("/api/owner-campaigns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const [eligible, campaigns] = await Promise.all([
            db.rpc("customer_campaign_eligible_count"),
            db.rpc("customer_campaign_summary", { p_actor: actor.id }),
          ]);
          if (eligible.error || campaigns.error) throw eligible.error || campaigns.error;
          requireCurrentTeamRequest(db);
          return json({
            ready: customerEmailReady(),
            eligible: Number(eligible.data ?? 0),
            campaigns: campaigns.data ?? [],
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, campaignAction, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const body = prepared.data;
          if (body.action === "prepare") {
            const result = await db.rpc("customer_prepare_campaign", {
              p_actor: actor.id,
              p_id: body.id,
              p_subject: body.subject,
              p_body: body.body,
              p_permission_confirmed: body.permissionConfirmed,
            });
            if (result.error) throw result.error;
            requireCurrentTeamRequest(db);
            await audit(db, actor.id, "customer.campaign_prepared", undefined, {
              campaignId: body.id,
              recipients: result.data,
            });
            return json({ notice: `Prepared ${result.data} individual drafts. No email sent.` });
          }
          if (!customerEmailReady())
            throw new TeamOperationError("Customer email sender is not ready.", 503);
          const campaign = await db
            .from("customer_email_campaigns")
            .select("id")
            .eq("id", body.id)
            .eq("actor_id", actor.id)
            .maybeSingle();
          if (campaign.error || !campaign.data)
            throw new TeamOperationError("Campaign unavailable. Refresh before sending.");
          const queued = await db
            .from("customer_email_messages")
            .select("id,user_id,recipient_email")
            .eq("campaign_id", body.id)
            .eq("status", "draft")
            .order("created_at", { ascending: true })
            .limit(3);
          if (queued.error) throw queued.error;
          let accepted = 0;
          let skipped = 0;
          let unconfirmed = 0;
          for (const message of queued.data ?? []) {
            requireCurrentTeamRequest(db);
            const [account, preference] = await Promise.all([
              db.auth.admin.getUserById(message.user_id),
              db
                .from("customer_email_preferences")
                .select("unsubscribed_at")
                .eq("user_id", message.user_id)
                .maybeSingle(),
            ]);
            if (preference.error) throw preference.error;
            const target = account.data?.user;
            if (
              account.error ||
              !target ||
              !target.email_confirmed_at ||
              !message.recipient_email ||
              target.email?.toLowerCase() !== message.recipient_email.toLowerCase() ||
              (target.banned_until && Date.parse(target.banned_until) > Date.now()) ||
              preference.data?.unsubscribed_at
            ) {
              const saved = await db
                .from("customer_email_messages")
                .update({ status: "skipped" })
                .eq("id", message.id)
                .eq("status", "draft");
              if (saved.error) throw saved.error;
              skipped++;
              continue;
            }
            const result = await manageCustomer(
              db,
              actor.id,
              {
                action: "send",
                id: message.id,
                recipient: message.recipient_email,
                permissionConfirmed: true,
              },
              request.signal,
            );
            if (result.notice.startsWith("Provider accepted")) accepted++;
            else unconfirmed++;
          }
          requireCurrentTeamRequest(db);
          await audit(db, actor.id, "customer.campaign_batch", undefined, {
            campaignId: body.id,
            accepted,
            skipped,
            unconfirmed,
          });
          return json({
            notice: `${accepted} provider accepted, ${skipped} skipped, ${unconfirmed} delivery unconfirmed. Refresh to see remaining drafts.`,
            processed: accepted + skipped + unconfirmed,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
