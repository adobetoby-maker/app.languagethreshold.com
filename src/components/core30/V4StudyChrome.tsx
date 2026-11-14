import { BookOpen, Flame, MessagesSquare } from "lucide-react";

/** RootView.swift / V4StudySpeakBar: shared by the PWA, demo and website wrapper. */
export function V4StudySpeakBar({
  speaking,
  onStudy,
  onSpeak,
  testPrefix = "native",
}: {
  speaking: boolean;
  onStudy(): void;
  onSpeak(): void;
  testPrefix?: string;
}) {
  return (
    <nav className="lt-v4-study-speak" aria-label="Study and speak">
      <button
        type="button"
        data-testid={`${testPrefix}-nav-study`}
        aria-current={!speaking ? "page" : undefined}
        onClick={onStudy}
      >
        <BookOpen size={21} fill="currentColor" aria-hidden /> Study
      </button>
      <button
        type="button"
        data-testid={`${testPrefix}-nav-speak`}
        aria-current={speaking ? "page" : undefined}
        onClick={onSpeak}
      >
        <MessagesSquare size={23} fill="currentColor" aria-hidden /> Speak
      </button>
    </nav>
  );
}

/** Presentation only. The app supplies its existing study clock and lesson totals. */
export function V4StudyActivity({
  streak = 0,
  seconds = 0,
  lessons = 0,
  goalMinutes = 10,
}: {
  streak?: number;
  seconds?: number;
  lessons?: number;
  goalMinutes?: number;
}) {
  const goal = Math.max(1, goalMinutes);
  const elapsed = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return (
    <div className="lt-v4-study-activity" aria-label="Today's study activity">
      <img src="/icons/icon-192.png" alt="Language Threshold" width="28" height="28" />
      <span className="lt-v4-streak">
        <Flame size={16} fill="currentColor" aria-hidden />
        {streak} {streak === 1 ? "day" : "days"}
      </span>
      <div className="lt-v4-study-goal">
        <span>
          {lessons} lessons · {elapsed} / {goal} min
        </span>
        <progress
          aria-label="Daily study goal"
          value={Math.min(seconds, goal * 60)}
          max={goal * 60}
        />
      </div>
    </div>
  );
}
