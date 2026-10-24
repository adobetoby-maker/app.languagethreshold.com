// Built by TAC — 2026-10-23
/**
 * Exams v2 server: the learner API behind /api/exam-check and the owner bank-approval API behind
 * /api/exam-bank (design sections 3-5, tickets T6/T7).
 *
 * Server-only. The only module that turns private bank content into responses. Rules it keeps:
 * - Nothing that reveals an answer (correct option, accepted answers, distractor rationales,
 *   explanations, match pairing) leaves before a session is completed. Form C never reveals any
 *   item-level data, even after completion: only `publicFixedFormResult`.
 * - Client-facing shapes never reuse the bank's private key names, so the bundle privacy check
 *   (scripts/verify-vercel-artifact.mjs) can treat those names as a leak signal.
 * - No item content is logged, and errors carry fixed messages only.
 * - Raw IPs are never stored: public sessions keep an HMAC of the IP under a server salt.
 * All storage goes through the service-role client passed in by the route; nothing here reads
 * process.env directly except through the `env` dependency.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { PrivateJsonRequestError, readPrivateJson } from "../private-json-request.ts";
import { readPrivateServiceJson } from "../private-service-json.ts";
import {
  answerPolicy,
  bankSha256,
  FIXED_FORM_KINDS,
  validateBank,
  type BankIssue,
  type BankItem,
  type ExamBank,
  type ExamKind,
  type FixedFormKind,
} from "./bank.ts";
import {
  buildDiagnosticResult,
  DIAGNOSTIC_LENGTH,
  diagnosticPool,
  nextDiagnosticItem,
  type DiagnosticPool,
  type DiagnosticResponse,
  type DiagnosticResult,
} from "./adaptive.ts";
import { completedItemReview, publicItem, type PublicItem } from "./public-item.ts";
import {
  publicFixedFormResult,
  scoreFixedForm,
  scoreItem,
  type ExamAnswer,
  type FixedFormResult,
} from "./scoring.ts";

// ── Errors and responses ─────────────────────────────────────────────────────

export type ExamErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 413 | 429 | 499 | 503;
/** Fixed, learner-safe guidance. Never built from request bodies, rows or bank content. */
export class ExamApiError extends Error {
  constructor(
    readonly status: ExamErrorStatus,
    message: string,
    readonly code = "exam_error",
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const EXAMS_NOT_READY = "Exams are being set up. Please try again later.";
const UNAVAILABLE = "Exams are unavailable right now. Please try again.";
const NOT_FOUND = "We couldn't find that exam session.";

export function examJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
export function examErrorResponse(error: unknown) {
  if (error instanceof ExamApiError)
    return examJson({ error: error.message, code: error.code, ...error.extra }, error.status);
  if (error instanceof PrivateJsonRequestError)
    return examJson(
      {
        error:
          error.status === 413
            ? "This exam request is too large."
            : error.status === 408
              ? "The request took too long. Please try again."
              : "Check your exam request and try again.",
        code: "bad_request",
      },
      error.status,
    );
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return examJson({ error: "Check your exam request and try again.", code: "bad_request" }, 400);
  return examJson({ error: UNAVAILABLE, code: "unavailable" }, 503);
}

// ── Environment ──────────────────────────────────────────────────────────────

export type ExamEnv = Record<string, string | undefined>;
const on = (value: string | undefined) => value === "1" || value === "true";
/** Kill switch for the whole learner API (default off until go-live, ticket T12). */
export const examsV2Enabled = (env: ExamEnv) => on(env.LT_EXAMS_V2);
/** Kill switch for anonymous diagnostic sessions (default off). */
export const examsPublicEnabled = (env: ExamEnv) => on(env.LT_EXAMS_PUBLIC);

/** Salted IP hash: HMAC-SHA256 under LT_EXAMS_IP_SALT, or a salt derived from the service key. */
export function hashClientIp(ip: string, env: ExamEnv): string {
  const salt =
    env.LT_EXAMS_IP_SALT?.trim() ||
    (env.SUPABASE_SERVICE_ROLE_KEY
      ? createHash("sha256")
          .update("language-threshold:exams2:ip-salt:v1:" + env.SUPABASE_SERVICE_ROLE_KEY)
          .digest("hex")
      : "");
  if (!salt) throw new ExamApiError(503, UNAVAILABLE, "unavailable");
  return createHmac("sha256", salt)
    .update("exams2-ip:v1:" + ip)
    .digest("hex");
}

/** Vercel's canonical client IP header; caller-supplied forwarding headers are not trusted. */
export function trustedExamClientIp(request: Request, env: ExamEnv): string | null {
  const first = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (first && isIP(first)) return first;
  const host = new URL(request.url).hostname;
  return env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(host)
    ? "local-development"
    : null;
}

/** Same-origin only: a cross-site Origin or Sec-Fetch-Site is refused. */
export function examOriginDenied(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return Boolean(
    (origin && origin !== new URL(request.url).origin) ||
    (site && site !== "same-origin" && site !== "none"),
  );
}

/** Service-role fetch with a deadline and a response cap sized for bank content. */
export function examServiceFetch(
  incoming: AbortSignal,
  maxBytes = 16 * 1024 * 1024,
  fetcher: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const signal = AbortSignal.any([
      incoming,
      AbortSignal.timeout(15000),
      ...(init?.signal ? [init.signal] : []),
    ]);
    signal.throwIfAborted();
    const response = await fetcher(input, {
      ...init,
      signal,
      cache: "no-store",
      redirect: "error",
    });
    try {
      const data = await readPrivateServiceJson(response, maxBytes, signal, true);
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      return new Response(data === null ? null : JSON.stringify(data), {
        status: response.status,
        headers,
      });
    } catch (error) {
      void response.body?.cancel().catch(() => {});
      throw error;
    }
  };
}

// ── Storage ──────────────────────────────────────────────────────────────────

/** The parts of the supabase-js query builder this module uses (service-role client). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExamDb = { from(table: string): any };
type DbResult<T> = { data: T; error: { code?: string; message?: string } | null; count?: number };

const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01", "PGRST204"]);
function storageError(error: { code?: string; message?: string }): ExamApiError {
  const message = String(error.message ?? "");
  if (
    MISSING_TABLE_CODES.has(String(error.code ?? "")) ||
    /exam_(banks|sessions)/.test(message) ||
    /does not exist|schema cache/i.test(message)
  )
    return new ExamApiError(503, EXAMS_NOT_READY, "exams_not_ready");
  return new ExamApiError(503, UNAVAILABLE, "unavailable");
}
async function run<T>(query: PromiseLike<DbResult<T>>): Promise<DbResult<T>> {
  const result = await query;
  if (result.error) throw storageError(result.error);
  return result;
}
const isUniqueViolation = (error: { code?: string } | null) => error?.code === "23505";

export interface SessionRow {
  id: string;
  module_id: string;
  target_language: string;
  instruction_language: string;
  bank_version: string;
  kind: ExamKind;
  user_id: string | null;
  organization_id: string | null;
  public_secret_hash: string | null;
  seed: string;
  step: number;
  served: string[];
  responses: StoredResponse[];
  result: unknown;
  score: number | null;
  total: number | null;
  status: "in_progress" | "completed" | "abandoned";
  ip_hash: string | null;
  started_at: string;
  completed_at: string | null;
}
/** Diagnostic responses carry `y`; fixed-form responses carry only the answer. */
export interface StoredResponse {
  itemId: string;
  answer: ExamAnswer | null;
  y?: number;
  dontKnow?: true;
  requestId?: string;
}
const SESSION_COLUMNS =
  "id,module_id,target_language,instruction_language,bank_version,kind,user_id,organization_id,public_secret_hash,seed,step,served,responses,result,score,total,status,ip_hash,started_at,completed_at";

// ── Bank loading (in-memory cache keyed by content_sha256) ──────────────────

export interface LoadedBank {
  sha: string;
  bank: ExamBank;
  pool: DiagnosticPool;
  items: Map<string, BankItem>;
}
const BANK_CACHE_LIMIT = 8;
const bankCache = new Map<string, LoadedBank>();
export function clearExamBankCache() {
  bankCache.clear();
}

interface BankKey {
  moduleId: string;
  target: string;
  native: string;
}
interface BankMetaRow {
  version: string;
  status: string;
  content_sha256: string;
  approved_sha256: string | null;
}

async function loadBankContent(db: ExamDb, key: BankKey, meta: BankMetaRow): Promise<LoadedBank> {
  // Only banks that went through owner approval (approved, or retired after approval) are served.
  if (
    !["approved", "retired"].includes(meta.status) ||
    !meta.approved_sha256 ||
    meta.approved_sha256 !== meta.content_sha256
  )
    throw new ExamApiError(503, "This exam is being updated. Please try again later.", "bank");
  const cached = bankCache.get(meta.content_sha256);
  if (cached) return cached;
  const { data } = await run<{ content: unknown } | null>(
    db
      .from("exam_banks")
      .select("content")
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("version", meta.version)
      .maybeSingle(),
  );
  const content = data?.content as ExamBank | undefined;
  let ok = false;
  try {
    ok =
      Boolean(content) &&
      bankSha256(content as ExamBank) === meta.content_sha256 &&
      content!.moduleId === key.moduleId &&
      content!.targetLanguage === key.target &&
      content!.instructionLanguage === key.native &&
      content!.version === meta.version &&
      validateBank(content, { reviews: "skip" }).ok;
  } catch {
    ok = false;
  }
  if (!ok)
    throw new ExamApiError(503, "This exam is being updated. Please try again later.", "bank");
  const bank = content as ExamBank;
  const loaded: LoadedBank = {
    sha: meta.content_sha256,
    bank,
    pool: diagnosticPool(bank),
    items: new Map(bank.items.map((item) => [item.id, item])),
  };
  if (bankCache.size >= BANK_CACHE_LIMIT) bankCache.delete(bankCache.keys().next().value!);
  bankCache.set(loaded.sha, loaded);
  return loaded;
}

async function loadApprovedBank(db: ExamDb, key: BankKey): Promise<LoadedBank> {
  const { data } = await run<BankMetaRow | null>(
    db
      .from("exam_banks")
      .select("version,status,content_sha256,approved_sha256")
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("status", "approved")
      .maybeSingle(),
  );
  if (!data) throw new ExamApiError(404, "This exam isn't available yet.", "no_bank");
  return loadBankContent(db, key, data);
}

async function loadSessionBank(db: ExamDb, session: SessionRow): Promise<LoadedBank> {
  const key = {
    moduleId: session.module_id,
    target: session.target_language,
    native: session.instruction_language,
  };
  const { data } = await run<BankMetaRow | null>(
    db
      .from("exam_banks")
      .select("version,status,content_sha256,approved_sha256")
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("version", session.bank_version)
      .maybeSingle(),
  );
  if (!data)
    throw new ExamApiError(503, "This exam is being updated. Please try again later.", "bank");
  return loadBankContent(db, key, data);
}

// ── Request schemas ──────────────────────────────────────────────────────────

const moduleIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const languageSchema = z.string().regex(/^[A-Za-z][A-Za-z -]{0,39}$/);
const sessionIdSchema = z.uuid();
/** 32 random bytes, base64url without padding. */
const secretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const requestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const itemIdSchema = z.string().min(1).max(100);
export const examAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mc"), optionId: z.string().min(1).max(32) }).strict(),
  z.object({ type: z.literal("typed"), text: z.string().max(500) }).strict(),
  z
    .object({
      type: z.literal("match"),
      matches: z
        .record(z.string().max(300), z.string().max(300))
        .refine((value) => Object.keys(value).length <= 8),
    })
    .strict(),
  z.object({ type: z.literal("dont_know") }).strict(),
]);
const savedAnswers = z
  .array(z.object({ itemId: itemIdSchema, answer: examAnswerSchema.nullable() }).strict())
  .max(60);

export const examCheckAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("start"),
      moduleId: moduleIdSchema,
      kind: z.enum(["A", "B", "C", "diagnostic"]),
      public: z.boolean().optional(),
      target: languageSchema.default("Spanish"),
      native: languageSchema.default("English"),
    })
    .strict(),
  z
    .object({
      action: z.literal("resume"),
      sessionId: sessionIdSchema,
      secret: secretSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("answer"),
      sessionId: sessionIdSchema,
      step: z
        .number()
        .int()
        .min(0)
        .max(DIAGNOSTIC_LENGTH - 1),
      itemId: itemIdSchema,
      answer: examAnswerSchema,
      requestId: requestIdSchema,
      secret: secretSchema.optional(),
    })
    .strict(),
  z
    .object({ action: z.literal("save"), sessionId: sessionIdSchema, answers: savedAnswers })
    .strict(),
  z
    .object({
      action: z.literal("submit"),
      sessionId: sessionIdSchema,
      answers: savedAnswers.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("result"),
      sessionId: sessionIdSchema,
      secret: secretSchema.optional(),
    })
    .strict(),
  z
    .object({ action: z.literal("claim"), sessionId: sessionIdSchema, secret: secretSchema })
    .strict(),
]);
export type ExamCheckAction = z.infer<typeof examCheckAction>;

// ── Learner API (/api/exam-check) ────────────────────────────────────────────

export interface ExamUser {
  id: string;
}
export interface ExamCheckDeps {
  db: ExamDb;
  env: ExamEnv;
  /** null when the request carries no Authorization header; throws ExamApiError when invalid. */
  authenticate(): Promise<ExamUser | null>;
  /** Shared server request budget (consume_speaking_request). Window is at most 3600 s. */
  budget(namespace: string, value: string, limit: number, windowSeconds: number): Promise<boolean>;
  clientIp: string | null;
  now?: () => Date;
  random?: (bytes: number) => Uint8Array;
}

export const EXAM_LIMITS = {
  /** Public starts per IP per hour, per IP per 24 hours, and across the site per hour. */
  publicStartsPerIpHour: 5,
  publicStartsPerIpDay: 20,
  publicStartsGlobalHour: 500,
  /** Answers (and fixed-form saves) per session per minute. */
  writesPerSessionMinute: 120,
  /** Anonymous sessions can be resumed for 24 hours. */
  publicResumeHours: 24,
  /** Form B retake cooldown (design section 3). C has none (owner decision); A is taken once. */
  bRetakeCooldownMs: 60 * 60 * 1000,
  maxRequestBytes: 64 * 1024,
} as const;

/** Full request handler: kill switch, same-origin, body limits, then the action. */
export async function examCheckResponse(request: Request, deps: ExamCheckDeps): Promise<Response> {
  if (!examsV2Enabled(deps.env)) {
    void request.body?.cancel().catch(() => {});
    return examJson({ error: "Exams aren't available yet.", code: "disabled" }, 404);
  }
  if (examOriginDenied(request) || !request.headers.get("origin")) {
    void request.body?.cancel().catch(() => {});
    return examJson({ error: "Open the exam from the app to continue.", code: "origin" }, 403);
  }
  try {
    const body = examCheckAction.parse(await readPrivateJson(request, EXAM_LIMITS.maxRequestBytes));
    return examJson(await handleExamCheck(body, deps));
  } catch (error) {
    return examErrorResponse(error);
  }
}

export async function handleExamCheck(input: ExamCheckAction, deps: ExamCheckDeps) {
  switch (input.action) {
    case "start":
      return startSession(input, deps);
    case "resume":
      return resumeSession(input, deps);
    case "answer":
      return answerDiagnostic(input, deps);
    case "save":
      return saveFixedForm(input, deps, false);
    case "submit":
      return saveFixedForm(input, deps, true);
    case "result":
      return sessionResult(input, deps);
    case "claim":
      return claimSession(input, deps);
  }
}

const nowOf = (deps: ExamCheckDeps) => (deps.now ? deps.now() : new Date());
const randomOf = (deps: ExamCheckDeps, n: number) =>
  deps.random ? deps.random(n) : new Uint8Array(randomBytes(n));
const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");
function secretMatches(secret: string | undefined, hash: string | null) {
  if (!secret || !hash) return false;
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
const linkOf = (session: Pick<SessionRow, "target_language" | "instruction_language">) => ({
  target: session.target_language,
  native: session.instruction_language,
});

async function requireUser(deps: ExamCheckDeps, message = "Sign in to take this exam.") {
  const user = await deps.authenticate();
  if (!user) throw new ExamApiError(401, message, "sign_in");
  return user;
}

async function readSession(db: ExamDb, id: string): Promise<SessionRow | null> {
  const { data } = await run<SessionRow | null>(
    db.from("exam_sessions").select(SESSION_COLUMNS).eq("id", id).maybeSingle(),
  );
  return data;
}

/** Load a session the caller may use: its signed-in owner, or the holder of its public secret. */
async function ownedSession(
  deps: ExamCheckDeps,
  sessionId: string,
  secret: string | undefined,
): Promise<SessionRow> {
  const session = await readSession(deps.db, sessionId);
  if (!session) throw new ExamApiError(404, NOT_FOUND, "not_found");
  if (secret && secretMatches(secret, session.public_secret_hash)) return session;
  if (session.user_id) {
    const user = await deps.authenticate();
    if (user && user.id === session.user_id) return session;
  }
  // Same answer for "missing" and "not yours", so session ids cannot be probed.
  throw new ExamApiError(404, NOT_FOUND, "not_found");
}

function requireFresh(session: SessionRow, deps: ExamCheckDeps) {
  if (
    session.status === "in_progress" &&
    !session.user_id &&
    nowOf(deps).getTime() - Date.parse(session.started_at) >
      EXAM_LIMITS.publicResumeHours * 3600 * 1000
  )
    throw new ExamApiError(410, "This check expired. Start a new one.", "expired");
}

async function sessionBudget(deps: ExamCheckDeps, session: SessionRow) {
  const allowed = await deps.budget(
    "exams2:session-writes",
    session.id,
    EXAM_LIMITS.writesPerSessionMinute,
    60,
  );
  if (!allowed)
    throw new ExamApiError(429, "You're answering very fast. Wait a moment and try again.", "rate");
}

function fixedFormItems(loaded: LoadedBank, kind: FixedFormKind): BankItem[] {
  return loaded.bank.forms[kind].map((id) => loaded.items.get(id)!);
}

/** What a learner sees of an open or finished session. Never answer data. */
export function sessionView(session: SessionRow, loaded: LoadedBank) {
  const base = {
    sessionId: session.id,
    kind: session.kind,
    moduleId: session.module_id,
    target: session.target_language,
    native: session.instruction_language,
    bankVersion: session.bank_version,
    status: session.status,
    startedAt: session.started_at,
  };
  if (session.kind === "diagnostic") {
    const current = session.status === "in_progress" ? session.served[session.step] : undefined;
    const item = current ? loaded.items.get(current) : undefined;
    return {
      ...base,
      step: session.step,
      total: DIAGNOSTIC_LENGTH,
      item: item ? publicItem(item, { seed: session.seed }) : null,
    };
  }
  const items = fixedFormItems(loaded, session.kind as FixedFormKind);
  const answers: Record<string, ExamAnswer | null> = {};
  for (const response of session.responses ?? []) answers[response.itemId] = response.answer;
  return {
    ...base,
    total: items.length,
    items:
      session.status === "in_progress"
        ? items.map((item) => publicItem(item, { seed: session.seed }))
        : [],
    answers: session.status === "in_progress" ? answers : {},
  };
}

async function startSession(
  input: Extract<ExamCheckAction, { action: "start" }>,
  deps: ExamCheckDeps,
) {
  const key = { moduleId: input.moduleId, target: input.target, native: input.native };
  const now = nowOf(deps);
  let user: ExamUser | null = null;
  let ipHash: string | null = null;
  if (input.public) {
    if (input.kind !== "diagnostic")
      throw new ExamApiError(
        400,
        "Only the Spanish Check can be taken without an account.",
        "public_kind",
      );
    if (!examsPublicEnabled(deps.env))
      throw new ExamApiError(404, "The public Spanish Check isn't open yet.", "public_disabled");
    if (!deps.clientIp) throw new ExamApiError(503, UNAVAILABLE, "unavailable");
    ipHash = hashClientIp(deps.clientIp, deps.env);
    const busy = () =>
      new ExamApiError(
        429,
        "Too many checks were started from this connection. Try again later.",
        "rate",
      );
    // The day limit counts this IP's sessions in exam_sessions (the shared budget RPC caps
    // windows at one hour); the hourly limits use the shared budget.
    const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const { count } = await run<unknown>(
      deps.db
        .from("exam_sessions")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("started_at", since),
    );
    if ((count ?? 0) >= EXAM_LIMITS.publicStartsPerIpDay) throw busy();
    if (
      !(await deps.budget(
        "exams2:public-start:ip",
        deps.clientIp,
        EXAM_LIMITS.publicStartsPerIpHour,
        3600,
      ))
    )
      throw busy();
    if (
      !(await deps.budget(
        "exams2:public-start:global",
        "all",
        EXAM_LIMITS.publicStartsGlobalHour,
        3600,
      ))
    )
      throw new ExamApiError(
        429,
        "The Spanish Check is very busy right now. Try again in a little while.",
        "rate",
      );
  } else {
    user = await requireUser(deps);
  }

  const loaded = await loadApprovedBank(deps.db, key);

  if (user) {
    const open = await findOpenSession(deps.db, user.id, key, input.kind);
    if (open) {
      if (open.bank_version === loaded.bank.version)
        return { ...sessionView(open, loaded), resumed: true };
      // The approved version changed under an open session: close it and start fresh.
      await run(
        deps.db
          .from("exam_sessions")
          .update({ status: "abandoned" })
          .eq("id", open.id)
          .eq("status", "in_progress")
          .select("id"),
      );
    }
    await retakePolicy(deps.db, user.id, key, input.kind, now);
  }

  const seed = toHex(randomOf(deps, 16));
  const secret = input.public ? Buffer.from(randomOf(deps, 32)).toString("base64url") : null;
  const first =
    input.kind === "diagnostic" ? nextDiagnosticItem(loaded.pool, seed, [])?.itemId : null;
  const row = {
    module_id: key.moduleId,
    target_language: key.target,
    instruction_language: key.native,
    bank_version: loaded.bank.version,
    kind: input.kind,
    user_id: user?.id ?? null,
    public_secret_hash: secret ? hashSecret(secret) : null,
    seed,
    step: 0,
    served: first ? [first] : [],
    responses: [],
    status: "in_progress",
    ip_hash: ipHash,
    started_at: now.toISOString(),
  };
  const inserted = (await deps.db
    .from("exam_sessions")
    .insert(row)
    .select(SESSION_COLUMNS)
    .single()) as DbResult<SessionRow | null>;
  if (inserted.error) {
    // A parallel start won the one-open-session index: hand back that session.
    if (user && isUniqueViolation(inserted.error)) {
      const open = await findOpenSession(deps.db, user.id, key, input.kind);
      if (open) return { ...sessionView(open, loaded), resumed: true };
    }
    throw storageError(inserted.error);
  }
  const session = inserted.data!;
  return { ...sessionView(session, loaded), resumed: false, ...(secret ? { secret } : {}) };
}

async function findOpenSession(
  db: ExamDb,
  userId: string,
  key: BankKey,
  kind: ExamKind,
): Promise<SessionRow | null> {
  const { data } = await run<SessionRow[] | null>(
    db
      .from("exam_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", userId)
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("kind", kind)
      .eq("status", "in_progress")
      .limit(1),
  );
  return data?.[0] ?? null;
}

/** A once; B after a 1-hour cooldown; C and the diagnostic unlimited with no cooldown. */
async function retakePolicy(db: ExamDb, userId: string, key: BankKey, kind: ExamKind, now: Date) {
  if (kind !== "A" && kind !== "B") return;
  const { data } = await run<{ completed_at: string }[] | null>(
    db
      .from("exam_sessions")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("kind", kind)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1),
  );
  const last = data?.[0];
  if (!last) return;
  if (kind === "A")
    throw new ExamApiError(409, "You've already taken the baseline test.", "already_taken");
  const wait = Date.parse(last.completed_at) + EXAM_LIMITS.bRetakeCooldownMs - now.getTime();
  if (wait > 0)
    throw new ExamApiError(
      429,
      "You can retake the midpoint test one hour after your last attempt.",
      "cooldown",
      { retryAfterSeconds: Math.ceil(wait / 1000) },
    );
}

async function resumeSession(
  input: Extract<ExamCheckAction, { action: "resume" }>,
  deps: ExamCheckDeps,
) {
  const session = await ownedSession(deps, input.sessionId, input.secret);
  requireFresh(session, deps);
  const loaded = await loadSessionBank(deps.db, session);
  return sessionView(session, loaded);
}

async function answerDiagnostic(
  input: Extract<ExamCheckAction, { action: "answer" }>,
  deps: ExamCheckDeps,
) {
  const session = await ownedSession(deps, input.sessionId, input.secret);
  if (session.kind !== "diagnostic")
    throw new ExamApiError(400, "Save answers to this test instead.", "wrong_kind");
  const loaded = await loadSessionBank(deps.db, session);
  // Repeating a request id is harmless: return where the session is now.
  if ((session.responses ?? []).some((response) => response.requestId === input.requestId))
    return { ...sessionView(session, loaded), repeated: true };
  if (session.status !== "in_progress")
    throw new ExamApiError(409, "This check is already finished.", "finished");
  requireFresh(session, deps);
  if (input.step !== session.step)
    throw new ExamApiError(409, "This question was already answered.", "step_mismatch", {
      step: session.step,
    });
  if (session.served[session.step] !== input.itemId)
    throw new ExamApiError(409, "That isn't the current question.", "item_mismatch", {
      step: session.step,
    });
  await sessionBudget(deps, session);

  const item = loaded.items.get(input.itemId)!;
  const scored = scoreItem(item, input.answer as ExamAnswer, session.seed);
  const response: StoredResponse = {
    itemId: item.id,
    answer: input.answer as ExamAnswer,
    y: scored.points,
    requestId: input.requestId,
    ...(scored.dontKnow ? { dontKnow: true as const } : {}),
  };
  const responses = [...(session.responses ?? []), response];
  const engine: DiagnosticResponse[] = responses.map((r) => ({
    itemId: r.itemId,
    y: r.y ?? 0,
    ...(r.dontKnow ? { dontKnow: true } : {}),
  }));
  const next = nextDiagnosticItem(loaded.pool, session.seed, engine);
  const step = session.step + 1;
  const patch: Record<string, unknown> = {
    step,
    responses,
    served: next ? [...session.served, next.itemId] : session.served,
  };
  if (!next) {
    const result = buildDiagnosticResult(loaded.pool, engine, linkOf(session));
    patch.status = "completed";
    patch.completed_at = nowOf(deps).toISOString();
    patch.result = result;
    patch.score = Math.round(engine.reduce((sum, r) => sum + r.y, 0) * 100) / 100;
    patch.total = DIAGNOSTIC_LENGTH;
  }
  const { data } = await run<{ id: string }[] | null>(
    deps.db
      .from("exam_sessions")
      .update(patch)
      .eq("id", session.id)
      .eq("step", session.step)
      .eq("status", "in_progress")
      .select("id"),
  );
  if (!data?.length) {
    // Another request moved the session first. A retry of the same request is fine.
    const current = await readSession(deps.db, session.id);
    if (current?.responses?.some((r) => r.requestId === input.requestId))
      return { ...sessionView(current, loaded), repeated: true };
    throw new ExamApiError(409, "This question was already answered.", "step_mismatch", {
      step: current?.step ?? session.step,
    });
  }
  return sessionView({ ...session, ...patch } as SessionRow, loaded);
}

async function saveFixedForm(
  input:
    Extract<ExamCheckAction, { action: "save" }> | Extract<ExamCheckAction, { action: "submit" }>,
  deps: ExamCheckDeps,
  submit: boolean,
) {
  const session = await ownedSession(deps, input.sessionId, undefined);
  if (session.kind === "diagnostic")
    throw new ExamApiError(400, "Answer the Spanish Check one question at a time.", "wrong_kind");
  const loaded = await loadSessionBank(deps.db, session);
  const kind = session.kind as FixedFormKind;
  if (session.status === "completed") {
    if (submit) return completedResult(session, loaded);
    throw new ExamApiError(409, "This test is already submitted.", "finished");
  }
  if (session.status !== "in_progress")
    throw new ExamApiError(409, "This test was closed. Start it again.", "closed");
  const form = loaded.bank.forms[kind];
  const onForm = new Set(form);
  const merged = new Map<string, ExamAnswer | null>();
  for (const response of session.responses ?? []) merged.set(response.itemId, response.answer);
  for (const entry of input.answers ?? []) {
    if (!onForm.has(entry.itemId))
      throw new ExamApiError(400, "Check your exam request and try again.", "unknown_item");
    merged.set(entry.itemId, entry.answer as ExamAnswer | null);
  }
  await sessionBudget(deps, session);
  const responses: StoredResponse[] = form
    .filter((id) => merged.has(id))
    .map((id) => ({ itemId: id, answer: merged.get(id) ?? null }));
  const patch: Record<string, unknown> = { responses };
  let result: FixedFormResult | null = null;
  if (submit) {
    result = scoreFixedForm(
      loaded.bank,
      kind,
      responses.map((r) => ({ itemId: r.itemId, answer: r.answer })),
      session.seed,
      linkOf(session),
    );
    patch.status = "completed";
    patch.completed_at = nowOf(deps).toISOString();
    patch.result = result;
    patch.score = result.score;
    patch.total = result.total;
  }
  const { data } = await run<{ id: string }[] | null>(
    deps.db
      .from("exam_sessions")
      .update(patch)
      .eq("id", session.id)
      .eq("status", "in_progress")
      .select("id"),
  );
  if (!data?.length) {
    const current = await readSession(deps.db, session.id);
    if (submit && current?.status === "completed") return completedResult(current, loaded);
    throw new ExamApiError(409, "This test is already submitted.", "finished");
  }
  if (submit) return completedResult({ ...session, ...patch } as SessionRow, loaded);
  return { saved: responses.length, total: form.length, status: "in_progress" as const };
}

async function sessionResult(
  input: Extract<ExamCheckAction, { action: "result" }>,
  deps: ExamCheckDeps,
) {
  const session = await ownedSession(deps, input.sessionId, input.secret);
  if (session.status !== "completed")
    throw new ExamApiError(409, "Finish the exam to see your result.", "not_finished");
  const loaded = await loadSessionBank(deps.db, session);
  return completedResult(session, loaded);
}

/** A reviewed item as the client sees it after completion (A, B and the diagnostic only). */
export interface ClientItemReview extends PublicItem {
  explanation: string;
  /** The right answer, under client-side names: mc option id, typed answer, or match pairs. */
  solution: { optionId?: string; text?: string; pairs?: { left: string; right: string }[] };
  yourAnswer: ExamAnswer | null;
  points: number;
}
function clientReview(
  item: BankItem,
  kind: ExamKind,
  seed: string,
  yourAnswer: ExamAnswer | null,
): ClientItemReview | null {
  const review = completedItemReview(item, kind, { seed });
  if (!review) return null;
  const view: ClientItemReview = {
    ...publicItem(item, { seed }),
    explanation: review.explanation,
    solution: {},
    yourAnswer,
    points: scoreItem(item, yourAnswer, seed).points,
  };
  if (review.correctOptionId) view.solution.optionId = review.correctOptionId;
  if (review.answer !== undefined) view.solution.text = review.answer;
  if (review.pairs) view.solution.pairs = review.pairs;
  return view;
}

/**
 * The completed-session result. Form C: only `publicFixedFormResult` (percent, pass/fail,
 * missed lessons). A and B: that plus the item review. Diagnostic: the stored study map (phases
 * first, lessons "likely", lesson links) plus the review of served items.
 */
export function completedResult(session: SessionRow, loaded: LoadedBank) {
  const base = {
    sessionId: session.id,
    kind: session.kind,
    status: "completed" as const,
    completedAt: session.completed_at,
  };
  if (session.kind === "C")
    return { ...base, result: publicFixedFormResult(session.result as FixedFormResult) };
  const answers = new Map((session.responses ?? []).map((r) => [r.itemId, r.answer]));
  if (session.kind === "diagnostic") {
    const review = session.responses
      .map((r) => clientReview(loaded.items.get(r.itemId)!, "diagnostic", session.seed, r.answer))
      .filter((entry): entry is ClientItemReview => entry !== null);
    return { ...base, result: session.result as DiagnosticResult, review };
  }
  const kind = session.kind as FixedFormKind;
  const review = fixedFormItems(loaded, kind)
    .map((item) => clientReview(item, kind, session.seed, answers.get(item.id) ?? null))
    .filter((entry): entry is ClientItemReview => entry !== null);
  return { ...base, result: publicFixedFormResult(session.result as FixedFormResult), review };
}

async function claimSession(
  input: Extract<ExamCheckAction, { action: "claim" }>,
  deps: ExamCheckDeps,
) {
  const user = await requireUser(deps, "Sign in to save your study map.");
  const session = await readSession(deps.db, input.sessionId);
  if (!session || !secretMatches(input.secret, session.public_secret_hash))
    throw new ExamApiError(404, NOT_FOUND, "not_found");
  if (session.user_id === user.id) return { claimed: true, sessionId: session.id };
  if (session.user_id)
    throw new ExamApiError(409, "This check is already saved to another account.", "claimed");
  const result = (await deps.db
    .from("exam_sessions")
    .update({ user_id: user.id })
    .eq("id", session.id)
    .is("user_id", null)
    .select("id")) as DbResult<{ id: string }[] | null>;
  if (result.error) {
    if (isUniqueViolation(result.error))
      throw new ExamApiError(
        409,
        "You already have a Spanish Check in progress. Finish it first.",
        "open_session",
      );
    throw storageError(result.error);
  }
  if (!result.data?.length) {
    const current = await readSession(deps.db, session.id);
    if (current?.user_id === user.id) return { claimed: true, sessionId: session.id };
    throw new ExamApiError(409, "This check is already saved to another account.", "claimed");
  }
  return { claimed: true, sessionId: session.id };
}

// ── Owner bank approval (/api/exam-bank) ────────────────────────────────────

export interface ExamBankDeps {
  db: ExamDb;
  /** Authenticates and requires the platform owner; throws ExamApiError(403) otherwise. */
  requireOwner(): Promise<ExamUser>;
  audit(actorId: string, action: string, detail: Record<string, unknown>): Promise<void>;
  now?: () => Date;
}

interface BankRow {
  module_id: string;
  target_language: string;
  instruction_language: string;
  version: string;
  status: "draft" | "approved" | "retired";
  content: unknown;
  content_sha256: string;
  review_records: unknown;
  approved_by: string | null;
  approved_at: string | null;
  approved_sha256: string | null;
  created_at: string;
}
const BANK_COLUMNS =
  "module_id,target_language,instruction_language,version,status,content,content_sha256,review_records,approved_by,approved_at,approved_sha256,created_at";

export interface ReviewSummary {
  reviewer: string;
  at: string | null;
  /** Signed against the bank's current content_sha256. */
  current: boolean;
  independent: boolean;
  accept: number;
  revise: number;
  reject: number;
  missing: number;
}
export interface BankSummary {
  moduleId: string;
  target: string;
  native: string;
  version: string;
  status: BankRow["status"];
  sha256: string;
  /** Recomputed from content; false means the stored hash does not match the content. */
  shaVerified: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  approvedSha256: string | null;
  createdAt: string;
  counts: {
    items: number;
    lessons: number;
    phases: number;
    forms: Record<FixedFormKind, number>;
    diagnosticPool: number;
    byType: Record<string, number>;
  };
  reviews: ReviewSummary[];
  /** Validator issue codes (no content), deduplicated. */
  blockers: string[];
  warnings: number;
  approvable: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function reviewSummaries(row: BankRow): ReviewSummary[] {
  const content = asRecord(row.content);
  const ids = Array.isArray(content.items)
    ? (content.items as unknown[]).map((item) => String(asRecord(item).id ?? ""))
    : [];
  const records = Array.isArray(row.review_records) ? (row.review_records as unknown[]) : [];
  return records.map((raw) => {
    const review = asRecord(raw);
    const verdicts = asRecord(review.verdicts);
    const count = (verdict: string) => ids.filter((id) => verdicts[id] === verdict).length;
    return {
      reviewer: typeof review.reviewer === "string" ? review.reviewer.slice(0, 80) : "",
      at: typeof review.at === "string" ? review.at.slice(0, 40) : null,
      current: review.bankSha256 === row.content_sha256,
      independent: review.independentOfAuthor === true,
      accept: count("accept"),
      revise: count("revise"),
      reject: count("reject"),
      missing: ids.filter((id) => verdicts[id] === undefined).length,
    };
  });
}

function storedShaMatches(row: BankRow): boolean {
  try {
    return bankSha256(row.content as ExamBank) === row.content_sha256;
  } catch {
    return false;
  }
}

/**
 * Everything that blocks approval, as content-free codes. Re-runs the full validator (rule 8
 * included) on content + review_records, and checks the stored hash against the content.
 */
export function approvalBlockers(row: BankRow): { blockers: string[]; issues: BankIssue[] } {
  const blockers = new Set<string>();
  if (!storedShaMatches(row)) blockers.add("bank.sha_mismatch");
  const validation = validateBank(
    { ...asRecord(row.content), reviews: row.review_records },
    { reviews: "require" },
  );
  for (const issue of validation.errors) blockers.add(issue.code);
  const reviews = reviewSummaries(row);
  const signed = new Set(
    reviews
      .filter((review) => review.current && review.independent && review.reviewer.trim())
      .map((review) => review.reviewer.trim().toLowerCase()),
  );
  if (signed.size < 2) blockers.add("reviews.too_few");
  if (reviews.some((review) => review.current && review.revise > 0))
    blockers.add("review.revise_pending");
  if (reviews.some((review) => review.reject > 0)) blockers.add("review.rejected");
  const content = asRecord(row.content);
  if (
    content.moduleId !== row.module_id ||
    content.targetLanguage !== row.target_language ||
    content.instructionLanguage !== row.instruction_language ||
    content.version !== row.version
  )
    blockers.add("bank.key_mismatch");
  return { blockers: [...blockers], issues: validation.errors };
}

function bankSummary(row: BankRow): BankSummary {
  const validation = validateBank(
    { ...asRecord(row.content), reviews: row.review_records },
    { reviews: "require" },
  );
  const { blockers } = approvalBlockers(row);
  return {
    moduleId: row.module_id,
    target: row.target_language,
    native: row.instruction_language,
    version: row.version,
    status: row.status,
    sha256: row.content_sha256,
    shaVerified: storedShaMatches(row),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    approvedSha256: row.approved_sha256,
    createdAt: row.created_at,
    counts: {
      items: validation.counts.items,
      lessons: validation.counts.lessons,
      phases: validation.counts.phases,
      forms: validation.counts.forms,
      diagnosticPool: validation.counts.diagnosticPool,
      byType: validation.counts.byType,
    },
    reviews: reviewSummaries(row),
    blockers,
    warnings: validation.warnings.length,
    approvable: row.status === "draft" && blockers.length === 0,
  };
}

/** Owner preview of one item. Field names differ from the bank's on purpose (bundle check). */
export interface OwnerItemPreview {
  id: string;
  rev: number;
  lesson: number;
  skill: string;
  difficulty: number;
  type: string;
  placement: "A" | "B" | "C" | "diagnostic" | "spare";
  prompt: string;
  context?: string;
  choices?: { id: string; text: string; right: boolean; why?: string }[];
  answers?: string[];
  accentsRequired?: boolean;
  pairs?: { left: string; right: string }[];
  explanation: string;
  sourceRefs: string[];
  author: string;
}
function ownerPreview(content: ExamBank) {
  const placement = new Map<string, OwnerItemPreview["placement"]>();
  for (const kind of FIXED_FORM_KINDS)
    for (const id of content.forms?.[kind] ?? []) placement.set(id, kind);
  for (const id of content.diagnosticPool ?? []) placement.set(id, "diagnostic");
  const items: OwnerItemPreview[] = (Array.isArray(content.items) ? content.items : []).map(
    (item) => {
      const preview: OwnerItemPreview = {
        id: item.id,
        rev: item.rev,
        lesson: item.lesson,
        skill: item.skill,
        difficulty: item.difficulty,
        type: item.type,
        placement: placement.get(item.id) ?? "spare",
        prompt: item.prompt,
        explanation: item.explanation,
        sourceRefs: item.sourceRefs ?? [],
        author: item.author,
      };
      if (item.context) preview.context = item.context;
      if (item.type === "mc")
        preview.choices = (item.options ?? []).map((option) => ({
          id: option.id,
          text: option.text,
          right: option.id === item.correctOptionId,
          ...(option.distractorRationale ? { why: option.distractorRationale } : {}),
        }));
      if (item.type === "typed") {
        preview.answers = item.accepted ?? [];
        preview.accentsRequired = answerPolicy(item).accents === "required";
      }
      if (item.type === "match") preview.pairs = item.pairs ?? [];
      return preview;
    },
  );
  return {
    phases: (content.phases ?? []).map(({ id, title, lessons }) => ({ id, title, lessons })),
    lessons: (content.lessons ?? []).map(({ lesson, title }) => ({ lesson, title })),
    forms: {
      A: content.forms?.A ?? [],
      B: content.forms?.B ?? [],
      C: content.forms?.C ?? [],
      diagnostic: content.diagnosticPool ?? [],
    },
    items,
  };
}

const bankKeySchema = z
  .object({
    moduleId: moduleIdSchema,
    target: languageSchema,
    native: languageSchema,
    version: z.string().regex(/^v[0-9]{1,4}$/),
  })
  .strict();
export const examBankAction = z.discriminatedUnion("action", [
  bankKeySchema
    .extend({
      action: z.literal("approve"),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      confirmModuleId: z.string().max(100),
    })
    .strict(),
]);

async function readBankRow(db: ExamDb, key: z.infer<typeof bankKeySchema>) {
  const { data } = await run<BankRow | null>(
    db
      .from("exam_banks")
      .select(BANK_COLUMNS)
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("version", key.version)
      .maybeSingle(),
  );
  return data;
}

/** Owner bank API. The owner check runs before any parsing or private read. */
export async function examBankResponse(request: Request, deps: ExamBankDeps): Promise<Response> {
  try {
    if (request.method === "POST" && examOriginDenied(request)) {
      void request.body?.cancel().catch(() => {});
      throw new ExamApiError(403, "Open the exam bank page to continue.", "origin");
    }
    const owner = await deps.requireOwner();
    if (request.method === "GET") return examJson(await bankGet(request, deps, owner));
    if (request.method === "POST") {
      const body = examBankAction.parse(await readPrivateJson(request, 16 * 1024));
      return examJson(await approveBank(body, deps, owner));
    }
    throw new ExamApiError(400, "Check your exam request and try again.", "bad_request");
  } catch (error) {
    return examErrorResponse(error);
  }
}

async function bankGet(request: Request, deps: ExamBankDeps, owner: ExamUser) {
  const params = new URL(request.url).searchParams;
  if (params.has("moduleId")) {
    const key = bankKeySchema.parse({
      moduleId: params.get("moduleId"),
      target: params.get("target"),
      native: params.get("native"),
      version: params.get("version"),
    });
    const row = await readBankRow(deps.db, key);
    if (!row) throw new ExamApiError(404, "That bank version doesn't exist.", "no_bank");
    await deps.audit(owner.id, "exam_bank.preview", { ...key, sha256: row.content_sha256 });
    return { bank: bankSummary(row), preview: ownerPreview(row.content as ExamBank) };
  }
  const { data } = await run<BankRow[] | null>(
    deps.db
      .from("exam_banks")
      .select(BANK_COLUMNS)
      .order("module_id", { ascending: true })
      .order("version", { ascending: true })
      .limit(50),
  );
  const banks = (data ?? []).map(bankSummary);
  await deps.audit(owner.id, "exam_bank.list", { banks: banks.length });
  return { banks };
}

async function approveBank(
  input: z.infer<typeof examBankAction>,
  deps: ExamBankDeps,
  owner: ExamUser,
) {
  const key = {
    moduleId: input.moduleId,
    target: input.target,
    native: input.native,
    version: input.version,
  };
  const refuse = async (
    status: ExamErrorStatus,
    message: string,
    code: string,
    extra: Record<string, unknown> = {},
  ): Promise<never> => {
    await deps.audit(owner.id, "exam_bank.approve_refused", { ...key, code, ...extra });
    throw new ExamApiError(status, message, code, extra);
  };
  if (input.confirmModuleId.trim() !== input.moduleId)
    return refuse(400, "Type the module id exactly to approve this version.", "confirm");
  const row = await readBankRow(deps.db, key);
  if (!row) return refuse(404, "That bank version doesn't exist.", "no_bank");
  if (row.status !== "draft")
    return refuse(
      409,
      row.status === "approved"
        ? "This version is already approved."
        : "A retired version can't be approved again. Import a new version.",
      "status",
    );
  if (row.content_sha256 !== input.sha256)
    return refuse(
      409,
      "This bank changed since you opened it. Reload it and review again.",
      "sha_changed",
    );
  const { blockers } = approvalBlockers(row);
  if (blockers.length)
    return refuse(
      409,
      "This version can't be approved yet. Fix the listed problems first.",
      "blocked",
      { blockers },
    );

  // Retire the currently approved version first, then approve this one. The partial unique
  // index allows at most one approved row, and this order never needs two.
  const retired = await run<{ version: string }[] | null>(
    deps.db
      .from("exam_banks")
      .update({ status: "retired" })
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("status", "approved")
      .neq("version", key.version)
      .select("version"),
  );
  const retiredVersions = (retired.data ?? []).map((entry) => entry.version);
  const restore = async () => {
    if (!retiredVersions.length) return;
    await deps.db
      .from("exam_banks")
      .update({ status: "approved" })
      .eq("module_id", key.moduleId)
      .eq("target_language", key.target)
      .eq("instruction_language", key.native)
      .eq("status", "retired")
      .in("version", retiredVersions)
      .select("version");
  };
  const approvedAt = (deps.now ? deps.now() : new Date()).toISOString();
  const approved = (await deps.db
    .from("exam_banks")
    .update({
      status: "approved",
      approved_by: owner.id,
      approved_at: approvedAt,
      approved_sha256: row.content_sha256,
    })
    .eq("module_id", key.moduleId)
    .eq("target_language", key.target)
    .eq("instruction_language", key.native)
    .eq("version", key.version)
    .eq("status", "draft")
    .eq("content_sha256", input.sha256)
    .select("version")) as DbResult<{ version: string }[] | null>;
  if (approved.error || !approved.data?.length) {
    await restore();
    if (approved.error && !isUniqueViolation(approved.error)) {
      const error = storageError(approved.error);
      await deps.audit(owner.id, "exam_bank.approve_failed", { ...key, code: error.code });
      throw error;
    }
    return refuse(409, "Approval didn't apply. Reload and try again.", "conflict");
  }
  await deps.audit(owner.id, "exam_bank.approve", {
    ...key,
    sha256: row.content_sha256,
    retired: retiredVersions,
  });
  const fresh = await readBankRow(deps.db, key);
  return {
    ok: true,
    notice: `Approved ${key.moduleId} ${key.version}.`,
    retired: retiredVersions,
    bank: fresh ? bankSummary(fresh) : null,
  };
}
