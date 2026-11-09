import { useState, type FormEvent } from "react";
import { CheckCircle2, Volume2 } from "lucide-react";
import {
  isCorrectFormPracticeAnswer,
  type FormPracticeAnswer,
  type FormPracticePair,
} from "@/lib/language-form-practice";

export interface ContextualFormPrompt extends FormPracticeAnswer {
  id: string;
  englishPrompt: string;
}

export function ContextualFormPractice({
  pairKey,
  prompts,
  speak,
  onComplete,
}: {
  pairKey: FormPracticePair;
  prompts: readonly ContextualFormPrompt[];
  speak: (text: string) => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "retry" | null>(null);
  const [finished, setFinished] = useState(false);
  const prompt = prompts[index];
  const target = pairKey === "French:English" ? prompt?.frenchAnswer : prompt?.japaneseAnswer;

  if (!prompt) return null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(isCorrectFormPracticeAnswer(answer, prompt, pairKey) ? "correct" : "retry");
  };
  const next = () => {
    if (index + 1 === prompts.length) {
      setFinished(true);
      onComplete();
      return;
    }
    setIndex(index + 1);
    setAnswer("");
    setResult(null);
  };

  return (
    <div data-testid="contextual-form-practice" className="space-y-3 rounded-xl border border-border/50 bg-card/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground">Form practice {index + 1} of {prompts.length}</p>
      <p className="text-base font-semibold text-foreground" lang="en">{prompt.englishPrompt}</p>
      {finished ? (
        <p className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="h-4 w-4 text-gold" />Done practicing forms.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor={`contextual-form-${prompt.id}`}>
            Type the {pairKey === "French:English" ? "French" : "Japanese"} form
          </label>
          <input
            id={`contextual-form-${prompt.id}`}
            value={answer}
            onChange={(event) => { setAnswer(event.target.value); setResult(null); }}
            autoComplete="off"
            lang={pairKey === "French:English" ? "fr" : "ja"}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
          />
          {result === "retry" && <p role="status" className="text-sm text-foreground">Try again.</p>}
          {result === "correct" && (
            <div role="status" className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-gold" /> Correct.
              {target && <button type="button" onClick={() => speak(target)} aria-label="Play correct form" className="inline-flex min-h-11 items-center gap-1 text-gold"><Volume2 className="h-4 w-4" /> Listen</button>}
            </div>
          )}
          {result === "correct" ? (
            <button type="button" onClick={next} className="min-h-11 rounded-xl bg-gold px-4 font-bold text-background">{index + 1 === prompts.length ? "Finish" : "Next"}</button>
          ) : (
            <button type="submit" className="min-h-11 rounded-xl bg-gold px-4 font-bold text-background">Check</button>
          )}
        </form>
      )}
    </div>
  );
}
