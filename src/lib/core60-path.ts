// Built by TAC — 2026-10-19
// The Core 60 path: a trade's three stages in order (a free Foundation, the Core 30, the Master 20).
// Each stage is its own module with its own lesson numbers (Foundation 1-10, Core 1-30, Master
// 1-20). Pure data and lookups, so the path card (AppGuide) and its tests share one definition.
// Roofing's path is the hand-written row in CORE60_PATHS. Every other trade gets its path from the
// Core 60 manifest (src/data/core60/manifest.ts): listing a trade's Foundation and/or Master there
// is enough; a stage that is not listed yet shows "Coming soon" and cannot be opened.

import { isFoundationModule, isMasterModule } from "./core30-plan.ts";
import { getCurriculum } from "../data/curriculum.ts";
import { getModule } from "../data/modules.ts";
import { core60Manifest } from "../data/core60-stages.ts";
import { stageModuleId, type Core60ManifestEntry } from "./core60-stage-core.ts";

export type Core60Stage = "foundation" | "core" | "master";

export interface Core60PathConfig {
  /** Label of the trade's Core 30 ("Roofing"). */
  tradeLabel: string;
  foundationId: string;
  masterId: string;
  /** Lessons per stage, shown before a stage's curriculum has loaded or exists. */
  lessons: Record<Core60Stage, number>;
  /** Which stages exist. A missing one is shown as "Coming soon". Absent = both exist. */
  available?: Record<"foundation" | "master", boolean>;
}

/** Hand-written rows, keyed by the trade's Core 30 module id (roofing). Manifest trades: core60Paths(). */
export const CORE60_PATHS: Record<string, Core60PathConfig> = {
  roofing: {
    tradeLabel: "Roofing",
    foundationId: "foundation-roofing",
    masterId: "master-roofing",
    lessons: { foundation: 10, core: 30, master: 20 },
  },
};

/** A path row for each manifest trade (skipping trades with a hand-written row or no module). */
export function core60PathsFromManifest(
  manifest: readonly Core60ManifestEntry[],
  handWritten: Record<string, Core60PathConfig> = CORE60_PATHS,
): Record<string, Core60PathConfig> {
  const out: Record<string, Core60PathConfig> = {};
  for (const entry of manifest) {
    const base = getModule(entry.base);
    if (!base || handWritten[entry.base] || out[entry.base]) continue;
    out[entry.base] = {
      tradeLabel: entry.tradeLabel ?? base.name,
      foundationId: stageModuleId("foundation", entry.base),
      masterId: stageModuleId("master", entry.base),
      lessons: {
        foundation: 10,
        core: getCurriculum(entry.base)?.lessons.length ?? 30,
        master: 20,
      },
      available: { foundation: Boolean(entry.foundation), master: Boolean(entry.master) },
    };
  }
  return out;
}

let allPaths: Record<string, Core60PathConfig> | null = null;

/** Every trade's path: the hand-written rows, then one per manifest trade. */
export function core60Paths(): Record<string, Core60PathConfig> {
  allPaths ??= { ...CORE60_PATHS, ...core60PathsFromManifest(core60Manifest()) };
  return allPaths;
}

export interface Core60Step {
  stage: Core60Stage;
  moduleId: string;
  /** "Foundation · 10 lessons · free" */
  label: string;
  lessons: number;
  /** False for a stage that does not exist yet: shown as "Coming soon", not clickable. */
  available: boolean;
}

export interface Core60Path {
  tradeModuleId: string;
  tradeLabel: string;
  current: Core60Stage;
  steps: Core60Step[];
}

/** The path a module sits on (any of its three stages), or null when its trade has none. */
export function core60PathOf(
  moduleId: string | null | undefined,
  paths: Record<string, Core60PathConfig> = core60Paths(),
): Core60Path | null {
  if (!moduleId) return null;
  for (const [tradeModuleId, config] of Object.entries(paths)) {
    const available = config.available ?? { foundation: true, master: true };
    let current: Core60Stage | null = null;
    if (moduleId === config.foundationId && available.foundation) current = "foundation";
    else if (moduleId === tradeModuleId) current = "core";
    else if (moduleId === config.masterId && available.master) current = "master";
    if (!current) continue;
    return {
      tradeModuleId,
      tradeLabel: config.tradeLabel,
      current,
      steps: [
        {
          stage: "foundation",
          moduleId: config.foundationId,
          label: `Foundation · ${config.lessons.foundation} lessons · free`,
          lessons: config.lessons.foundation,
          available: available.foundation,
        },
        {
          stage: "core",
          moduleId: tradeModuleId,
          label: `Core 30 · ${config.lessons.core} lessons`,
          lessons: config.lessons.core,
          available: true,
        },
        {
          stage: "master",
          moduleId: config.masterId,
          label: `Master 20 · ${config.lessons.master} lessons`,
          lessons: config.lessons.master,
          available: available.master,
        },
      ],
    };
  }
  return null;
}

/** True when the module's trade has a path whose three stages all exist (the full banner text). */
export function core60PathComplete(moduleId: string | null | undefined): boolean {
  const path = core60PathOf(moduleId);
  return Boolean(path && path.steps.every((step) => step.available));
}

/** "Foundation" / "Master" for those stages' modules, null for a Core 30 module. */
export function core60StageName(moduleId: string | null | undefined): "Foundation" | "Master" | null {
  if (isFoundationModule(moduleId)) return "Foundation";
  if (isMasterModule(moduleId)) return "Master";
  return null;
}

/**
 * The entrance, day 45 and day 90 exams and the "How Core 30 works" page belong to the Core 30.
 * A Foundation and a Master have their own checkpoints (not built yet), so they hide both.
 */
export function hasCore30Checkpoints(moduleId: string | null | undefined): boolean {
  return core60StageName(moduleId) === null;
}

/** The beginner nudge ("New to Spanish? Start here.") shows on the Core 30 page until the Foundation is mastered. */
export function showFoundationNudge(path: Core60Path, foundationMastered: number): boolean {
  return (
    path.current === "core" &&
    Boolean(path.steps[0]?.available) &&
    foundationMastered < (path.steps[0]?.lessons ?? 0)
  );
}

/**
 * A lesson's name on a button: "Master Lesson 3" / "Foundation Lesson 3", and plain "Lesson 3" for
 * a Core 30 module (its labels do not change).
 */
export function stageLessonLabel(moduleId: string | null | undefined, n: number): string {
  const stage = core60StageName(moduleId);
  return stage ? `${stage} Lesson ${n}` : `Lesson ${n}`;
}

/** The short form for the lesson runner's previous / next buttons: "Master 3", "Foundation 3", "Lesson 3". */
export function stageLessonShort(moduleId: string | null | undefined, n: number): string {
  return core60StageName(moduleId) ? `${core60StageName(moduleId)} ${n}` : `Lesson ${n}`;
}

/** The eyebrow above a stage page's heading: "Core 60 · Roofing · Step 2 of 3". Null off the path. */
export function core60Eyebrow(path: Core60Path): string {
  const step = path.steps.findIndex((s) => s.stage === path.current) + 1;
  return `Core 60 · ${path.tradeLabel} · Step ${step} of ${path.steps.length}`;
}

/** The page banner for a Core 30 module whose trade does not have both its Foundation and Master yet. */
export const CORE30_WITHOUT_PATH_TEXT =
  "Core 30 is ready for this module. The free Foundation and Master 20 are coming soon.";
