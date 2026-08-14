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
): ReminderNotification | null {
  if (context.lastPracticeDate === today) return null;

  const countdowns = [context.mission, context.trip]
    .filter((value): value is ReminderCountdown => Boolean(value))
    .map((countdown) => ({ countdown, days: daysUntilDate(countdown.date, today) }))
    .filter(
      (item): item is { countdown: ReminderCountdown; days: number } =>
        item.days !== null && item.days >= 0,
    )
    .sort((a, b) => a.days - b.days);
  const nearest = countdowns[0] ?? null;

  const title = nearest
    ? nearest.countdown.kind === "trip"
      ? `${nearest.days} ${nearest.days === 1 ? "day" : "days"} until ${nearest.countdown.label}`
      : `${nearest.days} ${nearest.days === 1 ? "day" : "days"} until departure`
    : context.stack && context.stack.remainingLessons > 0
      ? `${context.stack.remainingLessons} lessons left in ${context.stack.name}`
      : `Your ${context.language} practice is ready`;

  const bodyParts: string[] = [];
  if (context.topicTitle) bodyParts.push(`Finish today’s practice: ${context.topicTitle}.`);
  else bodyParts.push(`Keep your ${context.language} moving today.`);
  if (context.stack && context.stack.remainingLessons > 0) {
    bodyParts.push(
      `${context.stack.remainingLessons} of ${context.stack.totalLessons} lessons remain in ${context.stack.name}.`,
    );
  }

  return {
    title,
    body: bodyParts.join(" "),
    url: "/?tab=speak",
    tag: "language-threshold-daily-practice",
    badgeCount: context.stack?.remainingLessons ?? 1,
  };
}
