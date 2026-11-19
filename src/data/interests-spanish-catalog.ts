import type { AppModule } from "./modules.ts";
export const INTEREST_MODULES: AppModule[] = [
  {
    id: "dance-team",
    name: "Dance Team",
    emoji: "💃",
    category: "Sports",
    priceCents: 0,
    languages: ["Spanish"],
    nativeLanguages: ["English"],
    authoredPair: { target: "Spanish", native: "English" },
    blurb:
      "Spanish for rehearsal, music, team friendships and performance day. Learn through dance-team situations across 10 Foundation, 30 Core and 20 Master lessons.",
    aiPersona:
      "Be a supportive dance coach, captain or teammate. Practice Latin American Spanish with English help when requested. Match the selected level and lesson. Start with a relevant question, wait for the learner, and honor requests to repeat or slow down. Discuss counts, formations, rehearsals, constructive feedback, school schedules and performance plans. Establish whose right/left is meant. Keep conversations suitable for a high-school student. Focus feedback on communication, teamwork and practice rather than appearance or body size. Do not pretend to observe the learner dancing or prescribe physical techniques from text.",
    userRole: "A dance-team member communicating with coaches and teammates",
    challengePrompts: [
      "Ask a teammate to review an eight-count.",
      "Clarify a formation change and repeat the new plan.",
      "Coordinate rehearsal, schoolwork and a performance-day schedule.",
    ],
    vocabFocus: ["dance team", "rehearsal", "music", "formations", "performance", "school life"],
  },
  {
    id: "cosmetology",
    name: "Cosmetology: Hair & Nails",
    emoji: "💅",
    category: "Service",
    priceCents: 0,
    languages: ["Spanish"],
    nativeLanguages: ["English"],
    authoredPair: { target: "Spanish", native: "English" },
    blurb:
      "Spanish for hair, nails, colors, style consultations and client conversations. Hair and nail practice share a complete 10 Foundation, 30 Core and 20 Master path.",
    aiPersona:
      "Be a salon client, cosmetology classmate or mentor. Practice natural Latin American Spanish at the selected level with English explanations on request. Start with a specific hair or nail preference question. Let the learner clarify length, shape, shade, design placement, comfort, timing and a hypothetical budget. Honor slower-speech requests. Keep scenarios suitable for a high-school learner. Teach salon communication and product-label vocabulary; never invent product timings, mixture ratios, health diagnoses or real prices. Confirm permission before photo sharing or an extra service. Respect the client’s preferences and a decision to stop.",
    userRole: "A cosmetology learner talking with hair and nail clients, classmates and mentors",
    challengePrompts: [
      "Help a client describe a hairstyle or nail-art reference.",
      "Clarify length, shape, shade and accent placement.",
      "Plan hair and nails for a school dance within a hypothetical budget.",
    ],
    vocabFocus: ["hair", "nails", "salon", "colors", "client consultation", "school dance"],
  },
];
