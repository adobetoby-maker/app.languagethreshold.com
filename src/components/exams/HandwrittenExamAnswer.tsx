import { isExamDeviceValueVolatile } from "@/lib/assessments/device-store";
import { useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { HandwritingPad, type HandwritingPadHandle } from "@/components/core30/HandwritingPad";
import { useAuth } from "@/state/auth-state";
import { browserExamStorage, registerPendingExam } from "@/lib/assessments/drafts";
import { examInkKey, readExamInk, saveExamInk, type ExamInk } from "@/lib/assessments/ink";
import type { AssessmentAnswer } from "@/lib/assessments/form";
type HandwrittenExamAnswerProps = {
  attemptId: string;
  itemId: string;
  onAnswer: (answer: AssessmentAnswer) => void;
};
export function HandwrittenExamAnswer(props: HandwrittenExamAnswerProps) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <OwnedHandwrittenExamAnswer
      key={JSON.stringify([user.id, props.attemptId, props.itemId])}
      {...props}
    />
  );
}
function OwnedHandwrittenExamAnswer({ attemptId, itemId, onAnswer }: HandwrittenExamAnswerProps) {
  const { user } = useAuth();
  const userId = user?.id ?? "",
    storage = browserExamStorage(),
    key = examInkKey(userId, attemptId, itemId);
  const [value, setValue] = useState<ExamInk>(
    () => readExamInk(storage, key) ?? { ink: null, transcript: "", confirmed: false },
  );
  const current = useRef(value),
    pad = useRef<HandwritingPadHandle>(null),
    frame = useRef<(() => void) | null>(null),
    drawingRef = useRef(false);
  const lifecycle = usePracticeLifecycle(key);
  const lease = lifecycle.capture();
  const [drawing, setDrawing] = useState(false),
    [saved, setSaved] = useState(() => !isExamDeviceValueVolatile(key));
  const registryId = `${attemptId}:ink:${itemId}`;
  const update = (next: ExamInk) => {
    if (!lease.isCurrent() || next.transcript.length > 4000) return;
    current.current = next;
    setValue(next);
    setSaved(saveExamInk(storage, key, next));
    registerPendingExam(userId, registryId, !next.confirmed && (drawingRef.current || !!next.ink));
  };
  const cancelFrame = () => {
    frame.current?.();
    frame.current = null;
  };
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
          if (!lease.isCurrent()) return;
          cancelFrame();
          const id = requestAnimationFrame(() => {
            if (!lease.isCurrent() || frame.current !== cancel) return;
            release();
            frame.current = null;
            const ink = pad.current?.toPngBase64();
            if (ink) update({ ...current.current, ink, confirmed: false });
          });
          const release = lease.own(() => cancelAnimationFrame(id));
          const cancel = () => {
            release();
            cancelAnimationFrame(id);
          };
          frame.current = cancel;
        }}
      >
        <HandwritingPad
          ref={pad}
          label="Write your exam answer by hand"
          className={value.ink && !drawing ? "hidden" : undefined}
          onChange={(hasInk) => {
            if (!lease.isCurrent()) return;
            const wasDrawing = drawingRef.current;
            drawingRef.current = hasInk;
            setDrawing(hasInk);
            if (hasInk) {
              update({ ...current.current, confirmed: false });
            } else if (wasDrawing) {
              cancelFrame();
              update({ ...current.current, ink: null, confirmed: false });
            }
          }}
        />
      </div>
      <button
        type="button"
        className="min-h-11 rounded-xl border border-border px-4 text-sm"
        onClick={() => {
          if (!lease.isCurrent()) return;
          cancelFrame();
          pad.current?.clear();
          drawingRef.current = false;
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
        disabled={value.confirmed || !value.ink || !value.transcript.trim()}
        className="min-h-11 rounded-xl border border-gold/40 px-4 text-sm disabled:opacity-50"
        onClick={() => {
          if (!lease.isCurrent() || current.current.confirmed) return;
          const latest = current.current;
          const ink = drawingRef.current ? pad.current?.toPngBase64() : latest.ink;
          if (
            !ink ||
            ink.length > 500000 ||
            !latest.transcript.trim() ||
            latest.transcript.length > 4000
          )
            return;
          cancelFrame();
          onAnswer({
            inputMethod: "handwriting",
            originalTranscript: latest.transcript,
            correctedTranscript: latest.transcript,
            recognitionIssue: true,
          });
          update({ ...latest, ink, confirmed: true });
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
