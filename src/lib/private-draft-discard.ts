import { clearExamDraftsForUser, type ExamDraftStorage } from "./assessments/drafts.ts";
import { clearLessonDraftsForUser } from "./lesson-drafts.ts";

import { clearTeamCompletions } from "./team-completion-device.ts";

const PREFIX = "lt.privateDraftDiscard.v1.";
const ownedPrefixes = (actor: string) =>
  [
    "lt.examDraft.v1.",
    "lt.examSnapshot.v1.",
    "lt.examGuidance.v1.",
    "lt.examInk.v1.",
    "lt.lessonDraft.v1.",
    "lt.core30TeamCompletion.v1.",
  ].map((prefix) => prefix + encodeURIComponent(actor) + ".");

/** No data or authorization is carried by this same-origin discard notice. */
export function privateDraftDiscardActor(key: string | null, value: string | null) {
  if (!key?.startsWith(PREFIX) || !value || value.length > 100) return null;
  try {
    const actor = decodeURIComponent(key.slice(PREFIX.length));
    return actor && actor.length <= 200 ? actor : null;
  } catch {
    return null;
  }
}

export function clearPrivateLearningDrafts(storage: ExamDraftStorage | null, actor: string) {
  clearExamDraftsForUser(storage, actor);
  clearLessonDraftsForUser(storage, actor);
  clearTeamCompletions(storage, actor);
}

/** Explicit successful sign-out only; other tabs must drop their memory fallback too. */
export function discardPrivateLearningDrafts(storage: ExamDraftStorage | null, actor: string) {
  const marker = crypto.randomUUID();
  let announced = false;
  const announce = () => {
    try {
      storage?.setItem(PREFIX + encodeURIComponent(actor), marker);
      announced = !!storage;
    } catch {
      /* Retry after freeing the approved account's cache. */
    }
  };
  announce();
  clearPrivateLearningDrafts(storage, actor);
  if (!announced) announce();
  try {
    if (!announced || !storage) return false;
    const prefixes = ownedPrefixes(actor);
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
