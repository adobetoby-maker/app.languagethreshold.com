// Built by TAC — 2026-10-23
/**
 * Exams v2 item bank: types, the bank validator (design section 2, rules 1-10) and the bank hash.
 * Pure module: no server-only imports, no React. Validator issues never carry prompt or answer
 * text — only rule numbers, codes, item ids (when the id itself is valid), lessons and counts.
 */
import { normalizeAssessmentAnswer, type AnswerPolicy } from "../assessments/core.ts";
import { canonicalJson, sha256Hex } from "./hash.ts";

export const BANK_SCHEMA = 1;
export const LESSON_COUNT = 30;
export const ITEM_SKILLS = ["recognize", "recall", "use", "understand"] as const;
export const ITEM_TYPES = ["mc", "typed", "match"] as const;
export const DIFFICULTIES = [1, 2, 3] as const;
export const FIXED_FORM_KINDS = ["A", "B", "C"] as const;
export const EXAM_KINDS = ["A", "B", "C", "diagnostic"] as const;
export const VERDICTS = ["accept", "revise", "reject"] as const;

export type ItemSkill = (typeof ITEM_SKILLS)[number];
export type ItemType = (typeof ITEM_TYPES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type FixedFormKind = (typeof FIXED_FORM_KINDS)[number];
export type ExamKind = (typeof EXAM_KINDS)[number];
export type Verdict = (typeof VERDICTS)[number];

export interface BankPolicy {
  accents: "ignore" | "require";
  caseSensitive: false;
  punctuation: "ignore";
}
export interface BankOption {
  id: string;
  text: string;
  distractorRationale?: string;
}
export interface BankItem {
  /** `${module}.L07.i03`; never reused. Edits bump `rev`. */
  id: string;
  rev: number;
  lesson: number;
  skill: ItemSkill;
  difficulty: Difficulty;
  type: ItemType;
  prompt: string;
  context?: string;
  options?: BankOption[];
  correctOptionId?: string;
  /** typed: canonical answer first, then accepted variants. */
  accepted?: string[];
  policy?: BankPolicy;
  pairs?: { left: string; right: string }[];
  /** Shown after finishing A, B and the diagnostic; never for C. */
  explanation: string;
  sourceRefs: string[];
  author: string;
}
export interface BankLesson {
  lesson: number;
  title: string;
  sourceHash: string;
}
/** A group of consecutive lessons (a job phase). The diagnostic reports these first. */
export interface BankPhase {
  id: string;
  title: string;
  /** Consecutive lesson numbers, ascending. Every lesson 1-30 is in exactly one phase. */
  lessons: number[];
}
export interface BlindReview {
  reviewer: string;
  independentOfAuthor: true;
  at: string;
  bankSha256: string;
  verdicts: Record<string, Verdict>;
  notes: Record<string, string>;
}
export interface ExamBank {
  schema: 1;
  moduleId: string;
  targetLanguage: string;
  instructionLanguage: string;
  version: string;
  lessons: BankLesson[];
  phases: BankPhase[];
  items: BankItem[];
  forms: { A: string[]; B: string[]; C: string[] };
  diagnosticPool: string[];
  reviews: BlindReview[];
}

/** Fixed-form blueprints: which lessons, and exactly how many items per lesson. */
export const FORM_BLUEPRINTS: Record<FixedFormKind, { lessons: number; perLesson: number }> = {
  A: { lessons: 30, perLesson: 1 },
  B: { lessons: 15, perLesson: 2 },
  C: { lessons: 30, perLesson: 2 },
};
export const LIMITS = {
  promptMax: 300,
  contextMax: 300,
  explanationMin: 20,
  mcOptions: 4,
  matchPairs: 4,
  longestCorrectMaxShare: 0.4,
  acDifficultyMaxMeanDiff: 0.15,
  formMcMin: 0.5,
  formTypedMin: 0.2,
  formTypedMax: 0.35,
  formMatchMax: 0.15,
  poolPerLessonMin: 6,
  minReviews: 2,
  phasesMin: 3,
  phasesMax: 8,
  phaseLessonsMin: 3,
  phaseLessonsMax: 10,
  phaseTitleMax: 80,
} as const;

export interface BankIssue {
  /** Validator rule number from the design (1-10). */
  rule: number;
  code: string;
  /** Only set when the id itself is well formed, so issues never echo arbitrary text. */
  itemId?: string;
  /** Position in `items` when the id is not usable. */
  index?: number;
  lesson?: number;
  form?: string;
  /** Numbers only. */
  count?: number;
}
export interface BankValidation {
  ok: boolean;
  errors: BankIssue[];
  warnings: BankIssue[];
  counts: {
    items: number;
    lessons: number;
    phases: number;
    reviews: number;
    forms: Record<FixedFormKind, number>;
    diagnosticPool: number;
    byType: Record<ItemType, number>;
  };
}
export interface ValidateOptions {
  /** "skip" validates an unreviewed draft (rule 8 not enforced). Default "require". */
  reviews?: "require" | "skip";
  /** Current repo lesson hashes by lesson number; differences are rule-9 warnings. */
  currentSourceHashes?: Record<number, string>;
}

/** Loose normalization used for uniqueness and cueing checks: case, accents, punctuation ignored. */
export const LOOSE_POLICY: AnswerPolicy = {
  caseSensitive: false,
  accents: "ignore",
  punctuation: "ignore",
};
export const loose = (value: string) => normalizeAssessmentAnswer(value, LOOSE_POLICY);

/** The scoring policy for a typed item (accents ignored unless the author requires them). */
export function answerPolicy(item: Pick<BankItem, "policy">): AnswerPolicy {
  return {
    caseSensitive: false,
    accents: item.policy?.accents === "require" ? "required" : "ignore",
    punctuation: "ignore",
  };
}

/** True when `needle` occurs in `haystack` as a whole phrase after loose normalization. */
export function containsPhrase(haystack: string, needle: string): boolean {
  const n = loose(needle);
  if (!n) return false;
  return (" " + loose(haystack) + " ").includes(" " + n + " ");
}

/**
 * Hash over the canonical JSON of the bank without its `reviews`. Blind reviews sign this value,
 * the importer stores it as `exam_banks.content_sha256`, and the owner approves it.
 */
export function bankSha256(bank: Omit<ExamBank, "reviews"> & { reviews?: unknown }): string {
  return sha256Hex(canonicalJson(bankContent(bank)));
}
/** The bank as stored in `exam_banks.content`: everything except the reviews. */
export function bankContent<T extends { reviews?: unknown }>(bank: T): Omit<T, "reviews"> {
  const { reviews: _reviews, ...content } = bank;
  return content;
}

export function itemIdPattern(moduleId: string): RegExp {
  // moduleId is validated against ^[a-z][a-z0-9-]{0,79}$ first, so it has no regex specials.
  return new RegExp(`^${moduleId}\\.L(0[1-9]|[12][0-9]|30)\\.i[0-9]{2,3}$`);
}

/** Answers an item reveals if they appear elsewhere (mc correct text, typed accepted forms). */
export function itemAnswers(item: BankItem): string[] {
  if (item.type === "mc" && Array.isArray(item.options)) {
    const correct = item.options.find((option) => option?.id === item.correctOptionId);
    return typeof correct?.text === "string" ? [correct.text] : [];
  }
  if (item.type === "typed" && Array.isArray(item.accepted))
    return item.accepted.filter((a) => typeof a === "string");
  return [];
}

/** Everything an item shows a learner: prompt, context, option texts and both match columns. */
export function itemVisibleText(item: BankItem): string {
  const parts = [str(item.prompt), str(item.context)];
  if (Array.isArray(item.options)) for (const option of item.options) parts.push(str(option?.text));
  if (Array.isArray(item.pairs))
    for (const pair of item.pairs) parts.push(str(pair?.left), str(pair?.right));
  return parts.filter(Boolean).join(" \u0000 ");
}

/** Reviewer and author identities compare trimmed and case-insensitively. */
export const identity = (value: unknown) =>
  typeof value === "string" ? value.normalize("NFC").trim().toLocaleLowerCase() : "";

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isLesson = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= LESSON_COUNT;
const OPTION_ID = /^[A-Za-z0-9_-]{1,16}$/;
const ALL_NONE = [
  /\b(all|none|both|neither) of (the )?(above|these|them)\b/,
  /\b(todas|todos|ninguna|ninguno|ambas|ambos) (las |los )?(anteriores|de las anteriores|de los anteriores)\b/,
];
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Validate an untrusted bank (parsed JSON). Wrong types anywhere become issues; the validator
 * never throws on input shape.
 */
export function validateBank(input: unknown, options: ValidateOptions = {}): BankValidation {
  try {
    return validateBankUnsafe(input, options);
  } catch {
    // Defensive: any shape the checks below did not anticipate is reported, never thrown.
    return {
      ok: false,
      errors: [{ rule: 1, code: "bank.unreadable" }],
      warnings: [],
      counts: {
        items: 0,
        lessons: 0,
        phases: 0,
        reviews: 0,
        forms: { A: 0, B: 0, C: 0 },
        diagnosticPool: 0,
        byType: { mc: 0, typed: 0, match: 0 },
      },
    };
  }
}

function validateBankUnsafe(input: unknown, options: ValidateOptions): BankValidation {
  const errors: BankIssue[] = [];
  const warnings: BankIssue[] = [];
  const err = (issue: BankIssue) => errors.push(issue);
  const byType: Record<ItemType, number> = { mc: 0, typed: 0, match: 0 };
  const counts: BankValidation["counts"] = {
    items: 0,
    lessons: 0,
    phases: 0,
    reviews: 0,
    forms: { A: 0, B: 0, C: 0 },
    diagnosticPool: 0,
    byType,
  };
  const done = (): BankValidation => ({ ok: errors.length === 0, errors, warnings, counts });

  if (!isRecord(input)) {
    err({ rule: 1, code: "bank.not_object" });
    return done();
  }
  const bank = input as Record<string, unknown>;

  // ── Rule 1: bank-level structure ───────────────────────────────────────────
  if (bank.schema !== BANK_SCHEMA) err({ rule: 1, code: "bank.schema" });
  const moduleOk =
    typeof bank.moduleId === "string" && /^[a-z][a-z0-9-]{0,79}$/.test(bank.moduleId);
  if (!moduleOk) err({ rule: 1, code: "bank.module_id" });
  if (
    !isNonEmptyString(bank.targetLanguage) ||
    !/^[A-Za-z][A-Za-z -]{0,39}$/.test(bank.targetLanguage)
  )
    err({ rule: 1, code: "bank.target_language" });
  if (
    !isNonEmptyString(bank.instructionLanguage) ||
    !/^[A-Za-z][A-Za-z -]{0,39}$/.test(bank.instructionLanguage)
  )
    err({ rule: 1, code: "bank.instruction_language" });
  if (typeof bank.version !== "string" || !/^v[0-9]{1,4}$/.test(bank.version))
    err({ rule: 1, code: "bank.version" });

  const lessons = Array.isArray(bank.lessons) ? bank.lessons : null;
  if (!lessons) err({ rule: 1, code: "bank.lessons_missing" });
  else {
    const seen = new Set<number>();
    lessons.forEach((entry, index) => {
      if (
        !isRecord(entry) ||
        !isLesson(entry.lesson) ||
        !isNonEmptyString(entry.title) ||
        typeof entry.sourceHash !== "string" ||
        !HEX64.test(entry.sourceHash)
      ) {
        err({ rule: 1, code: "lesson.invalid", index });
        return;
      }
      if (seen.has(entry.lesson)) err({ rule: 1, code: "lesson.duplicate", lesson: entry.lesson });
      seen.add(entry.lesson);
    });
    counts.lessons = seen.size;
    if (seen.size !== LESSON_COUNT || lessons.length !== LESSON_COUNT)
      err({ rule: 1, code: "bank.lessons_count", count: lessons.length });
  }

  // ── Rule 1: phases (groups of consecutive lessons) ────────────────────────
  const phases = Array.isArray(bank.phases) ? bank.phases : null;
  if (!phases) err({ rule: 1, code: "bank.phases_missing" });
  else {
    counts.phases = phases.length;
    if (phases.length < LIMITS.phasesMin || phases.length > LIMITS.phasesMax)
      err({ rule: 1, code: "bank.phases_count", count: phases.length });
    const ids = new Set<string>();
    const covered = new Map<number, number>();
    let previousLast = 0;
    phases.forEach((phase, index) => {
      const p = (code: string, extra: Partial<BankIssue> = {}) =>
        err({ rule: 1, code, index, ...extra });
      if (!isRecord(phase)) return p("phase.not_object");
      if (typeof phase.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(phase.id)) p("phase.id");
      else if (ids.has(phase.id)) p("phase.id_duplicate");
      else ids.add(phase.id);
      if (!isNonEmptyString(phase.title) || phase.title.length > LIMITS.phaseTitleMax)
        p("phase.title");
      const list = Array.isArray(phase.lessons) ? phase.lessons : null;
      if (!list || !list.every(isLesson)) return p("phase.lessons");
      const numbers = list as number[];
      if (numbers.length < LIMITS.phaseLessonsMin || numbers.length > LIMITS.phaseLessonsMax)
        p("phase.size", { count: numbers.length });
      if (!numbers.every((lesson, i) => i === 0 || lesson === numbers[i - 1] + 1))
        p("phase.not_consecutive");
      else if (numbers.length && numbers[0] <= previousLast) p("phase.order");
      if (numbers.length) previousLast = Math.max(previousLast, numbers[numbers.length - 1]);
      for (const lesson of numbers) covered.set(lesson, (covered.get(lesson) ?? 0) + 1);
    });
    for (let lesson = 1; lesson <= LESSON_COUNT; lesson++) {
      const n = covered.get(lesson) ?? 0;
      if (n !== 1) err({ rule: 1, code: "phase.lesson_coverage", lesson, count: n });
    }
  }

  // ── Rules 1-4: items ───────────────────────────────────────────────────────
  const rawItems = Array.isArray(bank.items) ? bank.items : null;
  if (!rawItems) {
    err({ rule: 1, code: "bank.items_missing" });
    return done();
  }
  counts.items = rawItems.length;
  const idPattern = moduleOk ? itemIdPattern(bank.moduleId as string) : null;
  const items = new Map<string, BankItem>();
  let mcCount = 0;
  let longestCorrect = 0;

  rawItems.forEach((raw, index) => {
    if (!isRecord(raw)) {
      err({ rule: 1, code: "item.not_object", index });
      return;
    }
    const idOk = typeof raw.id === "string" && Boolean(idPattern?.test(raw.id));
    const at: Pick<BankIssue, "itemId" | "index"> = idOk ? { itemId: raw.id as string } : { index };
    const e = (rule: number, code: string, extra: Partial<BankIssue> = {}) =>
      err({ rule, code, ...at, ...extra });
    if (!idOk) e(1, "item.id_pattern");
    else if (items.has(raw.id as string)) e(1, "item.id_duplicate");
    if (!Number.isInteger(raw.rev) || (raw.rev as number) < 1) e(1, "item.rev");
    if (!isLesson(raw.lesson)) e(1, "item.lesson");
    else if (idOk && Number((raw.id as string).split(".L")[1]?.slice(0, 2)) !== raw.lesson)
      e(1, "item.id_lesson_mismatch");
    if (!ITEM_SKILLS.includes(raw.skill as ItemSkill)) e(1, "item.skill");
    if (!DIFFICULTIES.includes(raw.difficulty as Difficulty)) e(1, "item.difficulty");
    const type = raw.type as ItemType;
    if (!ITEM_TYPES.includes(type)) e(1, "item.type");
    if (!isNonEmptyString(raw.prompt) || raw.prompt.length > LIMITS.promptMax) e(1, "item.prompt");
    if (
      raw.context !== undefined &&
      (!isNonEmptyString(raw.context) || raw.context.length > LIMITS.contextMax)
    )
      e(1, "item.context");
    if (
      typeof raw.explanation !== "string" ||
      raw.explanation.trim().length < LIMITS.explanationMin
    )
      e(1, "item.explanation");
    if (
      !Array.isArray(raw.sourceRefs) ||
      raw.sourceRefs.length === 0 ||
      !raw.sourceRefs.every(isNonEmptyString)
    )
      e(1, "item.source_refs");
    if (!isNonEmptyString(raw.author)) e(1, "item.author");
    // Fields that belong to a different item type are a structure error (rule 1).
    const foreign: Record<ItemType, string[]> = {
      mc: ["accepted", "policy", "pairs"],
      typed: ["options", "correctOptionId", "pairs"],
      match: ["options", "correctOptionId", "accepted", "policy"],
    };
    if (ITEM_TYPES.includes(type) && foreign[type].some((key) => raw[key] !== undefined))
      e(1, "item.foreign_fields");

    const prompt = typeof raw.prompt === "string" ? raw.prompt : "";
    const context = typeof raw.context === "string" ? raw.context : "";

    if (type === "mc") {
      mcCount++;
      byType.mc++;
      const opts = Array.isArray(raw.options) ? raw.options : [];
      if (opts.length !== LIMITS.mcOptions) e(2, "mc.option_count", { count: opts.length });
      const valid = opts.every(
        (o) =>
          isRecord(o) &&
          typeof o.id === "string" &&
          OPTION_ID.test(o.id) &&
          isNonEmptyString(o.text),
      );
      if (!valid) e(2, "mc.option_shape");
      else {
        const options = opts as BankOption[];
        if (new Set(options.map((o) => o.id)).size !== options.length)
          e(2, "mc.option_id_duplicate");
        if (new Set(options.map((o) => loose(o.text))).size !== options.length)
          e(2, "mc.option_text_duplicate");
        const correct = options.filter((o) => o.id === raw.correctOptionId);
        if (correct.length !== 1) e(2, "mc.correct_count", { count: correct.length });
        for (const option of options)
          if (option.id !== raw.correctOptionId && !isNonEmptyString(option.distractorRationale))
            e(2, "mc.distractor_rationale_missing");
        if (options.some((o) => ALL_NONE.some((pattern) => pattern.test(loose(o.text)))))
          e(2, "mc.all_none_of_above");
        if (correct.length === 1) {
          const length = (text: string) => loose(text).length;
          const correctLength = length(correct[0].text);
          if (options.every((o) => o === correct[0] || length(o.text) < correctLength))
            longestCorrect++;
        }
      }
    } else if (type === "typed") {
      byType.typed++;
      const policyRaw = raw.policy;
      let policyOk = true;
      if (policyRaw !== undefined) {
        policyOk =
          isRecord(policyRaw) &&
          (policyRaw.accents === "ignore" || policyRaw.accents === "require") &&
          policyRaw.caseSensitive === false &&
          policyRaw.punctuation === "ignore" &&
          Object.keys(policyRaw).every((key) =>
            ["accents", "caseSensitive", "punctuation"].includes(key),
          );
        if (!policyOk) e(1, "typed.policy");
      }
      const accepted = Array.isArray(raw.accepted) ? raw.accepted : [];
      if (accepted.length === 0 || !accepted.every(isNonEmptyString))
        e(3, "typed.accepted_missing");
      else if (policyOk) {
        const policy = answerPolicy(raw as Pick<BankItem, "policy">);
        const normalized = (accepted as string[]).map((a) => normalizeAssessmentAnswer(a, policy));
        if (normalized.some((value) => !value)) e(3, "typed.accepted_empty");
        if (new Set(normalized).size !== normalized.length) e(3, "typed.accepted_duplicate");
        if ((accepted as string[]).some((a) => containsPhrase(prompt + " " + context, a)))
          e(3, "typed.answer_in_prompt");
        // `require` only makes sense when the accepted answer carries an accent.
        if (
          isRecord(policyRaw) &&
          policyRaw.accents === "require" &&
          !(accepted as string[]).some((a) => /\p{M}/u.test(a.normalize("NFD")))
        )
          e(3, "typed.require_without_accent");
      }
    } else if (type === "match") {
      byType.match++;
      const pairs = Array.isArray(raw.pairs) ? raw.pairs : [];
      if (pairs.length !== LIMITS.matchPairs) e(4, "match.pair_count", { count: pairs.length });
      if (!pairs.every((p) => isRecord(p) && isNonEmptyString(p.left) && isNonEmptyString(p.right)))
        e(4, "match.pair_shape");
      else {
        const typed = pairs as { left: string; right: string }[];
        if (new Set(typed.map((p) => loose(p.left))).size !== typed.length)
          e(4, "match.left_duplicate");
        if (new Set(typed.map((p) => loose(p.right))).size !== typed.length)
          e(4, "match.right_duplicate");
      }
    }
    if (idOk && !items.has(raw.id as string)) items.set(raw.id as string, safeItem(raw));
  });

  if (mcCount > 0 && longestCorrect / mcCount > LIMITS.longestCorrectMaxShare)
    err({ rule: 2, code: "mc.correct_longest_share", count: longestCorrect });

  // ── Rule 7: duplicate prompts across the bank ──────────────────────────────
  // Key = prompt + context; match items also include their pairs, since a generic instruction
  // ("Match each Spanish term to its meaning") legitimately repeats across match items.
  const promptKeys = new Map<string, string>();
  for (const item of items.values()) {
    if (!item.prompt) continue;
    let key = loose(item.prompt) + "\u0000" + loose(str(item.context));
    if (item.type === "match")
      key +=
        "\u0000" +
        (item.pairs ?? [])
          .map((p) => loose(p.left) + "=" + loose(p.right))
          .sort()
          .join("|");
    if (promptKeys.has(key)) err({ rule: 7, code: "item.prompt_duplicate", itemId: item.id });
    else promptKeys.set(key, item.id);
  }

  // ── Rule 5: fixed forms ─────────────────────────────────────────────────────
  const forms = isRecord(bank.forms) ? bank.forms : null;
  const formIds: Partial<Record<FixedFormKind | "diagnosticPool", string[]>> = {};
  const listOf = (value: unknown, form: string, rule: number): string[] | null => {
    if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
      err({ rule, code: "form.missing", form });
      return null;
    }
    const ids = value as string[];
    if (new Set(ids).size !== ids.length) err({ rule, code: "form.duplicate_id", form });
    ids.forEach((id) => {
      if (!items.has(id))
        err({
          rule,
          code: "form.unknown_item",
          form,
          ...(idPattern?.test(id) ? { itemId: id } : {}),
        });
    });
    return ids.filter((id) => items.has(id));
  };
  if (!forms) err({ rule: 5, code: "forms.missing" });
  for (const kind of FIXED_FORM_KINDS) {
    const ids = forms ? listOf(forms[kind], kind, 5) : null;
    if (!ids) continue;
    formIds[kind] = ids;
    counts.forms[kind] = ids.length;
    const blueprint = FORM_BLUEPRINTS[kind];
    const perLesson = new Map<number, number>();
    for (const id of ids) {
      const lesson = items.get(id)!.lesson;
      perLesson.set(lesson, (perLesson.get(lesson) ?? 0) + 1);
    }
    for (let lesson = 1; lesson <= LESSON_COUNT; lesson++) {
      const expected = lesson <= blueprint.lessons ? blueprint.perLesson : 0;
      const actual = perLesson.get(lesson) ?? 0;
      if (actual !== expected)
        err({ rule: 5, code: "form.blueprint", form: kind, lesson, count: actual });
    }
    const total = ids.length || 1;
    const share = (type: ItemType) =>
      ids.filter((id) => items.get(id)!.type === type).length / total;
    if (share("mc") < LIMITS.formMcMin) err({ rule: 5, code: "form.mix_mc", form: kind });
    if (share("typed") < LIMITS.formTypedMin || share("typed") > LIMITS.formTypedMax)
      err({ rule: 5, code: "form.mix_typed", form: kind });
    if (share("match") > LIMITS.formMatchMax) err({ rule: 5, code: "form.mix_match", form: kind });
    cueing(ids, kind, err);
  }

  // ── Rule 6: diagnostic pool ─────────────────────────────────────────────────
  const pool = listOf(bank.diagnosticPool, "diagnostic", 6);
  if (pool) {
    formIds.diagnosticPool = pool;
    counts.diagnosticPool = pool.length;
    for (let lesson = 1; lesson <= LESSON_COUNT; lesson++) {
      const inLesson = pool.map((id) => items.get(id)!).filter((item) => item.lesson === lesson);
      if (inLesson.length < LIMITS.poolPerLessonMin)
        err({ rule: 6, code: "pool.lesson_count", lesson, count: inLesson.length });
      for (const difficulty of DIFFICULTIES)
        if (!inLesson.some((item) => item.difficulty === difficulty))
          err({ rule: 6, code: "pool.difficulty_missing", lesson, count: difficulty });
      if (!inLesson.some((item) => item.type === "typed"))
        err({ rule: 6, code: "pool.typed_missing", lesson });
    }
    // Pool items are drawn together in one session; cueing there is a warning, not a block.
    cueing(pool, "diagnostic", (issue) => warnings.push(issue));
  }

  // ── Rule 5: disjoint sets and A/C difficulty match ─────────────────────────
  const owners = new Map<string, string>();
  for (const [name, ids] of Object.entries(formIds))
    for (const id of ids ?? []) {
      const previous = owners.get(id);
      if (previous && previous !== name)
        err({ rule: 5, code: "forms.overlap", itemId: id, form: `${previous}+${name}` });
      else owners.set(id, name);
    }
  if (formIds.A && formIds.C) {
    let total = 0;
    let lessonsCompared = 0;
    for (let lesson = 1; lesson <= LESSON_COUNT; lesson++) {
      const mean = (ids: string[]) => {
        const values = ids.map((id) => items.get(id)!).filter((item) => item.lesson === lesson);
        return values.length
          ? values.reduce((sum, item) => sum + item.difficulty, 0) / values.length
          : null;
      };
      const a = mean(formIds.A);
      const c = mean(formIds.C);
      if (a === null || c === null) continue;
      total += Math.abs(a - c);
      lessonsCompared++;
    }
    if (lessonsCompared && total / lessonsCompared > LIMITS.acDifficultyMaxMeanDiff)
      err({
        rule: 5,
        code: "forms.ac_difficulty",
        count: Math.round((total / lessonsCompared) * 100) / 100,
      });
  }

  // ── Rule 8: blind reviews ──────────────────────────────────────────────────
  const reviews = Array.isArray(bank.reviews) ? bank.reviews : null;
  counts.reviews = reviews?.length ?? 0;
  if (options.reviews !== "skip") {
    if (!reviews) err({ rule: 8, code: "reviews.missing" });
    else {
      let currentSha: string | null = null;
      try {
        currentSha = bankSha256(bank as unknown as ExamBank);
      } catch {
        err({ rule: 8, code: "reviews.unhashable" });
      }
      const reviewers = new Set<string>();
      reviews.forEach((review, index) => {
        const r = (code: string, extra: Partial<BankIssue> = {}) =>
          err({ rule: 8, code, index, ...extra });
        if (!isRecord(review)) return r("review.not_object");
        if (!isNonEmptyString(review.reviewer)) r("review.reviewer");
        else reviewers.add(identity(review.reviewer));
        if (review.independentOfAuthor !== true) r("review.not_independent");
        if (typeof review.at !== "string" || Number.isNaN(Date.parse(review.at))) r("review.at");
        if (review.bankSha256 !== currentSha) r("review.stale_sha");
        if (!isRecord(review.notes)) r("review.notes");
        if (!isRecord(review.verdicts)) return r("review.verdicts");
        const verdicts = review.verdicts;
        let missing = 0;
        for (const item of items.values()) {
          const verdict = verdicts[item.id];
          if (verdict === undefined) {
            missing++;
            continue;
          }
          if (!VERDICTS.includes(verdict as Verdict))
            r("review.verdict_invalid", { itemId: item.id });
          else if (verdict === "reject") r("review.rejected", { itemId: item.id });
          // A revise verdict on the current sha means the item still needs a new rev and a re-review.
          else if (verdict === "revise") r("review.revise_pending", { itemId: item.id });
          if (identity(item.author) && identity(item.author) === identity(review.reviewer))
            r("review.reviewer_is_author", { itemId: item.id });
        }
        if (missing) r("review.coverage", { count: missing });
        const unknown = Object.keys(verdicts).filter((id) => !items.has(id)).length;
        if (unknown) r("review.unknown_items", { count: unknown });
      });
      if (reviewers.size < LIMITS.minReviews)
        err({ rule: 8, code: "reviews.too_few", count: reviewers.size });
    }
  }

  // ── Rule 9: lesson drift (warning only) ────────────────────────────────────
  if (options.currentSourceHashes && lessons) {
    for (const entry of lessons) {
      if (!isRecord(entry) || !isLesson(entry.lesson)) continue;
      const current = options.currentSourceHashes[entry.lesson];
      if (current === undefined)
        warnings.push({ rule: 9, code: "drift.lesson_missing", lesson: entry.lesson });
      else if (current !== entry.sourceHash)
        warnings.push({ rule: 9, code: "drift.source_changed", lesson: entry.lesson });
    }
  }

  return done();

  function cueing(ids: string[], form: string, report: (issue: BankIssue) => void) {
    // An item cues another when its answer shows anywhere the other item is visible: prompt,
    // context, multiple-choice options or match columns. A match item is cued when one of its
    // pairs (left and right) shows together in another item.
    const list = ids.map((id) => items.get(id)!);
    const visible = list.map((entry) => " " + loose(itemVisibleText(entry)) + " ");
    const has = (j: number, phrase: string) =>
      Boolean(phrase) && visible[j].includes(" " + phrase + " ");
    list.forEach((source, i) => {
      const answers = itemAnswers(source).map(loose).filter(Boolean);
      const pairs =
        source.type === "match"
          ? (source.pairs ?? []).map((p) => [loose(p.left), loose(p.right)] as const)
          : [];
      if (!answers.length && !pairs.length) return;
      const cued = list.some(
        (_, j) =>
          j !== i &&
          (answers.some((answer) => has(j, answer)) ||
            pairs.some(([left, right]) => has(j, left) && has(j, right))),
      );
      if (cued) report({ rule: 5, code: "form.cueing", form, itemId: source.id });
    });
  }
}

/** A type-safe copy of a raw item for the cross-item checks: wrong types become empty values. */
function safeItem(raw: Record<string, unknown>): BankItem {
  const options = Array.isArray(raw.options)
    ? raw.options.filter(isRecord).map((o) => ({ id: str(o.id), text: str(o.text) }))
    : undefined;
  const pairs = Array.isArray(raw.pairs)
    ? raw.pairs.filter(isRecord).map((p) => ({ left: str(p.left), right: str(p.right) }))
    : undefined;
  return {
    id: str(raw.id),
    rev: Number.isInteger(raw.rev) ? (raw.rev as number) : 0,
    lesson: isLesson(raw.lesson) ? raw.lesson : 0,
    skill: raw.skill as ItemSkill,
    difficulty: (DIFFICULTIES.includes(raw.difficulty as Difficulty)
      ? raw.difficulty
      : 0) as Difficulty,
    type: raw.type as ItemType,
    prompt: str(raw.prompt),
    context: typeof raw.context === "string" ? raw.context : undefined,
    options,
    correctOptionId: str(raw.correctOptionId),
    accepted: Array.isArray(raw.accepted) ? raw.accepted.filter(isNonEmptyString) : undefined,
    pairs,
    explanation: str(raw.explanation),
    sourceRefs: Array.isArray(raw.sourceRefs) ? raw.sourceRefs.filter(isNonEmptyString) : [],
    author: str(raw.author),
  };
}

/** Items of a fixed form in their frozen order. Throws on an unknown id. */
export function formItems(bank: ExamBank, kind: FixedFormKind): BankItem[] {
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  return bank.forms[kind].map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`Form ${kind} references an unknown item.`);
    return item;
  });
}

export function lessonTitle(bank: Pick<ExamBank, "lessons">, lesson: number): string {
  return bank.lessons.find((entry) => entry.lesson === lesson)?.title ?? `Lesson ${lesson}`;
}
