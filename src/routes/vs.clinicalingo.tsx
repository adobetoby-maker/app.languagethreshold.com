import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/clinicalingo")({
  component: ClinicaLingoComparison,
  head: () => ({
    meta: [
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
          teams who need medical training plus construction, sports, mission, and other job-specific
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
                <td className="p-4">Check ClinicaLingo for its current catalog</td>
              </tr>
              <tr>
                <th className="p-4">Organizations</th>
                <td className="p-4">Team seats, focus assignments, activity, and certificates</td>
                <td className="p-4">Check ClinicaLingo for current organization features</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Product details can change. Verify ClinicaLingo's current catalog and terms before
          choosing.
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
