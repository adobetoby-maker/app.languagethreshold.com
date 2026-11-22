// Built by TAC — 2026-11-21
// Which learners get pack-driven behaviour (owner rules of 2026-11-21, decisions 2 and 3).
// Self-contained (type-only import) so pure grading modules can use it under plain Node.

import type { LanguagePack } from "./types.ts";

/**
 * True only for a released course pack on the pack model (French and Italian today): a bundled
 * pack (never a legacy adapter, whose availability is "online") without legacy unscoped storage.
 * Spanish and Japanese (legacy unscoped storage) and every language without a pack (German,
 * Portuguese, Chinese, Korean, Pashto, English) keep the base app's grading, letters and copy.
 */
export function followsPackRules(pack: LanguagePack | null | undefined): boolean {
  return !!pack && pack.status.availability !== "online" && !pack.ids.legacyUnscopedStorage;
}
