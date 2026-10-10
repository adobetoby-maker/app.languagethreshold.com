import type { Language } from "@/state/app-state";

// Maps moduleId + language to an ordered array of seed IDs — Lesson 1 first.
// ModuleStudyGuide renders these as a numbered lesson list; learners can jump
// to any lesson. When no module is active the study guide shows generic content.
type LessonMap = Record<string, Partial<Record<Language, string[]>>>;

export const MODULE_LESSONS: LessonMap = {
  "lds-missionary": {
    Spanish: [
      "seed-es-lds-teaching",
      "seed-es-faith-door-greeting",
      "seed-es-faith-apartment-cleaning",
      "seed-es-faith-tithing",
      "seed-es-faith-word-of-wisdom",
      "seed-es-faith-mission-leadership-council",
    ],
    French: [
      "seed-fr-lds-teaching",
      "seed-fr-faith-scripture-explanation",
      "seed-fr-faith-priesthood-authority",
      "seed-fr-faith-weekly-planning",
      "seed-fr-faith-word-of-wisdom",
      "seed-fr-faith-mission-letter-home",
    ],
    German: [
      "seed-de-lds-teaching",
      "seed-de-faith-street-contact",
      "seed-de-faith-calling-investigators",
      "seed-de-faith-investigator-concern",
      "seed-de-faith-restoration-concerns",
      "seed-de-faith-zone-conference",
    ],
    Italian: [
      "seed-it-lds-teaching",
      "seed-it-faith-member-dinner",
      "seed-it-faith-district-meeting-charity",
      "seed-it-faith-family-history",
      "seed-it-faith-bike-maintenance",
      "seed-it-faith-atonement-exegesis",
    ],
    Japanese: [
      "seed-ja-lds-teaching",
      "seed-ja-faith-teaching-plan",
      "seed-ja-faith-companion-study",
      "seed-ja-faith-plan-of-salvation",
      "seed-ja-faith-alma-32-exegesis",
    ],
    Korean: ["seed-ko-lds-first-lesson", "seed-ko-faith-sermon-grace"],
    Portuguese: [
      "seed-pt-lds-teaching",
      "seed-pt-faith-baptismal-interview",
      "seed-pt-faith-companion-planning",
      "seed-pt-faith-less-active-members",
      "seed-pt-faith-sabbath-day",
      "seed-pt-faith-grocery-shopping",
    ],
  },

  orthopedics: {
    Spanish: ["seed-es-ortho-fracture"],
    French: ["seed-fr-ortho-joint"],
    German: ["seed-de-ortho-postop"],
    Italian: ["seed-it-ortho-ligament"],
    Japanese: ["seed-ja-ortho-cast"],
    Korean: ["seed-ko-ortho-fracture"],
    Portuguese: ["seed-pt-ortho-surgery"],
  },

  framer: {
    Spanish: ["seed-es-framer-layout"],
    French: ["seed-fr-framer-lumber"],
    German: ["seed-de-framer-studs"],
    Italian: ["seed-it-framer-beams"],
    Japanese: ["seed-ja-framer-plumb"],
    Korean: ["seed-ko-framer-studs"],
    Portuguese: ["seed-pt-framer-sheathing"],
  },

  roofing: {
    Spanish: [
      "seed-es-roofing-materials",
      "seed-es-roofing-tear-off",
      "seed-es-roofing-install",
      "seed-es-roofing-safety",
      "seed-es-roofing-closeout",
    ],
  },

  "emergency-medicine": {
    Spanish: ["seed-es-em-triage"],
    French: ["seed-fr-em-resus"],
    German: ["seed-de-em-airway"],
    Italian: ["seed-it-em-critical"],
    Japanese: ["seed-ja-em-triage"],
    Portuguese: ["seed-pt-em-shock"],
  },

  nursing: {
    Spanish: ["seed-es-nursing-sbar"],
    French: ["seed-fr-nursing-medadmin"],
    German: ["seed-de-nursing-ivwound"],
    Italian: ["seed-it-nursing-vitals"],
    Japanese: ["seed-ja-nursing-sbar"],
    Portuguese: ["seed-pt-nursing-wound"],
  },

  "restaurant-hospitality": {
    Spanish: ["seed-es-restaurant-prep"],
    French: ["seed-fr-restaurant-service", "seed-fr-hotel-checkin"],
    German: [
      "seed-de-restaurant-hospitality",
      "seed-de-restaurant-wine",
      "seed-de-hotel-complaint",
    ],
    Italian: ["seed-it-restaurant-order", "seed-it-restaurant-trattoria"],
    Japanese: ["seed-ja-restaurant-izakaya"],
    Korean: ["seed-ko-service-cafe-order"],
    Portuguese: ["seed-pt-restaurant-churrascaria"],
  },

  "construction-foreman": {
    Spanish: ["seed-es-construction-blueprint"],
    French: ["seed-fr-construction-inspection"],
    German: ["seed-de-construction-schedule"],
    Italian: ["seed-it-construction-permit"],
    Japanese: ["seed-ja-construction-crew"],
    Portuguese: ["seed-pt-construction-safety"],
  },

  "legal-immigration": {
    Spanish: ["seed-es-legal-asylum"],
    French: ["seed-fr-legal-visa"],
    German: ["seed-de-legal-petition"],
    Italian: ["seed-it-legal-green-card"],
    Japanese: ["seed-ja-legal-deportation"],
    Korean: ["seed-ko-legal-petition"],
    Portuguese: ["seed-pt-legal-uscis"],
  },

  "k12-teacher": {
    Spanish: ["seed-es-k12-iep", "seed-es-edu-grammar"],
    French: ["seed-fr-k12-field-trip", "seed-fr-edu-office-hours"],
    German: ["seed-de-k12-classroom"],
    Italian: ["seed-it-k12-lesson", "seed-it-edu-parent-teacher"],
    Japanese: ["seed-ja-k12-assignment", "seed-ja-k12-commands"],
    Korean: ["seed-ko-edu-office-hours"],
    Portuguese: ["seed-pt-k12-curriculum"],
  },

  plumber: {
    Spanish: ["seed-es-plumber-leak"],
    French: ["seed-fr-plumber-pipe"],
    German: ["seed-de-plumber-valve"],
    Italian: ["seed-it-plumber-drain"],
    Japanese: ["seed-ja-plumber-heater"],
    Korean: ["seed-ko-plumber-leak"],
    Portuguese: ["seed-pt-plumber-sewer"],
  },

  drywall: {
    Spanish: ["seed-es-drywall-mud"],
    French: ["seed-fr-drywall-taping"],
    German: ["seed-de-drywall-texture"],
    Italian: ["seed-it-drywall-corner"],
    Japanese: ["seed-ja-drywall-sand"],
    Korean: ["seed-ko-drywall-texture"],
    Portuguese: ["seed-pt-drywall-fasteners"],
  },

  electrician: {
    Spanish: ["seed-es-electrician-wiring"],
    French: ["seed-fr-electrician-circuit"],
    German: ["seed-de-electrician-panel"],
    Italian: ["seed-it-electrician-conduit"],
    Japanese: ["seed-ja-electrician-grounding"],
    Korean: ["seed-ko-trades-electrical-inspection"],
    Portuguese: ["seed-pt-electrician-outlet"],
  },

  landscaper: {
    Spanish: ["seed-es-landscaper-irrigation"],
    French: ["seed-fr-landscaper-plants"],
    German: ["seed-de-landscaper-grading"],
    Italian: ["seed-it-landscaper-mulch"],
    Japanese: ["seed-ja-landscaper-pruning"],
    Korean: ["seed-ko-landscaper-lawn"],
    Portuguese: ["seed-pt-landscaper-lawn"],
  },

  "auto-mechanic": {
    Spanish: ["seed-es-mechanic-brake"],
    French: ["seed-fr-mechanic-engine"],
    German: ["seed-de-mechanic-transmission"],
    Italian: ["seed-it-mechanic-alignment"],
    Japanese: ["seed-ja-mechanic-diagnostic"],
    Korean: ["seed-ko-trades-auto-intake"],
    Portuguese: ["seed-pt-mechanic-oilchange"],
  },

  "truck-driver": {
    Spanish: ["seed-es-truck-logbook", "seed-es-truck-pretrip"],
    French: ["seed-fr-truck-dispatch"],
    German: ["seed-de-truck-border"],
    Italian: ["seed-it-truck-loading"],
    Japanese: ["seed-ja-truck-route"],
    Korean: ["seed-ko-truck-border"],
    Portuguese: ["seed-pt-truck-cbradio", "seed-pt-truck-tarping"],
  },

  "dairy-farmer": {
    Spanish: ["seed-es-dairy-milking"],
    French: ["seed-fr-dairy-feed"],
    German: ["seed-de-dairy-herd"],
    Italian: ["seed-it-dairy-production"],
    Japanese: ["seed-ja-dairy-barn"],
    Korean: ["seed-ko-dairy-milking"],
    Portuguese: ["seed-pt-dairy-pasture"],
  },

  "ranch-cowboy": {
    Spanish: ["seed-es-ranch-roundup"],
    French: ["seed-fr-ranch-fence"],
    German: ["seed-de-ranch-cattle"],
    Italian: ["seed-it-ranch-grazing"],
    Japanese: ["seed-ja-ranch-corral"],
    Korean: ["seed-ko-ranch-cattle"],
    Portuguese: ["seed-pt-ranch-range"],
  },

  "meatpacking-butcher": {
    Spanish: ["seed-es-butcher-sanitation"],
    French: ["seed-fr-butcher-cuts"],
    German: ["seed-de-butcher-usda"],
    Italian: ["seed-it-butcher-processing"],
    Japanese: ["seed-ja-butcher-floor"],
    Korean: ["seed-ko-butcher-safety"],
    Portuguese: ["seed-pt-butcher-primal"],
  },

  "international-travel": {
    Spanish: ["seed-es-travel-hotel", "seed-es-travel-train-ticket", "seed-es-travel-lost-luggage"],
    French: ["seed-fr-travel-museum", "seed-fr-travel-tour-guide"],
    German: [
      "seed-de-travel-airport",
      "seed-de-travel-hostel-checkin",
      "seed-de-travel-border-crossing",
    ],
    Italian: ["seed-it-travel-transport"],
    Japanese: ["seed-ja-travel-japan"],
    Korean: ["seed-ko-travel-pharmacy"],
    Portuguese: ["seed-pt-travel-airport"],
  },

  "family-medicine": {
    Spanish: ["seed-es-family-med-diabetes"],
    French: ["seed-fr-family-med-wellness"],
    German: ["seed-de-family-med-intake"],
    Italian: ["seed-it-family-med-hypertension"],
    Japanese: ["seed-ja-family-med-referral"],
    Korean: ["seed-ko-medical-htn-dm-followup"],
    Portuguese: ["seed-pt-family-med-prescription"],
  },

  "ob-gyn": {
    Spanish: ["seed-es-ob-gyn-ultrasound"],
    French: ["seed-fr-ob-gyn-postpartum"],
    German: ["seed-de-ob-gyn-gestational-dm"],
    Italian: ["seed-it-ob-gyn-contraception"],
    Japanese: ["seed-ja-ob-gyn-labor"],
    Korean: ["seed-ko-ob-gyn-prenatal"],
    Portuguese: ["seed-pt-ob-gyn-genetics"],
  },

  "pain-management": {
    Spanish: ["seed-es-pain-nerveblock"],
    French: ["seed-fr-pain-chronic"],
    German: ["seed-de-pain-opioid"],
    Italian: ["seed-it-pain-analgesic"],
    Japanese: ["seed-ja-pain-scs"],
    Korean: ["seed-ko-pain-history"],
    Portuguese: ["seed-pt-pain-clinic"],
  },

  cardiology: {
    Spanish: ["seed-es-cardiology-stress-test"],
    French: ["seed-fr-cardiology-heart-failure"],
    German: ["seed-de-cardiology-ecg"],
    Italian: ["seed-it-cardiology-cholesterol"],
    Japanese: ["seed-ja-cardiology-angina"],
    Korean: ["seed-ko-medical-htn-dm-followup"],
    Portuguese: ["seed-pt-cardiology-bp"],
  },

  "general-surgery": {
    Spanish: ["seed-es-general-surgery-cholecystectomy"],
    French: ["seed-fr-general-surgery-postop"],
    German: ["seed-de-general-surgery-or-briefing"],
    Italian: ["seed-it-general-surgery-appendectomy"],
    Japanese: ["seed-ja-general-surgery-anesthesia"],
    Korean: ["seed-ko-surgery-appendectomy"],
    Portuguese: ["seed-pt-general-surgery-hernia"],
  },

  soccer: {
    Spanish: ["seed-es-soccer-match", "seed-es-soccer-broadcast", "seed-es-soccer-nutrition"],
    French: ["seed-fr-soccer-match", "seed-fr-soccer-youth-coaching", "seed-fr-soccer-nutrition"],
    German: ["seed-de-soccer-match", "seed-de-soccer-nutrition"],
    Italian: ["seed-it-soccer-match", "seed-it-soccer-referee", "seed-it-soccer-nutrition"],
    Japanese: ["seed-ja-soccer-match", "seed-ja-soccer-nutrition"],
    Korean: ["seed-ko-soccer-match"],
    Portuguese: ["seed-pt-soccer-match", "seed-pt-soccer-trainer", "seed-pt-soccer-nutrition"],
  },

  hockey: {
    Spanish: ["seed-es-hockey-rink", "seed-es-hockey-nutrition"],
    French: ["seed-fr-hockey-rink", "seed-fr-hockey-nutrition"],
    German: ["seed-de-hockey-rink", "seed-de-hockey-nutrition"],
    Italian: ["seed-it-hockey-rink", "seed-it-hockey-nutrition"],
    Japanese: ["seed-ja-hockey-rink", "seed-ja-hockey-nutrition"],
    Korean: ["seed-ko-hockey-rink"],
    Portuguese: ["seed-pt-hockey-rink", "seed-pt-hockey-nutrition"],
  },

  baseball: {
    Spanish: ["seed-es-baseball-dugout", "seed-es-baseball-nutrition"],
    French: ["seed-fr-baseball-dugout", "seed-fr-baseball-nutrition"],
    German: ["seed-de-baseball-dugout", "seed-de-baseball-nutrition"],
    Italian: ["seed-it-baseball-dugout", "seed-it-baseball-nutrition"],
    Japanese: ["seed-ja-baseball-dugout", "seed-ja-baseball-press", "seed-ja-baseball-nutrition"],
    Korean: ["seed-ko-sports-kbo-postgame"],
    Portuguese: ["seed-pt-baseball-dugout", "seed-pt-baseball-nutrition"],
  },

  tennis: {
    Spanish: ["seed-es-tennis-court", "seed-es-tennis-nutrition"],
    French: ["seed-fr-tennis-court", "seed-fr-tennis-nutrition"],
    German: ["seed-de-tennis-court", "seed-de-tennis-nutrition"],
    Italian: ["seed-it-tennis-court", "seed-it-tennis-nutrition"],
    Japanese: ["seed-ja-tennis-court", "seed-ja-tennis-nutrition"],
    Korean: ["seed-ko-tennis-court"],
    Portuguese: ["seed-pt-tennis-court", "seed-pt-tennis-nutrition"],
  },

  bowling: {
    Spanish: ["seed-es-bowling-lane", "seed-es-bowling-nutrition"],
    French: ["seed-fr-bowling-lane", "seed-fr-bowling-nutrition"],
    German: ["seed-de-bowling-lane", "seed-de-bowling-nutrition"],
    Italian: ["seed-it-bowling-lane", "seed-it-bowling-nutrition"],
    Japanese: ["seed-ja-bowling-lane", "seed-ja-bowling-nutrition"],
    Korean: ["seed-ko-bowling-lane"],
    Portuguese: ["seed-pt-bowling-lane", "seed-pt-bowling-nutrition"],
  },

  "american-football": {
    Spanish: ["seed-es-football-play", "seed-es-american-football-nutrition"],
    French: ["seed-fr-football-play", "seed-fr-american-football-nutrition"],
    German: ["seed-de-football-play", "seed-de-american-football-nutrition"],
    Italian: ["seed-it-football-play", "seed-it-american-football-nutrition"],
    Japanese: ["seed-ja-football-play", "seed-ja-american-football-nutrition"],
    Korean: ["seed-ko-football-play"],
    Portuguese: ["seed-pt-football-play", "seed-pt-american-football-nutrition"],
  },

  lacrosse: {
    Spanish: ["seed-es-lacrosse-field", "seed-es-lacrosse-nutrition"],
    French: ["seed-fr-lacrosse-field", "seed-fr-lacrosse-nutrition"],
    German: ["seed-de-lacrosse-field", "seed-de-lacrosse-nutrition"],
    Italian: ["seed-it-lacrosse-field", "seed-it-lacrosse-nutrition"],
    Japanese: ["seed-ja-lacrosse-field", "seed-ja-lacrosse-nutrition"],
    Korean: ["seed-ko-lacrosse-field"],
    Portuguese: ["seed-pt-lacrosse-field", "seed-pt-lacrosse-nutrition"],
  },

  rugby: {
    Spanish: ["seed-es-rugby-pitch", "seed-es-rugby-nutrition"],
    French: ["seed-fr-rugby-pitch", "seed-fr-rugby-nutrition"],
    German: ["seed-de-rugby-pitch", "seed-de-rugby-nutrition"],
    Italian: ["seed-it-rugby-pitch", "seed-it-rugby-nutrition"],
    Japanese: ["seed-ja-rugby-pitch", "seed-ja-rugby-nutrition"],
    Korean: ["seed-ko-rugby-pitch"],
    Portuguese: ["seed-pt-rugby-pitch", "seed-pt-rugby-nutrition"],
  },

  "sports-hobbies": {
    Spanish: ["seed-es-hobbies-gym", "seed-es-sports-hobbies-nutrition"],
    French: [
      "seed-fr-hobbies-gym",
      "seed-fr-sports-hiking-trail",
      "seed-fr-sports-hobbies-nutrition",
    ],
    German: ["seed-de-hobbies-gym", "seed-de-sports-hobbies-nutrition"],
    Italian: [
      "seed-it-hobbies-gym",
      "seed-it-sports-bike-rental",
      "seed-it-sports-hobbies-nutrition",
    ],
    Japanese: [
      "seed-ja-hobbies-gym",
      "seed-ja-sports-cycling-gear",
      "seed-ja-sports-hobbies-nutrition",
    ],
    Korean: ["seed-ko-sports-taekwondo-warmup", "seed-ko-sports-kbo-postgame"],
    Portuguese: [
      "seed-pt-hobbies-gym",
      "seed-pt-sports-surf-briefing",
      "seed-pt-sports-camping-setup",
      "seed-pt-sports-hobbies-nutrition",
    ],
  },

  "physical-therapy": {
    Spanish: ["seed-es-physical-therapy-exercises"],
    French: ["seed-fr-physical-therapy-rehab"],
    German: ["seed-de-physical-therapy-strength"],
    Italian: ["seed-it-physical-therapy-mobility"],
    Japanese: ["seed-ja-physical-therapy-homeprogram"],
    Korean: ["seed-ko-physical-therapy-postop"],
    Portuguese: ["seed-pt-physical-therapy-balance"],
  },

  "medical-receptionist": {
    Spanish: ["seed-es-medical-receptionist-scheduling"],
    French: ["seed-fr-medical-receptionist-intake"],
    German: ["seed-de-medical-receptionist-insurance"],
    Italian: ["seed-it-medical-receptionist-checkin"],
    Japanese: ["seed-ja-medical-receptionist-registration"],
    Korean: ["seed-ko-medical-receptionist-desk"],
    Portuguese: ["seed-pt-medical-receptionist-clinic"],
  },

  "social-work": {
    Spanish: ["seed-es-social-work-discharge"],
    French: ["seed-fr-social-work-benefits"],
    German: ["seed-de-social-work-housing"],
    Italian: ["seed-it-social-work-mentalhealth"],
    Japanese: ["seed-ja-social-work-elderly"],
    Korean: ["seed-ko-social-work-discharge"],
    Portuguese: ["seed-pt-social-work-community"],
  },

  "construction-safety": {
    Spanish: ["seed-es-construction-safety-ppe"],
    French: ["seed-fr-construction-safety-fallprotection"],
    German: ["seed-de-construction-safety-lockout"],
    Italian: ["seed-it-construction-safety-toolbox"],
    Japanese: ["seed-ja-construction-safety-site"],
    Korean: ["seed-ko-construction-safety-site"],
    Portuguese: ["seed-pt-construction-safety-osha"],
  },

  "catholic-ministry": {
    Spanish: ["seed-es-catholic-mass"],
    French: ["seed-fr-catholic-mass"],
    German: ["seed-de-catholic-mass"],
    Italian: ["seed-it-catholic-mass"],
    Japanese: ["seed-ja-catholic-mass"],
    Portuguese: ["seed-pt-catholic-mass"],
  },

  "rock-climbing": {
    Spanish: [
      "seed-es-climbing-gear",
      "seed-es-climbing-commands",
      "seed-es-climbing-knots",
      "seed-es-climbing-movement",
      "seed-es-climbing-safety",
      "seed-es-climbing-medical",
      "seed-es-climbing-travel",
    ],
    Portuguese: [
      "seed-pt-climbing-gear",
      "seed-pt-climbing-commands",
      "seed-pt-climbing-knots",
      "seed-pt-climbing-movement",
      "seed-pt-climbing-safety",
      "seed-pt-climbing-medical",
      "seed-pt-climbing-travel",
    ],
    French: [
      "seed-fr-climbing-gear",
      "seed-fr-climbing-commands",
      "seed-fr-climbing-knots",
      "seed-fr-climbing-movement",
      "seed-fr-climbing-safety",
      "seed-fr-climbing-medical",
      "seed-fr-climbing-travel",
    ],
    German: [
      "seed-de-climbing-gear",
      "seed-de-climbing-commands",
      "seed-de-climbing-knots",
      "seed-de-climbing-movement",
      "seed-de-climbing-safety",
      "seed-de-climbing-medical",
      "seed-de-climbing-travel",
    ],
    Italian: [
      "seed-it-climbing-gear",
      "seed-it-climbing-commands",
      "seed-it-climbing-knots",
      "seed-it-climbing-movement",
      "seed-it-climbing-safety",
      "seed-it-climbing-medical",
      "seed-it-climbing-travel",
    ],
    Japanese: [
      "seed-ja-climbing-gear",
      "seed-ja-climbing-commands",
      "seed-ja-climbing-movement",
      "seed-ja-climbing-safety",
      "seed-ja-climbing-medical",
    ],
    Korean: [
      "seed-ko-climbing-gear",
      "seed-ko-climbing-commands",
      "seed-ko-climbing-movement",
      "seed-ko-climbing-safety",
    ],
  },
};

export function getLessons(moduleId: string, language: Language): string[] {
  return MODULE_LESSONS[moduleId]?.[language] ?? [];
}

export function getStarterSeedId(moduleId: string, language: Language): string | null {
  return MODULE_LESSONS[moduleId]?.[language]?.[0] ?? null;
}
