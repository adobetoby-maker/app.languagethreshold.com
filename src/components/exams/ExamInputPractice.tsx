import { useId, useRef, useState } from "react";
import { HandwritingPad, type HandwritingPadHandle } from "@/components/core30/HandwritingPad";

/** Ephemeral input rehearsal. No attempt IDs, API calls or saved response callbacks. */
export function ExamInputPractice() {
  const id = useId(),
    pad = useRef<HandwritingPadHandle>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("");
  const [ink, setInk] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  function clear() {
    pad.current?.clear();
    setText("");
    setChoice("");
    setInk(false);
    setTranscription("");
    setConfirmed(false);
  }
  return (
    <details className="my-4 rounded-xl border border-border/60 p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">
        Try the inputs — unscored practice
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Try any word or a short phrase. This practice is not an exam answer. Nothing here is scored,
        sent for recognition or saved when you leave this screen.
      </p>
      <label className="mt-4 block text-sm" htmlFor={`${id}-type`}>
        Try typing any word
      </label>
      <input
        id={`${id}-type`}
        className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2"
        value={text}
        onChange={(event) => setText(event.target.value)}
        autoComplete="off"
      />
      <fieldset className="mt-4 flex flex-wrap gap-4">
        <legend className="mb-2 text-sm">Try selecting an answer</legend>
        {["Practice A", "Practice B"].map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${id}-choice`}
              checked={choice === value}
              onChange={() => setChoice(value)}
            />
            {value}
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">Try handwriting</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Write with a finger, pen or mouse. Undo removes your last stroke; Clear starts again.
          Typing is an alternative.
        </p>
        <HandwritingPad
          ref={pad}
          label="Unscored handwriting practice"
          onChange={(hasInk) => {
            setInk(hasInk);
            setConfirmed(false);
          }}
        />
        <p role="status" className="mt-2 text-sm">
          {ink ? "Practice ink is on the pad." : "The practice pad is empty."}
        </p>
        <label htmlFor={`${id}-transcription`} className="mt-3 block text-sm">
          Type what you meant to write
        </label>
        <input
          id={`${id}-transcription`}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2"
          value={transcription}
          onChange={(event) => {
            setTranscription(event.target.value);
            setConfirmed(false);
          }}
          autoComplete="off"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          In an exam, check any transcription before confirming it. If recognition is wrong, correct
          it or report the issue. Recognition trouble is not a wrong answer.
        </p>
        <button
          type="button"
          disabled={!transcription.trim()}
          className="mt-3 min-h-11 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
          onClick={() => setConfirmed(true)}
        >
          Confirm practice text
        </button>
        {confirmed && (
          <p role="status" className="mt-2 text-sm">
            Practice text confirmed. No exam answer was submitted.
          </p>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        If a speaking question offers recording, it explains consent and microphone access
        separately. This practice does not use your microphone.
      </p>
      <button
        type="button"
        className="mt-4 min-h-11 rounded-xl border border-border px-4 py-2 text-sm"
        onClick={clear}
      >
        Clear all practice
      </button>
    </details>
  );
}
