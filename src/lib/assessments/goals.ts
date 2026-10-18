/** Explicit learner choices; never inferred from a test score or a missing input. */
export const LEARNER_GOALS = {
  everyday_conversation: "Everyday conversation",
  numbers_measurements: "Numbers and measurements",
  directions_travel: "Directions and getting around",
  requests_clarification: "Making requests and asking for clarification",
  reading_messages: "Reading everyday messages",
  customer_conversations: "Conversations with customers",
} as const;
export type LearnerGoal = keyof typeof LEARNER_GOALS;
export interface LearnerGoals {
  revision: number;
  topics: LearnerGoal[];
  offlinePreferred: boolean;
  updatedAt: string | null;
}
