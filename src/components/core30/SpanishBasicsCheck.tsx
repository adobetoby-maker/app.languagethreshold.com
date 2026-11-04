import { useRef, useState } from "react";
import { correctSpanishCloze } from "@/lib/spanish-basics-check";

interface Check {
  prompt: string;
  hint: string;
  answer: string;
  explanation: string;
}
/** The owning lesson runner remounts on account, language, enrollment and lesson changes. */
export function SpanishBasicsCheck({
  checks,
  onPassed,
  topic = "Grammar",
  language = "Spanish",
}: {
  topic?: "Grammar" | "Cognate";
  language?: "Spanish" | "Japanese";
  checks: Check[];
  onPassed: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => checks.map(() => ""));
  const [results, setResults] = useState<boolean[] | null>(null);
  const passed = results?.every(Boolean) ?? false;
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState(0);
  function insertAccent(letter: string) {
    const input = inputs.current[focused];
    if (!input || passed) return;
    const start = input.selectionStart ?? answers[focused].length;
    const end = input.selectionEnd ?? start;
    setAnswers((current) => {
      const next = [...current];
      next[focused] = next[focused].slice(0, start) + letter + next[focused].slice(end);
      return next;
    });
    setResults(null);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + 1, start + 1);
    });
  }
  return (
    <section
      aria-label={`${topic} practice check`}
      className="mb-4 rounded-xl border border-border bg-background p-4 text-foreground"
    >
      <h3 className="text-lg font-semibold">Try it without the model</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete all {checks.length} gaps correctly before marking this lesson mastered. Accents
        and characters matter. Review the explanation and retry any mistakes.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = checks.map((check, i) =>
            language === "Japanese"
              ? (inputs.current[i]?.value ?? answers[i]).normalize("NFC").replace(/\s+/g, "").trim() ===
                check.answer.normalize("NFC").replace(/\s+/g, "").trim()
              : correctSpanishCloze(inputs.current[i]?.value ?? answers[i], check.answer),
          );
          setResults(next);
          if (next.every(Boolean)) onPassed();
        }}
      >
        {checks.map((check, i) => (
          <div key={check.prompt} className="mt-4">
            <label htmlFor={`basics-check-${i}`} className="block text-base font-semibold">
              {i + 1}. {check.prompt}
            </label>
            <p className="mt-1 text-sm text-muted-foreground">{check.hint}</p>
            <input
              id={`basics-check-${i}`}
              ref={(input) => {
                inputs.current[i] = input;
              }}
              onFocus={() => setFocused(i)}
              aria-invalid={results ? !results[i] : undefined}
              lang={language === "Japanese" ? "ja" : "es"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={answers[i]}
              disabled={passed}
              aria-label={`${topic} answer ${i + 1}`}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground disabled:opacity-70"
              onChange={(e) => {
                const value = e.target.value;
                setAnswers((current) => {
                  const next = [...current];
                  next[i] = value;
                  return next;
                });
                setResults(null);
              }}
            />
            {results && (
              <p className="mt-2 text-sm" role="status">
                {results[i] ? "Correct." : `Review: ${check.answer}. ${check.explanation}`}
              </p>
            )}
          </div>
        ))}
        {!passed && language === "Spanish" && (
          <div
            role="group"
            aria-label={`Accents for grammar answer ${focused + 1}`}
            className="mt-4 flex flex-wrap gap-1"
          >
            {"áéíóúñ".split("").map((letter) => (
              <button
                key={letter}
                type="button"
                aria-label={`Insert ${letter}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertAccent(letter)}
                className="min-h-11 min-w-11 rounded-lg border border-border text-lg"
              >
                {letter}
              </button>
            ))}
          </div>
        )}
        {passed ? (
          <p role="status" className="mt-4 font-semibold text-gold-ink">
            {checks.length} of {checks.length} correct. Now decide whether you can use this grammar
            independently.
          </p>
        ) : (
          <button
            type="submit"
            className="mt-4 min-h-11 rounded-lg bg-gold px-4 font-semibold text-midnight"
          >
            Check {topic.toLowerCase()}
          </button>
        )}
      </form>
      <p className="mt-3 text-sm text-muted-foreground">
        This checks {checks.length} practiced forms, not overall proficiency. Keep using See,
        Recall, Hear, Type, Say and Write; return later for spaced review.
      </p>
    </section>
  );
}
