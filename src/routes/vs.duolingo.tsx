import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/duolingo")({
  component: DuolingoComparison,
  head: () => ({
    meta: [
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
                <th className="p-4">Teams</th>
                <td className="p-4">Seats, assigned focus, activity, and certificates</td>
                <td className="p-4">Check Duolingo for current organization offerings</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Product details can change. Verify Duolingo's current catalog and terms before choosing.
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
