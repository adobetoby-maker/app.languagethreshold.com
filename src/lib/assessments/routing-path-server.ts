import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import type { attemptAccess } from "./server";
import { AssessmentAccessError } from "./errors";
import { validateFormDefinition, type AssessmentFormDefinition } from "./form";
import { hasAdaptiveRouting, routingPolicyIssues } from "./routing-contract";
import { routingPublicItems, type FrozenRoutingDecision } from "./routing";

type Context = Awaited<ReturnType<typeof attemptAccess>>;

/** Internal only: caller must first authorize this exact attempt with attemptAccess.
 * Reads the immutable decision, not its private original answer/audit snapshot.
 * Flat historical forms preserve their original item order and need no route query.
 */
export async function selectedAttemptPath(db: TeamDb, context: Context, requireRoute = false) {
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
  const result = await db
    .from("assessment_attempt_routes")
    .select("attempt_id,source_revision,decision_revision,decision")
    .eq("attempt_id", attempt.id)
    .maybeSingle();
  if (result.error) throw unavailable();
  const row = result.data;
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
