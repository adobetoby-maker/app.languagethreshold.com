/** Import private draft content only. Never print questions, answers or credentials. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validateFormDefinition } from "../src/lib/assessments/form.ts";
const project = "pollhlkgltdkdskdzsgd",
  path = process.argv[2];
if (!path || !path.startsWith("/"))
  throw new Error("Pass an absolute private authoring file path outside this repository.");
const { realpathSync } = await import("node:fs");
const repo = realpathSync(process.cwd()),
  file = realpathSync(path);
if (file.startsWith(repo + "/"))
  throw new Error("Private banks must remain outside the public repository.");
const content = JSON.parse(readFileSync(file, "utf8"));
if (
  !/^[a-z][a-z0-9-]{0,79}$/.test(content.moduleId) ||
  typeof content.releaseId !== "string" ||
  !Array.isArray(content.forms)
)
  throw new Error("Invalid private content manifest.");
if (
  new Set(content.forms.map((form) => form.checkpoint)).size !== 3 ||
  !["entrance", "day45", "day90"].every((checkpoint) =>
    content.forms.some((form) => form.checkpoint === checkpoint),
  )
)
  throw new Error("Provide all three checkpoint forms.");
for (const form of content.forms) {
  const gaps = validateFormDefinition(form);
  if (gaps.length)
    throw new Error(
      `Draft content has ${gaps.length} validation gaps; resolve them before importing.`,
    );
  if (
    !form.id.startsWith(content.releaseId + "-") ||
    form.targetLanguage !== content.targetLanguage ||
    form.instructionLanguage !== content.instructionLanguage ||
    form.items.some(
      (item) => !new RegExp(`^${content.moduleId}\\.lesson\\.[1-9][0-9]*$`).test(item.objectiveId),
    )
  )
    throw new Error("Draft module, language or objective identity mismatch.");
}
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const db = createClient(
  `https://${project}.supabase.co`,
  keys.find((key) => key.name === "service_role" && !key.disabled)?.api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: release, error } = await db
  .from("assessment_releases")
  .select("id,module_id,target_language,instruction_language")
  .eq("id", content.releaseId)
  .single();
if (
  error ||
  release.module_id !== content.moduleId ||
  release.target_language !== content.targetLanguage ||
  release.instruction_language !== content.instructionLanguage
)
  throw new Error("Prepare the matching module track in the app before importing its drafts.");
const reports = [];
for (const form of content.forms) {
  const definition = { ...form, status: "draft" };
  const { data: existing, error: readError } = await db
    .from("assessment_forms")
    .select("id,definition")
    .eq("id", form.id)
    .maybeSingle();
  if (readError) throw new Error("Draft storage could not be inspected.");
  const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  if (existing && fingerprint(existing.definition) !== fingerprint(definition)) {
    // JSONB object ordering is not significant; compare canonical key order.
    const canonical = (value) =>
      Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.keys(value)
                .sort()
                .map((key) => [key, canonical(value[key])]),
            )
          : value;
    if (fingerprint(canonical(existing.definition)) !== fingerprint(canonical(definition)))
      throw new Error("Content changed under an existing form ID. Create a new version/ID.");
  }
  if (!existing) {
    const { error: insertError } = await db
      .from("assessment_forms")
      .insert({
        id: form.id,
        release_id: release.id,
        checkpoint: form.checkpoint,
        version: form.version,
        rubric_version: form.rubricVersion,
        status: "draft",
        definition,
        equivalence_group: `${content.moduleId}-draft`,
        equivalence_approved: false,
        calibrated: false,
      });
    if (insertError) throw new Error("Draft import failed.");
  }
  reports.push({
    checkpoint: form.checkpoint,
    items: form.items.length,
    status: existing ? "unchanged" : "draft_imported",
  });
}
console.log(
  JSON.stringify({ project, releaseId: content.releaseId, published: false, forms: reports }),
);
