import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { AuthProvider, useAuth } from "@/state/auth-state";

type ConflictCard = {
  id: string;
  number: number;
  kind: string;
  sourceSpanish: string;
  sourceEnglish: string;
  frenchCandidate: string;
  semanticNote: string;
  status: string;
};

type Lesson = {
  n: number;
  stableId: string;
  sourceTitleEnglish: string;
  sourceObjectiveEnglish: string;
  sourceReaderTitleSpanish: string;
  sourceReaderSpanish: string[];
  sourceReaderEnglish: string[];
  cards: ConflictCard[];
  reviewGaps: string[];
  reviewed: false;
  registered: false;
  audioRegistered: false;
  listeningReviewed: false;
  scoringEnabled: false;
  progressEnabled: false;
};

type Packet = {
  pairKey: "French:English";
  courseId: "french-basics";
  stage: "master";
  status: "owner-conflict-review-draft";
  reviewed: false;
  registered: false;
  audioRegistered: false;
  listeningReviewed: false;
  scoringEnabled: false;
  progressEnabled: false;
  lessons: Lesson[];
};

const panel = "rounded-2xl border border-border bg-card p-5";

export const Route = createFileRoute("/owner-french101-master-conflicts")({
  head: () => ({ meta: [
    { title: "French 101 Master conflict review | Language Threshold" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: () => <AuthProvider><MasterConflicts /></AuthProvider>,
});

function MasterConflicts() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [authOpen, setAuthOpen] = useState(false);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    setPacket(null);
    setError("");
    setSelected(null);
    if (!userId) return;
    const controller = new AbortController();
    let active = true;
    void ownedTeamRequest<Packet>(
      { userId, signal: controller.signal, isCurrent: () => active },
      "/api/owner-french101-master-conflicts",
    ).then((result) => {
      if (active) {
        setPacket(result);
        setSelected(result.lessons[0]?.n ?? null);
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Master conflict review could not load.");
    });
    return () => { active = false; controller.abort(); };
  }, [userId]);

  const lesson = packet?.lessons.find((entry) => entry.n === selected);
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div>
      <p className="font-semibold text-gold-ink dark:text-gold">Language Threshold · Owner review</p>
      <h1 className="mt-2 font-serif text-3xl">French 101 Master conflicts</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">Pinned Spanish source, exact English meaning and French candidates for disputed Master lessons. These comparisons do not create scored cards, audio or learner progress.</p>
    </div><div className="flex gap-3"><ThemeToggle /><a className="underline" href="/owner-french101-review">French 101 drafts</a></div></header>
    {authLoading ? <p role="status">Checking sign-in…</p> : !user ? <section className={panel}>
      <p>Sign in with the platform owner account to inspect these conflicts.</p>
      <button className="mt-3 rounded-lg bg-gold px-4 py-2 font-semibold text-midnight" onClick={() => setAuthOpen(true)}>Sign in</button>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </section> : error ? <p role="alert" className={panel}>{error}</p> : !packet ? <p role="status">Loading owner conflict review…</p> : <>
      <section className={panel}>
        <p className="font-semibold">{packet.lessons.length} Master lessons · owner-only conflict draft</p>
        <p className="mt-1 text-sm text-muted-foreground">Reviewed: false · learner registration, audio, scoring and progress gates: closed</p>
        <label className="mt-4 block font-semibold" htmlFor="master-conflict-lesson">Choose a lesson</label>
        <select id="master-conflict-lesson" className="mt-2 w-full rounded-lg border border-border bg-background p-3"
          value={selected ?? ""} onChange={(event) => setSelected(Number(event.target.value))}>
          {packet.lessons.map((entry) => <option key={entry.stableId} value={entry.n}>Master {entry.n}: {entry.sourceTitleEnglish}</option>)}
        </select>
      </section>
      {lesson && <>
        <section className={panel}><h2 className="font-serif text-2xl">Master {lesson.n}: {lesson.sourceTitleEnglish}</h2>
          <p className="mt-2">Pinned Spanish-course objective: {lesson.sourceObjectiveEnglish}</p>
          <p className="mt-2 text-sm text-muted-foreground">Stable review ID: {lesson.stableId} · Reader: {lesson.sourceReaderTitleSpanish}</p>
        </section>
        <section className={panel}><h2 className="font-serif text-2xl">Flagged source and French faces</h2>
          <div className="mt-4 space-y-4">{lesson.cards.map((card) => <article key={card.id} className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Card {card.number} · {card.kind} · {card.status}</h3>
            <p className="mt-1 break-all text-sm text-muted-foreground">{card.id}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><dt className="font-semibold">Spanish source</dt><dd lang="es">{card.sourceSpanish}</dd></div>
              <div><dt className="font-semibold">Exact English</dt><dd>{card.sourceEnglish}</dd></div>
              <div><dt className="font-semibold">French candidate</dt><dd lang="fr">{card.frenchCandidate}</dd></div>
            </dl>
            <p className="mt-3 rounded-lg border border-border bg-background p-3">{card.semanticNote}</p>
            <p className="mt-2 text-sm text-muted-foreground">Scoring, audio and learner progress: off</p>
          </article>)}</div>
        </section>
        <section className={panel}><h2 className="font-serif text-2xl">Pinned Reader context</h2>
          <p className="mt-2 text-sm text-muted-foreground">The full source scene is shown for review; these lines are not French practice or scored answers.</p>
          <ol className="mt-4 space-y-3">{lesson.sourceReaderSpanish.map((line, index) => <li key={index} className="rounded-lg border border-border p-3">
            <p lang="es">{index + 1}. {line}</p><p className="mt-1">{lesson.sourceReaderEnglish[index]}</p>
          </li>)}</ol>
        </section>
        <section className={panel}><h2 className="font-serif text-2xl">Review gaps</h2><ul className="mt-3 list-disc space-y-2 pl-5">
          {lesson.reviewGaps.map((gap) => <li key={gap}>{gap}</li>)}
        </ul></section>
      </>}
    </>}
  </div></main>;
}
