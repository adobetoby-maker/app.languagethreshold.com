// Built by TAC — 2026-10-20
// Verb Games: builds the committed Spanish present-tense pattern data and its review report.
//
//   node scripts/build-verb-patterns.mts           # write es.json and es-review-report.md
//   node scripts/build-verb-patterns.mts --check   # exit 1 "verb patterns are stale" when a fresh compile differs
//
// Inputs: public/lesson-content/es/*.json (the `module` field is the moduleId), the dictionary
// verbProfiles, the Spanish rows of KNOWN_VERBS (the "core" list), crush-levels.json and
// docs/verb-patterns/es-review-signoff.json and the reviewed corrections in
// docs/verb-patterns/es-overrides.json. The compile itself is src/lib/verb-games/compile.ts.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verbProfiles } from "../src/components/dictionary/verbProfiles.ts";
import { KNOWN_VERBS } from "../src/data/known-verb-list.ts";
import { compilePatterns } from "../src/lib/verb-games/compile.ts";
import type { CompileInput, LessonFile } from "../src/lib/verb-games/compile.ts";

export const DATA_PATH = "src/data/verb-patterns/es.json";
export const REPORT_PATH = "docs/verb-patterns/es-review-report.md";
const SIGNOFF_PATH = "docs/verb-patterns/es-review-signoff.json";
const OVERRIDES_PATH = "docs/verb-patterns/es-overrides.json";
const CRUSH_PATH = "src/data/verb-patterns/crush-levels.json";
const LESSON_DIR = "public/lesson-content/es";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

// Core 60 stage files (foundation-*.json, master-*.json) are not modules: the Verb Games pools are
// built from Core 30 module lessons. Including stage content would make every Foundation or Master
// that ships change es.json and force a re-sign of the review report each time.
// The six stage files below were already part of the signed compile before this rule, so they stay
// in (dropping them changes es.json and voids the sign-off); no other stage file is read.
// This new course has lesson-level verb practice, but is outside the already signed global
// Verb Games pool until its additions receive a separate review. Shipping a course must not
// silently invalidate the signed pool used by every other learner.
const PENDING_REVIEW_MODULES: ReadonlySet<string> = new Set(["medical-mission-logistics"]);
const STAGE_PREFIX = /^(foundation|master)-/;
const SIGNED_STAGE_FILES: ReadonlySet<string> = new Set([
  "foundation-electrician.json",
  "foundation-nursing.json",
  "foundation-roofing.json",
  "master-electrician.json",
  "master-nursing.json",
  "master-roofing.json",
]);

/** True for a Core 60 stage lesson file the compile must skip, by file name or `module` field. */
export function isExcludedStageFile(fileName: string, moduleId?: string): boolean {
  if (SIGNED_STAGE_FILES.has(fileName)) return false;
  return STAGE_PREFIX.test(fileName) || (moduleId !== undefined && STAGE_PREFIX.test(moduleId));
}

export async function readCompileInput(root: string): Promise<CompileInput> {
  const lessonFiles: LessonFile[] = [];
  for (const name of readdirSync(path.join(root, LESSON_DIR))
    .filter((n) => n.endsWith(".json"))
    .sort()) {
    if (isExcludedStageFile(name) || PENDING_REVIEW_MODULES.has(name.replace(/\.json$/, "")))
      continue;
    const file = readJson<{ module?: string; lessons?: LessonFile["lessons"] }>(
      path.join(root, LESSON_DIR, name),
    );
    if (!file.module || !file.lessons)
      throw new Error(`${LESSON_DIR}/${name}: missing module or lessons`);
    if (isExcludedStageFile(name, file.module) || PENDING_REVIEW_MODULES.has(file.module)) continue;
    lessonFiles.push({ module: file.module, lessons: file.lessons });
  }
  const core = KNOWN_VERBS.filter((v) => v.language === "Spanish").map((v) => ({
    infinitive: v.infinitive,
    english: v.english,
  }));
  return {
    lessonFiles,
    profiles: verbProfiles,
    core,
    crushLevels: readJson(path.join(root, CRUSH_PATH)),
    signoff: readJson(path.join(root, SIGNOFF_PATH)),
    overrides: readJson(path.join(root, OVERRIDES_PATH)),
  };
}

/** Compact JSON, no indent (F24). */
function serialize(data: unknown): string {
  return JSON.stringify(data);
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const out = compilePatterns(await readCompileInput(root));
  const json = serialize(out.data);
  const dataFile = path.join(root, DATA_PATH);
  const reportFile = path.join(root, REPORT_PATH);

  if (process.argv.includes("--check")) {
    let onDisk: { data: string; report: string } | null = null;
    try {
      onDisk = { data: readFileSync(dataFile, "utf8"), report: readFileSync(reportFile, "utf8") };
    } catch {
      onDisk = null;
    }
    if (!onDisk || onDisk.data !== json || onDisk.report !== out.reportMarkdown) {
      console.error(
        "verb patterns are stale: run `node scripts/build-verb-patterns.mts` and commit the result",
      );
      process.exit(1);
    }
    console.log(
      `verb patterns are current (${out.data.verbs.length} verbs, signedOff=${out.data.signedOff})`,
    );
    return;
  }

  writeFileSync(dataFile, json);
  writeFileSync(reportFile, out.reportMarkdown);
  const counts: Record<string, number> = {};
  for (const item of out.report) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  console.log(
    `wrote ${DATA_PATH} (${Buffer.byteLength(json)} bytes, ${out.data.verbs.length} verbs, signedOff=${out.data.signedOff}) and ${REPORT_PATH}`,
  );
  console.log(`review items: ${JSON.stringify(counts)}`);
}

if (import.meta.main) await main();
