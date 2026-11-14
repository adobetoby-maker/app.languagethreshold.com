import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { AuthProvider, useAuth } from "@/state/auth-state";

type Lesson = { stableId: string; stage: "foundation" | "core"; n: number; title: string; objective: string; focus: string; scene: string;
  reviewed: false; cards: { fr: string; en: string; kind: string }[]; reader: { fr: string; en: string }[];
  modes: Record<string, { prompt: string; targetText: string; recordedAudio: false }>;
  forms: { id: string; englishPrompt: string; frenchAnswer: string }[]; speaking: string; reviewGaps: string[] };
type Packet = { pairKey: "French:English"; courseId: "french-basics"; reviewed: false;
  registered: false; audioRegistered: false; lessons: Lesson[] };
const modeNames = ["see", "recall", "hear", "type", "say", "write"] as const;
const panel = "rounded-2xl border border-border bg-card p-5";

export const Route = createFileRoute("/owner-french101-review")({
  head: () => ({ meta: [
    { title: "French 101 draft review | Language Threshold" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: () => <AuthProvider><French101Review /></AuthProvider>,
});

function French101Review() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [authOpen, setAuthOpen] = useState(false);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<(typeof modeNames)[number]>("see");
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setPacket(null);
    setError("");
    if (!userId) return;
    const controller = new AbortController();
    let active = true;
    void ownedTeamRequest<Packet>(
      { userId, signal: controller.signal, isCurrent: () => active },
      "/api/owner-french101-drafts",
    ).then((result) => {
      if (active) { setPacket(result); setSelected(result.lessons[0]?.stableId ?? ""); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Draft review could not load.");
    });
    return () => { active = false; controller.abort(); };
  }, [userId]);
  const lesson = packet?.lessons.find((entry) => entry.stableId === selected);
  const prompt = lesson?.modes[mode];
  function downloadNote() {
    if (!lesson || !note.trim()) return;
    const payload = JSON.stringify({ pairKey: "French:English", courseId: "french-basics",
      lessonId: lesson.stableId, kind: "owner-review-note", reviewed: false, note: note.trim() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lesson.stableId.replaceAll(":", "-")}-review-note.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div>
      <p className="font-semibold text-gold-ink dark:text-gold">Language Threshold · Owner review</p>
      <h1 className="mt-2 font-serif text-3xl">French 101 draft review</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">Inspect source-pinned Foundation and Core lessons. This preview does not save learner progress or approve content or audio.</p>
    </div><div className="flex gap-3"><ThemeToggle /><a className="underline" href="/owner">Owner dashboard</a></div></header>
    {authLoading ? <p role="status">Checking sign-in…</p> : !user ? <section className={panel}>
      <p>Sign in with the platform owner account to inspect these drafts.</p>
      <button className="mt-3 rounded-lg bg-gold px-4 py-2 font-semibold text-midnight" onClick={() => setAuthOpen(true)}>Sign in</button>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </section> : error ? <p role="alert" className={panel}>{error}</p> : !packet ? <p role="status">Loading owner review…</p> : <>
      <section className={panel}>
        <p className="font-semibold">Foundation {packet.lessons.filter((entry) => entry.stage === "foundation").length}/10 · Core {packet.lessons.filter((entry) => entry.stage === "core").length}/30 · Master 0/20</p>
        <p className="mt-1 text-sm text-muted-foreground">Owner-review draft · reviewed: false · learner registration: false · recorded audio: unavailable</p>
        <label className="mt-4 block font-semibold" htmlFor="french101-draft-lesson">Choose a lesson</label>
        <select id="french101-draft-lesson" className="mt-2 w-full rounded-lg border border-border bg-background p-3" value={selected}
          onChange={(event) => { setSelected(event.target.value); setRevealed(false); setNote(""); }}>
          {packet.lessons.map((entry) => <option key={entry.stableId} value={entry.stableId}>{entry.stage === "foundation" ? "Foundation" : "Core"} {entry.n}: {entry.title}</option>)}
        </select>
      </section>
      {lesson && <>
        <section className={panel}><h2 className="font-serif text-2xl">{lesson.title}</h2><p className="mt-2">{lesson.objective}</p>
          <p className="mt-3 text-muted-foreground">{lesson.scene}</p><p className="mt-3 text-sm">Focus: {lesson.focus}</p>
          <p className="mt-3 text-sm text-muted-foreground">{lesson.reviewGaps.join(" · ")}</p></section>
        <section className={panel}><h2 className="font-serif text-2xl">Reader</h2><ol className="mt-4 space-y-3">
          {lesson.reader.map((turn, index) => <li key={index} className="rounded-lg border border-border p-3"><p lang="fr">{turn.fr}</p><p className="mt-1 text-muted-foreground">{turn.en}</p></li>)}
        </ol></section>
        <section className={panel}><h2 className="font-serif text-2xl">Cards</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">
          {lesson.cards.map((card, index) => <div key={index} className="rounded-lg border border-border p-3"><span lang="fr" className="font-semibold">{card.fr}</span><span className="ml-2 text-muted-foreground">{card.en}</span></div>)}
        </div></section>
        <section className={panel}><h2 className="font-serif text-2xl">Six mode cues</h2><div className="mt-4 flex flex-wrap gap-2">
          {modeNames.map((name) => <button key={name} className="rounded-lg border border-border px-3 py-2 aria-pressed:bg-gold aria-pressed:text-midnight" aria-pressed={mode === name}
            onClick={() => { setMode(name); setRevealed(false); }}>{name[0].toUpperCase() + name.slice(1)}</button>)}
        </div><p className="mt-4">{prompt?.prompt}</p><button className="mt-3 rounded-lg border border-border px-3 py-2" onClick={() => setRevealed((value) => !value)}>{revealed ? "Hide" : "Reveal"} target</button>
          {revealed && <p className="mt-3 font-semibold" lang="fr">{prompt?.targetText}</p>}
          {mode === "hear" && <p className="mt-2 text-sm text-muted-foreground">Recorded audio is unavailable in this draft.</p>}
        </section>
        <section className={panel}><h2 className="font-serif text-2xl">Contextual form practice</h2><ul className="mt-4 space-y-3">
          {lesson.forms.map((form) => <li key={form.id} className="rounded-lg border border-border p-3"><p>{form.englishPrompt}</p><p className="mt-1 font-semibold" lang="fr">{form.frenchAnswer}</p></li>)}
        </ul></section>
        <section className={panel}><h2 className="font-serif text-2xl">Speaking brief</h2><p className="mt-3">{lesson.speaking}</p></section>
        <section className={panel}><h2 className="font-serif text-2xl">Review note</h2><p className="mt-1 text-sm text-muted-foreground">Download a lesson-specific note for the authoring ledger. This does not mark the lesson approved.</p>
          <textarea className="mt-3 min-h-28 w-full rounded-lg border border-border bg-background p-3" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Review note" />
          <button className="mt-2 rounded-lg border border-border px-4 py-2 disabled:opacity-50" disabled={!note.trim()} onClick={downloadNote}>Download review note</button></section>
      </>}
    </>}
  </div></main>;
}
