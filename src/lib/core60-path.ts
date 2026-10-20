// Built by TAC — 2026-10-19
// The Core 60 path: a trade's three stages in order (a free Foundation, the Core 30, the Master 20).
// Each stage is its own module with its own lesson numbers (Foundation 1-10, Core 1-30, Master
// 1-20). Pure data and lookups, so the path card (AppGuide) and its tests share one definition.
// Another trade gets a path by adding a row to CORE60_PATHS (and its foundation-/master- modules).

import { isFoundationModule, isMasterModule } from "./core30-plan.ts";

export type Core60Stage = "foundation" | "core" | "master";

export interface Core60PathConfig {
  /** Label of the trade's Core 30 ("Roofing"). */
  tradeLabel: string;
  foundationId: string;
  masterId: string;
  /** Lessons per stage, shown before a stage's curriculum has loaded or exists. */
  lessons: Record<Core60Stage, number>;
}

/** Keyed by the trade's Core 30 module id. Roofing only for now. */
export const CORE60_PATHS: Record<string, Core60PathConfig> = {
  roofing: {
    tradeLabel: "Roofing",
    foundationId: "foundation-roofing",
    masterId: "master-roofing",
    lessons: { foundation: 10, core: 30, master: 20 },
  },
};

export interface Core60Step {
  stage: Core60Stage;
  moduleId: string;
  /** "Foundation · 10 lessons · free" */
  label: string;
  lessons: number;
}

export interface Core60Path {
  tradeModuleId: string;
  tradeLabel: string;
  current: Core60Stage;
  steps: Core60Step[];
}

/** The path a module sits on (any of its three stages), or null when its trade has none. */
export function core60PathOf(moduleId: string | null | undefined): Core60Path | null {
  if (!moduleId) return null;
  for (const [tradeModuleId, config] of Object.entries(CORE60_PATHS)) {
    let current: Core60Stage | null = null;
    if (moduleId === config.foundationId) current = "foundation";
    else if (moduleId === tradeModuleId) current = "core";
    else if (moduleId === config.masterId) current = "master";
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
        },
        {
          stage: "core",
          moduleId: tradeModuleId,
          label: `Core 30 · ${config.lessons.core} lessons`,
          lessons: config.lessons.core,
        },
        {
          stage: "master",
          moduleId: config.masterId,
          label: `Master 20 · ${config.lessons.master} lessons`,
          lessons: config.lessons.master,
        },
      ],
    };
  }
  return null;
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
  return path.current === "core" && foundationMastered < (path.steps[0]?.lessons ?? 0);
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

/** The page banner for a Core 30 module whose trade has no Foundation and Master yet. */
export const CORE30_WITHOUT_PATH_TEXT =
  "Core 30 is ready for this module. The free Foundation and Master 20 are coming soon.";
