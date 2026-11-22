import { useEffect } from "react";
import { useSpeech } from "@/state/speech-state";
import type { SpanishPattern } from "@/data/spanish-basics";

/**
 * Models stay available for review; the independent check follows later in the lesson. A French
 * or Italian course lesson passes its own language tag, and `imperative` for a pattern of commands
 * (only the command persons are listed, each marked as a command, never as a present form).
 */
export function SpanishPatternModels({
  pattern,
  lang = "es",
  imperative = false,
}: {
  pattern: SpanishPattern;
  lang?: string;
  imperative?: boolean;
}) {
  const personLabel = (person: string) =>
    imperative ? `${person.replaceAll("_", " / ")} · command` : person.replaceAll("_", " / ");
  const { speakSentence, stop } = useSpeech();
  useEffect(() => () => stop(), [pattern.id, stop]);
  return (
    <section
      aria-label="Ten-verb pattern models"
      className="mb-4 rounded-xl border border-border p-4"
    >
      <h3 className="text-lg font-semibold">{pattern.title} · 10 verbs</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {imperative
          ? "These models are commands: each form tells someone to do something. They are not present-tense forms. Tap a form to listen."
          : lang === "es"
            ? "These models use this lesson’s pattern. The separate verb guide shows present-tense reference forms. Tap a form to listen, then practice all ten verbs in Recall, Hear, Type, Say and Write."
            : "These models use this lesson’s pattern. Tap a form to listen, then practice the lesson in Recall, Hear, Type, Say and Write."}
      </p>
      <div className="mt-3 space-y-3">
        {pattern.verbs.map((verb, index) => (
          <details key={verb.infinitive} className="rounded-lg border border-border p-3">
            <summary className="min-h-11 cursor-pointer font-semibold">
              {index + 1}. {verb.infinitive} · {verb.native}
            </summary>
            <dl className="space-y-2 py-2">
              {Object.entries(verb.forms).map(([person, form], i) => (
                <div key={person} className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm">{personLabel(person)}</dt>
                  <dd>
                    <button
                      type="button"
                      lang={lang}
                      onClick={() => speakSentence(form, index * 5 + i)}
                      aria-label={`Listen: ${personLabel(person)} ${form}`}
                      className="min-h-11 rounded-lg border border-border px-3 text-base font-semibold"
                    >
                      {form} <span aria-hidden="true">▶</span>
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </section>
  );
}
