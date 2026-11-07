/**
 * Review-only French 101 adapter. No production route imports this module and the release gate
 * below is deliberately closed. Its input fixtures live under content/, outside the public
 * Core 60 manifest. This lets reviewers exercise exact-pair catalog, cache and activity paths
 * without exposing unreviewed lessons or changing saved progress.
 */
import type { ModuleCurriculum } from "./curriculum.ts";
import type { AppModule } from "./modules.ts";
import { moduleSupportsLearningPair } from "./modules.ts";
import {
  deriveStageModule,
  stageCurriculumFromFile,
  type Core60ManifestEntry,
  type Core60StageFile,
} from "../lib/core60-stage-core.ts";
import { validateStageFile } from "../lib/core60-validate.ts";

export const FRENCH_101_RELEASE_ENABLED = false as const;
export const FRENCH_101_PAIR = Object.freeze({ target: "French", native: "English" });
export const FRENCH_101_STAGE_IDS = Object.freeze([
  "foundation-french-basics",
  "french-basics",
  "master-french-basics",
] as const);

type StageId = (typeof FRENCH_101_STAGE_IDS)[number];
type Pair = { target: string; native: string };
type Sidecar = {
  n: number;
  stableLessonKey: string;
  reader: unknown;
  cards: unknown[];
  dictionaryEntries: unknown[];
  speaking: unknown;
  modes: Record<string, unknown>;
};
type PrivateFixture = {
  privatePilot: boolean;
  registered: boolean;
  reviewed: boolean;
  audioStatus: string;
  support: Sidecar[];
};
type FoundationFixture = PrivateFixture & { stageFile: Core60StageFile };
type CoreFixture = PrivateFixture & { target: string; native: string; coreCurriculum: ModuleCurriculum };
type MasterFixture = PrivateFixture & { target: string; native: string; masterStageFragment: Core60StageFile };
export type French101PrivateInputs = {
  foundation: FoundationFixture;
  core: CoreFixture;
  master: MasterFixture;
};

const baseCatalog: AppModule = {
  id: "french-basics",
  name: "French 101",
  emoji: "🇫🇷",
  category: "Core Basics",
  blurb: "French 101 draft for English-speaking learners.",
  priceCents: 0,
  languages: ["French"],
  nativeLanguages: ["English"],
  authoredPair: { target: "French", native: "English" },
  aiPersona: "Guide an English-speaking adult learning French; explain in English when needed.",
  userRole: "An adult learning French",
  challengePrompts: [],
  vocabFocus: [],
};

const stageManifest: Core60ManifestEntry = {
  base: "french-basics",
  language: "French",
  tradeLabel: "French 101",
  foundation: {},
  master: {},
};

function exactPair(pair: Pair): boolean {
  return pair.target === FRENCH_101_PAIR.target && pair.native === FRENCH_101_PAIR.native;
}

function checkFixture(fixture: PrivateFixture, id: StageId, count: number): void {
  if (!fixture.privatePilot || fixture.registered || fixture.reviewed || fixture.audioStatus !== "script-only; no recorded audio")
    throw new Error(`${id} must remain a private, unreviewed, script-only fixture`);
  if (fixture.support.length !== count) throw new Error(`${id} has ${fixture.support.length} sidecars, expected ${count}`);
  const modeNames = ["hear", "recall", "say", "see", "type", "write"];
  for (const [index, sidecar] of fixture.support.entries()) {
    if (sidecar.n !== index + 1 || sidecar.stableLessonKey !== `${id}:${index + 1}`)
      throw new Error(`${id} has unstable lesson key at ${index + 1}`);
    if (!Array.isArray(sidecar.cards) || !Array.isArray(sidecar.dictionaryEntries) || !sidecar.reader || !sidecar.speaking)
      throw new Error(`${id} is missing a card, Reader, dictionary or speaking input at ${index + 1}`);
    if (JSON.stringify(Object.keys(sidecar.modes).sort()) !== JSON.stringify(modeNames))
      throw new Error(`${id} is missing a practice mode at ${index + 1}`);
  }
}

/** Explicit review-harness entrypoint: the caller supplies private fixture JSON. */
export function inspectPrivateFrench101(inputs: French101PrivateInputs) {
  const { foundation, core, master } = inputs;
  checkFixture(foundation, FRENCH_101_STAGE_IDS[0], 10);
  checkFixture(core, FRENCH_101_STAGE_IDS[1], 30);
  checkFixture(master, FRENCH_101_STAGE_IDS[2], 20);
  if (core.target !== "French" || core.native !== "English" || master.target !== "French" || master.native !== "English")
    throw new Error("French 101 fixture pair mismatch");
  for (const [file, id, stage] of [
    [foundation.stageFile, FRENCH_101_STAGE_IDS[0], "foundation"],
    [master.masterStageFragment, FRENCH_101_STAGE_IDS[2], "master"],
  ] as const) {
    if (file.nativeLanguage !== "English" || file.baseModule !== "french-basics" || file.reviewed)
      throw new Error(`${id} has the wrong support language or review flag`);
    const errors = validateStageFile(file, { moduleId: id, stage, language: "French" });
    if (errors.length) throw new Error(`${id}: ${errors.join("; ")}`);
  }
  if (core.coreCurriculum.moduleId !== "french-basics" || core.coreCurriculum.lessons.length !== 30)
    throw new Error("French 101 Core is not the expected 30-lesson curriculum");

  const catalog = [
    deriveStageModule(baseCatalog, stageManifest, "foundation"),
    baseCatalog,
    deriveStageModule(baseCatalog, stageManifest, "master"),
  ];
  const curricula = new Map<StageId, ModuleCurriculum>([
    [FRENCH_101_STAGE_IDS[0], stageCurriculumFromFile(foundation.stageFile)],
    [FRENCH_101_STAGE_IDS[1], core.coreCurriculum],
    [FRENCH_101_STAGE_IDS[2], stageCurriculumFromFile(master.masterStageFragment)],
  ]);
  const supports = new Map<StageId, Sidecar[]>([
    [FRENCH_101_STAGE_IDS[0], foundation.support],
    [FRENCH_101_STAGE_IDS[1], core.support],
    [FRENCH_101_STAGE_IDS[2], master.support],
  ]);
  const cache = new Map<string, ModuleCurriculum | null>();

  function stage(id: string, pair: Pair): ModuleCurriculum | null {
    if (!exactPair(pair)) return null;
    const key = `${pair.target}:${pair.native}:${id}`;
    if (!cache.has(key)) cache.set(key, curricula.get(id as StageId) ?? null);
    return cache.get(key) ?? null;
  }

  function activity(id: string, lessonNumber: number, pair: Pair): Sidecar | null {
    if (!stage(id, pair)) return null;
    const index = lessonNumber - 1;
    if (!Number.isInteger(index) || index < 0) return null;
    return supports.get(id as StageId)?.[index] ?? null;
  }

  return {
    releaseEnabled: FRENCH_101_RELEASE_ENABLED,
    pair: FRENCH_101_PAIR,
    catalog,
    stage,
    activity,
    /** Proposed IDs only; the shipped offline allowlist is deliberately unchanged. */
    candidateOfflinePackIds: FRENCH_101_STAGE_IDS.map((id) => `${id}-fr-en`),
    supportsPair: (pair: Pair) => exactPair(pair) && catalog.every((module) => moduleSupportsLearningPair(module, pair.target as "French", pair.native as "English")),
  };
}

/** No caller can turn these drafts into a learner-facing course through this adapter. */
export function releasedFrench101(): null {
  return null;
}
