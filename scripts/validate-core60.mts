// Built by TAC — 2026-10-19
// Validates the Core 60 stage data: the manifest (src/data/core60/manifest.ts) and every stage file
// it lists (src/data/core60/<langCode>/<stage>-<base>.json), with the rules in
// src/lib/core60-validate.ts. Read-only; exits 1 when anything is invalid.
//
//   node scripts/validate-core60.mts            # the shipped manifest and its files
//   node scripts/validate-core60.mts --file <path.json> [--file <path.json> ...]
//   node scripts/validate-core60.mts --fixture  # tests/fixtures/core60 (stage files only)
//   node scripts/validate-core60.mts --strict   # also fail when a stage has no lesson-content file
//
// Passages and verbs of a stage live in public/lesson-content/<langCode>/<id>.json like every
// other module; without --strict a missing one is a warning (the lesson page falls back).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CURRICULA } from "../src/data/curriculum.ts";
import { HANDWRITTEN_MODULES } from "../src/data/modules.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";
import {
  stageFileRelativePath,
  stageModuleId,
  type Core60StageKind,
} from "../src/lib/core60-stage-core.ts";
import { validateManifest, validateStageFile } from "../src/lib/core60-validate.ts";

const STAGE_ROOT = resolve("src/data/core60");
const FIXTURE_ROOT = resolve("tests/fixtures/core60");
const CONTENT_ROOT = resolve("public/lesson-content");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const files = args.flatMap((arg, i) => (arg === "--file" && args[i + 1] ? [args[i + 1]] : []));

let errorCount = 0;
let warningCount = 0;
const report = (label: string, errors: string[]) => {
  for (const error of errors) console.error(`  ✗ ${label}: ${error}`);
  errorCount += errors.length;
};
const warn = (label: string, message: string) => {
  console.warn(`  ! ${label}: ${message}`);
  warningCount += 1;
};

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { __unreadable: (error as Error).message };
  }
}

function checkFile(path: string, expected: Parameters<typeof validateStageFile>[1] = {}) {
  const raw = readJson(path);
  const errors =
    raw && typeof raw === "object" && "__unreadable" in raw
      ? [`not readable JSON (${(raw as { __unreadable: string }).__unreadable})`]
      : validateStageFile(raw, expected);
  report(path, errors);
  if (errors.length === 0) console.log(`  ✓ ${path}`);
}

function stageFilesUnder(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .flatMap((dir) =>
      readdirSync(join(root, dir.name))
        .filter((name) => name.endsWith(".json"))
        .map((name) => `${dir.name}/${name}`),
    );
}

if (files.length > 0) {
  console.log(`Core 60: validating ${files.length} file(s)`);
  for (const file of files) checkFile(resolve(file));
} else if (args.includes("--fixture")) {
  console.log("Core 60: validating the test fixture");
  for (const relative of stageFilesUnder(FIXTURE_ROOT)) checkFile(join(FIXTURE_ROOT, relative));
} else {
  console.log(`Core 60: validating the manifest (${CORE60_MANIFEST.length} trade(s))`);
  report(
    "manifest",
    validateManifest(CORE60_MANIFEST, HANDWRITTEN_MODULES, (id) => Boolean(CURRICULA[id])),
  );
  const listed = new Set<string>();
  for (const entry of CORE60_MANIFEST) {
    for (const stage of ["foundation", "master"] as Core60StageKind[]) {
      if (!entry[stage]) continue;
      const moduleId = stageModuleId(stage, entry.base);
      const relative = stageFileRelativePath(entry.language, moduleId);
      listed.add(relative);
      const path = join(STAGE_ROOT, relative);
      if (!existsSync(path)) {
        report(moduleId, [`listed in the manifest but ${path} does not exist`]);
        continue;
      }
      checkFile(path, { moduleId, stage, language: entry.language });
      const content = join(CONTENT_ROOT, relative);
      if (!existsSync(content)) {
        if (strict) report(moduleId, [`no lesson content (passages, verbs) at ${content}`]);
        else warn(moduleId, `no lesson content (passages, verbs) at ${content} yet`);
      }
    }
  }
  for (const relative of stageFilesUnder(STAGE_ROOT)) {
    if (!listed.has(relative))
      report(relative, ["stage file is not listed in src/data/core60/manifest.ts"]);
  }
}

console.log(
  errorCount === 0
    ? `Core 60: OK${warningCount ? ` (${warningCount} warning(s))` : ""}`
    : `Core 60: ${errorCount} error(s)`,
);
process.exit(errorCount === 0 ? 0 : 1);
