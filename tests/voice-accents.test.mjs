import assert from "node:assert/strict";
import test from "node:test";
import { googleVoicesForLocale, spanishVoiceLocaleRank } from "../src/data/mission-tts.ts";

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
