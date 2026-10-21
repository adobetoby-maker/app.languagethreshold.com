// Built by TAC — 2026-10-20
// The run rules of scripts/build-lesson-content.mts: --lessons parsing and checks, which lessons a
// run calls (missing vs forced), the cli / api provider choice, and that the cli provider needs no
// API key and scrubs it from the child's environment. The CLI is a fake script and nothing touches
// the network; the script itself is only run with --dry-run or with flags that fail before any call.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cliEnv, runClaudeCli } from "../src/lib/claude-cli-runner.ts";
import { cliJsonSchema, cliPrompt, parseCliOutput } from "../src/lib/core60-generator-core.ts";
import {
  LESSON_CONTENT_TOOL_NAME,
  buildLessonContentRequest,
  lessonContentCliSystemPrompt,
  lessonContentFromResponse,
} from "../src/lib/lesson-content-prompt.ts";
import {
  LessonSelectionError,
  MAX_LESSON_NUMBER,
  RunFlagError,
  checkLessonSelection,
  createPairSettlement,
  formatLessonList,
  formatRerunCommand,
  noObjectRetryMessage,
  parseLessonSelection,
  resolveRunProvider,
  selectLessons,
} from "../src/lib/lesson-content-run-core.ts";

// ─── --lessons parsing ───────────────────────────────────────────────────────

test("parseLessonSelection reads numbers, ranges and mixes, sorted and unique", () => {
  assert.deepEqual(parseLessonSelection("7"), [7]);
  assert.deepEqual(parseLessonSelection("11-15"), [11, 12, 13, 14, 15]);
  assert.deepEqual(parseLessonSelection("3,7,11-15"), [3, 7, 11, 12, 13, 14, 15]);
  assert.deepEqual(parseLessonSelection(" 15 , 3 , 3-4 "), [3, 4, 15]);
  assert.deepEqual(parseLessonSelection("4-4"), [4]);
});

test("parseLessonSelection rejects an empty list", () => {
  for (const raw of [undefined, "", "   "]) {
    assert.throws(
      () => parseLessonSelection(raw),
      (error) => {
        assert.ok(error instanceof LessonSelectionError);
        assert.match(error.message, /--lessons needs a list/);
        return true;
      },
    );
  }
});

test("parseLessonSelection rejects non-numeric values with a clear error", () => {
  for (const raw of ["abc", "1,x", "1;2", "1.5", "-3", "2-", "1-2-3", "all", "3,,4"]) {
    assert.throws(
      () => parseLessonSelection(raw),
      (error) => {
        assert.ok(error instanceof LessonSelectionError, raw);
        assert.match(error.message, /--lessons: ".*" is not a lesson number or range/, raw);
        return true;
      },
    );
  }
});

test("parseLessonSelection rejects numbers below 1", () => {
  for (const raw of ["0", "0-3", "5,0"]) {
    assert.throws(() => parseLessonSelection(raw), /lesson numbers start at 1/, raw);
  }
});

test("parseLessonSelection rejects reversed ranges", () => {
  assert.throws(() => parseLessonSelection("15-11"), /reversed range "15-11" \(write 11-15\)/);
  assert.throws(() => parseLessonSelection("1,9-3"), /reversed range "9-3"/);
});

test("parseLessonSelection rejects a huge range before expanding it", () => {
  const started = Date.now();
  for (const raw of ["1-999999999", `1-${MAX_LESSON_NUMBER + 1}`, "5,1-4000000000", `${MAX_LESSON_NUMBER + 1}`]) {
    assert.throws(
      () => parseLessonSelection(raw),
      (error) => {
        assert.ok(error instanceof LessonSelectionError, raw);
        assert.match(error.message, /beyond any module/, raw);
        return true;
      },
    );
  }
  assert.ok(Date.now() - started < 1000, "rejecting a huge range must not build the range");
  assert.equal(parseLessonSelection(`1-${MAX_LESSON_NUMBER}`).length, MAX_LESSON_NUMBER);
});

test("checkLessonSelection rejects numbers above the module's lesson count", () => {
  assert.doesNotThrow(() => checkLessonSelection([1, 15], 15, "es/travel-breakfast"));
  assert.throws(
    () => checkLessonSelection([3, 16], 15, "es/travel-breakfast"),
    (error) => {
      assert.ok(error instanceof LessonSelectionError);
      assert.match(error.message, /es\/travel-breakfast has 15 lessons; 16 is beyond it/);
      return true;
    },
  );
  assert.throws(() => checkLessonSelection([11, 12], 10, "es/x"), /11, 12 are beyond it/);
});

test("formatLessonList writes the --lessons spelling", () => {
  assert.equal(formatLessonList([]), "-");
  assert.equal(formatLessonList([11, 12, 13, 14, 15]), "11-15");
  assert.equal(formatLessonList([13, 3, 7, 11, 12]), "3,7,11-13");
  assert.equal(formatLessonList([2, 2, 3]), "2-3");
});

// ─── Plan selection ──────────────────────────────────────────────────────────

const pair = (count, doneNumbers) => ({
  lessons: Array.from({ length: count }, (_, i) => ({ n: i + 1 })),
  done: Object.fromEntries(doneNumbers.map((n) => [String(n), { verbs: [] }])),
});

test("without --lessons only the missing lessons are called", () => {
  const p = pair(6, [1, 2, 4]);
  assert.deepEqual(selectLessons(p).map((l) => l.n), [3, 5, 6]);
  assert.deepEqual(selectLessons(p, null).map((l) => l.n), [3, 5, 6]);
  assert.deepEqual(selectLessons(pair(3, [1, 2, 3])), []);
});

test("--lessons forces exactly those lessons, saved content or not, and no others", () => {
  const p = pair(6, [1, 2, 4]); // 3, 5, 6 are missing
  // 2 and 4 are done and are forced anyway; the missing 3, 5, 6 are left alone.
  assert.deepEqual(selectLessons(p, [2, 4]).map((l) => l.n), [2, 4]);
  // A forced lesson that is also missing is called once.
  assert.deepEqual(selectLessons(p, [3, 4]).map((l) => l.n), [3, 4]);
  // Nothing outside the selection, and a number the pair lacks selects nothing.
  assert.deepEqual(selectLessons(p, [9]), []);
  assert.deepEqual(selectLessons(p, []), []);
});

test("selectLessons does not change the pair's saved content", () => {
  const p = pair(4, [1, 2, 3, 4]);
  selectLessons(p, [2, 3]);
  assert.deepEqual(Object.keys(p.done), ["1", "2", "3", "4"]);
});

// ─── Settling a pair: when the public file may be written ───────────────────

test("a pair settles once, from the last task, whatever the order", () => {
  const settlement = createPairSettlement([3, 4, 5]);
  assert.equal(settlement.settle(4, true), null);
  assert.equal(settlement.settle(3, true), null);
  assert.deepEqual(settlement.settle(5, true), { failed: [], writePublic: true });
  // Reported exactly once; a repeated or unknown lesson changes nothing.
  assert.equal(settlement.settle(5, true), null);
  assert.equal(settlement.settle(99, false), null);
});

test("a failure on the FIRST or the LAST forced lesson gives the same outcome", () => {
  const outcomeOf = (order, failing) => {
    const settlement = createPairSettlement([11, 12, 13]);
    let result = null;
    for (const n of order) result = settlement.settle(n, !failing.includes(n)) ?? result;
    return result;
  };
  // 11 fails; it finishes first in one run and last in the other.
  const firstFailsEarly = outcomeOf([11, 12, 13], [11]);
  const firstFailsLate = outcomeOf([12, 13, 11], [11]);
  assert.deepEqual(firstFailsEarly, { failed: [11], writePublic: false });
  assert.deepEqual(firstFailsLate, firstFailsEarly);
  // 13 (the last lesson) fails, at either end of the finish order.
  const lastFailsEarly = outcomeOf([13, 11, 12], [13]);
  const lastFailsLate = outcomeOf([11, 12, 13], [13]);
  assert.deepEqual(lastFailsEarly, { failed: [13], writePublic: false });
  assert.deepEqual(lastFailsLate, lastFailsEarly);
  // Several failures are all reported, sorted.
  assert.deepEqual(outcomeOf([13, 12, 11], [13, 11]), { failed: [11, 13], writePublic: false });
});

test("formatRerunCommand is a ready-to-run --lessons command with the exact failed numbers", () => {
  assert.equal(
    formatRerunCommand({
      script: "scripts/build-lesson-content.mts",
      moduleId: "travel-breakfast",
      lang: "es",
      failed: [13, 11, 12, 15],
      provider: "cli",
      model: "claude-opus-5-5",
    }),
    "node scripts/build-lesson-content.mts --module travel-breakfast --lang es --lessons 11-13,15 --provider cli --model claude-opus-5-5",
  );
  const quoted = formatRerunCommand({
    script: "s.mts",
    moduleId: "m",
    lang: "en",
    failed: [2],
    provider: "api",
    model: "x",
    passThrough: { "claude-bin": "/path with space/claude" },
  });
  assert.match(quoted, /--claude-bin '\/path with space\/claude'$/);
});

test("the retry wording matches the provider: cli never mentions a tool call", () => {
  const cli = noObjectRetryMessage("cli", LESSON_CONTENT_TOOL_NAME);
  assert.match(cli, /Reply with one JSON object that matches the schema/);
  assert.ok(!cli.includes(LESSON_CONTENT_TOOL_NAME));
  assert.ok(!/call/i.test(cli));
  const api = noObjectRetryMessage("api", LESSON_CONTENT_TOOL_NAME);
  assert.match(api, new RegExp(`call the ${LESSON_CONTENT_TOOL_NAME} tool`));
});

// ─── Provider ────────────────────────────────────────────────────────────────

test("the default provider is cli on Opus and needs no API key", () => {
  const run = resolveRunProvider(undefined, undefined);
  assert.equal(run.provider, "cli");
  assert.equal(run.model, "claude-opus-5-5");
  assert.equal(run.requiresApiKey, false);
});

test("the api provider keeps Sonnet and needs the API key", () => {
  const run = resolveRunProvider("api", undefined);
  assert.equal(run.provider, "api");
  assert.equal(run.model, "claude-sonnet-5-5");
  assert.equal(run.requiresApiKey, true);
});

test("--model aliases and an unknown provider", () => {
  assert.equal(resolveRunProvider("cli", "sonnet").model, "claude-sonnet-5-5");
  assert.equal(resolveRunProvider("api", "opus").model, "claude-opus-5-5");
  assert.equal(resolveRunProvider("cli", "claude-custom-1").model, "claude-custom-1");
  assert.throws(
    () => resolveRunProvider("openai", undefined),
    (error) => {
      assert.ok(error instanceof RunFlagError);
      assert.match(error.message, /--provider must be "cli" or "api"/);
      return true;
    },
  );
});

// ─── cli env scrubbing (fake CLI) ────────────────────────────────────────────

test("cliEnv drops every ANTHROPIC_* and Claude Code session variable, keeps the rest", () => {
  const env = cliEnv({
    ANTHROPIC_API_KEY: "sk-test",
    ANTHROPIC_AUTH_TOKEN: "tok",
    ANTHROPIC_BASE_URL: "https://example.test",
    CLAUDE_CODE_OAUTH_TOKEN: "oauth",
    CLAUDE_AGENT_SDK_VERSION: "1",
    CLAUDECODE: "1",
    CLAUDE_PID: "9",
    CLAUDE_EFFORT: "high",
    PATH: "/usr/bin",
    HOME: "/home/x",
    MY_ANTHROPIC_NOTE: "kept",
  });
  assert.deepEqual(env, { PATH: "/usr/bin", HOME: "/home/x", MY_ANTHROPIC_NOTE: "kept" });
});

test("the fake CLI never sees the API key, and the prompt arrives on stdin", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lc-fake-cli-"));
  const bin = join(dir, "fake-claude.mjs");
  writeFileSync(
    bin,
    `#!${process.execPath}
let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const seen = Object.keys(process.env).filter((k) => /^ANTHROPIC_|^CLAUDE/.test(k));
  console.log(JSON.stringify({
    type: "result", subtype: "success", is_error: false,
    structured_output: { seen, input, args: process.argv.slice(2) },
    usage: { input_tokens: 11, output_tokens: 7 },
  }));
});
`,
  );
  chmodSync(bin, 0o755);
  const run = await runClaudeCli({
    bin,
    args: ["-p", "--model", "claude-opus-5-5"],
    input: "hello lesson",
    cwd: dir,
    timeoutMs: 20_000,
    env: { ...process.env, ANTHROPIC_API_KEY: "sk-test-never-sent", ANTHROPIC_BASE_URL: "https://example.test" },
  });
  assert.equal(run.code, 0);
  assert.equal(run.timedOut, false);
  const outcome = parseCliOutput(run.stdout, run.stderr, run.code);
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.value.seen, []);
  assert.equal(outcome.value.input, "hello lesson");
  assert.deepEqual(outcome.value.args, ["-p", "--model", "claude-opus-5-5"]);
  assert.equal(outcome.usage.inputTokens, 11);
  assert.ok(!run.stdout.includes("sk-test-never-sent"));
});

test("a child that exits without reading a large prompt resolves instead of crashing on EPIPE", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lc-fake-cli-"));
  const bin = join(dir, "exits-at-once.mjs");
  writeFileSync(bin, `#!${process.execPath}\nprocess.exit(3);\n`);
  chmodSync(bin, 0o755);
  const run = await runClaudeCli({ bin, args: [], input: "x".repeat(8_000_000), cwd: dir, timeoutMs: 20_000 });
  assert.equal(run.code, 3);
  assert.equal(run.timedOut, false);
});

test("a missing CLI binary resolves with a failure instead of throwing", async () => {
  const run = await runClaudeCli({
    bin: join(tmpdir(), "no-such-claude-binary"),
    args: [],
    input: "x",
    cwd: tmpdir(),
    timeoutMs: 5000,
  });
  assert.equal(run.code, null);
  assert.match(run.stderr, /ENOENT/);
});

// ─── cli request shape ───────────────────────────────────────────────────────

const REQUEST_ARGS = {
  module: { name: "Travel", blurb: "b", userRole: "traveler", vocabFocus: ["hotel"] },
  lesson: { n: 2, title: "Breakfast", objective: "Order breakfast", steps: [{ instruction: "Say hi" }] },
  lessonCount: 15,
  previousTitle: "Arrival",
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  parts: { passage: true, words: true, verbs: true },
};

test("the cli system prompt asks for the JSON object, not a tool call, and keeps the rules", () => {
  const api = buildLessonContentRequest(REQUEST_ARGS);
  const cli = lessonContentCliSystemPrompt(api.system);
  assert.match(api.system, new RegExp(`by calling the ${LESSON_CONTENT_TOOL_NAME} tool; always call it, once`));
  assert.ok(!cli.includes(`calling the ${LESSON_CONTENT_TOOL_NAME} tool`));
  assert.match(cli, /ONE JSON object that matches the given JSON schema/);
  // Only the delivery sentence differs.
  assert.equal(
    cli.replace(/Everything is delivered as ONE JSON object[^\n]*/, ""),
    api.system.replace(/Everything is delivered by calling[^\n]*/, ""),
  );
});

test("a cli reply is read like a tool call, and the retry prompt carries the rejected reply", () => {
  const api = buildLessonContentRequest(REQUEST_ARGS);
  const schema = cliJsonSchema(api.tools[0].input_schema);
  assert.ok(!JSON.stringify(schema).includes("minItems"));
  const first = cliPrompt(api);
  assert.equal(first, api.messages[0].content);
  const retry = cliPrompt(api, { reply: { verbs: [] }, errors: ["verbs: need 3 to 6"] });
  assert.ok(retry.startsWith(first));
  assert.match(retry, /YOUR PREVIOUS ANSWER \(rejected\)/);
  assert.match(retry, /verbs: need 3 to 6/);

  const reply = {
    verbs: [
      {
        infinitive: "pedir",
        native: "to order",
        forms: { yo: "pido", tu: "pides", el_ella_usted: "pide", nosotros: "pedimos", ellos_ustedes: "piden" },
        example: { target: "Pido café.", native: "I order coffee." },
      },
    ],
  };
  const parsed = lessonContentFromResponse(
    [{ type: "tool_use", name: LESSON_CONTENT_TOOL_NAME, input: reply }],
    "Spanish",
  );
  assert.equal(parsed?.verbs?.length, 1);
  assert.equal(parsed.verbs[0].infinitive, "pedir");
});

// ─── The script (dry runs and flags that fail before any call) ──────────────

const SCRIPT = new URL("../scripts/build-lesson-content.mts", import.meta.url).pathname;
function runScript(args, extraEnv = {}) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...env, ...extraEnv },
    encoding: "utf8",
    timeout: 120_000,
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

test("script dry run: cli is the default and needs no ANTHROPIC_API_KEY", () => {
  const run = runScript(["--module", "travel-breakfast", "--lang", "es", "--dry-run"]);
  assert.equal(run.code, 0, run.err);
  assert.match(run.out, /provider cli, model claude-opus-5-5/);
});

test("script dry run: --lessons lists exactly the lessons that would be called", () => {
  const run = runScript(["--module", "travel-breakfast", "--lang", "es", "--lessons", "3,11-13", "--dry-run"]);
  assert.equal(run.code, 0, run.err);
  assert.match(run.out, /to generate: 4\s+lessons to call: 3,11-13\s+provider cli\s+model claude-opus-5-5/);
  assert.match(run.out, /Estimated lessons to generate: 4 \(4 full, 0 verbs-only/);
});

test("script dry run: --provider api reports the api provider and Sonnet", () => {
  const run = runScript(["--module", "travel-breakfast", "--lang", "es", "--provider", "api", "--lessons", "1", "--dry-run"]);
  assert.equal(run.code, 0, run.err);
  assert.match(run.out, /provider api, model claude-sonnet-5-5/);
  assert.match(run.out, /lessons to call: 1\s+provider api\s+model claude-sonnet-5-5/);
});

test("script rejects bad --lessons input before doing anything", () => {
  const base = ["--module", "travel-breakfast", "--lang", "es", "--dry-run", "--lessons"];
  const cases = [
    [["abc"], /not a lesson number or range/],
    [["0"], /start at 1/],
    [["15-11"], /reversed range/],
    [["31"], /has 30 lessons; 31 is beyond it/],
  ];
  for (const [value, pattern] of cases) {
    const run = runScript([...base, ...value]);
    assert.equal(run.code, 2, `${value}: ${run.out}`);
    assert.match(run.err, pattern);
  }
  const noValue = runScript(["--module", "travel-breakfast", "--lessons"]);
  assert.equal(noValue.code, 2);
  assert.match(noValue.err, /needs a list/);
});

test("script rejects --lessons together with --force, and a bad --provider", () => {
  const both = runScript(["--module", "travel-breakfast", "--lessons", "1", "--force", "--dry-run"]);
  assert.equal(both.code, 2);
  assert.match(both.err, /cannot be combined/);
  const bad = runScript(["--module", "travel-breakfast", "--provider", "openai", "--dry-run"]);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /--provider must be "cli" or "api"/);
});

test("script: the api provider still requires ANTHROPIC_API_KEY (and stops before any call)", () => {
  const run = runScript(["--module", "travel-breakfast", "--lang", "es", "--provider", "api", "--lessons", "1"]);
  assert.equal(run.code, 1);
  assert.match(run.err, /ANTHROPIC_API_KEY is not set/);
});

// ─── The script end to end with a fake CLI (no real model call, temp output directory) ───────

// roofing/es is verbs-only, so a fake CLI needs only valid verbs. They are copied from the
// committed roofing file and tagged per lesson, so new content is told apart from the old.
const ROOFING_FILE = new URL("../public/lesson-content/es/roofing.json", import.meta.url).pathname;
const FAKE_MODEL = "claude-opus-5-5";

function makeFakeCli(dir) {
  const bin = join(dir, "fake-claude.mjs");
  writeFileSync(
    bin,
    `#!${process.execPath}
import { readFileSync } from "node:fs";
let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const n = Number(/"number":(\\d+),"of"/.exec(input)?.[1]);
  const failing = (process.env.FAKE_FAIL_LESSONS ?? "").split(",").filter(Boolean).map(Number);
  const base = JSON.parse(readFileSync(${JSON.stringify(ROOFING_FILE)}, "utf8")).lessons["1"].verbs;
  const verbs = failing.includes(n)
    ? []
    : base.map((v) => ({ ...v, native: v.native + " [fake-" + n + "]" }));
  console.log(JSON.stringify({
    type: "result", subtype: "success", is_error: false,
    structured_output: { verbs },
    usage: { input_tokens: 5, output_tokens: 5 },
  }));
});
`,
  );
  chmodSync(bin, 0o755);
  return bin;
}

/** A temp output root holding a copy of the committed roofing file as its public file. */
function seededRoot() {
  const root = mkdtempSync(join(tmpdir(), "lc-out-"));
  const publicFile = join(root, "public", "lesson-content", "es", "roofing.json");
  mkdirSync(join(root, "public", "lesson-content", "es"), { recursive: true });
  cpSync(ROOFING_FILE, publicFile);
  return { root, publicFile, progressFile: join(root, ".lesson-content-progress", "es", "roofing.json") };
}

function runWithFakeCli(root, bin, lessons, { fail = [], concurrency = 2 } = {}) {
  return runScript(
    ["--module", "roofing", "--lang", "es", "--lessons", lessons, "--claude-bin", bin, "--out-root", root, "--concurrency", String(concurrency)],
    { FAKE_FAIL_LESSONS: fail.join(",") },
  );
}

const readFile = (file) => JSON.parse(readFileSync(file, "utf8"));

test("a forced-lesson failure leaves the public file alone, whichever lesson fails or finishes last", () => {
  const bin = makeFakeCli(mkdtempSync(join(tmpdir(), "lc-fake-bin-")));
  // The first forced lesson (3) fails, then the last (5) fails; at concurrency 1 and 2 the finish
  // order differs. The outcome must be the same shape every time.
  for (const concurrency of [1, 2]) {
    for (const failing of [3, 5]) {
      const { root, publicFile, progressFile } = seededRoot();
      const before = readFileSync(publicFile, "utf8");
      const run = runWithFakeCli(root, bin, "3-5", { fail: [failing], concurrency });
      const where = `fail ${failing}, concurrency ${concurrency}\n${run.out}\n${run.err}`;
      assert.equal(run.code, 1, where);
      // The public file is byte-for-byte what it was.
      assert.equal(readFileSync(publicFile, "utf8"), before, where);
      // The two lessons that did succeed are in progress, tagged with the model; the failed one
      // keeps its old content there (no fake marker).
      const progress = readFile(progressFile);
      const succeeded = [3, 4, 5].filter((n) => n !== failing);
      assert.doesNotMatch(progress.lessons[String(failing)].verbs[0].native, /\[fake-/, where);
      for (const n of succeeded) {
        assert.match(progress.lessons[String(n)].verbs[0].native, new RegExp(`\\[fake-${n}\\]$`), where);
        assert.equal(progress.lessons[String(n)].model, FAKE_MODEL, where);
      }
      // Which lesson failed is printed, with a ready-to-run command for exactly that lesson.
      assert.match(run.out, new RegExp(`public file NOT rewritten: es/roofing; lessons that failed: ${failing} `), where);
      assert.ok(
        run.out.includes(
          `node scripts/build-lesson-content.mts --module roofing --lang es --lessons ${failing} --provider cli --model ${FAKE_MODEL} --claude-bin ${bin} --out-root ${root}`,
        ),
        where,
      );
      assert.ok(!/file complete/.test(run.out), where);
    }
  }
});

test("rerunning with --lessons <failed only> completes the file, with per-lesson models", () => {
  const bin = makeFakeCli(mkdtempSync(join(tmpdir(), "lc-fake-bin-")));
  const { root, publicFile } = seededRoot();
  const original = readFile(publicFile);
  const first = runWithFakeCli(root, bin, "3-5", { fail: [4] });
  assert.equal(first.code, 1, first.out);
  const second = runWithFakeCli(root, bin, "4");
  assert.equal(second.code, 0, second.out + second.err);
  assert.match(second.out, /file complete: es\/roofing/);
  const file = readFile(publicFile);
  // 3, 4 and 5 are the new content (3 and 5 came from the first run's progress); the rest is old.
  for (const n of [3, 4, 5]) {
    assert.match(file.lessons[String(n)].verbs[0].native, new RegExp(`\\[fake-${n}\\]$`));
    assert.equal(file.lessons[String(n)].model, FAKE_MODEL);
  }
  assert.deepEqual(file.lessons["6"], original.lessons["6"]);
  assert.equal(Object.keys(file.lessons).length, 30);
  assert.equal(file.model, FAKE_MODEL);
  // The old lessons carry no invented model.
  assert.equal(file.lessons["6"].model, undefined);
});

test("a plain run that generates nothing leaves the file's model field as it was", () => {
  const bin = makeFakeCli(mkdtempSync(join(tmpdir(), "lc-fake-bin-")));
  const { root, publicFile } = seededRoot();
  const saved = readFile(publicFile);
  delete saved.model;
  writeFileSync(publicFile, JSON.stringify(saved));
  const run = runScript(["--module", "roofing", "--lang", "es", "--claude-bin", bin, "--out-root", root]);
  assert.equal(run.code, 0, run.out + run.err);
  assert.ok(existsSync(publicFile));
  assert.equal("model" in readFile(publicFile), false);
  // And a file that had a model keeps it (no overwrite with this run's model).
  const withModel = seededRoot();
  const keep = runScript(["--module", "roofing", "--lang", "es", "--claude-bin", bin, "--out-root", withModel.root]);
  assert.equal(keep.code, 0, keep.out + keep.err);
  assert.equal(readFile(withModel.publicFile).model, "claude-sonnet-5-5");
});
