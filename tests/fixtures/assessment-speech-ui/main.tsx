import React, { useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { ExamSpeechQuestion } from "../../../src/components/exams/ExamSpeechQuestion";
import { SpeechEvidencePlayback } from "../../../src/components/exams/SpeechEvidencePlayback";
import {
  subscribeSpeechDrafts,
  unsavedSpeechCount,
} from "../../../src/lib/assessments/speech-device";
import { fixture, installSpeechFixture } from "./client";
import { fixtureUser } from "./auth";
await installSpeechFixture();
export function Fixture() {
  const [shown, setShown] = useState(true),
    [review, setReview] = useState(false),
    [working, setWorking] = useState(false),
    [epoch, setEpoch] = useState(0),
    [ready, setReady] = useState(false);
  const count = useSyncExternalStore(
    subscribeSpeechDrafts,
    () => unsavedSpeechCount(fixtureUser, "fixture-attempt"),
    () => 0,
  );
  const reload = async () => {
    setEpoch((v) => v + 1);
  };
  return (
    <main>
      <h1>Speaking controls — local QA</h1>
      <p className="notice">
        Synthetic non-speech only. No hosted account, policy, recording, score or certificate is
        changed. The microphone is simulated; playback uses a generated silent clip.
      </p>
      <p role="status">
        Unsaved recordings: {count} · Saved revision: {fixture.revision} · Stops:{" "}
        {fixture.tracksStopped}
      </p>
      <div>
        <button disabled={working} onClick={() => setShown((v) => !v)}>
          {shown ? "Visit another question" : "Return to speaking question"}
        </button>
        <button disabled={working} onClick={() => setReview((v) => !v)}>
          {review ? "Learner view" : "Review simulated answer"}
        </button>
      </div>
      <label>
        <input
          type="checkbox"
          checked={fixture.denyMicrophone}
          onChange={(e) => {
            fixture.denyMicrophone = e.target.checked;
            setEpoch((v) => v + 1);
          }}
        />
        Simulate microphone denial
      </label>
      <label>
        <input
          type="checkbox"
          checked={fixture.failStart}
          onChange={(e) => {
            fixture.failStart = e.target.checked;
            setEpoch((v) => v + 1);
          }}
        />
        Simulate recorder start failure
      </label>
      <label>
        Simulated upload outcome
        <select
          value={fixture.failureMode}
          onChange={(e) => {
            fixture.failureMode = e.target.value;
            fixture.failNext = true;
            setEpoch((v) => v + 1);
          }}
        >
          <option value="network">Temporary connection loss</option>
          <option value="expired">Expired upload reservation</option>
          <option value="accepted">Accepted upload with lost response</option>
        </select>
      </label>
      <p>
        Upload requests: {fixture.requests.length} · Same retry ID:{" "}
        {fixture.requests.length > 1
          ? String(fixture.requests[0] === fixture.requests[1])
          : "waiting"}
      </p>
      {shown && !review && (
        <ExamSpeechQuestion
          attemptId="fixture-attempt"
          itemId="spoken-item"
          scope="personal"
          evidenceId={fixture.evidenceId || undefined}
          evidenceAvailable={fixture.evidenceId ? !fixture.withdrawn : undefined}
          flush={async () => true}
          revision={() => fixture.revision}
          reload={reload}
          onWorkingChange={setWorking}
        />
      )}
      {!shown && <p>Other question. Your unsaved audio remains in memory.</p>}
      {review && fixture.evidenceId && (
        <>
          <SpeechEvidencePlayback
            key={fixture.evidenceId}
            evidenceId={fixture.evidenceId}
            available={!fixture.withdrawn}
            onReviewReady={setReady}
          />
          <button disabled={!ready}>Simulated rubric decision enabled</button>
          <p>Fixture acknowledgement: {String(fixture.acknowledged)}</p>
        </>
      )}
      <small>Render checkpoint {epoch}</small>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
