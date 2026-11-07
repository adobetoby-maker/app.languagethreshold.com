import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import catalog from "@/data/comparison-catalog.generated.json";
import {
  comparisonSources,
  medicalOverlap,
  recommendations,
} from "@/data/competitor-role-coverage";
import { ProductFooter } from "@/components/marketing/BuyerInformation";

export const Route = createFileRoute("/compare")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/compare" }],
    meta: [
      { title: "Compare language courses by job and lesson coverage | Language Threshold" },
      {
        name: "description",
        content:
          "Compare Language Threshold, Duolingo, ClinicaLingo and CanopyLearn by medical specialty, trade, sports role, course progression and lesson counts. Try actual lessons and recorded Spanish.",
      },
      { property: "og:title", content: "Find language practice for your daily work" },
      {
        property: "og:description",
        content:
          "Compare real job coverage, lesson counts and course progression. Read a lesson, hear the Spanish and open speaking practice.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/compare" },
      { name: "twitter:title", content: "Compare language courses by job" },
      {
        name: "twitter:description",
        content:
          "Medical specialties, trades, coaching and sports: compare coverage and try a lesson.",
      },
    ],
  }),
  component: CompareCourses,
});
const categories = ["Medical", "Trades", "Sports"] as const;
type Category = (typeof categories)[number];
const learningUrl = (id: string, tab = "core30") =>
  `/?tab=${tab}&module=${encodeURIComponent(id)}&target=Spanish&native=English`;

function CompareCourses() {
  const [category, setCategory] = useState<Category>("Medical");
  const [selectedId, setSelectedId] = useState("nursing");
  const [goal, setGoal] = useState("daily");
  const selected = catalog.courses.find((c) => c.id === selectedId) ?? catalog.courses[0];
  const rows = catalog.courses.filter((c) => c.category === category);
  const advice = recommendations.find((r) => r.id === goal) ?? recommendations[0];
  const audio = useRef<HTMLAudioElement>(null);
  const [audioError, setAudioError] = useState("");
  const chooseCourse = (id: string) => {
    audio.current?.pause();
    setSelectedId(id);
    setAudioError("");
  };
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-7xl">
        <a href="/" className="inline-flex min-h-11 items-center text-gold-ink underline">
          ← Language Threshold
        </a>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold sm:text-5xl">
          Compare the language practice your work needs.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Start with your role. See the lesson coverage, compare how each course progresses, and try
          an actual Language Threshold lesson.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Spanish for English-speaking learners. Competitor sources checked November 7, 2026.
        </p>

        <section className="mt-10" aria-labelledby="course-progression">
          <h2 id="course-progression" className="text-2xl font-semibold">
            Course level and job coverage answer different questions
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            B2 describes general language ability. A job course shows which conversations you
            practice. Compare both.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Language Threshold",
                "Foundation → Core → Master",
                "Role-specific beginner, core and advanced practice: 10 + 30 + 20 lessons.",
              ],
              [
                "Duolingo",
                "General Spanish through B2",
                "CEFR-aligned language progression. The linked course guide does not give a fixed lesson total.",
              ],
              [
                "ClinicaLingo",
                "Encounter-based practice",
                "29 free clinical encounters organized around specific situations.",
              ],
              [
                "CanopyLearn",
                "Three medical course levels",
                "36 lessons, about 45 hours, combining clinical vocabulary, grammar and culture.",
              ],
            ].map(([name, level, text]) => (
              <div key={name} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">{name}</h3>
                <p className="mt-3 font-semibold text-gold-ink">{level}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="role-coverage">
          <h2 id="role-coverage" className="text-2xl font-semibold">
            Compare by role
          </h2>
          <div className="mt-4 flex flex-wrap gap-3" aria-label="Course categories">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`min-h-11 rounded-xl border px-5 py-3 font-semibold ${category === c ? "border-gold bg-gold text-background" : "border-border bg-card"}`}
              >
                {c === "Sports" ? "Coaching & sports" : c}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Dedicated course counts include Foundation, Core and Master. Related topics belong to a
            shared course; their counts are not additive. A scenario, lesson and general-language
            unit are different sizes.
          </p>
          <p className="mt-3 text-sm font-semibold">
            On a phone, swipe across the table to see all four products.
          </p>
          <div
            role="region"
            aria-label="Role and lesson comparison table"
            tabIndex={0}
            className="mt-3 overflow-x-auto rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
              <thead className="bg-card">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-[180px] bg-card p-4">
                    Role / coverage
                  </th>
                  {["Language Threshold", "Duolingo", "ClinicaLingo", "CanopyLearn"].map((name) => (
                    <th scope="col" key={name} className="p-4">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-card">
                  <th scope="row" className="sticky left-0 bg-card p-4">
                    {category === "Medical"
                      ? "Medical Spanish"
                      : category === "Sports"
                        ? "Sports & coaching"
                        : "Trade Spanish"}
                  </th>
                  <td className="p-4 font-semibold">
                    {rows.reduce((n, c) => n + c.count, 0).toLocaleString()} lessons across{" "}
                    {rows.length} courses
                  </td>
                  <td className="p-4">
                    General Spanish; no role-specific lesson total in the linked guides
                  </td>
                  <td className="p-4">
                    {category === "Medical" ? "29 free clinical scenarios" : "Medical scenarios"}
                  </td>
                  <td className="p-4">
                    {category === "Medical"
                      ? "36 medical lessons / 3 levels"
                      : "Medical Spanish course"}
                  </td>
                </tr>
                {rows.map((course) => (
                  <tr key={course.id}>
                    <th scope="row" className="sticky left-0 bg-background p-4">
                      <button
                        type="button"
                        onClick={() => {
                          chooseCourse(course.id);
                          document
                            .getElementById("try-a-lesson")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="min-h-11 text-left font-semibold underline underline-offset-4"
                      >
                        {course.name}
                      </button>
                    </th>
                    <td className="p-4">
                      <strong>{course.count} dedicated lessons</strong>
                      <span className="mt-1 block text-muted-foreground">
                        {course.stages.map((s) => `${s.lessons.length} ${s.name}`).join(" · ")}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">General Spanish</td>
                    <td className="p-4 text-muted-foreground">
                      {medicalOverlap[course.id]?.clinicalingo ?? "Medical scenarios"}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {medicalOverlap[course.id]?.canopy ?? "Medical Spanish course"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="try-a-lesson" className="mt-12 scroll-mt-5" aria-labelledby="lesson-preview">
          <h2 id="lesson-preview" className="text-3xl font-semibold">
            See the lesson. Hear it. Practice it.
          </h2>
          <label htmlFor="preview-course" className="mt-5 block font-semibold">
            Choose your role
          </label>
          <select
            id="preview-course"
            value={selected.id}
            onChange={(event) => chooseCourse(event.target.value)}
            className="mt-2 min-h-12 w-full max-w-xl rounded-xl border border-border bg-card px-4 py-3 text-foreground"
          >
            {categories.map((c) => (
              <optgroup key={c} label={c}>
                {catalog.courses
                  .filter((course) => course.category === c)
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} — {course.count} lessons
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-3 text-muted-foreground">Roles: {selected.role}</p>
          {selected.sample && (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="font-semibold text-gold-ink">
                  Core lesson {selected.sample.n} · {selected.name}
                </p>
                <h3 className="mt-3 text-2xl font-semibold">{selected.sample.title}</h3>
                <p className="mt-3 leading-relaxed">{selected.sample.objective}</p>
                {selected.sample.phrase && (
                  <div className="mt-5 space-y-3 border-t border-border pt-5">
                    <p className="text-lg" lang="es">
                      {selected.sample.phrase.target}
                    </p>
                    <p className="text-muted-foreground">{selected.sample.phrase.english}</p>
                    {selected.sample.phrase.audio && (
                      <>
                        <audio
                          key={selected.id}
                          ref={audio}
                          controls
                          preload="none"
                          src={selected.sample.phrase.audio}
                          aria-label={`Recorded Spanish from ${selected.name}`}
                          onError={() =>
                            setAudioError(
                              "The recording could not load. You can still open the lesson below.",
                            )
                          }
                          className="w-full"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (audio.current) {
                              audio.current.currentTime = 0;
                              void audio.current
                                .play()
                                .catch(() =>
                                  setAudioError("Press play on the recording to listen."),
                                );
                            }
                          }}
                          className="min-h-11 rounded-lg border border-border px-4 py-2 font-semibold"
                        >
                          Replay recording
                        </button>
                      </>
                    )}
                    {audioError && <p role="status">{audioError}</p>}
                  </div>
                )}
                <a
                  href={`${learningUrl(selected.id)}&lesson=${selected.sample.n}`}
                  className="mt-5 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
                >
                  Open this lesson →
                </a>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-2xl font-semibold">Now say it</h3>
                <p className="mt-4 leading-relaxed">{selected.sample.speaking}</p>
                <p className="mt-5 text-muted-foreground">
                  This is a speaking task from the course. Open speaking practice to work through
                  your response.
                </p>
                {selected.advanced && (
                  <div className="mt-5 border-t border-border pt-5">
                    <p className="font-semibold text-gold-ink">
                      As you progress · Master lesson {selected.advanced.n}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold">{selected.advanced.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed">{selected.advanced.speaking}</p>
                    <a
                      href={`${learningUrl(`master-${selected.id}`)}&lesson=${selected.advanced.n}`}
                      className="mt-3 inline-flex min-h-11 items-center font-semibold underline"
                    >
                      See the advanced lesson →
                    </a>
                  </div>
                )}
                <a
                  href={learningUrl(selected.id, "speak")}
                  className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-gold px-5 py-3 font-semibold text-background"
                >
                  Open speaking practice →
                </a>
              </div>
            </div>
          )}
          <details key={selected.id} className="mt-5 rounded-xl border border-border bg-card p-5">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              See all {selected.count} lessons in {selected.name}
            </summary>
            <div className="mt-5 grid gap-6 lg:grid-cols-3">
              {selected.stages.map((stage) => (
                <div key={stage.id}>
                  <h3 className="text-xl font-semibold">
                    {stage.name} · {stage.lessons.length} lessons
                  </h3>
                  <ol className="mt-3 list-decimal space-y-2 pl-6">
                    {stage.lessons.map((lesson) => (
                      <li key={lesson.n}>
                        <a
                          className="underline underline-offset-2"
                          href={`${learningUrl(stage.id)}&lesson=${lesson.n}`}
                        >
                          {lesson.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section
          className="mt-12 rounded-2xl border border-border bg-card p-6"
          aria-labelledby="our-recommendation"
        >
          <h2 id="our-recommendation" className="text-2xl font-semibold">
            Our recommendation: choose by your next conversation
          </h2>
          <label htmlFor="comparison-goal" className="mt-5 block font-semibold">
            What do you need most?
          </label>
          <select
            id="comparison-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          >
            {recommendations.map((r) => (
              <option value={r.id} key={r.id}>
                {r.goal}
              </option>
            ))}
          </select>
          <h3 className="mt-5 text-xl font-semibold">{advice.product}</h3>
          <p className="mt-2 leading-relaxed">{advice.reason}</p>
          <a
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
            href={advice.href}
          >
            {goal === "daily" ? "Try a role lesson" : "See the published course information"} →
          </a>
        </section>

        <section className="mt-10" aria-labelledby="comparison-evidence">
          <h2 id="comparison-evidence" className="text-xl font-semibold">
            Where the comparison comes from
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Language Threshold counts and previews come from the Spanish/English courses shipped in
            this app. Each lesson is counted once within its role course. Coaching roles use the
            sports course shown; they are not counted as separate courses. Related competitor topics
            describe overlap, not the same dedicated curriculum.
          </p>
          <nav aria-label="Comparison sources" className="mt-3 flex flex-wrap gap-4">
            <a href={comparisonSources.duolingo} className="min-h-11 py-3 underline">
              Duolingo course levels
            </a>
            <a href={comparisonSources.clinicalingo} className="min-h-11 py-3 underline">
              ClinicaLingo scenarios
            </a>
            <a href={comparisonSources.canopy} className="min-h-11 py-3 underline">
              CanopyLearn syllabus
            </a>
          </nav>
        </section>
        <ProductFooter />
      </article>
    </main>
  );
}
