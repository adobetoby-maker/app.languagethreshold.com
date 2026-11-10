import { useRef, useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { CharacterCanvas, type CharacterCanvasRef } from "./CharacterCanvas";
import { kanaPatternNote, sentenceWritingCharacters, type CharGroup, type PracticeWord } from "./curriculum";
import { type ScoreResult } from "./scoring";

type Stage = "chars" | "words" | "sentence";

interface Props {
  group: CharGroup;
  words: PracticeWord[];
  sentence?: { kana: string; meaning: string };
  fullScreen?: boolean;
}

function StarRow({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1 text-xl">
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= stars ? "text-gold" : "text-muted-foreground/25"}>
          ★
        </span>
      ))}
    </div>
  );
}

function ScoreOverlay({ result, onNext }: { result: ScoreResult; onNext: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/90 backdrop-blur-sm">
      <div className="text-5xl font-bold tabular-nums text-foreground">{result.score}%</div>
      <StarRow stars={result.stars} />
      <p className="mt-1 text-sm font-medium text-muted-foreground">{result.label}</p>
      <button
        onClick={onNext}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TraceMode({ group, words, sentence, fullScreen = false }: Props) {
  const canvasRef = useRef<CharacterCanvasRef>(null);
  const [stage, setStage] = useState<Stage>("chars");
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<(ScoreResult | null)[]>(
    Array(group.chars.length).fill(null),
  );
  const [wordScores, setWordScores] = useState<(ScoreResult | null)[]>(
    Array(words.length).fill(null),
  );
  const [result, setResult] = useState<ScoreResult | null>(null);
  const sentenceChars = sentenceWritingCharacters(sentence?.kana ?? "");

  const currentChar =
    stage === "chars"
      ? group.chars[index]
      : stage === "words"
        ? words[index]?.kana
        : (sentenceChars[index] ?? "");

  const currentRomaji =
    stage === "chars" ? group.romaji[index] : stage === "words" ? words[index]?.romaji : "";

  const currentMeaning =
    stage === "words"
      ? words[index]?.meaning
      : stage === "sentence"
        ? sentence?.meaning
        : undefined;
  const patternNote = stage === "words" ? kanaPatternNote(currentChar) : null;

  const handleStrokeEnd = () => {
    if (!canvasRef.current?.hasStrokes()) return;
    const res = canvasRef.current.getScore(currentChar);
    setResult(res);

    if (stage === "chars") {
      setScores((prev) => {
        const next = [...prev];
        next[index] = res;
        return next;
      });
    } else if (stage === "words") {
      setWordScores((prev) => {
        const next = [...prev];
        next[index] = res;
        return next;
      });
    }
  };

  const handleNext = () => {
    setResult(null);
    canvasRef.current?.clear();

    if (stage === "chars") {
      if (index + 1 < group.chars.length) {
        setIndex(index + 1);
      } else if (words.length > 0) {
        setStage("words");
        setIndex(0);
      } else if (sentence) {
        setStage("sentence");
        setIndex(0);
      }
      return;
    }
    if (stage === "words") {
      if (index + 1 < words.length) {
        setIndex(index + 1);
      } else if (sentence) {
        setStage("sentence");
        setIndex(0);
      } else {
        setStage("chars");
        setIndex(0);
      }
      return;
    }
    if (index + 1 < sentenceChars.length) {
      setIndex(index + 1);
      return;
    }
    // sentence done → restart
    setStage("chars");
    setIndex(0);
    setScores(Array(group.chars.length).fill(null));
    setWordScores(Array(words.length).fill(null));
  };

  const stageLabel =
    stage === "chars"
      ? `Character ${index + 1} of ${group.chars.length}`
      : stage === "words"
        ? `Word ${index + 1} of ${words.length}`
        : `Sentence sign ${index + 1} of ${sentenceChars.length}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Stage header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {stageLabel}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold">{currentChar}</span>
            {currentRomaji && (
              <span className="font-mono text-sm text-muted-foreground">{currentRomaji}</span>
            )}
            {currentMeaning && (
              <span className="text-xs text-muted-foreground">— {currentMeaning}</span>
            )}
          </div>
          {stage === "sentence" && (
            <p className="mt-2 text-sm text-foreground" lang="ja">{sentence?.kana}</p>
          )}
        </div>

        {/* Char dot progress */}
        {stage === "chars" && (
          <div className="flex gap-1">
            {group.chars.map((c, i) => {
              const s = scores[i];
              return (
                <div
                  key={c}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === index
                      ? "bg-gold"
                      : s
                        ? s.stars >= 2
                          ? "bg-green-500"
                          : "bg-amber-400"
                        : "bg-border"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Instruction */}
      <p className="text-xs text-muted-foreground">
        {stage === "chars"
          ? "Trace the character following the dotted guide. Lift your finger to see your score."
          : stage === "words"
            ? "Write the full word. The guide is lighter — try to match it from memory."
            : "Write the sentence one sign at a time. Keep the full sentence in view."}
      </p>
      {patternNote && (
        <p className="text-xs text-muted-foreground">{patternNote}</p>
      )}

      {/* Canvas */}
      <div className="relative">
        <CharacterCanvas
          ref={canvasRef}
          guideChar={currentChar}
          guideAlpha={stage === "chars" ? 0.18 : 0.08}
          onStrokeEnd={handleStrokeEnd}
          maxSize={fullScreen ? 560 : 360}
        />
        {result && <ScoreOverlay result={result} onNext={handleNext} />}
      </div>

      {/* Word/sentence progress row */}
      {stage === "words" && (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w, i) => (
            <span
              key={w.kana}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
                i === index
                  ? "border-gold bg-gold/10 text-gold"
                  : wordScores[i]
                    ? "border-green-500/40 bg-green-500/10 text-green-600"
                    : "border-border/50 text-muted-foreground/50"
              }`}
            >
              {w.kana}
            </span>
          ))}
        </div>
      )}
      {stage === "sentence" && (
        <div className="flex flex-wrap gap-1" aria-label="Sentence writing progress">
          {sentenceChars.map((char, i) => (
            <span
              key={`${i}-${char}`}
              aria-current={i === index ? "step" : undefined}
              className={`rounded border px-1.5 py-0.5 text-sm ${
                i === index ? "border-gold bg-gold/10 text-gold" : i < index ? "border-green-500/40 text-green-600" : "border-border/50 text-muted-foreground"
              }`}
            >
              {char}
            </span>
          ))}
        </div>
      )}

      {/* Reset */}
      <button
        onClick={() => {
          setStage("chars");
          setIndex(0);
          setResult(null);
          setScores(Array(group.chars.length).fill(null));
          setWordScores(Array(words.length).fill(null));
          canvasRef.current?.clear();
        }}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" /> Restart group
      </button>
    </div>
  );
}
