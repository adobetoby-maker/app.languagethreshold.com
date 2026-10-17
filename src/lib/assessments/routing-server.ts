import "@tanstack/react-start/server-only";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, attemptAccess, rpc } from "./server";
import {
  validateFormDefinition,
  type AssessmentFormDefinition,
  type AssessmentAnswer,
} from "./form";
import { hasAdaptiveRouting, routingPolicyIssues } from "./routing-contract";
import { evaluateRouting, routingPublicItems, type FrozenRoutingDecision } from "./routing";

const revision = z.number().int().min(0).max(2147483647);
const decisionSchema = z
  .object({
    schema: z.literal(1),
    attemptId: z.string().uuid(),
    sourceRevision: revision.max(2147483646),
    formId: z.string(),
    formVersion: z.string(),
    rubricVersion: z.string(),
    policyVersion: z.string(),
    branchId: z.string(),
    reason: z.enum(["score_band", "insufficient_evidence"]),
    scoredCount: revision,
    scoredObjectives: revision,
    percent: z.number().finite().min(0).max(100).nullable(),
    sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const receiptSchema = z
  .object({
    decision: decisionSchema,
    sourceRevision: revision,
    decisionRevision: revision,
    revision,
  })
  .strict();
const unavailable = () =>
  new AssessmentAccessError("Saved assessment routing is unavailable. Refresh to retry.", 503);

async function storedRoute(db: TeamDb, attemptId: string) {
  const result = await db
    .from("assessment_attempt_routes")
    .select(
      "attempt_id,request_id,source_revision,decision_revision,decision,core_snapshot,request_payload",
    )
    .eq("attempt_id", attemptId)
    .maybeSingle();
  if (result.error) throw unavailable();
  return result.data;
}

/** Validate the original audit basis, never recompute a retry from later core edits. */
function validateStoredRoute(
  row: NonNullable<Awaited<ReturnType<typeof storedRoute>>>,
  form: AssessmentFormDefinition,
  actor: string,
  attemptId: string,
): FrozenRoutingDecision {
  try {
    const decision = decisionSchema.parse(row.decision);
    if (
      row.attempt_id !== attemptId ||
      !z.string().uuid().safeParse(row.request_id).success ||
      row.source_revision !== decision.sourceRevision ||
      row.decision_revision !== row.source_revision + 1 ||
      !Array.isArray(row.core_snapshot) ||
      row.core_snapshot.length !== form.routing!.coreItemIds.length ||
      row.core_snapshot.some(
        (entry: { itemId: string }, index: number) =>
          entry?.itemId !== form.routing!.coreItemIds[index],
      )
    )
      throw unavailable();
    const original = evaluateRouting(form, attemptId, row.source_revision, row.core_snapshot);
    if (
      original.state !== "decision" ||
      !isDeepStrictEqual(original.decision, decision) ||
      !isDeepStrictEqual(row.request_payload, {
        actor,
        attemptId,
        revision: row.source_revision,
        definition: form,
        core: row.core_snapshot,
        decision,
      })
    )
      throw unavailable();
    routingPublicItems(form, attemptId, decision);
    return decision;
  } catch {
    throw unavailable();
  }
}

/** Only the authenticated learner can select a route from authoritative saved core answers. */
export async function selectAttemptRoute(
  db: TeamDb,
  actor: string,
  input: { attemptId: string; revision: number; requestId: string },
) {
  const { attempt, enrollment, checkpoint } = await attemptAccess(
    db,
    actor,
    input.attemptId,
    false,
    "routing",
  );
  // Team report access does not authorize routing or reading this private audit basis.
  if (enrollment.user_id !== actor)
    throw new AssessmentAccessError("Learner assessment access required.");
  const form = attempt.form_snapshot?.definition as AssessmentFormDefinition;
  if (!hasAdaptiveRouting(form))
    throw new AssessmentAccessError("This assessment has no routing step.", 400);
  if (
    validateFormDefinition(form).length ||
    routingPolicyIssues(form).length ||
    enrollment.program_scope !== "full_module"
  )
    throw unavailable();
  let stored = await storedRoute(db, input.attemptId);
  let decision: FrozenRoutingDecision;
  let core: { itemId: string; answer: AssessmentAnswer }[];
  if (stored) {
    decision = validateStoredRoute(stored, form, actor, input.attemptId);
    if (stored.request_id === input.requestId && input.revision !== stored.source_revision)
      throw new AssessmentAccessError("Route request key reused with different payload.", 409);
    core = stored.core_snapshot;
  } else {
    if (
      attempt.status !== "in_progress" ||
      enrollment.status !== "active" ||
      checkpoint.status !== "scheduled"
    )
      throw new AssessmentAccessError("Active learner assessment required.", 409);
    if (attempt.revision !== input.revision || input.revision >= 2147483647)
      throw new AssessmentAccessError(
        "Assessment revision conflict. Refresh your saved answers.",
        409,
      );
    const result = await db
      .from("assessment_responses")
      .select("item_id,answer")
      .eq("attempt_id", input.attemptId)
      .limit(form.routing!.coreItemIds.length + 1);
    if (result.error || !Array.isArray(result.data)) throw unavailable();
    const responses = result.data.map((row) => ({
      itemId: row.item_id,
      answer: row.answer as AssessmentAnswer,
    }));
    try {
      const ids = new Set(form.routing!.coreItemIds);
      if (
        responses.some(
          (row) =>
            !ids.has(row.itemId) ||
            !row.answer ||
            typeof row.answer !== "object" ||
            Array.isArray(row.answer) ||
            !["choice", "typed", "handwriting", "speech_transcript", "unavailable"].includes(
              row.answer.inputMethod,
            ),
        )
      )
        throw unavailable();
      const selected = evaluateRouting(form, input.attemptId, input.revision, responses);
      if (selected.state === "core_incomplete")
        throw new AssessmentAccessError(
          "Save every core response or mark it unavailable before continuing.",
          409,
        );
      decision = selected.decision;
      core = form.routing!.coreItemIds.map((itemId) =>
        responses.find((row) => row.itemId === itemId)!,
      );
    } catch (error) {
      if (error instanceof AssessmentAccessError) throw error;
      throw unavailable();
    }
  }
  // Always use the RPC, including retries: it repeats actor/revision/source checks under
  // the attempt lock and rejects a request UUID already used by a different attempt.
  const raw = await rpc<unknown>(db, "assessment_select_route", {
    p_actor: actor,
    p_attempt: input.attemptId,
    p_revision: input.revision,
    p_request: input.requestId,
    p_definition: form,
    p_core: core,
    p_decision: decision,
  });
  const receipt = receiptSchema.safeParse(raw);
  if (!receipt.success) throw unavailable();
  // Another request may have won while this one waited. Its immutable source, rather
  // than this call's losing candidate, is authoritative.
  stored = stored ?? (await storedRoute(db, input.attemptId));
  if (!stored) throw unavailable();
  const frozen = validateStoredRoute(stored, form, actor, input.attemptId);
  const value = receipt.data;
  if (
    !isDeepStrictEqual(value.decision, frozen) ||
    value.sourceRevision !== stored.source_revision ||
    value.decisionRevision !== stored.decision_revision ||
    value.revision < value.decisionRevision
  )
    throw unavailable();
  return {
    revision: value.revision,
    routing: { state: "selected" as const, coreItemCount: form.routing!.coreItemIds.length },
    items: routingPublicItems(form, input.attemptId, frozen),
    syncedAt: new Date().toISOString(),
  };
}
