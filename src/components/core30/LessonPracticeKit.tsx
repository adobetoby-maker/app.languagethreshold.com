import { playFlashcardSuccess } from "@/lib/sound-effects";
// Built by TAC — 2026-10-15
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Headphones,
  Keyboard,
  Layers,
  Loader2,
  PenLine,
  Puzzle,
  RotateCcw,
  Repeat,
  Volume2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHandwritingReader, type WriteOutcome } from "@/hooks/use-handwriting-reader";
import { AnswerFeedback } from "@/components/core30/AnswerFeedback";
import { HandwritingPad, type HandwritingPadHandle } from "@/components/core30/HandwritingPad";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VerbPractice } from "@/components/core30/VerbPractice";
import { compareAnswer } from "@/lib/answer-feedback";
import { checkHandwritten } from "@/lib/handwriting-check";
import { useApp, type Language } from "@/state/app-state";
import { useFlashcards } from "@/state/flashcard-state";
import { ACCENTS_BY_LANGUAGE, useSpeech } from "@/state/speech-state";
import { useOwnedSpeaker } from "@/hooks/use-owned-speaker";
import type { LessonWord } from "@/data/curriculum";
import type { LessonVerb } from "@/lib/lesson-content-core";
import {
  advanceDeck,
  buildListenOptions,
  buildMatchTiles,
  groupByKind,
  shuffle,
  splitRounds,
  vocabKey,
  wordsToAdd,
  type MatchTile,
} from "@/lib/lesson-practice";
import {
  isCorrectTypedAnswer,
  languageCode,
  languageTag,
  SPECIAL_CHARS_BY_LANGUAGE,
} from "@/lib/lesson-words-core";

export type PracticeMode = "study" | "flashcards" | "match" | "verbs" | "listen" | "type" | "write";

export interface LessonPracticeKitProps {
  words: LessonWord[];
  moduleId: string;
  lessonNumber: number;
  onActivity?: (activity: PracticeMode) => void;
  /** Uncontrolled starting mode (default "study"). Ignored when `mode` is passed. */
  initialMode?: PracticeMode;
  /** Controlled mode: pass with `onModeChange` so a parent can switch the kit (e.g. open Match). */
  mode?: PracticeMode;
  onModeChange?: (mode: PracticeMode) => void;
  /** Full-screen lesson flow: hide secondary navigation/actions and report objective completion. */
  focusMode?: boolean;
  onModeComplete?: (mode: PracticeMode) => void;
  /**
   * The language being learned (default "Spanish"). It sets the speech locale, the language
   * names in labels, the typing check, and the language "Add to my flashcards" saves under.
   * Each word's `es` is this language; `en` is the learner's native language.
   */
  language?: string;
  /** The learner's native language, used only for labels (default "English"). */
  nativeLanguage?: string;
  matchingBatchSize?: number;
  listeningItems?: LessonWord[];
  /**
   * The lesson's verbs (authored lesson content). When present, Recall it gains a Verbs tab
   * (verb cards) and Type it gains a Words | Verbs switch (conjugation drill). Inside a lesson
   * only; the standalone six-tab kit ignores them.
   */
  verbs?: LessonVerb[];
  writingResponse?: ReactNode;
}

interface KitLanguages {
  /** Target language name, e.g. "Spanish". */
  target: string;
  /** Native language name, e.g. "English". */
  native: string;
}

const SPANISH: Language = "Spanish";

const KitLanguageContext = createContext<KitLanguages>({ target: "Spanish", native: "English" });
const useKitLanguages = () => useContext(KitLanguageContext);

const MODES: { id: PracticeMode; label: string; Icon: typeof BookOpen }[] = [
  { id: "study", label: "Study", Icon: BookOpen },
  { id: "flashcards", label: "Cards", Icon: Layers },
  { id: "match", label: "Match", Icon: Puzzle },
  { id: "listen", label: "Listen", Icon: Headphones },
  { id: "type", label: "Type", Icon: Keyboard },
  { id: "write", label: "Write", Icon: PenLine },
];

/** The modes Recall it covers; inside a lesson they get a small switch of their own. */
const RECALL_MODES = MODES.filter(
  ({ id }) => id === "study" || id === "flashcards" || id === "match",
);
const VERBS_TAB = { id: "verbs" as PracticeMode, label: "Verbs", Icon: Repeat };

// ─── Shared styling ───────────────────────────────────────────────────────────

const primaryBtn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/30 px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:border-gold/40 hover:bg-gold/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const panel = "rounded-xl border border-border/50 bg-card/30 p-4";

// ─── Target-language speech (reuses the app's tts.ts + voices.ts path) ────────

function useTargetSpeaker(): (text: string) => void {
  const { target } = useKitLanguages();
  const { accent } = useSpeech();
  const accents = ACCENTS_BY_LANGUAGE[target as Language] ?? ACCENTS_BY_LANGUAGE[SPANISH];
  const defaultLocale = accents[0].code;
  // The learner's chosen accent applies when it belongs to this language (es-MX for Spanish);
  // otherwise the language's first accent is used.
  const locale =
    accent && accent.toLowerCase().startsWith(defaultLocale.slice(0, 2).toLowerCase())
      ? accent
      : defaultLocale;

  const speakOwned = useOwnedSpeaker(locale);
  return useCallback((text: string) => speakOwned(text, locale), [locale, speakOwned]);
}

function SpeakButton({
  text,
  speak,
  className,
}: {
  text: string;
  speak: (text: string) => void;
  className?: string;
}) {
  const { target } = useKitLanguages();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(text);
      }}
      aria-label={`Play ${target} audio: ${text}`}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-all duration-200 hover:bg-gold/20 active:scale-95",
        className,
      )}
    >
      <Volume2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/30" aria-hidden="true">
      <div className="h-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function DoneNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-foreground">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

// ─── 1. Study list ────────────────────────────────────────────────────────────

function WordRow({ word, speak }: { word: LessonWord; speak: (text: string) => void }) {
  const { target } = useKitLanguages();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p lang={languageTag(target)} className="break-words text-base font-semibold text-gold">
          {word.es}
        </p>
        <p className="break-words text-sm text-foreground">{word.en}</p>
        {word.note ? (
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{word.note}</p>
        ) : null}
      </div>
      <SpeakButton text={word.es} speak={speak} />
    </li>
  );
}

function StudyMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
  const speak = useTargetSpeaker();
  const [done, setDone] = useState(false);
  const { terms, phrases } = useMemo(() => groupByKind(words), [words]);

  return (
    <div className="space-y-4">
      {terms.length > 0 && (
        <section aria-label="Terms">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Terms ({terms.length})
          </h4>
          <ul className="space-y-2">
            {terms.map((word) => (
              <WordRow key={`${word.kind}-${word.es}`} word={word} speak={speak} />
            ))}
          </ul>
        </section>
      )}
      {phrases.length > 0 && (
        <section aria-label="Phrases">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Phrases ({phrases.length})
          </h4>
          <ul className="space-y-2">
            {phrases.map((word) => (
              <WordRow key={`${word.kind}-${word.es}`} word={word} speak={speak} />
            ))}
          </ul>
        </section>
      )}
      {done ? (
        <DoneNotice>Nice. Now try the cards, match, listen, type and write modes.</DoneNotice>
      ) : (
        <button
          type="button"
          className={cn(primaryBtn, "w-full")}
          onClick={() => {
            setDone(true);
            onComplete();
          }}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Done studying
        </button>
      )}
    </div>
  );
}

// ─── 2. Flashcards ────────────────────────────────────────────────────────────

function FlashcardsMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  const [direction, setDirection] = useState<"en-es" | "es-en">("en-es");
  const [queue, setQueue] = useState<number[]>(() => shuffle(words.map((_, i) => i)));
  const [flipped, setFlipped] = useState(false);
  const total = words.length;
  const finished = queue.length === 0;

  const answer = (outcome: "got" | "again") => {
    if (outcome === "got") void playFlashcardSuccess();
    const next = advanceDeck(queue, outcome);
    setQueue(next);
    setFlipped(false);
    if (next.length === 0) onComplete();
  };

  const restart = () => {
    setQueue(shuffle(words.map((_, i) => i)));
    setFlipped(false);
  };

  const word = finished ? null : words[queue[0]];
  const front = word ? (direction === "en-es" ? word.en : word.es) : "";
  const back = word ? (direction === "en-es" ? word.es : word.en) : "";
  const frontIsTarget = direction === "es-en";
  const shownIsTarget = flipped ? !frontIsTarget : frontIsTarget;
  const shownLang = languageTag(shownIsTarget ? target : native);

  return (
    <div className="stable-word-practice space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Card direction"
          className="inline-flex rounded-xl border border-border/50 bg-card/30 p-1"
        >
          {(
            [
              ["en-es", `${languageCode(native)} to ${languageCode(target)}`],
              ["es-en", `${languageCode(target)} to ${languageCode(native)}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={direction === id}
              onClick={() => {
                setDirection(id);
                setFlipped(false);
              }}
              className={cn(
                "min-h-11 cursor-pointer rounded-lg px-3 text-xs font-bold transition-all duration-200",
                direction === id
                  ? "bg-gold text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-sm font-semibold text-muted-foreground">
          {total - queue.length} / {total}
        </span>
      </div>
      <ProgressBar value={total - queue.length} total={total} />

      {finished || !word ? (
        <div className="space-y-3">
          <DoneNotice>Deck finished: all {total} cards marked Got it.</DoneNotice>
          <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Go again
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            data-testid="flashcard"
            onClick={() => setFlipped((v) => !v)}
            aria-label={flipped ? "Show the front of the card" : "Flip the card"}
            className={cn(
              "flex h-[200px] overflow-y-auto overscroll-contain w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all duration-300",
              flipped ? "border-gold/50 bg-gold/10" : "border-border/50 bg-card/30",
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {shownIsTarget ? target : native}
            </span>
            <span
              lang={shownLang}
              className={cn(
                "break-words text-2xl font-bold",
                shownIsTarget ? "text-gold" : "text-foreground",
              )}
            >
              {flipped ? back : front}
            </span>
            {flipped && word.note ? (
              <span className="break-words text-xs text-muted-foreground">{word.note}</span>
            ) : null}
          </button>
          <div data-testid="lesson-cards-grading" className="flex items-center gap-2">
            <SpeakButton text={word.es} speak={speak} />
            <button
              type="button"
              onClick={() => answer("again")}
              className={cn(ghostBtn, "flex-1")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Again
            </button>
            <button
              type="button"
              onClick={() => answer("got")}
              className={cn(primaryBtn, "flex-1")}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Got it
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Tap the card to flip. Already know it? Grade either side.
          </p>
        </>
      )}
    </div>
  );
}

// ─── 3. Memory match ──────────────────────────────────────────────────────────

function MatchMode({
  words,
  onComplete,
  maxPairs,
}: {
  words: LessonWord[];
  onComplete: () => void;
  maxPairs?: number;
}) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  const terms = useMemo(() => words.filter((w) => w.kind === "term"), [words]);
  const [rounds, setRounds] = useState(() => splitRounds(shuffle(terms), maxPairs));
  const [roundIndex, setRoundIndex] = useState(0);
  const [tiles, setTiles] = useState<MatchTile[]>(() =>
    rounds[0] ? buildMatchTiles(rounds[0]) : [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const round = rounds[roundIndex] ?? [];
  const roundDone = round.length > 0 && matched.size === round.length;
  const lastRound = roundIndex >= rounds.length - 1;

  if (terms.length < 2) {
    return (
      <div className={cn(panel, "text-sm text-muted-foreground")}>
        This lesson has too few single-word terms for a matching game. Try the cards or type mode.
      </div>
    );
  }

  const tap = (tile: MatchTile) => {
    if (wrong.length > 0 || matched.has(tile.pairId) || roundDone) return;
    if (tile.side === "es") speak(tile.text);
    if (selected === null) {
      setSelected(tile.id);
      return;
    }
    if (selected === tile.id) {
      setSelected(null);
      return;
    }
    const first = tiles.find((t) => t.id === selected);
    if (!first || first.side === tile.side) {
      setSelected(tile.id);
      return;
    }
    if (first.pairId === tile.pairId) {
      const next = new Set(matched);
      next.add(tile.pairId);
      setMatched(next);
      setSelected(null);
      if (next.size === round.length && lastRound) {
        setFinished(true);
        onComplete();
      }
      return;
    }
    setMistakes((m) => m + 1);
    setWrong([first.id, tile.id]);
    timer.current = setTimeout(() => {
      setWrong([]);
      setSelected(null);
    }, 600);
  };

  const nextRound = () => {
    const next = roundIndex + 1;
    setRoundIndex(next);
    setTiles(buildMatchTiles(rounds[next]));
    setMatched(new Set());
    setSelected(null);
    setWrong([]);
  };

  const restart = () => {
    const nextRounds = splitRounds(shuffle(terms), maxPairs);
    setRounds(nextRounds);
    setRoundIndex(0);
    setTiles(buildMatchTiles(nextRounds[0]));
    setMatched(new Set());
    setSelected(null);
    setWrong([]);
    setMistakes(0);
    setFinished(false);
  };

  const totalPairs = terms.length;
  const donePairs =
    rounds.slice(0, roundIndex).reduce((sum, r) => sum + r.length, 0) + matched.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Round {Math.min(roundIndex + 1, rounds.length)} of {rounds.length}
        </span>
        <span className="font-mono">
          {donePairs} / {totalPairs} pairs
        </span>
      </div>
      <ProgressBar value={donePairs} total={totalPairs} />

      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.pairId);
          const isSelected = selected === tile.id;
          const isWrong = wrong.includes(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              data-testid="match-tile"
              data-matched={isMatched ? "true" : "false"}
              disabled={isMatched}
              aria-pressed={isSelected}
              onClick={() => tap(tile)}
              lang={languageTag(tile.side === "es" ? target : native)}
              className={cn(
                "min-h-[56px] cursor-pointer break-words rounded-xl border px-2 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
                tile.side === "es" ? "text-gold" : "text-foreground",
                isMatched && "pointer-events-none border-border/20 bg-transparent opacity-25",
                !isMatched && isSelected && "border-gold bg-gold/20",
                !isMatched && isWrong && "border-red-500/60 bg-red-500/10",
                !isMatched &&
                  !isSelected &&
                  !isWrong &&
                  "border-border/50 bg-card/30 hover:border-gold/40",
              )}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      {roundDone && !lastRound && (
        <button type="button" className={cn(primaryBtn, "w-full")} onClick={nextRound}>
          Next round
        </button>
      )}
      {finished && (
        <div className="space-y-3">
          <DoneNotice>
            All {totalPairs} terms matched
            {mistakes === 0
              ? " with no misses."
              : ` with ${mistakes} miss${mistakes === 1 ? "" : "es"}.`}
          </DoneNotice>
          <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 4. Listening check ───────────────────────────────────────────────────────

function ListenMode({
  words,
  onComplete,
  contextual = false,
}: {
  words: LessonWord[];
  onComplete: () => void;
  contextual?: boolean;
}) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  const [order, setOrder] = useState<LessonWord[]>(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = order[index];
  const options = useMemo(
    () => (current ? buildListenOptions(words, current) : []),
    [words, current],
  );

  if (words.length === 0 || !current) return null;

  const pick = (option: string) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === current.en) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= order.length) {
      setFinished(true);
      onComplete();
      return;
    }
    const upcoming = order[index + 1];
    setIndex(index + 1);
    setPicked(null);
    speak(upcoming.es);
  };

  const restart = () => {
    setOrder(shuffle(words));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="stable-word-practice space-y-3">
        <DoneNotice>
          Listening check finished: {score} / {order.length} correct.
        </DoneNotice>
        <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Go again
        </button>
      </div>
    );
  }

  return (
    <div className="stable-word-practice space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {contextual ? "Message" : "Word"} {index + 1} of {order.length}
        </span>
        <span className="font-mono">Score {score}</span>
      </div>
      <ProgressBar value={index + (picked !== null ? 1 : 0)} total={order.length} />

      <div
        data-testid="lesson-listening-prompt"
        className={cn(
          panel,
          "flex h-[176px] overflow-y-auto overscroll-contain flex-col items-center justify-center gap-2 py-3 text-center",
        )}
      >
        <button
          type="button"
          onClick={() => speak(current.es)}
          aria-label={`Play the ${target} ${contextual ? "message" : "word"}`}
          className="inline-flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold transition-all duration-200 hover:bg-gold/25 active:scale-95"
        >
          <Volume2 className="h-7 w-7" aria-hidden="true" />
        </button>
        <p className="text-sm text-muted-foreground">Listen, then pick the {native} meaning.</p>
        <p
          aria-hidden={picked === null}
          lang={languageTag(target)}
          className={cn("break-words text-lg font-bold text-gold", picked === null && "invisible")}
        >
          {current.es}
        </p>
      </div>

      <div
        data-testid="lesson-listening-options"
        className="grid h-60 content-start gap-2 overflow-y-auto overscroll-contain"
      >
        {options.map((option) => {
          const isAnswer = option === current.en;
          const isPicked = picked === option;
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(option)}
              className={cn(
                "flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 break-words rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all duration-200 disabled:cursor-default",
                picked === null &&
                  "border-border/50 bg-card/30 hover:border-gold/40 active:scale-[0.99]",
                picked !== null &&
                  isAnswer &&
                  "border-emerald-500/60 bg-emerald-500/10 text-foreground",
                picked !== null && isPicked && !isAnswer && "border-red-500/60 bg-red-500/10",
                picked !== null && !isAnswer && !isPicked && "border-border/30 opacity-60",
              )}
            >
              <span>{option}</span>
              {picked !== null && isAnswer && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              )}
              {picked !== null && isPicked && !isAnswer && (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        data-testid="lesson-listening-next"
        disabled={picked === null}
        className={cn(primaryBtn, "w-full")}
        onClick={next}
      >
        {index + 1 >= order.length ? "See score" : "Next word"}
      </button>
    </div>
  );
}

// ─── 5. Type it ───────────────────────────────────────────────────────────────

function TypeMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
  const speak = useTargetSpeaker();
  const { target } = useKitLanguages();
  const specialChars = SPECIAL_CHARS_BY_LANGUAGE[target] ?? [];
  const [order, setOrder] = useState<LessonWord[]>(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = order[index];
  if (words.length === 0 || !current) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (result !== null || !value.trim()) return;
    const correct = isCorrectTypedAnswer(value, current.es);
    setResult(correct ? "right" : "wrong");
    if (correct) setScore((s) => s + 1);
    speak(current.es);
  };

  const next = () => {
    if (index + 1 >= order.length) {
      setFinished(true);
      onComplete();
      return;
    }
    setIndex(index + 1);
    setValue("");
    setResult(null);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const restart = () => {
    setOrder(shuffle(words));
    setIndex(0);
    setValue("");
    setResult(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="stable-word-practice space-y-3">
        <DoneNotice>
          Typing practice finished: {score} / {order.length} correct.
        </DoneNotice>
        <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Go again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stable-word-practice space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {index + 1} of {order.length} · {current.kind}
        </span>
        <span className="font-mono">Score {score}</span>
      </div>
      <ProgressBar value={index + (result !== null ? 1 : 0)} total={order.length} />

      <div
        data-testid="typing-prompt"
        className={cn(panel, "h-28 overflow-y-auto overscroll-contain text-center")}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Type this in {target}
        </p>
        <p className="break-words text-xl font-bold text-foreground">{current.en}</p>
      </div>

      <input
        ref={inputRef}
        data-testid="type-input"
        type="text"
        lang={languageTag(target)}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        readOnly={result !== null}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label={`Your ${target} answer`}
        placeholder={target === "Spanish" ? "Escribe en español" : `Type in ${target}`}
        className={cn(
          "min-h-12 w-full rounded-xl border bg-background px-3 text-base text-foreground outline-none transition-colors duration-200 focus:border-gold",
          result === "right" && "border-emerald-500/60",
          result === "wrong" && "border-red-500/60",
          result === null && "border-border/50",
        )}
      />

      {specialChars.length > 0 && (
        <details className="rounded-xl border border-border/50 px-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm">Accented letters</summary>
          <div className="flex flex-wrap gap-2 pb-2" aria-label={`${target} letters`}>
            {specialChars.map((char) => (
              <button
                key={char}
                type="button"
                disabled={result !== null}
                onClick={() => {
                  setValue((v) => v + char);
                  inputRef.current?.focus({ preventScroll: true });
                }}
                className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-border/50 bg-card/30 px-2 text-base font-semibold transition-all duration-200 hover:border-gold/40 active:scale-95"
              >
                {char}
              </button>
            ))}
          </div>
        </details>
      )}

      <button
        data-testid="typing-primary"
        type={result === null ? "submit" : "button"}
        disabled={result === null && !value.trim()}
        className={cn(primaryBtn, "w-full")}
        onClick={result !== null ? next : undefined}
      >
        {result === null ? "Check" : index + 1 >= order.length ? "See score" : "Next word"}
      </button>
      <div
        data-testid="typing-feedback"
        className="h-40 overflow-y-auto overscroll-contain"
        aria-live="polite"
      >
        {result !== null && (
          <>
            <AnswerFeedback
              given={value}
              expected={current.es}
              language={target}
              scoredCorrect={result === "right"}
              action={<SpeakButton text={current.es} speak={speak} className="h-9 w-9" />}
            />
            {current.note ? (
              <p className="break-words text-xs text-muted-foreground">{current.note}</p>
            ) : null}
          </>
        )}
      </div>
    </form>
  );
}

// ─── 6. Write it (handwriting) ────────────────────────────────────────────────

type WriteStage = "copy" | "answer";

type WriteStep =
  | { phase: "write" }
  | { phase: "reading"; ink: string }
  | { phase: "result"; ink: string; outcome: WriteOutcome };

function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function InkPreview({ png }: { png: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Your writing
      </p>
      <div className="rounded-xl border border-gold/30 bg-[#FAF8F3] p-2">
        <img
          data-testid="write-ink"
          src={`data:image/png;base64,${png}`}
          alt="Your writing"
          className="mx-auto max-h-28 w-auto max-w-full object-contain"
        />
      </div>
    </div>
  );
}

function WritingWorkspace({
  children,
  response,
  onClose,
}: {
  children: ReactNode;
  response?: ReactNode;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState("words");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        data-testid="writing-workspace"
        className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-2 overflow-hidden rounded-none border-0 p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:rounded-none data-[state=open]:animate-none data-[state=closed]:animate-none duration-0 [&>button:last-child]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <header className="mx-auto grid w-full max-w-xl shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <DialogTitle className={response ? "sr-only" : "text-base"}>Writing practice</DialogTitle>
          {response && (
            <select
              aria-label="Writing activity"
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-2 text-base font-semibold sm:text-sm"
            >
              <option value="words">Words</option>
              <option value="response">Response</option>
            </select>
          )}
          <button type="button" onClick={onClose} className={ghostBtn}>
            Back to lesson
          </button>
        </header>
        <DialogDescription className="sr-only">
          Write on the pad with your finger. The lesson stays still. Use Back to lesson to leave
          writing practice.
        </DialogDescription>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-testid="writing-workspace-body"
        >
          <div className="mx-auto w-full max-w-xl">
            <div data-testid="writing-words" hidden={activity !== "words"}>
              {children}
            </div>
            {response && <div hidden={activity !== "response"}>{response}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WriteMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  const readInk = useHandwritingReader(target);
  const online = useOnline();
  const grouped = useMemo(() => groupByKind(words), [words]);
  // Copy goes through the single-word terms; a lesson with no terms copies what it has.
  const copyWords = useMemo(
    () => (grouped.terms.length > 0 ? grouped.terms : words),
    [grouped, words],
  );
  const [answerWords, setAnswerWords] = useState<LessonWord[]>(() => [
    ...shuffle(grouped.terms),
    ...shuffle(grouped.phrases),
  ]);

  const [stage, setStage] = useState<WriteStage>("copy");
  const [copyIndex, setCopyIndex] = useState(0);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [copyScore, setCopyScore] = useState(0);
  const [answerScore, setAnswerScore] = useState(0);
  const [copyFinished, setCopyFinished] = useState(false);
  const [answerFinished, setAnswerFinished] = useState(false);
  const [step, setStep] = useState<WriteStep>({ phase: "write" });
  const [attempt, setAttempt] = useState(0);
  const [inked, setInked] = useState(false);
  const padRef = useRef<HandwritingPadHandle>(null);
  const token = useRef(0);

  const list = stage === "copy" ? copyWords : answerWords;
  const index = stage === "copy" ? copyIndex : answerIndex;
  const word = list[index];
  const finished = stage === "copy" ? copyFinished : answerFinished;

  /** A fresh pad: clears the writing. Used by Start over and when moving to another word. */
  const resetStep = () => {
    token.current += 1;
    setStep({ phase: "write" });
    setInked(false);
    setAttempt((n) => n + 1);
  };

  /** Back to the pad with the writing kept, so the learner can add to it or fix it. */
  const keepWriting = () => {
    token.current += 1;
    setStep({ phase: "write" });
  };

  const switchStage = (next: WriteStage) => {
    if (next === stage) return;
    resetStep();
    setStage(next);
  };

  if (words.length === 0 || (!word && !finished)) return null;

  const check = async () => {
    const ink = padRef.current?.toPngBase64();
    if (!ink || !word) return;
    const mine = ++token.current;
    setStep({ phase: "reading", ink });
    // The copied word is passed as a hint so a hard-to-read letter is resolved in its favour;
    // a word written from memory is read with no hint, so a wrong answer is not read as right.
    const outcome = await readInk(ink, stage === "copy" ? word.es : undefined);
    if (mine !== token.current) return;
    setStep({ phase: "result", ink, outcome });
    if (stage === "answer") speak(word.es);
  };

  const compareMyself = () => {
    const ink = padRef.current?.toPngBase64();
    if (!ink || !word) return;
    token.current += 1;
    setStep({ phase: "result", ink, outcome: { kind: "manual", message: null } });
    if (stage === "answer") speak(word.es);
  };

  const advance = (counted: boolean) => {
    if (stage === "copy") {
      if (counted) setCopyScore((s) => s + 1);
      if (copyIndex + 1 >= copyWords.length) setCopyFinished(true);
      else setCopyIndex(copyIndex + 1);
    } else {
      if (counted) setAnswerScore((s) => s + 1);
      if (answerIndex + 1 >= answerWords.length) {
        setAnswerFinished(true);
        onComplete();
      } else {
        setAnswerIndex(answerIndex + 1);
      }
    }
    resetStep();
  };

  const restart = () => {
    setAnswerWords([...shuffle(grouped.terms), ...shuffle(grouped.phrases)]);
    setCopyIndex(0);
    setAnswerIndex(0);
    setCopyScore(0);
    setAnswerScore(0);
    setCopyFinished(false);
    setAnswerFinished(false);
    setStage("copy");
    resetStep();
  };

  const toggle = (
    <div
      role="group"
      aria-label="Writing stage"
      className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl border border-border/50 bg-card/30 p-1"
    >
      {(
        [
          ["copy", "Copy it"],
          ["answer", "Write the answer"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          data-testid={`write-stage-${id}`}
          aria-pressed={stage === id}
          onClick={() => switchStage(id)}
          className={cn(
            "min-h-11 min-w-0 cursor-pointer break-words rounded-lg px-2 py-2 text-xs font-bold transition-all duration-200",
            stage === id
              ? "bg-gold text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (finished) {
    return (
      <div className="space-y-3">
        {toggle}
        {stage === "copy" ? (
          <>
            <DoneNotice>
              Copying finished: {copyScore} / {copyWords.length} words matched. Now write the
              answers from memory.
            </DoneNotice>
            <button
              type="button"
              className={cn(primaryBtn, "w-full")}
              onClick={() => switchStage("answer")}
            >
              Write the answers
            </button>
            <button
              type="button"
              className={cn(ghostBtn, "w-full")}
              onClick={() => {
                setCopyIndex(0);
                setCopyScore(0);
                setCopyFinished(false);
                resetStep();
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Copy again
            </button>
          </>
        ) : (
          <>
            <DoneNotice>
              Writing practice finished: {answerScore} / {answerWords.length} answers right.
            </DoneNotice>
            <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Go again
            </button>
          </>
        )}
      </div>
    );
  }

  const resultDone = step.phase === "result";
  const isLast = index + 1 >= list.length;
  const nextLabel = isLast ? (stage === "copy" ? "Finish copying" : "See score") : "Next word";
  const result = step.phase === "result" ? step : null;

  return (
    <div className="space-y-2" data-testid="write-work">
      {toggle}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
        <span>
          {index + 1} of {list.length} · {stage === "copy" ? "copy" : word.kind}
        </span>
        <span>{stage === "copy" ? `Matched ${copyScore}` : `Score ${answerScore}`}</span>
      </div>
      <ProgressBar value={index + (resultDone ? 1 : 0)} total={list.length} />

      {stage === "copy" ? (
        <div className={cn(panel, "h-28 overflow-y-auto p-3 text-center")}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Copy this {target} word
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3">
            <p
              lang={languageTag(target)}
              data-testid="write-copy-word"
              className="min-w-0 break-words text-xl font-bold text-gold sm:text-3xl"
            >
              {word.es}
            </p>
            <SpeakButton text={word.es} speak={speak} />
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">{word.en}</p>
        </div>
      ) : (
        <div className={cn(panel, "h-28 overflow-y-auto p-3 text-center")}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Write this in {target}
          </p>
          <p
            data-testid="write-answer-prompt"
            className="break-words text-xl font-bold text-foreground"
          >
            {word.en}
          </p>
        </div>
      )}

      {/* The pad stays mounted for the whole word, hidden while reading or showing a result, so
          the writing survives a failed check, Check again and Try again. Only Start over (or a
          new word) gives a fresh pad. */}
      <HandwritingPad
        key={`${stage}-${index}-${attempt}`}
        ref={padRef}
        guideText={stage === "copy" ? word.es : undefined}
        onChange={setInked}
        label={stage === "copy" ? `Copy the word ${word.es}` : `Write the ${target} answer`}
        className={step.phase === "write" ? "lesson-writing-pad" : "hidden"}
      />
      {step.phase === "write" && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="write-check"
              disabled={!inked}
              onClick={() => void check()}
              className={cn(primaryBtn, "min-w-0 flex-1 whitespace-normal break-words")}
            >
              Check
            </button>
            <button
              type="button"
              data-testid="write-compare"
              disabled={!inked}
              onClick={compareMyself}
              className={cn(ghostBtn, "min-w-0 flex-1 whitespace-normal break-words")}
            >
              {stage === "copy" ? "Done — compare" : "Show answer"}
            </button>
          </div>
          {!online && (
            <p className="text-center text-xs text-muted-foreground">
              You are offline. Use {stage === "copy" ? "Done — compare" : "Show answer"} to check
              your writing yourself.
            </p>
          )}
        </>
      )}

      {step.phase === "reading" && (
        <div className="space-y-3">
          <InkPreview png={step.ink} />
          <p
            role="status"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Reading your handwriting…
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <InkPreview png={result.ink} />
          {result.outcome.kind === "read" ? (
            (() => {
              const text = result.outcome.text;
              const matched =
                stage === "copy"
                  ? compareAnswer(text, word.es, target).verdict === "correct"
                  : checkHandwritten(text, word.es, word.kind).accepted;
              return (
                <>
                  <AnswerFeedback
                    given={text}
                    expected={word.es}
                    language={target}
                    recognizedText={text}
                    scoredCorrect={matched}
                    compact
                    action={<SpeakButton text={word.es} speak={speak} className="h-9 w-9" />}
                  />
                  {word.note ? (
                    <p className="break-words text-xs text-muted-foreground">{word.note}</p>
                  ) : null}
                  {stage === "copy" && !matched ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid="write-try-again"
                          className={cn(primaryBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                          onClick={keepWriting}
                        >
                          Try again
                        </button>
                        <button
                          type="button"
                          data-testid="write-start-over"
                          className={cn(ghostBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                          onClick={resetStep}
                        >
                          Start over
                        </button>
                      </div>
                      <button
                        type="button"
                        className={cn(ghostBtn, "w-full")}
                        onClick={() => advance(true)}
                      >
                        My writing matches
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        className={cn(primaryBtn, "w-full")}
                        onClick={() => advance(matched)}
                      >
                        {nextLabel}
                      </button>
                      {stage === "answer" && !matched && (
                        <button
                          type="button"
                          className={cn(ghostBtn, "w-full")}
                          onClick={() => advance(true)}
                        >
                          I wrote it correctly
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <>
              {result.outcome.message ? (
                <p className="text-xs text-muted-foreground">{result.outcome.message}</p>
              ) : null}
              <div data-testid="write-reveal" className={cn(panel, "text-center")}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {stage === "copy" ? "The word" : `The ${target} answer`}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <p
                    lang={languageTag(target)}
                    className="break-words text-2xl font-bold text-gold"
                  >
                    {word.es}
                  </p>
                  <SpeakButton text={word.es} speak={speak} />
                </div>
                {word.note ? (
                  <p className="mt-1 break-words text-xs text-muted-foreground">{word.note}</p>
                ) : null}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {stage === "copy"
                  ? "Does your writing match the word?"
                  : `Did you write it right? The prompt was in ${native}.`}
              </p>
              {/* Check again sends the same writing; Start over is the only way to clear it. */}
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="write-check-again"
                  className={cn(primaryBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                  onClick={() => void check()}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Check again
                </button>
                <button
                  type="button"
                  data-testid="write-start-over"
                  className={cn(ghostBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                  onClick={resetStep}
                >
                  Start over
                </button>
              </div>
              <div className="flex gap-2">
                {stage === "copy" ? (
                  <>
                    <button
                      type="button"
                      className={cn(ghostBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                      onClick={() => advance(true)}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Matches
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={cn(ghostBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                      onClick={() => advance(false)}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Missed it
                    </button>
                    <button
                      type="button"
                      className={cn(primaryBtn, "min-w-0 flex-1 whitespace-normal break-words")}
                      onClick={() => {
                        void playFlashcardSuccess();
                        advance(true);
                      }}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Got it
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Verbs (authored lesson content) ──────────────────────────────────────────

/** VerbPractice with the kit's target-language voice. */
function VerbsPane({
  verbs,
  mode,
  onComplete,
}: {
  verbs: LessonVerb[];
  mode: "study" | "conjugate";
  onComplete: () => void;
}) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  return (
    <VerbPractice
      verbs={verbs}
      mode={mode}
      language={target}
      nativeLanguage={native}
      speak={speak}
      onComplete={onComplete}
    />
  );
}

/** Type it: spell the lesson's words, or conjugate its verbs. */
function TypeKindSwitch({
  kind,
  onChange,
}: {
  kind: "words" | "verbs";
  onChange: (kind: "words" | "verbs") => void;
}) {
  return (
    <div
      role="group"
      aria-label="What to type"
      data-testid="type-kind-switch"
      className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-border/50 bg-card/30 p-1"
    >
      {(
        [
          { id: "words", label: "Words", Icon: Keyboard },
          { id: "verbs", label: "Verbs", Icon: Repeat },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          data-testid={`type-kind-${id}`}
          aria-pressed={kind === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all duration-200",
            kind === id
              ? "bg-gold text-background"
              : "text-muted-foreground hover:bg-gold/10 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Kit shell ────────────────────────────────────────────────────────────────

export function LessonPracticeKit({
  words,
  moduleId,
  lessonNumber,
  onActivity,
  initialMode = "study",
  mode: controlledMode,
  onModeChange,
  language = "Spanish",
  nativeLanguage = "English",
  matchingBatchSize,
  listeningItems,
  verbs,
  writingResponse,
  focusMode = false,
  onModeComplete,
}: LessonPracticeKitProps) {
  const { state, dispatch } = useApp();
  const languages = useMemo(
    () => ({ target: language, native: nativeLanguage }),
    [language, nativeLanguage],
  );
  const targetLang = language as Language;
  const { addCard, hasCard } = useFlashcards();
  const [internalMode, setInternalMode] = useState<PracticeMode>(initialMode);
  // Verbs show only inside a lesson (controlled kit) that has them.
  const lessonVerbs = controlledMode !== undefined && verbs && verbs.length > 0 ? verbs : null;
  const requestedMode = controlledMode ?? internalMode;
  const mode: PracticeMode = requestedMode === "verbs" && !lessonVerbs ? "study" : requestedMode;
  const [typeKind, setTypeKind] = useState<"words" | "verbs">("words");
  const recallTabs = lessonVerbs ? [...RECALL_MODES, VERBS_TAB] : RECALL_MODES;
  const setMode = (next: PracticeMode) => {
    setInternalMode(next);
    onModeChange?.(next);
  };
  const [completed, setCompleted] = useState<ReadonlySet<PracticeMode>>(new Set());
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const fired = useRef<Set<PracticeMode>>(new Set());

  const complete = useCallback(
    (activity: PracticeMode) => {
      if (fired.current.has(activity)) return;
      fired.current.add(activity);
      setCompleted(new Set(fired.current));
      onActivity?.(activity);
      onModeComplete?.(activity);
    },
    [onActivity, onModeComplete],
  );

  const addAll = () => {
    const known = new Set<string>();
    for (const item of state.vocabByLanguage?.[targetLang] ?? []) known.add(vocabKey(item.word));
    if (state.selectedLanguage === targetLang) {
      for (const item of state.userVocab) known.add(vocabKey(item.word));
    }
    const fresh = wordsToAdd(words, (es) => known.has(vocabKey(es)) || hasCard(targetLang, es));
    for (const word of fresh) {
      addCard({
        language: targetLang,
        word: word.es,
        translation: word.en,
        example: "",
        exampleTranslation: "",
        moduleId,
      });
    }
    if (fresh.length > 0) {
      dispatch({
        type: "ADD_VOCAB_ITEMS",
        lang: targetLang,
        payload: fresh.map((word) => ({
          word: word.es,
          translation: word.en,
          category: "saved",
          correctCount: 0,
          moduleId,
        })),
      });
    }
    setAddedCount(fresh.length);
  };

  const modeTabShown = controlledMode === undefined || recallTabs.some((m) => m.id === mode);

  return (
    <KitLanguageContext.Provider value={languages}>
      <section
        data-testid="practice-kit"
        data-module={moduleId}
        data-lesson={lessonNumber}
        aria-label={`Lesson ${lessonNumber} practice kit`}
        className="space-y-3 overflow-x-hidden"
      >
        {/* Inside a lesson the kit is controlled and the lesson's own section bar is the only
            navigation, so the kit shows no "ways to practice" count or six-way tab row. Recall
            keeps a small Study / Cards / Match switch, since it covers all three. */}
        {controlledMode === undefined ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {MODES.length} ways to practice
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                {completed.size} / {MODES.length} done
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Practice mode"
              className="grid grid-cols-6 gap-1 rounded-xl border border-border/50 bg-card/30 p-1"
            >
              {MODES.map(({ id, label, Icon }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`practice-tab-${id}`}
                    aria-selected={active}
                    aria-controls={`practice-panel-${id}`}
                    data-testid={`practice-mode-${id}`}
                    onClick={() => setMode(id)}
                    className={cn(
                      "relative flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-bold transition-all duration-200",
                      active
                        ? "bg-gold text-background"
                        : "text-muted-foreground hover:bg-gold/10 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                    {completed.has(id) && (
                      <Check
                        className={cn(
                          "absolute right-1 top-1 h-3 w-3",
                          active ? "text-background" : "text-gold",
                        )}
                        aria-label="completed"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : !focusMode && recallTabs.some((m) => m.id === mode) ? (
          <div
            role="tablist"
            aria-label="Recall practice"
            data-testid="practice-recall-switch"
            className={cn(
              "grid gap-1 rounded-xl border border-border/50 bg-card/30 p-1",
              recallTabs.length > 3 ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            {recallTabs.map(({ id, label, Icon }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`practice-tab-${id}`}
                  aria-selected={active}
                  aria-controls={`practice-panel-${id}`}
                  data-testid={`practice-mode-${id}`}
                  onClick={() => setMode(id)}
                  className={cn(
                    "relative flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all duration-200",
                    active
                      ? "bg-gold text-background"
                      : "text-muted-foreground hover:bg-gold/10 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  {completed.has(id) && (
                    <Check className="h-3 w-3 text-gold" aria-label="completed" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          id={`practice-panel-${mode}`}
          role="tabpanel"
          aria-labelledby={modeTabShown ? `practice-tab-${mode}` : undefined}
          aria-label={
            modeTabShown ? undefined : (MODES.find((m) => m.id === mode)?.label ?? "Practice")
          }
        >
          {words.length === 0 ? (
            <div className={cn(panel, "text-sm text-muted-foreground")}>
              This lesson has no vocabulary list yet.
            </div>
          ) : (
            <>
              {mode === "study" && <StudyMode words={words} onComplete={() => complete("study")} />}
              {mode === "flashcards" && (
                <FlashcardsMode words={words} onComplete={() => complete("flashcards")} />
              )}
              {mode === "match" && (
                <MatchMode
                  words={words}
                  maxPairs={matchingBatchSize}
                  onComplete={() => complete("match")}
                />
              )}
              {mode === "listen" && (
                <ListenMode
                  words={listeningItems ?? words}
                  contextual={listeningItems !== undefined && listeningItems !== words}
                  onComplete={() => complete("listen")}
                />
              )}
              {mode === "type" && lessonVerbs && (
                <TypeKindSwitch kind={typeKind} onChange={setTypeKind} />
              )}
              {mode === "type" && (!lessonVerbs || typeKind === "words") && (
                <TypeMode words={words} onComplete={() => complete("type")} />
              )}
              {mode === "type" && lessonVerbs && typeKind === "verbs" && (
                <VerbsPane
                  key="conjugate"
                  verbs={lessonVerbs}
                  mode="conjugate"
                  onComplete={() => complete("type")}
                />
              )}
              {mode === "verbs" && lessonVerbs && (
                <VerbsPane
                  key="study"
                  verbs={lessonVerbs}
                  mode="study"
                  onComplete={() => complete("verbs")}
                />
              )}
              {mode === "write" && (
                <WritingWorkspace response={writingResponse} onClose={() => setMode("study")}>
                  <WriteMode words={words} onComplete={() => complete("write")} />
                </WritingWorkspace>
              )}
            </>
          )}
        </div>

        {words.length > 0 && !focusMode && (
          <div className="border-t border-border/40 pt-3">
            <button
              type="button"
              onClick={addAll}
              disabled={addedCount !== null}
              className={cn(ghostBtn, "w-full")}
            >
              {addedCount === null ? (
                <>
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  Add these words to my flashcards
                </>
              ) : addedCount > 0 ? (
                <>
                  <Check className="h-4 w-4 text-gold" aria-hidden="true" />
                  Added {addedCount}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-gold" aria-hidden="true" />
                  Added 0 (already in your flashcards)
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </KitLanguageContext.Provider>
  );
}
