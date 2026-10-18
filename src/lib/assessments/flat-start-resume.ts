import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, rpc } from "./server";
import { hasAdaptiveRouting } from "./routing-contract";

/** Caller has already checked checkpoint ownership and current module access.
 * SQL repeats authorization and owns same-key/open-attempt ordering under its lock.
 */
export async function resumeFlatAssessment(
  db: TeamDb,
  actor: string,
  checkpoint: string,
  request: string,
  allowPilot: boolean,
): Promise<string | null> {
  const prior = await db
    .from("assessment_attempts")
    .select("id,form_snapshot")
    .eq("checkpoint_id", checkpoint)
    .eq("start_request_id", request)
    .maybeSingle();
  if (prior.error)
    throw new AssessmentAccessError("Saved assessment start could not be checked.", 503);
  const existing = prior.data
    ? prior
    : await db
        .from("assessment_attempts")
        .select("id,form_snapshot")
        .eq("checkpoint_id", checkpoint)
        .eq("status", "in_progress")
        .maybeSingle();
  if (existing.error)
    throw new AssessmentAccessError("Saved assessment start could not be checked.", 503);
  if (!existing.data || hasAdaptiveRouting(existing.data.form_snapshot?.definition)) return null;
  return rpc<string>(db, "assessment_start_attempt", {
    p_actor: actor,
    p_checkpoint: checkpoint,
    p_request: request,
    // SQL cannot select a new form with id = NULL. If the saved attempt disappears,
    // this invocation fails closed rather than bypassing current-source admission.
    p_form: null,
    p_allow_pilot: allowPilot,
    p_studied_objectives: [],
  });
}
