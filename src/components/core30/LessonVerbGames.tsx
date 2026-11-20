import { useEffect, useMemo, useRef, useState } from "react";
import { XCircle } from "lucide-react";
import type { LessonVerb } from "@/lib/lesson-content-core";
import type { SpanishPattern } from "@/data/spanish-basics";
import { useSpeech } from "@/state/speech-state";
import { useReadingNoticeScope } from "@/hooks/use-listening-speaker";
import { MATCH_MISMATCH_MS, shuffle } from "@/lib/lesson-practice";
import {
  clearPairMismatch,
  EMPTY_PAIR_BOARD,
  gameRoundItems,
  GAME_LETTERS,
  gameAnswer,
  lessonGameBank,
  maskedAnswer,
  pairTileState,
  tapPairAnswer,
  tapPairPrompt,
  type LessonGameItem,
  type PairBoard,
} from "@/lib/lesson-verb-games";

type Game = "meanings" | "matching" | "hangman" | "choice" | "typing";
const games: [Game, string][] = [
  ["meanings", "Match verb meanings"],
  ["matching", "Match conjugations"],
  ["hangman", "Hangman"],
  ["choice", "Choose the form"],
  ["typing", "Type the form"],
];
const buttonShape = "min-h-11 rounded-lg border px-3 py-2 text-foreground disabled:opacity-50";
const buttonTone = "border-border bg-background aria-pressed:bg-gold aria-pressed:text-background";
const button = `${buttonShape} ${buttonTone}`;
/** A matching tile. Its colours come from its state: the usual tone, or red for a wrong pair. */
const pairTile = `${buttonShape} relative min-w-0 w-full whitespace-normal break-words px-2 text-sm sm:px-3 sm:text-base`;
/** The word-match red. It replaces the picked prompt's gold, so BOTH tiles of a wrong pair show it. */
const pairTileWrong = "border-red-500/60 bg-red-500/10";

/** Colour is not the only signal: a wrong tile also carries this mark. */
function WrongMark() {
  return (
    <XCircle
      data-testid="verb-match-wrong-mark"
      className="pointer-events-none absolute right-1 top-1 h-3.5 w-3.5 text-red-500"
      aria-hidden="true"
    />
  );
}
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
          language={language}
          source={game === "meanings" ? bank.meanings : bank.forms}
          replay={() => setRound((n) => n + 1)}
        />
      )}
    </section>
  );
}
export function GameRound({
  game,
  language,
  source,
  replay,
  onComplete,
  onSkip,
}: {
  game: Game;
  language: string;
  source: LessonGameItem[];
  replay: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
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
  const [pairs, setPairs] = useState<PairBoard>(EMPTY_PAIR_BOARD);
  const { matched } = pairs;
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    },
    [],
  );
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
  // An answer that could not be read aloud in HD belongs to its question: the next question
  // and leaving the round withdraw its notice.
  useReadingNoticeScope(matching ? null : index);
  function pickAnswer(item: LessonGameItem) {
    const result = tapPairAnswer(pairs, item.id);
    if (result.outcome === "ignored") return;
    if (result.outcome === "needs-prompt") {
      setFeedback("Choose a prompt first.");
      return;
    }
    setPairs(result.board);
    if (result.outcome === "matched") {
      setFeedback("Matched. " + item.answer);
      speakSentence(item.answer, 0);
      return;
    }
    const miss = result.board.wrong;
    if (!miss) return;
    setFeedback("");
    // Both tiles show red, then clear together so the learner can try them again. The timer
    // names its own miss: one left over from an earlier miss, or from a miss the learner has
    // already tapped past, cannot clear a newer one.
    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    mismatchTimer.current = setTimeout(
      () => setPairs((latest) => clearPairMismatch(latest, miss.serial)),
      MATCH_MISMATCH_MS,
    );
  }
  function check(value: string) {
    if (!current) return;
    const subjects =
      ["Spanish", "English"].includes(language) && current.prompt.includes(" · ")
        ? current.prompt.split(" · ")[0].split(" / ")
        : [];
    if (gameAnswer(current.answer, value, subjects)) {
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
          <button type="button" className={button} onClick={onComplete ?? replay}>
            {onComplete ? "Continue cards" : "Play again"}
          </button>
        </>
      ) : matching ? (
        <>
          <p>
            Match each prompt to its {language} answer. {matched.length} of {items.length} matched.
          </p>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
            <div className="grid min-w-0 gap-2">
              {board.map((v) => {
                const state = pairTileState(pairs, v.id, "prompt");
                return (
                  <button
                    type="button"
                    key={v.id}
                    data-testid="verb-match-prompt"
                    data-wrong={state === "wrong" ? "true" : "false"}
                    className={`${pairTile} ${state === "wrong" ? pairTileWrong : buttonTone}`}
                    // The picked prompt stays picked (pressed) while both tiles show red.
                    aria-pressed={pairs.selected === v.id}
                    disabled={state === "matched"}
                    onClick={() => setPairs(tapPairPrompt(pairs, v.id).board)}
                  >
                    {v.prompt.split("/").map((part, index, parts) => (
                      <span key={index}>
                        {part}
                        {index < parts.length - 1 && (
                          <>
                            /<wbr />
                          </>
                        )}
                      </span>
                    ))}
                    {state === "wrong" && <WrongMark />}
                  </button>
                );
              })}
            </div>
            <div className="grid min-w-0 gap-2">
              {right
                .filter((v) => board.some((b) => b.id === v.id))
                .map((v) => {
                  const state = pairTileState(pairs, v.id, "answer");
                  return (
                    <button
                      type="button"
                      key={v.id}
                      data-testid="verb-match-answer"
                      data-wrong={state === "wrong" ? "true" : "false"}
                      className={`${pairTile} ${state === "wrong" ? pairTileWrong : buttonTone}`}
                      disabled={state === "matched"}
                      onClick={() => pickAnswer(v)}
                    >
                      {v.answer}
                      {state === "wrong" && <WrongMark />}
                    </button>
                  );
                })}
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
                {language} form
                <input
                  aria-label={`Game ${language} form`}
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
      {/* Colour is not the only signal: the miss is also said here, and announced. */}
      <p role="status" className="min-h-6">
        {matching && pairs.wrong ? "Not a match. Try again." : feedback}
      </p>
      {!finished && onSkip && (
        <button
          type="button"
          className="min-h-11 text-sm text-muted-foreground underline"
          onClick={onSkip}
        >
          Skip this activity
        </button>
      )}
    </div>
  );
}
