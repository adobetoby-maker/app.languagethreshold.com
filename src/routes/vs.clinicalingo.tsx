import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/clinicalingo")({
  component: ClinicaLingoComparison,
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/vs/clinicalingo" }],
    meta: [
      { property: "og:title", content: "Language Threshold vs ClinicaLingo" },
      {
        property: "og:description",
        content: "Compare role-specific language practice with clinical Spanish training.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/vs/clinicalingo" },
      { name: "twitter:title", content: "Language Threshold vs ClinicaLingo" },
      {
        name: "twitter:description",
        content: "Compare role-specific language practice with clinical Spanish training.",
      },
      { title: "Language Threshold vs ClinicaLingo — Professional Language Training" },
      {
        name: "description",
        content:
          "Compare Language Threshold's 660+ lessons, broad professional modules, team seats and 8+ languages with ClinicaLingo's clinical Spanish focus.",
      },
    ],
  }),
});

function ClinicaLingoComparison() {
  return (
    <main className="min-h-screen bg-background px-4 py-14 text-foreground sm:px-6">
      <article className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm text-gold underline">
          ← Language Threshold
        </Link>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Language Threshold vs ClinicaLingo</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          ClinicaLingo is built around clinical Spanish. Language Threshold is for learners and
          teams who need medical Spanish plus construction, sports, mission, and other job-specific
          conversations across multiple languages.
        </p>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-card">
              <tr>
                <th className="p-4">Compare</th>
                <th className="p-4">Language Threshold</th>
                <th className="p-4">ClinicaLingo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th className="p-4">Primary focus</th>
                <td className="p-4">
                  Medical, construction, sports, mission, and other professional modules
                </td>
                <td className="p-4">Clinical Spanish</td>
              </tr>
              <tr>
                <th className="p-4">Languages</th>
                <td className="p-4">8+ learning languages</td>
                <td className="p-4">Spanish for healthcare</td>
              </tr>
              <tr>
                <th className="p-4">Lesson library</th>
                <td className="p-4">660+ role-specific lessons</td>
                <td className="p-4">
                  29 free scenarios listed in its practice catalog; 30 scenarios advertised for Pro
                </td>
              </tr>
              <tr>
                <th className="p-4">Practice format</th>
                <td className="p-4">
                  Role-specific lessons, bilingual reading, listening, speaking and Field Prep
                </td>
                <td className="p-4">
                  Clinical encounter dialogues with Spanish/English reveals, debriefs and dialect
                  notes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="mt-8" aria-labelledby="clinicalingo-catalog">
          <h2 id="clinicalingo-catalog" className="text-2xl font-semibold">
            What does ClinicaLingo cover?
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Its public practice catalog lists 29 free clinical scenarios. These are encounter
            scenarios, rather than a lesson count directly comparable to our role-specific courses.
          </p>
          <details className="mt-4 rounded-xl border border-border p-4">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              See the 29 scenario topics
            </summary>
            <ol className="mt-4 list-decimal space-y-2 pl-6 sm:columns-2">
              {CLINICALINGO_TOPICS.map((topic) => (
                <li key={topic} className="break-inside-avoid">
                  {topic}
                </li>
              ))}
            </ol>
          </details>
          <p className="mt-4 text-sm text-muted-foreground">
            Source:{" "}
            <a href="https://clinicalingo.com/practice/" className="underline">
              ClinicaLingo’s public practice catalog
            </a>
            , checked November 7, 2026. Its{" "}
            <a href="https://clinicalingo.com/" className="underline">
              homepage
            </a>{" "}
            advertises 30 scenarios for Pro and describes the paid tier as upcoming.
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

// Topic summaries from the linked public catalog; do not treat scenarios as equivalent lesson units.
const CLINICALINGO_TOPICS = [
  "Abdominal-pain intake",
  "Chest-pain assessment",
  "Allergies and home medicines",
  "Discharge precautions",
  "Telephone triage for childhood fever",
  "Toddler abdominal exam",
  "Diabetes and anticoagulant medicines",
  "Suicide-risk screening",
  "Early-pregnancy bleeding",
  "Postoperative opioid counseling",
  "Stroke screening",
  "Laceration repair",
  "Hypoglycemia",
  "Opioid-overdose response",
  "Asthma and spacer use",
  "Pediatric febrile seizure",
  "Geriatric fall and advance directives",
  "CT contrast consent",
  "Lumbar-puncture consent",
  "Cardiac-catheterization consent",
  "Postpartum bleeding triage",
  "Central-line consent",
  "Urinary-catheter consent",
  "Nasogastric-tube consent",
  "Medication-bag review",
  "Herbal-supplement review",
  "Diabetic ketoacidosis",
  "Anxiety and traditional remedies",
  "Labor intake and epidural consent",
];
