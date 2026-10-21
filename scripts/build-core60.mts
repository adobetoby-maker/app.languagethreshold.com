// Built by TAC — 2026-10-20
// Core 60 stage generator: writes a trade's free Foundation (10 A1 lessons) and its Master 20
// (B1 to B2) as data, in the format of docs/core60-architecture.md, with Roofing's hand-written
// stages as the reference. Prompts, schemas and checks: src/lib/core60-generator-core.ts.
//
//   node scripts/build-core60.mts --module electrician,nursing [flags]
//   node scripts/build-core60.mts --dry-run                      # every remaining module
//
// Per (module, stage):
//   step 1  the stage curriculum. Foundation: one call (F1-F10 topics fixed). Master: an outline
//           call (titles, objectives, grammar focus, lesson type, fixed block A-E, scene, safety
//           flag), then one call per block of four lessons (words, grammar examples, Say it brief).
//           Validated with validateStageFile + the generator's stage-wide checks (unique terms,
//           titles not from the Core 30, missions that never reveal the complication, ...).
//   step 2  one call per lesson for the passage and verbs, validated with validateLessonContent
//           (contentLimitsFor the stage), every term's head word in the passage, attributed specs.
//   A failing reply is retried with its error list (up to 4 attempts per call). A Master whose
//   stage-wide check fails after all five blocks redoes the offending block(s) once; if it still
//   fails, those blocks are cleared from the progress file so --resume writes them again.
//   When every lesson passes, the stage is published in one go, in crash-safe order:
//   public/lesson-content/<lang>/<id>.json, src/data/core60/<lang>/<id>.json, index.json, and the
//   manifest line LAST (with the stage's own blurb, userRole and challengePrompts).
//
// Providers (--provider):
//   cli (default)  the logged-in Claude Code CLI, `claude -p`, billed to the owner's Claude
//                  subscription (Keychain OAuth). Each call: --output-format json, --json-schema
//                  (the tool's schema), --tools "" (no tools), --system-prompt (replaces Claude
//                  Code's own), --safe-mode (no CLAUDE.md, hooks, skills, plugins, MCP),
//                  --strict-mcp-config, --no-session-persistence, --disable-slash-commands, run
//                  from an empty temp directory with every ANTHROPIC_* / CLAUDE_CODE_* variable
//                  removed from the child's environment (so it can never bill an API key).
//                  Usage limits, rate limits and overloads pause every call and retry with
//                  exponential backoff (30 s doubling, max 15 min per wait). Default model Opus.
//   api            the Anthropic API with ANTHROPIC_API_KEY (tool calls). Default model Sonnet.
//
// Pairs: Spanish target / English native for every module with Spanish Core 30 content; English
// target / Spanish native for the English-for-work modules (learnDirection "en-target"), the same
// rule as scripts/build-lesson-content.mts. Roofing (hand-written) is never touched.
//
// Flags:
//   --module <id,...|all>      modules to write (required unless --dry-run)
//   --stage foundation|master  one stage only (default both)
//   --provider cli|api         default cli (subscription); api bills ANTHROPIC_API_KEY
//   --model sonnet|opus|<id>   default claude-opus-5-5 (cli) / claude-sonnet-5-5 (api)
//   --concurrency N            parallel calls (default 2 for cli, 6 for api)
//   --claude-bin <path>        the CLI (default ~/.local/bin/claude, else "claude" on PATH)
//   --rate-limit-wait-hours N  give up (resumable) after waiting this long on limits (default 8)
//   --resume                   continue a stage that has saved progress
//   --force                    start the selected stages over (also re-writes published stages)
//   --tag <name>               write progress under .core60-progress/<name>/ and never publish
//                              (side-by-side model comparisons)
//   --dry-run                  print the plan with estimated tokens and dollars; call nothing
//   --env-file <path>          where to read ANTHROPIC_API_KEY when it is not in the environment
//                              (default: ./.dev.vars, then ~/language-lens-elite/.dev.vars)
//   --timeout-ms N             per-call timeout (default 600000)
//
// api: the key is read from the environment (or the env file, into this process only) and is never
// printed or logged. cli: no key is read or passed. Progress (gitignored, resumable, one entry per
// call with its tokens and the CLI's notional cost): .core60-progress/

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { runClaudeCli } from "../src/lib/claude-cli-runner.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";
import {
  LESSON_CONTENT_VERSION,
  cleanLessonVerbs,
  cleanPassage,
  verbsFromModelOutput,
  type LessonContentFile,
  type LessonContentLesson,
} from "../src/lib/lesson-content-core.ts";
import { languageTag } from "../src/lib/lesson-words-core.ts";
import {
  stageFileRelativePath,
  stageModuleId,
  type Core60ManifestEntry,
  type Core60StageFile,
  type Core60StageKind,
  type Core60StageLesson,
} from "../src/lib/core60-stage-core.ts";
import {
  BLOCK_TOOL,
  CONTENT_TOOL,
  CORE60_DEFAULT_PROVIDER,
  CORE60_MODEL_PRICES,
  CORE60_PROVIDER_DEFAULT_MODEL,
  FOUNDATION_TOOL,
  MASTER_BLOCKS,
  OUTLINE_TOOL,
  assembleStageFile,
  blockErrors,
  blockFromReply,
  blocksToRedo,
  catalogErrors,
  catalogManifestStage,
  cliInputTokens,
  cliJsonSchema,
  cliPrompt,
  cliSystemPrompt,
  core60PairFor,
  costUsd,
  estimateCost,
  estimateStage,
  foundationCurriculumRequest,
  foundationFromReply,
  masterBlockRequest,
  masterOutlineRequest,
  outlineErrors,
  outlineFromReply,
  parseCliOutput,
  resolveModel,
  stageContentErrors,
  stageContentRequest,
  stageFileErrors,
  toolInput,
  type ApiRequest,
  type CliCallUsage,
  type ContentBlockLike,
  type Core60Provider,
  type Core60Pair,
  type MasterOutline,
  type StageCatalog,
  type StageContext,
} from "../src/lib/core60-generator-core.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE_ROOT = join(ROOT, "src", "data", "core60");
const MANIFEST_FILE = join(STAGE_ROOT, "manifest.ts");
const CONTENT_ROOT = join(ROOT, "public", "lesson-content");
const PROGRESS_ROOT = join(ROOT, ".core60-progress");

// ─── Flags ───────────────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : "";
}
const has = (name: string) => process.argv.includes(`--${name}`);
const intFlag = (name: string, fallback: number) => {
  const value = Number.parseInt(flag(name) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const MODULE_ARG = (flag("module") ?? "").trim().toLowerCase();
const WANT_MODULES = MODULE_ARG && MODULE_ARG !== "all" ? MODULE_ARG.split(",").map((s) => s.trim()).filter(Boolean) : [];
const STAGE_ARG = flag("stage");
const STAGES: Core60StageKind[] =
  STAGE_ARG === "foundation" || STAGE_ARG === "master" ? [STAGE_ARG] : ["foundation", "master"];
const PROVIDER_ARG = flag("provider");
const PROVIDER: Core60Provider = PROVIDER_ARG === "api" || PROVIDER_ARG === "cli" ? PROVIDER_ARG : CORE60_DEFAULT_PROVIDER;
if (PROVIDER_ARG !== undefined && PROVIDER_ARG !== PROVIDER) {
  console.error('--provider must be "cli" or "api"');
  process.exit(2);
}
const MODEL = resolveModel(flag("model"), PROVIDER);
const CONCURRENCY = intFlag("concurrency", PROVIDER === "cli" ? 2 : 6);
const CLAUDE_BIN =
  flag("claude-bin") || (existsSync(join(homedir(), ".local", "bin", "claude")) ? join(homedir(), ".local", "bin", "claude") : "claude");
const RATE_LIMIT_WAIT_MS = intFlag("rate-limit-wait-hours", 8) * 3_600_000;
const TIMEOUT_MS = intFlag("timeout-ms", 600_000);
const DRY_RUN = has("dry-run");
const FORCE = has("force");
const RESUME = has("resume");
const TAG = (flag("tag") ?? "").replace(/[^a-z0-9._-]/gi, "");
const PUBLISH = TAG === "";
const PROGRESS_DIR = TAG ? join(PROGRESS_ROOT, TAG) : PROGRESS_ROOT;
const MAX_ATTEMPTS = 4;

if (STAGE_ARG !== undefined && STAGES.length === 2) {
  console.error('--stage must be "foundation" or "master"');
  process.exit(2);
}

// ─── Small file helpers ──────────────────────────────────────────────────────

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeAtomic(file: string, text: string) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  writeFileSync(temp, text);
  renameSync(temp, file);
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const usd = (n: number | null) => (n === null ? "unpriced" : `$${n.toFixed(2)}`);

// ─── Plan ────────────────────────────────────────────────────────────────────

interface Usage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  validationRetries: number;
}
const emptyUsage = (): Usage => ({ calls: 0, inputTokens: 0, outputTokens: 0, validationRetries: 0 });

/** One call as the progress log keeps it (tokens; for the cli provider also its notional cost). */
interface CallLog {
  kind: string;
  attempt: number;
  provider: Core60Provider;
  at: string;
  ok: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  /** cli: the CLI's total_cost_usd (list-price notional; not billed on a subscription). */
  costUsd?: number | null;
  durationMs?: number | null;
  numTurns?: number | null;
  model?: string | null;
  error?: string;
}

interface Progress {
  module: string;
  base: string;
  stage: Core60StageKind;
  language: string;
  nativeLanguage: string;
  model: string;
  startedAt: string;
  foundation?: { threshold: string; catalog?: StageCatalog; lessons: Core60StageLesson[] };
  outline?: MasterOutline;
  blocks?: Record<string, Core60StageLesson[] | undefined>;
  content: Record<string, LessonContentLesson | undefined>;
  usage: Record<string, Usage>;
  calls?: CallLog[];
  failures: string[];
  /** Set when the stage was published from this progress (a --force rewrite resumes until then). */
  publishedAt?: string;
}

interface StagePlan {
  ctx: StageContext;
  moduleId: string;
  progressFile: string;
  stageFile: string;
  contentFile: string;
  published: boolean;
  progress: Progress | null;
}

/** The trade's Core 30 titles, objectives and target-language terms, for every prompt. */
function core30Context(moduleId: string, language: string) {
  const curriculum = getCurriculum(moduleId)!;
  const content = readJson<LessonContentFile>(join(CONTENT_ROOT, languageTag(language), `${moduleId}.json`));
  const terms = new Set<string>();
  for (const lesson of Object.values(content?.lessons ?? {})) {
    for (const word of lesson.words ?? []) if (word.kind === "term") terms.add(word.es);
  }
  for (const lesson of curriculum.lessons) {
    for (const word of lesson.words ?? []) if (word.kind === "term") terms.add(word.es);
  }
  return {
    titles: curriculum.lessons.map((lesson) => lesson.title),
    objectives: curriculum.lessons.map((lesson) => lesson.objective),
    terms: [...terms],
  };
}

interface Skipped {
  module: string;
  reason: string;
}

function buildPlan(): { plans: StagePlan[]; skipped: Skipped[] } {
  const plans: StagePlan[] = [];
  const skipped: Skipped[] = [];
  const ids = new Set(MODULES.map((m) => m.id));
  for (const want of WANT_MODULES) {
    if (!ids.has(want)) {
      console.error(`Unknown module: ${want}`);
      process.exit(2);
    }
  }
  for (const module of MODULES) {
    if (module.id.startsWith("foundation-") || module.id.startsWith("master-")) continue;
    if (WANT_MODULES.length > 0 && !WANT_MODULES.includes(module.id)) continue;
    const curriculum = getCurriculum(module.id);
    if (!curriculum) continue;
    const pair: Core60Pair | null = core60PairFor(
      module,
      moduleSupportsLearningPair(module, "Spanish", "English"),
    );
    if (!pair) {
      skipped.push({ module: module.id, reason: "no Spanish or English-for-work pair" });
      continue;
    }
    const tag = languageTag(pair.language);
    if (!existsSync(join(CONTENT_ROOT, tag, `${module.id}.json`))) {
      skipped.push({ module: module.id, reason: `no Core 30 content (${tag}/${module.id}.json)` });
      continue;
    }
    for (const stage of STAGES) {
      const moduleId = stageModuleId(stage, module.id);
      // Hand-written stages (roofing) are catalog modules of their own: never generated.
      if (ids.has(moduleId) && !CORE60_MANIFEST.some((e) => e.base === module.id && e[stage])) {
        skipped.push({ module: moduleId, reason: "hand-written stage" });
        continue;
      }
      const ctx: StageContext = { module, stage, pair, core30: core30Context(module.id, pair.language) };
      const stageFile = join(STAGE_ROOT, stageFileRelativePath(pair.language, moduleId));
      const contentFile = join(CONTENT_ROOT, tag, `${moduleId}.json`);
      const published =
        CORE60_MANIFEST.some((e) => e.base === module.id && e[stage]) &&
        existsSync(stageFile) &&
        existsSync(contentFile);
      const progressFile = join(PROGRESS_DIR, tag, `${moduleId}.json`);
      plans.push({
        ctx,
        moduleId,
        progressFile,
        stageFile,
        contentFile,
        published,
        progress: FORCE ? null : readJson<Progress>(progressFile),
      });
    }
  }
  return { plans, skipped };
}

function stageLessons(progress: Progress | null, stage: Core60StageKind): Core60StageLesson[] | null {
  if (!progress) return null;
  if (stage === "foundation") return progress.foundation?.lessons ?? null;
  const lessons = MASTER_BLOCKS.flatMap((block) => progress.blocks?.[block.block] ?? []);
  return lessons.length === 20 ? lessons : null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

class FatalError extends Error {}

let client: Anthropic | null = null;
let active = 0;
const waiting: (() => void)[] = [];
/** A usage / rate limit pauses every call until this time (epoch ms). */
let pausedUntil = 0;
const sleep = (ms: number) => new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms));
async function slot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((resolveSlot) => waiting.push(resolveSlot));
  active++;
  try {
    while (Date.now() < pausedUntil) await sleep(pausedUntil - Date.now());
    return await run();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const runUsage = new Map<string, Usage>();
let runNotionalUsd = 0;
function logCall(progress: Progress, entry: Omit<CallLog, "at" | "provider">) {
  (progress.calls ??= []).push({ at: new Date().toISOString(), provider: PROVIDER, ...entry });
  if (typeof entry.costUsd === "number") runNotionalUsd += entry.costUsd;
}
function addUsage(progress: Progress, kind: string, input: number, output: number, retry: boolean) {
  const bump = (entry: Usage) => {
    entry.calls += 1;
    entry.inputTokens += input;
    entry.outputTokens += output;
    if (retry) entry.validationRetries += 1;
    return entry;
  };
  progress.usage[kind] = bump(progress.usage[kind] ?? emptyUsage());
  runUsage.set(kind, bump(runUsage.get(kind) ?? emptyUsage()));
}

/**
 * One validated call: the request, then up to MAX_ATTEMPTS - 1 retries that show the model its
 * own reply and the exact errors. Resolves the parsed value, or throws with the last errors.
 */
async function validatedCall<T>(
  progress: Progress,
  kind: string,
  body: ApiRequest,
  toolName: string,
  check: (input: Record<string, unknown>) => { value: T; errors: string[] },
): Promise<T> {
  if (PROVIDER === "cli") return validatedCliCall(progress, kind, body, toolName, check);
  const messages = [...body.messages] as { role: "user" | "assistant"; content: unknown }[];
  let last = "no attempt";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const message = await slot(async () => {
      try {
        const stream = client!.messages.stream(
          { ...body, messages } as unknown as Parameters<Anthropic["messages"]["stream"]>[0],
          { timeout: TIMEOUT_MS },
        );
        return await stream.finalMessage();
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
          throw new FatalError(`Anthropic API refused the key (HTTP ${error.status})`);
        }
        if (error instanceof Anthropic.BadRequestError) {
          throw new FatalError(`Anthropic API rejected the request: ${String(error.message).slice(0, 300)}`);
        }
        throw error;
      }
    });
    addUsage(progress, kind, message.usage.input_tokens ?? 0, message.usage.output_tokens ?? 0, attempt > 0);
    logCall(progress, {
      kind,
      attempt,
      ok: true,
      inputTokens: message.usage.input_tokens ?? 0,
      outputTokens: message.usage.output_tokens ?? 0,
      model: MODEL,
    });
    const content = message.content as unknown as ContentBlockLike[];
    const input = toolInput(content, toolName);
    let errors: string[];
    let value: T | null = null;
    if (message.stop_reason === "refusal") {
      errors = ["The request was declined (refusal). Write the course content again, keeping to communication and verification."];
    } else if (!input) {
      errors = [
        `You did not call the ${toolName} tool with a complete object${message.stop_reason === "max_tokens" ? " (the reply hit max_tokens: be more concise)" : ""}. Call it now with the complete content.`,
      ];
    } else {
      const checked = check(input);
      value = checked.value;
      errors = checked.errors;
      if (errors.length === 0) return value;
    }
    last = errors.slice(0, 6).join(" | ");
    const feedback = `Fix these problems and return the COMPLETE result again by calling ${toolName} (everything, not only the fixed parts):\n- ${errors.slice(0, 40).join("\n- ")}`;
    messages.push({ role: "assistant", content: message.content });
    const toolUses = content.filter((block) => block.type === "tool_use");
    messages.push({
      role: "user",
      content:
        toolUses.length > 0
          ? toolUses.map((block, index) => ({
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: index === 0 ? feedback : "See the first result.",
            }))
          : feedback,
    });
  }
  throw new Error(`${kind} failed validation after ${MAX_ATTEMPTS} attempts: ${last}`);
}

// ─── cli provider: `claude -p` on the owner's subscription ──────────────────

let cliCwd: string | null = null;

function runCli(args: string[], input: string): Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean }> {
  cliCwd ??= mkdtempSync(join(tmpdir(), "core60-cli-"));
  return runClaudeCli({ bin: CLAUDE_BIN, args, input, cwd: cliCwd, timeoutMs: TIMEOUT_MS });
}

const MAX_WAIT_MS = 15 * 60_000;

/**
 * One CLI call, retried through limits and transient failures: a usage / rate limit or overload
 * pauses every call (until the CLI's reset time when it gives one, else 30 s doubling, at most
 * 15 min per wait) for up to --rate-limit-wait-hours in total; a broken login stops the run;
 * anything else is retried 3 times. Every call is logged with the CLI's usage and notional cost.
 */
async function callCli(
  progress: Progress,
  kind: string,
  attempt: number,
  system: string,
  schema: string,
  prompt: string,
  effort: string | undefined,
): Promise<Record<string, unknown> | null> {
  const args = [
    "-p",
    "--output-format", "json",
    "--model", MODEL,
    "--tools", "",
    "--system-prompt", system,
    "--json-schema", schema,
    ...(effort ? ["--effort", effort] : []),
    "--safe-mode",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--disable-slash-commands",
  ];
  let backoff = 30_000;
  let waited = 0;
  let failures = 0;
  for (;;) {
    const run = await slot(() => runCli(args, prompt));
    const outcome = run.timedOut
      ? { ...parseCliOutput("", "", run.code), error: `timed out after ${TIMEOUT_MS} ms`, kind: "other" as const, ok: false }
      : parseCliOutput(run.stdout, run.stderr, run.code);
    const usage: CliCallUsage = outcome.usage;
    logCall(progress, {
      kind,
      attempt,
      ok: outcome.ok,
      inputTokens: cliInputTokens(usage),
      outputTokens: usage.outputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      costUsd: usage.costUsd,
      durationMs: usage.durationMs,
      numTurns: usage.numTurns,
      model: usage.model,
      ...(outcome.ok ? {} : { error: outcome.error.slice(0, 300) }),
    });
    if (outcome.ok) {
      addUsage(progress, kind, cliInputTokens(usage), usage.outputTokens, attempt > 0);
      return outcome.value;
    }
    if (outcome.kind === "auth") {
      throw new FatalError(`the Claude CLI login was refused (${outcome.error.slice(0, 160)}); run \`claude\` and /login, then --resume`);
    }
    if (outcome.kind === "rate_limit") {
      const untilReset = outcome.resetAt ? outcome.resetAt - Date.now() + 30_000 : 0;
      const wait = Math.min(MAX_WAIT_MS, Math.max(untilReset, backoff));
      backoff = Math.min(MAX_WAIT_MS, backoff * 2);
      waited += wait;
      if (waited > RATE_LIMIT_WAIT_MS) {
        throw new FatalError(`still limited after waiting ${Math.round(waited / 60_000)} min (${outcome.error.slice(0, 160)}); rerun with --resume later`);
      }
      pausedUntil = Math.max(pausedUntil, Date.now() + wait);
      console.log(`  ${kind}: limited (${outcome.error.slice(0, 120)}); pausing all calls ${Math.round(wait / 1000)} s`);
      continue;
    }
    failures += 1;
    if (failures > 3) throw new Error(`${kind}: the Claude CLI failed ${failures} times: ${outcome.error.slice(0, 300)}`);
    console.log(`  ${kind}: CLI error (${outcome.error.slice(0, 120)}); retry ${failures} of 3`);
    await sleep(15_000 * 2 ** (failures - 1));
  }
}

/** validatedCall for the cli provider: stateless calls, each retry carries the rejected answer and its errors. */
async function validatedCliCall<T>(
  progress: Progress,
  kind: string,
  body: ApiRequest,
  toolName: string,
  check: (input: Record<string, unknown>) => { value: T; errors: string[] },
): Promise<T> {
  const tool = body.tools.find((t) => t.name === toolName) ?? body.tools[0];
  const system = cliSystemPrompt(body.system, toolName);
  const schema = JSON.stringify(cliJsonSchema(tool.input_schema));
  let retry: { reply: unknown; errors: string[] } | undefined;
  let last = "no attempt";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const input = await callCli(progress, kind, attempt, system, schema, cliPrompt(body, retry), body.output_config?.effort);
    let errors: string[];
    if (!input) {
      errors = ["Your reply was not one complete JSON object matching the schema. Return the complete content as that object."];
    } else {
      const checked = check(input);
      errors = checked.errors;
      if (errors.length === 0) return checked.value;
    }
    last = errors.slice(0, 6).join(" | ");
    console.log(`  ${progress.module} ${kind}: attempt ${attempt + 1} rejected (${errors.length} error(s): ${errors.slice(0, 2).join(" | ").slice(0, 200)})`);
    retry = { reply: input ?? "(no JSON object)", errors };
  }
  throw new Error(`${kind} failed validation after ${MAX_ATTEMPTS} attempts: ${last}`);
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function saveProgress(plan: StagePlan) {
  writeAtomic(plan.progressFile, JSON.stringify(plan.progress, null, 1));
}

async function stepCurriculum(plan: StagePlan): Promise<Core60StageFile> {
  const { ctx } = plan;
  const progress = plan.progress!;
  if (ctx.stage === "foundation") {
    if (!progress.foundation) {
      progress.foundation = await validatedCall(
        progress,
        "foundationCurriculum",
        foundationCurriculumRequest(ctx, MODEL),
        FOUNDATION_TOOL,
        (input) => {
          const value = foundationFromReply(input, ctx);
          const file = assembleStageFile(ctx, value.threshold, value.lessons, provenance(progress));
          return { value, errors: [...stageFileErrors(file, ctx), ...catalogErrors(value.catalog, ctx)] };
        },
      );
      saveProgress(plan);
      console.log(`  ${plan.moduleId}: curriculum written (10 lessons)`);
    }
    return assembleStageFile(ctx, progress.foundation.threshold, progress.foundation.lessons, provenance(progress));
  }
  if (!progress.outline) {
    progress.outline = await validatedCall(
      progress,
      "masterOutline",
      masterOutlineRequest(ctx, MODEL),
      OUTLINE_TOOL,
      (input) => {
        const value = outlineFromReply(input);
        return { value, errors: outlineErrors(value, ctx) };
      },
    );
    saveProgress(plan);
    console.log(`  ${plan.moduleId}: outline written`);
  }
  const outline = progress.outline;
  progress.blocks ??= {};
  const writeBlock = async (block: (typeof MASTER_BLOCKS)[number], others: Core60StageLesson[], kind: string) => {
    progress.blocks![block.block] = await validatedCall(
      progress,
      kind,
      masterBlockRequest(ctx, MODEL, outline, block, others),
      BLOCK_TOOL,
      (input) => {
        const value = blockFromReply(input, outline, block);
        return { value, errors: blockErrors(value, others, ctx, outline.threshold) };
      },
    );
    saveProgress(plan);
    console.log(`  ${plan.moduleId}: block ${block.block} written${kind === "masterBlock" ? "" : " (redo)"}`);
  };
  for (const block of MASTER_BLOCKS) {
    if (progress.blocks[block.block]) continue;
    const earlier = MASTER_BLOCKS.filter((b) => b.block < block.block).flatMap((b) => progress.blocks![b.block] ?? []);
    await writeBlock(block, earlier, "masterBlock");
  }
  const assemble = () => assembleStageFile(ctx, outline.threshold, stageLessons(progress, "master")!, provenance(progress));
  // Clears blocks (and any content written for their lessons) so they are written again.
  const clearBlocks = (blocks: readonly string[]) => {
    for (const b of blocks) {
      delete progress.blocks![b];
      for (const n of MASTER_BLOCKS.find((spec) => spec.block === b)!.lessons) delete progress.content[String(n)];
    }
    saveProgress(plan);
  };
  let file = assemble();
  let errors = stageFileErrors(file, ctx);
  if (errors.length > 0) {
    // Cross-block problems the per-block checks could not see: redo the offending block(s) once,
    // each checked against every other block.
    const redo = blocksToRedo(errors);
    console.log(`  ${plan.moduleId}: stage-wide check failed (${errors.slice(0, 3).join(" | ")}); redoing block(s) ${redo.join(", ")}`);
    clearBlocks(redo);
    for (const b of redo) {
      const block = MASTER_BLOCKS.find((spec) => spec.block === b)!;
      const others = MASTER_BLOCKS.filter((spec) => spec.block !== b).flatMap((spec) => progress.blocks![spec.block] ?? []);
      await writeBlock(block, others, "masterBlockRedo");
    }
    file = assemble();
    errors = stageFileErrors(file, ctx);
    if (errors.length > 0) {
      // Never keep a bad block cached: --resume writes the offending blocks again instead of looping.
      const again = blocksToRedo(errors);
      clearBlocks(again);
      throw new Error(
        `stage file failed validation after the redo (block(s) ${again.join(", ")} cleared; --resume writes them again): ${errors.slice(0, 6).join(" | ")}`,
      );
    }
  }
  return file;
}

function provenance(progress: Progress) {
  return { model: progress.model, generatedAt: progress.startedAt };
}

async function stepContent(plan: StagePlan, file: Core60StageFile): Promise<string[]> {
  const { ctx } = plan;
  const progress = plan.progress!;
  const failures: string[] = [];
  const kind = ctx.stage === "foundation" ? "foundationLesson" : "masterLesson";
  await Promise.all(
    file.lessons.map(async (lesson, i) => {
      if (progress.content[String(lesson.n)]) return;
      const outlineLesson = progress.outline?.lessons.find((l) => l.n === lesson.n);
      try {
        const content = await validatedCall(
          progress,
          kind,
          stageContentRequest(ctx, MODEL, lesson, {
            scene: outlineLesson?.scene,
            safetySensitive: outlineLesson?.safetySensitive,
            previousTitle: file.lessons[i - 1]?.title ?? null,
          }),
          CONTENT_TOOL,
          (input) => {
            const value: LessonContentLesson = { verbs: verbsFromModelOutput(input.verbs, ctx.pair.language) };
            const passage = cleanPassage(input.passage);
            if (passage) value.passage = passage;
            return { value, errors: stageContentErrors(value, lesson, ctx) };
          },
        );
        progress.content[String(lesson.n)] = content;
        saveProgress(plan);
      } catch (error) {
        if (error instanceof FatalError) throw error;
        const message = `${plan.moduleId} lesson ${lesson.n}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(message);
        progress.failures.push(message);
        saveProgress(plan);
        console.log(`  FAILED ${message}`);
      }
    }),
  );
  return failures;
}

// ─── Publishing ──────────────────────────────────────────────────────────────

const manifest: Core60ManifestEntry[] = CORE60_MANIFEST.map((entry) => ({ ...entry }));

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function tsValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(tsValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return `{ ${entries.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${tsValue(v)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

function writeManifest() {
  const source = readFileSync(MANIFEST_FILE, "utf8");
  const head = source.slice(0, source.indexOf("export const CORE60_MANIFEST"));
  const sorted = [...manifest].sort((a, b) => a.base.localeCompare(b.base));
  const body =
    sorted.length === 0
      ? "export const CORE60_MANIFEST: readonly Core60ManifestEntry[] = [];\n"
      : `export const CORE60_MANIFEST: readonly Core60ManifestEntry[] = [\n${sorted.map((e) => `  ${tsValue(e)},`).join("\n")}\n];\n`;
  writeAtomic(MANIFEST_FILE, head + body);
}

/** Python json.dumps separators, which public/lesson-content/index.json is written with. */
function pyJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(pyJson).join(", ")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>).map(([k, v]) => `${JSON.stringify(k)}: ${pyJson(v)}`).join(", ")}}`;
  return JSON.stringify(value);
}

function upsertIndex(language: string, module: string, lessons: number, bytes: number) {
  const file = join(CONTENT_ROOT, "index.json");
  const index = readJson<{ version: number; files: { language: string; module: string; lessons: number; bytes: number; reviewed: boolean }[] }>(file) ?? {
    version: LESSON_CONTENT_VERSION,
    files: [],
  };
  const tag = languageTag(language);
  index.files = index.files.filter((entry) => !(entry.language === tag && entry.module === module));
  index.files.push({ language: tag, module, lessons, bytes, reviewed: false });
  index.files.sort((a, b) => a.language.localeCompare(b.language) || a.module.localeCompare(b.module));
  writeAtomic(file, pyJson(index));
}

/**
 * Publishes a complete stage. Order (crash-safe): the lesson content, the stage file, index.json,
 * and the manifest LAST, so a crash never leaves the manifest pointing at a missing file (an
 * unlisted stage file is only a validate:core60 warning). The manifest entry gets the stage's own
 * catalog text (blurb, userRole, challengePrompts).
 */
function publish(plan: StagePlan, file: Core60StageFile) {
  const { ctx } = plan;
  const progress = plan.progress!;
  const lessons: Record<string, LessonContentLesson> = {};
  for (const lesson of file.lessons) {
    const content = progress.content[String(lesson.n)]!;
    lessons[String(lesson.n)] = { passage: content.passage, verbs: cleanLessonVerbs(content.verbs, ctx.pair.language) };
  }
  const content: LessonContentFile = {
    version: LESSON_CONTENT_VERSION,
    module: plan.moduleId,
    language: ctx.pair.language,
    nativeLanguage: ctx.pair.nativeLanguage,
    model: progress.model,
    generatedAt: progress.startedAt,
    reviewed: false,
    lessons,
  };
  writeAtomic(plan.contentFile, JSON.stringify(content));
  writeAtomic(plan.stageFile, `${JSON.stringify(file, null, 2)}\n`);
  upsertIndex(ctx.pair.language, plan.moduleId, file.lessons.length, statSync(plan.contentFile).size);
  let entry = manifest.find((e) => e.base === ctx.module.id);
  if (!entry) {
    entry = { base: ctx.module.id, language: ctx.pair.language };
    manifest.push(entry);
  }
  const catalog = ctx.stage === "foundation" ? progress.foundation?.catalog : progress.outline?.catalog;
  entry[ctx.stage] = catalog ? catalogManifestStage(catalog) : (entry[ctx.stage] ?? {});
  writeManifest();
  progress.publishedAt = new Date().toISOString();
  saveProgress(plan);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

function loadKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const candidates = [flag("env-file"), join(ROOT, ".dev.vars"), join(homedir(), "language-lens-elite", ".dev.vars")].filter(
    (path): path is string => Boolean(path),
  );
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const line = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .find((l) => /^\s*ANTHROPIC_API_KEY\s*=/.test(l));
    const value = line?.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    if (value) {
      process.env.ANTHROPIC_API_KEY = value;
      return value;
    }
  }
  return null;
}

function dryRun(plans: StagePlan[], skipped: Skipped[]) {
  const rows = plans.filter((plan) => !plan.published || FORCE);
  let sonnet = 0;
  let opus = 0;
  let input = 0;
  let output = 0;
  let calls = 0;
  let lessons = 0;
  console.log(
    `Plan: ${rows.length} stage(s) to write, provider ${PROVIDER}, model for this run ${MODEL}, concurrency ${CONCURRENCY}` +
      (PROVIDER === "cli" ? " (billed to the Claude subscription: dollar figures are notional list prices)" : ""),
  );
  for (const plan of rows) {
    const total = plan.ctx.stage === "foundation" ? 10 : 20;
    const done = Object.keys(plan.progress?.content ?? {}).length;
    const curriculumDone = stageLessons(plan.progress, plan.ctx.stage) !== null;
    const est = estimateStage(plan.ctx.stage, total - done, curriculumDone);
    const o = estimateCost("claude-opus-5-5", est)!;
    const s = estimateCost("claude-sonnet-5-5", est)!;
    sonnet += s;
    opus += o;
    input += est.inputTokens;
    output += est.outputTokens;
    calls += est.calls;
    lessons += total - done;
    console.log(
      `  ${languageTag(plan.ctx.pair.language)}/${plan.moduleId.padEnd(36)} core ${String(plan.ctx.core30.titles.length).padStart(2)} | ${String(total - done).padStart(2)} lessons  calls ~${String(est.calls).padStart(2)}  in ~${fmt(est.inputTokens).padStart(7)}  out ~${fmt(est.outputTokens).padStart(7)}  opus ${usd(o).padStart(7)}  sonnet ${usd(s).padStart(7)}`,
    );
  }
  for (const skip of skipped) console.log(`  skipped ${skip.module}: ${skip.reason}`);
  console.log(
    `Total: ${rows.length} stages, ${lessons} lessons, ~${fmt(calls)} calls (retries included), input ~${fmt(input)} / output ~${fmt(output)} tokens (Sonnet-measured)\n` +
      `  claude-opus-5-5   ($${CORE60_MODEL_PRICES["claude-opus-5-5"].input}/$${CORE60_MODEL_PRICES["claude-opus-5-5"].output} per MTok, the default build model): ${usd(opus)}\n` +
      `  claude-sonnet-5-5 ($${CORE60_MODEL_PRICES["claude-sonnet-5-5"].input}/$${CORE60_MODEL_PRICES["claude-sonnet-5-5"].output} per MTok, --model sonnet): ${usd(sonnet)}\n` +
      `  (Token figures are Sonnet's, measured on the pilot; Opus is priced at 0.61x the input and 1.0x the output tokens, as measured on master-electrician.)`,
  );
}

async function main() {
  if (!DRY_RUN && !MODULE_ARG) {
    console.error("Pass --module <id,...> (or --module all) to write stages; --dry-run to plan.");
    process.exit(2);
  }
  const { plans, skipped } = buildPlan();
  if (DRY_RUN) {
    dryRun(plans, skipped);
    return;
  }
  // A published stage is redone with --force; a --force rewrite that stopped part way (saved
  // progress, not yet published from it) continues with --resume.
  const resuming = (plan: StagePlan) => RESUME && plan.progress !== null && !plan.progress.publishedAt;
  const todo = plans.filter((plan) => !plan.published || FORCE || resuming(plan));
  for (const plan of plans.filter((p) => !todo.includes(p))) console.log(`skip ${plan.moduleId}: already published`);
  for (const plan of todo) {
    if (plan.progress && !RESUME) {
      console.error(`${plan.moduleId} has saved progress (${plan.progressFile}); pass --resume to continue it or --force to start over.`);
      process.exit(2);
    }
  }
  if (PROVIDER === "api") {
    const key = loadKey();
    if (!key) {
      console.error("ANTHROPIC_API_KEY is not set (environment or env file).");
      process.exit(1);
    }
    client = new Anthropic({ apiKey: key, maxRetries: 6, timeout: TIMEOUT_MS });
  }
  const startedAt = Date.now();
  console.log(
    `Writing ${todo.length} stage(s) with ${MODEL} via ${PROVIDER === "cli" ? `the Claude CLI (${CLAUDE_BIN}, subscription)` : "the Anthropic API"}, concurrency ${CONCURRENCY}${TAG ? `, tag ${TAG} (no publish)` : ""}`,
  );

  const results: { plan: StagePlan; ok: boolean; failures: string[] }[] = [];
  let fatal: string | null = null;
  await Promise.all(
    todo.map(async (plan) => {
      plan.progress ??= {
        module: plan.moduleId,
        base: plan.ctx.module.id,
        stage: plan.ctx.stage,
        language: plan.ctx.pair.language,
        nativeLanguage: plan.ctx.pair.nativeLanguage,
        model: MODEL,
        startedAt: new Date().toISOString(),
        content: {},
        usage: {},
        failures: [],
      };
      plan.progress.failures = [];
      try {
        const file = await stepCurriculum(plan);
        const failures = await stepContent(plan, file);
        const complete = file.lessons.every((lesson) => plan.progress!.content[String(lesson.n)]);
        if (complete && PUBLISH) {
          publish(plan, file);
          console.log(`published ${plan.moduleId}`);
        } else if (complete) {
          console.log(`complete ${plan.moduleId} (tag ${TAG}: not published)`);
        }
        results.push({ plan, ok: complete, failures });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof FatalError) fatal = message;
        plan.progress.failures.push(message);
        saveProgress(plan);
        console.log(`FAILED ${plan.moduleId}: ${message}`);
        results.push({ plan, ok: false, failures: [message] });
      }
    }),
  );

  // Report: per stage and per call kind, measured tokens and dollars (calibrates --dry-run).
  console.log("\nStage results:");
  for (const { plan, ok, failures } of results) {
    const usage = Object.values(plan.progress!.usage).reduce(
      (sum, u) => ({ calls: sum.calls + u.calls, inputTokens: sum.inputTokens + u.inputTokens, outputTokens: sum.outputTokens + u.outputTokens, validationRetries: sum.validationRetries + u.validationRetries }),
      emptyUsage(),
    );
    const safety = plan.progress!.outline?.lessons.filter((l) => l.safetySensitive).map((l) => l.n) ?? [];
    console.log(
      `  ${ok ? "OK  " : "FAIL"} ${plan.moduleId.padEnd(30)} calls ${usage.calls} (validation retries ${usage.validationRetries}) in ${fmt(usage.inputTokens)} out ${fmt(usage.outputTokens)} ${usd(costUsd(plan.progress!.model, usage.inputTokens, usage.outputTokens))}` +
        (safety.length ? ` | safety-sensitive lessons: ${safety.join(", ")}` : "") +
        (failures.length ? ` | ${failures.length} failure(s)` : ""),
    );
  }
  console.log("Per call kind (this run):");
  for (const [kind, u] of runUsage) {
    console.log(
      `  ${kind.padEnd(22)} calls ${u.calls} (retries ${u.validationRetries}) avg in ${fmt(u.inputTokens / u.calls)} out ${fmt(u.outputTokens / u.calls)}`,
    );
  }
  const total = [...runUsage.values()].reduce((s, u) => ({ ...s, inputTokens: s.inputTokens + u.inputTokens, outputTokens: s.outputTokens + u.outputTokens }), emptyUsage());
  console.log(
    `Total this run: in ${fmt(total.inputTokens)} out ${fmt(total.outputTokens)} = ${usd(costUsd(MODEL, total.inputTokens, total.outputTokens))} at list price (${MODEL})` +
      (PROVIDER === "cli" ? `, CLI-reported notional ${usd(runNotionalUsd)} (subscription: not billed)` : "") +
      ` in ${Math.round((Date.now() - startedAt) / 1000)}s`,
  );
  writeAtomic(
    join(PROGRESS_DIR, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
    JSON.stringify(
      {
        provider: PROVIDER,
        model: MODEL,
        wallSeconds: Math.round((Date.now() - startedAt) / 1000),
        notionalUsd: PROVIDER === "cli" ? runNotionalUsd : null,
        stages: results.map(({ plan, ok, failures }) => ({
          module: plan.moduleId,
          ok,
          failures,
          usage: plan.progress!.usage,
          safetySensitive: plan.progress!.outline?.lessons.filter((l) => l.safetySensitive).map((l) => l.n) ?? [],
        })),
        perKind: Object.fromEntries(runUsage),
      },
      null,
      1,
    ),
  );
  if (fatal) console.error(`Stopped early: ${fatal}`);
  if (results.some((r) => !r.ok)) {
    console.log("Some stages are incomplete; rerun the same command with --resume to retry them.");
    process.exitCode = 1;
  }
}

if (MODEL !== CORE60_PROVIDER_DEFAULT_MODEL[PROVIDER] && !CORE60_MODEL_PRICES[MODEL]) {
  console.warn(`Model ${MODEL} has no list price here; costs will show as unpriced.`);
}
await main();
