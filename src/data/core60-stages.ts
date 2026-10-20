// Built by TAC — 2026-10-19
// Registry and loader for data-driven Core 60 stages (Foundation / Master modules listed in
// src/data/core60/manifest.ts). Their curricula are NOT in the main bundle: each stage file
// (src/data/core60/<langCode>/<id>.json) is its own lazily imported chunk, loaded when a learner
// opens that stage (client) or when a server request needs it (ensureStageCurriculum, called by
// /api/speak for the requested scenario's stage and by the src/start.ts middleware).
// getCurriculum() stays synchronous: it answers from this registry, so a stage reads as "no
// curriculum" until its chunk has loaded; the Core 60 page waits on useStageCurriculum meanwhile.
// Under plain Node (tests, generator and validator scripts) there is no bundler: files are read
// from disk synchronously on first use, so getCurriculum() works there with no await.
// Format and generator contract: docs/core60-architecture.md.

import type { ModuleCurriculum } from "./curriculum.ts";
import type { AppModule } from "./modules.ts";
import { CORE60_MANIFEST } from "./core60/manifest.ts";
import {
  findStageEntry,
  parseStageFile,
  stageCurriculumFromFile,
  stageFileRelativePath,
  type Core60ManifestEntry,
} from "../lib/core60-stage-core.ts";

type Loader = () => Promise<unknown>;

/** The test fixture (tests/fixtures/core60/fixture.json): synthetic trades. Never shipped. */
interface Core60Fixture {
  modules: AppModule[];
  manifest: Core60ManifestEntry[];
}

// ─── Sources ─────────────────────────────────────────────────────────────────

// Bundled (Vite client and server): one chunk per stage file. Under Node import.meta.glob does
// not exist and this throws, which selects the file-system source below.
function bundledLoaders(): Record<string, Loader> | null {
  try {
    return import.meta.glob("./core60/*/*.json", { import: "default" }) as Record<string, Loader>;
  } catch {
    return null;
  }
}

// The fixture joins the dev server only when an e2e test injects it before the app loads
// (window.__CORE60_FIXTURE__, see e2e/core60-path.spec.ts). Nothing of it is in any bundle, and in
// a production build import.meta.env.DEV is false, so the global is never even read.
interface InjectedFixture extends Core60Fixture {
  /** Stage files by module id. */
  files: Record<string, unknown>;
}

function injectedFixture(): InjectedFixture | null {
  try {
    if (import.meta.env.DEV) {
      const injected = (globalThis as { __CORE60_FIXTURE__?: InjectedFixture }).__CORE60_FIXTURE__;
      if (injected && Array.isArray(injected.modules) && Array.isArray(injected.manifest))
        return injected;
    }
  } catch {
    /* plain Node: see nodeFixture */
  }
  return null;
}

interface NodeFs {
  existsSync(path: URL): boolean;
  readFileSync(path: URL, encoding: "utf8"): string;
}

/** node:fs when running under plain Node (no bundler), else null. Never imported statically. */
function nodeFs(): NodeFs | null {
  const proc = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process;
  return (proc?.getBuiltinModule?.("node:fs") as NodeFs | undefined) ?? null;
}

const BUNDLED = bundledLoaders();
const INJECTED_FIXTURE = BUNDLED ? injectedFixture() : null;
const FS = BUNDLED ? null : nodeFs();

/**
 * Node only: a data directory next to this source file, or (when this file was bundled elsewhere,
 * as tests/helpers/bundle.mjs does) under the working directory, the repository root. `marker`
 * is a file that must exist there. The paths are variables on purpose: Vite rewrites
 * new URL("<literal>", import.meta.url).
 */
function nodeRoot(fromHere: string, fromRepo: string, marker: string): URL | null {
  if (!FS) return null;
  const proc = (globalThis as { process?: { cwd?: () => string } }).process;
  const url = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process
    ?.getBuiltinModule?.("node:url") as { pathToFileURL(path: string): URL } | undefined;
  const candidates: URL[] = [];
  // import.meta.url is not a file URL when this module was bundled into a data: URL.
  try {
    candidates.push(new URL(fromHere, import.meta.url));
  } catch {
    /* not resolvable from here */
  }
  if (proc?.cwd && url) candidates.push(new URL(fromRepo, url.pathToFileURL(`${proc.cwd()}/`)));
  return (
    candidates.find((root) => root.protocol === "file:" && FS.existsSync(new URL(marker, root))) ??
    null
  );
}

const STAGE_DIR = "./core60/";
const FIXTURE_DIR = "../../tests/fixtures/core60/";
const STAGE_ROOT = nodeRoot(STAGE_DIR, "src/data/core60/", "manifest.ts");
const FIXTURE_ROOT = nodeRoot(FIXTURE_DIR, "tests/fixtures/core60/", "fixture.json");

function nodeFixture(): Core60Fixture | null {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (!FS || !FIXTURE_ROOT || env?.CORE60_FIXTURE !== "1") return null;
  return JSON.parse(FS.readFileSync(new URL("fixture.json", FIXTURE_ROOT), "utf8")) as Core60Fixture;
}

const FIXTURE: Core60Fixture | null = INJECTED_FIXTURE ?? nodeFixture();
const MANIFEST: readonly Core60ManifestEntry[] = FIXTURE
  ? [...CORE60_MANIFEST, ...FIXTURE.manifest]
  : CORE60_MANIFEST;
const FIXTURE_BASES = new Set(FIXTURE?.manifest.map((entry) => entry.base) ?? []);

/** Every listed stage trade (the shipped manifest, plus the fixture in dev/test fixture mode). */
export function core60Manifest(): readonly Core60ManifestEntry[] {
  return MANIFEST;
}

/** The fixture's synthetic base modules (fixture mode only; empty otherwise). */
export function core60FixtureModules(): AppModule[] {
  return FIXTURE ? FIXTURE.modules : [];
}

/** The manifest entry and stage of a data-driven stage module, or null for every other module. */
export function dataStageOf(moduleId: string | null | undefined) {
  return findStageEntry(MANIFEST, moduleId);
}

// ─── Registry ────────────────────────────────────────────────────────────────

// Settled ids: a curriculum, or null when the file is missing or unusable.
const curricula = new Map<string, ModuleCurriculum | null>();
const pending = new Map<string, Promise<ModuleCurriculum | null>>();
const failed = new Set<string>();
// When each failed stage last failed (ms), so a server can pause before it tries again.
const failedAt = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

function settle(moduleId: string, curriculum: ModuleCurriculum | null) {
  curricula.set(moduleId, curriculum);
  failed.delete(moduleId);
  failedAt.delete(moduleId);
  version += 1;
  for (const listener of listeners) listener();
}

function curriculumFrom(moduleId: string, raw: unknown): ModuleCurriculum | null {
  const found = dataStageOf(moduleId);
  if (!found) return null;
  const file = parseStageFile(raw, {
    moduleId,
    stage: found.stage,
    language: found.entry.language,
  });
  return file ? stageCurriculumFromFile(file) : null;
}

function sourceKey(moduleId: string): { fixture: boolean; relative: string } | null {
  const found = dataStageOf(moduleId);
  if (!found) return null;
  return {
    fixture: FIXTURE_BASES.has(found.entry.base),
    relative: stageFileRelativePath(found.entry.language, moduleId),
  };
}

function readFromDisk(moduleId: string): ModuleCurriculum | null {
  const source = sourceKey(moduleId);
  const root = source?.fixture ? FIXTURE_ROOT : STAGE_ROOT;
  if (!FS || !source || !root) return null;
  const file = new URL(source.relative, root);
  if (!FS.existsSync(file)) return null;
  return curriculumFrom(moduleId, JSON.parse(FS.readFileSync(file, "utf8")));
}

/**
 * The stage's curriculum if it has loaded, else null. Under plain Node the file is read from disk
 * on the first call. Not a data-driven stage → null (getCurriculum answers those from CURRICULA).
 */
export function stageCurriculum(moduleId: string): ModuleCurriculum | null {
  if (curricula.has(moduleId)) return curricula.get(moduleId) ?? null;
  if (FS && dataStageOf(moduleId)) {
    const curriculum = readFromDisk(moduleId);
    settle(moduleId, curriculum);
    return curriculum;
  }
  return null;
}

export type StageCurriculumStatus = "none" | "loading" | "ready" | "unavailable";

/**
 * "none" for a module that is not a data-driven stage (roofing's hand-written stages included),
 * "loading" until its file has been asked for and arrived, "ready", or "unavailable" (no file,
 * an unusable file, or a failed chunk load, which a later load retries).
 */
export function stageCurriculumStatus(moduleId: string | null | undefined): StageCurriculumStatus {
  if (!moduleId || !dataStageOf(moduleId)) return "none";
  if (FS) stageCurriculum(moduleId);
  if (curricula.has(moduleId)) return curricula.get(moduleId) ? "ready" : "unavailable";
  return failed.has(moduleId) ? "unavailable" : "loading";
}

/** How long a server waits after a failed stage load before it tries that stage again. */
export const STAGE_RETRY_BACKOFF_MS = 2000;

interface LoadOptions {
  /** Do not retry a stage that failed less than this many ms ago (resolves null instead). */
  backoffMs?: number;
  /** Clock, for tests. */
  now?: () => number;
}

/**
 * Loads (once) a stage's curriculum chunk. Resolves null when it has none; never throws. A failed
 * load is not remembered as final: the next call loads again (after `backoffMs`, when given).
 */
export function loadStageCurriculum(
  moduleId: string,
  options: LoadOptions = {},
): Promise<ModuleCurriculum | null> {
  if (curricula.has(moduleId)) return Promise.resolve(curricula.get(moduleId) ?? null);
  if (FS || !dataStageOf(moduleId)) return Promise.resolve(stageCurriculum(moduleId));
  const existing = pending.get(moduleId);
  if (existing) return existing;
  const now = options.now ?? Date.now;
  const lastFailure = failedAt.get(moduleId);
  if (options.backoffMs && lastFailure !== undefined && now() - lastFailure < options.backoffMs)
    return Promise.resolve(null);
  const source = sourceKey(moduleId)!;
  const injected = source.fixture ? INJECTED_FIXTURE?.files[moduleId] : undefined;
  const loader: Loader | undefined = source.fixture
    ? injected === undefined
      ? undefined
      : () => Promise.resolve(injected)
    : BUNDLED?.[`./core60/${source.relative}`];
  const promise = (async () => {
    if (!loader) {
      // Listed in the manifest without a file: nothing to load (the validator rejects this).
      settle(moduleId, null);
      return null;
    }
    try {
      const curriculum = curriculumFrom(moduleId, await loader());
      settle(moduleId, curriculum);
      return curriculum;
    } catch {
      // Offline with the chunk not cached yet: not remembered, so the next visit retries.
      failed.add(moduleId);
      failedAt.set(moduleId, now());
      version += 1;
      for (const listener of listeners) listener();
      return null;
    }
  })().finally(() => pending.delete(moduleId));
  pending.set(moduleId, promise);
  return promise;
}

/**
 * The Retry button: forgets a stage that failed (or settled without a curriculum) and loads it
 * again right away. A stage that has loaded is left alone.
 */
export function retryStageCurriculum(moduleId: string): Promise<ModuleCurriculum | null> {
  if (!dataStageOf(moduleId)) return Promise.resolve(null);
  if (curricula.get(moduleId)) return Promise.resolve(curricula.get(moduleId) ?? null);
  if (!FS && !pending.has(moduleId)) {
    curricula.delete(moduleId);
    failed.delete(moduleId);
    failedAt.delete(moduleId);
    version += 1;
    for (const listener of listeners) listener();
  }
  return loadStageCurriculum(moduleId);
}

/**
 * The Retry button: tries the import again in the page and, when it still does not load, calls
 * `reload`. A browser keeps a failed dynamic import for the life of the document (its module map),
 * so a second import() of the same chunk URL fails at once, without a request; only a fresh page
 * fetches the chunk again. Resolves true when the stage loaded without a reload.
 */
export async function retryStageOrReload(moduleId: string, reload: () => void): Promise<boolean> {
  const curriculum = await retryStageCurriculum(moduleId);
  if (!curriculum) reload();
  return Boolean(curriculum);
}

/**
 * Server side: makes one stage's curriculum available to the synchronous getCurriculum() callers
 * before a request reads it. Loads only that stage, caches it, and retries a failed load on a
 * later request once STAGE_RETRY_BACKOFF_MS has passed. Resolves null when it cannot be loaded.
 */
export function ensureStageCurriculum(
  moduleId: string,
  options: LoadOptions = {},
): Promise<ModuleCurriculum | null> {
  return loadStageCurriculum(moduleId, { backoffMs: STAGE_RETRY_BACKOFF_MS, ...options });
}

/**
 * The data-driven stage module a speaking scenario version id belongs to
 * ("scenario_version_master-electrician_lesson_3_es_v1" → "master-electrician"), or null for
 * every other scenario (Core 30, roofing's hand-written stages, curated and core missions).
 */
export function stageModuleIdOfScenario(scenarioVersionId: string): string | null {
  const match = scenarioVersionId.match(
    /^scenario_version_(.+)_(?:lesson|challenge)_\d+_(?:es|it|ja|zh|en)_v1$/,
  );
  return match && dataStageOf(match[1]) ? match[1] : null;
}

/** Every listed stage module id (the fixture's too, in fixture mode). */
function listedStageIds(): string[] {
  return MANIFEST.flatMap((entry) =>
    (["foundation", "master"] as const)
      .filter((stage) => entry[stage])
      .map((stage) => `${stage}-${entry.base}`),
  );
}

/** The listed data-driven stage modules of a base module ("electrician" → foundation-, master-). */
export function stageModulesOfBase(baseModuleId: string): string[] {
  return listedStageIds().filter((id) => dataStageOf(id)?.entry.base === baseModuleId);
}

/** The listed stage module ids that appear in a piece of text (a server function's payload). */
export function stageModuleIdsIn(text: string): string[] {
  if (!text.includes("foundation-") && !text.includes("master-")) return [];
  return listedStageIds().filter((id) => text.includes(id));
}

let preloadedAll = false;

/**
 * Loads every listed stage (server routes that read curricula by module ids kept in the database,
 * not in the request). Not memoized after a failure: the next call retries the stages that failed.
 */
export async function preloadStageCurricula(): Promise<void> {
  if (preloadedAll) return;
  await Promise.all(listedStageIds().map((id) => ensureStageCurriculum(id)));
  preloadedAll = listedStageIds().every((id) => curricula.has(id));
}

/** Which stages a server request waits for before its handler runs. */
export type StageLoadPlan = { kind: "none" } | { kind: "all" } | { kind: "ids"; ids: string[] };

// Routes whose handlers resolve curricula from module ids stored in the database (enrollments,
// team tracks, reminders), not from the request, so they need every stage.
const ALL_STAGES_ROUTE = /^\/api\/(exams|exam-[a-z-]+|team|team-[a-z-]+|push-[a-z-]+)(\/|$)/;

/**
 * What a request must wait for. /api/speak loads its own scenario's stage; a server function loads
 * the stages named in its payload; the DB-driven routes above load all of them; every other
 * request (pages, assets, auth, tutor, ...) waits for nothing.
 */
export function stageLoadPlan(
  pathname: string,
  handlerType: string,
  payloadText?: string,
): StageLoadPlan {
  if (ALL_STAGES_ROUTE.test(pathname)) return { kind: "all" };
  if (handlerType === "serverFn" && payloadText) {
    const ids = stageModuleIdsIn(payloadText);
    if (ids.length) return { kind: "ids", ids };
  }
  return { kind: "none" };
}

/** Runs a plan: resolves once its stages have loaded or failed (never throws). */
export async function applyStageLoadPlan(plan: StageLoadPlan): Promise<void> {
  if (plan.kind === "all") await preloadStageCurricula();
  else if (plan.kind === "ids") await Promise.all(plan.ids.map((id) => ensureStageCurriculum(id)));
}

/** Registers a curriculum directly (tests and tools). */
export function registerStageCurriculum(curriculum: ModuleCurriculum): void {
  settle(curriculum.moduleId, curriculum);
}

export function subscribeStageCurricula(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Bumped whenever a stage curriculum settles (caches built from getCurriculum key off it). */
export function stageCurriculaVersion(): number {
  return version;
}
