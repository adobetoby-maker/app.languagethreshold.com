import assert from "node:assert/strict";
import test from "node:test";
import {
  readStandardVoiceSettings,
  standardGoogleVoice,
  DEFAULT_STANDARD_VOICES,
} from "../src/data/standard-voices.ts";
const voice = (locale, name, gender) => ({
  name: `${locale}-Chirp3-HD-${name}`,
  languageCodes: [locale],
  ssmlGender: gender,
  tier: "Chirp 3 HD",
  label: name,
  naturalSampleRateHertz: 24000,
});
const voices = [
  voice("es-US", "Achernar", "FEMALE"),
  voice("es-US", "Aoede", "FEMALE"),
  voice("es-US", "Achird", "MALE"),
  voice("es-US", "Charon", "MALE"),
  voice("es-ES", "Aoede", "FEMALE"),
];
test("standard pair is curated rather than the alphabetically first Google voice", () => {
  assert.equal(standardGoogleVoice(voices, "es-CR", "woman").name, "es-US-Chirp3-HD-Aoede");
  assert.equal(standardGoogleVoice(voices, "es-CR", "man").name, "es-US-Chirp3-HD-Charon");
  assert.equal(standardGoogleVoice(voices, "es-ES", "woman").name, "es-ES-Chirp3-HD-Aoede");
});
test("a missing gender or language is unavailable instead of silently using the other gender", () => {
  assert.equal(
    standardGoogleVoice(
      voices.filter((v) => v.ssmlGender === "FEMALE"),
      "es-US",
      "man",
    ),
    null,
  );
  assert.equal(standardGoogleVoice(voices, "fr-FR", "woman"), null);
});
test("standard defaults are Google female and listening/speaking preferences are independent", () => {
  assert.deepEqual(readStandardVoiceSettings(null), DEFAULT_STANDARD_VOICES);
  assert.deepEqual(readStandardVoiceSettings({ listeningGender: "man" }), {
    listeningGender: "man",
    speakingGender: "woman",
    speakingAudioSource: "google",
  });
  assert.deepEqual(
    readStandardVoiceSettings({ speakingGender: "man", speakingAudioSource: "text" }),
    { listeningGender: "woman", speakingGender: "man", speakingAudioSource: "text" },
  );
  assert.deepEqual(
    readStandardVoiceSettings({ listeningGender: "bad", speakingAudioSource: "bad" }),
    DEFAULT_STANDARD_VOICES,
  );
});
