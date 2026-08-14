export const RECOVERY_LESSONS_REQUIRED = 2;
export const MAX_TRAVEL_PASSES = 3;
export const MAX_TRAVEL_BREAK_DAYS = 7;

export interface StreakRecovery {
  openedOn: string;
  previousStreak: number;
  lessonsCompleted: number;
  missedDate: string;
}

export interface TravelBreak {
  startsOn: string;
  endsOn: string;
}

export interface PracticeStreakData {
  current: number;
  best: number;
  lastPracticeDate: string | null;
  practiceDates: string[];
  today: { date: string | null; lessonsCompleted: number };
  recovery: StreakRecovery | null;
  travelPasses: number;
  travelBreak: TravelBreak | null;
  updatedAt: string;
}

export function initialPracticeStreak(): PracticeStreakData {
  return {
    current: 0,
    best: 0,
    lastPracticeDate: null,
    practiceDates: [],
    today: { date: null, lessonsCompleted: 0 },
    recovery: null,
    travelPasses: 1,
    travelBreak: null,
    updatedAt: "",
  };
}

function dateMs(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export function dateDelta(from: string, to: string) {
  return Math.round((dateMs(to) - dateMs(from)) / 86_400_000);
}

export function addDays(date: string, days: number) {
  const value = new Date(dateMs(date));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateInBreak(date: string, travelBreak: TravelBreak | null) {
  return Boolean(travelBreak && date >= travelBreak.startsOn && date <= travelBreak.endsOn);
}

function unprotectedMissedDates(
  lastPracticeDate: string,
  today: string,
  travelBreak: TravelBreak | null,
) {
  const gap = Math.max(0, dateDelta(lastPracticeDate, today));
  const missed: string[] = [];
  for (let offset = 1; offset < gap; offset += 1) {
    const date = addDays(lastPracticeDate, offset);
    if (!dateInBreak(date, travelBreak)) missed.push(date);
  }
  return missed;
}

function normalizedToday(
  todayState: PracticeStreakData["today"],
  today: string,
): PracticeStreakData["today"] {
  return todayState.date === today ? todayState : { date: today, lessonsCompleted: 0 };
}

function touched(data: PracticeStreakData, now = new Date().toISOString()) {
  return { ...data, updatedAt: now };
}

export function evaluatePracticeStreak(
  data: PracticeStreakData,
  today: string,
  now?: string,
): PracticeStreakData {
  let next = { ...data, today: normalizedToday(data.today, today) };

  if (next.recovery && next.recovery.openedOn !== today) {
    next = { ...next, current: 0, recovery: null };
  }

  if (!next.lastPracticeDate || next.lastPracticeDate >= today || next.current <= 0) {
    return next === data ? data : touched(next, now);
  }

  const missed = unprotectedMissedDates(next.lastPracticeDate, today, next.travelBreak);
  if (missed.length === 0) return next;

  if (missed.length === 1) {
    if (next.recovery?.openedOn === today) return next;
    return touched(
      {
        ...next,
        recovery: {
          openedOn: today,
          previousStreak: next.current,
          lessonsCompleted: 0,
          missedDate: missed[0],
        },
      },
      now,
    );
  }

  return touched({ ...next, current: 0, recovery: null }, now);
}

function addPracticeDate(practiceDates: string[], today: string) {
  if (practiceDates.includes(today)) return practiceDates;
  return [...practiceDates, today].sort().slice(-370);
}

function awardWeeklyPass(previous: number, next: number, passes: number) {
  if (next >= 7 && Math.floor(next / 7) > Math.floor(previous / 7)) {
    return Math.min(MAX_TRAVEL_PASSES, passes + 1);
  }
  return passes;
}

export function recordPracticeCompletion(
  data: PracticeStreakData,
  today: string,
  now?: string,
): PracticeStreakData {
  const evaluated = evaluatePracticeStreak(data, today, now);
  const todaysLessons = normalizedToday(evaluated.today, today).lessonsCompleted + 1;
  const practiceDates = addPracticeDate(evaluated.practiceDates, today);

  if (evaluated.recovery) {
    const recoveryLessons = Math.min(
      RECOVERY_LESSONS_REQUIRED,
      evaluated.recovery.lessonsCompleted + 1,
    );
    if (recoveryLessons < RECOVERY_LESSONS_REQUIRED) {
      return touched(
        {
          ...evaluated,
          practiceDates,
          today: { date: today, lessonsCompleted: todaysLessons },
          recovery: { ...evaluated.recovery, lessonsCompleted: recoveryLessons },
        },
        now,
      );
    }

    const current = evaluated.recovery.previousStreak + 1;
    return touched(
      {
        ...evaluated,
        current,
        best: Math.max(evaluated.best, current),
        lastPracticeDate: today,
        practiceDates,
        today: { date: today, lessonsCompleted: todaysLessons },
        recovery: null,
        travelBreak: null,
        travelPasses: awardWeeklyPass(
          evaluated.recovery.previousStreak,
          current,
          evaluated.travelPasses,
        ),
      },
      now,
    );
  }

  const alreadyPracticedToday = evaluated.lastPracticeDate === today;
  const previous = evaluated.current;
  const current = alreadyPracticedToday ? previous : previous > 0 ? previous + 1 : 1;
  return touched(
    {
      ...evaluated,
      current,
      best: Math.max(evaluated.best, current),
      lastPracticeDate: today,
      practiceDates,
      today: { date: today, lessonsCompleted: todaysLessons },
      // Completing practice means the learner is back; end any planned pause
      // immediately so reminders and normal streak rules resume.
      travelBreak: null,
      travelPasses: alreadyPracticedToday
        ? evaluated.travelPasses
        : awardWeeklyPass(previous, current, evaluated.travelPasses),
    },
    now,
  );
}

export function startTravelBreak(
  data: PracticeStreakData,
  today: string,
  days: number,
  now?: string,
): PracticeStreakData {
  const safeDays = Math.max(1, Math.min(MAX_TRAVEL_BREAK_DAYS, Math.round(days)));
  if (data.travelPasses <= 0) return data;
  if (data.travelBreak && today <= data.travelBreak.endsOn) return data;
  return touched(
    {
      ...data,
      travelPasses: data.travelPasses - 1,
      travelBreak: { startsOn: today, endsOn: addDays(today, safeDays - 1) },
      recovery: null,
    },
    now,
  );
}

export function isTravelBreakActive(data: PracticeStreakData, today: string) {
  return dateInBreak(today, data.travelBreak);
}

export function recoveryLessonsRemaining(data: PracticeStreakData) {
  return data.recovery
    ? Math.max(0, RECOVERY_LESSONS_REQUIRED - data.recovery.lessonsCompleted)
    : 0;
}
