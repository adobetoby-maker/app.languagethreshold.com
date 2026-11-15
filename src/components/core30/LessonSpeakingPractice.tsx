import { useEffect, useState } from "react";
import type { LessonWord } from "@/data/curriculum";
import type { LessonDefinition } from "@/lib/lesson-definition";
import { languageTag } from "@/lib/lesson-words-core";

export function LessonSpeakingPractice({
  instruction,
  definition,
  words,
  language,
  onOpen,
}: {
  instruction: string;
  definition: LessonDefinition | null;
  words: LessonWord[];
  language: string;
  onOpen: () => void;
}) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const bank = definition?.teaching?.speaking.wordBank ?? "collapsed";
  return (
    <div data-testid="lesson-speaking-practice" className="mt-3 space-y-3">
      <p className="text-sm leading-relaxed text-foreground/80">
        {definition?.teaching?.speaking.context ?? instruction}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Speak is ready for this lesson. Your partner will help you use these words and work toward
        the lesson goal.
      </p>
      <button
        type="button"
        data-testid="lesson-say-go"
        disabled={!online}
        onClick={onOpen}
        className="min-h-12 w-full rounded-xl border border-gold/50 bg-gold/10 px-4 text-sm font-semibold text-gold disabled:opacity-50"
      >
        Start lesson conversation
      </button>
      {!online && (
        <p role="status" className="text-xs text-muted-foreground">
          You are offline. Rehearse the task and use the word bank here. AI conversation needs a
          connection.
        </p>
      )}
      {words.length > 0 && (
        <details open={bank === "visible"} className="rounded-xl border border-border/50 p-3">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            {bank === "on-request" ? "Need the lesson word bank?" : "Lesson word bank"}
          </summary>
          <dl className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {words.map((word) => (
              <div key={`${word.kind}:${word.es}`} className="text-sm">
                <dt lang={languageTag(language)}>{word.es}</dt>
                <dd className="text-xs text-muted-foreground">{word.en}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
