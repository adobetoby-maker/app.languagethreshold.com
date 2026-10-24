// Built by TAC — 2026-10-23
/// <reference types="node" />
/**
 * Validate a private exams v2 bank file (design section 2, rules 1-10).
 *
 *   node scripts/exams2-validate.mts /abs/path/roofing-es-en-v1.json [--draft] [--drift]
 *
 * --draft  validate before blind review (rule 8 not enforced)
 * --drift  also compare each lesson's sourceHash with the current repo lesson (warnings only)
 *
 * Prints ids, codes and counts only — never prompts, options, answers or explanations.
 * Exit 0 when valid, 1 when the bank has errors, 2 on a usage problem.
 */
import { bankSha256, validateBank, type ExamBank } from "../src/lib/exams2/bank.ts";
import {
  currentSourceHashes,
  formatIssue,
  readPrivateBank,
  runCli,
  summary,
} from "./exams2-common.mts";

await runCli(() => {
  const args = process.argv.slice(2);
  const path = args.find((arg) => !arg.startsWith("--"));
  const { bank } = readPrivateBank(path);
  const moduleId = (bank as { moduleId?: unknown })?.moduleId;
  const hashes =
    args.includes("--drift") && typeof moduleId === "string"
      ? currentSourceHashes(moduleId)
      : undefined;
  const result = validateBank(bank, {
    reviews: args.includes("--draft") ? "skip" : "require",
    currentSourceHashes: hashes ?? undefined,
  });
  console.log(result.ok ? "VALID" : "INVALID");
  if (result.ok) console.log(`bank sha256 ${bankSha256(bank as ExamBank)}`);
  for (const line of summary(result)) console.log(line);
  if (args.includes("--drift") && !hashes) console.log("drift: no repo curriculum for this module");
  for (const issue of result.errors) console.log(`error    ${formatIssue(issue)}`);
  for (const issue of result.warnings) console.log(`warning  ${formatIssue(issue)}`);
  return result.ok ? 0 : 1;
});
