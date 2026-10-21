import assert from "node:assert/strict";
import test from "node:test";
import { MASTER_ROOFING_LESSONS } from "../src/data/master-roofing-curriculum.ts";
import {
  decodeGoogleVoicePreference,
  defaultGoogleVoice,
  encodeGoogleVoicePreference,
  googleVoicesForLocale,
  isMissionTtsSpeed,
  MISSION_TTS_SPEEDS,
  MISSION_TTS_SUPPORTED_LANGUAGES,
  recommendedGoogleVoices,
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
  speakingCatalogModuleId,
  speakingCatalogTitle,
  speakingStageName,
} from "../src/data/speaking-missions.ts";
import {
  TRAVEL_ZONE_CURRICULA,
  TRAVEL_ZONE_MODULE_IDS,
  TRAVEL_ZONE_MODULES,
} from "../src/data/travel-zone.ts";
import { MODULES } from "../src/data/modules.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";

// Data-driven Core 60 stages (src/data/core60/manifest.ts) each add, in their entry's language,
// their challenges (the stage's own catalog overrides) and one Say it mission per lesson. A stage is
// not a module card of its own in the Speak tab catalog: its missions are listed under the base
// module (speakingCatalogModuleId), so a stage adds no module. Computed from the
// manifest, so publishing a trade with scripts/build-core60.mts keeps these counts right.
function generatedStageCounts(language) {
  const out = { challenges: 0, lessons: 0 };
  for (const entry of CORE60_MANIFEST) {
    if (entry.language !== language) continue;
    for (const stage of ["foundation", "master"]) {
      if (!entry[stage]) continue;
      const id = `${stage}-${entry.base}`;
      out.challenges += MODULES.find((m) => m.id === id)?.challengePrompts.length ?? 0;
      out.lessons += getCurriculum(id)?.lessons.length ?? 0;
    }
  }
  return out;
}
const withGenerated = (language, counts) => {
  const gen = generatedStageCounts(language);
  return {
    ...counts,
    modules: counts.modules,
    challenges: counts.challenges + gen.challenges,
    lessons: counts.lessons + gen.lessons,
    total: counts.total + gen.challenges + gen.lessons,
  };
};
/** Foundation and Master stage modules (roofing's hand-written ones and generated ones). */
const isStageModule = (moduleId) => /^(foundation|master)-/.test(moduleId);

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

test("speaking preview covers every authored topic in every speaking language", () => {
  // Keep each language's expected total aligned with its authored modules.
  // Roofing adds one Spanish module, six challenges, and 30 lessons. The Roofing Foundation adds
  // five challenges and 10 lessons, the Roofing Master six challenges and one Say it mission per
  // Master lesson (20 once its content lands); neither is a module card of its own (they are listed
  // under Roofing), so the module counts are the base modules only. The sixteen travel zones (15→30)
  // add 240 lesson plans in every language and Sport Fishing (10→30) another 20 in Spanish, its only
  // speaking language: one Say it mission per plan, even before generated content exists for them.
  const master = MASTER_ROOFING_LESSONS.length;
  const expected = {
    Spanish: withGenerated("Spanish", {
      modules: 58,
      challenges: 378,
      lessons: 1720 + master,
      curated: 6,
      core: 141,
      total: 2239 + 6 + master,
    }),
    Italian: { modules: 56, challenges: 354, lessons: 1650, curated: 0, core: 141, total: 2145 },
    Japanese: { modules: 56, challenges: 354, lessons: 1650, curated: 0, core: 144, total: 2148 },
    Chinese: { modules: 56, challenges: 354, lessons: 1650, curated: 0, core: 141, total: 2151 },
    English: withGenerated("English", { modules: 58, challenges: 364, lessons: 1710, curated: 0, core: 141, total: 2215 }),
  };

  assert.deepEqual(
    SPEAKING_LANGUAGES.map((entry) => entry.language),
    ["Spanish", "Italian", "Japanese", "Chinese", "English"],
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

    // A Foundation or Master is never a module card: its missions are listed under the base module.
    assert.ok(
      !modules.some((module) => isStageModule(module.id)),
      `${language} lists no stage module card`,
    );
    const cardIds = new Set(modules.map((module) => module.id));
    for (const mission of missions.filter((mission) => isStageModule(mission.moduleId))) {
      assert.ok(
        cardIds.has(speakingCatalogModuleId(mission.moduleId)),
        `${language}/${mission.id} is listed under its base module`,
      );
    }
  }

  const generated = ["Spanish", "English"]
    .map(generatedStageCounts)
    .reduce((sum, gen) => sum + gen.challenges + gen.lessons, 0);
  // 1,220 of these are the travel (240 × 5 languages) and Spanish Sport Fishing (20) lesson-plan expansions.
  const allMissions = 10898 + 6 + master + generated;
  assert.equal(SPEAKING_MISSIONS.length, allMissions);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.id)).size, allMissions);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.scenarioId)).size, allMissions);
  assert.ok(
    !SPEAKING_MISSIONS.some(
      (mission) => mission.language !== "English" && ["or-evs", "fmg"].includes(mission.moduleId),
    ),
  );
  assert.ok(
    ["or-evs", "fmg"].every((moduleId) =>
      getSpeakingMissions("English").some((mission) => mission.moduleId === moduleId),
    ),
  );

  const englishFromSpanish = getSpeakingModules("English", "Spanish").map((module) => module.id);
  const englishFromItalian = getSpeakingModules("English", "Italian").map((module) => module.id);
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
    assert.equal(curriculum.lessons.length, 30, `${module.id} lesson count`);
    assert.deepEqual(
      curriculum.lessons.map((lesson) => lesson.n),
      Array.from({ length: 30 }, (_, index) => index + 1),
      `${module.id} lesson order`,
    );
    // Lesson 15 is a mid-module consolidation; only Lesson 30 is the zone's threshold capstone.
    assert.deepEqual(
      curriculum.lessons.flatMap((lesson) => (/threshold/i.test(lesson.title) ? [lesson.n] : [])),
      [30],
      `${module.id} threshold is the final lesson`,
    );
    assert.equal(
      new Set(curriculum.lessons.map((lesson) => lesson.title.toLowerCase())).size,
      30,
      `${module.id} lesson titles are distinct`,
    );
  }

  for (const { language } of SPEAKING_LANGUAGES) {
    const languageMissions = getSpeakingMissions(language);
    const travelMissions = languageMissions.filter((mission) => mission.specialty === "Travel");
    assert.equal(travelMissions.length, 644, `${language} Travel mission count`);
    // Stage missions (Foundation / Master) belong to their base module's trade, not a zone of
    // their own, so they do not count toward a zone's size here.
    const nonTravelCounts = Object.groupBy(
      languageMissions.filter((mission) => mission.specialty !== "Travel" && !isStageModule(mission.moduleId)),
      (mission) => mission.specialty,
    );
    assert.ok(
      Object.values(nonTravelCounts).every((missions) => (missions?.length ?? 0) < 644),
      `${language} Travel is the largest speaking zone`,
    );
    for (const moduleId of TRAVEL_ZONE_MODULE_IDS) {
      const moduleMissions = travelMissions.filter((mission) => mission.moduleId === moduleId);
      assert.equal(moduleMissions.length, 38, `${language}/${moduleId} mission count`);
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
    assert.ok(["Spanish", "Italian", "Japanese", "Chinese", "English"].includes(mission.language));
    assert.ok(["es-419", "it-IT", "ja-JP", "zh-CN", "en-US"].includes(mission.locale));
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

test("Google voice choices prefer the destination locale and stay short", () => {
  const voice = (locale, suffix, ssmlGender) => ({
    name: `${locale}-Chirp3-HD-${suffix}`,
    languageCodes: [locale],
    ssmlGender,
    naturalSampleRateHertz: 24000,
    tier: "Chirp 3 HD",
    label: `Chirp 3 HD · ${suffix}`,
  });
  const voices = [
    voice("en-US", "USWoman", "FEMALE"),
    voice("en-GB", "GBWoman1", "FEMALE"),
    voice("en-GB", "GBWoman2", "FEMALE"),
    voice("en-GB", "GBMan", "MALE"),
    voice("en-AU", "AUWoman", "FEMALE"),
  ];

  assert.deepEqual(
    googleVoicesForLocale(voices, "en-GB").map((candidate) => candidate.name),
    ["en-GB-Chirp3-HD-GBMan", "en-GB-Chirp3-HD-GBWoman1", "en-GB-Chirp3-HD-GBWoman2"],
  );
  assert.deepEqual(
    recommendedGoogleVoices(voices, "en-GB", "woman", 2).map((candidate) => candidate.name),
    ["en-GB-Chirp3-HD-GBWoman1", "en-GB-Chirp3-HD-GBWoman2"],
  );
  assert.equal(googleVoicesForLocale(voices, "en-IE").length, voices.length);
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

test("Foundation and Master missions are catalogued under their base module, labelled by stage", () => {
  assert.equal(speakingCatalogModuleId("foundation-roofing"), "roofing");
  assert.equal(speakingCatalogModuleId("master-electrician"), "electrician");
  assert.equal(speakingCatalogModuleId("roofing"), "roofing");
  assert.equal(speakingCatalogModuleId("core-speaking"), "core-speaking");
  assert.equal(speakingStageName("foundation-roofing"), "Foundation");
  assert.equal(speakingStageName("master-electrician"), "Master");
  assert.equal(speakingStageName("electrician"), null);

  const modules = getSpeakingModules("Spanish").map((module) => module.id);
  assert.ok(modules.includes("roofing"));
  assert.ok(!modules.includes("foundation-roofing") && !modules.includes("master-roofing"));

  const missions = getSpeakingMissions("Spanish");
  // The mission itself keeps its stage module id (lesson practice and /api/speak key off it)...
  const foundationLesson = missions.find((m) => m.id.includes("foundation-roofing_lesson_1_"));
  assert.ok(foundationLesson);
  assert.equal(foundationLesson.moduleId, "foundation-roofing");
  // ...and the catalog lists it under Roofing with its stage in front of the title.
  assert.equal(speakingCatalogModuleId(foundationLesson.moduleId), "roofing");
  assert.equal(speakingCatalogTitle(foundationLesson), `Foundation · ${foundationLesson.title}`);
  const masterChallenge = missions.find(
    (m) => m.moduleId === "master-roofing" && m.id.includes("_challenge_1_"),
  );
  assert.ok(masterChallenge);
  assert.equal(speakingCatalogTitle(masterChallenge), `Master · ${masterChallenge.title}`);
  // A Core 30 mission's title is not changed.
  const core30 = missions.find((m) => m.moduleId === "roofing" && m.id.includes("_lesson_1_"));
  assert.equal(speakingCatalogTitle(core30), core30.title);

  // Every manifest stage is listed under its base module, in the entry's language only.
  for (const entry of CORE60_MANIFEST) {
    for (const stage of ["foundation", "master"]) {
      if (!entry[stage]) continue;
      const underBase = missions.filter(
        (m) => speakingCatalogModuleId(m.moduleId) === entry.base && m.moduleId === `${stage}-${entry.base}`,
      );
      const inLanguage = entry.language === "Spanish";
      assert.equal(underBase.length > 0, inLanguage, `${stage}-${entry.base} Spanish missions`);
      assert.equal(
        getSpeakingMissions("Italian").filter((m) => m.moduleId === `${stage}-${entry.base}`).length,
        0,
      );
    }
  }
});
