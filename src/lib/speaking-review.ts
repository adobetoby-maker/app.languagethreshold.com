// Built by TAC — 2026-11-21
// Which languages may offer scenario speaking missions to a learner. One gate, read by the Speak
// screen (client) and by /api/speak (server), so the two can never disagree.
//
// A language is offered when its pack is registered, its speaking status is visible in this build
// (draft packs only in a QA build), a bundled pack says it has speaking missions
// (features.speakingMissions; legacy adapter rows set it for the missions the PWA already authored), and
// its curriculum review is done. The packs carry no review flag yet, so the languages still waiting
// on a sign-off are listed once here, and the sign-off is an environment flag named from the pack:
// `<NAME>_SPEAKING_REVIEWED=true` on the server, `VITE_<NAME>_SPEAKING_REVIEWED=true` in the client.

import {
  availabilityVisible,
  packFor,
  type LanguagePack,
} from "../data/language-packs/registry.ts";

/** Pack codes whose speaking curriculum is built but not yet signed off. */
const REVIEW_PENDING_CODES: readonly string[] = ["ja"];

export type SpeakingEnvironment = Record<string, string | boolean | undefined>;

/** The environment variable that signs off a pending language, e.g. JAPANESE_SPEAKING_REVIEWED. */
export function speakingReviewFlag(pack: LanguagePack): string {
  return `${pack.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_SPEAKING_REVIEWED`;
}

/** True while the pack's speaking curriculum still waits for review in this environment. */
export function speakingAwaitsReview(
  pack: LanguagePack,
  environment: SpeakingEnvironment = {},
): boolean {
  if (!REVIEW_PENDING_CODES.includes(pack.code)) return false;
  const flag = speakingReviewFlag(pack);
  return environment[flag] !== "true" && environment[`VITE_${flag}`] !== "true";
}

/** True when this build may offer speaking missions in the pack's language, review aside. */
export function packOffersSpeakingMissions(pack: LanguagePack): boolean {
  if (!availabilityVisible(pack.status.speakAvailability)) return false;
  return pack.features.speakingMissions;
}

/** Server and client gate: a language name or code, fail closed for an unregistered one. */
export function isSpeakingMissionLanguageEnabled(
  language: string,
  environment: SpeakingEnvironment = {},
): boolean {
  const pack = packFor(language);
  return Boolean(
    pack && packOffersSpeakingMissions(pack) && !speakingAwaitsReview(pack, environment),
  );
}
