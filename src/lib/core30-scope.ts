import { mergeCore30Log, type Core30Log } from "./core30-plan.ts";

export interface Core30ProgressContext {
  targetLanguage: string;
  instructionLanguage: string;
  /** Omitted for independent practice; an enrollment never inherits another plan's record. */
  enrollmentId?: string;
}

export function core30ScopeKey(moduleId: string, context: Core30ProgressContext): string {
  return JSON.stringify([
    "core30",
    1,
    moduleId,
    context.targetLanguage,
    context.instructionLanguage,
    context.enrollmentId ?? null,
  ]);
}

/** Older module-only records remain untouched until the learner identifies their context. */
export function claimLegacyCore30(
  log: Core30Log,
  progress: Record<string, number>,
  moduleId: string,
  context: Core30ProgressContext,
  at: string,
) {
  const key = core30ScopeKey(moduleId, context);
  if (log[key]?.legacyImportedAt) return { log, progress };
  const legacy = log[moduleId];
  const oldCount = progress[moduleId];
  const completed = Number.isInteger(oldCount) && oldCount >= 0 ? oldCount : 0;
  if (!legacy && !completed) return { log, progress };
  return {
    log: mergeCore30Log(log, {
      [key]: { ...legacy, lessons: legacy?.lessons ?? {}, legacyImportedAt: at },
    }),
    progress: { ...progress, [key]: Math.max(progress[key] ?? 0, completed) },
  };
}
