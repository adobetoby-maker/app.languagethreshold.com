/** Published topic overlap, not equivalent standalone courses or tested learner outcomes. */
export const comparisonSources = {
  duolingo: "https://blog.duolingo.com/how-long-does-it-take-to-learn-spanish-french/",
  clinicalingo: "https://clinicalingo.com/practice/",
  canopy: "https://cdn2.hubspot.net/hubfs/5953582/Canopy_Learn_Medical_Spanish_Syllabus.pdf",
};
export const medicalOverlap: Record<string, { clinicalingo: string; canopy: string }> = {
  nursing: { clinicalingo: "29 shared clinical scenarios", canopy: "36 shared medical lessons" },
  orthopedics: {
    clinicalingo: "3 related scenarios: injury, hip fracture, postoperative counseling",
    canopy: "2 related lessons: minor injuries, major trauma",
  },
  "ob-gyn": {
    clinicalingo: "3 related scenarios: pregnancy bleeding, postpartum bleeding, epidural consent",
    canopy: "4 related lessons: contraception, obstetrics, women’s cancers, infant care",
  },
  "pain-management": {
    clinicalingo: "2 related scenarios: chest-pain assessment, opioid counseling",
    canopy: "2 related lessons: pain, headaches",
  },
  "family-medicine": {
    clinicalingo: "29 shared clinical scenarios",
    canopy: "36 shared medical lessons",
  },
  "emergency-medicine": {
    clinicalingo: "Emergency encounters in the 29-scenario library",
    canopy: "Related trauma, cardiac, stroke and seizure lessons",
  },
  cardiology: {
    clinicalingo: "Chest-pain, stroke and catheterization scenarios",
    canopy: "2 cardiology lessons, plus stroke",
  },
  "general-surgery": {
    clinicalingo: "Procedural consent and postoperative counseling scenarios",
    canopy: "Surgery, discharge and related lessons",
  },
  "physical-therapy": {
    clinicalingo: "Related injury and postoperative encounters",
    canopy: "Related injury and trauma lessons",
  },
  "medical-receptionist": {
    clinicalingo: "Related intake conversation",
    canopy: "Patient-greeting lesson",
  },
  "social-work": {
    clinicalingo: "Related mental-health and family conversations",
    canopy: "Mental-health, elder-care and palliative-care topics",
  },
  "medical-mission-logistics": {
    clinicalingo: "Clinical encounters; no logistics course listed",
    canopy: "Medical course; no logistics course listed",
  },
};
export const recommendations = [
  {
    id: "daily",
    goal: "Daily conversations in a specific job",
    product: "Language Threshold",
    reason:
      "Choose your role, follow its lesson sequence, then rehearse the conversation out loud.",
    href: "#try-a-lesson",
  },
  {
    id: "ce",
    goal: "Medical Spanish with continuing-education credit",
    product: "CanopyLearn",
    reason: "Its 2026 syllabus pairs a three-level medical course with CE/CME credit.",
    href: comparisonSources.canopy,
  },
  {
    id: "encounter",
    goal: "A quick clinical encounter to try now",
    product: "ClinicaLingo",
    reason: "Its public catalog offers 29 free patient scenarios without an account.",
    href: comparisonSources.clinicalingo,
  },
  {
    id: "general",
    goal: "A broad general-Spanish course through B2",
    product: "Duolingo",
    reason: "Its published Spanish progression follows general communication skills through B2.",
    href: comparisonSources.duolingo,
  },
];
