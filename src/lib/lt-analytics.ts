type Payload = Record<string, unknown>;
export type AnalyticsInsert = (
  table: string,
  payload: Payload,
  signal: AbortSignal,
) => Promise<{ error: unknown }>;
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;
const count = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;

/** One mounted Field Prep instance. No browser-wide identity, storage, or actor singleton. */
export function createLtAnalytics({
  isCurrent,
  insert,
}: {
  isCurrent: () => boolean;
  insert: AnalyticsInsert;
}) {
  let disposed = false;
  let sessionId: string | null = null;
  const pending = new Set<AbortController>();
  const active = () => !disposed && isCurrent();
  async function send(table: string, payload: Payload): Promise<boolean> {
    if (!active() || pending.size >= 20) return false;
    const controller = new AbortController();
    pending.add(controller);
    try {
      sessionId ??= crypto.randomUUID();
      const result = await insert(table, { ...payload, session_id: sessionId }, controller.signal);
      return active() && !controller.signal.aborted && !result.error;
    } catch {
      return false;
    } finally {
      pending.delete(controller);
    }
  }
  return {
    fieldPrepSession(data: {
      scenarioId: string;
      language: string;
      missionArea?: string;
      exchangesCount: number;
      feedbackRequestedCount: number;
      usedVoice: boolean;
      durationSeconds: number;
      completed: boolean;
    }) {
      if (
        !text(data.scenarioId, 128) ||
        !text(data.language, 64) ||
        (data.missionArea !== undefined && !text(data.missionArea, 128)) ||
        !count(data.exchangesCount, 10000) ||
        !count(data.feedbackRequestedCount, 10000) ||
        !count(data.durationSeconds, 86400) ||
        typeof data.usedVoice !== "boolean" ||
        typeof data.completed !== "boolean"
      )
        return Promise.resolve(false);
      return send("lt_field_prep_events", {
        scenario_id: data.scenarioId,
        language: data.language,
        mission_area: data.missionArea ?? null,
        exchanges_count: data.exchangesCount,
        feedback_requested_count: data.feedbackRequestedCount,
        used_voice: data.usedVoice,
        duration_seconds: data.durationSeconds,
        completed: data.completed,
      });
    },
    appEvent(
      eventType: "field_prep_start",
      extras: { language: string; missionArea?: string; metadata: { scenario_id: string } },
    ) {
      if (
        eventType !== "field_prep_start" ||
        !text(extras.language, 64) ||
        !text(extras.metadata?.scenario_id, 128) ||
        (extras.missionArea !== undefined && !text(extras.missionArea, 128))
      )
        return Promise.resolve(false);
      return send("lt_app_events", {
        event_type: eventType,
        language: extras.language,
        mission_area: extras.missionArea ?? null,
        metadata: { scenario_id: extras.metadata.scenario_id },
      });
    },
    submitFeedback(data: {
      feedbackType: "field_prep_session";
      rating: number;
      comment?: string;
      scenarioId: string;
      language: string;
      missionArea?: string;
    }) {
      if (
        data.feedbackType !== "field_prep_session" ||
        !count(data.rating, 5) ||
        data.rating < 1 ||
        !text(data.scenarioId, 128) ||
        !text(data.language, 64) ||
        (data.comment !== undefined &&
          (typeof data.comment !== "string" || data.comment.length > 2000)) ||
        (data.missionArea !== undefined && !text(data.missionArea, 128))
      )
        return Promise.resolve(false);
      return send("lt_feedback", {
        feedback_type: data.feedbackType,
        rating: data.rating,
        comment: data.comment ?? null,
        scenario_id: data.scenarioId,
        language: data.language,
        mission_area: data.missionArea ?? null,
      });
    },
    dispose() {
      disposed = true;
      for (const controller of pending) controller.abort();
      pending.clear();
      sessionId = null;
    },
  };
}
export type LtAnalytics = ReturnType<typeof createLtAnalytics>;
