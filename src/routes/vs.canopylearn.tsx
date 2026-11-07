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
                  36 lessons across three proficiency levels, according to its course page
                </td>
              </tr>
              <tr>
                <th className="p-4">Organizations</th>
                <td className="p-4">Team seats, focus assignments, activity, and certificates</td>
                <td className="p-4">
                  Training for healthcare staff; check Canopy for current organization terms
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Source:{" "}
          <a className="underline" href="https://info.withcanopy.com/canopylearn-medical-spanish">
            CanopyLearn’s course page
          </a>
          , checked November 7, 2026. Product details can change; verify its current catalog,
          credits and terms before choosing.
        </p>
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
