import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { backfillStripeLedger } from "@/lib/stripe-ledger-backfill";
import {
  audit,
  authenticatedUser,
  json,
  requirePlatformOwner,
  sendTeamEmail,
  teamAdminClient,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ledger_import_stripe") }),
  z.object({
    action: z.literal("ledger_add"),
    date: z.string().date(),
    category: z.string().trim().min(2).max(80),
    kind: z.enum(["income", "expense"]),
    amountCents: z.number().int().min(1).max(1000000000),
    memo: z.string().max(500).default(""),
  }),
  z.object({
    action: z.literal("ledger_reverse"),
    entryId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("manual_grant"),
    orgId: z.string().uuid(),
    seats: z.number().int().min(0).max(1000),
    term: z.enum(["monthly", "quarterly", "annual"]),
    periodEnd: z.string().datetime(),
  }),
  z.object({
    action: z.literal("revoke_certificate"),
    certificateId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("module_request_update"),
    requestId: z.string().uuid(),
    status: z.enum(["submitted", "reviewing", "delivered", "declined"]),
    ownerNote: z.string().trim().max(1000),
  }),
]);

export const Route = createFileRoute("/api/platform")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          await requirePlatformOwner(db, user);
          const since =
            new URL(request.url).searchParams.get("since") ??
            new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
          z.string().date().parse(since);
          const [
            counts,
            financial,
            categories,
            siteUsage,
            orgs,
            entitlements,
            members,
            activity,
            attempts,
            ledger,
            auditEvents,
            moduleRequests,
          ] = await Promise.all([
            db.rpc("platform_account_counts"),
            db.rpc("platform_financial_summary", { p_since: since }),
            db.rpc("platform_financial_categories", { p_since: since }),
            db.rpc("platform_site_usage_summary", {
              p_since: new Date(Date.now() - 30 * 86400000).toISOString(),
            }),
            db
              .from("team_organizations")
              .select("id,name,billing_email,created_at")
              .order("created_at", { ascending: false })
              .limit(500),
            db
              .from("team_entitlements")
              .select("organization_id,seat_limit,term,status,period_end,stripe_subscription_id"),
            db.from("team_members").select("organization_id,user_id,role,status"),
            db.rpc("platform_usage_summary", {
              p_since: new Date(Date.now() - 30 * 86400000).toISOString(),
            }),
            db
              .from("team_assessment_attempts")
              .select("organization_id,module_id,score,total,submitted_at")
              .not("submitted_at", "is", null)
              .gte("submitted_at", new Date(Date.now() - 30 * 86400000).toISOString())
              .limit(10000),
            db
              .from("platform_ledger_entries")
              .select(
                "id,occurred_on,category,amount_cents,source,external_ref,organization_id,memo,created_at",
              )
              .gte("occurred_on", since)
              .order("occurred_on", { ascending: false })
              .limit(10000),
            db
              .from("platform_audit_events")
              .select("id,actor_user_id,action,organization_id,created_at")
              .order("created_at", { ascending: false })
              .limit(100),
            db
              .from("custom_module_requests")
              .select(
                "id,requester_id,organization_id,title,audience,situations,vocabulary,status,fee_cents,paid_at,owner_note,created_at",
              )
              .neq("status", "pending_payment")
              .order("created_at", { ascending: false })
              .limit(200),
          ]);
          for (const result of [
            counts,
            financial,
            categories,
            siteUsage,
            orgs,
            entitlements,
            members,
            activity,
            attempts,
            ledger,
            auditEvents,
            moduleRequests,
          ])
            if (result.error) throw result.error;
          await audit(db, user.id, "platform.view", undefined, { since });
          return json({
            counts: counts.data,
            financial: financial.data,
            categories: categories.data ?? [],
            siteUsage: siteUsage.data ?? [],
            organizations: orgs.data ?? [],
            entitlements: entitlements.data ?? [],
            members: members.data ?? [],
            activity: activity.data ?? [],
            attempts: attempts.data ?? [],
            ledger: ledger.data ?? [],
            auditEvents: auditEvents.data ?? [],
            moduleRequests: moduleRequests.data ?? [],
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          await requirePlatformOwner(db, user);
          const body = schema.parse(await request.json());
          if (body.action === "ledger_import_stripe") {
            const counts = await backfillStripeLedger(db);
            await audit(db, user.id, "ledger.import_stripe", undefined, counts);
            return json({ counts });
          }
          if (body.action === "ledger_add") {
            const amount = body.kind === "income" ? body.amountCents : -body.amountCents;
            const { data, error } = await db
              .from("platform_ledger_entries")
              .insert({
                occurred_on: body.date,
                category: body.category,
                amount_cents: amount,
                source: "manual",
                memo: body.memo,
                created_by: user.id,
              })
              .select("id")
              .single();
            if (error) throw error;
            await audit(db, user.id, "ledger.add", undefined, {
              entryId: data.id,
              amountCents: amount,
            });
            return json({ entryId: data.id });
          }
          if (body.action === "ledger_reverse") {
            const { data: entry, error } = await db
              .from("platform_ledger_entries")
              .select("id,category,amount_cents,organization_id,source,external_ref")
              .eq("id", body.entryId)
              .single();
            if (error || !entry) throw error ?? new TeamOperationError("Entry not found.");
            if (entry.source !== "manual" || entry.external_ref)
              throw new TeamOperationError(
                "Stripe and reversal entries must be corrected through their source.",
              );
            if (entry.amount_cents === 0) throw new TeamOperationError("Entry cannot be reversed.");
            const { data, error: insertError } = await db
              .from("platform_ledger_entries")
              .insert({
                occurred_on: new Date().toISOString().slice(0, 10),
                category: entry.category,
                amount_cents: -entry.amount_cents,
                source: "manual",
                external_ref: `reversal:${entry.id}`,
                organization_id: entry.organization_id,
                memo: `Reversal: ${body.reason}`,
                created_by: user.id,
              })
              .select("id")
              .single();
            if (insertError) throw insertError;
            await audit(db, user.id, "ledger.reverse", undefined, {
              entryId: entry.id,
              reversalId: data.id,
            });
            return json({ entryId: data.id });
          }
          if (body.action === "manual_grant") {
            if (new Date(body.periodEnd).getTime() <= Date.now())
              throw new TeamOperationError("The manual grant end date must be in the future.");
            const { data: existing, error: readError } = await db
              .from("team_entitlements")
              .select("stripe_subscription_id")
              .eq("organization_id", body.orgId)
              .single();
            if (readError || !existing)
              throw readError ?? new TeamOperationError("Company not found.");
            if (existing.stripe_subscription_id)
              throw new TeamOperationError(
                "Use Stripe billing to change seats on a paid subscription.",
              );
            const { error } = await db
              .from("team_entitlements")
              .update({
                seat_limit: body.seats,
                term: body.term,
                status: "manual",
                period_end: body.periodEnd,
                updated_at: new Date().toISOString(),
              })
              .eq("organization_id", body.orgId);
            if (error) throw error;
            await audit(db, user.id, "team.manual_grant", body.orgId, {
              seats: body.seats,
              term: body.term,
              periodEnd: body.periodEnd,
            });
            return json({ ok: true });
          }
          if (body.action === "module_request_update") {
            if (
              (body.status === "delivered" || body.status === "declined") &&
              body.ownerNote.length < 20
            )
              throw new TeamOperationError(
                "Add a useful content brief or explanation before closing the request.",
              );
            const { data: item, error } = await db
              .from("custom_module_requests")
              .update({
                status: body.status,
                owner_note: body.ownerNote,
                updated_at: new Date().toISOString(),
              })
              .eq("id", body.requestId)
              .neq("status", "pending_payment")
              .select("id,organization_id,requester_id,title")
              .maybeSingle();
            if (error || !item) throw error ?? new TeamOperationError("Paid request not found.");
            await audit(
              db,
              user.id,
              "custom_module.status_updated",
              item.organization_id ?? undefined,
              {
                requestId: item.id,
                status: body.status,
              },
            );
            if (body.status !== "submitted") {
              const { data: account } = await db.auth.admin.getUserById(item.requester_id);
              if (account.user?.email) {
                try {
                  await sendTeamEmail(
                    account.user.email,
                    `Custom module request update: ${item.title}`,
                    `Your custom module request is now ${body.status}.\n\n${body.ownerNote || "Sign in to view your request."}\n\nView your request: ${new URL(request.url).origin}/module-request\n\nLanguage Threshold`,
                  );
                } catch (mailError) {
                  console.error("Custom module status email failed:", mailError);
                }
              }
            }
            return json({ ok: true });
          }
          const { error } = await db
            .from("team_certificates")
            .update({
              status: "revoked",
              revoked_at: new Date().toISOString(),
              revocation_reason: body.reason,
            })
            .eq("id", body.certificateId);
          if (error) throw error;
          await audit(db, user.id, "certificate.revoke", undefined, {
            certificateId: body.certificateId,
          });
          return json({ ok: true });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
