// Built by TAC — 2026-10-23
/**
 * Lesson drift check for an exams v2 bank (design section 2, rule 9). Warns only.
 *
 *   node scripts/exams2-drift.mts /abs/path/roofing-es-en-v1.json
 *   node scripts/exams2-drift.mts --print-hashes roofing     (current hashes, for authoring)
 *
 * Compares each lesson's stored sourceHash with the current repo lesson content (title,
 * objective, words, step instructions). Prints lesson numbers and hashes only. Always exits 0
 * unless the arguments are wrong (2), so it never blocks a pipeline.
 */
import { currentSourceHashes, readPrivateBank, runCli, UsageError } from "./exams2-common.mts";

await runCli(() => {
  const args = process.argv.slice(2);
  if (args[0] === "--print-hashes") {
    const hashes = args[1] ? currentSourceHashes(args[1]) : null;
    if (!hashes) throw new UsageError("Unknown module; pass a module id such as roofing.");
    for (const [lesson, hash] of Object.entries(hashes)) console.log(`lesson ${lesson}  ${hash}`);
    return 0;
  }
  const { bank } = readPrivateBank(args[0]);
  const record = bank as { moduleId?: unknown; lessons?: unknown };
  if (typeof record.moduleId !== "string" || !Array.isArray(record.lessons))
    throw new UsageError("The file is not an exams v2 bank.");
  const current = currentSourceHashes(record.moduleId);
  if (!current) {
    console.log("drift: no repo curriculum for this module; nothing compared");
    return 0;
  }
  let changed = 0;
  let missing = 0;
  for (const entry of record.lessons as { lesson?: unknown; sourceHash?: unknown }[]) {
    if (typeof entry?.lesson !== "number") continue;
    const now = current[entry.lesson];
    if (now === undefined) {
      missing++;
      console.log(`warning  lesson ${entry.lesson}  not in the repo curriculum`);
    } else if (now !== entry.sourceHash) {
      changed++;
      console.log(`warning  lesson ${entry.lesson}  changed since the bank was written`);
    }
  }
  const compared = (record.lessons as unknown[]).length;
  console.log(`drift: ${compared} lessons compared; ${changed} changed; ${missing} missing`);
  if (changed) console.log("Review the items of the changed lessons before the next approval.");
  return 0;
});
