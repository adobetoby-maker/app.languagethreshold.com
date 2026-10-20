// Built by TAC — 2026-10-19
// React side of the Core 60 stage registry (src/data/core60-stages.ts): loads a data-driven stage's
// curriculum chunk when its module is opened and re-renders when it arrives, so the many
// synchronous getCurriculum() callers see it on the next render.
import { useEffect, useState } from "react";
import {
  loadStageCurriculum,
  stageCurriculaVersion,
  stageCurriculumStatus,
  subscribeStageCurricula,
  type StageCurriculumStatus,
} from "@/data/core60-stages";

/** Re-renders whenever any stage curriculum settles; returns the registry version. */
export function useStageCurriculaVersion(): number {
  const [, setVersion] = useState(stageCurriculaVersion);
  useEffect(() => {
    const unsubscribe = subscribeStageCurricula(() => setVersion(stageCurriculaVersion()));
    // A curriculum may have settled between the render and this subscription.
    setVersion(stageCurriculaVersion());
    return unsubscribe;
  }, []);
  return stageCurriculaVersion();
}

/**
 * "none" for every module that is not a data-driven stage (nothing to wait for), else "loading"
 * until its curriculum is in the registry ("ready") or known to be absent ("unavailable").
 */
export function useStageCurriculum(moduleId: string | null | undefined): StageCurriculumStatus {
  useStageCurriculaVersion();
  const status = stageCurriculumStatus(moduleId);
  const wanted = status === "loading" || status === "unavailable";
  // loading and unavailable both want a load, so a failed load retries when the module is opened
  // again, not on every render.
  useEffect(() => {
    if (moduleId && wanted) void loadStageCurriculum(moduleId);
  }, [moduleId, wanted]);
  return status;
}
