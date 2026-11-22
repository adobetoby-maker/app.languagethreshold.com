import { examLessonNumber } from "@/lib/exam-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { readProfileSnapshot } from "@/lib/profile-device-snapshot";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExamsArea } from "@/components/exams/ExamsArea";
import { Exams2Page } from "@/components/exams2/Exams2Page";
import { FreeSpanishExams } from "@/components/exams/FreeSpanishExams";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { defaultNativeFor } from "@/lib/language-menu";
import {
  historicalCoursePack,
  historicalCoursePair,
  packFor,
} from "@/data/language-packs/registry";
import { catalogLessonPack } from "@/data/language-packs/catalog-lessons";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const Route = createFileRoute("/exams")({
  head: ({ match }) => ({
    meta: [
      {
        // French and Italian name their own language; every other link keeps the title it has
        // always had (the historical course's).
        title: `Free ${(catalogLessonPack(match.search.target) ?? historicalCoursePack()).name} Placement Test | Language Threshold`,
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    test: search.test === "post-core" ? ("post-core" as const) : ("placement" as const),
    fromPlan:
      typeof search.module === "string" &&
      typeof search.fromPlan === "string" &&
      uuid.test(search.fromPlan)
        ? search.fromPlan
        : undefined,
    lesson: typeof search.module === "string" ? examLessonNumber(search.lesson) : undefined,
    way:
      typeof search.way === "string" &&
      ["see", "recall", "hear", "type", "say", "write"].includes(search.way)
        ? search.way
        : undefined,
    org: typeof search.org === "string" && uuid.test(search.org) ? search.org : undefined,
    session:
      typeof search.session === "string" && uuid.test(search.session) ? search.session : undefined,
    attempt:
      typeof search.attempt === "string" && uuid.test(search.attempt) ? search.attempt : undefined,
    review:
      search.review === true || search.review === "1" || search.review === 1 ? true : undefined,
    module: typeof search.module === "string" ? search.module : undefined,
    // A link without a target is resolved on the page (useSavedCoursePair): a saved French or
    // Italian learner's own language, otherwise the historical course's exams, as it always has.
    target: LANGUAGES.includes(search.target as Language) ? (search.target as Language) : undefined,
    native: NATIVE_LANGUAGES.includes(search.native as NativeLanguage)
      ? (search.native as NativeLanguage)
      : (historicalCoursePair().native as NativeLanguage),
  }),
  component: ExamsPage,
});
function ExamsPage() {
  return (
    <AuthProvider>
      <ExamsPageContent />
    </AuthProvider>
  );
}

/**
 * A link with no target (bare /exams, or the legacy /?tab=exams redirect) opens the historical
 * course's exams, as it always has — except for a saved French or Italian learner, whose own
 * language replaces the missing pair. Spanish and every other learner keep the base page.
 */
function useSavedCoursePair(enabled: boolean): void {
  const { user, loading } = useAuth();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (!enabled || loading) return;
    let saved: { selectedLanguage?: unknown; nativeLanguage?: unknown } | null = null;
    try {
      saved = readProfileSnapshot(window.localStorage, user?.id ?? null);
    } catch {
      saved = null;
    }
    const pack = catalogLessonPack(
      typeof saved?.selectedLanguage === "string" ? saved.selectedLanguage : null,
    );
    const historical = historicalCoursePair();
    const target = (pack ? pack.name : historical.target) as Language;
    const native = pack
      ? NATIVE_LANGUAGES.includes(saved?.nativeLanguage as NativeLanguage)
        ? (saved?.nativeLanguage as NativeLanguage)
        : (defaultNativeFor(pack.name) ?? (historical.native as NativeLanguage))
      : undefined;
    void navigate({
      // Same key order as a validated link: …, target, native.
      search: ({ native: linkNative, ...prev }) => ({
        ...prev,
        target,
        native: native ?? linkNative,
      }),
      replace: true,
    });
  }, [enabled, loading, user?.id, navigate]);
}

function ExamsPageContent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // The previous exams page. Links that carry its own parameters (a plan, an attempt, a review, a
  // team) always open it; otherwise it shows only while the v2 switch is off.
  const legacyExams = Boolean(search.attempt || search.review || search.org || search.fromPlan);
  const resolvingPair = !legacyExams && !search.session && !search.target;
  useSavedCoursePair(resolvingPair);
  // Links that skip the resolution (a plan, attempt, review, team or session) keep the historical
  // course's target, as they always have.
  const target = search.target ?? (historicalCoursePair().target as Language);
  const exams = (
    <ExamsArea
      moduleId={search.module}
      initialModuleFilter={search.module}
      targetLanguage={target}
      instructionLanguage={search.native}
      orgId={search.org}
      attemptId={search.attempt}
      reviewMode={search.review}
      returnPlanId={search.fromPlan}
      returnLesson={search.lesson}
      returnWay={search.way}
    />
  );
  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <a href="/" className="font-serif text-xl text-gold">
          Language Threshold
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthButton />
        </div>
      </header>
      <main>
        {resolvingPair ? (
          <p className="mx-auto max-w-5xl text-sm text-muted-foreground" role="status">
            Loading exams…
          </p>
        ) : (
          <>
            {!legacyExams &&
              !search.session &&
              search.native &&
              packFor(target)?.features.placementGame &&
              search.native === defaultNativeFor(target) && (
                <FreeSpanishExams
                  target={target}
                  native={search.native}
                  initialModule={search.module}
                  initialMode={search.test}
                />
              )}
            {legacyExams ? (
              exams
            ) : (
              <Exams2Page
                legacy={exams}
                target={target}
                native={search.native}
                moduleId={search.module}
                sessionId={search.session}
                onModuleChange={(module) =>
                  void navigate({ search: (prev) => ({ ...prev, module, session: undefined }) })
                }
                onSessionChange={(session) =>
                  void navigate({ search: (prev) => ({ ...prev, session }) })
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
