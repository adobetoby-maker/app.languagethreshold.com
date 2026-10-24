// Built by TAC — 2026-10-23
/**
 * Import a private exams v2 bank into `exam_banks` as a draft (service role).
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/exams2-import.mjs /abs/path/roofing-es-en-v1.json [--allow-unreviewed] [--dry-run]
 *
 * - Refuses relative paths and paths inside this repository (or its main checkout).
 * - Validates the bank first (rules 1-10); --allow-unreviewed skips rule 8 for an early draft.
 * - Idempotent by (module, target, instruction language, version) + content sha256:
 *   no row -> insert draft; same sha and reviews -> no change; changed draft -> update in place.
 * - Never overwrites an approved or retired bank. Approval happens only in the owner UI.
 * - Prints ids, counts, the sha256 and the action. Never prints item content or credentials.
 *
 * Owner-run only. Agents must not point this at a real database.
 */
import { pathToFileURL } from "node:url";
import { bankContent, bankSha256, validateBank } from "../src/lib/exams2/bank.ts";
import { canonicalJson } from "../src/lib/exams2/hash.ts";

/**
 * Decide what to do with a bank given the row already stored for its key (or null).
 * Pure, so the rules are unit-tested without a database.
 */
export function planImport(existing, sha, reviews) {
  const sameReviews = (stored) => canonicalJson(stored ?? []) === canonicalJson(reviews ?? []);
  if (!existing) return { action: "insert" };
  if (existing.status !== "draft") {
    if (existing.content_sha256 === sha && sameReviews(existing.review_records))
      return { action: "noop", reason: `already ${existing.status} with this sha256` };
    return {
      action: "refuse",
      reason: `a ${existing.status} bank is never overwritten; bump the version`,
    };
  }
  if (existing.content_sha256 === sha && sameReviews(existing.review_records))
    return { action: "noop", reason: "draft already stored with this sha256 and reviews" };
  return { action: "update", reason: "draft content or reviews changed" };
}

async function main() {
  const { readPrivateBank, formatIssue, summary, runCli, UsageError } =
    await import("./exams2-common.mts");
  await runCli(async () => {
    const args = process.argv.slice(2);
    const { bank } = readPrivateBank(args.find((arg) => !arg.startsWith("--")));
    const result = validateBank(bank, {
      reviews: args.includes("--allow-unreviewed") ? "skip" : "require",
    });
    for (const line of summary(result)) console.log(line);
    if (!result.ok) {
      for (const issue of result.errors) console.log(`error    ${formatIssue(issue)}`);
      console.log("Not imported: fix the errors above and run again.");
      return 1;
    }
    const sha = bankSha256(bank);
    const key = {
      module_id: bank.moduleId,
      target_language: bank.targetLanguage,
      instruction_language: bank.instructionLanguage,
      version: bank.version,
    };
    console.log(
      `bank ${key.module_id} ${key.target_language}/${key.instruction_language} ${key.version}  sha256 ${sha}`,
    );
    if (args.includes("--dry-run")) {
      console.log("dry run: valid; no database contacted");
      return 0;
    }
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey || !/^https?:\/\//.test(url))
      throw new UsageError(
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (values are never printed).",
      );
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const table = () => db.from("exam_banks");
    const match = (query) =>
      query
        .eq("module_id", key.module_id)
        .eq("target_language", key.target_language)
        .eq("instruction_language", key.instruction_language)
        .eq("version", key.version);
    const { data: existing, error: readError } = await match(
      table().select("status,content_sha256,review_records"),
    ).maybeSingle();
    if (readError) {
      console.error(`Bank storage could not be read (${readError.code ?? "no code"}).`);
      return 1;
    }
    const plan = planImport(existing, sha, bank.reviews);
    const content = bankContent(bank);
    if (plan.action === "noop") {
      console.log(`no change: ${plan.reason}`);
      return 0;
    }
    if (plan.action === "refuse") {
      console.error(`refused: ${plan.reason}`);
      return 1;
    }
    if (plan.action === "insert") {
      const { error } = await table().insert({
        ...key,
        status: "draft",
        content,
        content_sha256: sha,
        review_records: bank.reviews ?? [],
      });
      if (error) {
        console.error(`Insert failed (${error.code ?? "no code"}).`);
        return 1;
      }
      console.log("inserted as draft");
      return 0;
    }
    // Update only the exact draft we inspected, so a concurrent approval is never overwritten.
    const { data: updated, error } = await match(
      table().update({ content, content_sha256: sha, review_records: bank.reviews ?? [] }),
    )
      .eq("status", "draft")
      .eq("content_sha256", existing.content_sha256)
      .select("version");
    if (error) {
      console.error(`Update failed (${error.code ?? "no code"}).`);
      return 1;
    }
    if (!updated?.length) {
      console.error("refused: the stored bank changed while importing; inspect it and run again");
      return 1;
    }
    console.log(`updated draft (${plan.reason})`);
    return 0;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
