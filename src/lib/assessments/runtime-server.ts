import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError } from "./errors";
import { validateFormDefinition, type AssessmentFormDefinition } from "./form";
import { hasAdaptiveRouting } from "./routing-contract";

/** Activation is a separate acceptance step. Production ignores this capability. */
export function adaptivePreviewRuntimeEnabled() {
  return (
    process.env.VERCEL_ENV === "preview" && process.env.LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED === "true"
  );
}
export function adaptiveFormAvailable(
  form: {
    id: string;
    status: string;
    calibrated?: boolean;
    version?: string;
    rubric_version?: string;
    definition?: unknown;
  },
  enrollment: { program_scope: string; target_language: string; instruction_language: string },
  checkpoint: string,
) {
  if (
    !adaptivePreviewRuntimeEnabled() ||
    enrollment.program_scope !== "full_module" ||
    form.status !== "verified" ||
    form.calibrated !== true ||
    !hasAdaptiveRouting(form.definition)
  )
    return false;
  try {
    const definition = form.definition as AssessmentFormDefinition;
    return (
      definition.status === "verified" &&
      typeof definition.id === "string" &&
      definition.id.trim().length > 0 &&
      typeof definition.version === "string" &&
      definition.version.trim().length > 0 &&
      typeof definition.rubricVersion === "string" &&
      definition.rubricVersion.trim().length > 0 &&
      definition.id === form.id &&
      definition.version === form.version &&
      definition.rubricVersion === form.rubric_version &&
      definition.checkpoint === checkpoint &&
      definition.targetLanguage === enrollment.target_language &&
      definition.instructionLanguage === enrollment.instruction_language &&
      Array.isArray(definition.items) &&
      validateFormDefinition(definition).length === 0
    );
  } catch {
    return false;
  }
}
export const adaptiveReadyKey = (release: string, checkpoint: string) => `${release}:${checkpoint}`;

/** Discover only reviewed adaptive IDs, then validate private definitions in bounded batches.
 * Default-off readiness never downloads a routing definition. No definition is returned.
 */
export async function adaptiveReadyForms(
  db: TeamDb,
  releases: readonly {
    id: string;
    target_language: string;
    instruction_language: string;
  }[],
) {
  const ready = new Set<string>();
  if (!adaptivePreviewRuntimeEnabled() || !releases.length) return ready;
  const unavailable = () =>
    new AssessmentAccessError("Adaptive form readiness is unavailable.", 503);
  const byRelease = new Map(releases.map((release) => [release.id, release]));
  if (byRelease.size !== releases.length || releases.length > 600) throw unavailable();
  // One cumulative bound across discovery and every batch, including a stalled transport.
  const controller = new AbortController();
  const expires = performance.now() + 10_000;
  const checkDeadline = () => {
    if (controller.signal.aborted || performance.now() >= expires) throw unavailable();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(unavailable());
    }, 10_000);
  });
  try {
    const load = async () => {
      checkDeadline();
      const discovery = await db
        .from("assessment_forms")
        .select("id,release_id,checkpoint")
        .eq("purpose", "module")
        .eq("status", "verified")
        .eq("calibrated", true)
        .not("definition->routing", "is", null)
        .in("release_id", [...byRelease.keys()])
        .limit(601)
        .abortSignal(controller.signal);
      checkDeadline();
      if (discovery.error || !Array.isArray(discovery.data) || discovery.data.length > 600)
        throw unavailable();
      const ids = discovery.data.map((row) => row.id);
      if (
        new Set(ids).size !== ids.length ||
        discovery.data.some((row) => !byRelease.has(row.release_id))
      )
        throw unavailable();
      for (let offset = 0; offset < ids.length; offset += 10) {
        checkDeadline();
        const batch = ids.slice(offset, offset + 10);
        const result = await db
          .from("assessment_forms")
          .select("id,release_id,checkpoint,status,calibrated,version,rubric_version,definition")
          .in("id", batch)
          .limit(11)
          .abortSignal(controller.signal);
        checkDeadline();
        if (
          result.error ||
          !Array.isArray(result.data) ||
          result.data.length !== batch.length ||
          new Set(result.data.map((row) => row.id)).size !== batch.length
        )
          throw unavailable();
        for (const row of result.data) {
          checkDeadline();
          const expected = discovery.data.find((item) => item.id === row.id),
            release = byRelease.get(row.release_id);
          if (
            !batch.includes(row.id) ||
            !expected ||
            !release ||
            expected.release_id !== row.release_id ||
            expected.checkpoint !== row.checkpoint
          )
            throw unavailable();
          if (
            adaptiveFormAvailable(row, { ...release, program_scope: "full_module" }, row.checkpoint)
          )
            ready.add(adaptiveReadyKey(row.release_id, row.checkpoint));
        }
      }
      checkDeadline();
      return ready;
    };
    return await Promise.race([load(), deadline]);
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
