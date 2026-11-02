import { useMemo, useState } from "react";
import type { LessonVerb } from "@/lib/lesson-content-core";
import { lessonVerbQuestions, type LessonVerbGame } from "@/lib/lesson-verb-games";
import { shuffle } from "@/lib/lesson-practice";

export function LessonVerbGames({ verbs, language }: { verbs: LessonVerb[]; language: string }) {
  const [mode, setMode] = useState<LessonVerbGame | null>(null);
  const [round, setRound] = useState(0);
  return (
    <section
      aria-label="Lesson verb games"
      className="space-y-3 rounded-xl border border-border bg-card p-4 text-foreground"
    >
      <h3 className="text-lg font-semibold">Verb games · this lesson</h3>
      <p className="text-sm">
        Practice base verbs and present-tense forms before returning to the lesson.
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["infinitives", "Match the infinitive"],
            ["conjugations", "Choose the conjugation"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            className="min-h-11 rounded-lg border border-border px-3 py-2 font-semibold aria-pressed:bg-gold aria-pressed:text-background"
            onClick={() => {
              setMode(id);
              setRound((value) => value + 1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode && (
        <VerbGameRound
          key={`${language}:${JSON.stringify(verbs)}:${mode}:${round}`}
          verbs={verbs}
          language={language}
          mode={mode}
          onReplay={() => setRound((value) => value + 1)}
        />
      )}
    </section>
  );
}
function VerbGameRound({
  verbs,
  language,
  mode,
  onReplay,
}: {
  verbs: LessonVerb[];
  language: string;
  mode: LessonVerbGame;
  onReplay: () => void;
}) {
  const questions = useMemo(
    () => shuffle(lessonVerbQuestions(verbs, language, mode)).slice(0, 10),
    [verbs, language, mode],
  );
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(false);
  const [missed, setMissed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [firstTry, setFirstTry] = useState(0);
  const current = questions[index];
  if (!questions.length)
    return (
      <p>
        No distinct answer choices are available for these forms. Use the verb study cards below.
      </p>
    );
  if (!current)
    return (
      <div role="status" className="space-y-2">
        <p>
          Round complete · {firstTry} of {questions.length} correct on the first try.
        </p>
        <p>
          Review any forms you missed, then try again. Game scores do not mark a lesson mastered.
        </p>
        <button
          type="button"
          className="min-h-11 rounded border border-border px-3"
          onClick={onReplay}
        >
          Play again
        </button>
      </div>
    );
  return (
    <div className="space-y-3">
      <p>
        Question {index + 1} of {questions.length} · Present tense
      </p>
      <p className="text-xl font-semibold">{current.prompt}</p>
      <p>{current.meaning}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {current.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={correct}
            className="min-h-12 rounded-lg border border-border bg-background p-3 text-lg disabled:opacity-60"
            onClick={() => {
              if (choice === current.answer) {
                setCorrect(true);
                if (!missed) setFirstTry((value) => value + 1);
                setFeedback(`Correct. ${current.explanation}`);
              } else {
                setMissed(true);
                setFeedback(`Try again. ${current.explanation}`);
              }
            }}
          >
            {choice}
          </button>
        ))}
      </div>
      <p role="status" className="min-h-6">
        {feedback}
      </p>
      {correct && (
        <button
          type="button"
          className="min-h-11 rounded bg-gold px-4 font-semibold text-background"
          onClick={() => {
            setIndex((value) => value + 1);
            setCorrect(false);
            setMissed(false);
            setFeedback("");
          }}
        >
          {index + 1 === questions.length ? "See score" : "Next question"}
        </button>
      )}
    </div>
  );
}
