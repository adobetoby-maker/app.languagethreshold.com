import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVICE_DEFAULT_VOICE,
  preferredMobileCloudVoice,
  shouldAutoSelectMobileVoice,
} from "../src/data/mobile-voice.ts";

const voice = (locale, tier, name) => ({
  name,
  languageCodes: [locale],
  ssmlGender: "FEMALE",
  naturalSampleRateHertz: 24000,
  label: name,
  tier,
});

test("iPhone cloud default requires sign-in and never overrides an explicit voice", () => {
  const eligible = {
    ios: true,
    signedIn: true,
    providerReady: true,
    settingsHydrated: true,
    preference: null,
  };
  assert.equal(shouldAutoSelectMobileVoice(eligible), true);
  assert.equal(
    shouldAutoSelectMobileVoice({ ...eligible, preference: DEVICE_DEFAULT_VOICE }),
    false,
  );
  assert.equal(
    shouldAutoSelectMobileVoice({ ...eligible, preference: "google:es-US:voice" }),
    false,
  );
  assert.equal(shouldAutoSelectMobileVoice({ ...eligible, ios: false }), false);
  assert.equal(shouldAutoSelectMobileVoice({ ...eligible, signedIn: false }), false);
  assert.equal(shouldAutoSelectMobileVoice({ ...eligible, providerReady: false }), false);
  assert.equal(shouldAutoSelectMobileVoice({ ...eligible, settingsHydrated: false }), false);
});

test("iPhone recommendation chooses a high-tier Latin American voice before Spain", () => {
  const voices = [
    voice("es-ES", "Chirp 3 HD", "es-ES-Chirp3-HD-Achernar"),
    voice("es-US", "Standard", "es-US-Standard-A"),
    voice("es-US", "Chirp 3 HD", "es-US-Chirp3-HD-Achernar"),
  ];
  assert.equal(preferredMobileCloudVoice(voices, "es-CR")?.name, "es-US-Chirp3-HD-Achernar");
  assert.equal(preferredMobileCloudVoice(voices, "es-ES")?.name, "es-ES-Chirp3-HD-Achernar");
  assert.equal(
    preferredMobileCloudVoice(
      voices.filter((item) => item.tier !== "Chirp 3 HD" || item.languageCodes[0] === "es-ES"),
      "es-CR",
    )?.name,
    "es-US-Standard-A",
  );
  assert.equal(preferredMobileCloudVoice([], "es-CR"), null);
});
