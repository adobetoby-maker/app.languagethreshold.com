// Built by TAC — 2026-10-23
// Writes trade packs: static, module-flavored game content that the core areas read before they
// fall back to a live AI call. Three areas so far, each checked by the same rules the app and the
// tests use:
//   wordmatch    Word Match boards, 12+ per level (src/lib/word-match-core.ts, src/lib/trade-packs.ts)
//   sentence     Sentence Builder questions, 40+ per level (src/lib/sentence-build-core.ts)
//   conjugation  Conjugation questions, 12+ per level and axis at levels 1-2, 24+ at level 3
//                (src/lib/conjugation-core.ts); every question also passes the independent
//                review gate (a second call solves it without seeing the answer)
// plus the module rules in src/lib/trade-pack-rules-core.ts (one Spanish word per concept,
// banned terms, attributed specifications, vosotros).
//
//   node scripts/build-trade-packs.mts --module roofing [--area wordmatch,sentence,conjugation] [flags]
//   (Node 22.18+ runs .mts directly; `npx tsx scripts/build-trade-packs.mts` works too)
//
// Provider: the logged-in Claude Code CLI (`claude -p`) on the owner's Claude subscription,
// Opus by default, the same runner as scripts/build-lesson-content.mts (src/lib/claude-cli-runner.ts
// scrubs every ANTHROPIC_* variable from the child's environment). There is no API-key provider.
//
// Output (committed): public/trade-packs/<langCode>/<moduleId>.json and public/trade-packs/index.json
// Progress (gitignored, resumable): .trade-packs-progress/<langCode>/<moduleId>.<area>.json
//
// Flags:
//   --module <id,...>        modules to build (required)
//   --lang <name|code>       target language (default es; Spanish is the only one supported so far)
//   --area <a,...>|all       wordmatch (default), sentence, conjugation
//   --provider cli           the only provider (default); anything else is refused
//   --model opus|sonnet|<id> default claude-opus-5-5
//   --claude-bin <path>      the CLI (default ~/.local/bin/claude, else "claude" on PATH)
//   --concurrency N          parallel calls (default 3)
//   --batch N                items asked for per call (default: 6 boards, 10 sentences, 8 questions)
//   --resume                 continue from saved progress (this is the default; accepted for clarity)
//   --force                  ignore saved progress and rebuild even when the published section is valid
//   --dry-run                print the plan and estimates, call nothing
//   --timeout-ms N           per-call timeout (default 600000)
//   --rate-limit-wait-hours N  give up (resumable) after waiting this long on limits (default 8)
//   --out-root <dir>         (testing) read and write public/ and the progress files under <dir>
//
// A section of the pack file is rewritten only when that area's whole section validates (the
// other sections are kept as they are); accepted items stay in the progress file, so a later run
// asks only for what is missing.

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
import { ROOFING_LESSON_PASSAGES } from "../src/data/roofing-lesson-passages.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";
import { runClaudeCli } from "../src/lib/claude-cli-runner.ts";
import {
  CONJUGATION_LEVEL_AXES,
  CONJUGATION_REVIEW_PROPERTIES,
  CONJUGATION_REVIEW_REQUIRED,
  CONJUGATION_REVIEW_SYSTEM,
  checkConjugationQuestion,
  conjugationCefr,
  conjugationReviewAccepts,
  conjugationReviewInput,
  type ConjugationAxis,
  type ConjugationLevel,
} from "../src/lib/conjugation-core.ts";
import {
  SPANISH_VARIETY_RULE,
  cliInputTokens,
  cliJsonSchema,
  cliPrompt,
  parseCliOutput,
  resolveModel,
  type ApiRequest,
} from "../src/lib/core60-generator-core.ts";
import { cleanLessonWords, languageTag } from "../src/lib/lesson-words-core.ts";
import {
  SENTENCE_BUILD_LEVELS,
  checkSentenceBuildItem,
  sentenceBuildCefr,
  sentenceBuildTokenRange,
  type SentenceBuildLevel,
} from "../src/lib/sentence-build-core.ts";
import {
  CONJUGATION_ITEM_RULES,
  TRADE_PACK_MODULE_RULES,
  conceptProblems,
  conjugationItemProblems,
  conjugationPoolMinimum,
  sentenceItemProblems,
  validateConjugationSection,
  validateSentenceBuildSection,
  wordMatchConceptProblems,
} from "../src/lib/trade-pack-rules-core.ts";
import {
  SENTENCE_BUILD_PACK_RULES,
  TRADE_PACK_AREAS,
  TRADE_PACK_VERSION,
  WORD_MATCH_CARD_RULES,
  WORD_MATCH_PACK_RULES,
  cardCase,
  parseTradePack,
  sentenceAvoidKey,
  tradePackNativeLanguage,
  tradePackPath,
  validateWordMatchSection,
  wordMatchCardProblems,
  type TradePackArea,
  type TradePackConjugationItem,
  type TradePackIndex,
  type TradePackIndexEntry,
  type TradePackSentenceItem,
  type TradePackWordMatchBoard,
} from "../src/lib/trade-packs.ts";
import {
  WORD_MATCH_LEVELS,
  checkWordMatchBoard,
  wordMatchCefr,
  wordMatchFoldKey,
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

type AreaKey = "wordmatch" | "sentence" | "conjugation";
const AREA_KEYS: readonly AreaKey[] = ["wordmatch", "sentence", "conjugation"];
const AREA_SECTION: Record<AreaKey, TradePackArea> = {
  wordmatch: "wordMatch",
  sentence: "sentenceBuild",
  conjugation: "conjugation",
};
const areaFlag = (flag("area") ?? "wordmatch").toLowerCase();
const AREAS: AreaKey[] = (areaFlag === "all" ? [...AREA_KEYS] : areaFlag.split(",").map((a) => a.trim()))
  .filter(Boolean) as AreaKey[];
if (AREAS.length === 0 || AREAS.some((a) => !AREA_KEYS.includes(a))) {
  usageError(`--area must be one or more of ${AREA_KEYS.join(", ")} (or all).`);
}

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
const BATCH_FLAG = flag("batch") ? intFlag("batch", 6) : undefined;
const BATCH: Record<AreaKey, number> = {
  wordmatch: BATCH_FLAG ?? 6,
  sentence: BATCH_FLAG ?? 10,
  conjugation: BATCH_FLAG ?? 8,
};
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
const MAX_FAILED_ATTEMPTS = 6; // calls in a row per unit that add nothing
const MAX_REFERENCE_TERMS = 220;
const MAX_CREW_SENTENCES = 60;

// ─── Module grounding: the Core 30 lessons ──────────────────────────────────

interface LessonVerbRef {
  infinitive: string;
  english: string;
  example?: string;
}

interface Grounding {
  /** Spanish terms the lessons teach, minus any that break the module's concept rules. */
  reference: { target: string; english: string }[];
  /** The module's lesson verbs (lower-case infinitive -> verb). */
  verbs: Map<string, LessonVerbRef>;
  /** Real crew sentences from the lesson passages (Spanish = English). */
  crewSentences: string[];
}

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

/** A reference term as one plain card face: no "(...)" notes, the first of "a / b" alternatives. */
function plainTerm(text: string): string {
  return cardCase(text.replace(/\([^)]*\)/g, " ").split("/")[0].replace(/\s+/g, " "));
}

type LessonFile = { lessons?: Record<string, unknown> } | null;
const lessonFile = (dir: string, moduleId: string) =>
  readJson(join(REPO_ROOT, "public", dir, LANG_CODE, `${moduleId}.json`)) as LessonFile;

/**
 * The module's own Spanish as grounding: the authored Core 30 words (roofing) and the authored
 * lesson content / pre-built decks of any module, its lesson verbs, and sentences from its lesson
 * passages. Terms that break the module's concept rules (a word reviewers replaced) are left out,
 * so the model never sees two names for one thing.
 */
function grounding(moduleId: string): Grounding {
  const lists: unknown[] = [];
  if (moduleId === "roofing") lists.push(...Object.values(ROOFING_LESSON_WORDS));
  const content = lessonFile("lesson-content", moduleId);
  for (const file of [content, lessonFile("lesson-decks", moduleId)]) {
    if (!file?.lessons || typeof file.lessons !== "object") continue;
    for (const lesson of Object.values(file.lessons)) {
      lists.push(Array.isArray(lesson) ? lesson : (lesson as { words?: unknown } | null)?.words);
    }
  }
  const seen = new Set<string>();
  const reference: { target: string; english: string }[] = [];
  for (const list of lists) {
    for (const word of cleanLessonWords(list, { maxTerms: 80, maxPhrases: 0 })) {
      if (word.kind !== "term") continue;
      const target = plainTerm(word.es);
      const english = plainTerm(word.en);
      const key = wordMatchKey(target);
      if (!target || !english || seen.has(key) || target.length > WORD_MATCH_CARD_RULES.maxTargetChars) continue;
      if (conceptProblems(moduleId, english, target).length > 0) continue;
      seen.add(key);
      reference.push({ target, english });
    }
  }

  const verbs = new Map<string, LessonVerbRef>();
  const pairs: [string, string][] = [];
  for (const lesson of Object.values(content?.lessons ?? {})) {
    const l = lesson as {
      verbs?: { infinitive?: unknown; native?: unknown; example?: { target?: unknown; native?: unknown } }[];
      passage?: { target?: unknown; native?: unknown };
    };
    for (const verb of l.verbs ?? []) {
      if (typeof verb.infinitive !== "string" || typeof verb.native !== "string") continue;
      const key = verb.infinitive.trim().toLocaleLowerCase();
      if (!verbs.has(key)) {
        const example =
          typeof verb.example?.target === "string" && typeof verb.example?.native === "string"
            ? `${verb.example.target} = ${verb.example.native}`
            : undefined;
        verbs.set(key, { infinitive: verb.infinitive.trim(), english: verb.native.trim(), example });
      }
    }
    const es = l.passage?.target;
    const en = l.passage?.native;
    if (Array.isArray(es) && Array.isArray(en)) {
      es.forEach((sentence, i) => {
        if (typeof sentence === "string" && typeof en[i] === "string") pairs.push([sentence, en[i] as string]);
      });
    }
  }
  if (moduleId === "roofing") {
    for (const passage of Object.values(ROOFING_LESSON_PASSAGES)) {
      passage.es.forEach((sentence, i) => pairs.push([sentence, passage.en[i]]));
    }
  }
  const clean = pairs.filter(([es, en]) => conceptProblems(moduleId, en, es).length === 0);
  const step = Math.max(1, Math.floor(clean.length / MAX_CREW_SENTENCES));
  const crewSentences = clean
    .filter((_, i) => i % step === 0)
    .slice(0, MAX_CREW_SENTENCES)
    .map(([es, en]) => `${es} = ${en}`);
  return { reference: reference.slice(0, MAX_REFERENCE_TERMS), verbs, crewSentences };
}

/** The concept terms and banned words a prompt must respect, for the module. */
function moduleRulesForPrompt(moduleId: string) {
  const rules = TRADE_PACK_MODULE_RULES[moduleId];
  if (!rules) return {};
  return {
    requiredTerms: rules.concepts.map((c) => `${c.name} = ${c.term} (always this word, never another)`),
    neverUse: rules.avoidTerms,
  };
}

// ─── Units of work ───────────────────────────────────────────────────────────

/** One pool to fill: a level (Word Match, Sentence Builder) or a level and axis (Conjugation). */
interface Unit {
  area: AreaKey;
  level: 1 | 2 | 3;
  axis?: ConjugationAxis;
  target: number;
  label: string;
}

function unitsFor(area: AreaKey): Unit[] {
  if (area === "wordmatch") {
    return WORD_MATCH_LEVELS.map((level) => ({ area, level, target: BOARDS_PER_LEVEL, label: `wordmatch L${level}` }));
  }
  if (area === "sentence") {
    return SENTENCE_BUILD_LEVELS.map((level) => ({
      area,
      level,
      target: SENTENCE_BUILD_PACK_RULES.minItemsPerLevel,
      label: `sentence L${level}`,
    }));
  }
  return ([1, 2, 3] as ConjugationLevel[]).flatMap((level) =>
    CONJUGATION_LEVEL_AXES[level].map((axis) => ({
      area,
      level,
      axis,
      target: conjugationPoolMinimum(level),
      label: `conjugation L${level} ${axis}`,
    })),
  );
}

// ─── Plan and progress ───────────────────────────────────────────────────────

interface AreaProgress {
  version: 1;
  module: string;
  language: string;
  model: string;
  startedAt: string;
  /** Word Match keeps its boards under "boards" (the P1 progress format). */
  boards?: TradePackWordMatchBoard[];
  items?: (TradePackSentenceItem | TradePackConjugationItem)[];
  calls: number;
  rejected: number;
  reviewRejected?: number;
}

interface AreaPlan {
  area: AreaKey;
  progressFile: string;
  progress: AreaProgress;
  /** Rebuild this area (no valid published section, or --force). */
  todo: boolean;
}

interface ModulePlan {
  module: AppModule;
  publicFile: string;
  ground: Grounding;
  areas: Partial<Record<AreaKey, AreaPlan>>;
  /** consecutive calls per unit that added nothing */
  failedAttempts: Map<string, number>;
  /** the last problems per unit, shown to the next call */
  lastProblems: Map<string, string[]>;
}

const stats = {
  calls: 0,
  retries: 0,
  accepted: 0,
  rejected: 0,
  reviewCalls: 0,
  reviewRejected: 0,
  inputTokens: 0,
  outputTokens: 0,
};

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

/** Problems with one Word Match board for this module (beyond the shared board validator). */
function boardProblems(moduleId: string, board: TradePackWordMatchBoard): string[] {
  return [...wordMatchCardProblems(board, board.level), ...wordMatchConceptProblems(moduleId, board)];
}

/** Boards from a saved progress file or pack, normalized and re-checked: only valid ones are kept. */
function validBoards(moduleId: string, raw: unknown): TradePackWordMatchBoard[] {
  if (!Array.isArray(raw)) return [];
  const boards: TradePackWordMatchBoard[] = [];
  for (const item of raw) {
    const level = (item as { level?: unknown })?.level;
    if (level !== 1 && level !== 2 && level !== 3) continue;
    const checked = checkWordMatchBoard(normalizeBoard(item), level);
    // The card rules run again here, so boards saved by an older run are re-checked on resume.
    if (checked.ok && boardProblems(moduleId, { level, ...checked.board }).length === 0) {
      boards.push({ level, ...checked.board });
    }
  }
  return boards;
}

const nfc = (value: unknown) => (typeof value === "string" ? value.normalize("NFC").trim() : value);

/** A Sentence Builder item, normalized (NFC, lower-case topic) and checked; null when it fails. */
function sentenceItem(moduleId: string, raw: unknown, level: SentenceBuildLevel): { item?: TradePackSentenceItem; errors: string[] } {
  if (!raw || typeof raw !== "object") return { errors: ["not an object"] };
  const r = raw as Record<string, unknown>;
  const candidate = {
    targetSentence: nfc(r.targetSentence),
    englishTranslation: nfc(r.englishTranslation),
    tokens: Array.isArray(r.tokens) ? r.tokens.map(nfc) : r.tokens,
    topic: typeof r.topic === "string" ? r.topic.trim().toLowerCase() : r.topic,
    // The cefr field is redundant with the level; set it so a wrong label cannot sink an item.
    cefr: sentenceBuildCefr(level),
    explanation: nfc(r.explanation),
  };
  const checked = checkSentenceBuildItem(candidate, level, LANGUAGE!);
  if (!checked.ok) return { errors: [checked.error] };
  const item = { level, ...checked.question };
  const problems = sentenceItemProblems(moduleId, item);
  return problems.length ? { errors: problems } : { item, errors: [] };
}

/** A Conjugation item, normalized and checked for its unit (structure, CEFR, axis, module rules). */
function conjugationItem(
  moduleId: string,
  raw: unknown,
  level: ConjugationLevel,
  axis: ConjugationAxis,
  verbs: ReadonlySet<string>,
): { item?: TradePackConjugationItem; errors: string[] } {
  if (!raw || typeof raw !== "object") return { errors: ["not an object"] };
  const r = raw as Record<string, unknown>;
  const candidate = {
    phrase: nfc(r.phrase),
    phraseTranslation: nfc(r.phraseTranslation),
    infinitive: typeof r.infinitive === "string" ? r.infinitive.normalize("NFC").trim().toLocaleLowerCase() : r.infinitive,
    infinitiveTranslation: nfc(r.infinitiveTranslation),
    correctConjugation: nfc(r.correctConjugation),
    wrongOptions: Array.isArray(r.wrongOptions) ? r.wrongOptions.map(nfc) : r.wrongOptions,
    explanation: nfc(r.explanation),
    axisTested: r.axisTested,
    cefr: conjugationCefr(level),
  };
  const checked = checkConjugationQuestion(candidate, { cefr: conjugationCefr(level), axis });
  if (!checked.ok) {
    return {
      errors: [
        checked.reason === "mismatch"
          ? `axisTested must be "${axis}" (got "${String(r.axisTested)}")`
          : "structure: exactly one ___ in the phrase, four distinct verb forms with no ?, every field filled",
      ],
    };
  }
  const item = { level, ...checked.question };
  const problems = conjugationItemProblems(moduleId, item, verbs);
  return problems.length ? { errors: problems } : { item, errors: [] };
}

function validItems(plan: ModulePlan, area: AreaKey, raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const verbs = new Set(plan.ground.verbs.keys());
  const items: (TradePackSentenceItem | TradePackConjugationItem)[] = [];
  for (const entry of raw) {
    const level = (entry as { level?: unknown })?.level;
    if (level !== 1 && level !== 2 && level !== 3) continue;
    if (area === "sentence") {
      const { item } = sentenceItem(plan.module.id, entry, level);
      if (item) items.push(item);
    } else {
      const axis = (entry as { axisTested?: unknown }).axisTested as ConjugationAxis;
      if (!CONJUGATION_LEVEL_AXES[level].includes(axis)) continue;
      const { item } = conjugationItem(plan.module.id, entry, level, axis, verbs);
      if (item) items.push(item);
    }
  }
  return items;
}

const progressFileFor = (id: string, area: AreaKey) => join(PROGRESS_DIR, LANG_CODE, `${id}.${area}.json`);

function sectionErrors(plan: ModulePlan, area: AreaKey, raw: unknown[]): string[] {
  if (area === "wordmatch") {
    const errors = validateWordMatchSection(raw);
    for (const board of raw) {
      const level = (board as { level?: unknown })?.level;
      if (level !== 1 && level !== 2 && level !== 3) continue;
      const checked = checkWordMatchBoard(board, level);
      if (checked.ok) errors.push(...wordMatchConceptProblems(plan.module.id, checked.board));
    }
    return errors;
  }
  if (area === "sentence") return validateSentenceBuildSection(raw, { moduleId: plan.module.id, language: LANGUAGE! });
  return validateConjugationSection(raw, { moduleId: plan.module.id, verbs: new Set(plan.ground.verbs.keys()) });
}

/** The raw list of a section in the published pack (or undefined). */
function publishedSection(plan: ModulePlan, area: AreaKey): unknown[] | undefined {
  const raw = readJson(plan.publicFile) as Record<string, { boards?: unknown[]; items?: unknown[] }> | null;
  const section = raw?.[AREA_SECTION[area]];
  const list = area === "wordmatch" ? section?.boards : section?.items;
  return Array.isArray(list) ? list : undefined;
}

/** True when the published pack already holds a section for the area that passes every rule. */
function publishedSectionIsValid(plan: ModulePlan, area: AreaKey): boolean {
  const list = publishedSection(plan, area);
  const file = parseTradePack(readJson(plan.publicFile), { moduleId: plan.module.id, language: LANGUAGE! });
  return !!file?.[AREA_SECTION[area]] && !!list && sectionErrors(plan, area, list).length === 0;
}

function buildPlan(): ModulePlan[] {
  return moduleIds.map((id) => {
    const module = MODULES.find((item) => item.id === id);
    if (!module) usageError(`Unknown module "${id}".`);
    if (!moduleSupportsLearningPair(module, LANGUAGE as never, NATIVE as never)) {
      usageError(`Module "${id}" does not support ${LANGUAGE} for ${NATIVE} speakers.`);
    }
    const plan: ModulePlan = {
      module,
      publicFile: join(PUBLIC_DIR, LANG_CODE, `${id}.json`),
      ground: grounding(id),
      areas: {},
      failedAttempts: new Map(),
      lastProblems: new Map(),
    };
    for (const area of AREAS) {
      if (area === "conjugation" && plan.ground.verbs.size === 0) {
        usageError(`Module "${id}" has no lesson verbs (public/lesson-content/${LANG_CODE}/${id}.json), so no conjugation pack.`);
      }
      const progressFile = progressFileFor(id, area);
      const saved = FORCE ? null : (readJson(progressFile) as Partial<AreaProgress> | null);
      const progress: AreaProgress = {
        version: 1,
        module: id,
        language: LANGUAGE!,
        model: MODEL,
        startedAt: typeof saved?.startedAt === "string" ? saved.startedAt : new Date().toISOString(),
        calls: typeof saved?.calls === "number" ? saved.calls : 0,
        rejected: typeof saved?.rejected === "number" ? saved.rejected : 0,
      };
      if (area === "wordmatch") progress.boards = validBoards(id, saved?.boards);
      else {
        progress.items = validItems(plan, area, saved?.items);
        progress.reviewRejected = typeof saved?.reviewRejected === "number" ? saved.reviewRejected : 0;
      }
      plan.areas[area] = { area, progressFile, progress, todo: true };
    }
    for (const area of AREAS) {
      plan.areas[area]!.todo = FORCE || !publishedSectionIsValid(plan, area);
    }
    return plan;
  });
}

function countIn(plan: ModulePlan, unit: Unit): number {
  const progress = plan.areas[unit.area]!.progress;
  if (unit.area === "wordmatch") return progress.boards!.filter((b) => b.level === unit.level).length;
  return progress.items!.filter(
    (item) => item.level === unit.level && (unit.axis === undefined || (item as TradePackConjugationItem).axisTested === unit.axis),
  ).length;
}

function saveProgress(plan: ModulePlan, area: AreaKey) {
  const a = plan.areas[area]!;
  writeAtomic(a.progressFile, `${JSON.stringify(a.progress, null, 1)}\n`);
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const VARIETY = `${SPANISH_VARIETY_RULE} No slang, no profanity. Spell it correctly, with accents, ñ, ¿ and ¡.`;

const WM_LEVEL_GUIDE: Record<WordMatchLevel, string> = {
  1: "Level 1 (CEFR A2, 6 pairs): the concrete, high-frequency words a crew member needs on day one: tools, materials, protective gear, vehicles, parts of the work area, simple actions.",
  2: "Level 2 (CEFR B1, 8 pairs): everyday working vocabulary a step above: common work verbs, conditions and problems, measuring and checking, steps of the job, talking with the crew and the customer.",
  3: "Level 3 (CEFR B2, 10 pairs): job-specific technical vocabulary, mostly multi-word terms: causes of failure, inspection and quality, safety planning, weather and moisture, estimating, warranty and closeout. No A1 everyday words at all (no hoy, mañana, trabajo, techo, pared, clavo, lluvia, foto, viento, agua, casa, and the like): a learner who knows 100 Spanish words must not be able to match half the board.",
};

const WM_SYSTEM = `You write vocabulary boards for a memory-matching game. The learner is a working adult learning Spanish for their trade. Each card face shows a Spanish word; the matching face shows its English meaning. One board is one coherent topic from a real moment on the job.

Rules, all of them required:
1. One topic per board: a concrete job-site situation or work area of the trade (not a school subject). Give it a short English label of 1-3 words, lower case (for example "ladder safety" or "tear-off crew"). Every board has a topic that differs clearly from the others in your answer and from all topics already used in the pack (a different situation, not a rewording).
2. Every pair belongs to the board's topic. A pair is { target, english }: target is the Spanish word or very short phrase (at most ${WORD_MATCH_CARD_RULES.maxTargetWords} words, ${WORD_MATCH_CARD_RULES.maxTargetChars} characters); english is its English meaning (at most ${WORD_MATCH_CARD_RULES.maxEnglishChars} characters). No single Spanish word longer than ${WORD_MATCH_CARD_RULES.maxWordChars} characters (it would be clipped on a phone card). Verbs: the infinitive in Spanish, "to ..." in English.
3. Inside a board, every target is different and every english is different. Do not repeat any target from the list of targets already used; across the boards of one answer, use each target once.
4. Write every card in lower case ("teja asfáltica", "to cut"), except acronyms and proper names; no slashes, brackets or notes on a card. Neutral Latin American Spanish, the kind a mixed crew from Mexico, Central America and South America all understand. No vosotros, no voseo, no words that only Spain uses (say "techo", not "tejado"), no slang, no profanity. Spell it correctly, with accents and ñ.
5. Prefer the exact Spanish the reference list gives for a term it covers (the learner already met those words in the lessons). At least half of the targets on every board should come from the reference list; the rest are other common words a crew uses on that topic.
6. Never state a universal specification: no counts, sizes, distances or code numbers, and no brand names. Stick to words, not figures.
7. Where a topic involves risk (heights, ladders, electricity, heat, tools), the words must support safe practice.
8. Respect the CEFR level in the user message, and use exactly the number of pairs requested. The two faces of a pair must never be the same word (no "fascia" / "fascia"): when the English and Spanish are identical, choose a different word.
9. Use one Spanish word per concept across the whole pack: the requiredTerms list gives the word for each concept it names (use it, and never another word for that concept); otherwise the one in the reference list. Never use a word in neverUse.
Return the result as ONE JSON object that matches the given JSON schema (your structured output); return it once.`;

const SB_LEVEL_GUIDE: Record<SentenceBuildLevel, string> = {
  1: "Level 1 (CEFR A2, 4-6 tokens): short, simple sentences: present tense, crew commands with ustedes (Revisen la escalera.), short questions (¿Dónde va el bajante?), estar / tener / hay.",
  2: "Level 2 (CEFR B1, 6-9 tokens): prepositional phrases, noun-adjective agreement, object pronouns (lo, la, los), ir a + infinitive, the preterite (Ayer revisamos...), tener que, poder, time words.",
  3: "Level 3 (CEFR B2, 9-13 tokens): a main clause plus a subordinate clause or a time or place phrase: cuando / si / porque / antes de que / para que / hasta que, the present subjunctive after a trigger (antes de que llueva, es importante que revisen), the conditional, polite requests to a customer.",
};

const SB_SYSTEM = `You write questions for a Sentence Builder game. The learner is a working adult learning Spanish for their trade: they see the English, get the Spanish sentence as shuffled tokens, and put them back in order.

Rules, all of them required:
1. Each question is ONE natural, complete Spanish sentence that someone on this job really says: a lead to the crew, a crew member to a coworker, the crew to a customer or an inspector. Real moments of the work (instructions, checks, problems, materials, safety, the customer, cleanup), never textbook filler. Use the module's own vocabulary: the requiredTerms (always that word for that concept), the reference terms and the lesson verbs. Never use a word in neverUse.
2. ${VARIETY} A lead speaking to the crew uses ustedes commands (revisen, traigan); one customer is usted; coworkers may use tú.
3. "tokens" is the WHOLE sentence split on spaces, in order. Punctuation stays attached to its word ("¿Dónde", "va?", "Miguel,"); articles and nouns are separate tokens ("la", "canaleta"). Joining the tokens with single spaces must give exactly "targetSentence". The token count must fit the level.
4. "englishTranslation": a faithful, natural English translation of the whole sentence (the learner rebuilds the Spanish from it, so nothing may be missing or added).
5. "explanation": ONE short English sentence (at most 200 characters) on the sticking point of this order or grammar (adjective after the noun, pronoun before the verb, subjunctive after antes de que, ...).
6. "topic": 1-3 lower-case English words for the job moment ("downspout check", "customer walkthrough").
7. Never state a universal specification. Prefer sentences without figures; a figure with a unit (inches, feet, degrees, pounds, a slope) is allowed only when the SAME sentence says whose it is (según el fabricante, según el plano, lo que pide el código, las instrucciones).
8. Where a sentence involves risk (heights, ladders, power lines, cutting, heat), it supports safe practice.
9. Every sentence differs from the others in your answer and from the ones already used: vary the opening words (no two sentences of a level may share their first 30 characters), the speaker, the sentence type (command, question, statement, negative) and the topic.
Return the result as ONE JSON object that matches the given JSON schema (your structured output); return it once.`;

const CONJ_AXIS_GUIDE: Record<ConjugationAxis, string> = {
  tense: 'axis "tense": the four options are the SAME person and number in four different tenses (for example revisamos / revisábamos / revisaremos / revisaríamos); the sentence has a clear time marker (ayer, mañana, ahora mismo, todos los días, el lunes pasado) so only one tense fits.',
  person: 'axis "person": the four options are the SAME tense in different persons (reviso / revisas / revisa / revisamos); the subject (a pronoun or a named person) is in the sentence, so only one person fits.',
  number: 'axis "number": the options pair singular and plural forms of the same tense (revisa / revisan, reviso / revisamos); the subject makes the number clear (el ayudante vs. los ayudantes, yo vs. nosotros).',
  mood: 'axis "mood": the options differ in mood: indicative vs. present subjunctive vs. command (revisan / revisen / revisaron / revisarán, for example); a trigger in the sentence decides it (es importante que, antes de que, para que, quiero que, ojalá, or a direct command to the crew).',
  mixed: 'axis "mixed": each wrong option gets a different transformation wrong (tense, person, number or mood), so the learner must combine two or more cues: for example "Si llueve mañana, ___ la obra" (cancelaremos / cancelamos / cancelaríamos / cancelen).',
};

const CONJ_SYSTEM = `You write fill-in-the-blank conjugation questions for adult learners of Spanish for their trade. One question = one sentence from the job with a blank where the conjugated verb goes, and four forms of the SAME verb to choose from.

Rules, all of them required:
1. "phrase": a natural Spanish sentence someone on this job really says, with exactly one "___" (three underscores) where the conjugated verb goes. It must give clear cues (subject, time marker, mood trigger) so EXACTLY ONE option fits; an independent reviewer solves it without seeing your answer and rejects it if two options could fit. Reflexive and object pronouns stay outside the blank (Los instaladores se ___ el arnés).
2. "phraseTranslation": the English translation with [verb] where the blank is (once), for example "Yesterday we [verb] the downspouts."
3. "infinitive": a verb from the moduleVerbs list ONLY (use the infinitive exactly as listed); "infinitiveTranslation": its English, "to ...".
4. "correctConjugation": the single form that fits. "wrongOptions": exactly 3 OTHER forms of the same verb, real Spanish forms, plausible but clearly wrong in this sentence. All four distinct. Never a vosotros form (-áis, -éis, -ís, sois): use ustedes forms.
5. "axisTested" is exactly the axis the user message asks for, and "cefr" exactly its CEFR. Level 1 (A2): present, preterite, near future, simple forms of high-frequency verbs. Level 2 (B1): add imperfect, future, present subjunctive after a clear trigger, commands. Level 3 (B2): subjunctive and conditional in complex sentences, si clauses, combinations.
6. "explanation": ONE short English sentence (at most 200 characters) on why the correct form is correct, naming the cue (e.g. "Preterite: 'ayer' marks a finished action, and nosotros is the subject.").
7. ${VARIETY}
8. Use the module's vocabulary: requiredTerms give the one word for each concept (never another word for it); never use a word in neverUse. Never state a universal specification: a figure with a unit is allowed only when the same sentence says whose it is (según el fabricante, el plano, el código). Where risk is involved, the sentence supports safe practice.
9. Every phrase differs from the others and from the ones already used, and spread the verbs: do not use a verb listed in verbsAtLimit, and use each verb at most twice in one answer.
Return the result as ONE JSON object that matches the given JSON schema (your structured output); return it once.`;

const REVIEW_SYSTEM = `${CONJUGATION_REVIEW_SYSTEM} You receive several questions; return one review for each, with its id.`;

const WM_SCHEMA = cliJsonSchema({
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

const SB_SCHEMA = cliJsonSchema({
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          targetSentence: { type: "string" },
          englishTranslation: { type: "string" },
          tokens: { type: "array", items: { type: "string" } },
          topic: { type: "string" },
          cefr: { type: "string", enum: ["A2", "B1", "B2"] },
          explanation: { type: "string" },
        },
        required: ["targetSentence", "englishTranslation", "tokens", "topic", "cefr", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
});

const CONJ_SCHEMA = cliJsonSchema({
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          phraseTranslation: { type: "string" },
          infinitive: { type: "string" },
          infinitiveTranslation: { type: "string" },
          correctConjugation: { type: "string" },
          wrongOptions: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
          axisTested: { type: "string", enum: ["tense", "person", "number", "mood", "mixed"] },
          cefr: { type: "string", enum: ["A2", "B1", "B2"] },
        },
        required: [
          "phrase",
          "phraseTranslation",
          "infinitive",
          "infinitiveTranslation",
          "correctConjugation",
          "wrongOptions",
          "explanation",
          "axisTested",
          "cefr",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
});

const REVIEW_SCHEMA = cliJsonSchema({
  type: "object",
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, ...CONJUGATION_REVIEW_PROPERTIES },
        required: ["id", ...CONJUGATION_REVIEW_REQUIRED],
        additionalProperties: false,
      },
    },
  },
  required: ["reviews"],
  additionalProperties: false,
});

function tradeOf(module: AppModule) {
  return { name: module.name, learnerRole: module.userRole, about: module.blurb, vocabularyFocus: module.vocabFocus };
}

function userMessage(plan: ModulePlan, unit: Unit, want: number): string {
  const module = plan.module;
  const recentProblems = plan.lastProblems.get(unit.label)?.slice(0, 12);
  if (unit.area === "wordmatch") {
    const boards = plan.areas.wordmatch!.progress.boards!;
    const level = unit.level as WordMatchLevel;
    return JSON.stringify(
      {
        task: `Write ${want} Word Match boards for ${module.name}, ${wordMatchPairCount(level)} pairs each, CEFR ${wordMatchCefr(level)}.`,
        trade: tradeOf(module),
        level: WM_LEVEL_GUIDE[level],
        boards: want,
        pairsPerBoard: wordMatchPairCount(level),
        ...moduleRulesForPrompt(module.id),
        topicsAlreadyUsedInThePack: boards.map((board) => board.topic),
        targetsAlreadyUsedElsewhere: [...new Set(boards.flatMap((board) => board.pairs.map((pair) => pair.target)))],
        referenceList: plan.ground.reference.map((term) => `${term.target} = ${term.english}`),
        ...(recentProblems?.length ? { problemsInRecentAnswers: recentProblems } : {}),
      },
      null,
      1,
    );
  }
  const items = plan.areas[unit.area]!.progress.items!;
  const verbs = [...plan.ground.verbs.values()].map((v) => `${v.infinitive} = ${v.english}`);
  if (unit.area === "sentence") {
    const level = unit.level as SentenceBuildLevel;
    const { min, max } = sentenceBuildTokenRange(level);
    return JSON.stringify(
      {
        area: "sentence",
        task: `Write ${want} Sentence Builder questions for ${module.name}, CEFR ${sentenceBuildCefr(level)}, ${min}-${max} tokens each.`,
        trade: tradeOf(module),
        level: SB_LEVEL_GUIDE[level],
        count: want,
        cefr: sentenceBuildCefr(level),
        tokensMin: min,
        tokensMax: max,
        ...moduleRulesForPrompt(module.id),
        sentencesAlreadyUsed: items.filter((item) => item.level === level).map((item) => (item as TradePackSentenceItem).targetSentence),
        topicsAlreadyUsed: [...new Set(items.map((item) => (item as TradePackSentenceItem).topic))],
        lessonVerbs: verbs,
        referenceList: plan.ground.reference.map((term) => `${term.target} = ${term.english}`),
        crewSentencesFromTheLessons: plan.ground.crewSentences,
        ...(recentProblems?.length ? { problemsInRecentAnswers: recentProblems } : {}),
      },
      null,
      1,
    );
  }
  const level = unit.level as ConjugationLevel;
  const pool = items.filter((item) => item.level === level && (item as TradePackConjugationItem).axisTested === unit.axis) as TradePackConjugationItem[];
  const cap = level === 3 ? CONJUGATION_ITEM_RULES.maxPerInfinitiveLevel3 : CONJUGATION_ITEM_RULES.maxPerInfinitive;
  const uses = new Map<string, number>();
  for (const item of pool) uses.set(item.infinitive, (uses.get(item.infinitive) ?? 0) + 1);
  return JSON.stringify(
    {
      area: "conjugation",
      task: `Write ${want} conjugation questions for ${module.name}: level ${level}, CEFR ${conjugationCefr(level)}, axisTested "${unit.axis}".`,
      trade: tradeOf(module),
      count: want,
      level,
      cefr: conjugationCefr(level),
      axisTested: unit.axis,
      axisRule: CONJ_AXIS_GUIDE[unit.axis!],
      ...moduleRulesForPrompt(module.id),
      moduleVerbs: [...plan.ground.verbs.values()].map((v) => `${v.infinitive} = ${v.english}${v.example ? ` (lesson example: ${v.example})` : ""}`),
      verbsAtLimit: [...uses].filter(([, count]) => count >= cap).map(([verb]) => verb),
      verbsUsedInThisPool: Object.fromEntries(uses),
      phrasesAlreadyUsed: (items as TradePackConjugationItem[]).filter((item) => item.level === level).map((item) => item.phrase),
      referenceList: plan.ground.reference.slice(0, 120).map((term) => `${term.target} = ${term.english}`),
      crewSentencesFromTheLessons: plan.ground.crewSentences.slice(0, 30),
      ...(recentProblems?.length ? { problemsInRecentAnswers: recentProblems } : {}),
    },
    null,
    1,
  );
}

// ─── Accepting items ─────────────────────────────────────────────────────────

/**
 * Checks the boards of one reply against the shared validator, the card-size rules, the module's
 * concept rules and the pool so far (new topic, little reuse of a target). Accepted boards are
 * added to the plan's progress; the rest come back as error lines for the next attempt.
 */
function acceptBoards(plan: ModulePlan, unit: Unit, reply: unknown, want: number): string[] {
  const level = unit.level as WordMatchLevel;
  const area = plan.areas.wordmatch!;
  const boards = area.progress.boards!;
  const errors: string[] = [];
  const raw = (reply as { boards?: unknown } | null)?.boards;
  if (!Array.isArray(raw)) return ["the answer had no boards list"];
  if (raw.length > want) errors.push(`asked for ${want} boards, got ${raw.length}; only the first ${want} are used`);
  const pairsPerBoard = wordMatchPairCount(level);
  const maxSharedTargets = Math.floor(pairsPerBoard / 4);
  for (const [index, item] of raw.slice(0, want).entries()) {
    if (countIn(plan, unit) >= unit.target) break;
    const label = `board ${index + 1}${typeof (item as { topic?: unknown })?.topic === "string" ? ` ("${(item as { topic: string }).topic}")` : ""}`;
    // The cefr field is redundant with the level; set it so a wrong label cannot sink a board.
    const candidate =
      item && typeof item === "object" ? normalizeBoard({ ...(item as object), cefr: wordMatchCefr(level) }) : item;
    const checked = checkWordMatchBoard(candidate, level);
    if (!checked.ok) {
      stats.rejected++;
      area.progress.rejected++;
      errors.push(...checked.errors.map((error) => `${label}: ${error}`));
      continue;
    }
    const board = checked.board;
    // Card size, lower case, brackets, identical faces, the level 3 A1 guard and the concept rules.
    const problems: string[] = boardProblems(plan.module.id, { level, ...board });
    const topicKey = wordMatchFoldKey(board.topic);
    if (boards.some((other) => wordMatchFoldKey(other.topic) === topicKey)) {
      problems.push(`topic "${board.topic}" is already used by another board (topics are unique across the pack)`);
    }
    const uses = new Map<string, number>();
    for (const other of boards) {
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
      area.progress.rejected++;
      errors.push(...problems.map((problem) => `${label}: ${problem}`));
      continue;
    }
    boards.push({ level, ...board });
    stats.accepted++;
  }
  return errors;
}

function acceptSentences(plan: ModulePlan, unit: Unit, reply: unknown, want: number): string[] {
  const level = unit.level as SentenceBuildLevel;
  const area = plan.areas.sentence!;
  const items = area.progress.items! as TradePackSentenceItem[];
  const raw = (reply as { items?: unknown } | null)?.items;
  if (!Array.isArray(raw)) return ["the answer had no items list"];
  const errors: string[] = [];
  for (const [index, entry] of raw.slice(0, want).entries()) {
    if (countIn(plan, unit) >= unit.target) break;
    const label = `item ${index + 1}`;
    const { item, errors: problems } = sentenceItem(plan.module.id, entry, level);
    if (item) {
      if (items.some((other) => wordMatchFoldKey(other.targetSentence) === wordMatchFoldKey(item.targetSentence))) {
        problems.push(`"${item.targetSentence}" is already in the pack`);
      } else if (items.some((other) => other.level === level && sentenceAvoidKey(other.targetSentence) === sentenceAvoidKey(item.targetSentence))) {
        problems.push(`"${item.targetSentence}": another level ${level} sentence already opens with "${sentenceAvoidKey(item.targetSentence)}"; start it differently`);
      }
    }
    if (!item || problems.length > 0) {
      stats.rejected++;
      area.progress.rejected++;
      errors.push(...problems.map((problem) => `${label}: ${problem}`));
      continue;
    }
    items.push(item);
    stats.accepted++;
  }
  return errors;
}

/** Stage 1 for conjugation: the questions of one reply that pass every static rule for the unit. */
function screenConjugation(plan: ModulePlan, unit: Unit, reply: unknown, want: number) {
  const level = unit.level as ConjugationLevel;
  const area = plan.areas.conjugation!;
  const items = area.progress.items! as TradePackConjugationItem[];
  const raw = (reply as { items?: unknown } | null)?.items;
  if (!Array.isArray(raw)) return { candidates: [], errors: ["the answer had no items list"] };
  const verbs = new Set(plan.ground.verbs.keys());
  const cap = level === 3 ? CONJUGATION_ITEM_RULES.maxPerInfinitiveLevel3 : CONJUGATION_ITEM_RULES.maxPerInfinitive;
  const errors: string[] = [];
  const candidates: TradePackConjugationItem[] = [];
  for (const [index, entry] of raw.slice(0, want).entries()) {
    const label = `item ${index + 1}`;
    const { item, errors: problems } = conjugationItem(plan.module.id, entry, level, unit.axis!, verbs);
    if (item) {
      const pool = [...items, ...candidates].filter((other) => other.level === level && other.axisTested === unit.axis);
      if ([...items, ...candidates].some((other) => wordMatchFoldKey(other.phrase) === wordMatchFoldKey(item.phrase))) {
        problems.push(`"${item.phrase}" is already in the pack`);
      } else if (pool.filter((other) => other.infinitive === item.infinitive).length >= cap) {
        problems.push(`"${item.infinitive}" is already used ${cap} times in this pool; use another lesson verb`);
      }
    }
    if (!item || problems.length > 0) {
      stats.rejected++;
      area.progress.rejected++;
      errors.push(...problems.map((problem) => `${label}: ${problem}`));
      continue;
    }
    candidates.push(item);
  }
  return { candidates, errors };
}

/**
 * Stage 2 for conjugation: the independent review gate. One call checks every candidate without
 * seeing the designated answer (options sorted); a question is kept only when the review lists
 * exactly its answer and confirms it is unambiguous, accurately explained, on the asked axis and
 * fit for the level (conjugationReviewAccepts, the same rule the live function applies).
 */
async function reviewConjugation(plan: ModulePlan, unit: Unit, candidates: TradePackConjugationItem[]): Promise<string[]> {
  const area = plan.areas.conjugation!;
  const level = unit.level as ConjugationLevel;
  const input = {
    area: "conjugation-review",
    questions: candidates.map((item, i) => ({
      id: `q${i + 1}`,
      ...conjugationReviewInput(item, { language: LANGUAGE!, level, cefr: conjugationCefr(level), axis: unit.axis! }),
    })),
  };
  stats.reviewCalls++;
  const reply = await callCli(JSON.stringify(input, null, 1), REVIEW_SYSTEM, REVIEW_SCHEMA);
  area.progress.calls++;
  const reviews = (reply as { reviews?: unknown } | null)?.reviews;
  const byId = new Map<string, Record<string, unknown>>();
  if (Array.isArray(reviews)) {
    for (const review of reviews) {
      if (review && typeof review === "object" && typeof (review as { id?: unknown }).id === "string") {
        byId.set((review as { id: string }).id, review as Record<string, unknown>);
      }
    }
  }
  const errors: string[] = [];
  candidates.forEach((item, i) => {
    const review = byId.get(`q${i + 1}`);
    const { id: _id, ...verdict } = review ?? {};
    if (review && conjugationReviewAccepts(verdict, item.correctConjugation)) {
      // A question past the pool's target is dropped, not stored (the pool is full).
      if (countIn(plan, unit) < unit.target) {
        area.progress.items!.push(item);
        stats.accepted++;
      }
      return;
    }
    stats.reviewRejected++;
    area.progress.reviewRejected = (area.progress.reviewRejected ?? 0) + 1;
    const answers = Array.isArray(verdict.acceptableAnswers) ? (verdict.acceptableAnswers as unknown[]).join(" / ") : "none";
    const flags = ["unambiguous", "explanationAccurate", "axisAccurate", "levelAppropriate"].filter((key) => verdict[key] !== true);
    errors.push(
      `"${item.phrase}" (answer ${item.correctConjugation}) failed the independent review: acceptable answers ${answers || "none"}` +
        (flags.length ? `; not ${flags.join(", ")}` : ""),
    );
  });
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
async function callCli(prompt: string, system: string, schema: unknown): Promise<Record<string, unknown> | null> {
  const args = [
    "-p",
    "--output-format", "json",
    "--model", MODEL,
    "--tools", "",
    "--system-prompt", system,
    "--json-schema", JSON.stringify(schema),
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

const SYSTEM_FOR: Record<AreaKey, string> = { wordmatch: WM_SYSTEM, sentence: SB_SYSTEM, conjugation: CONJ_SYSTEM };
const SCHEMA_FOR: Record<AreaKey, unknown> = { wordmatch: WM_SCHEMA, sentence: SB_SCHEMA, conjugation: CONJ_SCHEMA };

/** Fills one unit (a level, or a level and axis) of one module, saving after every call. */
async function fillUnit(plan: ModulePlan, unit: Unit): Promise<void> {
  let retry: { reply: unknown; errors: string[] } | undefined;
  const failedKey = unit.label;
  while (countIn(plan, unit) < unit.target) {
    if ((plan.failedAttempts.get(failedKey) ?? 0) >= MAX_FAILED_ATTEMPTS) {
      throw new Error(`${unit.label}: ${MAX_FAILED_ATTEMPTS} calls in a row added nothing`);
    }
    const missing = unit.target - countIn(plan, unit);
    // Conjugation asks for a few extra: some questions fail the independent review.
    const want = Math.min(BATCH[unit.area], unit.area === "conjugation" ? Math.ceil(missing * 1.25) : missing);
    const request: ApiRequest = {
      model: MODEL,
      max_tokens: 0,
      system: SYSTEM_FOR[unit.area],
      messages: [{ role: "user", content: userMessage(plan, unit, want) }],
      tools: [],
      tool_choice: { type: "auto" },
    };
    const before = countIn(plan, unit);
    const reply = await callCli(cliPrompt(request, retry), SYSTEM_FOR[unit.area], SCHEMA_FOR[unit.area]);
    const area = plan.areas[unit.area]!;
    area.progress.calls++;
    let errors: string[];
    if (!reply) errors = ["the reply held no JSON object"];
    else if (unit.area === "wordmatch") errors = acceptBoards(plan, unit, reply, want);
    else if (unit.area === "sentence") errors = acceptSentences(plan, unit, reply, want);
    else {
      const screened = screenConjugation(plan, unit, reply, want);
      errors = screened.errors;
      if (screened.candidates.length > 0) errors.push(...(await reviewConjugation(plan, unit, screened.candidates)));
    }
    saveProgress(plan, unit.area);
    const added = countIn(plan, unit) - before;
    plan.lastProblems.set(unit.label, errors);
    console.log(
      `  ${plan.module.id} ${unit.label}: +${added}, ${countIn(plan, unit)}/${unit.target}` +
        (errors.length ? `, ${errors.length} problem(s): ${errors.slice(0, 2).join(" | ").slice(0, 240)}` : ""),
    );
    if (added === 0) {
      plan.failedAttempts.set(failedKey, (plan.failedAttempts.get(failedKey) ?? 0) + 1);
      stats.retries++;
      retry = { reply: reply ?? "(no JSON object)", errors };
    } else {
      plan.failedAttempts.set(failedKey, 0);
      retry = undefined;
    }
  }
}

// ─── Publishing ──────────────────────────────────────────────────────────────

/** The pack file, one board or question per line, so a review diff shows whole items. */
function formatPack(head: Record<string, unknown>, sections: Partial<Record<TradePackArea, unknown[]>>): string {
  let text = JSON.stringify(head).slice(0, -1);
  for (const section of TRADE_PACK_AREAS) {
    const list = sections[section];
    if (!list) continue;
    const key = section === "wordMatch" ? "boards" : "items";
    text += `,"${section}":{"${key}":[\n${list.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n]}`;
  }
  return `${text}}\n`;
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

/** The area's items in pack order: by level (and axis), then in the order they were accepted. */
function orderedItems(plan: ModulePlan, area: AreaKey): unknown[] {
  if (area === "wordmatch") {
    const boards = plan.areas.wordmatch!.progress.boards!;
    return WORD_MATCH_LEVELS.flatMap((level) => boards.filter((board) => board.level === level));
  }
  const items = plan.areas[area]!.progress.items!;
  return unitsFor(area).flatMap((unit) =>
    items.filter(
      (item) => item.level === unit.level && (unit.axis === undefined || (item as TradePackConjugationItem).axisTested === unit.axis),
    ),
  );
}

/**
 * Writes the pack with every area of this run whose whole section validates; the sections this
 * run did not build (or could not finish) are kept as they were published.
 */
function publish(plan: ModulePlan): { ok: boolean; bytes: number; errors: string[]; written: AreaKey[] } {
  const sections: Partial<Record<TradePackArea, unknown[]>> = {};
  for (const area of AREA_KEYS) {
    const list = publishedSection(plan, area);
    if (list) sections[AREA_SECTION[area]] = list;
  }
  const errors: string[] = [];
  const written: AreaKey[] = [];
  for (const area of AREAS) {
    const a = plan.areas[area]!;
    if (!a.todo) continue;
    const list = orderedItems(plan, area);
    const problems = sectionErrors(plan, area, list);
    if (problems.length > 0) {
      errors.push(...problems.map((problem) => `${area}: ${problem}`));
      continue;
    }
    sections[AREA_SECTION[area]] = list;
    written.push(area);
  }
  if (written.length === 0) return { ok: errors.length === 0, bytes: 0, errors, written };

  const generatedAt = new Date().toISOString();
  const head = {
    version: TRADE_PACK_VERSION,
    module: plan.module.id,
    language: LANGUAGE!,
    nativeLanguage: NATIVE,
    generatedAt,
    model: MODEL,
    reviewed: false,
  };
  const text = formatPack(head, sections);
  // What the app will load must be exactly what was validated: the parser keeps every item.
  const parsed = parseTradePack(JSON.parse(text), { moduleId: plan.module.id, language: LANGUAGE! });
  for (const area of AREA_KEYS) {
    const want = sections[AREA_SECTION[area]]?.length ?? 0;
    const section = parsed?.[AREA_SECTION[area]] as { boards?: unknown[]; items?: unknown[] } | undefined;
    const got = (area === "wordmatch" ? section?.boards : section?.items)?.length ?? 0;
    if (want !== got) return { ok: false, bytes: 0, errors: [`${area}: the finished file kept ${got} of ${want}`], written: [] };
  }
  writeAtomic(plan.publicFile, text);
  const bytes = statSync(plan.publicFile).size;
  const entry: TradePackIndexEntry = {
    module: plan.module.id,
    language: LANGUAGE!,
    nativeLanguage: NATIVE,
    path: tradePackPath(plan.module.id, LANGUAGE!),
    areas: TRADE_PACK_AREAS.filter((section) => sections[section]),
    bytes,
    reviewed: false,
    generatedAt,
  };
  const levelCounts = (list: unknown[]) =>
    Object.fromEntries([1, 2, 3].map((level) => [String(level), list.filter((item) => (item as { level: number }).level === level).length]));
  if (sections.wordMatch) entry.wordMatchBoards = levelCounts(sections.wordMatch);
  if (sections.sentenceBuild) entry.sentenceBuildItems = levelCounts(sections.sentenceBuild);
  if (sections.conjugation) {
    const counts: Record<string, Record<string, number>> = {};
    for (const item of sections.conjugation as TradePackConjugationItem[]) {
      const level = String(item.level);
      counts[level] ??= {};
      counts[level][item.axisTested] = (counts[level][item.axisTested] ?? 0) + 1;
    }
    entry.conjugationItems = counts;
  }
  updateIndex(entry);
  return { ok: errors.length === 0, bytes, errors, written };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-US");

async function main() {
  const plans = buildPlan();
  console.log(
    `Trade packs (${AREAS.join(", ")}): ${plans.length} module(s), ${LANGUAGE} for ${NATIVE} speakers, provider cli, model ${MODEL}, ` +
      `concurrency ${CONCURRENCY}, batch ${AREAS.map((a) => `${a} ${BATCH[a]}`).join(" / ")}${FORCE ? ", --force" : ""}`,
  );
  const units: { plan: ModulePlan; unit: Unit }[] = [];
  for (const plan of plans) {
    for (const area of AREAS) {
      const a = plan.areas[area]!;
      const areaUnits = unitsFor(area);
      const have = areaUnits
        .map((unit) => `${unit.area === "conjugation" ? `L${unit.level} ${unit.axis}` : `L${unit.level}`} ${countIn(plan, unit)}/${unit.target}`)
        .join("  ");
      console.log(
        `  ${LANG_CODE}/${plan.module.id} ${area}: ${a.todo ? have : "published section is valid, nothing to do (use --force to rebuild)"} ` +
          `(reference terms ${plan.ground.reference.length}, lesson verbs ${plan.ground.verbs.size}, saved calls ${a.progress.calls})`,
      );
      if (a.todo) units.push(...areaUnits.map((unit) => ({ plan, unit })));
    }
  }
  if (units.length === 0) return;

  const callsFor = ({ plan, unit }: { plan: ModulePlan; unit: Unit }) =>
    Math.ceil(Math.max(0, unit.target - countIn(plan, unit)) / BATCH[unit.area]) * (unit.area === "conjugation" ? 2 : 1);
  if (DRY_RUN) {
    const calls = units.reduce((sum, u) => sum + callsFor(u), 0);
    console.log(
      `Dry run: ~${calls} model call(s) plus retries, ~${fmt(calls * 4500)} input / ~${fmt(calls * 3200)} output tokens, ` +
        `~${Math.max(1, Math.round((calls * 90) / CONCURRENCY / 60))} min at concurrency ${CONCURRENCY}. Nothing was called or written.`,
    );
    return;
  }

  const startedAt = Date.now();
  const failures: string[] = [];
  let fatal: string | null = null;
  let next = 0;
  async function worker() {
    while (!fatal) {
      const work = units[next++];
      if (!work) return;
      try {
        await fillUnit(work.plan, work.unit);
      } catch (error) {
        if (error instanceof FatalError) {
          fatal = error.message;
          return;
        }
        const message = `${work.plan.module.id} ${work.unit.label}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(message);
        console.log(`FAILED ${message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, units.length) }, worker));

  const published: string[] = [];
  let todoAreas = 0;
  for (const plan of plans) {
    for (const area of AREAS) {
      saveProgress(plan, area);
      if (plan.areas[area]!.todo) todoAreas++;
    }
    const result = publish(plan);
    for (const area of result.written) published.push(`${LANG_CODE}/${plan.module.id} ${area}`);
    if (result.written.length) console.log(`published ${LANG_CODE}/${plan.module.id} (${fmt(result.bytes)} bytes): ${result.written.join(", ")}`);
    if (!result.ok) {
      failures.push(`${plan.module.id}: not published: ${result.errors.slice(0, 3).join(" | ")}`);
      console.log(`NOT published ${LANG_CODE}/${plan.module.id}: ${result.errors.slice(0, 5).join(" | ")}`);
    }
  }

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `FINAL published ${published.length}/${todoAreas}${published.length ? `: ${published.join(", ")}` : ""}\n` +
      `calls ${stats.calls} (retries ${stats.retries}, review calls ${stats.reviewCalls}) | accepted ${stats.accepted}, rejected ${stats.rejected}, ` +
      `review-gate rejections ${stats.reviewRejected}` +
      ` | tokens in ${fmt(stats.inputTokens)} out ${fmt(stats.outputTokens)} | ${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`,
  );
  if (fatal) console.error(`Stopped early: ${fatal} (progress is saved; rerun to continue)`);
  if (failures.length > 0) {
    console.log(`${failures.length} problem(s); progress is saved in ${PROGRESS_DIR}. Rerun the same command to continue.`);
    process.exitCode = 1;
  }
}

await main();
