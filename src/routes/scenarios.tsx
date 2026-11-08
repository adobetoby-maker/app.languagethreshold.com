import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import catalog from "@/data/scenario-catalog.generated.json";
import { cefrLevels, cefrSource, programLevelSummary } from "@/data/program-levels";
import { ProductFooter } from "@/components/marketing/BuyerInformation";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/scenarios" }],
    meta: [
      { title: "Scenarios and speaking levels | Language Threshold" },
      {
        name: "description",
        content:
          "Browse the actual Spanish speaking scenarios in Language Threshold by role, situation and A1–B1 task level. See advanced Master practice and open a conversation.",
      },
      { property: "og:title", content: "What can you practice in Language Threshold?" },
      { property: "og:description", content: programLevelSummary },
      { property: "og:url", content: "https://app.languagethreshold.com/scenarios" },
      { name: "twitter:title", content: "Browse Language Threshold speaking scenarios" },
      { name: "twitter:description", content: programLevelSummary },
    ],
  }),
  component: Scenarios,
});
type Task = (typeof catalog.modules)[number]["examples"][number];
const categories = [...new Set(catalog.modules.map((m) => m.category))];
const pageSize = 20;
function Scenarios() {
  const [category, setCategory] = useState("Medical");
  const [moduleId, setModuleId] = useState("nursing");
  const selected = catalog.modules.find((m) => m.id === moduleId) ?? catalog.modules[0];
  const [loaded, setLoaded] = useState<{ id: string; missions: Task[] } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [level, setLevel] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    fetch(selected.path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the scenario list.");
        const data = await response.json();
        if (data.id !== selected.id || !Array.isArray(data.missions))
          throw new Error("Could not load the scenario list.");
        if (!controller.signal.aborted) setLoaded(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("The full list could not load. The examples below are still available.");
      });
    return () => controller.abort();
  }, [selected.id, selected.path, retry]);
  const ready = loaded?.id === selected.id;
  const tasks = ready ? loaded.missions : selected.examples;
  const words = query.trim().toLocaleLowerCase();
  const matching = tasks.filter(
    (m) =>
      (level === "All" || m.level === level) &&
      (!words ||
        [m.title, m.summary, ...m.objectives].join(" ").toLocaleLowerCase().includes(words)),
  );
  const show = matching.slice(0, page * pageSize);
  const chooseModule = (id: string) => {
    setModuleId(id);
    setLoaded(null);
    setError("");
    setLevel("All");
    setQuery("");
    setPage(1);
  };
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-6xl">
        <a href="/" className="inline-flex min-h-11 items-center text-gold-ink underline">
          ← Language Threshold
        </a>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold sm:text-5xl">
          The conversations you can practice.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Browse actual speaking tasks from our web app: everyday life, clinical encounters, crew
          conversations, coaching, travel and more.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Spanish for English-speaking learners. Includes lesson-linked speaking tasks, roleplays,
          verbs and grammar practice. These are speaking-task counts; the comparison page lists
          course lesson counts.
        </p>
        <a
          href="/compare"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
        >
          Compare courses, roles and lesson counts →
        </a>

        <section
          className="mt-9 rounded-2xl border border-border bg-card p-6"
          aria-labelledby="program-level"
        >
          <h2 id="program-level" className="text-2xl font-semibold">
            What level is the program?
          </h2>
          <p className="mt-4 text-xl font-semibold text-gold-ink">{programLevelSummary}</p>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            These are the current speaking-task labels in the app. Master practice adds more
            demanding work conversations, such as explaining a changed plan, handling an unexpected
            complication or teaching a teammate.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Use the task levels to choose practice. Your overall language level depends on what you
            can understand and do across speaking, listening, reading and writing.
          </p>
          <details className="mt-5">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              Understand the A1–C2 scale
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cefrLevels.map((l) => (
                <div key={l.id} className="rounded-xl border border-border bg-background p-4">
                  <h3 className="font-semibold">
                    {l.id} · {l.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {l.description}
                  </p>
                </div>
              ))}
            </div>
            <a href={cefrSource} className="mt-3 inline-flex min-h-11 items-center underline">
              Council of Europe level descriptions →
            </a>
          </details>
        </section>

        <section className="mt-10" aria-labelledby="find-scenario">
          <h2 id="find-scenario" className="text-2xl font-semibold">
            Find your next conversation
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-2">
              <span className="block font-semibold">Area</span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const first = catalog.modules.find((m) => m.category === e.target.value);
                  if (first) chooseModule(first.id);
                }}
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 py-3 text-foreground"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block font-semibold">Role or topic</span>
              <select
                value={selected.id}
                onChange={(e) => chooseModule(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 py-3 text-foreground"
              >
                {catalog.modules
                  .filter((m) => m.category === category)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block font-semibold">Task level</span>
              <select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setPage(1);
                }}
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 py-3 text-foreground"
              >
                {["All", "A1", "A2", "B1"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block font-semibold">Find a situation</span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="handoff, pain, safety…"
                type="search"
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 py-3 text-foreground"
              />
            </label>
          </div>
          <h3 className="mt-7 text-2xl font-semibold">{selected.name}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{selected.summary}</p>
          <p className="mt-3 text-sm" role="status">
            {ready
              ? `${matching.length} matching speaking tasks · showing ${show.length}`
              : error ||
                `Loading ${selected.count} speaking tasks. Showing ${selected.examples.length} examples.`}
          </p>
          {error && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
              className="mt-3 min-h-11 rounded-lg border border-border px-4 py-2"
            >
              Retry full list
            </button>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2" data-testid="scenario-results">
            {show.map((task) => (
              <article key={task.id} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-gold-ink">
                  {task.level} · {task.stage} · {task.kind}
                </p>
                <h4 className="mt-3 text-xl font-semibold">{task.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{task.summary}</p>
                <details className="mt-3">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                    What you will practice
                  </summary>
                  <p className="mt-2 text-sm">
                    You: {task.learnerRole}
                    <br />
                    Partner: {task.partnerRole}
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                    {task.objectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </details>
                <a
                  href={task.href}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
                >
                  Practice this conversation →
                </a>
              </article>
            ))}
          </div>
          {ready && !matching.length && (
            <p className="mt-5 rounded-xl border border-border p-5">
              No matching tasks in this area. Try another level or a broader search.
            </p>
          )}
          {matching.length > show.length && (
            <button
              type="button"
              onClick={() => setPage((n) => n + 1)}
              className="mt-5 min-h-12 rounded-xl border border-border bg-card px-5 py-3 font-semibold"
            >
              Show more scenarios
            </button>
          )}
        </section>
        <section className="mt-10" aria-labelledby="all-practice-areas">
          <h2 id="all-practice-areas" className="text-2xl font-semibold">
            All {catalog.modules.length} practice areas
          </h2>
          <p className="mt-3 text-muted-foreground">
            Select an area to browse its real tasks. Task counts include drills and roleplays;
            lesson counts are shown separately on the comparison page.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setCategory(m.category);
                  chooseModule(m.id);
                  document.getElementById("find-scenario")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="min-h-12 rounded-xl border border-border bg-card p-4 text-left"
              >
                <span className="block font-semibold">{m.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {m.category} · {m.count} speaking tasks
                </span>
              </button>
            ))}
          </div>
        </section>
        <ProductFooter />
      </article>
    </main>
  );
}
