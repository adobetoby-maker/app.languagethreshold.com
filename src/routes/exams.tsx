import { examLessonNumber } from "@/lib/exam-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExamsArea } from "@/components/exams/ExamsArea";
import { Exams2Page } from "@/components/exams2/Exams2Page";
import { FreeSpanishExams } from "@/components/exams/FreeSpanishExams";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { defaultNativeFor, languageOptions } from "@/lib/language-menu";
import { packFor } from "@/data/language-packs/registry";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const Route = createFileRoute("/exams")({
  head: ({ match }) => ({
    meta: [
      {
        title: `Free ${packFor(match.search.target)?.name ?? "Language"} Placement Test | Language Threshold`,
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
    // No default pair: a link without a target (or native) opens the page asking for it.
    target: LANGUAGES.includes(search.target as Language) ? (search.target as Language) : undefined,
    native: NATIVE_LANGUAGES.includes(search.native as NativeLanguage)
      ? (search.native as NativeLanguage)
      : undefined,
  }),
  component: ExamsPage,
});
function ExamsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // The previous exams page. Links that carry its own parameters (a plan, an attempt, a review, a
  // team) always open it; otherwise it shows only while the v2 switch is off.
  const legacyExams = Boolean(search.attempt || search.review || search.org || search.fromPlan);
  const exams = (
    <ExamsArea
      moduleId={search.module}
      initialModuleFilter={search.module}
      targetLanguage={search.target}
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
    <AuthProvider>
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
          {!legacyExams &&
            !search.session &&
            search.target &&
            search.native &&
            packFor(search.target)?.features.placementGame &&
            search.native === defaultNativeFor(search.target) && (
              <FreeSpanishExams
                target={search.target}
                native={search.native}
                initialModule={search.module}
                initialMode={search.test}
              />
            )}
          {legacyExams ? (
            exams
          ) : !search.target || !search.native ? (
            <ExamsLanguageChooser
              onChoose={(target, native) =>
                void navigate({ search: (prev) => ({ ...prev, target, native, session: undefined }) })
              }
            />
          ) : (
            <Exams2Page
              legacy={exams}
              target={search.target}
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
        </main>
      </div>
    </AuthProvider>
  );
}

/** Shown when /exams is opened without a learning pair: the learner picks it (no default pair). */
function ExamsLanguageChooser({
  onChoose,
}: {
  onChoose: (target: Language, native: NativeLanguage) => void;
}) {
  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-border bg-card/50 p-6">
      <h1 className="font-serif text-2xl">Choose the language you are learning</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Exams are written for one language pair. Pick yours to see its checks.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {languageOptions().map((option) => {
          const native = defaultNativeFor(option.id);
          if (!native) return null;
          return (
            <button
              key={option.id}
              type="button"
              className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-left hover:border-gold/60"
              onClick={() => onChoose(option.id, native)}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.native}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
