import { z } from "zod";
import { prepareTeamJson } from "@/lib/team-request";
import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
} from "@/lib/team-server";
export const Route = createFileRoute("/api/owner-reddit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const p = await prepareTeamJson(
          request,
          z.union([
            z
              .object({
                action: z.literal("record_email_feedback"),
                userId: z.string().uuid(),
                feedbackId: z.string().uuid(),
                feedbackSummary: z.string().trim().min(10).max(1000),
              })
              .strict(),
            z.object({ feedbackId: z.string().uuid(), confirm: z.literal(true) }).strict(),
            z
              .object({
                userId: z.string().uuid(),
                feedbackSummary: z.string().trim().min(10).max(1000),
                confirm: z.literal(true),
              })
              .strict(),
          ]),
          2048,
        );
        if (p.response) return p.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          if ("action" in p.data) {
            const eligible = await db
              .from("promo_redemptions")
              .select("user_id")
              .eq("user_id", p.data.userId)
              .maybeSingle();
            if (eligible.error) throw eligible.error;
            if (!eligible.data)
              return json({ error: "This account has not redeemed the Reddit offer." }, 400);
            const saved = await db.rpc("save_product_feedback", {
              p_id: p.data.feedbackId,
              p_user: p.data.userId,
              p_category: "experience",
              p_message: p.data.feedbackSummary,
              p_source: "email",
              p_actor: actor.id,
            });
            if (saved.error) throw saved.error;
            requireCurrentTeamRequest(db);
            return json({ notice: "Emailed feedback recorded. No access reward was granted." });
          }
          const reward = await db.rpc("reward_reddit_feedback", {
            p_feedback: "feedbackId" in p.data ? p.data.feedbackId : null,
            p_user: "userId" in p.data ? p.data.userId : null,
            p_reason: "feedbackSummary" in p.data ? p.data.feedbackSummary : null,
            p_actor: actor.id,
          });
          if (reward.error) throw reward.error;
          requireCurrentTeamRequest(db);
          return json({
            notice:
              "Two-month feedback reward recorded. Repeating approval will not add more time.",
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },

      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const raw = new URL(request.url).searchParams.get("page") ?? "0";
          if (!/^\d{1,5}$/.test(raw)) return json({ error: "Invalid page." }, 400);
          const page = Number(raw);
          const [redemptions, feedback] = await Promise.all([
            db
              .from("promo_redemptions")
              .select(
                "user_id,code,redeemed_at,expires_at,feedback_email_consent,consent_updated_at,rewarded_at,reward_feedback_id",
              )
              .order("redeemed_at", { ascending: false })
              .order("user_id")
              .range(page * 50, page * 50 + 50),
            db
              .from("product_feedback")
              .select("id,user_id,category,message,created_at,source")
              .order("created_at", { ascending: false })
              .limit(50),
          ]);
          if (redemptions.error || feedback.error) throw redemptions.error ?? feedback.error;
          const rows = (redemptions.data ?? []).slice(0, 50);
          const ids = [
            ...new Set([
              ...rows.map((r) => r.user_id),
              ...(feedback.data ?? []).map((r) => r.user_id),
            ]),
          ];
          const contacts = ids.length
            ? await db.from("owner_crm_contacts").select("id,user_id,email,name").in("user_id", ids)
            : { data: [], error: null };
          if (contacts.error) throw contacts.error;
          const summary = rows.length
            ? await db.rpc("reddit_feedback_summary", { p_users: rows.map((row) => row.user_id) })
            : { data: [], error: null };
          if (summary.error) throw summary.error;
          requireCurrentTeamRequest(db);
          return json({
            page,
            hasMore: (redemptions.data?.length ?? 0) > 50,
            redemptions: rows.map((r) => ({
              ...r,
              feedback_count:
                summary.data?.find((item: { user_id: string }) => item.user_id === r.user_id)
                  ?.feedback_count ?? 0,
              last_feedback_at:
                summary.data?.find((item: { user_id: string }) => item.user_id === r.user_id)
                  ?.last_feedback_at ?? null,
              contact: contacts.data?.find((c) => c.user_id === r.user_id) ?? null,
            })),
            feedback: feedback.data?.map((item) => ({
              ...item,
              contact: contacts.data?.find((c) => c.user_id === item.user_id) ?? null,
            })),
          });
        } catch (e) {
          return scopedTeamError(e);
        }
      },
    },
  },
});
