import { useState } from "react";
import { speakingPreparationPhrases, type SpeakingStep } from "@/lib/speaking-preparation";
import type { SpeakingMission } from "@/data/speaking-missions";

/** An unsaved warm-up using this mission's authored words and goals. No recording or grading. */
export function SpeakingPreparation({
  mission,
  step,
  audioReady,
  play,
  stop,
  next,
}: {
  mission: SpeakingMission;
  step: Exclude<SpeakingStep, "conversation">;
  audioReady: boolean;
  play: (text: string) => void;
  stop: () => void;
  next: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [help, setHelp] = useState(false);
  const phrases = speakingPreparationPhrases(mission);
  const words = phrases.map((item) => item.target);
  const prompts = mission.objectives.slice(0, 3);
  const count = Math.max(1, step === "hear" ? words.length : prompts.length);
  const current = Math.min(index, count - 1);
  const phrase = words[current] ?? mission.openingLine;
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label={step === "hear" ? "Hear and say practice" : "Answer a prompt practice"}
    >
      <p className="text-center text-xs text-muted-foreground">
        {current + 1} of {count} ·{" "}
        {step === "hear" ? "Listen, then say it aloud" : "Answer aloud in " + mission.language}
      </p>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-3 overflow-y-auto sm:justify-center rounded-2xl border border-gold/25 bg-gold/5 p-4 text-center">
        <p
          className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl"
          lang={step === "hear" ? mission.locale : undefined}
        >
          {step === "hear" ? phrase : (prompts[current]?.description ?? mission.summary)}
        </p>
        {step === "hear" && phrases[current]?.meaning && (
          <p className="text-sm text-muted-foreground">{phrases[current].meaning}</p>
        )}
        {step === "hear" ? (
          <button
            type="button"
            disabled={!audioReady}
            onClick={() => play(phrase)}
            className="min-h-11 rounded-full border border-gold/40 px-5 py-2 text-sm text-gold disabled:opacity-50"
          >
            {audioReady ? "Hear phrase" : "Audio unavailable · practice from the text"}
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={help}
              onClick={() => setHelp((value) => !value)}
              className="min-h-11 rounded-full border border-border px-4 py-2 text-sm"
            >
              {help ? "Hide useful words" : "Help me answer"}
            </button>
            {help && (
              <p className="text-sm leading-relaxed text-muted-foreground">{words.join(" · ")}</p>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          stop();
          if (current + 1 < count) {
            setIndex(current + 1);
            setHelp(false);
          } else next();
        }}
        className="min-h-12 shrink-0 rounded-xl bg-gold px-4 py-3 font-semibold text-black"
      >
        {current + 1 < count
          ? step === "hear"
            ? "I've said it · next"
            : "Next prompt"
          : step === "hear"
            ? "Try answering a prompt"
            : "Continue to conversation"}
      </button>
    </div>
  );
}
