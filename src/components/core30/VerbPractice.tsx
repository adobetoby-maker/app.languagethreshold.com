// Built by TAC — 2026-10-17
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Check, CheckCircle2, RotateCcw, Volume2 } from "lucide-react";
import { AnswerFeedback } from "@/components/core30/AnswerFeedback";
import { cn } from "@/lib/utils";
import {
  conjugationItems,
  isCorrectForm,
  verbFormKeys,
  verbFormLabel,
  type LessonVerb,
} from "@/lib/lesson-content-core";
import { shuffle } from "@/lib/lesson-practice";
import { languageTag, SPECIAL_CHARS_BY_LANGUAGE } from "@/lib/lesson-words-core";

// The lesson's verbs, two ways. Study: a card per verb with its meaning, the five present-tense
// forms and an example from the lesson. Conjugate: one pass through every form of every verb,
// "pronoun + infinitive" in, the typed form out, checked with the same rule as Type it and
// explained by AnswerFeedback. Speech is passed in (the practice kit owns the voice choice).

export type VerbPracticeMode = "study" | "conjugate";

export interface VerbPracticeProps {
  verbs: LessonVerb[];
  mode: VerbPracticeMode;
  /** The language being learned ("Spanish"). */
  language: string;
  /** The learner's native language, for labels. */
  nativeLanguage: string;
  speak: (text: string) => void;
  /** Called once when the learner finishes studying or the last form is answered. */
  onComplete: () => void;
}

const primaryBtn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/30 px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:border-gold/40 hover:bg-gold/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const panel = "rounded-xl border border-border/50 bg-card/30 p-4";

function SpeakIcon({
  text,
  speak,
  label,
}: {
  text: string;
  speak: (text: string) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(text);
      }}
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-all duration-200 hover:bg-gold/20 active:scale-95"
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

// ─── Study ────────────────────────────────────────────────────────────────────

function VerbCard({
  verb,
  keys,
  language,
  nativeLanguage,
  speak,
}: {
  verb: LessonVerb;
  keys: readonly string[];
  language: string;
  nativeLanguage: string;
  speak: (text: string) => void;
}) {
  const lang = languageTag(language);
  return (
    <li
      data-testid="verb-card"
      className="rounded-xl border border-border/50 bg-card/30 p-4"
      aria-label={`Verb: ${verb.infinitive}`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p lang={lang} className="break-words text-lg font-bold text-gold">
            {verb.infinitive}
          </p>
          <p lang={languageTag(nativeLanguage)} className="break-words text-sm text-foreground">
            {verb.native}
          </p>
        </div>
        <SpeakIcon
          text={verb.infinitive}
          speak={speak}
          label={`Play ${language} audio: ${verb.infinitive}`}
        />
      </div>

      <ul className="mt-2 divide-y divide-border/30 rounded-lg border border-border/40">
        {keys.map((key) => {
          const form = verb.forms[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => speak(form)}
                aria-label={`Play ${verbFormLabel(key)} ${form}`}
                className="grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-3 py-3 text-left transition-colors hover:bg-gold/5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0 break-words text-xs font-semibold text-muted-foreground">
                  {verbFormLabel(key)}
                </span>
                <span
                  lang={lang}
                  className="col-start-1 row-start-2 min-w-0 break-words text-base font-semibold text-foreground sm:col-start-2 sm:row-start-1 sm:text-right"
                >
                  {form}
                </span>
                <Volume2 className="col-start-2 row-span-2 row-start-1 h-4 w-4 text-gold sm:col-start-3 sm:row-span-1" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-start gap-4 rounded-lg bg-background/40 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p lang={lang} className="break-words text-sm font-semibold text-foreground">
            {verb.example.target}
          </p>
          <p lang={languageTag(nativeLanguage)} className="break-words text-xs text-muted-foreground">
            {verb.example.native}
          </p>
        </div>
        <SpeakIcon
          text={verb.example.target}
          speak={speak}
          label={`Play example sentence: ${verb.example.target}`}
        />
      </div>
      {verb.note ? (
        <p className="mt-2 break-words text-xs text-muted-foreground">{verb.note}</p>
      ) : null}
    </li>
  );
}

function StudyVerbs({
  verbs,
  language,
  nativeLanguage,
  speak,
  onComplete,
}: Omit<VerbPracticeProps, "mode">) {
  const [done, setDone] = useState(false);
  const keys = verbFormKeys(language) ?? [];
  return (
    <div data-testid="verb-practice-study" className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Verbs ({verbs.length}) · present tense
      </p>
      <ul className="space-y-3">
        {verbs.map((verb) => (
          <VerbCard
            key={verb.infinitive}
            verb={verb}
            keys={keys}
            language={language}
            nativeLanguage={nativeLanguage}
            speak={speak}
          />
        ))}
      </ul>
      {done ? (
        <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <p>Nice. Now conjugate them in Type it: pick Verbs there.</p>
        </div>
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

// ─── Conjugate ────────────────────────────────────────────────────────────────

function ConjugateVerbs({
  verbs,
  language,
  speak,
  onComplete,
}: Omit<VerbPracticeProps, "mode" | "nativeLanguage">) {
  const items = useMemo(() => conjugationItems(verbs, language), [verbs, language]);
  const [order, setOrder] = useState(() => shuffle(items));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const specialChars = SPECIAL_CHARS_BY_LANGUAGE[language] ?? [];

  const current = order[index];
  if (!current) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (result !== null || !value.trim()) return;
    const correct = isCorrectForm(value, current.expected);
    setResult(correct ? "right" : "wrong");
    if (correct) setScore((s) => s + 1);
    speak(current.expected);
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
    setOrder(shuffle(items));
    setIndex(0);
    setValue("");
    setResult(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div data-testid="verb-practice-done" className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <p>
            Conjugation practice finished: {score} / {order.length} correct.
          </p>
        </div>
        <button type="button" className={cn(ghostBtn, "w-full")} onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Go again
        </button>
      </div>
    );
  }

  return (
    <form data-testid="verb-practice-conjugate" onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {index + 1} of {order.length} · present tense
        </span>
        <span className="font-mono">Score {score}</span>
      </div>
      <ProgressBar value={index + (result !== null ? 1 : 0)} total={order.length} />

      <div className={cn(panel, "text-center")}>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Type the {language} form
        </p>
        <p
          data-testid="verb-prompt"
          data-pronoun-key={current.key}
          data-infinitive={current.verb.infinitive}
          className="break-words text-xl font-bold text-foreground"
        >
          <span lang={languageTag(language)}>{current.pronoun}</span>
          <span className="px-2 text-muted-foreground" aria-hidden="true">
            +
          </span>
          <span lang={languageTag(language)} className="text-gold">
            {current.verb.infinitive}
          </span>
        </p>
        <p className="mt-1 break-words text-sm text-muted-foreground">{current.verb.native}</p>
      </div>

      <input
        ref={inputRef}
        data-testid="verb-input"
        type="text"
        lang={languageTag(language)}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        readOnly={result !== null}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label={`Your ${language} verb form`}
        placeholder={language === "Spanish" ? "Escribe la forma" : "Type the form"}
        className={cn(
          "min-h-12 w-full rounded-xl border bg-background px-3 text-base text-foreground outline-none transition-colors duration-200 focus:border-gold",
          result === "right" && "border-emerald-500/60",
          result === "wrong" && "border-red-500/60",
          result === null && "border-border/50",
        )}
      />

      {result === null && specialChars.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={`${language} letters`}>
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
          <AnswerFeedback
            given={value}
            expected={current.expected}
            language={language}
            scoredCorrect={result === "right"}
            action={
              <SpeakIcon
                text={current.expected}
                speak={speak}
                label={`Play ${language} audio: ${current.expected}`}
              />
            }
          />
          <button type="button" className={cn(primaryBtn, "w-full")} onClick={next}>
            {index + 1 >= order.length ? "See score" : "Next form"}
          </button>
        </>
      )}
    </form>
  );
}

// ─── Entry ────────────────────────────────────────────────────────────────────

export function VerbPractice({ mode, ...props }: VerbPracticeProps) {
  if (props.verbs.length === 0 || !verbFormKeys(props.language)) return null;
  return mode === "study" ? <StudyVerbs {...props} /> : <ConjugateVerbs {...props} />;
}
