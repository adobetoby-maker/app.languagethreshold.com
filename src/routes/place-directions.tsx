import { PICTURE_MODULES } from "@/lib/picture-action";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlaceDirectionsGame } from "@/components/games/PlaceDirectionsGame";
import scenarios from "../../content/place-directions/lessons.json";

export const Route = createFileRoute("/place-directions")({
  component: PlaceDirectionsPreview,
  head: () => ({
    meta: [
      { title: "Place & Directions · Core 60 — Language Threshold" },
      { name: "robots", content: "noindex" },
    ],
  }),
});
function PlaceDirectionsPreview() {
  const [ready, setReady] = useState(false);
  const [practiceModule, setPracticeModule] = useState("place-directions");
  useEffect(() => setReady(true), []);
  const [tab, setTab] = useState("game"),
    [stage, setStage] = useState("foundation"),
    [selected, setSelected] = useState(0);
  const lessons = scenarios.filter((l) => l.stage === stage),
    row = lessons[Math.min(selected, lessons.length - 1)];
  const moduleId = stage === "core" ? "place-directions" : `${stage}-place-directions`;
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <a href="/?tab=games&target=Spanish&native=English" className="text-sm underline">
          ← Main practice area
        </a>
        <header>
          <h1 className="font-display text-3xl font-semibold">Place & Directions</h1>
          <p className="mt-2">Spanish with English support · 10 Foundation / 30 Core / 20 Master</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick it up. Put it under. Hang it on the door. Clean behind the bed.
          </p>
        </header>
        <nav className="flex gap-3" aria-label="Course and game">
          <button
            className="rounded-xl border px-5 py-3 font-semibold"
            disabled={!ready}
            aria-pressed={tab === "game"}
            onClick={() => setTab("game")}
          >
            Play the scenes
          </button>
          <button
            className="rounded-xl border px-5 py-3 font-semibold"
            disabled={!ready}
            aria-pressed={tab === "course"}
            onClick={() => setTab("course")}
          >
            Explore all 60 lessons
          </button>
        </nav>
        {tab === "game" ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              Module practice
              <select
                aria-label="Module practice"
                className="mt-1 w-full rounded-xl border bg-background p-3"
                value={practiceModule}
                disabled={!ready}
                onChange={(e) => setPracticeModule(e.target.value)}
              >
                {PICTURE_MODULES.filter((m) => m.id !== "japanese-basics").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <PlaceDirectionsGame key={practiceModule} moduleId={practiceModule} />
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["foundation", "core", "master"].map((s) => (
                <button
                  key={s}
                  className="rounded-xl border px-4 py-3 capitalize"
                  aria-pressed={stage === s}
                  onClick={() => {
                    setStage(s);
                    setSelected(0);
                  }}
                >
                  {s} · {s === "foundation" ? 10 : s === "core" ? 30 : 20}
                </button>
              ))}
            </div>
            <label className="block font-semibold">
              Lesson
              <select
                className="mt-2 block w-full rounded-xl border bg-background p-3"
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {lessons.map((l, i) => (
                  <option key={l.lesson.n} value={i}>
                    {l.lesson.n}. {l.lesson.title}
                  </option>
                ))}
              </select>
            </label>
            <article className="space-y-4 rounded-2xl border bg-card p-5">
              <h2 className="font-display text-2xl">{row.lesson.title}</h2>
              <p>{row.lesson.objective}</p>
              <p>
                <strong>Grammar:</strong> {row.lesson.focus}
              </p>
              <div className="space-y-3">
                {row.content.passage.target.map((s, i) => (
                  <p key={i}>
                    {s}
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {row.content.passage.native[i]}
                    </span>
                  </p>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer py-3 font-semibold">
                  Lesson vocabulary and cards
                </summary>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {row.lesson.words.map((w) => (
                    <div key={w.es}>
                      <dt className="font-semibold">{w.es}</dt>
                      <dd>{w.en}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <a
                className="inline-block rounded-xl border px-4 py-3 font-semibold"
                href={`/?tab=core30&module=${moduleId}&target=Spanish&native=English`}
              >
                Open this course in the app
              </a>
              <button
                className="ml-2 rounded-xl border px-4 py-3 font-semibold"
                onClick={() => setTab("game")}
              >
                Practice placement
              </button>
            </article>
          </section>
        )}
        <p className="text-sm text-muted-foreground">
          Preview course. Human teaching review is pending. Game commands include HD recordings in
          Spanish and English.
        </p>
      </div>
    </main>
  );
}
