import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeGoogleVoicePreference,
  defaultGoogleVoice,
  encodeGoogleVoicePreference,
  isMissionTtsSpeed,
  MISSION_TTS_SPEEDS,
  MISSION_TTS_SUPPORTED_LANGUAGES,
} from "../src/data/mission-tts.ts";
import {
  CORE_VERBS,
  DAILY_LIVING_TOPICS,
  RELATIONSHIPS_INTIMACY_TOPICS,
} from "../src/data/core-speaking.ts";
import {
  findSpeakingMission,
  getAllSpeakingMissions,
  getCoreGrammarPatterns,
  getSpeakingMissions,
  getSpeakingModules,
  SPEAKING_LANGUAGES,
} from "../src/data/speaking-missions.ts";
import {
  TRAVEL_ZONE_CURRICULA,
  TRAVEL_ZONE_MODULE_IDS,
  TRAVEL_ZONE_MODULES,
} from "../src/data/travel-zone.ts";
import { MODULES } from "../src/data/modules.ts";

const SPEAKING_MISSIONS = getAllSpeakingMissions();

const APPROVED_SCENARIO_VERSION_IDS = [
  "scenario_version_construction_safety_briefing_es_v1",
  "scenario_version_construction_materials_measurement_es_v1",
  "scenario_version_construction_hazard_report_es_v1",
  "scenario_version_missionary_return_appointment_es_v1",
  "scenario_version_missionary_restoration_question_es_v1",
  "scenario_version_missionary_church_ride_es_v1",
];

test("speaking preview preserves the six reviewed immutable scenarios", () => {
  assert.deepEqual(
    SPEAKING_MISSIONS.filter((mission) => APPROVED_SCENARIO_VERSION_IDS.includes(mission.id)).map(
      (mission) => mission.id,
    ),
    APPROVED_SCENARIO_VERSION_IDS,
  );
});

test("core speaking covers essential verbs, grammar patterns, and daily living", () => {
  assert.equal(CORE_VERBS.length, 50);
  assert.equal(new Set(CORE_VERBS.map((verb) => verb.id)).size, CORE_VERBS.length);
  assert.equal(DAILY_LIVING_TOPICS.length, 53);
  assert.equal(
    new Set(DAILY_LIVING_TOPICS.map((topic) => topic.id)).size,
    DAILY_LIVING_TOPICS.length,
  );
  assert.equal(RELATIONSHIPS_INTIMACY_TOPICS.length, 8);
  assert.equal(
    new Set(RELATIONSHIPS_INTIMACY_TOPICS.map((topic) => topic.id)).size,
    RELATIONSHIPS_INTIMACY_TOPICS.length,
  );
  for (const requiredTopic of [
    "answer-phone",
    "make-appointment",
    "reschedule",
    "cancel",
    "confirm-appointment",
  ]) {
    assert.ok(
      DAILY_LIVING_TOPICS.some((topic) => topic.id === requiredTopic),
      requiredTopic,
    );
  }

  for (const { language } of SPEAKING_LANGUAGES) {
    assert.ok(
      language === "English"
        ? CORE_VERBS.every((verb) => verb.english.length > 0)
        : CORE_VERBS.every((verb) => verb.target[language].length > 0),
    );
    const grammarPatterns = getCoreGrammarPatterns(language);
    assert.ok(grammarPatterns.length >= 30, `${language} has broad core grammar coverage`);
    assert.equal(
      new Set(grammarPatterns.map((pattern) => pattern.id)).size,
      grammarPatterns.length,
      `${language} grammar IDs are unique`,
    );
    const core = getSpeakingMissions(language).filter(
      (mission) => mission.moduleId === "core-speaking",
    );
    assert.equal(
      core.filter((mission) => mission.coreSection === "Essential verbs").length,
      CORE_VERBS.length,
    );
    assert.equal(
      core.filter((mission) => mission.coreSection === "Grammar patterns").length,
      grammarPatterns.length,
    );
    assert.equal(
      core.filter((mission) => mission.coreSection === "Daily living").length,
      DAILY_LIVING_TOPICS.length,
    );
    const relationshipMissions = core.filter(
      (mission) => mission.coreSection === "Relationships & intimacy",
    );
    assert.equal(relationshipMissions.length, RELATIONSHIPS_INTIMACY_TOPICS.length);
    assert.ok(relationshipMissions.every((mission) => mission.riskClass === "intimacy"));
    assert.ok(
      relationshipMissions.every(
        (mission) =>
          mission.safetyRules.some((rule) => rule.includes("Consent must be freely given")) &&
          mission.safetyRules.some((rule) => rule.includes("Never sexualize anyone under 18")),
      ),
    );
  }
});

test("speaking preview covers every authored topic in Spanish, Italian, Japanese, and English", () => {
  const expected = {
    Spanish: { modules: 57, challenges: 361, lessons: 1420, curated: 6, core: 141, total: 1928 },
    Italian: { modules: 56, challenges: 354, lessons: 1410, curated: 0, core: 141, total: 1905 },
    Japanese: { modules: 56, challenges: 354, lessons: 1410, curated: 0, core: 144, total: 1908 },
    English: { modules: 58, challenges: 364, lessons: 1470, curated: 0, core: 141, total: 1975 },
  };

  assert.deepEqual(
    SPEAKING_LANGUAGES.map((entry) => entry.language),
    ["Spanish", "Italian", "Japanese", "English"],
  );
  for (const { language, locale } of SPEAKING_LANGUAGES) {
    const modules = getSpeakingModules(language);
    const missions = getSpeakingMissions(language);
    const challenges = missions.filter((mission) => mission.id.includes("_challenge_"));
    const lessons = missions.filter((mission) => mission.id.includes("_lesson_"));
    const curated = missions.filter((mission) =>
      APPROVED_SCENARIO_VERSION_IDS.includes(mission.id),
    );
    const core = missions.filter((mission) => mission.moduleId === "core-speaking");
    assert.equal(modules.length, expected[language].modules, `${language} modules`);
    assert.equal(challenges.length, expected[language].challenges, `${language} challenges`);
    assert.equal(lessons.length, expected[language].lessons, `${language} lessons`);
    assert.equal(curated.length, expected[language].curated, `${language} curated`);
    assert.equal(core.length, expected[language].core, `${language} core`);
    assert.equal(missions.length, expected[language].total, `${language} total`);
    assert.ok(
      missions.every((mission) => mission.locale === locale),
      `${language} locale`,
    );

    assert.equal(modules[0].id, "core-speaking", `${language} core is first`);
    for (const module of modules.filter((module) => module.id !== "core-speaking")) {
      const sourceModule = MODULES.find((candidate) => candidate.id === module.id);
      assert.ok(sourceModule, `${language}/${module.id} source module`);
      assert.equal(
        challenges.filter((mission) => mission.moduleId === module.id).length,
        sourceModule.challengePrompts.length,
        `${language}/${module.id} challenges`,
      );
      assert.ok(
        lessons.some((mission) => mission.moduleId === module.id),
        `${language}/${module.id} lessons`,
      );
    }
  }

  assert.equal(SPEAKING_MISSIONS.length, 7716);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.id)).size, 7716);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.scenarioId)).size, 7716);
  assert.ok(
    !SPEAKING_MISSIONS.some(
      (mission) =>
        mission.language !== "English" && ["or-evs", "fmg"].includes(mission.moduleId),
    ),
  );
  assert.ok(
    ["or-evs", "fmg"].every((moduleId) =>
      getSpeakingMissions("English").some((mission) => mission.moduleId === moduleId),
    ),
  );

  const englishFromSpanish = getSpeakingModules("English", "Spanish").map(
    (module) => module.id,
  );
  const englishFromItalian = getSpeakingModules("English", "Italian").map(
    (module) => module.id,
  );
  const englishFromPortuguese = getSpeakingModules("English", "Portuguese").map(
    (module) => module.id,
  );
  assert.ok(englishFromSpanish.includes("or-evs"));
  assert.ok(englishFromSpanish.includes("fmg"));
  assert.ok(!englishFromItalian.includes("or-evs"));
  assert.ok(!englishFromItalian.includes("fmg"));
  assert.ok(!englishFromPortuguese.includes("or-evs"));
  assert.ok(englishFromPortuguese.includes("fmg"));
});

test("Travel is a large daily-interaction zone with the Rome gaps covered", () => {
  assert.equal(TRAVEL_ZONE_MODULES.length, 16);
  assert.equal(TRAVEL_ZONE_MODULE_IDS.length, 16);
  assert.equal(new Set(TRAVEL_ZONE_MODULE_IDS).size, 16);
  assert.ok(TRAVEL_ZONE_MODULES.every((module) => module.category === "Travel"));
  assert.ok(TRAVEL_ZONE_MODULES.every((module) => module.challengePrompts.length === 8));

  for (const requiredModule of [
    "travel-breakfast",
    "travel-lunch",
    "travel-dinner",
    "travel-shopping-essentials",
    "travel-scooter-car-rental",
    "travel-roadside-mechanics",
    "travel-guides-attractions",
    "travel-airport-luggage",
    "travel-pharmacy-health",
    "travel-social-dating",
  ]) {
    assert.ok(TRAVEL_ZONE_MODULE_IDS.includes(requiredModule), requiredModule);
  }

  const authoredContent = JSON.stringify(TRAVEL_ZONE_CURRICULA);
  for (const requiredRomeUseCase of [
    "Vespa",
    "socks",
    "underwear",
    "headache",
    "tell my children",
    "Ask someone to dinner",
    "lost luggage",
  ]) {
    assert.ok(authoredContent.includes(requiredRomeUseCase), requiredRomeUseCase);
  }

  for (const module of TRAVEL_ZONE_MODULES) {
    const curriculum = TRAVEL_ZONE_CURRICULA[module.id];
    assert.ok(curriculum, `${module.id} curriculum`);
    assert.equal(curriculum.lessons.length, 15, `${module.id} lesson count`);
    assert.deepEqual(
      curriculum.lessons.map((lesson) => lesson.n),
      Array.from({ length: 15 }, (_, index) => index + 1),
      `${module.id} lesson order`,
    );
  }

  for (const { language } of SPEAKING_LANGUAGES) {
    const languageMissions = getSpeakingMissions(language);
    const travelMissions = languageMissions.filter((mission) => mission.specialty === "Travel");
    assert.equal(travelMissions.length, 404, `${language} Travel mission count`);
    const nonTravelCounts = Object.groupBy(
      languageMissions.filter((mission) => mission.specialty !== "Travel"),
      (mission) => mission.specialty,
    );
    assert.ok(
      Object.values(nonTravelCounts).every((missions) => (missions?.length ?? 0) < 404),
      `${language} Travel is the largest speaking zone`,
    );
    for (const moduleId of TRAVEL_ZONE_MODULE_IDS) {
      const moduleMissions = travelMissions.filter((mission) => mission.moduleId === moduleId);
      assert.equal(moduleMissions.length, 23, `${language}/${moduleId} mission count`);
      assert.equal(
        new Set(moduleMissions.map((mission) => mission.openingLine)).size,
        1,
        `${language}/${moduleId} localized opening`,
      );
    }
    assert.ok(
      travelMissions
        .filter((mission) => mission.moduleId === "travel-pharmacy-health")
        .every((mission) => mission.riskClass === "medical"),
    );
    assert.ok(
      travelMissions
        .filter((mission) => mission.moduleId === "travel-social-dating")
        .every((mission) => mission.riskClass === "intimacy"),
    );
    assert.ok(
      travelMissions
        .filter((mission) => mission.moduleId === "travel-problems-services")
        .every((mission) => mission.riskClass === "legal"),
    );
  }
});

test("each speaking mission has complete UX-preview metadata", () => {
  for (const mission of SPEAKING_MISSIONS) {
    assert.equal(mission.version, 1);
    assert.ok(["Spanish", "Italian", "Japanese", "English"].includes(mission.language));
    assert.ok(["es-419", "it-IT", "ja-JP", "en-US"].includes(mission.locale));
    assert.ok(mission.title.length > 0);
    assert.ok(mission.moduleId.length > 0);
    assert.ok(mission.moduleName.length > 0);
    assert.ok(mission.moduleEmoji.length > 0);
    assert.ok(mission.openingLine.length > 0);
    assert.ok(mission.vocabulary.length > 0);
    assert.equal(mission.objectives.length, 3);
    assert.ok(mission.objectives.some((objective) => objective.critical));
    assert.equal(
      new Set(mission.objectives.map((objective) => objective.id)).size,
      mission.objectives.length,
    );
  }
});

test("mission lookup fails closed for unknown versions", () => {
  const approved = SPEAKING_MISSIONS[0];
  assert.equal(findSpeakingMission(approved.id), approved);
  assert.equal(findSpeakingMission("scenario_version_unknown_es_v1"), null);
});

test("Google TTS supports every published learner language", () => {
  assert.deepEqual(MISSION_TTS_SUPPORTED_LANGUAGES, [
    "Spanish",
    "French",
    "German",
    "Italian",
    "Japanese",
    "Korean",
    "Portuguese",
    "Pashto",
    "English",
  ]);
});

test("Google voice preferences round-trip and gender defaults stay aligned", () => {
  const voices = [
    {
      name: "it-IT-Chirp3-HD-Achernar",
      languageCodes: ["it-IT"],
      ssmlGender: "FEMALE",
      naturalSampleRateHertz: 24000,
      tier: "Chirp 3 HD",
      label: "Chirp 3 HD · Achernar · woman",
    },
    {
      name: "it-IT-Chirp3-HD-Achird",
      languageCodes: ["it-IT"],
      ssmlGender: "MALE",
      naturalSampleRateHertz: 24000,
      tier: "Chirp 3 HD",
      label: "Chirp 3 HD · Achird · man",
    },
  ];
  const encoded = encodeGoogleVoicePreference(voices[0]);
  assert.deepEqual(decodeGoogleVoicePreference(encoded), {
    languageCode: "it-IT",
    voiceName: "it-IT-Chirp3-HD-Achernar",
  });
  assert.equal(defaultGoogleVoice(voices, "it-IT", "woman")?.ssmlGender, "FEMALE");
  assert.equal(defaultGoogleVoice(voices, "it-IT", "man")?.ssmlGender, "MALE");
});

test("high-stakes daily missions carry explicit runtime policy", () => {
  for (const topicId of [
    "doctor-visit",
    "pharmacy",
    "emergency",
    "bank-atm",
    "school-childcare",
    "nonemergency-police",
    "customs",
  ]) {
    const topic = DAILY_LIVING_TOPICS.find((candidate) => candidate.id === topicId);
    assert.ok(topic?.riskClass, `${topicId} has a risk class`);
    for (const { language } of SPEAKING_LANGUAGES) {
      const mission = getSpeakingMissions(language).find((candidate) =>
        candidate.id.includes(`core_daily_${topicId}_`),
      );
      assert.equal(mission?.riskClass, topic.riskClass, `${language}/${topicId} risk class`);
      assert.ok(mission?.safetyRules.length >= 3, `${language}/${topicId} has extra safety rules`);
    }
  }
});

test("high-stakes lessons inside general Travel modules receive scenario-level policy", () => {
  for (const language of ["Spanish", "Italian", "Japanese", "English"]) {
    const missions = getSpeakingMissions(language);
    const medicalEmergency = missions.find(
      (mission) =>
        mission.moduleId === "international-travel" &&
        mission.title.includes("Medical Emergency While Traveling"),
    );
    const border = missions.find(
      (mission) =>
        mission.moduleId === "international-travel" && mission.title.includes("Visa & Border"),
    );
    assert.equal(medicalEmergency?.riskClass, "emergency", `${language} emergency risk`);
    assert.ok(
      medicalEmergency?.safetyRules.some((rule) => rule.includes("not an emergency service")),
      `${language} emergency rule`,
    );
    assert.equal(border?.riskClass, "legal", `${language} border risk`);
  }
});

test("mission TTS accepts only the published ear-training speeds", () => {
  assert.deepEqual(MISSION_TTS_SPEEDS, [0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5]);
  for (const speed of MISSION_TTS_SPEEDS) assert.equal(isMissionTtsSpeed(speed), true);
  for (const unsupported of [0.25, 0.7, 0.9, 2]) {
    assert.equal(isMissionTtsSpeed(unsupported), false);
  }
});
