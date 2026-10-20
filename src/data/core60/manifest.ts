// Built by TAC — 2026-10-19
// The Core 60 stage manifest: which trades have a data-driven Foundation and/or Master, written by
// the stage generator (docs/core60-architecture.md) alongside each stage file in
// src/data/core60/<langCode>/<stage>-<base>.json. An entry here is all it takes to register a
// stage: its catalog entry (MODULES), its step on the Core 60 path and its lazy-loaded curriculum.
// A stage that is not listed shows "Coming soon" on its trade's path.
// Roofing is not listed: its stages are hand-written (foundation-/master-roofing-curriculum.ts).
// Check with: npm run validate:core60

import type { Core60ManifestEntry } from "../../lib/core60-stage-core.ts";

export const CORE60_MANIFEST: readonly Core60ManifestEntry[] = [];
