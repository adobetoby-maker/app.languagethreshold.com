import { useMemo, useState } from "react";
import type { LessonVerb } from "@/lib/lesson-content-core";
import type { SpanishPattern } from "@/data/spanish-basics";
import { useSpeech } from "@/state/speech-state";
import { shuffle } from "@/lib/lesson-practice";
import {
  gameRoundItems,
  GAME_LETTERS,
  gameAnswer,
  lessonGameBank,
  maskedAnswer,
  type LessonGameItem,
} from "@/lib/lesson-verb-games";

type Game = "meanings" | "matching" | "hangman" | "choice" | "typing";
const games: [Game, string][] = [
  ["meanings", "Match verb meanings"],
  ["matching", "Match conjugations"],
  ["hangman", "Hangman"],
  ["choice", "Choose the form"],
  ["typing", "Type the form"],
];
const button =
  "min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-foreground disabled:opacity-50 aria-pressed:bg-gold aria-pressed:text-background";
export function LessonVerbGames({
  verbs,
  language,
  pattern,
}: {
  verbs: LessonVerb[];
  language: string;
  pattern?: SpanishPattern;
}) {
  const bank = useMemo(() => lessonGameBank(verbs, language, pattern), [verbs, language, pattern]);
  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState(0);
  if (!bank.forms.length) return null;
  return (
    <section
      aria-label="Lesson verb games"
      className="my-4 space-y-3 rounded-xl border border-border bg-card p-4 text-foreground"
    >
      <h3 className="text-lg font-semibold">Verb games · this lesson</h3>
      <p className="text-sm">
        {bank.label}. Practice this lesson’s verbs. Game scores are separate from lesson mastery.
      </p>
      <div className="flex flex-wrap gap-2">
        {games.map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={button}
            aria-pressed={game === id}
            onClick={() => {
              setGame(id);
              setRound((n) => n + 1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {game && (
        <GameRound
          key={`${game}:${round}`}
          game={game}
          source={game === "meanings" ? bank.meanings : bank.forms}
          replay={() => setRound((n) => n + 1)}
        />
      )}
    </section>
  );
}
function GameRound({
  game,
  source,
  replay,
}: {
  game: Game;
  source: LessonGameItem[];
  replay: () => void;
}) {
  const { speakSentence } = useSpeech();
  const items = useMemo(() => gameRoundItems(shuffle(source)), [source]);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const right = useMemo(() => shuffle(items), [items]);
  const current = items[index];
  const choices = useMemo(
    () =>
      current
        ? shuffle([
            current.answer,
            ...shuffle(items.filter((v) => v.answer !== current.answer))
              .slice(0, 3)
              .map((v) => v.answer),
          ])
        : [],
    [items, current],
  );
  const matching = game === "matching" || game === "meanings";
  // Keep a board stable until all of its pairs have been matched.
  const boardStart = Math.floor(Math.min(matched.length, items.length - 1) / 4) * 4;
  const board = items.slice(boardStart, boardStart + 4);
  const finished = matching ? matched.length === items.length : !current;
  function check(value: string) {
    if (!current) return;
    if (gameAnswer(current.answer, value)) {
      setDone(true);
      if (!missed) setScore((n) => n + 1);
      setFeedback("Correct. " + current.answer);
    } else {
      setMissed(true);
      setFeedback("Try again. Check the person and the pattern.");
    }
  }
  function next() {
    setIndex((n) => n + 1);
    setDone(false);
    setMissed(false);
    setFeedback("");
    setAnswer("");
    setGuesses([]);
  }
  const wrong = current
    ? guesses.filter((c) => !current.answer.toLowerCase().includes(c)).length
    : 0;
  const won = current ? !maskedAnswer(current.answer, guesses).includes("＿") : false;
  const lost = wrong >= 6;
  return (
    <div className="space-y-3" data-testid="lesson-verb-game-round">
      {finished ? (
        <>
          <p role="status">
            Round complete ·{" "}
            {matching
              ? `${matched.length} pairs matched`
              : `${score} of ${items.length} correct on the first try`}
            .
          </p>
          <button type="button" className={button} onClick={replay}>
            Play again
          </button>
        </>
      ) : matching ? (
        <>
          <p>
            Match each prompt to its Spanish answer. {matched.length} of {items.length} matched.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              {board.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  className={button}
                  aria-pressed={selected === v.id}
                  disabled={matched.includes(v.id)}
                  onClick={() => setSelected(v.id)}
                >
                  {v.prompt}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {right
                .filter((v) => board.some((b) => b.id === v.id))
                .map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    className={button}
                    disabled={matched.includes(v.id)}
                    onClick={() => {
                      if (!selected) {
                        setFeedback("Choose a prompt first.");
                        return;
                      }
                      if (selected === v.id) {
                        setMatched((m) => [...m, v.id]);
                        setSelected(null);
                        setFeedback("Matched. " + v.answer);
                        speakSentence(v.answer, 0);
                      } else setFeedback("Try another pair.");
                    }}
                  >
                    {v.answer}
                  </button>
                ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <p>
            Question {index + 1} of {items.length}
          </p>
          <p className="text-lg font-semibold">{current.prompt}</p>
          <p>{current.meaning}</p>
          {game === "hangman" ? (
            <>
              <p className="break-words text-xl" aria-label="Hidden verb">
                {maskedAnswer(current.answer, guesses)}
              </p>
              <p>
                {wrong} of 6 misses · {"●".repeat(wrong)}
                {"○".repeat(6 - wrong)}
              </p>
              <div className="flex flex-wrap gap-1">
                {GAME_LETTERS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={button}
                    disabled={guesses.includes(c) || won || lost}
                    onClick={() => {
                      const next = [...guesses, c];
                      setGuesses(next);
                      if (!current.answer.toLowerCase().includes(c)) setMissed(true);
                      if (!maskedAnswer(current.answer, next).includes("＿")) {
                        setDone(true);
                        if (!missed) setScore((s) => s + 1);
                        setFeedback("Solved. " + current.answer);
                      } else if (
                        next.filter((l) => !current.answer.toLowerCase().includes(l)).length >= 6
                      ) {
                        setDone(true);
                        setFeedback("Answer: " + current.answer);
                      }
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          ) : game === "typing" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                check(answer);
              }}
              className="flex flex-wrap gap-2"
            >
              <label className="w-full">
                Spanish form
                <input
                  aria-label="Game Spanish form"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={answer}
                  disabled={done}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={`${button} ml-2 max-w-full`}
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {[..."áéíóúüñ"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={button}
                    disabled={done}
                    onClick={() => setAnswer((a) => a + c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button className={button} disabled={done || !answer.trim()}>
                Check form
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={done}
                  className={button}
                  onClick={() => check(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {done && (
            <>
              <button
                type="button"
                className={button}
                onClick={() => speakSentence(current.answer, 0)}
              >
                Listen to answer
              </button>
              <button type="button" className={button} onClick={next}>
                {index + 1 === items.length ? "See score" : "Next question"}
              </button>
            </>
          )}
        </>
      )}
      <p role="status" className="min-h-6">
        {feedback}
      </p>
    </div>
  );
}
