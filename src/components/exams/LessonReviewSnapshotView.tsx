import type { LessonReviewSnapshot } from "@/lib/lesson-review";
import { moduleLessonUrl } from "@/lib/learning-link";

export interface LessonReviewPayload {
  releaseId: string;
  releaseContentVersion: string;
  snapshot: LessonReviewSnapshot;
  fingerprint: string;
  storedFingerprint: string | null;
  matchesStoredSnapshot: boolean;
}
const ways: Record<string, string> = {
  see: "See it",
  recall: "Recall it",
  hear: "Hear it",
  type: "Type it",
  say: "Say it",
  write: "Write it",
};
const stages: Record<string, string> = {
  supported: "Supported practice",
  connected: "Connected practice",
  independent: "Independent practice",
};

/** Read-only practice materials. This view cannot record an approval or learner result. */
export function LessonReviewSnapshotView({ data }: { data: LessonReviewPayload }) {
  const { snapshot } = data;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4 text-sm space-y-2">
        <h3 className="font-semibold">{snapshot.title}</h3>
        <p>
          {snapshot.instructionLanguage} → {snapshot.targetLanguage} · {snapshot.lessons.length} of{" "}
          {snapshot.requiredLessons} required lesson plans
        </p>
        <p>
          Current app practice drafts. Opening these materials does not approve them, expose scored
          exam keys or create a learner result.
        </p>
        <p>
          {data.matchesStoredSnapshot
            ? "The stored lesson snapshot reference matches this material. This is not a review approval."
            : "This current app snapshot is not bound to the release’s lesson-review record. Do not treat exam-form review as approval of these lesson materials."}
        </p>
        <ul className="list-disc pl-5">
          {snapshot.gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
        <details>
          <summary className="min-h-11 cursor-pointer py-3">
            Snapshot versions and reference
          </summary>
          <p>Release content version: {data.releaseContentVersion}</p>
          <p>App source version: {snapshot.sourceVersion}</p>
          <p className="break-all">
            Current material fingerprint: <code>{data.fingerprint}</code>
          </p>
          {data.storedFingerprint && (
            <p className="break-all">
              Stored reference: <code>{data.storedFingerprint}</code>
            </p>
          )}
        </details>
      </div>
      {snapshot.lessons.map((lesson) => (
        <details key={lesson.id} className="rounded-xl border border-border p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Lesson {lesson.lessonNumber}: {lesson.title} · {lesson.words.length} shared draft
            words/phrases
          </summary>
          <div className="mt-4 space-y-4 text-sm">
            <p>
              <strong>Objective:</strong> {lesson.objective}
            </p>
            <p>Suggested time: {lesson.expectedMinutes} minutes</p>
            <p>
              <strong>Required learning modes:</strong>{" "}
              {lesson.modes.map((way) => ways[way]).join(" · ")}
            </p>
            <section>
              <h4 className="font-semibold">Lesson words and usage</h4>
              {lesson.words.length ? (
                <div className="overflow-x-auto">
                  <table className="mt-2 w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-2">{snapshot.targetLanguage}</th>
                        <th className="p-2">{snapshot.instructionLanguage}</th>
                        <th className="p-2">Usage / regional note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.words.map((word, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="p-2">
                            {word.es}
                            <span className="block text-xs text-muted-foreground">{word.kind}</span>
                          </td>
                          <td className="p-2">{word.en}</td>
                          <td className="p-2">{word.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  Shared lesson vocabulary is missing. Browser-generated lists are not included in
                  this snapshot.
                </p>
              )}
            </section>
            <section>
              <h4 className="font-semibold">Contextual reading</h4>
              {lesson.reading ? (
                <>
                  <p className="mt-2 font-semibold">{lesson.reading.title}</p>
                  <ol className="mt-2 space-y-3">
                    {lesson.reading.sentences.map((sentence, index) => (
                      <li key={index} className="rounded-lg border border-border p-3">
                        <p>{sentence.target}</p>
                        <p className="mt-1 text-muted-foreground">{sentence.native}</p>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p>No lesson-specific passage is mapped for this track.</p>
              )}
            </section>
            <section className="space-y-2">
              <h4 className="font-semibold">How the lesson changes the toolkit</h4>
              {lesson.teaching ? (
                <>
                  <p>
                    {stages[lesson.teaching.stage]}. These are teaching supports, not assessed CEFR
                    ratings.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Translation starts{" "}
                      {lesson.teaching.translationInitiallyVisible
                        ? "visible"
                        : "hidden; the learner can reveal it"}
                      .
                    </li>
                    <li>Matching rounds: {lesson.teaching.matchingBatchSize} items at a time.</li>
                    <li>
                      Listening: {lesson.teaching.listening.kind.replaceAll("-", " ")} ·{" "}
                      {lesson.listeningItems.length} draft prompts. Suggested replays:{" "}
                      {lesson.teaching.listening.suggestedReplays ?? "as needed"}; replay remains
                      available.
                    </li>
                    <li>
                      Speaking word bank: {lesson.teaching.speaking.wordBank.replaceAll("-", " ")}.
                    </li>
                    <li>
                      Written response: about {lesson.teaching.response.suggestedSentences}{" "}
                      sentence(s), with word copying first.
                    </li>
                  </ul>
                  <p>
                    <strong>Speaking task:</strong> {lesson.teaching.speaking.context}
                  </p>
                  <p>
                    <strong>Writing task:</strong> {lesson.teaching.writing.prompt}
                  </p>
                </>
              ) : (
                <p>Lesson-specific support and response settings are not mapped for this track.</p>
              )}
              <details>
                <summary className="min-h-11 cursor-pointer py-3">Listening prompt text</summary>
                <ol className="list-decimal space-y-2 pl-5">
                  {lesson.listeningItems.map((item, index) => (
                    <li key={index}>
                      <p>{item.es}</p>
                      <p className="text-muted-foreground">{item.en}</p>
                    </li>
                  ))}
                </ol>
                <p>Prompt text is not proof of reviewed audio or offline playback.</p>
              </details>
            </section>
            <details>
              <summary className="min-h-11 cursor-pointer py-3">
                Original activity instructions and lesson references
              </summary>
              <ol className="list-decimal space-y-2 pl-5">
                {lesson.instructions.map((step, index) => (
                  <li key={index}>
                    <strong>{step.tabLabel}</strong>
                    <p>{step.instruction}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-2">Objective reference: {lesson.objectiveId}</p>
              <p>Prerequisites: {lesson.prerequisites.join(", ") || "None"}</p>
              <p className="break-all">
                Speaking mission reference: {lesson.speakingMissionReference} (runtime verification
                remains required).
              </p>
            </details>
            <section>
              <h4 className="font-semibold">Review and verification gaps</h4>
              <ul className="list-disc pl-5">
                {lesson.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </section>
            <a
              className="inline-flex min-h-11 items-center text-gold underline"
              href={moduleLessonUrl({
                moduleId: snapshot.moduleId,
                target: snapshot.targetLanguage,
                native: snapshot.instructionLanguage,
                lesson: lesson.lessonNumber,
                way: "see",
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open learner preview of lesson {lesson.lessonNumber} (new tab)
            </a>
          </div>
        </details>
      ))}
    </div>
  );
}
