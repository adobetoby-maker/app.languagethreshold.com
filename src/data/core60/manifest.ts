// Built by TAC — 2026-10-19
// The Core 60 stage manifest: which trades have a data-driven Foundation and/or Master, written by
// the stage generator (docs/core60-architecture.md) alongside each stage file in
// src/data/core60/<langCode>/<stage>-<base>.json. An entry here is all it takes to register a
// stage: its catalog entry (MODULES), its step on the Core 60 path and its lazy-loaded curriculum.
// A stage that is not listed shows "Coming soon" on its trade's path.
// Roofing is not listed: its stages are hand-written (foundation-/master-roofing-curriculum.ts).
// master-electrician and master-nursing are deliberately NOT listed: their files on disk are the
// Sonnet pilot (known Spanish errors), and only Opus-generated content ships. Both trades show
// Master as "Coming soon" until Opus regenerates them and the master entry is added back.
// (npm run validate:core60 warns about those two unlisted stage files: expected.)
// Check with: npm run validate:core60

import type { Core60ManifestEntry } from "../../lib/core60-stage-core.ts";

export const CORE60_MANIFEST: readonly Core60ManifestEntry[] = [
  { base: "electrician", language: "Spanish", foundation: { blurb: "Ten short, free beginner lessons: sounds, numbers and measurements, ser and estar, questions and polite requests, taught with electrician words like tools, wire and outlets before Electrician Lesson 1.", userRole: "Beginner electrician learning Spanish", challengePrompts: ["Greet the homeowner, say your name, and ask how to say a tool in Spanish.", "Tell your helper what time you start and how many rolls of wire you need.", "Ask the homeowner where the basement is and if you can go in.", "Tell a coworker the wire may be live and ask for the voltage tester.", "Tell a coworker you don't understand, ask them to speak slowly, and ask for help."] } },
  { base: "nursing", language: "Spanish", foundation: { blurb: "Ten short, free beginner lessons on sounds, greetings, vital sign numbers, ser and estar, questions, polite requests and survival phrases, taught with nursing words before Nursing & Patient Care Lesson 1.", userRole: "Beginner nurse learning Spanish", challengePrompts: ["Greet a new patient, say your name, and tell them you are their nurse today.", "Tell a patient their temperature and pulse, and what time you will come back.", "Ask a patient if they need water, a blanket or help getting to the bathroom.", "Ask a coworker where the gloves are and who the patient's doctor is.", "Tell a patient you don't understand and say you will call an interpreter."] } },
];
