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
import {
  catalogCurriculaVersion,
  catalogLessonPack,
  loadCatalogCurriculum,
  loadedCatalogCurriculum,
  subscribeCatalogCurricula,
} from "@/data/language-packs/catalog-lessons";

/** Re-renders whenever any stage curriculum settles; returns the registry version. */
export function useStageCurriculaVersion(): number {
  const current = () => stageCurriculaVersion() * 100_000 + catalogCurriculaVersion();
  const [, setVersion] = useState(current);
  useEffect(() => {
    const update = () => setVersion(current());
    const unsubscribe = subscribeStageCurricula(update);
    // Catalog curricula (packs whose lessons come from their catalog) settle the same way.
    const unsubscribeCatalog = subscribeCatalogCurricula(update);
    // A curriculum may have settled between the render and this subscription.
    update();
    return () => {
      unsubscribe();
      unsubscribeCatalog();
    };
  }, []);
  return current();
}

/**
 * "none" for every module that is not a data-driven stage (nothing to wait for), else "loading"
 * until its curriculum is in the registry ("ready") or known to be absent ("unavailable").
 */
export function useStageCurriculum(
  moduleId: string | null | undefined,
  targetLanguage?: string,
  nativeLanguage?: string,
): StageCurriculumStatus {
  useStageCurriculaVersion();
  // A pack whose lessons come from its catalog: every module of it waits on its catalog file.
  const catalogPack = catalogLessonPack(targetLanguage);
  const catalogState =
    catalogPack && moduleId ? loadedCatalogCurriculum(moduleId, catalogPack) : null;
  useEffect(() => {
    if (catalogPack && moduleId && catalogState === undefined)
      void loadCatalogCurriculum(moduleId, catalogPack);
  }, [catalogPack, moduleId, catalogState]);
  const status: StageCurriculumStatus = catalogPack
    ? !moduleId
      ? "none"
      : catalogState === undefined
        ? "loading"
        : catalogState
          ? "ready"
          : "unavailable"
    : stageCurriculumStatus(moduleId, targetLanguage, nativeLanguage);
  const wanted = status === "loading" || status === "unavailable";
  // loading and unavailable both want a load, so a failed load retries when the module is opened
  // again, not on every render.
  useEffect(() => {
    if (moduleId && wanted && !catalogPack)
      void loadStageCurriculum(moduleId, { targetLanguage, nativeLanguage });
  }, [moduleId, wanted, targetLanguage, nativeLanguage, catalogPack]);
  return status;
}
