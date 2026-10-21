// Built by TAC — 2026-10-17
// Writes the authored content of every Core 30 lesson: a lesson-specific passage, lesson
// vocabulary + phrases, and lesson verbs with present-tense conjugations. One model call per
// lesson, validated by the same rules the tests use (src/lib/lesson-content-core.ts); a failed
// validation is retried with the error list.
//
//   node scripts/build-lesson-content.mts [flags]                      # cli: Claude subscription
//   ANTHROPIC_API_KEY=... node scripts/build-lesson-content.mts --provider api [flags]
//   (Node 22.18+ runs .mts directly; `npx tsx scripts/build-lesson-content.mts` works too)
//
// Providers (--provider), the same two as scripts/build-core60.mts:
//   cli (default)  the logged-in Claude Code CLI, `claude -p`, billed to the owner's Claude
//                  subscription (OAuth). Each call: --output-format json, --json-schema (the
//                  tool's schema), --tools "" (no tools), --system-prompt (replaces Claude Code's
//                  own), --safe-mode, --strict-mcp-config, --no-session-persistence,
//                  --disable-slash-commands, run from an empty temp directory with every
//                  ANTHROPIC_* / CLAUDE_CODE_* variable removed from the child's environment, so
//                  it can never bill an API key. ANTHROPIC_API_KEY is not needed. Default model Opus.
//                  Usage / rate limits pause every call and retry with backoff.
//   api            the Anthropic API with ANTHROPIC_API_KEY (tool calls), claude-sonnet-5-5.
//
// Pairs: Spanish target / English native for every module with a curriculum that supports it,
// and English target / Spanish native for the English-for-work modules (learnDirection
// "en-target"). Roofing already has authored passages and words, so only its verbs are written.
//
// Output (committed): public/lesson-content/<langCode>/<moduleId>.json and index.json
// Progress (gitignored, resumable): .lesson-content-progress/<langCode>/<moduleId>.json
//
// Flags:
//   --module <id,...>           only these modules
//   --lang <name|code,...>      only these target languages (Spanish/es, English/en)
//   --verbs-only-for <id,...>   write only verbs for these modules (roofing is detected itself)
//   --lessons <list>            regenerate exactly these lesson numbers (3,7,11-15), even when valid
//                               saved content exists; no other lesson is touched. Composes with
//                               --module and --lang; every number must exist in each selected
//                               module (use --module for a module with fewer lessons).
//   --provider cli|api          default cli (subscription); api bills ANTHROPIC_API_KEY
//   --model sonnet|opus|<id>    default claude-opus-5-5 (cli) / claude-sonnet-5-5 (api)
//   --claude-bin <path>         the CLI (default ~/.local/bin/claude, else "claude" on PATH)
//   --rate-limit-wait-hours N   cli: give up (resumable) after waiting this long on limits (default 8)
//   --concurrency N             parallel calls (default 2 for cli, 6 for api)
//   --limit N                   stop after N lessons attempted this run
//   --dry-run                   print the plan (lessons that would be called, provider, model) and
//                               estimated tokens, call nothing
//   --force                     ignore saved progress and existing files for the selected pairs
//                               (not combinable with --lessons)
//   --timeout-ms N              per-call timeout (default 120000 api, 600000 cli)
//   --out-root <dir>            (testing) read and write public/ and the progress files under this
//                               directory instead of the repository root
//
// A public file is rewritten only after every task for its module+language has settled, and not at
// all when any of them failed: the new lessons that did succeed stay in the progress file, and the
// run prints a ready-to-run `--lessons <failed only>` command that completes the file.
//
// The api key is read from the environment only and is never printed; cli reads no key.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCurriculum } from "../src/data/curriculum.ts";
import type { LessonWord } from "../src/data/curriculum.ts";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { runClaudeCli } from "../src/lib/claude-cli-runner.ts";
import { cliInputTokens, cliJsonSchema, cliPrompt, parseCliOutput } from "../src/lib/core60-generator-core.ts";
import {
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
import { ROOFING_LESSON_PASSAGES } from "../src/data/roofing-lesson-passages.ts";
import {
  LESSON_CONTENT_VERSION,
  cleanLessonVerbs,
  cleanPassage,
  contentNativeLanguage,
  validateLessonContent,
  type ContentParts,
  type LessonContentFile,
  type LessonContentLesson,
} from "../src/lib/lesson-content-core.ts";
import {
  LESSON_CONTENT_MODEL,
  LESSON_CONTENT_TOOL_NAME,
  buildLessonContentRequest,
  lessonContentCliSystemPrompt,
  lessonContentFromResponse,
  type AuthoredContext,
  type ContentBlock,
} from "../src/lib/lesson-content-prompt.ts";
import { cleanLessonWords, languageTag, pickAuthoredWords } from "../src/lib/lesson-words-core.ts";

const SCRIPT_PATH = "scripts/build-lesson-content.mts";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = flag("out-root");
const ROOT = OUT_ROOT ? resolve(OUT_ROOT) : REPO_ROOT;
const PUBLIC_DIR = join(ROOT, "public", "lesson-content");
const PROGRESS_DIR = join(ROOT, ".lesson-content-progress");
const API_URL = "https://api.anthropic.com/v1/messages";

const TARGETS = ["Spanish", "English"] as const;

// Per-lesson sizes (retries included), used only for --dry-run estimates. Calibrated on the
// landscaper pilot: 30 lessons = 138k input / 104k output tokens, ~19 s of wall time per lesson
// at concurrency 6 (a verbs-only lesson, roofing, is roughly a third of the output).
const EST_INPUT_TOKENS = 4600;
const EST_OUTPUT_TOKENS = 3500;
const EST_SECONDS_PER_LESSON_AT_6 = 19;

// ─── Flags ───────────────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : "";
}
const has = (name: string) => process.argv.includes(`--${name}`);
const list = (name: string) =>
  (flag(name) ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
const intFlag = (name: string, fallback: number) => {
  const raw = flag(name);
  const value = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const wantLang = list("lang");
const wantModule = list("module");
const verbsOnlyFor = list("verbs-only-for");
const DRY_RUN = has("dry-run");
const FORCE = has("force");

let RUN: ReturnType<typeof resolveRunProvider>;
let SELECTION: number[] | null = null;
try {
  RUN = resolveRunProvider(flag("provider"), flag("model"));
  if (has("lessons")) {
    SELECTION = parseLessonSelection(flag("lessons"));
    if (FORCE) {
      throw new RunFlagError("--force and --lessons cannot be combined (--lessons already regenerates exactly those lessons)");
    }
  }
} catch (error) {
  if (!(error instanceof RunFlagError)) throw error;
  console.error(error.message);
  process.exit(2);
}
const PROVIDER = RUN.provider;
const MODEL = RUN.model;
const CONCURRENCY = intFlag("concurrency", PROVIDER === "cli" ? 2 : 6);
const LIMIT = intFlag("limit", Number.POSITIVE_INFINITY);
const TIMEOUT_MS = intFlag("timeout-ms", PROVIDER === "cli" ? 600_000 : 120_000);
const CLAUDE_BIN =
  flag("claude-bin") ||
  (existsSync(join(homedir(), ".local", "bin", "claude")) ? join(homedir(), ".local", "bin", "claude") : "claude");
const RATE_LIMIT_WAIT_MS = intFlag("rate-limit-wait-hours", 8) * 3_600_000;
const MAX_HTTP_ATTEMPTS = 7;
const MAX_VALIDATION_ATTEMPTS = 3; // first try + 2 retries

// ─── Plan ────────────────────────────────────────────────────────────────────

interface LessonPlan {
  n: number;
  parts: ContentParts;
  authored?: AuthoredContext;
}

interface Pair {
  moduleId: string;
  language: string;
  nativeLanguage: string;
  lessons: LessonPlan[];
  progressFile: string;
  publicFile: string;
  /** lesson number (string) -> validated content */
  done: Record<string, StoredLesson>;
  generatedAt: string;
  /**
   * The file-level `model` of the public file: the model of the most recent generating run. It
   * starts as the saved one and changes only when this run generates a lesson, so a plain run
   * that generates nothing leaves it as it was (absent when the saved file had none). A file can
   * mix models (a --lessons rerun on another model), so each lesson also records its own.
   */
  model: string | undefined;
}

/**
 * A lesson as stored in the progress and public files: the content plus the model that wrote it.
 * The per-lesson `model` is extra to LessonContentLesson on purpose: parseLessonContent (the
 * app's reader) rebuilds each lesson from its known fields and ignores it, and the review
 * snapshots are built from displayed fields only, so adding it breaks no reader.
 */
type StoredLesson = LessonContentLesson & { model?: string };

function matchesLang(language: string): boolean {
  if (wantLang.length === 0) return true;
  return wantLang.includes(language.toLowerCase()) || wantLang.includes(languageTag(language));
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file: string, value: unknown, pretty = false) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, pretty ? 1 : undefined));
  renameSync(temp, file);
}

/** What the lesson already has authored, so only the rest is written. */
function planLesson(
  moduleId: string,
  language: string,
  lesson: { n: number; words?: LessonWord[] },
): LessonPlan {
  const forced = verbsOnlyFor.includes(moduleId.toLowerCase());
  const authoredWords = pickAuthoredWords(lesson.words, language);
  const roofingPassage =
    moduleId === "roofing" && language === "Spanish" ? ROOFING_LESSON_PASSAGES[lesson.n] : undefined;
  const passageAuthored = forced || roofingPassage !== undefined;
  const wordsAuthored = forced || authoredWords !== null;
  const parts: ContentParts = {
    passage: !passageAuthored,
    words: !wordsAuthored,
    verbs: true,
  };
  const authored: AuthoredContext = {};
  if (roofingPassage) {
    authored.passage = {
      title: roofingPassage.title,
      target: roofingPassage.es,
      native: roofingPassage.en,
    };
  }
  if (authoredWords) authored.words = authoredWords;
  return {
    n: lesson.n,
    parts,
    authored: authored.passage || authored.words ? authored : undefined,
  };
}

/** Re-validates saved lessons against the current rules; anything stale is regenerated. */
function loadLessons(
  raw: unknown,
  pair: Pick<Pair, "moduleId" | "language" | "nativeLanguage" | "lessons">,
): Record<string, StoredLesson> {
  const out: Record<string, StoredLesson> = {};
  if (!raw || typeof raw !== "object") return out;
  const file = raw as Record<string, unknown>;
  if (
    file.module !== pair.moduleId ||
    file.language !== pair.language ||
    file.nativeLanguage !== pair.nativeLanguage
  ) {
    return out;
  }
  const lessons = file.lessons as Record<string, Record<string, unknown>> | undefined;
  if (!lessons || typeof lessons !== "object") return out;
  for (const plan of pair.lessons) {
    const saved = lessons[String(plan.n)];
    if (!saved) continue;
    const passage = cleanPassage(saved.passage) ?? undefined;
    const words = cleanLessonWords(saved.words);
    const verbs = cleanLessonVerbs(saved.verbs, pair.language);
    const content: StoredLesson = { verbs };
    if (plan.parts.passage && passage) content.passage = passage;
    if (plan.parts.words && words.length > 0) content.words = words;
    const errors = validateLessonContent(content, {
      language: pair.language,
      nativeLanguage: pair.nativeLanguage,
      parts: plan.parts,
      words: plan.authored?.words,
    });
    if (errors.length === 0) {
      if (typeof saved.model === "string" && saved.model) content.model = saved.model;
      out[String(plan.n)] = content;
    }
  }
  return out;
}

function buildPlan(): Pair[] {
  const pairs: Pair[] = [];
  for (const module of MODULES) {
    if (wantModule.length > 0 && !wantModule.includes(module.id.toLowerCase())) continue;
    // A Foundation's and a Master's passages and verbs are hand-authored in public/lesson-content;
    // never regenerate.
    if (module.id.startsWith("foundation-") || module.id.startsWith("master-")) continue;
    const curriculum = getCurriculum(module.id);
    if (!curriculum) continue;
    for (const language of TARGETS) {
      if (!matchesLang(language)) continue;
      const nativeLanguage = contentNativeLanguage(language);
      const supported =
        language === "Spanish"
          ? moduleSupportsLearningPair(module, "Spanish", "English")
          : module.learnDirection === "en-target" &&
            moduleSupportsLearningPair(module, "English", "Spanish");
      if (!supported) continue;
      const dir = languageTag(language);
      const pair: Pair = {
        moduleId: module.id,
        language,
        nativeLanguage,
        lessons: curriculum.lessons.map((lesson) => planLesson(module.id, language, lesson)),
        progressFile: join(PROGRESS_DIR, dir, `${module.id}.json`),
        publicFile: join(PUBLIC_DIR, dir, `${module.id}.json`),
        done: {},
        generatedAt: new Date().toISOString(),
        model: undefined,
      };
      if (SELECTION) checkLessonSelection(SELECTION, pair.lessons.length, `${languageTag(language)}/${module.id}`);
      if (!FORCE) {
        const fromPublic = readJson(pair.publicFile) as { generatedAt?: string; model?: string } | null;
        const fromProgress = readJson(pair.progressFile) as { generatedAt?: string } | null;
        pair.done = { ...loadLessons(fromPublic, pair), ...loadLessons(fromProgress, pair) };
        pair.generatedAt = fromProgress?.generatedAt ?? fromPublic?.generatedAt ?? pair.generatedAt;
        if (typeof fromPublic?.model === "string") pair.model = fromPublic.model;
      }
      pairs.push(pair);
    }
  }
  return pairs;
}

const missing = (pair: Pair) => pair.lessons.filter((lesson) => !pair.done[String(lesson.n)]);
/** What this run calls for a pair: the missing lessons, or exactly the --lessons selection. */
const toCall = (pair: Pair) => selectLessons(pair, SELECTION);

// ─── Output files ────────────────────────────────────────────────────────────

function saveProgress(pair: Pair) {
  writeJsonAtomic(pair.progressFile, {
    module: pair.moduleId,
    language: pair.language,
    nativeLanguage: pair.nativeLanguage,
    generatedAt: pair.generatedAt,
    lessons: pair.done,
  });
}

function writePublicFile(pair: Pair): number {
  const lessons: Record<string, StoredLesson> = {};
  for (const plan of [...pair.lessons].sort((a, b) => a.n - b.n)) {
    lessons[String(plan.n)] = pair.done[String(plan.n)];
  }
  const file: LessonContentFile = {
    version: LESSON_CONTENT_VERSION,
    module: pair.moduleId,
    language: pair.language,
    nativeLanguage: pair.nativeLanguage,
    ...(pair.model ? { model: pair.model } : {}),
    generatedAt: pair.generatedAt,
    reviewed: false,
    lessons,
  };
  writeJsonAtomic(pair.publicFile, file);
  return statSync(pair.publicFile).size;
}

function writeIndex() {
  const entries: {
    language: string;
    module: string;
    lessons: number;
    bytes: number;
    reviewed: boolean;
  }[] = [];
  if (existsSync(PUBLIC_DIR)) {
    for (const dir of readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const name of readdirSync(join(PUBLIC_DIR, dir.name))) {
        if (!name.endsWith(".json")) continue;
        const path = join(PUBLIC_DIR, dir.name, name);
        const file = readJson(path) as Partial<LessonContentFile> | null;
        if (!file || file.version !== LESSON_CONTENT_VERSION || !file.lessons) continue;
        entries.push({
          language: dir.name,
          module: String(file.module),
          lessons: Object.keys(file.lessons).length,
          bytes: statSync(path).size,
          reviewed: file.reviewed === true,
        });
      }
    }
  }
  entries.sort((a, b) => a.language.localeCompare(b.language) || a.module.localeCompare(b.module));
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(
    join(PUBLIC_DIR, "index.json"),
    JSON.stringify({ version: LESSON_CONTENT_VERSION, files: entries }),
  );
  return entries;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const stats = {
  done: 0,
  failed: 0,
  calls: 0,
  httpRetries: 0,
  validationRetries: 0,
  inputTokens: 0,
  outputTokens: 0,
};

class FatalError extends Error {}

interface CallResult {
  content: ContentBlock[];
  stopReason?: string;
  retryAfterMs?: number;
  retryable?: boolean;
  error?: string;
}

async function callOnce(key: string, body: unknown): Promise<CallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    stats.calls++;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new FatalError(`Anthropic API refused the key (HTTP ${response.status})`);
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500 || response.status === 529;
      const header = Number(response.headers.get("retry-after"));
      let detail = "";
      if (!retryable) {
        try {
          const json = (await response.json()) as { error?: { message?: string } };
          detail = json.error?.message ? `: ${json.error.message.slice(0, 300)}` : "";
        } catch {
          // keep the bare status
        }
      }
      return {
        content: [],
        retryable,
        retryAfterMs: Number.isFinite(header) && header > 0 ? header * 1000 : undefined,
        error: `HTTP ${response.status}${detail}`,
      };
    }
    const json = (await response.json()) as {
      content?: ContentBlock[];
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    stats.inputTokens += json.usage?.input_tokens ?? 0;
    stats.outputTokens += json.usage?.output_tokens ?? 0;
    return { content: json.content ?? [], stopReason: json.stop_reason };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    return { content: [], retryable: true, error: aborted ? "timeout" : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

/** HTTP retries with exponential backoff. Resolves content, or throws with the last error. */
async function callWithBackoff(key: string, body: unknown): Promise<CallResult> {
  let lastError = "no attempt";
  for (let attempt = 0; attempt < MAX_HTTP_ATTEMPTS; attempt++) {
    const result = await callOnce(key, body);
    if (!result.error) return result;
    lastError = result.error;
    if (!result.retryable) break;
    stats.httpRetries++;
    const backoff = Math.min(60_000, 1000 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
    await sleep(Math.max(backoff, result.retryAfterMs ?? 0));
  }
  throw new Error(lastError);
}

// ─── cli provider: `claude -p` on the owner's subscription ──────────────────

let cliCwd: string | null = null;
/** A usage / rate limit pauses every call until this time (epoch ms). */
let pausedUntil = 0;

const MAX_WAIT_MS = 15 * 60_000;
const MAX_CLI_FAILURES = 3;

/**
 * One CLI call, retried through limits and transient failures: a usage / rate limit or overload
 * pauses every call (until the CLI's reset time when it gives one, else 30 s doubling, at most
 * 15 min per wait) for up to --rate-limit-wait-hours in total; a broken login stops the run;
 * anything else is retried 3 times. Returns the structured reply (null when it held no object).
 */
async function callCli(system: string, schema: string, prompt: string): Promise<Record<string, unknown> | null> {
  const args = [
    "-p",
    "--output-format", "json",
    "--model", MODEL,
    "--tools", "",
    "--system-prompt", system,
    "--json-schema", schema,
    "--safe-mode",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--disable-slash-commands",
  ];
  let backoff = 30_000;
  let waited = 0;
  let failures = 0;
  for (;;) {
    while (Date.now() < pausedUntil) await sleep(pausedUntil - Date.now());
    cliCwd ??= mkdtempSync(join(tmpdir(), "lesson-content-cli-"));
    stats.calls++;
    const run = await runClaudeCli({ bin: CLAUDE_BIN, args, input: prompt, cwd: cliCwd, timeoutMs: TIMEOUT_MS });
    const outcome = run.timedOut
      ? { ...parseCliOutput("", "", run.code), error: `timed out after ${TIMEOUT_MS} ms`, kind: "other" as const, ok: false }
      : parseCliOutput(run.stdout, run.stderr, run.code);
    stats.inputTokens += cliInputTokens(outcome.usage);
    stats.outputTokens += outcome.usage.outputTokens;
    if (outcome.ok) return outcome.value;
    if (outcome.kind === "auth") {
      throw new FatalError(`the Claude CLI login was refused (${outcome.error.slice(0, 160)}); run \`claude\` and /login, then rerun`);
    }
    if (outcome.kind === "rate_limit") {
      const untilReset = outcome.resetAt ? outcome.resetAt - Date.now() + 30_000 : 0;
      const wait = Math.min(MAX_WAIT_MS, Math.max(untilReset, backoff));
      backoff = Math.min(MAX_WAIT_MS, backoff * 2);
      waited += wait;
      if (waited > RATE_LIMIT_WAIT_MS) {
        throw new FatalError(`still limited after waiting ${Math.round(waited / 60_000)} min (${outcome.error.slice(0, 160)}); rerun later`);
      }
      pausedUntil = Math.max(pausedUntil, Date.now() + wait);
      stats.httpRetries++;
      console.log(`  limited (${outcome.error.slice(0, 120)}); pausing all calls ${Math.round(wait / 1000)} s`);
      continue;
    }
    failures += 1;
    if (failures > MAX_CLI_FAILURES) {
      throw new Error(`the Claude CLI failed ${failures} times: ${outcome.error.slice(0, 300)}`);
    }
    stats.httpRetries++;
    console.log(`  CLI error (${outcome.error.slice(0, 120)}); retry ${failures} of ${MAX_CLI_FAILURES}`);
    await sleep(15_000 * 2 ** (failures - 1));
  }
}

/** The content a reply holds, checked by the same rules for both providers. */
function checkReply(
  parsed: ReturnType<typeof lessonContentFromResponse>,
  pair: Pair,
  plan: LessonPlan,
): { content?: LessonContentLesson; errors: string[] } {
  if (!parsed) {
    return {
      errors: [noObjectRetryMessage(PROVIDER, LESSON_CONTENT_TOOL_NAME)],
    };
  }
  const content: LessonContentLesson = { verbs: parsed.verbs ?? [] };
  if (plan.parts.passage && parsed.passage) content.passage = parsed.passage;
  if (plan.parts.words && parsed.words) content.words = parsed.words;
  const errors = validateLessonContent(content, {
    language: pair.language,
    nativeLanguage: pair.nativeLanguage,
    parts: plan.parts,
    words: plan.authored?.words,
  });
  return { content, errors };
}

/** One lesson via the CLI: stateless calls; each retry carries the rejected reply and its errors. */
async function generateLessonCli(
  pair: Pair,
  plan: LessonPlan,
  body: ReturnType<typeof buildLessonContentRequest>,
): Promise<LessonContentLesson> {
  const system = lessonContentCliSystemPrompt(body.system);
  const tool = body.tools[0];
  const schema = JSON.stringify(cliJsonSchema(tool.input_schema));
  let retry: { reply: unknown; errors: string[] } | undefined;
  let lastError = "no attempt";
  for (let validation = 0; validation < MAX_VALIDATION_ATTEMPTS; validation++) {
    if (validation > 0) stats.validationRetries++;
    const reply = await callCli(system, schema, cliPrompt(body, retry));
    const parsed = reply
      ? lessonContentFromResponse(
          [{ type: "tool_use", name: LESSON_CONTENT_TOOL_NAME, input: reply }],
          pair.language,
        )
      : null;
    const checked = checkReply(parsed, pair, plan);
    if (checked.content && checked.errors.length === 0) return checked.content;
    const errors = reply ? checked.errors : [noObjectRetryMessage("cli", LESSON_CONTENT_TOOL_NAME)];
    lastError = `failed validation: ${errors.slice(0, 4).join(" | ")}`;
    retry = { reply: reply ?? "(no JSON object)", errors };
  }
  throw new Error(lastError);
}

/** One lesson: model call, validation, and up to two retries that show the model its errors. */
async function generateLesson(
  key: string | null,
  pair: Pair,
  plan: LessonPlan,
): Promise<LessonContentLesson> {
  const module = MODULES.find((item) => item.id === pair.moduleId)!;
  const curriculum = getCurriculum(pair.moduleId)!;
  const lesson = curriculum.lessons.find((item) => item.n === plan.n)!;
  const previous = curriculum.lessons.find((item) => item.n === plan.n - 1);
  const body = buildLessonContentRequest({
    module,
    lesson,
    lessonCount: curriculum.lessons.length,
    previousTitle: previous?.title ?? null,
    targetLanguage: pair.language,
    nativeLanguage: pair.nativeLanguage,
    parts: plan.parts,
    authored: plan.authored,
  });
  if (PROVIDER === "cli") return generateLessonCli(pair, plan, body);
  const messages: { role: "user" | "assistant"; content: unknown }[] = [...body.messages];
  let lastError = "no attempt";
  for (let validation = 0; validation < MAX_VALIDATION_ATTEMPTS; validation++) {
    if (validation > 0) stats.validationRetries++;
    const result = await callWithBackoff(key!, { ...body, model: MODEL, messages });
    const parsed = lessonContentFromResponse(result.content, pair.language);
    const checked = checkReply(parsed, pair, plan);
    if (checked.content && checked.errors.length === 0) return checked.content;
    const errors = checked.errors;
    lastError = `failed validation: ${errors.slice(0, 4).join(" | ")}${
      result.stopReason === "max_tokens" ? " (hit max_tokens)" : ""
    }`;
    // Show the model its own reply and exactly what to fix.
    const toolUses = result.content.filter((block) => block.type === "tool_use");
    messages.push({ role: "assistant", content: result.content });
    const feedback = `Fix these problems and return the COMPLETE content again (all parts, not only the fixed ones):\n- ${errors.join("\n- ")}`;
    messages.push({
      role: "user",
      content:
        toolUses.length > 0
          ? [
              ...toolUses.map((block, index) => ({
                type: "tool_result",
                tool_use_id: block.id,
                is_error: true,
                content: index === 0 ? feedback : "See the first result.",
              })),
            ]
          : feedback,
    });
  }
  throw new Error(lastError);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US");
}
function elapsed(startedAt: number) {
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
}

async function main() {
  let pairs: Pair[];
  try {
    pairs = buildPlan();
  } catch (error) {
    if (!(error instanceof RunFlagError)) throw error;
    console.error(error.message);
    process.exit(2);
  }
  const tasks = pairs.flatMap((pair) => toCall(pair).map((plan) => ({ pair, plan })));
  const totalLessons = pairs.reduce((sum, pair) => sum + pair.lessons.length, 0);
  const todo = Math.min(tasks.length, LIMIT);
  const selected = SELECTION ? `, forced lessons ${formatLessonList(SELECTION)}` : "";

  console.log(
    `Plan: ${pairs.length} file(s), ${totalLessons} lessons, ` +
      (SELECTION
        ? `${tasks.length} to regenerate${selected}`
        : `${totalLessons - tasks.length} already done, ${tasks.length} to generate`) +
      ` (this run: ${todo}), provider ${PROVIDER}, model ${MODEL}, concurrency ${CONCURRENCY}`,
  );
  if (DRY_RUN) {
    const slice = tasks.slice(0, todo);
    for (const pair of pairs) {
      const calls = slice.filter((task) => task.pair === pair);
      const verbsOnly = pair.lessons.every((l) => !l.parts.passage && !l.parts.words);
      console.log(
        `  ${languageTag(pair.language)}/${pair.moduleId.padEnd(28)} ${String(pair.lessons.length).padStart(2)} lessons ` +
          `(${pair.language} <- ${pair.nativeLanguage})${verbsOnly ? " VERBS ONLY" : ""}  to generate: ${calls.length}` +
          `  lessons to call: ${formatLessonList(calls.map((task) => task.plan.n))}` +
          `  provider ${PROVIDER}  model ${MODEL}`,
      );
    }
    const verbOnlyCalls = slice.filter((t) => !t.plan.parts.passage && !t.plan.parts.words).length;
    const fullCalls = slice.length - verbOnlyCalls;
    const inputTokens = fullCalls * EST_INPUT_TOKENS + verbOnlyCalls * Math.round(EST_INPUT_TOKENS * 0.8);
    const outputTokens = fullCalls * EST_OUTPUT_TOKENS + verbOnlyCalls * Math.round(EST_OUTPUT_TOKENS * 0.35);
    const seconds = Math.round(
      ((fullCalls + verbOnlyCalls * 0.4) * EST_SECONDS_PER_LESSON_AT_6 * 6) / CONCURRENCY,
    );
    console.log(
      `Estimated lessons to generate: ${slice.length} (${fullCalls} full, ${verbOnlyCalls} verbs-only; one model call each plus retries)\n` +
        `Estimated tokens (retries included): input ~${fmt(inputTokens)}, output ~${fmt(outputTokens)}\n` +
        `Estimated wall time at concurrency ${CONCURRENCY}: ~${Math.round(seconds / 60)} min (rate limits can add more)`,
    );
    return;
  }

  // Only the api provider needs the key; the cli provider uses the subscription login.
  let key: string | null = null;
  if (RUN.requiresApiKey) {
    key = process.env.ANTHROPIC_API_KEY ?? null;
    if (!key) {
      console.error("ANTHROPIC_API_KEY is not set in the environment.");
      process.exit(1);
    }
  }

  const startedAt = Date.now();
  const queue = tasks.slice(0, todo);
  const failures: string[] = [];
  const settlements = new Map(pairs.map((pair) => [pair, createPairSettlement(toCall(pair).map((l) => l.n))]));
  /** Pairs whose public file was left alone because a lesson failed, with the failed numbers. */
  const unwritten: { pair: Pair; failed: number[] }[] = [];
  const bytesWritten = new Map<string, number>();
  let fatal: string | null = null;
  let lastLog = 0;

  // Files that need no calls (already complete) still get their public file.
  // With --lessons, only the pairs it selects lessons from are written.
  for (const pair of pairs) {
    if (!SELECTION && missing(pair).length === 0) bytesWritten.set(pair.publicFile, writePublicFile(pair));
  }

  const summary = (final = false) => {
    const remaining = queue.length - stats.done - stats.failed;
    console.log(
      `${final ? "FINAL" : "progress"} done ${stats.done} / failed ${stats.failed} / remaining ${Math.max(0, remaining)}` +
        ` | tokens in ${fmt(stats.inputTokens)} out ${fmt(stats.outputTokens)}` +
        ` | calls ${stats.calls} (http retries ${stats.httpRetries}, validation retries ${stats.validationRetries})` +
        ` | ${elapsed(startedAt)}`,
    );
  };

  let next = 0;
  async function worker() {
    while (!fatal) {
      const index = next++;
      if (index >= queue.length) return;
      const { pair, plan } = queue[index];
      let ok = false;
      try {
        const content = await generateLesson(key, pair, plan);
        pair.done[String(plan.n)] = { ...content, model: MODEL };
        pair.model = MODEL;
        saveProgress(pair);
        stats.done++;
        ok = true;
      } catch (error) {
        if (error instanceof FatalError) {
          fatal = error.message;
          return;
        }
        stats.failed++;
        const message = `${languageTag(pair.language)}/${pair.moduleId} lesson ${plan.n}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        failures.push(message);
        console.log(`FAILED ${message}`);
      }
      // One rule for both outcomes: the pair's public file is considered only once every task
      // for the pair has settled, and is left alone when any of them failed.
      const settled = settlements.get(pair)?.settle(plan.n, ok);
      if (settled) {
        const label = `${languageTag(pair.language)}/${pair.moduleId}`;
        if (!settled.writePublic) {
          unwritten.push({ pair, failed: settled.failed });
          console.log(
            `public file NOT rewritten: ${label}; lessons that failed: ${formatLessonList(settled.failed)}` +
              " (the lessons that succeeded are kept in the progress file)",
          );
        } else if (missing(pair).length === 0) {
          const bytes = writePublicFile(pair);
          bytesWritten.set(pair.publicFile, bytes);
          console.log(`file complete: ${label} (${fmt(bytes)} bytes)`);
        }
      }
      if (Date.now() - lastLog > 15_000) {
        lastLog = Date.now();
        summary();
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));

  const index = writeIndex();
  summary(true);
  if (fatal) console.error(`Stopped early: ${fatal}`);
  if (failures.length > 0) {
    const passThrough: Record<string, string> = {};
    for (const name of ["claude-bin", "out-root"]) {
      const value = flag(name);
      if (value) passThrough[name] = value;
    }
    console.log(`${failures.length} failed lesson(s).`);
    if (unwritten.length > 0) {
      console.log(
        "Public file(s) left as they were, because a lesson failed. Complete each by regenerating only the failed lessons:",
      );
      for (const { pair, failed } of unwritten) {
        console.log(
          `  ${formatRerunCommand({
            script: SCRIPT_PATH,
            moduleId: pair.moduleId,
            lang: languageTag(pair.language),
            failed,
            provider: PROVIDER,
            model: MODEL,
            passThrough,
          })}`,
        );
      }
    }
  }
  const incomplete = pairs.filter((pair) => missing(pair).length > 0).length;
  console.log(
    `Files on disk: ${index.length} (index.json). Incomplete in this plan: ${incomplete}. ` +
      `Bytes written this run: ${fmt([...bytesWritten.values()].reduce((a, b) => a + b, 0))}`,
  );
  if (fatal || failures.length > 0) process.exitCode = 1;
}

await main();
