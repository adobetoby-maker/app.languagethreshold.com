import { moduleAnswerReview } from "@/lib/module-exam";
import { stageLessonLabel } from "@/lib/core60-path";
import type { PlacementBlock } from "@/lib/module-placement";

/** Answer review for public lesson-derived checks, never private formal exam banks. */
export function ModuleAnswerReview({
  blocks,
  responses,
}: {
  blocks: PlacementBlock[];
  responses: Record<string, string>;
}) {
  const entries = moduleAnswerReview(blocks, responses);
  if (!entries.length) return null;
  return (
    <section className="space-y-4 border-t border-border pt-5" data-testid="module-answer-review">
      <h3 className="font-serif text-2xl">Your answers and correct answers</h3>
      <p>
        All {entries.length} submitted answers, in test order. Questions you did not reach are not
        included.
      </p>
      <p className="text-sm">
        For fill-in questions, the correct answer below is the missing word or phrase. A correct
        completed sentence is also accepted.
      </p>
      <ol className="space-y-4">
        {entries.map(({ question, lesson, response, correct }, index) => (
          <li
            key={question.id}
            className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-4"
            data-testid="answer-review-item"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-semibold">
                Question {index + 1}
                {lesson ? ` · ${stageLessonLabel(lesson.moduleId, lesson.n)}` : ""}
              </h4>
              <span className="font-semibold">
                {correct ? "Marked correct" : "Marked incorrect"}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words">{question.prompt}</p>
            {question.hint && <p className="break-words">{question.hint}</p>}
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="font-semibold">Your answer</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {response || "No answer — I don’t know"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="font-semibold">Correct answer</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">{question.answer}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
