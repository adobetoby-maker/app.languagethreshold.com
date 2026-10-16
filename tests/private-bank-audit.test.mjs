import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

test("the release audit rejects untracked and public CSV leaks without printing content", () => {
  const root = mkdtempSync(join(tmpdir(), "lt-private-audit-"));
  try {
    const repo = join(root, "repo");
    mkdirSync(repo);
    mkdirSync(join(repo, ".vercel/output/static"), { recursive: true });
    mkdirSync(join(repo, "docs/reviews"), { recursive: true });
    writeFileSync(join(repo, ".gitignore"), ".vercel/\nignored-private.txt\n");
    const verifier = join(repo, "verify.mjs");
    writeFileSync(verifier, readFileSync(resolve("scripts/qa/verify-private-bank-absence.mjs")));
    execFileSync("git", ["init", "--quiet"], { cwd: repo });
    execFileSync("git", ["add", ".gitignore", "verify.mjs"], { cwd: repo });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=QA Fixture",
        "-c",
        "user.email=qa@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "Synthetic audit fixture",
      ],
      { cwd: repo },
    );
    // All question content here is synthetic, outside the actual app checkout and private bank.
    const itemId = "synthetic-audit-item-1",
      prompt =
        "This deliberately synthetic audit prompt tests that an unpublished question cannot slip into public release files before commit.";
    const bank = join(root, "synthetic-bank.json");
    writeFileSync(bank, JSON.stringify({ forms: [{ items: [{ id: itemId, prompt }] }] }));
    writeFileSync(
      join(repo, ".vercel/output/static/index.html"),
      "<html>Public lesson shell</html>",
    );
    const audit = () =>
      spawnSync(process.execPath, [verifier, bank], { cwd: repo, encoding: "utf8" });
    const rejectWithoutContent = () => {
      const result = audit();
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Release blocked/);
      assert.equal(result.stdout.includes(prompt), false);
      assert.equal(result.stderr.includes(prompt), false);
    };
    const untracked = join(repo, "new-release-content.txt");
    writeFileSync(untracked, prompt);
    rejectWithoutContent();
    rmSync(untracked);
    const csv = join(repo, ".vercel/output/static/answer-keys.csv");
    writeFileSync(csv, `item,prompt\n${itemId},${prompt}\n`);
    rejectWithoutContent();
    rmSync(csv);
    writeFileSync(join(repo, "ignored-private.txt"), prompt);
    const clean = audit();
    assert.equal(clean.status, 0);
    assert.equal(JSON.parse(clean.stdout).privateContentHits, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
