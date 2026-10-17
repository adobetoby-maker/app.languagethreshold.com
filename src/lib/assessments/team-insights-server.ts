import "@tanstack/react-start/server-only";
import { getCurriculum } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import type { Language, NativeLanguage } from "@/data/languages";
import { memberRole, type TeamDb } from "@/lib/team-server";
import { lessonObjectiveId } from "@/lib/learning-identity";
import { ASSESSMENT_SKILLS, type Checkpoint } from "./core";
import { lessonReleaseReadiness } from "./release-readiness";
import { AssessmentAccessError, rpc } from "./server";
import { hasAdaptiveRouting } from "./routing-contract";
import { routingComparisonItems } from "./routing";
import type { AssessmentFormDefinition } from "./form";
import {
  aggregateTeamInsights,
  emptyTeamInsights,
  type InsightItem,
  type InsightLearner,
} from "./team-insights";
export async function teamAssessmentInsights(
  db: TeamDb,
  actor: string,
  org: string,
  moduleId: string,
  target: Language,
  native: NativeLanguage,
  checkpoint: Checkpoint,
) {
  const role = await memberRole(db, org, actor);
  if (!role || !["owner", "admin"].includes(role.role))
    throw new AssessmentAccessError("Team insight admin access required.", 403);
  const module = getModule(moduleId),
    curriculum = getCurriculum(moduleId);
  if (
    target === native ||
    (target === "Chinese" && native === "Chinese (Simplified)") ||
    !module ||
    !curriculum ||
    !moduleSupportsLearningPair(module, target, native)
  )
    throw new AssessmentAccessError("This module does not support that language pair.", 400);
  const releases = await db
    .from("assessment_releases")
    .select("id,module_id,target_language,instruction_language,status,lesson_manifest")
    .eq("module_id", moduleId)
    .eq("target_language", target)
    .eq("instruction_language", native)
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1);
  if (releases.error)
    throw new AssessmentAccessError("Team insight content could not be checked.", 503);
  const release = releases.data?.[0];
  if (!release) return emptyTeamInsights("content_pending");
  const binding = await db
    .from("assessment_lesson_snapshots")
    .select("snapshot_text,fingerprint")
    .eq("release_id", release.id)
    .maybeSingle();
  if (binding.error)
    throw new AssessmentAccessError("Team insight lesson review could not be checked.", 503);
  if (!(await lessonReleaseReadiness(release, binding.data)).available)
    return emptyTeamInsights("content_pending");
  const forms = await db
    .from("assessment_forms")
    .select("id,version,rubric_version,definition")
    .eq("release_id", release.id)
    .eq("checkpoint", checkpoint)
    .eq("purpose", "module")
    .eq("status", "verified")
    .eq("calibrated", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (forms.error)
    throw new AssessmentAccessError("Team insight exam version could not be checked.", 503);
  const form = forms.data?.[0];
  if (!form) return emptyTeamInsights("content_pending");
  const allItems = (form.definition as { items?: InsightItem[] }).items;
  const objectives = new Set(
    curriculum.lessons.map((lesson) => lessonObjectiveId(moduleId, lesson.n)),
  );
  if (
    !Array.isArray(allItems) ||
    !allItems.length ||
    allItems.length > 1000 ||
    new Set(allItems.map((item) => item.id)).size !== allItems.length ||
    allItems.some(
      (item) =>
        !item.id ||
        !objectives.has(item.objectiveId) ||
        !ASSESSMENT_SKILLS.includes(item.skill) ||
        !Number.isFinite(item.maximum) ||
        item.maximum <= 0,
    )
  )
    throw new AssessmentAccessError("Reviewed team insight mappings could not be checked.", 503);
  const adaptive = hasAdaptiveRouting(form.definition);
  let expected = allItems;
  if (adaptive) {
    const definition = form.definition as AssessmentFormDefinition;
    try {
      if (
        definition.id !== form.id ||
        definition.version !== form.version ||
        definition.rubricVersion !== form.rubric_version ||
        definition.checkpoint !== checkpoint ||
        definition.targetLanguage !== target ||
        definition.instructionLanguage !== native
      )
        throw new Error("Frozen form identity mismatch");
      const core = routingComparisonItems(definition);
      const items = new Map(allItems.map((item) => [item.id, item]));
      expected = core.map((id) => items.get(id)!);
    } catch {
      throw new AssessmentAccessError(
        "Reviewed fixed-core insight mappings could not be checked.",
        503,
      );
    }
  }
  const evidence = await rpc<{
    status: "available" | "small_group" | "too_large";
    learners: InsightLearner[];
  }>(db, "assessment_team_insight_evidence", { p_actor: actor, p_org: org, p_form: form.id });
  if (evidence.status !== "available") return emptyTeamInsights(evidence.status);
  const report = aggregateTeamInsights(expected, evidence.learners);
  return {
    ...report,
    formVersion: form.version,
    rubricVersion: form.rubric_version,
    ...(adaptive ? { evidenceScope: "fixed_core" as const } : {}),
  };
}
