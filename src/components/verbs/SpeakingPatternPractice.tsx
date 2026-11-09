import { useState } from "react";
import { Volume2 } from "lucide-react";
import {
  SPEAKING_PATTERNS,
  SPEAKING_VERBS,
  speakingAnswer,
  speakingNativeExample,
  speakingTail,
  type SpeakingPattern,
} from "@/lib/verb-speaking-practice";
import { useSpeech } from "@/state/speech-state";
import { useVerbHabit } from "@/hooks/use-verb-habit";
const button =
  "min-h-11 rounded-xl border border-border bg-card px-4 py-3 font-semibold text-foreground disabled:opacity-50";
export function SpeakingPatternPractice() {
  const { habit, update } = useVerbHabit(),
    speech = useSpeech();
  const [pattern, setPattern] = useState(SPEAKING_PATTERNS[0]),
    [index, setIndex] = useState(0),
    [input, setInput] = useState(""),
    [feedback, setFeedback] = useState(""),
    [correct, setCorrect] = useState(false),
    [typed, setTyped] = useState(false),
    [review, setReview] = useState(false);
  const verb = SPEAKING_VERBS[index],
    answer = verb[pattern.form],
    tail = speakingTail(pattern, verb),
    sentence = `${pattern.frame} ${answer} ${tail}.`;
  const choices = [verb.infinitive, verb.gerund, verb.participle];
  const available = review
    ? SPEAKING_PATTERNS.filter((p) => habit.missed.includes(p.id))
    : SPEAKING_PATTERNS;
  function choose(p: SpeakingPattern) {
    setPattern(p);
    setIndex(0);
    setInput("");
    setFeedback("");
    setCorrect(false);
    speech.stop();
  }
  function check(value: string) {
    if (correct) return;
    const ok = speakingAnswer(answer, value);
    setCorrect(ok);
    setFeedback(
      ok
        ? `Yes. ${sentence}`
        : `Use the ${pattern.form === "infinitive" ? "dictionary form" : pattern.form === "gerund" ? "gerund (-ando / -iendo)" : "past participle"} after ${pattern.frame}. Try again.`,
    );
    update((h) => ({
      ...h,
      answers: h.answers + 1,
      missed: ok
        ? h.missed.filter((id) => id !== pattern.id)
        : [...new Set([...h.missed, pattern.id])],
    }));
  }
  return (
    <section className="space-y-5" data-testid="speaking-pattern-practice">
      <header>
        <h2 className="font-display text-2xl">Build more with fewer forms</h2>
        <p className="mt-2 text-muted-foreground">
          Learn a useful frame, then put ten verbs into it. Change the first verb to change who is
          speaking or when.
        </p>
      </header>
      <button
        className={button}
        aria-pressed={review}
        onClick={() => {
          const next = !review;
          setReview(next);
          if (next) {
            const first = SPEAKING_PATTERNS.find((p) => habit.missed.includes(p.id));
            if (first) choose(first);
          }
        }}
      >
        Review my tricky patterns ({habit.missed.length})
      </button>
      <label className="block font-semibold">
        Speaking frame
        <select
          className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 py-2"
          value={pattern.id}
          disabled={!available.length}
          onChange={(e) => {
            const next = SPEAKING_PATTERNS.find((p) => p.id === e.target.value);
            if (next) choose(next);
          }}
        >
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.meaning}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary className="min-h-11 cursor-pointer font-semibold">Explore speaking frames</summary>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((p) => (
            <button
              key={p.id}
              className={`${button} text-left ${pattern.id === p.id ? "border-gold bg-gold/10" : ""}`}
              aria-pressed={pattern.id === p.id}
              onClick={() => choose(p)}
            >
              <span className="block">{p.label}</span>
              <span className="block text-sm font-normal text-muted-foreground">{p.meaning}</span>
            </button>
          ))}
        </div>
      </details>
      {review && !available.length && (
        <p>No tricky patterns saved today. Try a new pattern below.</p>
      )}
      <article
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
        aria-label="Pattern practice card"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl">{pattern.label}</h3>
          <span>{index + 1} / 10</span>
        </div>
        <p>{pattern.note}</p>
        <p className="rounded-xl bg-background p-3">
          <strong>{pattern.example}</strong>
          <span className="mt-1 block text-muted-foreground">{pattern.translation}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <button className={button} onClick={() => speech.speakSentence(pattern.example, 0)}>
            <Volume2 className="mr-2 inline size-4" />
            Listen to example
          </button>
          <button
            className={button}
            aria-pressed={typed}
            onClick={() => {
              setTyped(!typed);
              setInput("");
              setFeedback("");
              setCorrect(false);
            }}
          >
            {typed ? "Choose a form" : "Type it from memory"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {verb.infinitive} · to {verb.en}
        </p>
        <p className="font-display text-3xl" data-testid="verb-pattern-prompt">
          {pattern.frame} <span className="text-gold-ink">{correct ? answer : "______"}</span>{" "}
          {tail}
        </p>
        <p className="text-sm text-muted-foreground">{speakingNativeExample(pattern, verb)}</p>
        {typed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check(input);
            }}
            className="flex flex-wrap gap-2"
          >
            <label className="grow">
              Your verb form
              <input
                className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 py-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </label>
            <button className={button} disabled={correct || !input.trim()}>
              Check
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                key={choice}
                className={button}
                disabled={correct}
                onClick={() => check(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
        )}
        <p
          role="status"
          className={correct ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}
          data-testid="verb-pattern-feedback"
        >
          {feedback}
        </p>
        {correct && (
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => speech.speakSentence(sentence, 0)}>
              Hear my sentence
            </button>
            <button
              className={`${button} border-gold`}
              onClick={() => {
                setIndex((index + 1) % SPEAKING_VERBS.length);
                setCorrect(false);
                setFeedback("");
                setInput("");
                speech.stop();
              }}
            >
              {index === 9 ? "Practice these ten again" : "Next verb"}
            </button>
          </div>
        )}
      </article>
      <p className="text-sm text-muted-foreground">
        These frames help you speak sooner. You still learn the anchor verbs, tense choices,
        irregular forms and agreement as you progress.
      </p>
    </section>
  );
}
