// Built by TAC — 2026-10-23
// Writes trade packs: static, module-flavored game content that the core areas read before they
// fall back to a live AI call. Ticket P1 covers one area, Word Match: 12 or more varied job-site
// boards per level (A2 / B1 / B2) for a module, checked by the same rules the app and the tests
// use (src/lib/word-match-core.ts, src/lib/trade-packs.ts).
//
//   node scripts/build-trade-packs.mts --module roofing [flags]
//   (Node 22.18+ runs .mts directly; `npx tsx scripts/build-trade-packs.mts` works too)
//
// Provider: the logged-in Claude Code CLI (`claude -p`) on the owner's Claude subscription,
// Opus by default, the same runner as scripts/build-lesson-content.mts (src/lib/claude-cli-runner.ts
// scrubs every ANTHROPIC_* variable from the child's environment). There is no API-key provider.
//
// Output (committed): public/trade-packs/<langCode>/<moduleId>.json and public/trade-packs/index.json
// Progress (gitignored, resumable): .trade-packs-progress/<langCode>/<moduleId>.wordmatch.json
//
// Flags:
//   --module <id,...>        modules to build (required)
//   --lang <name|code>       target language (default es; Spanish is the only one supported so far)
//   --area wordmatch         the area to build (default and only value for now)
//   --provider cli           the only provider (default); anything else is refused
//   --model opus|sonnet|<id> default claude-opus-5-5
//   --claude-bin <path>      the CLI (default ~/.local/bin/claude, else "claude" on PATH)
//   --concurrency N          parallel calls (default 3: one per level)
//   --batch N                boards asked for per call (default 6)
//   --resume                 continue from saved progress (this is the default; accepted for clarity)
//   --force                  ignore saved progress and rebuild even when the published pack is valid
//   --dry-run                print the plan and estimates, call nothing
//   --timeout-ms N           per-call timeout (default 600000)
//   --rate-limit-wait-hours N  give up (resumable) after waiting this long on limits (default 8)
//   --out-root <dir>         (testing) read and write public/ and the progress files under <dir>
//
// The pack file is rewritten only when the module's whole Word Match section validates; boards
// that were accepted stay in the progress file, so a later run asks only for what is missing.

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
import { MODULES, moduleSupportsLearningPair, type AppModule } from "../src/data/modules.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";
import { runClaudeCli } from "../src/lib/claude-cli-runner.ts";
import {
  cliInputTokens,
  cliJsonSchema,
  cliPrompt,
  parseCliOutput,
  resolveModel,
  type ApiRequest,
} from "../src/lib/core60-generator-core.ts";
import { cleanLessonWords, languageTag } from "../src/lib/lesson-words-core.ts";
import {
  TRADE_PACK_VERSION,
  WORD_MATCH_PACK_RULES,
  parseTradePack,
  tradePackNativeLanguage,
  tradePackPath,
  validateWordMatchSection,
  type TradePackFile,
  type TradePackIndex,
  type TradePackIndexEntry,
  type TradePackWordMatchBoard,
} from "../src/lib/trade-packs.ts";
import {
  WORD_MATCH_LEVELS,
  checkWordMatchBoard,
  wordMatchCefr,
  wordMatchKey,
  wordMatchPairCount,
  type WordMatchLevel,
} from "../src/lib/word-match-core.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Flags ───────────────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : "";
}
const has = (name: string) => process.argv.includes(`--${name}`);
const intFlag = (name: string, fallback: number) => {
  const raw = flag(name);
  const value = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
function usageError(message: string): never {
  console.error(message);
  process.exit(2);
}

const OUT_ROOT = flag("out-root");
if (OUT_ROOT === "") usageError("--out-root needs a directory (refusing to fall back to the repo root).");
const ROOT = OUT_ROOT ? resolve(OUT_ROOT) : REPO_ROOT;
const PUBLIC_DIR = join(ROOT, "public", "trade-packs");
const PROGRESS_DIR = join(ROOT, ".trade-packs-progress");

const provider = flag("provider") ?? "cli";
if (provider !== "cli") {
  usageError('--provider must be "cli": trade packs are written on the Claude subscription, never with an API key.');
}
const area = (flag("area") ?? "wordmatch").toLowerCase();
if (area !== "wordmatch") usageError('--area must be "wordmatch" (the only area built so far).');

const langFlag = (flag("lang") ?? "es").trim();
const LANGUAGE = { es: "Spanish", spanish: "Spanish" }[langFlag.toLowerCase() as "es" | "spanish"];
if (!LANGUAGE) usageError(`--lang ${langFlag}: only Spanish (es) is supported so far.`);
const NATIVE = tradePackNativeLanguage(LANGUAGE);
const LANG_CODE = languageTag(LANGUAGE);

const moduleIds = (flag("module") ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
if (moduleIds.length === 0) usageError("--module <id,...> is required (for example --module roofing).");

const DRY_RUN = has("dry-run");
const FORCE = has("force");
const MODEL = resolveModel(flag("model") || undefined, "cli");
const CONCURRENCY = intFlag("concurrency", 3);
const BATCH = intFlag("batch", 6);
const TIMEOUT_MS = intFlag("timeout-ms", 600_000);
const RATE_LIMIT_WAIT_MS = intFlag("rate-limit-wait-hours", 8) * 3_600_000;
const claudeBinFlag = flag("claude-bin");
// A path is resolved now: each call runs from an empty temp directory, where a relative one breaks.
const CLAUDE_BIN = claudeBinFlag
  ? claudeBinFlag.includes("/")
    ? resolve(claudeBinFlag)
    : claudeBinFlag
  : existsSync(join(homedir(), ".local", "bin", "claude"))
    ? join(homedir(), ".local", "bin", "claude")
    : "claude";

const BOARDS_PER_LEVEL = WORD_MATCH_PACK_RULES.minBoardsPerLevel;
const MAX_FAILED_ATTEMPTS = 6; // calls in a row per level that add no board
const MAX_REFERENCE_TERMS = 220;

// Card sizes: a card is a small tile, so keep both faces short (the shared validator only caps
// the data; these keep the boards readable on a phone).
const MAX_TARGET_CHARS = 28;
const MAX_TARGET_WORDS = 4;
const MAX_ENGLISH_CHARS = 36;
const MAX_TOPIC_WORDS = 4;

// ─── Plan ────────────────────────────────────────────────────────────────────

interface Progress {
  version: 1;
  module: string;
  language: string;
  model: string;
  startedAt: string;
  boards: TradePackWordMatchBoard[];
  calls: number;
  rejected: number;
}

interface ModulePlan {
  module: AppModule;
  progressFile: string;
  publicFile: string;
  progress: Progress;
  reference: { target: string; english: string }[];
  /** consecutive calls per level that added no board */
  failedAttempts: Record<WordMatchLevel, number>;
}

const stats = { calls: 0, retries: 0, accepted: 0, rejected: 0, inputTokens: 0, outputTokens: 0 };

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeAtomic(file: string, text: string) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

/**
 * Card text is lower case like the live boards ("teja asfáltica", "shingle"): the first letter
 * of each face is lowered unless the face is an acronym or has a capital inside a word.
 */
function cardCase(text: string): string {
  const trimmed = text.normalize("NFC").trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first.length > 1 && first === first.toUpperCase()) return trimmed;
  if (/\p{Ll}\p{Lu}/u.test(first)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function normalizeBoard<T extends { topic?: unknown; pairs?: unknown }>(board: T): T {
  if (!board || typeof board !== "object") return board;
  const pairs = Array.isArray(board.pairs)
    ? board.pairs.map((pair) => {
        const p = pair as { target?: unknown; english?: unknown } | null;
        return p && typeof p.target === "string" && typeof p.english === "string"
          ? { ...p, target: cardCase(p.target), english: cardCase(p.english) }
          : pair;
      })
    : board.pairs;
  return { ...board, pairs, topic: typeof board.topic === "string" ? board.topic.trim().toLowerCase() : board.topic };
}

/** Boards from a saved progress file or pack, normalized and re-checked: only valid ones are kept. */
function validBoards(raw: unknown): TradePackWordMatchBoard[] {
  if (!Array.isArray(raw)) return [];
  const boards: TradePackWordMatchBoard[] = [];
  for (const item of raw) {
    const level = (item as { level?: unknown })?.level;
    if (level !== 1 && level !== 2 && level !== 3) continue;
    const checked = checkWordMatchBoard(normalizeBoard(item), level);
    if (checked.ok) boards.push({ level, ...checked.board });
  }
  return boards;
}

/** A reference term as one plain card face: no "(...)" notes, the first of "a / b" alternatives. */
function plainTerm(text: string): string {
  return cardCase(text.replace(/\([^)]*\)/g, " ").split("/")[0].replace(/\s+/g, " "));
}

/**
 * The module's own Spanish terms the learner already met, as grounding: the authored Core 30
 * words (roofing) and the authored lesson content / pre-built decks of any module. Terms only,
 * deduplicated, so a board uses the same word the lessons taught.
 */
function referenceTerms(moduleId: string): { target: string; english: string }[] {
  const lists: unknown[] = [];
  if (moduleId === "roofing") lists.push(...Object.values(ROOFING_LESSON_WORDS));
  for (const dir of ["lesson-content", "lesson-decks"]) {
    const file = readJson(join(REPO_ROOT, "public", dir, LANG_CODE, `${moduleId}.json`)) as {
      lessons?: Record<string, unknown>;
    } | null;
    if (!file?.lessons || typeof file.lessons !== "object") continue;
    for (const lesson of Object.values(file.lessons)) {
      lists.push(Array.isArray(lesson) ? lesson : (lesson as { words?: unknown } | null)?.words);
    }
  }
  const seen = new Set<string>();
  const terms: { target: string; english: string }[] = [];
  for (const list of lists) {
    for (const word of cleanLessonWords(list, { maxTerms: 80, maxPhrases: 0 })) {
      if (word.kind !== "term") continue;
      const target = plainTerm(word.es);
      const english = plainTerm(word.en);
      const key = wordMatchKey(target);
      if (!target || !english || seen.has(key) || target.length > MAX_TARGET_CHARS) continue;
      seen.add(key);
      terms.push({ target, english });
    }
  }
  return terms;
}

function buildPlan(): ModulePlan[] {
  return moduleIds.map((id) => {
    const module = MODULES.find((item) => item.id === id);
    if (!module) usageError(`Unknown module "${id}".`);
    if (!moduleSupportsLearningPair(module, LANGUAGE as never, NATIVE as never)) {
      usageError(`Module "${id}" does not support ${LANGUAGE} for ${NATIVE} speakers.`);
    }
    const publicFile = join(PUBLIC_DIR, LANG_CODE, `${id}.json`);
    const progressFile = join(PROGRESS_DIR, LANG_CODE, `${id}.wordmatch.json`);
    const saved = FORCE ? null : (readJson(progressFile) as Partial<Progress> | null);
    const progress: Progress = {
      version: 1,
      module: id,
      language: LANGUAGE,
      model: MODEL,
      startedAt: typeof saved?.startedAt === "string" ? saved.startedAt : new Date().toISOString(),
      boards: validBoards(saved?.boards),
      calls: typeof saved?.calls === "number" ? saved.calls : 0,
      rejected: typeof saved?.rejected === "number" ? saved.rejected : 0,
    };
    return {
      module,
      progressFile,
      publicFile,
      progress,
      reference: referenceTerms(id).slice(0, MAX_REFERENCE_TERMS),
      failedAttempts: { 1: 0, 2: 0, 3: 0 },
    };
  });
}

const count = (plan: ModulePlan, level: WordMatchLevel) =>
  plan.progress.boards.filter((board) => board.level === level).length;

function saveProgress(plan: ModulePlan) {
  writeAtomic(plan.progressFile, `${JSON.stringify(plan.progress, null, 1)}\n`);
}

/** True when the published pack already holds a section that passes every rule. */
function publishedPackIsValid(plan: ModulePlan): boolean {
  const raw = readJson(plan.publicFile);
  const file = parseTradePack(raw, { moduleId: plan.module.id, language: LANGUAGE! });
  const rawBoards = (raw as { wordMatch?: { boards?: unknown[] } } | null)?.wordMatch?.boards;
  return !!file?.wordMatch && Array.isArray(rawBoards) && validateWordMatchSection(rawBoards).length === 0;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const LEVEL_GUIDE: Record<WordMatchLevel, string> = {
  1: "Level 1 (CEFR A2, 6 pairs): the concrete, high-frequency words a crew member needs on day one: tools, materials, protective gear, vehicles, parts of the work area, simple actions.",
  2: "Level 2 (CEFR B1, 8 pairs): everyday working vocabulary a step above: common work verbs, conditions and problems, measuring and checking, steps of the job, talking with the crew and the customer.",
  3: "Level 3 (CEFR B2, 10 pairs): lower-frequency and more technical vocabulary: causes of failure, inspection and quality, safety planning, weather and moisture, estimating, warranty and closeout, formal or abstract terms.",
};

const SYSTEM = `You write vocabulary boards for a memory-matching game. The learner is a working adult learning Spanish for their trade. Each card face shows a Spanish word; the matching face shows its English meaning. One board is one coherent topic from a real moment on the job.

Rules, all of them required:
1. One topic per board: a concrete job-site situation or work area of the trade (not a school subject). Give it a short English label of 1-3 words, lower case (for example "ladder safety" or "tear-off crew"). Within one answer, and against the topics already used, every board has a different topic.
2. Every pair belongs to the board's topic. A pair is { target, english }: target is the Spanish word or very short phrase (at most ${MAX_TARGET_WORDS} words, ${MAX_TARGET_CHARS} characters); english is its English meaning (at most ${MAX_ENGLISH_CHARS} characters). Verbs: the infinitive in Spanish, "to ..." in English.
3. Inside a board, every target is different and every english is different. Do not repeat any target from the list of targets already used; across the boards of one answer, use each target once.
4. Write every card in lower case ("teja asfáltica", "to cut"), except acronyms and proper names; no slashes, brackets or notes on a card. Neutral Latin American Spanish, the kind a mixed crew from Mexico, Central America and South America all understand. No vosotros, no voseo, no words that only Spain uses (say "techo", not "tejado"), no slang, no profanity. Spell it correctly, with accents and ñ.
5. Prefer the exact Spanish the reference list gives for a term it covers (the learner already met those words in the lessons). At least half of the targets on every board should come from the reference list; the rest are other common words a crew uses on that topic.
6. Never state a universal specification: no counts, sizes, distances or code numbers, and no brand names. Stick to words, not figures.
7. Where a topic involves risk (heights, ladders, electricity, heat, tools), the words must support safe practice.
8. Respect the CEFR level in the user message, and use exactly the number of pairs requested.
Return the result as ONE JSON object that matches the given JSON schema (your structured output); return it once.`;

const SCHEMA = cliJsonSchema({
  type: "object",
  properties: {
    boards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string", description: "1-3 word English topic label, lower case." },
          cefr: { type: "string", enum: ["A2", "B1", "B2"] },
          pairs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target: { type: "string", description: "Spanish word or short phrase." },
                english: { type: "string", description: "English meaning." },
              },
              required: ["target", "english"],
              additionalProperties: false,
            },
          },
        },
        required: ["topic", "cefr", "pairs"],
        additionalProperties: false,
      },
    },
  },
  required: ["boards"],
  additionalProperties: false,
});

function userMessage(plan: ModulePlan, level: WordMatchLevel, want: number): string {
  const usedTopics = plan.progress.boards.filter((board) => board.level === level).map((board) => board.topic);
  const usedTargets = [
    ...new Set(plan.progress.boards.flatMap((board) => board.pairs.map((pair) => pair.target))),
  ];
  const module = plan.module;
  return JSON.stringify(
    {
      task: `Write ${want} Word Match boards for ${module.name}, ${wordMatchPairCount(level)} pairs each, CEFR ${wordMatchCefr(level)}.`,
      trade: {
        name: module.name,
        learnerRole: module.userRole,
        about: module.blurb,
        vocabularyFocus: module.vocabFocus,
      },
      level: LEVEL_GUIDE[level],
      boards: want,
      pairsPerBoard: wordMatchPairCount(level),
      topicsAlreadyUsedAtThisLevel: usedTopics,
      targetsAlreadyUsedElsewhere: usedTargets,
      referenceList: plan.reference.map((term) => `${term.target} = ${term.english}`),
    },
    null,
    1,
  );
}

// ─── Accepting boards ────────────────────────────────────────────────────────

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Checks the boards of one reply against the shared validator, the card-size rules and the
 * pool so far (new topic for the level, little reuse of a target). Accepted boards are added to
 * the plan's progress; the rest come back as error lines for the next attempt.
 */
function acceptBoards(plan: ModulePlan, level: WordMatchLevel, reply: unknown, want: number): string[] {
  const errors: string[] = [];
  const raw = (reply as { boards?: unknown } | null)?.boards;
  if (!Array.isArray(raw)) return ["the answer had no boards list"];
  if (raw.length > want) errors.push(`asked for ${want} boards, got ${raw.length}; only the first ${want} are used`);
  const pairsPerBoard = wordMatchPairCount(level);
  const maxSharedTargets = Math.floor(pairsPerBoard / 4);
  for (const [index, item] of raw.slice(0, want).entries()) {
    if (count(plan, level) >= BOARDS_PER_LEVEL) break;
    const label = `board ${index + 1}${typeof (item as { topic?: unknown })?.topic === "string" ? ` ("${(item as { topic: string }).topic}")` : ""}`;
    // The cefr field is redundant with the level; set it so a wrong label cannot sink a board.
    const candidate =
      item && typeof item === "object" ? normalizeBoard({ ...(item as object), cefr: wordMatchCefr(level) }) : item;
    const checked = checkWordMatchBoard(candidate, level);
    if (!checked.ok) {
      stats.rejected++;
      plan.progress.rejected++;
      errors.push(...checked.errors.map((error) => `${label}: ${error}`));
      continue;
    }
    const board = checked.board;
    const problems: string[] = [];
    if (wordCount(board.topic) > MAX_TOPIC_WORDS) problems.push(`topic is longer than ${MAX_TOPIC_WORDS} words`);
    for (const pair of board.pairs) {
      if (/[/()\\]/.test(pair.target) || /[/()\\]/.test(pair.english)) {
        problems.push(`"${pair.target}" / "${pair.english}": no slashes or brackets on a card, one plain word or phrase per face`);
      }
      if (pair.target.length > MAX_TARGET_CHARS || wordCount(pair.target) > MAX_TARGET_WORDS) {
        problems.push(`"${pair.target}" is too long for a card (at most ${MAX_TARGET_WORDS} words, ${MAX_TARGET_CHARS} characters)`);
      }
      if (pair.english.length > MAX_ENGLISH_CHARS) {
        problems.push(`"${pair.english}" is too long for a card (at most ${MAX_ENGLISH_CHARS} characters)`);
      }
    }
    const topicKey = wordMatchKey(board.topic);
    if (plan.progress.boards.some((other) => other.level === level && wordMatchKey(other.topic) === topicKey)) {
      problems.push(`topic "${board.topic}" is already used at this level`);
    }
    const uses = new Map<string, number>();
    for (const other of plan.progress.boards) {
      for (const pair of other.pairs) uses.set(wordMatchKey(pair.target), (uses.get(wordMatchKey(pair.target)) ?? 0) + 1);
    }
    const reused = board.pairs.filter((pair) => (uses.get(wordMatchKey(pair.target)) ?? 0) > 0);
    const overused = board.pairs.filter(
      (pair) => (uses.get(wordMatchKey(pair.target)) ?? 0) >= WORD_MATCH_PACK_RULES.maxBoardsPerTarget,
    );
    if (overused.length > 0) {
      problems.push(`targets already on ${WORD_MATCH_PACK_RULES.maxBoardsPerTarget} boards: ${overused.map((p) => p.target).join(", ")}`);
    } else if (reused.length > maxSharedTargets) {
      problems.push(`${reused.length} targets are already on other boards (at most ${maxSharedTargets}): ${reused.map((p) => p.target).join(", ")}`);
    }
    if (problems.length > 0) {
      stats.rejected++;
      plan.progress.rejected++;
      errors.push(...problems.map((problem) => `${label}: ${problem}`));
      continue;
    }
    plan.progress.boards.push({ level, ...board });
    stats.accepted++;
  }
  return errors;
}

// ─── cli provider: `claude -p` on the owner's subscription ──────────────────

class FatalError extends Error {}
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

let cliCwd: string | null = null;
/** A usage / rate limit pauses every call until this time (epoch ms). */
let pausedUntil = 0;
const MAX_WAIT_MS = 15 * 60_000;
const MAX_CLI_FAILURES = 3;

/**
 * One CLI call, retried through limits and transient failures: a usage / rate limit pauses every
 * call (until the CLI's reset time when it gives one, else 30 s doubling, at most 15 min per wait)
 * for up to --rate-limit-wait-hours in total; a broken login stops the run; anything else is
 * retried 3 times. Returns the structured reply (null when it held no object).
 */
async function callCli(prompt: string): Promise<Record<string, unknown> | null> {
  const args = [
    "-p",
    "--output-format", "json",
    "--model", MODEL,
    "--tools", "",
    "--system-prompt", SYSTEM,
    "--json-schema", JSON.stringify(SCHEMA),
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
    cliCwd ??= mkdtempSync(join(tmpdir(), "trade-packs-cli-"));
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
      stats.retries++;
      console.log(`  limited (${outcome.error.slice(0, 120)}); pausing all calls ${Math.round(wait / 1000)} s`);
      continue;
    }
    failures += 1;
    if (failures > MAX_CLI_FAILURES) {
      throw new Error(`the Claude CLI failed ${failures} times: ${outcome.error.slice(0, 300)}`);
    }
    stats.retries++;
    console.log(`  CLI error (${outcome.error.slice(0, 120)}); retry ${failures} of ${MAX_CLI_FAILURES}`);
    await sleep(15_000 * 2 ** (failures - 1));
  }
}

/** Fills one level of one module up to BOARDS_PER_LEVEL boards, saving after every call. */
async function fillLevel(plan: ModulePlan, level: WordMatchLevel): Promise<void> {
  let retry: { reply: unknown; errors: string[] } | undefined;
  while (count(plan, level) < BOARDS_PER_LEVEL) {
    if (plan.failedAttempts[level] >= MAX_FAILED_ATTEMPTS) {
      throw new Error(`level ${level}: ${MAX_FAILED_ATTEMPTS} calls in a row added no board`);
    }
    const want = Math.min(BATCH, BOARDS_PER_LEVEL - count(plan, level));
    const request: ApiRequest = {
      model: MODEL,
      max_tokens: 0,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage(plan, level, want) }],
      tools: [],
      tool_choice: { type: "auto" },
    };
    const before = count(plan, level);
    const reply = await callCli(cliPrompt(request, retry));
    plan.progress.calls++;
    const errors = reply ? acceptBoards(plan, level, reply, want) : ["the reply held no JSON object"];
    saveProgress(plan);
    const added = count(plan, level) - before;
    console.log(
      `  ${plan.module.id} level ${level}: +${added} board(s), ${count(plan, level)}/${BOARDS_PER_LEVEL}` +
        (errors.length ? `, ${errors.length} problem(s): ${errors.slice(0, 2).join(" | ").slice(0, 200)}` : ""),
    );
    if (added === 0) {
      plan.failedAttempts[level]++;
      stats.retries++;
      retry = { reply: reply ?? "(no JSON object)", errors };
    } else {
      plan.failedAttempts[level] = 0;
      retry = undefined;
    }
  }
}

// ─── Publishing ──────────────────────────────────────────────────────────────

/** One board per line, so a review diff shows whole boards. */
function formatPack(file: TradePackFile): string {
  const { wordMatch, ...head } = file;
  const lines = wordMatch!.boards.map((board) => `  ${JSON.stringify(board)}`);
  const headJson = JSON.stringify(head);
  return `${headJson.slice(0, -1)},"wordMatch":{"boards":[\n${lines.join(",\n")}\n]}}\n`;
}

function indexFile(): string {
  return join(PUBLIC_DIR, "index.json");
}

function updateIndex(entry: TradePackIndexEntry) {
  const current = readJson(indexFile()) as TradePackIndex | null;
  const packs = (current?.version === TRADE_PACK_VERSION && Array.isArray(current.packs) ? current.packs : []).filter(
    (item) => !(item.module === entry.module && item.language === entry.language),
  );
  packs.push(entry);
  packs.sort((a, b) => `${a.language}/${a.module}`.localeCompare(`${b.language}/${b.module}`));
  writeAtomic(indexFile(), `${JSON.stringify({ version: TRADE_PACK_VERSION, packs }, null, 1)}\n`);
}

/** Writes the pack and the index entry when the whole Word Match section validates. */
function publish(plan: ModulePlan): { ok: boolean; bytes: number; errors: string[] } {
  const boards = WORD_MATCH_LEVELS.flatMap((level) => plan.progress.boards.filter((board) => board.level === level));
  const errors = validateWordMatchSection(boards);
  if (errors.length > 0) return { ok: false, bytes: 0, errors };
  const generatedAt = new Date().toISOString();
  const file: TradePackFile = {
    version: TRADE_PACK_VERSION,
    module: plan.module.id,
    language: LANGUAGE!,
    nativeLanguage: NATIVE,
    generatedAt,
    model: MODEL,
    reviewed: false,
    wordMatch: { boards },
  };
  // What the app will load must be exactly what was validated.
  if (!parseTradePack(JSON.parse(JSON.stringify(file)), { moduleId: plan.module.id, language: LANGUAGE! })?.wordMatch) {
    return { ok: false, bytes: 0, errors: ["the finished file did not parse"] };
  }
  writeAtomic(plan.publicFile, formatPack(file));
  const bytes = statSync(plan.publicFile).size;
  const perLevel: Record<string, number> = {};
  for (const level of WORD_MATCH_LEVELS) perLevel[String(level)] = boards.filter((board) => board.level === level).length;
  updateIndex({
    module: plan.module.id,
    language: LANGUAGE!,
    nativeLanguage: NATIVE,
    path: tradePackPath(plan.module.id, LANGUAGE!),
    areas: ["wordMatch"],
    wordMatchBoards: perLevel,
    bytes,
    reviewed: false,
    generatedAt,
  });
  return { ok: true, bytes, errors: [] };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-US");

async function main() {
  const plans = buildPlan();
  const todo = plans.filter((plan) => FORCE || !publishedPackIsValid(plan));
  console.log(
    `Trade packs (${area}): ${plans.length} module(s), ${LANGUAGE} for ${NATIVE} speakers, provider cli, model ${MODEL}, ` +
      `concurrency ${CONCURRENCY}, batch ${BATCH}, ${BOARDS_PER_LEVEL} boards per level${FORCE ? ", --force" : ""}`,
  );
  for (const plan of plans) {
    const skip = !todo.includes(plan);
    const have = WORD_MATCH_LEVELS.map((level) => `L${level} ${count(plan, level)}/${BOARDS_PER_LEVEL}`).join("  ");
    console.log(
      `  ${LANG_CODE}/${plan.module.id}: ${skip ? "published pack is valid, nothing to do (use --force to rebuild)" : have} ` +
        `(reference terms ${plan.reference.length}, saved calls ${plan.progress.calls})`,
    );
  }
  if (todo.length === 0) return;

  const callsFor = (plan: ModulePlan) =>
    WORD_MATCH_LEVELS.reduce((sum, level) => sum + Math.ceil(Math.max(0, BOARDS_PER_LEVEL - count(plan, level)) / BATCH), 0);
  if (DRY_RUN) {
    const calls = todo.reduce((sum, plan) => sum + callsFor(plan), 0);
    console.log(
      `Dry run: ~${calls} model call(s) plus retries, ~${fmt(calls * 4500)} input / ~${fmt(calls * 3200)} output tokens, ` +
        `~${Math.max(1, Math.round((calls * 90) / CONCURRENCY / 60))} min at concurrency ${CONCURRENCY}. Nothing was called or written.`,
    );
    return;
  }

  const startedAt = Date.now();
  const failures: string[] = [];
  let fatal: string | null = null;
  const units = todo.flatMap((plan) => WORD_MATCH_LEVELS.map((level) => ({ plan, level })));
  let next = 0;
  async function worker() {
    while (!fatal) {
      const unit = units[next++];
      if (!unit) return;
      try {
        await fillLevel(unit.plan, unit.level);
      } catch (error) {
        if (error instanceof FatalError) {
          fatal = error.message;
          return;
        }
        const message = `${unit.plan.module.id} level ${unit.level}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(message);
        console.log(`FAILED ${message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, units.length) }, worker));

  const published: string[] = [];
  for (const plan of todo) {
    saveProgress(plan);
    const result = publish(plan);
    if (result.ok) {
      published.push(`${LANG_CODE}/${plan.module.id} (${fmt(result.bytes)} bytes)`);
    } else {
      failures.push(`${plan.module.id}: not published: ${result.errors.slice(0, 3).join(" | ")}`);
      console.log(`NOT published ${LANG_CODE}/${plan.module.id}: ${result.errors.slice(0, 5).join(" | ")}`);
    }
  }

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `FINAL published ${published.length}/${todo.length}${published.length ? `: ${published.join(", ")}` : ""}\n` +
      `calls ${stats.calls} (retries ${stats.retries}) | boards accepted ${stats.accepted}, rejected ${stats.rejected}` +
      ` | tokens in ${fmt(stats.inputTokens)} out ${fmt(stats.outputTokens)} | ${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`,
  );
  if (fatal) console.error(`Stopped early: ${fatal} (progress is saved; rerun to continue)`);
  if (failures.length > 0) {
    console.log(`${failures.length} problem(s); progress is saved in ${PROGRESS_DIR}. Rerun the same command to continue.`);
    process.exitCode = 1;
  }
}

await main();
