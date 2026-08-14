export interface SpeakingObjectiveProgressItem {
  id: string;
  critical: boolean;
}

export function validSpeakingObjectiveIds(
  objectives: SpeakingObjectiveProgressItem[],
  candidateIds: string[] | undefined,
) {
  const allowed = new Set(objectives.map((objective) => objective.id));
  return [...new Set((candidateIds ?? []).filter((id) => allowed.has(id)))];
}

export function criticalSpeakingObjectivesAddressed(
  objectives: SpeakingObjectiveProgressItem[],
  addressedIds: string[],
) {
  const addressed = new Set(addressedIds);
  return objectives.every((objective) => !objective.critical || addressed.has(objective.id));
}
