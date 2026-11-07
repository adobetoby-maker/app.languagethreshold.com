import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/duolingo")({
  component: DuolingoComparison,
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/vs/duolingo" }],
    meta: [
      { property: "og:title", content: "Language Threshold vs Duolingo" },
      {
        property: "og:description",
        content: "Compare work conversations, practice tools and learning plans.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/vs/duolingo" },
      { name: "twitter:title", content: "Language Threshold vs Duolingo" },
      {
        name: "twitter:description",
        content: "Compare work conversations, practice tools and learning plans.",
      },
      { title: "Language Threshold vs Duolingo for Professionals" },
      {
        name: "description",
        content:
          "Compare job-specific language practice from Language Threshold with Duolingo's general language-learning curriculum.",
      },
    ],
  }),
});

function DuolingoComparison() {
  return (
    <main className="min-h-screen bg-background px-4 py-14 text-foreground sm:px-6">
      <article className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm text-gold underline">
          ← Language Threshold
        </Link>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Language Threshold vs Duolingo for professionals
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Duolingo teaches a broad, general curriculum. Language Threshold starts with the
          conversations nurses, foremen, teams, coaches, and missionaries need to handle in the
          field—so you can use the language while you are learning it.
        </p>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-card">
              <tr>
                <th className="p-4">Compare</th>
                <th className="p-4">Language Threshold</th>
                <th className="p-4">Duolingo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th className="p-4">Curriculum</th>
                <td className="p-4">Job- and role-specific modules</td>
                <td className="p-4">General language curriculum</td>
              </tr>
              <tr>
                <th className="p-4">Practice goal</th>
                <td className="p-4">Rehearse work situations and real conversations</td>
                <td className="p-4">Build general vocabulary and language skills</td>
              </tr>
              <tr>
                <th className="p-4">Work scenarios</th>
                <td className="p-4">
                  Field Prep roleplay for medical, construction, mission, sports, and more
                </td>
                <td className="p-4">Not organized around a learner's job role</td>
              </tr>
              <tr>
                <th className="p-4">Practice format</th>
                <td className="p-4">
                  Bilingual reading, listening, speaking and Field Prep roleplay
                </td>
                <td className="p-4">
                  Short reading, writing, listening and speaking exercises; Stories and DuoRadio in
                  larger courses
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="mt-8" aria-labelledby="duolingo-catalog">
          <h2 id="duolingo-catalog" className="text-2xl font-semibold">
            What does Duolingo cover?
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Duolingo organizes its language courses around communication goals, with vocabulary,
            grammar and practice in each unit. Its Spanish course for English speakers covers
            everyday communication through upper-intermediate B2 content.
          </p>
          <details className="mt-4 rounded-xl border border-border p-4">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              See examples of Duolingo’s course topics
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-6 sm:columns-2">
              {DUOLINGO_TOPICS.map((topic) => (
                <li key={topic} className="break-inside-avoid">
                  {topic}
                </li>
              ))}
            </ul>
          </details>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            These are examples from Duolingo’s published course guides, not a complete lesson list.
            Duolingo builds broad language skills; Language Threshold organizes practice around the
            daily conversations in your job.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Sources:{" "}
            <a
              className="underline"
              href="https://blog.duolingo.com/why-doesnt-duolingo-start-with-abcs/"
            >
              early communication topics
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://blog.duolingo.com/how-long-does-it-take-to-learn-spanish-french/"
            >
              Spanish course milestones
            </a>{" "}
            and{" "}
            <a
              className="underline"
              href="https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/"
            >
              lesson formats
            </a>
            . Checked November 7, 2026.
          </p>
        </section>
        <Link
          to="/pricing"
          className="mt-8 inline-flex rounded-xl bg-gold px-5 py-3 font-semibold text-background"
        >
          Start the 7-day free trial
        </Link>
      </article>
    </main>
  );
}

const DUOLINGO_TOPICS = [
  "Ordering food and drinks",
  "Getting help when lost",
  "Passport control and customs",
  "Shopping for everyday supplies",
  "Paying bills and telling time",
  "Clothing and colors",
  "Finding places and making plans",
  "Sharing opinions and preferences",
  "Talking about past events",
  "Describing experiences and interests",
  "Writing emails to request information",
  "Following presentations on familiar topics",
  "Building arguments",
  "Writing reports and proposing solutions",
];
