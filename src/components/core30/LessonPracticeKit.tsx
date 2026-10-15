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
  Puzzle,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type Language } from "@/state/app-state";
import { useFlashcards } from "@/state/flashcard-state";
import { ACCENTS_BY_LANGUAGE, useSpeech } from "@/state/speech-state";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";
import { configureUtterance } from "@/lib/voices";
import type { LessonWord } from "@/data/curriculum";
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

export type PracticeMode = "study" | "flashcards" | "match" | "listen" | "type";

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
  /**
   * The language being learned (default "Spanish"). It sets the speech locale, the language
   * names in labels, the typing check, and the language "Add to my flashcards" saves under.
   * Each word's `es` is this language; `en` is the learner's native language.
   */
  language?: string;
  /** The learner's native language, used only for labels (default "English"). */
  nativeLanguage?: string;
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
];

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

  useEffect(
    () => () => {
      stopRemoteTTS();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );

  return useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !text) return;
      if (needsRemoteTTS(locale)) {
        void speakRemote(text, locale, { rate: 0.9 });
        return;
      }
      if (!window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(text);
      configureUtterance(utterance, locale);
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [locale],
  );
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
        <DoneNotice>Nice. Now try the cards, match, listen and type modes.</DoneNotice>
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
    <div className="space-y-3">
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
              "flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all duration-300",
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
            {!flipped && <span className="text-xs text-muted-foreground">Tap to flip</span>}
          </button>
          <div className="flex items-center gap-2">
            <SpeakButton text={word.es} speak={speak} />
            <button
              type="button"
              disabled={!flipped}
              onClick={() => answer("again")}
              className={cn(ghostBtn, "flex-1")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Again
            </button>
            <button
              type="button"
              disabled={!flipped}
              onClick={() => answer("got")}
              className={cn(primaryBtn, "flex-1")}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Got it
            </button>
          </div>
          {!flipped && (
            <p className="text-center text-xs text-muted-foreground">
              Flip the card, then mark it Got it or Again.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── 3. Memory match ──────────────────────────────────────────────────────────

function MatchMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
  const speak = useTargetSpeaker();
  const { target, native } = useKitLanguages();
  const terms = useMemo(() => words.filter((w) => w.kind === "term"), [words]);
  const [rounds, setRounds] = useState(() => splitRounds(shuffle(terms)));
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
    const nextRounds = splitRounds(shuffle(terms));
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

function ListenMode({ words, onComplete }: { words: LessonWord[]; onComplete: () => void }) {
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
      <div className="space-y-3">
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Word {index + 1} of {order.length}
        </span>
        <span className="font-mono">Score {score}</span>
      </div>
      <ProgressBar value={index + (picked !== null ? 1 : 0)} total={order.length} />

      <div className={cn(panel, "flex flex-col items-center gap-3 py-6 text-center")}>
        <button
          type="button"
          onClick={() => speak(current.es)}
          aria-label={`Play the ${target} word`}
          className="inline-flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold transition-all duration-200 hover:bg-gold/25 active:scale-95"
        >
          <Volume2 className="h-7 w-7" aria-hidden="true" />
        </button>
        <p className="text-sm text-muted-foreground">Listen, then pick the {native} meaning.</p>
        {picked !== null && (
          <p lang={languageTag(target)} className="break-words text-lg font-bold text-gold">
            {current.es}
          </p>
        )}
      </div>

      <div className="grid gap-2">
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

      {picked !== null && (
        <button type="button" className={cn(primaryBtn, "w-full")} onClick={next}>
          {index + 1 >= order.length ? "See score" : "Next word"}
        </button>
      )}
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
    requestAnimationFrame(() => inputRef.current?.focus());
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
      <div className="space-y-3">
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
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {index + 1} of {order.length} · {current.kind}
        </span>
        <span className="font-mono">Score {score}</span>
      </div>
      <ProgressBar value={index + (result !== null ? 1 : 0)} total={order.length} />

      <div className={cn(panel, "text-center")}>
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

      {result === null && specialChars.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={`${target} letters`}>
          {specialChars.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => {
                setValue((v) => v + char);
                inputRef.current?.focus();
              }}
              className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-border/50 bg-card/30 px-2 text-base font-semibold transition-all duration-200 hover:border-gold/40 active:scale-95"
            >
              {char}
            </button>
          ))}
        </div>
      )}

      {result === null ? (
        <button type="submit" disabled={!value.trim()} className={cn(primaryBtn, "w-full")}>
          Check
        </button>
      ) : (
        <>
          <div
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-sm",
              result === "right"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-red-500/40 bg-red-500/10",
            )}
          >
            {result === "right" ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-semibold">
                {result === "right" ? "Correct" : "Not quite"}. Answer:
              </p>
              <p lang={languageTag(target)} className="break-words text-base font-bold text-gold">
                {current.es}
              </p>
              {current.note ? (
                <p className="mt-0.5 break-words text-xs text-muted-foreground">{current.note}</p>
              ) : null}
            </div>
            <SpeakButton text={current.es} speak={speak} className="ml-auto" />
          </div>
          <button type="button" className={cn(primaryBtn, "w-full")} onClick={next}>
            {index + 1 >= order.length ? "See score" : "Next word"}
          </button>
        </>
      )}
    </form>
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
}: LessonPracticeKitProps) {
  const { state, dispatch } = useApp();
  const languages = useMemo(
    () => ({ target: language, native: nativeLanguage }),
    [language, nativeLanguage],
  );
  const targetLang = language as Language;
  const { addCard, hasCard } = useFlashcards();
  const [internalMode, setInternalMode] = useState<PracticeMode>(initialMode);
  const mode = controlledMode ?? internalMode;
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
    },
    [onActivity],
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

  return (
    <KitLanguageContext.Provider value={languages}>
      <section
        data-testid="practice-kit"
        data-module={moduleId}
        data-lesson={lessonNumber}
        aria-label={`Lesson ${lessonNumber} practice kit`}
        className="space-y-3 overflow-x-hidden"
      >
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
          className="grid grid-cols-5 gap-1 rounded-xl border border-border/50 bg-card/30 p-1"
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

        <div id={`practice-panel-${mode}`} role="tabpanel" aria-labelledby={`practice-tab-${mode}`}>
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
              {mode === "match" && <MatchMode words={words} onComplete={() => complete("match")} />}
              {mode === "listen" && (
                <ListenMode words={words} onComplete={() => complete("listen")} />
              )}
              {mode === "type" && <TypeMode words={words} onComplete={() => complete("type")} />}
            </>
          )}
        </div>

        {words.length > 0 && (
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
