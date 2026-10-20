// Built by TAC — 2026-10-17
// Writes the authored content of every Core 30 lesson: a lesson-specific passage, lesson
// vocabulary + phrases, and lesson verbs with present-tense conjugations. One Anthropic call
// per lesson (claude-sonnet-5-5), validated by the same rules the tests use
// (src/lib/lesson-content-core.ts); a failed validation is retried with the error list.
//
//   ANTHROPIC_API_KEY=... node scripts/build-lesson-content.mts [flags]
//   (Node 22.18+ runs .mts directly; `npx tsx scripts/build-lesson-content.mts` works too)
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
//   --concurrency N             parallel API calls (default 6)
//   --limit N                   stop after N lessons attempted this run
//   --dry-run                   print the plan and estimated tokens, call nothing
//   --force                     ignore saved progress and existing files for the selected pairs
//   --timeout-ms N              per-call timeout (default 120000)
//
// The key is read from the environment only and is never printed.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCurriculum } from "../src/data/curriculum.ts";
import type { LessonWord } from "../src/data/curriculum.ts";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
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
  buildLessonContentRequest,
  lessonContentFromResponse,
  type AuthoredContext,
  type ContentBlock,
} from "../src/lib/lesson-content-prompt.ts";
import { cleanLessonWords, languageTag, pickAuthoredWords } from "../src/lib/lesson-words-core.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
const CONCURRENCY = intFlag("concurrency", 6);
const LIMIT = intFlag("limit", Number.POSITIVE_INFINITY);
const TIMEOUT_MS = intFlag("timeout-ms", 120_000);
const DRY_RUN = has("dry-run");
const FORCE = has("force");
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
  done: Record<string, LessonContentLesson>;
  generatedAt: string;
}

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
): Record<string, LessonContentLesson> {
  const out: Record<string, LessonContentLesson> = {};
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
    const content: LessonContentLesson = { verbs };
    if (plan.parts.passage && passage) content.passage = passage;
    if (plan.parts.words && words.length > 0) content.words = words;
    const errors = validateLessonContent(content, {
      language: pair.language,
      nativeLanguage: pair.nativeLanguage,
      parts: plan.parts,
      words: plan.authored?.words,
    });
    if (errors.length === 0) out[String(plan.n)] = content;
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
      };
      if (!FORCE) {
        const fromPublic = readJson(pair.publicFile) as { generatedAt?: string } | null;
        const fromProgress = readJson(pair.progressFile) as { generatedAt?: string } | null;
        pair.done = { ...loadLessons(fromPublic, pair), ...loadLessons(fromProgress, pair) };
        pair.generatedAt = fromProgress?.generatedAt ?? fromPublic?.generatedAt ?? pair.generatedAt;
      }
      pairs.push(pair);
    }
  }
  return pairs;
}

const missing = (pair: Pair) => pair.lessons.filter((lesson) => !pair.done[String(lesson.n)]);

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
  const lessons: Record<string, LessonContentLesson> = {};
  for (const plan of [...pair.lessons].sort((a, b) => a.n - b.n)) {
    lessons[String(plan.n)] = pair.done[String(plan.n)];
  }
  const file: LessonContentFile = {
    version: LESSON_CONTENT_VERSION,
    module: pair.moduleId,
    language: pair.language,
    nativeLanguage: pair.nativeLanguage,
    model: LESSON_CONTENT_MODEL,
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

/** One lesson: API call, validation, and up to two retries that show the model its errors. */
async function generateLesson(
  key: string,
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
  const messages: { role: "user" | "assistant"; content: unknown }[] = [...body.messages];
  let lastError = "no attempt";
  for (let validation = 0; validation < MAX_VALIDATION_ATTEMPTS; validation++) {
    if (validation > 0) stats.validationRetries++;
    const result = await callWithBackoff(key, { ...body, messages });
    const parsed = lessonContentFromResponse(result.content, pair.language);
    let errors: string[];
    if (!parsed) {
      errors = [
        `You did not call the ${"return_lesson_content"} tool with a valid object. Call it now with the complete content.`,
      ];
    } else {
      const content: LessonContentLesson = { verbs: parsed.verbs ?? [] };
      if (plan.parts.passage && parsed.passage) content.passage = parsed.passage;
      if (plan.parts.words && parsed.words) content.words = parsed.words;
      errors = validateLessonContent(content, {
        language: pair.language,
        nativeLanguage: pair.nativeLanguage,
        parts: plan.parts,
        words: plan.authored?.words,
      });
      if (errors.length === 0) return content;
    }
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
  const pairs = buildPlan();
  const tasks = pairs.flatMap((pair) => missing(pair).map((plan) => ({ pair, plan })));
  const totalLessons = pairs.reduce((sum, pair) => sum + pair.lessons.length, 0);
  const todo = Math.min(tasks.length, LIMIT);

  console.log(
    `Plan: ${pairs.length} file(s), ${totalLessons} lessons, ${totalLessons - tasks.length} already done, ` +
      `${tasks.length} to generate (this run: ${todo}), model ${LESSON_CONTENT_MODEL}, concurrency ${CONCURRENCY}`,
  );
  if (DRY_RUN) {
    const slice = tasks.slice(0, todo);
    for (const pair of pairs) {
      const count = slice.filter((task) => task.pair === pair).length;
      const verbsOnly = pair.lessons.every((l) => !l.parts.passage && !l.parts.words);
      console.log(
        `  ${languageTag(pair.language)}/${pair.moduleId.padEnd(28)} ${String(pair.lessons.length).padStart(2)} lessons ` +
          `(${pair.language} <- ${pair.nativeLanguage})${verbsOnly ? " VERBS ONLY" : ""}  to generate: ${count}`,
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
      `Estimated lessons to generate: ${slice.length} (${fullCalls} full, ${verbOnlyCalls} verbs-only; one API call each plus retries)\n` +
        `Estimated tokens (retries included): input ~${fmt(inputTokens)}, output ~${fmt(outputTokens)}\n` +
        `Estimated wall time at concurrency ${CONCURRENCY}: ~${Math.round(seconds / 60)} min (rate limits can add more)`,
    );
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("ANTHROPIC_API_KEY is not set in the environment.");
    process.exit(1);
  }

  const startedAt = Date.now();
  const queue = tasks.slice(0, todo);
  const failures: string[] = [];
  const remainingByPair = new Map(pairs.map((pair) => [pair, missing(pair).length]));
  const bytesWritten = new Map<string, number>();
  let fatal: string | null = null;
  let lastLog = 0;

  // Files that need no calls (already complete) still get their public file.
  for (const pair of pairs) {
    if (missing(pair).length === 0) bytesWritten.set(pair.publicFile, writePublicFile(pair));
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
      try {
        const content = await generateLesson(key!, pair, plan);
        pair.done[String(plan.n)] = content;
        saveProgress(pair);
        stats.done++;
        const left = (remainingByPair.get(pair) ?? 1) - 1;
        remainingByPair.set(pair, left);
        if (left === 0 && missing(pair).length === 0) {
          const bytes = writePublicFile(pair);
          bytesWritten.set(pair.publicFile, bytes);
          console.log(
            `file complete: ${languageTag(pair.language)}/${pair.moduleId} (${fmt(bytes)} bytes)`,
          );
        }
      } catch (error) {
        if (error instanceof FatalError) {
          fatal = error.message;
          return;
        }
        stats.failed++;
        remainingByPair.set(pair, (remainingByPair.get(pair) ?? 1) - 1);
        const message = `${languageTag(pair.language)}/${pair.moduleId} lesson ${plan.n}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        failures.push(message);
        console.log(`FAILED ${message}`);
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
    console.log(`${failures.length} failed lesson(s); rerun the same command to retry them.`);
  }
  const incomplete = pairs.filter((pair) => missing(pair).length > 0).length;
  console.log(
    `Files on disk: ${index.length} (index.json). Incomplete in this plan: ${incomplete}. ` +
      `Bytes written this run: ${fmt([...bytesWritten.values()].reduce((a, b) => a + b, 0))}`,
  );
  if (fatal || failures.length > 0) process.exitCode = 1;
}

await main();
