import { addDays, daysBetween } from "../core30-plan.ts";
/** Study-calendar projection only: assessed records and the learner's mastery log stay intact. */
export function studyPlanStart(
  startDate: string,
  timezone: string,
  resumes: {
    created_at: string;
    detail: { before?: { pausedOn?: string | null } };
  }[],
) {
  let pausedDays = 0;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (const event of resumes) {
    const pausedOn = event.detail.before?.pausedOn;
    if (!pausedOn) continue;
    const parts = formatter.formatToParts(new Date(event.created_at));
    const get = (type: string) => parts.find((part) => part.type === type)?.value;
    const resumedOn = `${get("year")}-${get("month")}-${get("day")}`;
    pausedDays += Math.max(0, daysBetween(pausedOn, resumedOn));
  }
  return addDays(startDate, pausedDays);
}
export function planLocalDay(timezone?: string, now = new Date()) {
  if (!timezone) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
