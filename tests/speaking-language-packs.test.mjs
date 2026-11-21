import assert from "node:assert/strict";
import test from "node:test";
import {
  isSpeakingMissionLanguageEnabled,
  speakingAwaitsReview,
} from "../src/lib/speaking-review.ts";
import { lessonWordForm, lessonWordPair } from "../src/lib/speaking-lesson-words.ts";
import { conversationGoogleVoice } from "../src/lib/conversation-voice.ts";
import { speakingPreparationPhrases } from "../src/lib/speaking-preparation.ts";
import { SPEAKING_LANGUAGES, getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { isSupportedGoogleTtsLocale } from "../src/data/mission-tts.ts";
import { getPack } from "../src/data/language-packs/registry.ts";

test("the speaking gate reads the pack and one review flag named from it", () => {
  assert.equal(isSpeakingMissionLanguageEnabled("Spanish", {}), true);
  assert.equal(isSpeakingMissionLanguageEnabled("es", {}), true);
  assert.equal(isSpeakingMissionLanguageEnabled("Japanese", {}), false);
  assert.equal(isSpeakingMissionLanguageEnabled("Japanese", { JAPANESE_SPEAKING_REVIEWED: "true" }), true);
  assert.equal(isSpeakingMissionLanguageEnabled("Japanese", { VITE_JAPANESE_SPEAKING_REVIEWED: "true" }), true);
  assert.equal(speakingAwaitsReview(getPack("ja"), {}), true);
  assert.equal(speakingAwaitsReview(getPack("es"), {}), false);
  assert.equal(isSpeakingMissionLanguageEnabled("Swahili", {}), false);
});

test("mission languages come from the registry and keep their pack's variety tag as locale", () => {
  assert.deepEqual(
    SPEAKING_LANGUAGES.map((entry) => [entry.code, entry.locale]),
    [["es", "es-419"], ["it", "it-IT"], ["ja", "ja-JP"], ["zh", "zh-CN"], ["en", "en-US"]],
  );
  assert.equal(getSpeakingMissions("Spanish")[0].locale.startsWith("es"), true);
});

test("lesson words give a form only to a language that has a column", () => {
  const word = { es: "el techo", en: "the roof", kind: "term" };
  const regular = {};
  assert.equal(lessonWordForm(regular, "Spanish", word), "el techo");
  assert.equal(lessonWordForm(regular, "English", word), "the roof");
  assert.equal(lessonWordForm(regular, "French", word), null);
  assert.equal(lessonWordForm(regular, "Japanese", word), null);
  const spanishPair = { authoredPair: { target: "Spanish", native: "English" } };
  assert.equal(lessonWordForm(spanishPair, "Italian", word), null);
  assert.deepEqual(lessonWordPair("Spanish", word), { target: "el techo", meaning: "the roof" });
  assert.equal(lessonWordPair("French", word), null);
});

test("preparation uses catalog lines for a language the lesson words do not cover", () => {
  const mission = { language: "French", moduleId: "nope", openingLine: "Bonjour.", sourceObjectiveId: undefined };
  assert.deepEqual(speakingPreparationPhrases(mission), [{ target: "Bonjour.", meaning: "" }]);
  assert.deepEqual(speakingPreparationPhrases(mission, [{ target: "le toit", native: "the roof" }]), [
    { target: "le toit", meaning: "the roof" },
  ]);
});

test("the partner voice name comes from the pack, not a Spanish rule", () => {
  const voice = (locale, name, gender) => ({
    name: `${locale}-Chirp3-HD-${name}`,
    languageCodes: [locale],
    ssmlGender: gender,
    naturalSampleRateHertz: 24000,
    label: name,
    tier: "Chirp 3 HD",
  });
  const catalog = [
    voice("es-ES", "Charon", "MALE"),
    voice("es-US", "Charon", "MALE"),
    voice("ja-JP", "Charon", "MALE"),
  ];
  assert.equal(conversationGoogleVoice(catalog, "es-CR", "man").name, "es-US-Chirp3-HD-Charon");
  assert.equal(conversationGoogleVoice(catalog, "ja-JP", "man").name, "ja-JP-Chirp3-HD-Charon");
});

test("cloud voices are served for every registered pack's language", () => {
  for (const locale of ["es-MX", "zh-CN", "ps-AF", "ja-JP"]) assert.equal(isSupportedGoogleTtsLocale(locale), true);
  assert.equal(isSupportedGoogleTtsLocale("sw-TZ"), false);
});
