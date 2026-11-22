import assert from "node:assert/strict";
import test from "node:test";
import {
  googleVoicesForLocale,
  packForVoiceLocale,
  voiceLocaleRank,
} from "../src/data/mission-tts.ts";

const spanishVoiceLocaleRank = (locale) => voiceLocaleRank(locale, packForVoiceLocale(locale));

const voice = (locale, name) => ({
  name: `${locale}-Chirp3-HD-${name}`,
  languageCodes: [locale],
  ssmlGender: "FEMALE",
  naturalSampleRateHertz: 24000,
  label: name,
  tier: "Chirp 3 HD",
});

test("Spanish fallback favors Costa Rica, Mexico, and Latin America before Spain", () => {
  assert.ok(spanishVoiceLocaleRank("es-CR") < spanishVoiceLocaleRank("es-MX"));
  assert.ok(spanishVoiceLocaleRank("es-MX") < spanishVoiceLocaleRank("es-CO"));
  assert.ok(spanishVoiceLocaleRank("es-CO") < spanishVoiceLocaleRank("es-US"));
  assert.ok(spanishVoiceLocaleRank("es-US") < spanishVoiceLocaleRank("es-ES"));

  const catalog = [voice("es-ES", "Spain"), voice("es-US", "US"), voice("es-MX", "Mexico")];
  assert.deepEqual(
    googleVoicesForLocale(catalog, "es-CR").map((candidate) => candidate.languageCodes[0]),
    ["es-MX", "es-US", "es-ES"],
  );
  assert.equal(googleVoicesForLocale(catalog, "es-ES")[0].languageCodes[0], "es-ES");
});

test("accent fallback follows each pack's accent order, not a Spanish table", async () => {
  const { voiceLocaleRank, packForVoiceLocale } = await import("../src/data/mission-tts.ts");
  const catalog = [voice("fr-CA", "Quebec"), voice("fr-FR", "France")];
  // French lists fr-FR first: with no exact voice for fr-BE the order is France, then Quebec.
  assert.deepEqual(
    googleVoicesForLocale(catalog, "fr-BE").map((candidate) => candidate.languageCodes[0]),
    ["fr-FR", "fr-CA"],
  );
  assert.ok(voiceLocaleRank("fr-FR", packForVoiceLocale("fr-FR")) < voiceLocaleRank("fr-CA", packForVoiceLocale("fr-CA")));
});
