import { examLessonNumber } from "@/lib/exam-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExamsArea } from "@/components/exams/ExamsArea";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const Route = createFileRoute("/exams")({
  head: () => ({
    meta: [
      { title: "Exams | Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
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
    attempt:
      typeof search.attempt === "string" && uuid.test(search.attempt) ? search.attempt : undefined,
    review:
      search.review === true || search.review === "1" || search.review === 1 ? true : undefined,
    module: typeof search.module === "string" ? search.module : undefined,
    target: LANGUAGES.includes(search.target as Language)
      ? (search.target as Language)
      : ("Spanish" as Language),
    native: NATIVE_LANGUAGES.includes(search.native as NativeLanguage)
      ? (search.native as NativeLanguage)
      : ("English" as NativeLanguage),
  }),
  component: ExamsPage,
});
function ExamsPage() {
  const search = Route.useSearch();
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
        </main>
      </div>
    </AuthProvider>
  );
}
