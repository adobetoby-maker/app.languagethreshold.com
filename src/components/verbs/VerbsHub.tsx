import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Repeat2, Clock3, Volume2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useVerbHabit } from "@/hooks/use-verb-habit";
import { SpeakingPatternPractice } from "./SpeakingPatternPractice";
import { FINISH_STUDY_EVENT } from "./VerbHabitSettings";
const ConjugationPractice = lazy(() =>
  import("./ConjugationPractice").then((m) => ({ default: m.ConjugationPractice })),
);
const PatternGames = lazy(() =>
  import("@/components/games/verbs/VerbsSection").then((m) => ({ default: m.VerbPractice })),
);
const Advanced = lazy(() =>
  import("@/components/conjugation/ConjugationGame").then((m) => ({ default: m.ConjugationGame })),
);
const PatternLibrary = lazy(() =>
  import("@/components/patterns/PatternLab").then((m) => ({ default: m.PatternLab })),
);
const AREAS = ["daily", "forms", "games", "patterns", "advanced", "library"] as const;
type Area = (typeof AREAS)[number];
const labels: Record<Area, string> = {
  daily: "Today’s ten minutes",
  forms: "Meaning & conjugation games",
  games: "Bubble Pop & Verb Crush",
  patterns: "Speaking patterns",
  advanced: "More conjugation drills",
  library: "Pattern library",
};
const button = "min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-left font-semibold";
export function VerbsHub() {
  const { state } = useApp(),
    { habit, update, key } = useVerbHabit(),
    [area, setArea] = useState<Area>("daily"),
    [ready, setReady] = useState(false),
    lastActive = useRef(0),
    activity = useRef<HTMLDivElement>(null);
  const spanish = state.selectedLanguage === "Spanish" && state.nativeLanguage === "English";
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.search),
        a = p.get("verbArea");
      setArea(AREAS.includes(a as Area) ? (a as Area) : p.has("verbs") ? "games" : "daily");
      setReady(true);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => {
    lastActive.current = 0;
  }, [key]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        Date.now() - lastActive.current < 90000
      )
        update((h) => ({
          ...h,
          seconds: Math.min(86400, h.seconds + 1),
          pending: h.seconds + 1 >= 600 ? false : h.pending,
        }));
    }, 1000);
    return () => clearInterval(timer);
  }, [update]);
  useEffect(() => {
    if (area !== "daily") activity.current?.scrollIntoView({ block: "start" });
  }, [area]);
  function go(next: Area) {
    setArea(next);
    lastActive.current = Date.now();
    const url = new URL(window.location.href);
    url.searchParams.set("verbArea", next);
    for (const p of ["verbs", "vgame", "vfamily", "vfamilies", "vlevel", "vmode", "vscope"])
      url.searchParams.delete(p);
    if (next === "games") url.searchParams.set("verbs", "home");
    window.history.pushState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  const minutes = Math.floor(habit.seconds / 60),
    seconds = habit.seconds % 60,
    pct = Math.min(100, habit.seconds / 6);
  return (
    <div
      className="mx-auto max-w-5xl space-y-6"
      data-testid="verbs-hub"
      onPointerDown={() => (lastActive.current = Date.now())}
      onKeyDown={() => (lastActive.current = Date.now())}
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-3xl">
            <Repeat2 className="size-7 text-gold-ink" />
            Verbs
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm">
            <Clock3 className="size-4" />
            {minutes}:{String(seconds).padStart(2, "0")} / 10 min today
          </span>
        </div>
        <p className="text-muted-foreground">
          A little every day. Remember a verb, change its form, then use it to say something.
        </p>
        <div
          role="progressbar"
          aria-label="Today’s verb practice"
          aria-valuemin={0}
          aria-valuemax={600}
          aria-valuenow={Math.min(600, habit.seconds)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        {habit.seconds >= 600 && (
          <p role="status" className="font-semibold text-emerald-700 dark:text-emerald-300">
            Ten minutes done. Come back tomorrow—or keep exploring.
          </p>
        )}
      </header>
      <nav aria-label="Verb practice areas" className="flex flex-wrap gap-2">
        {AREAS.filter((a) => spanish || !["forms", "patterns", "games"].includes(a)).map((a) => (
          <button
            key={a}
            className={`${button} ${area === a ? "border-gold bg-gold/10" : ""}`}
            disabled={!ready}
            aria-pressed={area === a}
            onClick={() => go(a)}
          >
            {labels[a]}
          </button>
        ))}
      </nav>
      {!spanish && (
        <p className="rounded-xl border p-4">
          Your selected language is {state.selectedLanguage}. The authored ten-minute games and
          shortcut drills here currently cover Spanish with English support. Use the conjugation
          drills and available pattern library for your selected language.
        </p>
      )}
      {area === "daily" && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Your daily verb habit</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                area: "forms" as Area,
                time: "2 minutes",
                title: "Remember the verb",
                copy: "Match meanings, then recall the forms. Hangman, pairs and quick typing.",
              },
              {
                area: "games" as Area,
                time: "4 minutes",
                title: "Change the pattern",
                copy: "Bubble Pop, Verb Crush and focused practice by conjugation family.",
              },
              {
                area: "patterns" as Area,
                time: "4 minutes",
                title: "Make it speakable",
                copy: "Tengo que… Estoy hablando… He hecho… Useful frames with ten verbs each.",
              },
            ].map((p) => (
              <button
                key={p.area}
                className={`${button} space-y-2 p-5`}
                disabled={!ready || !spanish}
                onClick={() => go(p.area)}
              >
                <span className="block text-sm text-gold-ink">{p.time}</span>
                <span className="block font-display text-xl">{p.title}</span>
                <span className="block text-sm font-normal text-muted-foreground">{p.copy}</span>
              </button>
            ))}
          </div>
          <p className="text-sm">
            Active practice counts toward today’s ten minutes. Your daily plan is saved on this
            device.
          </p>
          <p className="text-sm">
            {habit.answers} speaking-pattern answers today · {habit.missed.length} patterns to
            revisit
          </p>
          <button
            className={button}
            onClick={() => window.dispatchEvent(new Event(FINISH_STUDY_EVENT))}
          >
            Finish study session
          </button>
        </section>
      )}

      <div ref={activity} className="space-y-5 scroll-mt-4">
        {spanish && area === "patterns" && <SpeakingPatternPractice />}
        <Suspense fallback={<p role="status">Opening verb practice…</p>}>
          {spanish && area === "forms" && <ConjugationPractice />}
          {spanish && area === "games" && <PatternGames />}
          {area === "advanced" && <Advanced />}
          {area === "library" && <PatternLibrary />}
        </Suspense>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Volume2 className="mt-0.5 size-4 shrink-0" />
        Tap Listen to hear examples. Say them aloud, then try without looking.
      </p>
    </div>
  );
}
