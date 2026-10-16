/** Shared assessment contracts. No answer keys or learner records belong in client practice packs. */
export const ASSESSMENT_SKILLS = [
  "recognition",
  "recall",
  "listening",
  "reading",
  "writing",
  "speaking",
] as const;
export type AssessmentSkill = (typeof ASSESSMENT_SKILLS)[number];
export const CHECKPOINTS = ["entrance", "day45", "day90"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];
export type EvidenceState = "scored" | "pending" | "needs_review" | "not_assessed";
export interface ItemEvidence {
  itemId: string;
  objectiveId: string;
  skill: AssessmentSkill;
  /** Reviewed anchor/equivalence group, absent when comparisons are not supported. */
  comparisonGroup?: string;
  coverage?: "module" | "studied" | "transfer";
  state: EvidenceState;
  points: number | null;
  maximum: number;
  source: "deterministic" | "human" | "ai_proposal";
  reason?: string;
}
export interface SkillResult {
  skill: AssessmentSkill;
  state: EvidenceState | "insufficient_coverage";
  score: number | null;
  objectives: string[];
  evidenceCount: number;
  pendingCount: number;
  missingCount: number;
  /** Scores remain provisional until form/rubric calibration is approved. */
  provisional: boolean;
}

/** Never average missing or uncertain evidence into a zero, or count an AI proposal as final. */
export function skillResults(evidence: readonly ItemEvidence[], calibrated = false): SkillResult[] {
  return ASSESSMENT_SKILLS.map((skill) => {
    const rows = evidence.filter((entry) => entry.skill === skill);
    const scored = rows.filter(
      (entry) =>
        entry.state === "scored" &&
        entry.source !== "ai_proposal" &&
        entry.points !== null &&
        Number.isFinite(entry.points) &&
        Number.isFinite(entry.maximum) &&
        entry.maximum > 0 &&
        entry.points >= 0 &&
        entry.points <= entry.maximum,
    );
    const objectives = [...new Set(scored.map((entry) => entry.objectiveId))].sort();
    const pendingCount = rows.filter(
      (entry) =>
        entry.state === "pending" || (entry.state === "scored" && entry.source === "ai_proposal"),
    ).length;
    const review = rows.some((entry) => entry.state === "needs_review");
    const missingCount = rows.length - scored.length - pendingCount;
    const state = review
      ? "needs_review"
      : pendingCount
        ? "pending"
        : objectives.length >= 3
          ? "scored"
          : scored.length
            ? "insufficient_coverage"
            : "not_assessed";
    const maximum = scored.reduce((sum, entry) => sum + entry.maximum, 0);
    return {
      skill,
      state,
      score:
        state === "scored"
          ? Math.round((scored.reduce((sum, entry) => sum + entry.points!, 0) / maximum) * 100)
          : null,
      objectives,
      evidenceCount: scored.length,
      pendingCount,
      missingCount,
      provisional: !calibrated,
    };
  });
}

/** Growth is limited to common scored objectives; midpoint studied coverage stays separate. */
export function compareSkillEvidence(
  before: readonly ItemEvidence[],
  after: readonly ItemEvidence[],
  skill: AssessmentSkill,
  equivalenceApproved = false,
) {
  if (!equivalenceApproved) return { objectives: [], before: null, after: null, change: null };
  const eligible = (rows: readonly ItemEvidence[]) =>
    rows.filter(
      (entry) =>
        entry.skill === skill &&
        Boolean(entry.comparisonGroup) &&
        entry.state === "scored" &&
        entry.source !== "ai_proposal" &&
        entry.points !== null &&
        entry.maximum > 0 &&
        Number.isFinite(entry.maximum) &&
        Number.isFinite(entry.points) &&
        entry.points >= 0 &&
        entry.points <= entry.maximum,
    );
  const a = eligible(before),
    b = eligible(after);
  const common = [...new Set(a.map((entry) => entry.objectiveId))]
    .filter((objective) =>
      b.some(
        (entry) =>
          entry.objectiveId === objective &&
          a.some(
            (prior) =>
              prior.objectiveId === objective && prior.comparisonGroup === entry.comparisonGroup,
          ),
      ),
    )
    .sort();
  if (common.length < 3) return { objectives: common, before: null, after: null, change: null };
  // Weight objectives equally: extra items on one objective must not change its weight.
  const average = (rows: ItemEvidence[]) =>
    Math.round(
      common.reduce((sum, objective) => {
        const items = rows.filter((entry) => entry.objectiveId === objective);
        return (
          sum +
          (items.reduce((total, entry) => total + entry.points!, 0) /
            items.reduce((total, entry) => total + entry.maximum, 0)) *
            100
        );
      }, 0) / common.length,
    );
  const shared = (rows: ItemEvidence[], other: ItemEvidence[]) =>
    rows.filter((entry) =>
      other.some(
        (candidate) =>
          candidate.objectiveId === entry.objectiveId &&
          candidate.comparisonGroup === entry.comparisonGroup,
      ),
    );
  const first = average(shared(a, b)),
    last = average(shared(b, a));
  return { objectives: common, before: first, after: last, change: last - first };
}

export interface AnswerPolicy {
  caseSensitive: boolean;
  accents: "required" | "ignore";
  punctuation: "required" | "ignore";
}
export function normalizeAssessmentAnswer(value: string, policy: AnswerPolicy): string {
  let normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!policy.caseSensitive) normalized = normalized.toLocaleLowerCase();
  if (policy.accents === "ignore")
    normalized = normalized.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
  if (policy.punctuation === "ignore")
    normalized = normalized.replace(/\p{P}/gu, " ").replace(/\s+/gu, " ").trim();
  return normalized;
}
export function scoreFixedAnswer(
  answer: string,
  accepted: readonly string[],
  policy: AnswerPolicy,
): boolean {
  const normalized = normalizeAssessmentAnswer(answer, policy);
  return (
    Boolean(normalized) &&
    accepted.some((value) => normalized === normalizeAssessmentAnswer(value, policy))
  );
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function addCalendarDays(date: string, days: number): string {
  if (!isDateKey(date) || !Number.isInteger(days)) throw new Error("Invalid calendar date.");
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Choose a valid plan timezone.");
  }
}
/** Local noon avoids ordinary DST midnight gaps while retaining an absolute schedule timestamp. */
export function localNoonTimestamp(date: string, timezone: string): string {
  if (!isDateKey(date)) throw new Error("Invalid calendar date.");
  validateTimezone(timezone);
  const desired = Date.parse(`${date}T12:00:00Z`);
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = desired;
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      format.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
    );
    const represented = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    );
    const adjustment = desired - represented;
    timestamp += adjustment;
    if (!adjustment) return new Date(timestamp).toISOString();
  }
  throw new Error("That local plan date is unavailable in this timezone.");
}
export function checkpointSchedule(startDate: string, timezone: string) {
  return CHECKPOINTS.map((checkpoint) => {
    const date = addCalendarDays(
      startDate,
      checkpoint === "entrance" ? 0 : checkpoint === "day45" ? 44 : 89,
    );
    return { checkpoint, date, dueAt: localNoonTimestamp(date, timezone), timezone };
  });
}

/** Midpoint results never masquerade as full-module readiness. */
export function checkpointProfiles(
  checkpoint: Checkpoint,
  evidence: readonly ItemEvidence[],
  calibrated = false,
) {
  if (checkpoint !== "day45")
    return [{ coverage: "module" as const, skills: skillResults(evidence, calibrated) }];
  return (["studied", "transfer"] as const).map((coverage) => ({
    coverage,
    skills: skillResults(
      evidence.filter((item) => item.coverage === coverage),
      calibrated,
    ),
  }));
}
