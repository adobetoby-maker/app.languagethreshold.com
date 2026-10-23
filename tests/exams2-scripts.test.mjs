// Built by TAC — 2026-10-23
// Exams v2 authoring scripts: path refusal, content-free output, drift warnings and the import
// decision rules. Synthetic banks only, written to a temporary directory outside the repository.
// No test contacts a real database: the one networked case points at a closed local port.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { planImport } from "../scripts/exams2-import.mjs";
import { bankSha256 } from "../src/lib/exams2/bank.ts";
import { buildSyntheticBank, clone } from "./fixtures/exams2-synthetic-bank.mjs";

const dir = mkdtempSync(join(tmpdir(), "exams2-test-"));
test.after(() => rmSync(dir, { recursive: true, force: true }));
const BANK = buildSyntheticBank();
const write = (name, value) => {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
};
const VALID = write("valid.json", BANK);
const run = (script, args, env = {}) => {
  const result = spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });
  return { code: result.status, out: result.stdout + result.stderr };
};
/** Every piece of authored text in a bank: none of it may appear in script output. */
function contentStrings(bank) {
  const out = [];
  for (const item of bank.items) {
    out.push(item.prompt, item.explanation);
    for (const option of item.options ?? []) out.push(option.text, option.distractorRationale);
    out.push(...(item.accepted ?? []));
    for (const pair of item.pairs ?? []) out.push(pair.left, pair.right);
  }
  out.push(...bank.lessons.map((lesson) => lesson.title));
  return out.filter(Boolean);
}
const assertNoContent = (out, bank = BANK) => {
  for (const text of contentStrings(bank))
    assert.ok(!out.includes(text), "script printed bank content");
};

test("validate: a valid private bank prints VALID, the sha and counts only", () => {
  const { code, out } = run("exams2-validate.mts", [VALID]);
  assert.equal(code, 0, out);
  assert.match(out, /^VALID/);
  assert.ok(out.includes(`bank sha256 ${bankSha256(BANK)}`));
  assert.match(out, /forms A 30, B 30, C 60; diagnostic pool 180; reviews 2/);
  assertNoContent(out);
});

test("validate: an invalid bank exits 1 with rule codes and ids, never content", () => {
  const broken = clone(BANK);
  broken.items[0].explanation = "short";
  broken.items.find((item) => item.type === "mc" && item.id !== broken.items[0].id).options.pop();
  broken.reviews = [];
  const { code, out } = run("exams2-validate.mts", [write("broken.json", broken)]);
  assert.equal(code, 1);
  assert.match(out, /INVALID/);
  assert.match(out, /rule 1 {2}item\.explanation {2}item roofing\.L01\.i01/);
  assert.match(out, /rule 2 {2}mc\.option_count/);
  assert.match(out, /rule 8 {2}reviews\.too_few/);
  assertNoContent(out, broken);
  // The same draft passes before review.
  const draft = clone(BANK);
  draft.reviews = [];
  assert.equal(run("exams2-validate.mts", [write("draft.json", draft), "--draft"]).code, 0);
});

test("validate and import refuse relative paths and paths inside the repository", () => {
  for (const script of ["exams2-validate.mts", "exams2-import.mjs", "exams2-drift.mts"]) {
    const relative = run(script, ["tests/fixtures/exams2-synthetic-bank.mjs"]);
    assert.equal(relative.code, 2, `${script}: ${relative.out}`);
    const inside = run(script, [join(process.cwd(), "package.json")]);
    assert.equal(inside.code, 2, `${script}: ${inside.out}`);
    assert.match(inside.out, /outside the repository/);
  }
  assert.equal(run("exams2-validate.mts", [join(dir, "missing.json")]).code, 2);
});

test("drift: warns per changed lesson, never fails; prints current hashes for authoring", () => {
  const { code, out } = run("exams2-drift.mts", [VALID]);
  assert.equal(code, 0);
  assert.match(out, /drift: 30 lessons compared; 30 changed; 0 missing/);
  assertNoContent(out);
  const hashes = run("exams2-drift.mts", ["--print-hashes", "roofing"]);
  assert.equal(hashes.code, 0);
  const lines = hashes.out.trim().split("\n");
  assert.equal(lines.length, 30);
  assert.ok(lines.every((line) => /^lesson \d+ {2}[0-9a-f]{64}$/.test(line)));
  // A bank whose lessons carry the current hashes shows no drift.
  const current = clone(BANK);
  for (const line of lines) {
    const [, lesson, hash] = line.match(/^lesson (\d+) {2}([0-9a-f]{64})$/);
    current.lessons[Number(lesson) - 1].sourceHash = hash;
  }
  assert.match(
    run("exams2-drift.mts", [write("current.json", current)]).out,
    /30 lessons compared; 0 changed/,
  );
  assert.equal(run("exams2-drift.mts", ["--print-hashes", "no-such-module"]).code, 2);
});

test("import: validates first, needs env credentials, never prints them or content", () => {
  const dry = run("exams2-import.mjs", [VALID, "--dry-run"]);
  assert.equal(dry.code, 0, dry.out);
  assert.match(dry.out, /dry run: valid; no database contacted/);
  assertNoContent(dry.out);

  const draft = clone(BANK);
  draft.reviews = [];
  const unreviewed = write("unreviewed.json", draft);
  assert.equal(
    run("exams2-import.mjs", [unreviewed, "--dry-run"]).code,
    1,
    "reviews required by default",
  );
  assert.equal(run("exams2-import.mjs", [unreviewed, "--dry-run", "--allow-unreviewed"]).code, 0);

  const noEnv = run("exams2-import.mjs", [VALID]);
  assert.equal(noEnv.code, 2);
  assert.match(noEnv.out, /Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);

  // A closed local port: the import fails to read storage and still prints no secret.
  const secret = "test-service-role-sentinel-0000";
  const closed = run("exams2-import.mjs", [VALID], {
    SUPABASE_URL: "http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY: secret,
  });
  assert.equal(closed.code, 1, closed.out);
  assert.ok(!closed.out.includes(secret), "service role key printed");
  assert.ok(!closed.out.includes("127.0.0.1:9"), "database URL printed");
  assertNoContent(closed.out);
});

test("planImport: insert, idempotent no-op, draft update, never overwrite approved", () => {
  const sha = "a".repeat(64);
  const reviews = BANK.reviews;
  assert.equal(planImport(null, sha, reviews).action, "insert");
  const draft = { status: "draft", content_sha256: sha, review_records: clone(reviews) };
  assert.equal(planImport(draft, sha, reviews).action, "noop");
  assert.equal(planImport(draft, "b".repeat(64), reviews).action, "update");
  assert.equal(planImport(draft, sha, [reviews[0]]).action, "update", "new reviews update a draft");
  const approved = { ...draft, status: "approved" };
  assert.equal(planImport(approved, sha, reviews).action, "noop");
  assert.equal(planImport(approved, "b".repeat(64), reviews).action, "refuse");
  assert.equal(planImport(approved, sha, []).action, "refuse");
  assert.equal(
    planImport({ ...draft, status: "retired" }, "b".repeat(64), reviews).action,
    "refuse",
  );
});
