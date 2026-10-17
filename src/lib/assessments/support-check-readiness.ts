import { hasAdaptiveRouting } from "./routing-contract";
import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { getCurriculum } from "@/data/curriculum";
import { lessonObjectiveId } from "@/lib/learning-identity";
import { officialFormAvailable } from "./release-readiness";

export interface SupportingCheckEnrollment {
  id: string;
  release_id: string;
  module_id: string;
  user_id: string;
  organization_id: string | null;
  target_language: string;
  instruction_language: string;
  program_scope?: string;
  support_capability_id?: string | null;
}
export interface SupportingCheckAvailability {
  formId: string;
  reviewed: boolean;
}
export const supportingCheckKey = (enrollment: string, checkpoint: string) =>
  `${enrollment}:${checkpoint}`;

/** Caller must authorize every enrollment first. No private form bytes are returned. */
export async function readSupportingChecks(
  db: TeamDb,
  enrollments: readonly SupportingCheckEnrollment[],
) {
  const units = enrollments.filter((e) => e.program_scope === "support_units");
  const available = new Map<string, SupportingCheckAvailability>();
  if (!units.length) return available;
  if (units.length > 50) throw new Error("Supporting check page exceeds its bound.");
  const capIds = [
    ...new Set(
      units
        .map((e) => e.support_capability_id)
        .filter((id): id is string => typeof id === "string" && !!id),
    ),
  ];
  if (!capIds.length) return available;
  const [caps, assignments] = await Promise.all([
    db
      .from("assessment_support_capabilities")
      .select(
        "id,release_id,status,version,assignment_mode,lesson_ids,before_form_id,after_form_id",
      )
      .in("id", capIds)
      .limit(capIds.length),
    db
      .from("assessment_support_assignments")
      .select("support_enrollment_id,user_id,organization_id,mode,status,capability_snapshot")
      .in(
        "support_enrollment_id",
        units.map((e) => e.id),
      )
      .in("status", ["active", "checkpoint_due"])
      .limit(101),
  ]);
  if (caps.error || assignments.error || (assignments.data?.length ?? 0) > 100)
    throw new Error("Supporting check mappings could not be loaded.");
  const formIds = [
    ...new Set(
      (caps.data ?? [])
        .flatMap((cap) => [cap.before_form_id, cap.after_form_id])
        .filter((id): id is string => typeof id === "string" && !!id),
    ),
  ];
  if (!formIds.length) return available;
  const forms = await db
    .from("assessment_forms")
    .select("id,release_id,checkpoint,status,calibrated,purpose,support_capability_id,definition")
    .in("id", formIds)
    .limit(formIds.length);
  if (forms.error) throw new Error("Supporting check forms could not be loaded.");
  for (const enrollment of units) {
    const cap = caps.data?.find((c) => c.id === enrollment.support_capability_id);
    const matches =
      assignments.data?.filter((a) => a.support_enrollment_id === enrollment.id) ?? [];
    if (
      !cap ||
      cap.status !== "verified" ||
      cap.assignment_mode !== "units" ||
      cap.release_id !== enrollment.release_id ||
      matches.length !== 1
    )
      continue;
    const assignment = matches[0],
      snapshot = assignment.capability_snapshot;
    if (
      assignment.mode !== "units" ||
      assignment.user_id !== enrollment.user_id ||
      assignment.organization_id !== enrollment.organization_id ||
      !snapshot ||
      snapshot.capabilityId !== cap.id ||
      snapshot.version !== cap.version ||
      snapshot.releaseId !== enrollment.release_id ||
      snapshot.moduleId !== enrollment.module_id ||
      snapshot.targetLanguage !== enrollment.target_language ||
      snapshot.instructionLanguage !== enrollment.instruction_language
    )
      continue;
    const lessons: unknown = snapshot.lessonIds;
    const sourceLessons = new Set(
      (getCurriculum(enrollment.module_id)?.lessons ?? []).map((lesson) =>
        lessonObjectiveId(enrollment.module_id, lesson.n),
      ),
    );
    if (
      !Array.isArray(lessons) ||
      lessons.length < 1 ||
      lessons.length > 30 ||
      new Set(lessons).size !== lessons.length ||
      !Array.isArray(cap.lesson_ids) ||
      !lessons.every(
        (id) => typeof id === "string" && sourceLessons.has(id) && cap.lesson_ids.includes(id),
      )
    )
      continue;
    for (const checkpoint of ["entrance", "day90"] as const) {
      const id = checkpoint === "entrance" ? cap.before_form_id : cap.after_form_id;
      const form = forms.data?.find(
        (f) =>
          f.id === id &&
          f.release_id === enrollment.release_id &&
          f.checkpoint === checkpoint &&
          f.purpose === "support" &&
          f.support_capability_id === cap.id,
      );
      const items: unknown = form?.definition?.items;
      if (
        !form ||
        hasAdaptiveRouting(form.definition) ||
        !Array.isArray(items) ||
        !items.length ||
        items.length > 1000 ||
        !lessons.every((lesson) =>
          items.some((item) => item && typeof item === "object" && item.objectiveId === lesson),
        )
      )
        continue;
      available.set(supportingCheckKey(enrollment.id, checkpoint), {
        formId: form.id,
        reviewed: officialFormAvailable(form),
      });
    }
  }
  return available;
}
