import { greetingFor } from "./reminder-greeting.ts";

export interface ReminderCountdown {
  label: string;
  date: string;
  kind: "mission" | "trip";
}

export interface ReminderStack {
  moduleId: string;
  name: string;
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
  nextLessonTitle: string | null;
}

export interface LearningReminderContext {
  version: 1;
  language: string;
  topicTitle: string | null;
  lastPracticeDate: string | null;
  mission: ReminderCountdown | null;
  trip: ReminderCountdown | null;
  stack: ReminderStack | null;
  streak?: {
    current: number;
    best: number;
    lessonsCompletedToday: number;
    recoveryLessonsRemaining: number;
    travelPasses: number;
    travelBreakEndsOn: string | null;
  };
}

export interface ReminderNotification {
  title: string;
  body: string;
  url: string;
  tag: string;
  badgeCount: number;
}

export function daysUntilDate(date: string, today: string) {
  const targetMs = Date.parse(`${date}T00:00:00Z`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(targetMs) || !Number.isFinite(todayMs)) return null;
  return Math.round((targetMs - todayMs) / 86_400_000);
}

export function buildReminderNotification(
  context: LearningReminderContext,
  today: string,
  /**
   * Hour the reminder fires in the learner's local time. Drives the
   * target-language greeting. Defaults to 9 so existing single-reminder
   * callers keep working without a behaviour change beyond the greeting.
   */
  reminderHour = 9,
): ReminderNotification | null {
  const greeting = greetingFor(context.language, reminderHour);
  if (context.streak?.travelBreakEndsOn && today <= context.streak.travelBreakEndsOn) return null;
  if (context.lastPracticeDate === today) return null;

  if (context.streak?.recoveryLessonsRemaining) {
    const remaining = context.streak.recoveryLessonsRemaining;
    return {
      title: `${greeting} ${remaining} ${remaining === 1 ? "lesson" : "lessons"} can restore your streak`,
      body: `Your ${context.streak.current}-day streak is still recoverable today. Finish ${remaining === 1 ? "one more lesson" : "two lessons"} in ${context.language} to bring it back.`,
      url: `/?tab=speak&lang=${encodeURIComponent(context.language)}`,
      // Per-language tag. A shared tag makes each language's notification
      // replace the previous one, so a 3-language learner would only ever see
      // the last to fire.
      tag: `language-threshold-streak-recovery-${context.language}`,
      badgeCount: remaining,
    };
  }

  const countdowns = [context.mission, context.trip]
    .filter((value): value is ReminderCountdown => Boolean(value))
    .map((countdown) => ({ countdown, days: daysUntilDate(countdown.date, today) }))
    .filter(
      (item): item is { countdown: ReminderCountdown; days: number } =>
        item.days !== null && item.days >= 0,
    )
    .sort((a, b) => a.days - b.days);
  const nearest = countdowns[0] ?? null;

  const headline = nearest
    ? nearest.countdown.kind === "trip"
      ? `${nearest.days} ${nearest.days === 1 ? "day" : "days"} until ${nearest.countdown.label}`
      : `${nearest.days} ${nearest.days === 1 ? "day" : "days"} until departure`
    : context.stack && context.stack.remainingLessons > 0
      ? `${context.stack.remainingLessons} lessons left in ${context.stack.name}`
      : `${context.language} practice is ready`;
  const title = `${greeting} ${headline}`;

  const bodyParts: string[] = [];
  if (context.topicTitle) bodyParts.push(`Finish today’s practice: ${context.topicTitle}.`);
  else bodyParts.push(`Keep your ${context.language} moving today.`);
  if (context.stack && context.stack.remainingLessons > 0) {
    bodyParts.push(
      `${context.stack.remainingLessons} of ${context.stack.totalLessons} lessons remain in ${context.stack.name}.`,
    );
  }
  if (context.streak?.current) {
    bodyParts.push(`Protect your ${context.streak.current}-day lesson streak.`);
  }

  return {
    title,
    body: bodyParts.join(" "),
    url: `/?tab=speak&lang=${encodeURIComponent(context.language)}`,
    tag: `language-threshold-daily-practice-${context.language}`,
    badgeCount: context.stack?.remainingLessons ?? 1,
  };
}
