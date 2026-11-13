import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { AuthProvider, useAuth } from "@/state/auth-state";

type Card = { ja: string; en: string; kind: string; readingKana?: string };
type Lesson = {
  reviewGaps: string[];
  stage: "foundation" | "core" | "master";
  n: number;
  stableId: string;
  title: string;
  objective: string;
  focus: string;
  scene: string;
  reviewed: false;
  cards: Card[];
  reader: { speaker: string; ja: string; en: string }[];
  forms?: { base: string; polite: string; meaning: string; [key: string]: string }[];
  modes: Record<string, { cueEnglish: string; sourceCard: number; responseKind: string }>;
  speaking: { role: string; partnerRole: string; opening: string; goal: string; closure: string; wordBank: string[] };
};
type Packet = {
  pairKey: "Japanese:English";
  courseId: "travel-lunch";
  status: "owner-review-draft";
  reviewed: false;
  registered: false;
  audioRegistered: false;
  lessons: Lesson[];
};
const modes = ["see", "recall", "hear", "type", "say", "write"] as const;
const panel = "rounded-2xl border border-border bg-card p-5";

export const Route = createFileRoute("/owner-japanese-lunch-review")({
  head: () => ({
    meta: [
      { title: "Japanese course draft review | Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <AuthProvider><JapaneseReview /></AuthProvider>,
});

function JapaneseReview() {
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<(typeof modes)[number]>("see");
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setPacket(null);
    setError("");
    if (!user) return;
    const controller = new AbortController();
    let active = true;
    void ownedTeamRequest<Packet>(
      { userId: user.id, signal: controller.signal, isCurrent: () => active },
      "/api/owner-japanese-lunch-drafts",
    ).then((result) => {
      if (active) {
        setPacket(result);
        setSelected(result.lessons[0]?.stableId ?? "");
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Draft review could not load.");
    });
    return () => { active = false; controller.abort(); };
  }, [user]);

  const lesson = packet?.lessons.find((entry) => entry.stableId === selected);
  const prompt = lesson?.modes[mode];
  const answer = prompt ? lesson?.cards[prompt.sourceCard - 1] : undefined;

  function downloadNote() {
    if (!lesson || !note.trim()) return;
    const payload = JSON.stringify({
      pairKey: "Japanese:English", courseId: "travel-lunch",
      lessonId: lesson.stableId, note: note.trim(),
      kind: "owner-review-note", reviewed: false,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lesson.stableId.replaceAll(":", "-")}-review-note.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gold-ink dark:text-gold">Language Threshold · Owner review</p>
          <h1 className="mt-2 font-serif text-3xl">Japanese Lunch draft</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Inspect authored Japanese→English lessons on main. These lessons are drafts; this page does not save learner progress or approve content or audio.</p>
        </div>
        <div className="flex gap-3"><ThemeToggle /><a className="underline" href="/owner">Owner dashboard</a></div>
      </header>
      {authLoading ? <p role="status">Checking sign-in…</p> : !user ? <section className={panel}>
        <p>Sign in with the platform owner account to inspect these drafts.</p>
        <button className="mt-3 rounded-lg bg-gold px-4 py-2 font-semibold text-midnight" onClick={() => setAuthOpen(true)}>Sign in</button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </section> : error ? <p role="alert" className={panel}>{error}</p> : !packet ? <p role="status">Loading owner review…</p> : <>
        <section className={panel}>
          <p className="font-semibold">Foundation {packet.lessons.filter((entry) => entry.stage === "foundation").length}/10 · Core {packet.lessons.filter((entry) => entry.stage === "core").length}/30 · Master {packet.lessons.filter((entry) => entry.stage === "master").length}/20</p>
          <p className="mt-1 text-sm text-muted-foreground">Partial owner-review draft · forms and speaking authoring pending · reviewed: false · learner registration: false · recorded audio: not yet registered</p>
          <label className="mt-4 block font-semibold" htmlFor="japanese-draft-lesson">Choose a lesson</label>
          <select id="japanese-draft-lesson" className="mt-2 w-full rounded-lg border border-border bg-background p-3" value={selected} onChange={(event) => { setSelected(event.target.value); setRevealed(false); setNote(""); }}>
            {packet.lessons.map((entry) => <option key={entry.stableId} value={entry.stableId}>{entry.stage === "foundation" ? "Foundation" : entry.stage === "core" ? "Core" : "Master"} {entry.n}: {entry.title}</option>)}
          </select>
        </section>
        {lesson && <>
          <section className={panel}>
            <h2 className="font-serif text-2xl">{lesson.title}</h2>
            <p className="mt-2">{lesson.objective}</p>
            <p className="mt-3 text-muted-foreground">{lesson.scene}</p>
            <h3 className="mt-5 font-semibold">Language focus</h3><p className="mt-1">{lesson.focus}</p>
            <p className="mt-4 rounded-lg border border-amber-500 p-3 text-sm">{lesson.reviewGaps.join(" · ")}. These fields need qualified review before learner release.</p>
            {!!lesson.forms?.length && <div className="mt-4"><h3 className="font-semibold">Japanese forms</h3><ul className="mt-2 space-y-1">{lesson.forms.map((form, index) => <li key={index} lang="ja">{form.base} → {form.polite} · {form.meaning}</li>)}</ul></div>}
          </section>
          <section className={panel}>
            <h2 className="font-serif text-2xl">Six activity prompts</h2>
            <div className="mt-4 flex flex-wrap gap-2">{modes.map((name) => <button key={name} className={`rounded-lg border px-4 py-2 capitalize ${mode === name ? "border-gold bg-gold/15" : "border-border"}`} onClick={() => { setMode(name); setRevealed(false); }}>{name}</button>)}</div>
            {prompt && <div className="mt-4 rounded-xl border border-border p-4"><p className="font-semibold capitalize">{mode}: {prompt.cueEnglish}</p><p className="mt-2 text-sm text-muted-foreground">{mode === "hear" ? "Audio is pending listening approval; inspect the exact text model below." : `Response: ${prompt.responseKind}`}</p><button className="mt-4 rounded-lg border border-border px-4 py-2" onClick={() => setRevealed(!revealed)}>{revealed ? "Hide" : "Show"} source answer</button>{revealed && answer && <p className="mt-3 text-lg" lang="ja">{answer.ja} <span className="text-sm text-muted-foreground">({answer.en})</span></p>}</div>}
          </section>
          <section className={panel}><h2 className="font-serif text-2xl">Cards</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{lesson.cards.map((card, index) => <li key={`${index}-${card.ja}`} className="rounded-xl border border-border p-3"><p lang="ja" className="text-lg">{card.ja}</p>{card.readingKana && <p lang="ja" className="text-sm text-muted-foreground">{card.readingKana}</p>}<p className="mt-1">{card.en}</p></li>)}</ul></section>
          <section className={panel}><h2 className="font-serif text-2xl">Reader</h2><ol className="mt-4 space-y-3">{lesson.reader.map((turn, index) => <li key={index} className="border-l-2 border-gold/50 pl-4"><p className="text-sm font-semibold">{turn.speaker}</p><p lang="ja" className="text-lg">{turn.ja}</p><p>{turn.en}</p></li>)}</ol></section>
          <section className={panel}><h2 className="font-serif text-2xl">Speaking scene</h2><p className="mt-2">{lesson.speaking.role} · {lesson.speaking.partnerRole}</p><p className="mt-2" lang="ja">Opening: {lesson.speaking.opening}</p><p className="mt-2">Goal: {lesson.speaking.goal}</p><p className="mt-2" lang="ja">Closure: {lesson.speaking.closure}</p><p className="mt-2">Candidate card vocabulary (authored speaking word bank pending): <span lang="ja">{lesson.speaking.wordBank.join(" · ")}</span></p></section>
          <section className={panel}><h2 className="font-serif text-2xl">Review note</h2><p className="mt-1 text-sm text-muted-foreground">Download a lesson-specific note for the authoring ledger. This does not mark the lesson approved.</p><textarea className="mt-3 min-h-28 w-full rounded-lg border border-border bg-background p-3" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Review note" /><button className="mt-2 rounded-lg border border-border px-4 py-2 disabled:opacity-50" disabled={!note.trim()} onClick={downloadNote}>Download review note</button></section>
        </>}
      </>}
    </div>
  </main>;
}
