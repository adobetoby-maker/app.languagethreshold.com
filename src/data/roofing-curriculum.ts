import type { Lesson } from "./curriculum.ts";
import { r, sp, wm } from "./curriculum-helpers.ts";

type Topic = {
  title: string;
  objective: string;
  seed: string;
  words: string;
  speaking: string;
};

const MATERIALS = "seed-es-roofing-materials";
const TEAR_OFF = "seed-es-roofing-tear-off";
const INSTALL = "seed-es-roofing-install";
const SAFETY = "seed-es-roofing-safety";
const CLOSEOUT = "seed-es-roofing-closeout";

const topics: Topic[] = [
  {
    title: "Name the Roof System",
    objective: "Identify the job's roof system and main materials",
    seed: MATERIALS,
    words: "shingle, tile, metal panel, roof deck",
    speaking: "Tell a crew member which roof system and materials today's job uses.",
  },
  {
    title: "Deck, Underlayment & Edges",
    objective: "Name the layers beneath the finished roof",
    seed: MATERIALS,
    words: "roof deck, underlayment, felt paper, drip edge",
    speaking: "Point out the deck, underlayment, and edge on a roof plan.",
  },
  {
    title: "Flashing & Valleys",
    objective: "Identify common water-entry details",
    seed: MATERIALS,
    words: "flashing, step flashing, valley, ice and water shield",
    speaking: "Ask the lead to show you each flashing and valley location.",
  },
  {
    title: "Ridge, Vents & Drainage",
    objective: "Name ridge and drainage components",
    seed: MATERIALS,
    words: "ridge cap, vent, gutter, downspout, fascia",
    speaking: "Describe where the ridge vent and downspouts belong.",
  },
  {
    title: "Fasteners & Consumables",
    objective: "Request roofing fasteners and sealants clearly",
    seed: MATERIALS,
    words: "roofing nails, plastic cap nails, roofing cement",
    speaking: "Call a supplier and confirm the fasteners specified for this job.",
  },
  {
    title: "Morning Crew Brief",
    objective: "Open the day with assignments and a clear plan",
    seed: TEAR_OFF,
    words: "crew lead, staging area, tear-off",
    speaking: "Run a two-minute morning brief covering work zones and material staging.",
  },
  {
    title: "Tear-Off Scope",
    objective: "Tell the crew exactly what to remove",
    seed: TEAR_OFF,
    words: "tear-off, shingles, deck",
    speaking: "Give the command 'Tear off everything down to the deck' and ask for confirmation.",
  },
  {
    title: "Protect the Sheathing",
    objective: "Ask workers to prevent and report deck damage",
    seed: TEAR_OFF,
    words: "sheathing, soft deck, damage",
    speaking: "Stop a worker who is about to cover a soft panel and request a repair.",
  },
  {
    title: "Debris & Old Nails",
    objective: "Coordinate debris removal and deck cleanup",
    seed: TEAR_OFF,
    words: "dumpster, old nails, sweep",
    speaking: "Assign one worker to collect shingles and another to pull old nails.",
  },
  {
    title: "Tarp the Unfinished Roof",
    objective: "Close an unfinished work area before departure",
    seed: TEAR_OFF,
    words: "tarp, unfinished section, weather",
    speaking: "Explain which section needs a tarp and have the crew repeat the plan.",
  },
  {
    title: "First-Course Layout",
    objective: "Describe the chalk line and first course",
    seed: INSTALL,
    words: "chalk line, first course, starter strip",
    speaking: "Show a new worker where to run the first-course chalk line.",
  },
  {
    title: "Joint Stagger",
    objective: "Communicate the job's stagger pattern",
    seed: INSTALL,
    words: "joint, stagger, course",
    speaking:
      "Use the guide's six-inch stagger phrase, then ask the lead to confirm the actual job specification.",
  },
  {
    title: "Drip Edge Sequence",
    objective: "Discuss edge placement with the installer",
    seed: INSTALL,
    words: "drip edge, eave, rake, underlayment",
    speaking: "Ask the installer to explain the approved drip-edge sequence for this roof.",
  },
  {
    title: "Underlayment Overlap",
    objective: "Verify the specified underlayment overlap",
    seed: INSTALL,
    words: "underlayment, overlap, fastener",
    speaking:
      "Practice the guide's six-inch overlap phrase and verify it against the selected product instructions.",
  },
  {
    title: "Valley Protection",
    objective: "Direct membrane work at a valley",
    seed: INSTALL,
    words: "valley, ice and water shield, membrane",
    speaking: "Ask the crew lead to show the valley protection before it is covered.",
  },
  {
    title: "Nailing Zone",
    objective: "Correct nails placed outside the specified zone",
    seed: INSTALL,
    words: "nailing strip, high nail, fastener",
    speaking: "Tell a worker 'Nail in the strip — not too high' and explain the correction.",
  },
  {
    title: "Fastener Pattern",
    objective: "Confirm the manufacturer's fastener count and pattern",
    seed: INSTALL,
    words: "nail pattern, shingle, manufacturer instructions",
    speaking:
      "Practice 'Four nails per shingle' as a language example, then request the actual product pattern.",
  },
  {
    title: "Avoid Overdriven Nails",
    objective: "Identify and correct overdriven fasteners",
    seed: INSTALL,
    words: "overdriven nail, shingle, nail gun",
    speaking: "Stop installation when the nail gun is burying nails and ask for an adjustment.",
  },
  {
    title: "Step Flashing",
    objective: "Coordinate sidewall flashing one course at a time",
    seed: INSTALL,
    words: "step flashing, wall, shingle course",
    speaking: "Ask the installer to describe the sidewall flashing sequence.",
  },
  {
    title: "Ridge Caps & Finish",
    objective: "Discuss ridge-cap preparation and finish work",
    seed: INSTALL,
    words: "ridge cap, starter shingle, ridge",
    speaking: "Give the guide's ridge-cap instruction and verify the chosen product's method.",
  },
  {
    title: "Tie-Off Before Access",
    objective: "Give a clear fall-protection instruction",
    seed: SAFETY,
    words: "harness, tie-off, roof anchor",
    speaking:
      "Tell the crew to tie off before roof access and ask them to point to the approved anchor.",
  },
  {
    title: "Anchor & Lifeline Check",
    objective: "Raise a concern about the anchor or lifeline",
    seed: SAFETY,
    words: "anchor, lifeline, fall distance",
    speaking: "Stop work and ask the competent person to confirm the site-specific setup.",
  },
  {
    title: "Footing & Weather",
    objective: "Warn about slippery conditions and changing weather",
    seed: SAFETY,
    words: "dew, footing, lightning",
    speaking: "Warn the crew about slick footing and bring them down when lightning approaches.",
  },
  {
    title: "Heat & Water",
    objective: "Check on crew hydration and heat symptoms",
    seed: SAFETY,
    words: "water break, heat, shade",
    speaking: "Ask a worker how they feel and direct a water break under the site heat plan.",
  },
  {
    title: "Falling Debris",
    objective: "Keep workers below clear of debris",
    seed: SAFETY,
    words: "ground crew, debris, exclusion area",
    speaking: "Tell the ground crew to move clear before tear-off resumes.",
  },
  {
    title: "Document Deck Repairs",
    objective: "Describe and record a repaired deck section",
    seed: CLOSEOUT,
    words: "repair photo, deck, covered area",
    speaking: "Ask for a photo of a deck repair before the crew covers it.",
  },
  {
    title: "Inspect Vents & Flashing",
    objective: "Check roof penetrations with the lead",
    seed: CLOSEOUT,
    words: "vent, pipe boot, flashing",
    speaking: "Walk each penetration and ask the lead what has been checked.",
  },
  {
    title: "Ground Cleanup",
    objective: "Assign gutters and site cleanup",
    seed: CLOSEOUT,
    words: "gutter, dumpster, nail, cleanup",
    speaking: "Assign a final gutter check and ground cleanup before leaving.",
  },
  {
    title: "Report Open Items",
    objective: "Hand off remaining work clearly",
    seed: CLOSEOUT,
    words: "punch list, unfinished, tomorrow",
    speaking: "Tell the crew lead what remains open and confirm tomorrow's first task.",
  },
  {
    title: "Full Roofing Day",
    objective: "Lead a complete roofing day in Spanish",
    seed: CLOSEOUT,
    words: "briefing, tear-off, install, safety, closeout",
    speaking:
      "Roleplay the day from morning brief through tear-off, installation checks, weather decision, and closeout.",
  },
];

export const ROOFING_LESSONS: Lesson[] = topics.map((topic, index) => ({
  n: index + 1,
  title: topic.title,
  objective: topic.objective,
  readingTemplate: topic.seed,
  steps: [
    r(
      `Read the ${topic.title} roofing passage. Find the words and phrases you would use on today's job.`,
      7,
    ),
    wm(`Drill and pronounce: ${topic.words}.`, 5),
    sp(topic.speaking, 8),
  ],
}));
