import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/canopylearn")({
  component: CanopyLearnComparison,
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/vs/canopylearn" }],
    meta: [
      { property: "og:title", content: "Language Threshold vs CanopyLearn" },
      {
        property: "og:description",
        content: "Compare role-specific language practice with clinical Spanish training.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/vs/canopylearn" },
      { name: "twitter:title", content: "Language Threshold vs CanopyLearn" },
      {
        name: "twitter:description",
        content: "Compare role-specific language practice with clinical Spanish training.",
      },
      { title: "Language Threshold vs CanopyLearn — Professional Language Training" },
      {
        name: "description",
        content:
          "Compare Language Threshold work conversation practice with CanopyLearn medical Spanish.",
      },
    ],
  }),
});

function CanopyLearnComparison() {
  return (
    <main className="min-h-screen bg-background px-4 py-14 text-foreground sm:px-6">
      <article className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm text-gold underline">
          ← Language Threshold
        </Link>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Language Threshold vs CanopyLearn</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          CanopyLearn focuses on medical Spanish for healthcare professionals. Language Threshold
          offers medical practice alongside construction, mission and other work conversations.
          Choose around the situations and training requirements you need.
        </p>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-card">
              <tr>
                <th className="p-4">Compare</th>
                <th className="p-4">Language Threshold</th>
                <th className="p-4">CanopyLearn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th className="p-4">Primary focus</th>
                <td className="p-4">
                  Medical, construction, sports, mission, and other professional modules
                </td>
                <td className="p-4">Medical Spanish for healthcare professionals</td>
              </tr>
              <tr>
                <th className="p-4">Languages</th>
                <td className="p-4">8+ learning languages</td>
                <td className="p-4">Medical Spanish</td>
              </tr>
              <tr>
                <th className="p-4">Lesson library</th>
                <td className="p-4">660+ role-specific lessons</td>
                <td className="p-4">
                  36 lessons across three levels; approximately 45 hours in its 2026 syllabus
                </td>
              </tr>
              <tr>
                <th className="p-4">Practice format</th>
                <td className="p-4">
                  Role-specific lessons, bilingual reading, listening, speaking and Field Prep
                </td>
                <td className="p-4">
                  Flashcards, interactive exercises, patient roleplay and a telenovela series
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="mt-8" aria-labelledby="canopy-catalog">
          <h2 id="canopy-catalog" className="text-2xl font-semibold">
            What does CanopyLearn cover?
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Its 2026 Medical Spanish syllabus lists three levels of 12 lessons, including reviews.
            Lessons combine clinical vocabulary with grammar, pronunciation and cultural context.
          </p>
          <div className="mt-4 space-y-3">
            {CANOPY_LEVELS.map(({ level, topics }) => (
              <details key={level} className="rounded-xl border border-border p-4">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                  {level} — 12 lessons
                </summary>
                <ol className="mt-4 list-decimal space-y-2 pl-6 sm:columns-2">
                  {topics.map((topic) => (
                    <li key={topic} className="break-inside-avoid">
                      {topic}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Topic summaries from{" "}
            <a
              className="underline"
              href="https://cdn2.hubspot.net/hubfs/5953582/Canopy_Learn_Medical_Spanish_Syllabus.pdf"
            >
              CanopyLearn’s 2026 Medical Spanish syllabus
            </a>
            , linked by its{" "}
            <a
              className="underline"
              href="https://www.withcanopy.com/faq/where-can-i-download-the-syllabus"
            >
              syllabus download page
            </a>
            . Checked November 7, 2026. Course lessons and individual practice scenarios are
            different units of learning.
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

const CANOPY_LEVELS = [
  {
    level: "Level 1",
    topics: [
      "Patient greetings",
      "Describing pain",
      "Digestive symptoms",
      "Basic examinations",
      "Diabetes",
      "Anatomy and minor injuries",
      "Vaccinations and allergies",
      "Heart and family history",
      "Cancer and organs",
      "Anxiety and depression",
      "Headaches and migraines",
      "Review",
    ],
  },
  {
    level: "Level 2",
    topics: [
      "Previous-level review",
      "Contraception and STIs",
      "Cardiac conditions",
      "Lung conditions and allergies",
      "Medicines and dosing",
      "Urology",
      "Obstetrics",
      "Surgical conversations",
      "Older-adult care",
      "Substance use",
      "Stroke",
      "Review",
    ],
  },
  {
    level: "Level 3",
    topics: [
      "Previous-level review",
      "Tuberculosis",
      "Metabolism",
      "Major trauma",
      "Discharge planning",
      "Women’s cancers",
      "Infant visits and child safety",
      "Palliative care",
      "HIV/AIDS",
      "Depression and suicide",
      "Seizures",
      "Review",
    ],
  },
];
