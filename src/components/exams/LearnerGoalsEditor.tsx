import { useState } from "react";
import { LEARNER_GOALS, type LearnerGoal, type LearnerGoals } from "@/lib/assessments/goals";

export function LearnerGoalsEditor({
  goals,
  isLearner,
  scope,
  busy,
  onSave,
}: {
  goals: LearnerGoals;
  isLearner: boolean;
  scope: "personal" | "team";
  busy: boolean;
  onSave: (topics: LearnerGoal[], offlinePreferred: boolean) => void;
}) {
  const [topics, setTopics] = useState(goals.topics),
    [offline, setOffline] = useState(goals.offlinePreferred);
  const dirty =
    JSON.stringify([...topics].sort()) !== JSON.stringify([...goals.topics].sort()) ||
    offline !== goals.offlinePreferred;
  return (
    <section
      className="rounded-xl border border-border p-4 space-y-3"
      aria-label="Learner-selected goals"
    >
      <h4 className="font-semibold">
        {isLearner ? "Where else would you like to use this language?" : "Learner-selected goals"}
      </h4>
      <p className="text-sm text-muted-foreground">
        Optional: choose up to three goals. These are your interests, not a test result. The work
        module stays primary and no extra module is assigned automatically.
      </p>
      <p className="text-sm">
        {scope === "team"
          ? "Goals saved on this team plan are visible to its admins. The learner chooses; an admin approves any supporting assignment."
          : "These goals stay with this private personal plan. You decide whether to add any supporting work."}
      </p>
      {isLearner ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(topics, offline);
          }}
          className="space-y-3"
        >
          <fieldset disabled={busy} className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Choose up to three goals</legend>
            {(Object.entries(LEARNER_GOALS) as [LearnerGoal, string][]).map(([id, label]) => (
              <label key={id} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={topics.includes(id)}
                  disabled={!topics.includes(id) && topics.length >= 3}
                  onChange={(event) =>
                    setTopics((previous) =>
                      event.target.checked
                        ? [...previous, id]
                        : previous.filter((value) => value !== id),
                    )
                  }
                />
                {label}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={offline}
                onChange={(event) => setOffline(event.target.checked)}
              />
              Prefer content verified for offline use
            </label>
          </fieldset>
          <button
            type="submit"
            disabled={busy || !dirty}
            className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save my goals"}
          </button>
          <p className="text-xs text-muted-foreground">
            Requires a connection. Uncheck every goal and save to clear them. Existing approved
            assignments keep their own history.
          </p>
        </form>
      ) : (
        <>
          {goals.topics.length ? (
            <ul className="list-disc pl-5 text-sm">
              {goals.topics.map((topic) => (
                <li key={topic}>{LEARNER_GOALS[topic]}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No goals selected by this learner.</p>
          )}
          {goals.offlinePreferred && (
            <p className="text-sm">Prefers content verified for offline use.</p>
          )}
        </>
      )}
      {goals.updatedAt && (
        <p className="text-xs text-muted-foreground">
          Saved {new Date(goals.updatedAt).toLocaleDateString()} · revision {goals.revision}
        </p>
      )}
    </section>
  );
}
