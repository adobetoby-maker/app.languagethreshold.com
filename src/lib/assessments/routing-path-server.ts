import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import type { attemptAccess } from "./server";
import { AssessmentAccessError } from "./errors";
import { validateFormDefinition, type AssessmentFormDefinition } from "./form";
import { hasAdaptiveRouting, routingPolicyIssues } from "./routing-contract";
import { routingPublicItems, type FrozenRoutingDecision } from "./routing";
import type { ItemEvidence } from "./core";

type Context = Awaited<ReturnType<typeof attemptAccess>>;

/** Selected scores remain individual evidence; only the shared core retains anchors.
 * A selected item awaiting its first grade is pending, never a wrong-answer zero.
 */
export function normalizePathEvidence(
  path: ReturnType<typeof resolveSelectedAttemptPath>,
  rows: readonly ItemEvidence[],
): ItemEvidence[] {
  if (!path.routing) return [...rows];
  const fail = () =>
    new AssessmentAccessError("Selected score evidence could not be checked.", 503);
  const byId = new Map(path.items.map((item) => [item.id, item]));
  const core = new Set(path.items.slice(0, path.routing.coreItemCount).map((item) => item.id));
  const evidence = new Map<string, ItemEvidence>();
  if (!Array.isArray(rows) || rows.length > path.items.length) throw fail();
  for (const row of rows) {
    const item = byId.get(row.itemId);
    if (
      !item ||
      evidence.has(row.itemId) ||
      row.objectiveId !== item.objectiveId ||
      row.skill !== item.skill ||
      row.maximum !== item.maximum ||
      row.coverage !== (item.coverage ?? "module") ||
      (row.comparisonGroup ?? undefined) !== (item.comparisonGroup ?? undefined) ||
      !["scored", "pending", "needs_review", "not_assessed"].includes(row.state) ||
      !["deterministic", "human", "ai_proposal"].includes(row.source) ||
      (row.points !== null &&
        (!Number.isFinite(row.points) || row.points < 0 || row.points > item.maximum))
    )
      throw fail();
    evidence.set(row.itemId, {
      ...row,
      comparisonGroup: core.has(row.itemId) ? item.comparisonGroup : undefined,
    });
  }
  return path.items.map(
    (item) =>
      evidence.get(item.id) ?? {
        itemId: item.id,
        objectiveId: item.objectiveId,
        skill: item.skill,
        maximum: item.maximum,
        coverage: item.coverage ?? "module",
        comparisonGroup: core.has(item.id) ? item.comparisonGroup : undefined,
        state: "pending",
        source: "deterministic",
        points: null,
      },
  );
}

/** Validate the whole adaptive response set before serialization or any scoring write. */
export function requireSelectedResponses(
  path: Awaited<ReturnType<typeof selectedAttemptPath>>,
  responses: readonly { id: string; item_id: string; answer?: unknown }[],
  complete = false,
) {
  if (!path.routing) return;
  const selected = new Set(path.items.map((item) => item.id));
  const ids = new Set<string>(),
    items = new Set<string>();
  for (const response of responses) {
    if (
      !response ||
      typeof response.id !== "string" ||
      !response.id ||
      ids.has(response.id) ||
      !selected.has(response.item_id) ||
      items.has(response.item_id) ||
      !response.answer ||
      typeof response.answer !== "object" ||
      Array.isArray(response.answer) ||
      !["choice", "typed", "handwriting", "speech_transcript", "unavailable"].includes(
        (response.answer as { inputMethod: string }).inputMethod,
      )
    )
      throw new AssessmentAccessError(
        "Saved responses do not match the selected assessment path.",
        503,
      );
    ids.add(response.id);
    items.add(response.item_id);
  }
  if (complete && items.size !== selected.size)
    throw new AssessmentAccessError("Submitted selected responses are incomplete.", 503);
}

/** Internal only: caller must first authorize this exact attempt with attemptAccess.
 * Reads the immutable decision, not its private original answer/audit snapshot.
 * Flat historical forms preserve their original item order and need no route query.
 */
export async function selectedAttemptPath(db: TeamDb, context: Context, requireRoute = false) {
  if (!hasAdaptiveRouting(context.attempt.form_snapshot?.definition))
    return resolveSelectedAttemptPath(context, null, requireRoute);
  const result = await db
    .from("assessment_attempt_routes")
    .select("attempt_id,source_revision,decision_revision,decision")
    .eq("attempt_id", context.attempt.id)
    .maybeSingle();
  if (result.error)
    throw new AssessmentAccessError("Selected assessment path is unavailable.", 503);
  return resolveSelectedAttemptPath(context, result.data, requireRoute);
}

/** Batched report callers supply only a service-read immutable row after authorization. */
export function resolveSelectedAttemptPath(
  context: Context,
  row: {
    attempt_id: string;
    source_revision: number;
    decision_revision: number;
    decision: unknown;
  } | null,
  requireRoute = false,
) {
  const { attempt, enrollment } = context;
  const form = attempt.form_snapshot?.definition as AssessmentFormDefinition;
  const unavailable = () =>
    new AssessmentAccessError("Selected assessment path is unavailable.", 503);
  if (!form || !Array.isArray(form.items)) throw unavailable();
  if (!hasAdaptiveRouting(form)) return { items: form.items, routing: undefined };
  if (
    validateFormDefinition(form).length ||
    routingPolicyIssues(form).length ||
    enrollment.program_scope !== "full_module" ||
    attempt.form_id !== form.id ||
    attempt.form_snapshot.version !== form.version ||
    attempt.form_snapshot.rubricVersion !== form.rubricVersion
  )
    throw unavailable();
  if (!row && requireRoute)
    throw new AssessmentAccessError(
      "Continue from the saved core before submitting this assessment.",
      409,
    );
  try {
    const decision = row ? (row.decision as FrozenRoutingDecision) : null;
    if (
      row &&
      (row.attempt_id !== attempt.id ||
        row.source_revision !== decision?.sourceRevision ||
        row.decision_revision !== row.source_revision + 1 ||
        !Number.isSafeInteger(attempt.revision) ||
        row.source_revision > 2147483646 ||
        attempt.revision > 2147483647 ||
        attempt.revision < row.decision_revision)
    )
      throw unavailable();
    const visible = routingPublicItems(form, attempt.id, decision);
    const byId = new Map(form.items.map((item) => [item.id, item]));
    return {
      items: visible.map((item) => byId.get(item.id)!),
      routing: {
        state: row ? ("selected" as const) : ("core" as const),
        coreItemCount: form.routing!.coreItemIds.length,
      },
    };
  } catch {
    throw unavailable();
  }
}
