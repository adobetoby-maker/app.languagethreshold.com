import { useMemo, useState } from "react";
import { getCharactersForLanguage, type CjkLanguage } from "@/data/cjk";

/**
 * Match each character to the radical meaning that drives its story.
 * Reinforces radical → meaning links used in the half-screen character expand.
 */
export function RadicalMatch({ language }: { language: CjkLanguage }) {
  const pool = useMemo(() => {
    return getCharactersForLanguage(language)
      .filter((c) => c.radicals.length > 0 && c.radicals[0].meaning)
      .slice(0, 12);
  }, [language]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });

  const current = pool[index % Math.max(pool.length, 1)];

  const options = useMemo(() => {
    if (!current) return [];
    const correct = current.radicals[0].meaning;
    const distractors = pool
      .map((c) => c.radicals[0]?.meaning)
      .filter((m): m is string => !!m && m !== correct);
    const unique = Array.from(new Set(distractors));
    const shuffled = [...unique].sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correct].sort(() => Math.random() - 0.5);
  }, [current, pool, index]);

  if (!current) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Not enough radical data yet for a match drill.
      </p>
    );
  }

  const correct = current.radicals[0].meaning;
  const answered = picked !== null;

  function choose(meaning: string) {
    if (answered) return;
    setPicked(meaning);
    setScore((s) =>
      meaning === correct ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 },
    );
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Match the character to its key radical meaning</span>
        <span className="font-mono text-gold">
          ✓ {score.right} · ✗ {score.wrong}
        </span>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-gold/25 bg-gold/[0.05] py-10">
        <div className="font-display text-7xl leading-none">{current.char}</div>
        <div className="mt-3 text-sm text-muted-foreground">{current.meanings.join(" · ")}</div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const isCorrect = opt === correct;
          const isPicked = opt === picked;
          let border = "border-border/50";
          if (answered && isCorrect) border = "border-gold bg-gold/10 text-gold";
          else if (answered && isPicked && !isCorrect) border = "border-destructive/50 bg-destructive/10";
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${border}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="space-y-3">
          {current.mnemonic && (
            <p className="rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm text-foreground/90">
              {current.mnemonic}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            className="w-full rounded-full border border-gold/50 bg-gold/10 py-3 text-sm font-medium text-gold hover:bg-gold/20"
          >
            Next character
          </button>
        </div>
      )}
    </div>
  );
}
