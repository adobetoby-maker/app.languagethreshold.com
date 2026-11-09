import { verbHabitDay } from "./verb-speaking-practice.ts";
export interface VerbHabit {
  day: string;
  seconds: number;
  answers: number;
  missed: string[];
  pending: boolean;
  dismissed: boolean;
}
export function readVerbHabit(raw: string | null, today = verbHabitDay()): VerbHabit {
  let value: Partial<VerbHabit> = {};
  try {
    value = JSON.parse(raw || "{}") ?? {};
  } catch {
    /* optional local record */
  }
  const same = value.day === today;
  return {
    day: today,
    seconds:
      same && Number.isFinite(value.seconds)
        ? Math.max(0, Math.min(86400, Math.floor(value.seconds!)))
        : 0,
    answers:
      same && Number.isFinite(value.answers)
        ? Math.max(0, Math.min(100000, Math.floor(value.answers!)))
        : 0,
    missed:
      same && Array.isArray(value.missed)
        ? [
            ...new Set(
              value.missed.filter(
                (id): id is string => typeof id === "string" && /^[a-z0-9-]{1,60}$/.test(id),
              ),
            ),
          ].slice(0, 30)
        : [],
    pending: value.pending === true,
    dismissed: same && value.dismissed === true,
  };
}
export function verbReminderDue(enabled: boolean, habit: VerbHabit) {
  return enabled && habit.seconds < 600 && !habit.dismissed;
}
