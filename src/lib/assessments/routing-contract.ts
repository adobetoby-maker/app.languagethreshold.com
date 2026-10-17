import { ASSESSMENT_SKILLS } from "./core.ts";
import type { AssessmentFormDefinition } from "./form.ts";

/** Private, reviewed configuration. No default placement cutoffs are supplied by the engine. */
export interface AssessmentRoutingPolicy {
  schema: 1;
  version: string;
  coreItemIds: string[];
  minimumEvidence: number;
  minimumObjectives: number;
  branches: { id: string; itemIds: string[] }[];
  bands: { minimumPercent: number; maximumPercent: number; branchId: string }[];
  insufficientEvidenceBranchId: string;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value);
const distinctIds = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= 1000 &&
  value.every(identifier) &&
  new Set(value).size === value.length;

/** Presence, including malformed/null metadata, must not silently fall back to a flat exam. */
export function hasAdaptiveRouting(definition: unknown): boolean {
  return object(definition) && Object.prototype.hasOwnProperty.call(definition, "routing");
}

export function routingPolicyIssues(
  form: Pick<AssessmentFormDefinition, "items" | "routing">,
): string[] {
  if (!hasAdaptiveRouting(form)) return [];
  const p: unknown = form.routing;
  const fail = (message: string) => [`Routing: ${message}`];
  if (!object(p) || p.schema !== 1 || !identifier(p.version))
    return fail("valid schema and version required.");
  const allowed = new Set([
    "schema",
    "version",
    "coreItemIds",
    "minimumEvidence",
    "minimumObjectives",
    "branches",
    "bands",
    "insufficientEvidenceBranchId",
  ]);
  if (Object.keys(p).some((key) => !allowed.has(key))) return fail("unrecognized policy field.");
  if (!Array.isArray(form.items) || form.items.length > 1000 || !distinctIds(p.coreItemIds))
    return fail("a bounded, distinct fixed core is required.");
  const ids = form.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length || !p.coreItemIds.every((id) => ids.includes(id)))
    return fail("core references must identify distinct frozen items.");
  const core = form.items.filter((item) => (p.coreItemIds as string[]).includes(item.id));
  for (const skill of ASSESSMENT_SKILLS)
    if (
      new Set(core.filter((item) => item.skill === skill).map((item) => item.objectiveId)).size < 3
    )
      return fail("the fixed core must retain three objectives for each skill.");
  const objectiveItems = core.filter(
    (item) => item.type !== "production" && item.skill !== "speaking" && item.skill !== "writing",
  );
  if (
    !Number.isInteger(p.minimumEvidence) ||
    Number(p.minimumEvidence) < 1 ||
    Number(p.minimumEvidence) > objectiveItems.length ||
    !Number.isInteger(p.minimumObjectives) ||
    Number(p.minimumObjectives) < 1 ||
    Number(p.minimumObjectives) > new Set(objectiveItems.map((item) => item.objectiveId)).size
  )
    return fail("explicit attainable evidence and objective minima are required.");
  if (!Array.isArray(p.branches) || p.branches.length < 2 || p.branches.length > 8)
    return fail("between two and eight bounded branches are required.");
  const used = new Set(p.coreItemIds),
    branches = new Set<string>();
  for (const branch of p.branches) {
    if (
      !object(branch) ||
      Object.keys(branch).some((key) => !["id", "itemIds"].includes(key)) ||
      !identifier(branch.id) ||
      branches.has(branch.id) ||
      !distinctIds(branch.itemIds) ||
      branch.itemIds.length > Math.min(30, core.length)
    )
      return fail("invalid or unbounded branch.");
    branches.add(branch.id);
    for (const id of branch.itemIds) {
      if (!ids.includes(id) || used.has(id))
        return fail("branch items must be frozen, disjoint and outside the core.");
      used.add(id);
    }
  }
  if (used.size !== ids.length)
    return fail("every frozen item must belong to the core or one branch.");
  if (!identifier(p.insufficientEvidenceBranchId) || !branches.has(p.insufficientEvidenceBranchId))
    return fail("a separate insufficient-evidence branch is required.");
  if (!Array.isArray(p.bands) || p.bands.length !== branches.size - 1)
    return fail("one band per ability branch is required.");
  let end = 0;
  const bandBranches = new Set<string>();
  for (const band of p.bands) {
    if (
      !object(band) ||
      Object.keys(band).some(
        (key) => !["minimumPercent", "maximumPercent", "branchId"].includes(key),
      ) ||
      typeof band.minimumPercent !== "number" ||
      typeof band.maximumPercent !== "number" ||
      !Number.isFinite(band.minimumPercent) ||
      !Number.isFinite(band.maximumPercent) ||
      band.minimumPercent !== end ||
      band.maximumPercent <= end ||
      band.maximumPercent > 100 ||
      !identifier(band.branchId) ||
      !branches.has(band.branchId) ||
      bandBranches.has(band.branchId) ||
      band.branchId === p.insufficientEvidenceBranchId
    )
      return fail(
        "ordered, non-overlapping bands must cover 0–100 and exclude the insufficient-evidence branch.",
      );
    bandBranches.add(band.branchId);
    end = band.maximumPercent;
  }
  return end === 100 ? [] : fail("ability bands must cover 0–100.");
}
