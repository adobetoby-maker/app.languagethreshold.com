import { useEffect, useRef, useState } from "react";
import { HandwritingPad, type HandwritingPadHandle } from "@/components/core30/HandwritingPad";
import { useAuth } from "@/state/auth-state";
import { browserExamStorage, registerPendingExam } from "@/lib/assessments/drafts";
import { examInkKey, readExamInk, saveExamInk, type ExamInk } from "@/lib/assessments/ink";
import type { AssessmentAnswer } from "@/lib/assessments/form";
export function HandwrittenExamAnswer({
  attemptId,
  itemId,
  onAnswer,
}: {
  attemptId: string;
  itemId: string;
  onAnswer: (answer: AssessmentAnswer) => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const userId = user?.id ?? "",
    storage = browserExamStorage(),
    key = examInkKey(userId, attemptId, itemId);
  const [value, setValue] = useState<ExamInk>(
    () => readExamInk(storage, key) ?? { ink: null, transcript: "", confirmed: false },
  );
  const current = useRef(value),
    pad = useRef<HandwritingPadHandle>(null),
    frame = useRef<number | null>(null),
    mounted = useRef(true);
  const [drawing, setDrawing] = useState(false),
    [saved, setSaved] = useState(true);
  const registryId = `${attemptId}:ink:${itemId}`;
  const update = (next: ExamInk) => {
    if (!mounted.current || !isCurrentUser(userId)) return;
    current.current = next;
    setValue(next);
    setSaved(saveExamInk(storage, key, next));
    registerPendingExam(userId, registryId, !!next.ink && !next.confirmed);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (!saved && current.current.ink && !current.current.confirmed) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [saved]);
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      <p className="text-sm">
        Write your answer from memory. Your ink stays on this device. Copying a provided answer does
        not assess recall.
      </p>
      {value.ink && !drawing && (
        <img
          src={`data:image/png;base64,${value.ink}`}
          alt="Your saved handwritten exam response"
          className="max-h-52 rounded-xl bg-white p-2"
        />
      )}
      <div
        onPointerUp={() => {
          if (frame.current !== null) cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            const ink = pad.current?.toPngBase64();
            if (ink) update({ ...current.current, ink, confirmed: false });
          });
        }}
      >
        <HandwritingPad
          ref={pad}
          label="Write your exam answer by hand"
          className={value.ink && !drawing ? "hidden" : undefined}
          onChange={(hasInk) => {
            setDrawing(hasInk);
            if (hasInk) registerPendingExam(userId, registryId, true);
            else if (drawing) update({ ...current.current, ink: null, confirmed: false });
          }}
        />
      </div>
      <button
        type="button"
        className="min-h-11 rounded-xl border border-border px-4 text-sm"
        onClick={() => {
          pad.current?.clear();
          setDrawing(false);
          update({ ink: null, transcript: "", confirmed: false });
        }}
      >
        Write a new answer
      </button>
      <p className="text-xs text-muted-foreground">
        Enter exactly what you wrote, including mistakes. Your transcript will need review. An
        unreadable response is not marked wrong.
      </p>
      <label className="block text-sm">
        Transcript of my handwriting
        <textarea
          className="mt-1 w-full rounded-xl border border-border bg-background p-3"
          rows={3}
          maxLength={4000}
          value={value.transcript}
          onChange={(event) =>
            update({ ...current.current, transcript: event.target.value, confirmed: false })
          }
        />
      </label>
      <button
        type="button"
        disabled={!value.ink || !value.transcript.trim()}
        className="min-h-11 rounded-xl border border-gold/40 px-4 text-sm disabled:opacity-50"
        onClick={() => {
          onAnswer({
            inputMethod: "handwriting",
            originalTranscript: value.transcript,
            correctedTranscript: value.transcript,
            recognitionIssue: true,
          });
          update({ ...current.current, confirmed: true });
        }}
      >
        Use this transcript for review
      </button>
      <p className="text-xs" role="status">
        {!saved
          ? "Ink is not saved. Keep this page open."
          : value.confirmed
            ? "Transcript added to your exam. Ink remains only on this device."
            : value.ink
              ? "Ink saved on this device. Confirm its transcript before submitting."
              : "Write with your finger, pencil or mouse."}
      </p>
    </div>
  );
}
