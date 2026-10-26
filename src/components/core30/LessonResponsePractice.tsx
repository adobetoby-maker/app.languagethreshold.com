import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import type { LessonDefinition } from "@/lib/lesson-definition";
import {
  lessonDraftKey,
  readLessonDraft,
  saveLessonDraft,
  type LessonDraft,
} from "@/lib/lesson-drafts";
import { useHandwritingReader } from "@/hooks/use-handwriting-reader";
import { languageTag } from "@/lib/lesson-words-core";
import { HandwritingPad, type HandwritingPadHandle } from "./HandwritingPad";

function deviceStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
const empty = (version: string): LessonDraft => ({
  version,
  text: "",
  ink: null,
  transcript: "",
  checks: [false, false, false],
  savedAt: "",
});

/** Open production practice has self-check feedback, never an automatic proficiency score. */
export function LessonResponsePractice({
  definition,
  mode,
}: {
  definition: LessonDefinition;
  mode: "type" | "write";
}) {
  const { user, isCurrentUser } = useAuth();
  const key = lessonDraftKey(user?.id ?? "anonymous", definition.id, mode);
  const storage = user ? deviceStorage() : null;
  const [state, setState] = useState<{ key: string; draft: LessonDraft }>({
    key,
    draft: empty(definition.contentVersion),
  });
  const current = state.key === key ? state.draft : empty(definition.contentVersion);
  const currentRef = useRef(current);
  currentRef.current = current;
  const [saveState, setSaveState] = useState<"saved" | "unsaved">("unsaved");
  const [inked, setInked] = useState(false);
  const [reading, setReading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pad = useRef<HandwritingPadHandle>(null);
  const frame = useRef<number | null>(null);
  const mounted = useRef(true);
  const hadInk = useRef(false);
  const readInk = useHandwritingReader(definition.targetLanguage);
  useEffect(() => {
    const draft = readLessonDraft(storage, key) ?? empty(definition.contentVersion);
    currentRef.current = draft;
    setState({ key, draft });
    setSaveState(draft.savedAt ? "saved" : "unsaved");
  }, [key, definition.contentVersion, user?.id, storage]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  const update = (patch: Partial<LessonDraft>) => {
    if (!mounted.current || (user && !isCurrentUser(user.id))) return;
    const draft = {
      ...currentRef.current,
      ...patch,
      version: definition.contentVersion,
      savedAt: new Date().toISOString(),
    };
    currentRef.current = draft;
    setState({ key, draft });
    setSaveState(saveLessonDraft(storage, key, draft) ? "saved" : "unsaved");
  };
  const saveInk = () => {
    if (pad.current) update({ ink: pad.current.toPngBase64() });
  };
  const recognize = async () => {
    const png = pad.current?.toPngBase64() ?? currentRef.current.ink;
    if (!png) return;
    update({ ink: png });
    setReading(true);
    setFeedback("");
    const result = await readInk(png);
    if (!mounted.current || (user && !isCurrentUser(user.id))) return;
    if (result.kind === "read") {
      update({ transcript: result.text });
      setFeedback(
        "Check what we read, then use the task and phrases below to review your response.",
      );
    } else setFeedback(result.message ?? "Compare your writing yourself.");
    setReading(false);
  };
  if (!definition.teaching) return null;
  const count = definition.teaching.response.suggestedSentences;
  const examples = definition.words.filter((w) => w.kind === "phrase").slice(0, 3);
  return (
    <section
      className="mt-4 space-y-3 rounded-2xl border border-gold/25 bg-gold/5 p-4"
      aria-label={`${mode === "write" ? "Handwritten" : "Typed"} lesson response`}
    >
      <h5 className="font-semibold">Use it in a response</h5>
      <p className="text-sm">{definition.teaching.writing.prompt}</p>
      <p className="text-xs text-muted-foreground">
        Try about {count} {count === 1 ? "sentence" : "sentences"} in {definition.targetLanguage}.
        Work from memory, then open the phrases if you need help.
      </p>
      {mode === "type" ? (
        <label className="block text-sm">
          Your response
          <textarea
            aria-label="Your typed lesson response"
            maxLength={4000}
            rows={Math.max(3, count + 1)}
            value={current.text}
            onChange={(event) => update({ text: event.target.value })}
            className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-base"
          />
        </label>
      ) : (
        <>
          {current.ink && !inked && (
            <img
              className="max-h-44 rounded-xl bg-white p-2"
              src={`data:image/png;base64,${current.ink}`}
              alt="Your saved handwritten lesson response"
            />
          )}
          <div
            onPointerUp={() => {
              if (frame.current !== null) cancelAnimationFrame(frame.current);
              frame.current = requestAnimationFrame(saveInk);
            }}
          >
            <HandwritingPad
              ref={pad}
              onChange={(next) => {
                setInked(next);
                if (!next && hadInk.current) update({ ink: null });
                hadInk.current = next;
              }}
              disabled={reading}
              label="Write your lesson response by hand"
              className={current.ink && !inked ? "hidden" : undefined}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reading || (!inked && !current.ink)}
              onClick={() => void recognize()}
              className="min-h-11 rounded-lg border border-gold/40 px-4 text-sm disabled:opacity-50"
            >
              {reading ? "Reading your writing…" : "Read my writing"}
            </button>
            <button
              type="button"
              disabled={reading}
              onClick={() => {
                pad.current?.clear();
                update({ ink: null, transcript: "" });
                setFeedback("");
              }}
              className="min-h-11 rounded-lg border border-border px-4 text-sm"
            >
              Write a new response
            </button>
          </div>
          {current.transcript && (
            <label className="block text-sm">
              We read — correct the transcription if needed
              <textarea
                aria-label="Handwriting transcription"
                maxLength={4000}
                value={current.transcript}
                onChange={(event) => update({ transcript: event.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-base"
              />
            </label>
          )}
          {feedback && (
            <p role="status" className="text-sm">
              {feedback}
            </p>
          )}
        </>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {user
          ? saveState === "saved"
            ? "Saved on this device until sign-out."
            : "Not saved on this device yet."
          : "This response stays here while the lesson is open. Sign in to save it on this device."}
      </p>
      {current.version !== definition.contentVersion && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Your saved response is from an earlier lesson version. Review the current task before
          continuing.
        </p>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Useful lesson phrases
        </summary>
        <ul className="space-y-3 text-sm">
          {examples.map((example) => (
            <li key={example.es}>
              <p lang={languageTag(definition.targetLanguage)}>{example.es}</p>
              <p className="text-muted-foreground">{example.en}</p>
            </li>
          ))}
        </ul>
      </details>
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-2 font-medium">Self-check</legend>
        {[
          "I answered the task.",
          "I used language from this lesson.",
          "I checked the words I was unsure about.",
        ].map((label, i) => (
          <label key={label} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={current.checks[i]}
              onChange={(event) =>
                update({
                  checks: current.checks.map((checked, index) =>
                    index === i ? event.target.checked : checked,
                  ),
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        This is practice and self-review. It does not mark the lesson mastered or create an exam
        score.
      </p>
    </section>
  );
}
