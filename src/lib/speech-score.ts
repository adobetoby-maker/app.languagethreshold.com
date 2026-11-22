// Built by TAC — 2026-11-21
// Say It scoring for a lesson's pack (owner decisions of 2026-11-21): a released course pack
// (French, Italian) scores with its own rules; Spanish, Japanese and every language without a
// pack keep the base app's rule exactly.

import type { LanguagePack } from "../data/language-packs/types.ts";
import { followsPackRules } from "../data/language-packs/pack-rules.ts";
import { speechWordSimilarity, type SpeechWordScore } from "./speech-word-similarity.ts";
import { baseSpeechWordSimilarity } from "./speech-word-similarity-base.ts";

export function speechScore(expected: string, heard: string, pack: LanguagePack): SpeechWordScore {
  return followsPackRules(pack)
    ? speechWordSimilarity(expected, heard, pack)
    : baseSpeechWordSimilarity(expected, heard, pack.name);
}
