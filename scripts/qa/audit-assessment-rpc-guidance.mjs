/** Source/probe inventory, not a SQL parser or hosted-function parity claim. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { assessmentRpcGuidance } from "../../src/lib/assessments/rpc-errors.ts";
function extract(source) {
  const all = [...source.matchAll(/\braise\s+exception\b/gi)];
  const fixed = [...source.matchAll(/\braise\s+exception\s+'((?:''|[^'])*)'\s*;/gi)];
  assert.equal(
    fixed.length,
    all.length,
    "Review non-fixed or differently written RAISE before changing guidance",
  );
  return fixed.map((m) => ({
    message: m[1].replaceAll("''", "'"),
    line: source.slice(0, m.index).split("\n").length,
  }));
}
if (process.argv.includes("--self-test")) {
  assert.deepEqual(extract("raise exception 'Don''t retry';"), [
    { message: "Don't retry", line: 1 },
  ]);
  for (const source of [
    "raise exception 'Private %', value;",
    "raise exception using message=private_text;",
    "raise exception format('Private %s', value);",
  ])
    assert.throws(() => extract(source));
  console.log(
    JSON.stringify({ fixedLiteralAndEscapedQuote: true, dynamicFormatAndUsingRejected: true }),
  );
} else {
  const files = [],
    rows = [];
  for (const name of readdirSync("supabase/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    const path = `supabase/migrations/${name}`,
      source = readFileSync(path, "utf8");
    if (!source.includes("assessment_")) continue;
    const found = extract(source);
    files.push({
      path,
      sha256: createHash("sha256").update(source).digest("hex"),
      fixedRaiseSites: found.length,
    });
    for (const row of found) rows.push({ ...row, path });
  }
  const messages = [...new Set(rows.map((r) => r.message))].sort();
  assert.equal(files.length, 27);
  assert.equal(rows.length, 342);
  assert.equal(messages.length, 227);
  const guidance = messages.map((message) => {
    const status = /access required|confirmation required/.test(message)
      ? 403
      : /conflict|reused|already|immutable|Speech upload expired/.test(message)
        ? 409
        : 400;
    assert.deepEqual(assessmentRpcGuidance(message), { message, status });
    return {
      message,
      status,
      sites: rows.filter((r) => r.message === message).map(({ path, line }) => ({ path, line })),
    };
  });
  const output = execFileSync(
    process.execPath,
    ["--test", "tests/assessment-rpc-errors.test.mjs"],
    { encoding: "utf8" },
  );
  assert.match(output, /tests 4\b/);
  assert.match(output, /pass 4\b/);
  assert.match(output, /fail 0\b/);
  const report = {
    auditedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    scan: {
      assessmentRelatedMigrationFiles: files.length,
      fixedRaiseSites: rows.length,
      uniqueFixedMessages: messages.length,
      statusCounts: Object.fromEntries(
        [400, 403, 409].map((status) => [
          status,
          guidance.filter((x) => x.status === status).length,
        ]),
      ),
      actualHelperTestGroups: 4,
    },
    checks: {
      allKnownMessagesAndPriorStatusesMatch: true,
      unknownP0001DiagnosticsUseFixed503: true,
      exactMatchRejectsPrefixesSuffixesCaseAndHiddenCharacters: true,
      malformedOrNonStringMessageRejectedWithoutCoercion: true,
      duplicate23505AndOtherCodesRemainFixed: true,
      successfulResultIdentityPreserved: true,
      lookupProjectionCannotMutateRegistry: true,
    },
    files,
    guidance,
    limits: [
      "Regex candidate extraction from all local migration files containing assessment_. All342 observed RAISE EXCEPTION sites fit fixed literal syntax; this is not a full SQL lexer/parser, live catalog verification or runtime reachability proof. Comments/embedded text, retired definitions and non-assessment functions in these files can be included.",
      "Registry is an explicit union of227 safe fixed strings, including historical definitions; runtime accepts only exact strings. Audit fails on new/unrecognized guidance or differently written/dynamic RAISE candidates; it does not auto-add messages. This preserves the old status selection for these known strings, not human linguistic/content approval.",
      "Actual rpc helper tests use controlled DB results and synthetic private markers, no actual database/provider/credential/browser/role/review/consent/qualification operation. Promise rejection, direct db.rpc callers, other typed errors and later private phases remain separate.",
      "No immutable migration/schema/grant/role/policy/schedule changes, main push, production promotion or accepted-hostname advance. Original cleanup auth caller and broader endpoint/cache/device/release gates remain open.",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-assessment-rpc-guidance-2026-10-18.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report.scan));
}
