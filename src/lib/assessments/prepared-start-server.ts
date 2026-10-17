import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, rpc } from "./server";
import { adaptivePreviewRuntimeEnabled, adaptiveFormAvailable } from "./runtime-server";
import { hasAdaptiveRouting } from "./routing-contract";
import { validateFormDefinition, type AssessmentFormDefinition } from "./form";
import { preparationKey } from "./preparation";
import { requireCurrentLessonBinding } from "./lesson-binding";

type Enrollment = {
  release_id: string;
  program_scope: string;
  target_language: string;
  instruction_language: string;
  module_id: string;
};
async function preparedRpc(db: TeamDb, args: Record<string, unknown>) {
  try {
    return await rpc<string>(db, "assessment_start_prepared_attempt", args);
  } catch (error) {
    if (
      error instanceof AssessmentAccessError &&
      error.message === "Prepared assessment source changed; reopen start details"
    )
      throw new AssessmentAccessError(error.message, 409);
    throw error;
  }
}

/** Existing frozen retries/resume are authoritative; source edits cannot substitute another form. */
export async function resumePreparedAssessment(
  db: TeamDb,
  actor: string,
  checkpoint: string,
  request: string,
): Promise<string | null> {
  if (!adaptivePreviewRuntimeEnabled()) return null;
  const prior = await db
    .from("assessment_attempts")
    .select("id,form_id,form_snapshot")
    .eq("checkpoint_id", checkpoint)
    .eq("start_request_id", request)
    .maybeSingle();
  if (prior.error) throw new AssessmentAccessError("Assessment start could not be checked.", 503);
  const open = prior.data
    ? prior
    : await db
        .from("assessment_attempts")
        .select("id,form_id,form_snapshot")
        .eq("checkpoint_id", checkpoint)
        .eq("status", "in_progress")
        .maybeSingle();
  if (open.error) throw new AssessmentAccessError("Assessment start could not be checked.", 503);
  if (!open.data || !hasAdaptiveRouting(open.data.form_snapshot?.definition)) return null;
  const saved = open.data.form_snapshot;
  if (
    saved.formId !== open.data.form_id ||
    saved.definition?.id !== open.data.form_id ||
    saved.version !== saved.definition?.version ||
    saved.rubricVersion !== saved.definition?.rubricVersion ||
    saved.programScope !== "full_module" ||
    saved.pilot !== false ||
    saved.calibrated !== true ||
    validateFormDefinition(saved.definition as AssessmentFormDefinition).length
  )
    throw new AssessmentAccessError("Saved adaptive assessment is unavailable.", 503);
  // Empty expected objects are allowed only for the RPC's existing-attempt path.
  // If the attempt disappears concurrently, source comparison fails closed.
  return preparedRpc(db, {
    p_actor: actor,
    p_checkpoint: checkpoint,
    p_form: open.data.form_id,
    p_request: request,
    p_expected_form: {},
    p_expected_release: {},
    p_studied_objectives: [],
  });
}

/** Fetch/validate complete trusted source rows, then let SQL lock and compare those exact bytes. */
export async function startPreparedAssessment(
  db: TeamDb,
  input: {
    actor: string;
    checkpoint: string;
    checkpointKind: string;
    request: string;
    formId: string;
    preparedForm: string;
    enrollment: Enrollment;
    studied: string[];
  },
): Promise<string> {
  if (!adaptivePreviewRuntimeEnabled())
    throw new AssessmentAccessError("Adaptive routing is not enabled for this form yet.", 503);
  const [formResult, releaseResult] = await Promise.all([
    db
      .from("assessment_forms")
      .select("*")
      .eq("id", input.formId)
      .eq("release_id", input.enrollment.release_id)
      .eq("checkpoint", input.checkpointKind)
      .eq("purpose", "module")
      .maybeSingle(),
    db.from("assessment_releases").select("*").eq("id", input.enrollment.release_id).maybeSingle(),
  ]);
  if (formResult.error || releaseResult.error)
    throw new AssessmentAccessError("Prepared assessment source unavailable.", 503);
  const form = formResult.data,
    release = releaseResult.data;
  if (
    !form ||
    !release ||
    !adaptiveFormAvailable(form, input.enrollment, input.checkpointKind) ||
    preparationKey(form) !== input.preparedForm ||
    release.module_id !== input.enrollment.module_id ||
    release.target_language !== input.enrollment.target_language ||
    release.instruction_language !== input.enrollment.instruction_language
  )
    throw new AssessmentAccessError("The exam form changed. Reopen the start details.", 409);
  // Validate this exact release row, without a second release read that could validate different bytes.
  await requireCurrentLessonBinding(db, input.enrollment.release_id, {
    officialStart: true,
    release,
  });
  return preparedRpc(db, {
    p_actor: input.actor,
    p_checkpoint: input.checkpoint,
    p_form: form.id,
    p_request: input.request,
    p_expected_form: form,
    p_expected_release: release,
    p_studied_objectives: input.studied,
  });
}
