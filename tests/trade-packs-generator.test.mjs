import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseTradePack, validateWordMatchSection } from "../src/lib/trade-packs.ts";
import {
  validateConjugationSection,
  validateSentenceBuildSection,
} from "../src/lib/trade-pack-rules-core.ts";

// Runs scripts/build-trade-packs.mts against a stand-in for the `claude` CLI
// (tests/fixtures/stub-claude-trade-packs.mjs), writing under a temp --out-root. No network,
// no model, no repository file is touched.

const STUB = new URL("./fixtures/stub-claude-trade-packs.mjs", import.meta.url).pathname;
chmodSync(STUB, 0o755);

function run(root, args, env = {}) {
  const result = spawnSync(
    process.execPath,
    ["scripts/build-trade-packs.mts", "--out-root", root, "--claude-bin", STUB, ...args],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: 120_000,
    },
  );
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

const tmp = () => mkdtempSync(join(tmpdir(), "trade-packs-test-"));
const packFile = (root) => join(root, "public", "trade-packs", "es", "roofing.json");

test("the generator builds a pack that validates, indexes it, and skips a valid one next time", () => {
  const root = tmp();
  try {
    const first = run(root, ["--module", "roofing"]);
    assert.equal(first.code, 0, first.out);
    assert.match(first.out, /FINAL published 1\/1/);

    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
    assert.equal(raw.wordMatch.boards.length, 36);
    assert.equal(raw.reviewed, false);
    assert.ok(parseTradePack(raw, { moduleId: "roofing", language: "Spanish" }));

    const index = JSON.parse(
      readFileSync(join(root, "public", "trade-packs", "index.json"), "utf8"),
    );
    assert.equal(index.packs.length, 1);
    assert.deepEqual(index.packs[0].wordMatchBoards, { 1: 12, 2: 12, 3: 12 });
    assert.equal(index.packs[0].bytes, Buffer.byteLength(readFileSync(packFile(root), "utf8")));
    assert.ok(existsSync(join(root, ".trade-packs-progress", "es", "roofing.wordmatch.json")));

    const second = run(root, ["--module", "roofing"]);
    assert.equal(second.code, 0, second.out);
    assert.match(second.out, /published section is valid, nothing to do/);
    assert.doesNotMatch(second.out, /roofing wordmatch L/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a board with a repeated word is rejected and asked for again", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing"], { STUB_MODE: "dupes" });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /same target word/);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a pair with the same word on both faces is rejected and asked for again", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing"], { STUB_MODE: "identical" });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /both faces are the same word/);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a level 3 board padded with A1 words is rejected and asked for again", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing"], { STUB_MODE: "a1" });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /A1 everyday words: hoy, trabajo/);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
    assert.equal(
      raw.wordMatch.boards.some((b) => b.pairs.some((p) => p.target === "hoy")),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("boards saved by an earlier run are re-checked on resume and replaced when they break a rule", () => {
  const root = tmp();
  try {
    const first = run(root, ["--module", "roofing"]);
    assert.equal(first.code, 0, first.out);
    const progressPath = join(root, ".trade-packs-progress", "es", "roofing.wordmatch.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    // a saved level 2 board with a slash, and a level 3 board with identical faces
    progress.boards.find((b) => b.level === 2).pairs[0].target = "cubierta / forro";
    progress.boards.find((b) => b.level === 3).pairs[0] = { target: "fascia", english: "Fascia" };
    writeFileSync(progressPath, JSON.stringify(progress));
    rmSync(join(root, "public"), { recursive: true });
    const log = join(root, "calls.log");
    const again = run(root, ["--module", "roofing", "--resume"], { STUB_LOG: log });
    assert.equal(again.code, 0, again.out);
    assert.match(again.out, /L1 12\/12\s+L2 11\/12\s+L3 11\/12/);
    assert.equal(
      readFileSync(log, "utf8").trim().split("\n").length,
      2,
      "one call per level that lost a board",
    );
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--resume continues from saved boards and asks only for what is missing", () => {
  const root = tmp();
  try {
    const first = run(root, ["--module", "roofing"]);
    assert.equal(first.code, 0, first.out);
    // forget the published pack but keep the progress: nothing is missing, so no call is made
    rmSync(join(root, "public"), { recursive: true });
    const log = join(root, "calls.log");
    const again = run(root, ["--module", "roofing", "--resume"], { STUB_LOG: log });
    assert.equal(again.code, 0, again.out);
    assert.equal(existsSync(log), false, "no model call was needed");
    assert.match(again.out, /L1 12\/12\s+L2 12\/12\s+L3 12\/12/);
    assert.ok(existsSync(packFile(root)));

    // lose the level 3 boards: only level 3 is asked for (2 calls of 6), levels 1 and 2 are kept
    const progressPath = join(root, ".trade-packs-progress", "es", "roofing.wordmatch.json");
    const progress = JSON.parse(readFileSync(progressPath, "utf8"));
    const kept = progress.boards.filter((board) => board.level !== 3);
    progress.boards = kept;
    writeFileSync(progressPath, JSON.stringify(progress));
    rmSync(join(root, "public"), { recursive: true });
    const partial = run(root, ["--module", "roofing", "--resume"], { STUB_LOG: log });
    assert.equal(partial.code, 0, partial.out);
    assert.match(partial.out, /L1 12\/12\s+L2 12\/12\s+L3 0\/12/);
    assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 2);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
    for (const board of kept) {
      assert.ok(
        raw.wordMatch.boards.some((item) => item.topic === board.topic),
        "kept board is still in the pack",
      );
    }

    // --force ignores the saved boards and rebuilds
    const forced = run(root, ["--module", "roofing", "--force"]);
    assert.equal(forced.code, 0, forced.out);
    assert.match(forced.out, /L1 0\/12\s+L2 0\/12\s+L3 0\/12/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--dry-run calls nothing and writes nothing", () => {
  const root = tmp();
  try {
    const log = join(root, "calls.log");
    const result = run(root, ["--module", "roofing", "--dry-run"], { STUB_LOG: log });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /Dry run: ~6 model call/);
    assert.equal(existsSync(log), false);
    assert.equal(existsSync(join(root, "public")), false);
    assert.equal(existsSync(join(root, ".trade-packs-progress")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("only the subscription CLI provider is accepted, never an API key", () => {
  const root = tmp();
  try {
    const api = run(root, ["--module", "roofing", "--provider", "api", "--dry-run"], {
      ANTHROPIC_API_KEY: "must-not-be-used",
    });
    assert.equal(api.code, 2);
    assert.match(api.out, /never with an API key/);
    assert.doesNotMatch(api.out, /must-not-be-used/);
    assert.equal(run(root, ["--dry-run"]).code, 2, "--module is required");
    assert.equal(run(root, ["--module", "nope", "--dry-run"]).code, 2, "unknown module");
    assert.equal(
      run(root, ["--module", "roofing", "--area", "grammar", "--dry-run"]).code,
      2,
      "unsupported area",
    );
    assert.equal(
      run(root, ["--module", "roofing", "--lang", "fr", "--dry-run"]).code,
      2,
      "unsupported language",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a refused login stops the run without publishing", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing"], { STUB_MODE: "auth" });
    assert.notEqual(result.code, 0);
    assert.match(result.out, /login was refused/);
    assert.equal(existsSync(packFile(root)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── Sentence Builder and Conjugation ────────────────────────────────────────

const lessonVerbs = new Set(
  Object.values(JSON.parse(readFileSync(new URL("../public/lesson-content/es/roofing.json", import.meta.url), "utf8")).lessons)
    .flatMap((lesson) => (lesson.verbs ?? []).map((verb) => verb.infinitive.toLocaleLowerCase())),
);

test("the generator builds sentence and conjugation sections next to a Word Match section it keeps", () => {
  const root = tmp();
  try {
    assert.equal(run(root, ["--module", "roofing"]).code, 0);
    const boards = JSON.parse(readFileSync(packFile(root), "utf8")).wordMatch.boards;
    const result = run(root, ["--module", "roofing", "--area", "sentence,conjugation"]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /FINAL published 2\/2/);
    assert.match(result.out, /review calls \d+/);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.deepEqual(raw.wordMatch.boards, boards, "the Word Match section is kept as it was");
    assert.deepEqual(validateSentenceBuildSection(raw.sentenceBuild.items, { moduleId: "roofing", language: "Spanish" }), []);
    assert.deepEqual(validateConjugationSection(raw.conjugation.items, { moduleId: "roofing", verbs: lessonVerbs }), []);
    assert.equal(raw.sentenceBuild.items.length, 120);
    assert.equal(raw.conjugation.items.length, 96);
    assert.ok(raw.sentenceBuild.items.every((item) => !("scrambled" in item)), "scrambled is made at pick time");
    const file = parseTradePack(raw, { moduleId: "roofing", language: "Spanish" });
    assert.equal(file.sentenceBuild.items.length, 120);
    assert.equal(file.conjugation.items.length, 96);

    const index = JSON.parse(readFileSync(join(root, "public", "trade-packs", "index.json"), "utf8")).packs[0];
    assert.deepEqual(index.areas, ["wordMatch", "sentenceBuild", "conjugation"]);
    assert.deepEqual(index.sentenceBuildItems, { 1: 40, 2: 40, 3: 40 });
    assert.deepEqual(index.conjugationItems, {
      1: { tense: 12, person: 12, number: 12 },
      2: { tense: 12, person: 12, mood: 12 },
      3: { mixed: 24 },
    });
    assert.ok(existsSync(join(root, ".trade-packs-progress", "es", "roofing.sentence.json")));
    assert.ok(existsSync(join(root, ".trade-packs-progress", "es", "roofing.conjugation.json")));

    const again = run(root, ["--module", "roofing", "--area", "all"]);
    assert.equal(again.code, 0, again.out);
    assert.equal((again.out.match(/published section is valid, nothing to do/g) ?? []).length, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a vosotros sentence or question is rejected and asked for again", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing", "--area", "sentence,conjugation"], { STUB_MODE: "vosotros" });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /vosotros \(revisáis\); use ustedes/);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    assert.equal(JSON.stringify(raw).includes("revisáis"), false);
    assert.deepEqual(validateSentenceBuildSection(raw.sentenceBuild.items, { moduleId: "roofing", language: "Spanish" }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a conjugation question the independent review finds ambiguous is never published", () => {
  const root = tmp();
  try {
    const log = join(root, "calls.log");
    const result = run(root, ["--module", "roofing", "--area", "conjugation"], { STUB_MODE: "review-reject", STUB_LOG: log });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /failed the independent review: acceptable answers/);
    const rejected = Number(/review-gate rejections (\d+)/.exec(result.out)[1]);
    assert.ok(rejected >= 7, `${rejected} rejections (one per review call)`);
    const raw = JSON.parse(readFileSync(packFile(root), "utf8"));
    // the stub's tricky question is always the first of a call: its id ends in "aa"
    assert.equal(raw.conjugation.items.some((item) => /aa aquí/.test(item.phrase)), false);
    assert.deepEqual(validateConjugationSection(raw.conjugation.items, { moduleId: "roofing", verbs: lessonVerbs }), []);
    const progress = JSON.parse(readFileSync(join(root, ".trade-packs-progress", "es", "roofing.conjugation.json"), "utf8"));
    assert.equal(progress.reviewRejected, rejected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--dry-run counts a review call for every conjugation batch", () => {
  const root = tmp();
  try {
    const result = run(root, ["--module", "roofing", "--area", "conjugation", "--dry-run"]);
    assert.equal(result.code, 0, result.out);
    // 6 pools of 12 (2 batches of 8) + one of 24 (3 batches), each batch 2 calls
    assert.match(result.out, /Dry run: ~30 model call/);
    assert.equal(run(root, ["--module", "roofing", "--area", "sentence,nope", "--dry-run"]).code, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
