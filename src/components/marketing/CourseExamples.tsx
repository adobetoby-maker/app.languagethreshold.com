import { programLevelSummary } from "@/data/program-levels";
import examples from "@/data/comparison-highlights.generated.json";
export function CourseExamples() {
  return (
    <section className="mt-10" aria-labelledby="real-course-examples">
      <h2 id="real-course-examples" className="text-2xl font-semibold">
        See what you will actually practice
      </h2>
      <p className="mt-3 text-muted-foreground">
        Real lessons from our Spanish courses. Read the example, hear the recording and try the
        conversation.
      </p>
      <p className="mt-3 font-semibold text-gold-ink">{programLevelSummary}</p>
      <a
        href="/scenarios"
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
      >
        See scenarios by role and level →
      </a>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {examples.map((course) => (
          <article key={course.id} className="rounded-xl border border-border bg-background p-5">
            <p className="font-semibold text-gold-ink">
              {course.name} · {course.count} lessons
            </p>
            <h3 className="mt-3 text-lg font-semibold">{course.sample?.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{course.sample?.objective}</p>
            {course.sample?.phrase && (
              <div className="mt-4 space-y-2">
                <p lang="es" className="font-semibold">
                  {course.sample.phrase.target}
                </p>
                <p className="text-sm text-muted-foreground">{course.sample.phrase.english}</p>
                {course.sample.phrase.audio && (
                  <audio
                    controls
                    preload="none"
                    src={course.sample.phrase.audio}
                    aria-label={`${course.name} Spanish recording`}
                    className="w-full"
                  />
                )}
              </div>
            )}
            <p className="mt-4 text-sm leading-relaxed">
              <strong>Say it:</strong> {course.sample?.speaking}
            </p>
            <a
              href={`/?tab=core30&module=${course.id}&target=Spanish&native=English&lesson=1`}
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
            >
              Open the lesson →
            </a>
          </article>
        ))}
      </div>
      <a
        href="/compare"
        className="mt-5 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
      >
        Compare roles, levels and lessons across all four products →
      </a>
    </section>
  );
}
