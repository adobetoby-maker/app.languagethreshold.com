import { useState } from "react";
import patterns from "@/data/verbs-practice-patterns.json";
import { DAILY_VERBS } from "@/lib/verb-speaking-practice";
import { LessonVerbGames } from "@/components/core30/LessonVerbGames";
import { useSpeech } from "@/state/speech-state";
export function ConjugationPractice() {
  const [selected, setSelected] = useState("warmup"),
    speech = useSpeech();
  const pattern = patterns.patterns.find((p) => p.id === selected);
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl">Conjugation workshop</h2>
      <p>One pattern at a time. Ten verbs to make it stick.</p>
      <label className="block font-semibold">
        Choose a teaching pattern
        <select
          className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 py-2"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            speech.stop();
          }}
        >
          <option value="warmup">Everyday verbs · present-tense warmup</option>
          {patterns.patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        The course’s 28 teaching families cover regular changes, irregular forms, tense patterns,
        commands, gerunds and participles.
      </p>
      <LessonVerbGames key={selected} language="Spanish" verbs={DAILY_VERBS} pattern={pattern} />
      <details className="rounded-xl border p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">Study the forms</summary>
        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          {(pattern?.verbs ?? DAILY_VERBS).map((v) => (
            <article key={v.infinitive} className="rounded-xl border p-3">
              <h3 className="font-semibold">
                {v.infinitive} · {v.native}
              </h3>
              <dl className="mt-2 space-y-1">
                {Object.entries(v.forms).map(([person, form]) => (
                  <div key={person} className="flex items-center justify-between gap-3">
                    <dt className="text-sm">{person.replaceAll("_", " / ")}</dt>
                    <dd>
                      <button
                        className="min-h-11 rounded-lg px-2 font-semibold"
                        aria-label={`Hear ${form}`}
                        onClick={() => speech.speakSentence(form, 0)}
                      >
                        {form}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
