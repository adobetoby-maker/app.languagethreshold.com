import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { z } from "zod";
import {
  audit,
  authenticatedTeamUser,
  json,
  memberRole,
  teamAdminClient,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";

const requestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  audience: z.string().trim().min(3).max(300),
  situations: z.string().trim().min(10).max(2000),
  vocabulary: z.string().trim().max(2000).default(""),
  organizationId: z.string().uuid().nullable().default(null),
});

async function hasActivePlan(db: ReturnType<typeof teamAdminClient>, userId: string) {
  const [{ data: profile, error: profileError }, { data: memberships, error: membersError }] =
    await Promise.all([
      db.from("profiles").select("data").eq("id", userId).maybeSingle(),
      db
        .from("team_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);
  if (profileError || membersError) throw profileError ?? membersError;
  const status = (profile?.data as Record<string, unknown> | null)?.subscription_status;
  if (status === "active" || status === "trialing") return true;
  const ids = (memberships ?? []).map((member) => member.organization_id);
  if (!ids.length) return false;
  const { data: plans, error } = await db
    .from("team_entitlements")
    .select("status,period_end")
    .in("organization_id", ids)
    .in("status", ["active", "manual"]);
  if (error) throw error;
  return (plans ?? []).some(
    (plan) =>
      plan.status === "active" ||
      (plan.status === "manual" &&
        !!plan.period_end &&
        new Date(plan.period_end).getTime() > Date.now()),
  );
}

export const Route = createFileRoute("/api/module-request")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          const { data, error } = await db
            .from("custom_module_requests")
            .select("id,title,status,fee_cents,created_at,paid_at,owner_note")
            .eq("requester_id", user.id)
            .neq("status", "pending_payment")
            .order("created_at", { ascending: false })
            .limit(20);
          if (error) throw error;
          return json({ requests: data ?? [] });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, requestSchema, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        const body = prepared.data;
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          if (!(await hasActivePlan(db, user.id)))
            throw new TeamOperationError(
              "An active Pro or Team plan is required to request a custom module.",
            );
          if (body.organizationId) {
            const member = await memberRole(db, body.organizationId, user.id);
            if (!member || !["owner", "admin"].includes(member.role))
              throw new TeamOperationError(
                "Company admin access required to request on behalf of a team.",
                403,
              );
          }
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) throw new TeamOperationError("Custom module checkout is not configured.", 503);
          const { data: item, error } = await db
            .from("custom_module_requests")
            .insert({
              requester_id: user.id,
              organization_id: body.organizationId,
              title: body.title,
              audience: body.audience,
              situations: body.situations,
              vocabulary: body.vocabulary,
            })
            .select("id")
            .single();
          if (error || !item) throw error ?? new TeamOperationError("Could not save request.");
          const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
          const origin = new URL(request.url).origin;
          const session = await stripe.checkout.sessions.create(
            {
              mode: "payment",
              branding_settings: { display_name: "Language Threshold" },
              payment_method_types: ["card"],
              customer_email: user.email,
              client_reference_id: user.id,
              line_items: [
                {
                  quantity: 1,
                  price_data: {
                    currency: "usd",
                    unit_amount: 2000,
                    product_data: {
                      name: "Language Threshold custom module request and content brief",
                    },
                  },
                },
              ],
              metadata: { customModuleRequestId: item.id, userId: user.id },
              success_url: `${origin}/module-request?checkout=success`,
              cancel_url: `${origin}/module-request?checkout=cancel`,
            },
            { idempotencyKey: `custom-module:${item.id}` },
          );
          const { error: updateError } = await db
            .from("custom_module_requests")
            .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
            .eq("id", item.id);
          if (updateError) throw updateError;
          await audit(
            db,
            user.id,
            "custom_module.checkout_started",
            body.organizationId ?? undefined,
            {
              requestId: item.id,
            },
          );
          if (!session.url)
            throw new TeamOperationError("Checkout could not be opened. Please try again.");
          return json({ url: session.url });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
