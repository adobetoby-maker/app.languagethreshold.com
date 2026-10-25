import { lookupDocumentWord } from "@/lib/document-words-server";
import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { LANGUAGES } from "@/data/languages";
import {
  authenticatedTeamUser,
  teamAdminClient,
  json,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";
import { prepareTeamJson } from "@/lib/team-request";
import { documentCharacterCount, documentMonth } from "@/lib/document-plans";
import { translateDocumentContent } from "@/lib/document-translation-server";
import { documentStripe } from "@/lib/document-billing-server";
import {
  learningGenerationOriginError,
  checkLearningGenerationBudget,
} from "@/lib/learning-generation-security";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("lookup"),
    id: z.string().uuid(),
    passage: z.number().int().min(0).max(8000),
    side: z.enum(["en", "target"]),
    word: z.string().min(1).max(100),
  }),
  z.object({
    action: z.literal("translate"),
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    text: z.string().trim().min(10).max(8000),
    sourceLanguage: z.enum(LANGUAGES),
    targetLanguage: z.enum(LANGUAGES),
    quality: z.enum(["standard", "detailed"]),
  }),
  z.object({
    action: z.literal("checkout"),
    kind: z.enum(["storage", "translations"]),
    id: z.string().uuid(),
  }),
  z.object({ action: z.literal("portal") }),
  z.object({ action: z.literal("cancel-storage") }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);
export const Route = createFileRoute("/api/documents")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(undefined, request),
            user = await authenticatedTeamUser(request, db);
          const [account, month, docs] = await Promise.all([
            db.from("document_accounts").select("*").eq("user_id", user.id).maybeSingle(),
            db
              .from("document_months")
              .select("used")
              .eq("user_id", user.id)
              .eq("month", documentMonth())
              .maybeSingle(),
            db
              .from("study_documents")
              .select("id,title,source_language,target_language,sentences,created_at")
              .eq("user_id", user.id)
              .eq("state", "ready")
              .order("created_at", { ascending: false }),
          ]);
          if (account.error || month.error || docs.error)
            throw new TeamOperationError("Document allowances are temporarily unavailable.", 503);
          const a = account.data;
          return json({
            documents: docs.data ?? [],
            limit:
              a?.storage_paid_until && Date.parse(a.storage_paid_until) > Date.now() ? 110 : 10,
            monthlyRemaining: 50000 - (month.data?.used ?? 0),
            purchasedRemaining: a?.purchased_characters ?? 0,
            hasBilling: !!a?.stripe_customer_id,
            storageSubscription: !!a?.stripe_subscription_id,
            storagePaidUntil: a?.storage_paid_until ?? null,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const originError = learningGenerationOriginError(request);
        if (originError) return json({ error: originError.error }, originError.status);
        const prepared = await prepareTeamJson(request, schema, 50000);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(undefined, request),
            user = await authenticatedTeamUser(request, db),
            data = prepared.data;
          if (data.action === "lookup") return await lookupDocumentWord(db, user.id, request, data);
          if (data.action === "translate") {
            if (data.sourceLanguage === data.targetLanguage)
              throw new TeamOperationError("Choose two different languages.");
            const previous = await db
              .from("study_documents")
              .select("id,title,source_language,target_language,sentences,created_at")
              .eq("user_id", user.id)
              .eq("id", data.id)
              .eq("state", "ready")
              .maybeSingle();
            if (previous.error)
              throw new TeamOperationError(
                "Could not check your saved documents. Please retry.",
                503,
              );
            if (previous.data) return json({ document: previous.data });
            const denial = await checkLearningGenerationBudget(request);
            if (denial) return json({ error: denial.error }, denial.status);
            const { error } = await db.rpc("document_reserve", {
              p_user: user.id,
              p_id: data.id,
              p_title: data.title,
              p_source: data.sourceLanguage,
              p_target: data.targetLanguage,
              p_characters: documentCharacterCount(data.text),
            });
            if (error) throw new TeamOperationError(error.message, 400);
            try {
              const sentences = await translateDocumentContent(data);
              const finished = await db.rpc("document_finish", {
                p_user: user.id,
                p_id: data.id,
                p_sentences: sentences,
              });
              if (finished.error) throw finished.error;
              const saved = await db
                .from("study_documents")
                .select("id,title,source_language,target_language,sentences,created_at")
                .eq("user_id", user.id)
                .eq("id", data.id)
                .eq("state", "ready")
                .single();
              if (saved.error) throw saved.error;
              return json({ document: saved.data });
            } catch (error) {
              await db.rpc("document_finish", {
                p_user: user.id,
                p_id: data.id,
                p_sentences: null,
              });
              throw new TeamOperationError(
                error instanceof Error
                  ? error.message
                  : "Translation failed. Refresh your allowance before retrying.",
                503,
              );
            }
          }
          if (data.action === "delete") {
            const result = await db
              .from("study_documents")
              .delete()
              .eq("user_id", user.id)
              .eq("id", data.id)
              .eq("state", "ready");
            if (result.error) throw result.error;
            return json({ ok: true });
          }
          const stripe = documentStripe(),
            origin = new URL(request.url).origin;
          const { data: account, error } = await db
            .from("document_accounts")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (error) throw error;
          if (data.action === "cancel-storage") {
            if (!account?.stripe_subscription_id)
              throw new TeamOperationError("No storage subscription found.");
            const subscription = await stripe.subscriptions.retrieve(
              account.stripe_subscription_id,
            );
            if (
              subscription.metadata.documentPurchase !== "storage" ||
              subscription.metadata.userId !== user.id
            )
              throw new TeamOperationError("Storage ownership could not be confirmed.", 403);
            await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
            return json({ ok: true });
          }
          if (data.action === "portal") {
            if (!account?.stripe_customer_id)
              throw new TeamOperationError("No document purchases to manage yet.");
            const portal = await stripe.billingPortal.sessions.create({
              customer: account.stripe_customer_id,
              return_url: `${origin}/documents`,
            });
            return json({ url: portal.url });
          }
          if (data.kind === "storage" && account?.storage_checkout_session_id) {
            const pending = await stripe.checkout.sessions.retrieve(
              account.storage_checkout_session_id,
            );
            if (pending.status === "open" && pending.url) return json({ url: pending.url });
            const pendingSubId =
              typeof pending.subscription === "string"
                ? pending.subscription
                : pending.subscription?.id;
            if (pendingSubId) {
              const pendingSub = await stripe.subscriptions.retrieve(pendingSubId);
              if (!["canceled", "incomplete_expired"].includes(pendingSub.status))
                throw new TeamOperationError(
                  "A storage subscription already exists or is being confirmed. Refresh your allowance before purchasing again.",
                );
            }
          }
          if (data.kind === "storage" && account?.stripe_subscription_id) {
            const existing = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
            if (!["canceled", "incomplete_expired"].includes(existing.status))
              throw new TeamOperationError(
                "You already have a storage subscription. Use Manage billing to change it.",
              );
          }
          const storage = data.kind === "storage";
          const session = await stripe.checkout.sessions.create(
            {
              mode: storage ? "subscription" : "payment",
              integration_identifier: `lt-documents-${randomBytes(4).toString("hex")}`,
              ...(account?.stripe_customer_id
                ? { customer: account.stripe_customer_id }
                : {
                    customer_email: user.email,
                    ...(!storage ? { customer_creation: "always" as const } : {}),
                  }),
              client_reference_id: user.id,
              line_items: [
                {
                  quantity: 1,
                  price_data: {
                    currency: "usd",
                    unit_amount: 500,
                    product_data: {
                      name: storage
                        ? "My Documents — 100 extra document slots"
                        : "My Documents — 50,000 translation characters",
                    },
                    ...(storage ? { recurring: { interval: "month" as const } } : {}),
                  },
                },
              ],
              ...(storage
                ? {
                    subscription_data: {
                      metadata: { userId: user.id, documentPurchase: "storage" },
                    },
                  }
                : {}),
              metadata: { userId: user.id, documentPurchase: data.kind },
              success_url: `${origin}/documents?purchase=processing`,
              cancel_url: `${origin}/documents?purchase=canceled`,
            },
            {
              idempotencyKey: storage
                ? `document-storage:${user.id}:${account?.stripe_subscription_id ?? "first"}`
                : `document-translation:${user.id}:${data.id}`,
            },
          );
          if (storage) {
            const save = await db
              .from("document_accounts")
              .upsert(
                { user_id: user.id, storage_checkout_session_id: session.id },
                { onConflict: "user_id" },
              );
            if (save.error)
              throw new TeamOperationError(
                "Checkout could not be saved. Please retry to recover the same checkout.",
                503,
              );
          }
          return json({ url: session.url });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
