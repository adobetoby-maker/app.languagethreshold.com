import { getCurriculum } from "@/data/curriculum";
import { getMissionArea } from "@/data/missionary-content";
import { getModule } from "@/data/modules";
import { getTravelDestination } from "@/data/travel-destinations";
import type { AppState } from "@/state/app-state";
import type { LearningReminderContext } from "@/lib/reminder-message";
export {
  buildReminderNotification,
  daysUntilDate,
  type LearningReminderContext,
  type ReminderCountdown,
  type ReminderNotification,
  type ReminderStack,
} from "@/lib/reminder-message";

export function buildLearningReminderContext(
  state: Pick<
    AppState,
    | "selectedLanguage"
    | "activeModuleId"
    | "lessonProgress"
    | "moduleAssignments"
    | "departureDate"
    | "nextTrips"
    | "speakingFocusByLanguage"
    | "lastPracticeDate"
  >,
): LearningReminderContext {
  const module = getModule(state.activeModuleId);
  const curriculum = state.activeModuleId ? getCurriculum(state.activeModuleId) : null;
  const completedRaw = state.activeModuleId ? (state.lessonProgress[state.activeModuleId] ?? 0) : 0;
  const totalLessons = curriculum?.lessons.length ?? 0;
  const completedLessons = Math.max(0, Math.min(completedRaw, totalLessons));
  const nextLesson = curriculum?.lessons[completedLessons] ?? null;

  const tripPlan = state.nextTrips[state.selectedLanguage] ?? null;
  const destination = getTravelDestination(tripPlan?.destinationId);
  const trip =
    destination?.language === state.selectedLanguage && tripPlan?.departureDate
      ? {
          label: destination.country.slice(0, 80),
          date: tripPlan.departureDate,
          kind: "trip" as const,
        }
      : null;

  const missionArea = getMissionArea(state.moduleAssignments["lds-missionary"] ?? null);
  const mission = state.departureDate
    ? {
        label: (missionArea?.name ?? "your mission").slice(0, 80),
        date: state.departureDate,
        kind: "mission" as const,
      }
    : null;

  const speakingFocus = state.speakingFocusByLanguage[state.selectedLanguage];

  return {
    version: 1,
    language: state.selectedLanguage,
    topicTitle: speakingFocus?.title?.slice(0, 140) ?? nextLesson?.title?.slice(0, 140) ?? null,
    lastPracticeDate: state.lastPracticeDate,
    mission,
    trip,
    stack:
      module && curriculum
        ? {
            moduleId: module.id,
            name: module.name.slice(0, 100),
            totalLessons,
            completedLessons,
            remainingLessons: Math.max(0, totalLessons - completedLessons),
            nextLessonTitle: nextLesson?.title?.slice(0, 140) ?? null,
          }
        : null,
  };
}
