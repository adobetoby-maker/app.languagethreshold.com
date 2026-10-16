// Built by TAC — 2026-10-15
// Pre-builds every Core 30 lesson word list ("deck") so the app can load them from static
// files and work offline. Calls the Anthropic Messages API with the SAME prompt the app's
// server function uses (src/lib/lesson-words-prompt.ts).
//
//   ANTHROPIC_API_KEY=... npx tsx scripts/build-lesson-decks.mts [flags]
//   (plain `node scripts/build-lesson-decks.mts` also works on Node 22.18+/26)
//
// Output (committed): public/lesson-decks/<langCode>/<moduleId>.json and index.json
// Progress (gitignored, resumable): .lesson-decks-progress/<langCode>/<moduleId>.json
//
// Flags:
//   --lang <name|code,...>   only these target languages (e.g. Japanese,ps)
//   --module <id,...>        only these modules
//   --concurrency N          parallel API calls (default 6)
//   --limit N                stop after N lessons attempted this run
//   --dry-run                print the plan and estimated calls, call nothing
//   --force                  ignore saved progress and existing decks for the selected pairs
//   --timeout-ms N           per-call timeout (default 60000)
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
import {
  LESSON_DECK_VERSION,
  cleanLessonWords,
  deckLanguageDir,
  hasEnoughWords,
  pickAuthoredWords,
  type LessonDeck,
} from "../src/lib/lesson-words-core.ts";
import {
  LESSON_WORDS_MODEL,
  lessonWordsModel,
  buildLessonWordsRequest,
  lessonWordsFromResponse,
} from "../src/lib/lesson-words-prompt.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public", "lesson-decks");
const PROGRESS_DIR = join(ROOT, ".lesson-decks-progress");
const API_URL = "https://api.anthropic.com/v1/messages";

const TARGETS = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Chinese",
  "Korean",
  "Pashto",
  "English",
] as const;

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
const CONCURRENCY = intFlag("concurrency", 6);
const LIMIT = intFlag("limit", Number.POSITIVE_INFINITY);
const TIMEOUT_MS = intFlag("timeout-ms", 60_000);
const DRY_RUN = has("dry-run");
const FORCE = has("force");
const MAX_HTTP_ATTEMPTS = 7;
const MAX_VALIDATION_ATTEMPTS = 3; // first try + 2 retries

// ─── Plan ────────────────────────────────────────────────────────────────────

interface Pair {
  moduleId: string;
  language: string;
  nativeLanguage: string;
  /** Lessons that need generated words (authored Spanish lessons are left out). */
  lessonNumbers: number[];
  progressFile: string;
  publicFile: string;
  /** lesson number (string) -> words, from progress + any existing deck */
  done: Record<string, LessonWord[]>;
  generatedAt: string;
}

function matchesLang(language: string): boolean {
  if (wantLang.length === 0) return true;
  return wantLang.includes(language.toLowerCase()) || wantLang.includes(deckLanguageDir(language));
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file: string, value: unknown) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  writeFileSync(temp, JSON.stringify(value));
  renameSync(temp, file);
}

/** Loads cleaned, validated lessons from a progress file or deck file. */
function loadLessons(raw: unknown, pair: Pick<Pair, "moduleId" | "language" | "nativeLanguage">) {
  const out: Record<string, LessonWord[]> = {};
  if (!raw || typeof raw !== "object") return out;
  const file = raw as Record<string, unknown>;
  if (
    file.module !== pair.moduleId ||
    file.language !== pair.language ||
    file.nativeLanguage !== pair.nativeLanguage
  ) {
    return out;
  }
  const lessons = file.lessons as Record<string, unknown> | undefined;
  if (!lessons || typeof lessons !== "object") return out;
  for (const [number, words] of Object.entries(lessons)) {
    const cleaned = cleanLessonWords(words);
    if (hasEnoughWords(cleaned)) out[number] = cleaned;
  }
  return out;
}

function buildPlan(): Pair[] {
  const pairs: Pair[] = [];
  for (const module of MODULES) {
    if (wantModule.length > 0 && !wantModule.includes(module.id.toLowerCase())) continue;
    const curriculum = getCurriculum(module.id);
    if (!curriculum) continue;
    for (const language of TARGETS) {
      if (!matchesLang(language)) continue;
      const nativeLanguage = language === "English" ? "Spanish" : "English";
      if (!moduleSupportsLearningPair(module, language, nativeLanguage)) continue;
      const lessonNumbers = curriculum.lessons
        .filter((lesson) => pickAuthoredWords(lesson.words, language) === null)
        .map((lesson) => lesson.n);
      if (lessonNumbers.length === 0) continue; // fully authored (roofing, Spanish)
      const dir = deckLanguageDir(language);
      const pair: Pair = {
        moduleId: module.id,
        language,
        nativeLanguage,
        lessonNumbers,
        progressFile: join(PROGRESS_DIR, dir, `${module.id}.json`),
        publicFile: join(PUBLIC_DIR, dir, `${module.id}.json`),
        done: {},
        generatedAt: new Date().toISOString(),
      };
      if (!FORCE) {
        const fromPublic = readJson(pair.publicFile) as { generatedAt?: string } | null;
        const fromProgress = readJson(pair.progressFile) as { generatedAt?: string } | null;
        pair.done = {
          ...loadLessons(fromPublic, pair),
          ...loadLessons(fromProgress, pair),
        };
        pair.generatedAt = fromProgress?.generatedAt ?? fromPublic?.generatedAt ?? pair.generatedAt;
      }
      pairs.push(pair);
    }
  }
  return pairs;
}

const missing = (pair: Pair) => pair.lessonNumbers.filter((n) => !pair.done[String(n)]);

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

function writePublicDeck(pair: Pair): number {
  const lessons: Record<string, LessonWord[]> = {};
  for (const n of [...pair.lessonNumbers].sort((a, b) => a - b)) {
    lessons[String(n)] = pair.done[String(n)];
  }
  const deck: LessonDeck = {
    version: LESSON_DECK_VERSION,
    module: pair.moduleId,
    language: pair.language,
    nativeLanguage: pair.nativeLanguage,
    model: lessonWordsModel(pair.language),
    generatedAt: pair.generatedAt,
    lessons,
  };
  writeJsonAtomic(pair.publicFile, deck);
  return statSync(pair.publicFile).size;
}

function writeIndex() {
  const entries: { language: string; module: string; lessons: number; bytes: number }[] = [];
  if (existsSync(PUBLIC_DIR)) {
    for (const dir of readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const name of readdirSync(join(PUBLIC_DIR, dir.name))) {
        if (!name.endsWith(".json")) continue;
        const file = join(PUBLIC_DIR, dir.name, name);
        const deck = readJson(file) as Partial<LessonDeck> | null;
        if (!deck || deck.version !== LESSON_DECK_VERSION || !deck.lessons) continue;
        entries.push({
          language: dir.name,
          module: String(deck.module),
          lessons: Object.keys(deck.lessons).length,
          bytes: statSync(file).size,
        });
      }
    }
  }
  entries.sort((a, b) => a.language.localeCompare(b.language) || a.module.localeCompare(b.module));
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(
    join(PUBLIC_DIR, "index.json"),
    JSON.stringify({ version: LESSON_DECK_VERSION, decks: entries }),
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

type ApiContent = { type: string; input?: unknown }[];

async function callOnce(
  key: string,
  body: unknown,
): Promise<{ content: ApiContent; retryAfterMs?: number; retryable?: boolean; error?: string }> {
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
      const retryable = response.status === 429 || response.status >= 500;
      const header = Number(response.headers.get("retry-after"));
      return {
        content: [],
        retryable,
        retryAfterMs: Number.isFinite(header) && header > 0 ? header * 1000 : undefined,
        error: `HTTP ${response.status}`,
      };
    }
    const json = (await response.json()) as {
      content?: ApiContent;
      usage?: { input_tokens?: number; output_tokens?: number };
      type?: string;
    };
    stats.inputTokens += json.usage?.input_tokens ?? 0;
    stats.outputTokens += json.usage?.output_tokens ?? 0;
    return { content: json.content ?? [] };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    return { content: [], retryable: true, error: aborted ? "timeout" : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

/** One lesson: HTTP retries with exponential backoff, plus validation retries. */
async function generateLesson(key: string, pair: Pair, lessonNumber: number) {
  const module = MODULES.find((item) => item.id === pair.moduleId)!;
  const lesson = getCurriculum(pair.moduleId)!.lessons.find((item) => item.n === lessonNumber)!;
  const body = buildLessonWordsRequest({
    module,
    lesson,
    targetLanguage: pair.language,
    nativeLanguage: pair.nativeLanguage,
  });
  let lastError = "no attempt";
  for (let validation = 0; validation < MAX_VALIDATION_ATTEMPTS; validation++) {
    if (validation > 0) stats.validationRetries++;
    let content: ApiContent | null = null;
    for (let attempt = 0; attempt < MAX_HTTP_ATTEMPTS; attempt++) {
      const result = await callOnce(key, body);
      if (!result.error) {
        content = result.content;
        break;
      }
      lastError = result.error;
      if (!result.retryable) break;
      stats.httpRetries++;
      const backoff = Math.min(60_000, 1000 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
      await sleep(Math.max(backoff, result.retryAfterMs ?? 0));
    }
    if (!content) break; // HTTP gave up; validation retries would not help
    const words = lessonWordsFromResponse(content);
    if (words) return words;
    lastError = "response failed validation (too few words)";
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
  const tasks = pairs.flatMap((pair) =>
    missing(pair).map((lessonNumber) => ({ pair, lessonNumber })),
  );
  const totalLessons = pairs.reduce((sum, pair) => sum + pair.lessonNumbers.length, 0);
  const todo = Math.min(tasks.length, LIMIT);

  console.log(
    `Plan: ${pairs.length} deck(s), ${totalLessons} lessons, ${totalLessons - tasks.length} already done, ` +
      `${tasks.length} to generate (this run: ${todo}), model ${LESSON_WORDS_MODEL} (Pashto: ${lessonWordsModel("Pashto")}), concurrency ${CONCURRENCY}`,
  );
  if (DRY_RUN) {
    const byLang = new Map<string, number>();
    for (const task of tasks.slice(0, todo)) {
      byLang.set(task.pair.language, (byLang.get(task.pair.language) ?? 0) + 1);
    }
    for (const [language, count] of byLang) console.log(`  ${language}: ${count} calls`);
    console.log(`Estimated API calls: ${todo} (more on retries)`);
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

  // Decks that need no calls (already complete) still get their public file.
  for (const pair of pairs) {
    if (missing(pair).length === 0) bytesWritten.set(pair.publicFile, writePublicDeck(pair));
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
      const { pair, lessonNumber } = queue[index];
      try {
        const words = await generateLesson(key!, pair, lessonNumber);
        pair.done[String(lessonNumber)] = words;
        saveProgress(pair);
        stats.done++;
        const left = (remainingByPair.get(pair) ?? 1) - 1;
        remainingByPair.set(pair, left);
        if (left === 0 && missing(pair).length === 0) {
          const bytes = writePublicDeck(pair);
          bytesWritten.set(pair.publicFile, bytes);
          console.log(
            `deck complete: ${deckLanguageDir(pair.language)}/${pair.moduleId} (${fmt(bytes)} bytes)`,
          );
        }
      } catch (error) {
        if (error instanceof FatalError) {
          fatal = error.message;
          return;
        }
        stats.failed++;
        remainingByPair.set(pair, (remainingByPair.get(pair) ?? 1) - 1);
        const message = `${deckLanguageDir(pair.language)}/${pair.moduleId} lesson ${lessonNumber}: ${
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
    `Decks on disk: ${index.length} (index.json). Incomplete in this plan: ${incomplete}. ` +
      `Bytes written this run: ${fmt([...bytesWritten.values()].reduce((a, b) => a + b, 0))}`,
  );
  if (fatal || failures.length > 0) process.exitCode = 1;
}

await main();
