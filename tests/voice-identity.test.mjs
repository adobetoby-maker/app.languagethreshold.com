// Built by TAC — 2026-10-22
import assert from "node:assert/strict";
import test from "node:test";
import {
  deviceVoiceGender,
  deviceVoiceIdentity,
  formatVoiceLabel,
  friendlyVoiceName,
  genderSwitchState,
  googleVoiceIdentity,
  pickVoiceByGender,
  voiceAccent,
} from "../src/data/voice-identity.ts";

const google = (locale, suffix, ssmlGender, model = "Chirp3-HD") => ({
  name: `${locale}-${model}-${suffix}`,
  languageCodes: [locale],
  ssmlGender,
  naturalSampleRateHertz: 24000,
  tier: "Chirp 3 HD",
  label: `${model} · ${suffix}`,
});

const device = (name, lang) => deviceVoiceIdentity({ name, lang, voiceURI: `uri:${name}` });

test("voice label shows name and accent, with a short region-code form", () => {
  const label = formatVoiceLabel({
    id: "uri:Lucía",
    kind: "device",
    rawName: "Lucía",
    locale: "es-MX",
    gender: "woman",
  });
  assert.equal(label.long, "Lucía · Mexico");
  assert.equal(label.short, "Lucía · MX");
  assert.equal(label.aria, "Voice: Lucía, Mexican Spanish, woman. Change voice");
});

test("accents come from the locale region with the named overrides", () => {
  assert.deepEqual(
    ["es-MX", "es-ES", "es-US", "en-US", "en-GB"].map((locale) => voiceAccent(locale).accent),
    ["Mexico", "Spain", "US Spanish", "US", "UK"],
  );
  assert.deepEqual(
    ["es-MX", "es-ES", "es-US", "en-GB", "es-419"].map((locale) => voiceAccent(locale).accentShort),
    ["MX", "ES", "US", "UK", "LatAm"],
  );
  assert.equal(voiceAccent("es-US").accentSpoken, "US Spanish");
  assert.equal(voiceAccent("en-GB").accentSpoken, "British English");
  assert.equal(voiceAccent("es_mx").accent, "Mexico");
  assert.equal(voiceAccent("ja").accentShort, "JA");
});

test("raw Google voice IDs become friendly names and are never shown", () => {
  const letter = googleVoiceIdentity(google("es-MX", "A", "FEMALE", "Neural2"));
  const label = formatVoiceLabel(letter);
  assert.equal(label.long, "Woman A · Mexico");
  assert.equal(label.short, "Woman A · MX");
  assert.ok(!label.long.includes("Neural2") && !label.aria.includes("es-MX-"));

  assert.equal(
    formatVoiceLabel(googleVoiceIdentity(google("es-US", "Aoede", "FEMALE"))).long,
    "Aoede · US Spanish",
  );
  assert.equal(
    friendlyVoiceName({ kind: "google", rawName: "es-US-Polyglot-1", gender: "man" }),
    "Man 1",
  );
  assert.equal(
    friendlyVoiceName({ kind: "device", rawName: "es-ES-Standard-B", gender: null }),
    "Voice B",
  );
  // A Google preference whose catalog entry has not loaded yet: no gender, still no ID.
  assert.equal(
    friendlyVoiceName({ kind: "google", rawName: "es-US-Neural2-C", gender: null }),
    "Voice C",
  );
});

test("device names drop vendor and locale noise, and fall back when not a name", () => {
  assert.equal(
    friendlyVoiceName({
      kind: "device",
      rawName: "Microsoft Sabina - Spanish (Mexico)",
      gender: "woman",
    }),
    "Sabina",
  );
  assert.equal(
    friendlyVoiceName({ kind: "device", rawName: "Jorge (Enhanced)", gender: "man" }),
    "Jorge",
  );
  assert.equal(
    friendlyVoiceName({
      kind: "device",
      rawName: "Google español de Estados Unidos",
      gender: null,
    }),
    "Google voice",
  );
  assert.equal(friendlyVoiceName({ kind: "device", rawName: "español", gender: "woman" }), "Woman");
  assert.equal(
    friendlyVoiceName({ kind: "device", rawName: "voz natural", gender: null }),
    "Device voice",
  );
  assert.equal(deviceVoiceGender("Paulina"), "woman");
  assert.equal(deviceVoiceGender("Microsoft Raul - Spanish (Mexico)"), "man");
  assert.equal(deviceVoiceGender("Google UK English Female"), "woman");
  assert.equal(deviceVoiceGender("Google UK English Male"), "man");
  assert.equal(deviceVoiceGender("Google español"), null);
});

test("woman/man pick prefers the current voice's locale, then its kind, then list order", () => {
  const catalog = [
    googleVoiceIdentity(google("es-US", "Achernar", "FEMALE")),
    googleVoiceIdentity(google("es-US", "Achird", "MALE")),
    googleVoiceIdentity(google("es-ES", "Aoede", "FEMALE")),
    googleVoiceIdentity(google("es-ES", "Charon", "MALE")),
    device("Paulina", "es-MX"),
    device("Juan", "es-MX"),
  ];
  // Current: Spain woman → Spain man, not the first-ranked US man.
  assert.equal(pickVoiceByGender(catalog, "man", catalog[2])?.rawName, "es-ES-Chirp3-HD-Charon");
  // Current: Mexican device woman → Mexican device man.
  assert.equal(pickVoiceByGender(catalog, "man", catalog[4])?.rawName, "Juan");
  // No locale match → existing preferred order (US first), same kind first.
  const colombian = { locale: "es-CO", kind: "google" };
  assert.equal(pickVoiceByGender(catalog, "woman", colombian)?.rawName, "es-US-Chirp3-HD-Achernar");
  assert.equal(
    pickVoiceByGender(catalog, "man", { locale: "es-CO", kind: "device" })?.rawName,
    "Juan",
  );
  assert.equal(pickVoiceByGender(catalog, "man", null)?.rawName, "es-US-Chirp3-HD-Achird");
});

test("switch state presses the current gender and falls back to the only gender available", () => {
  const paulina = device("Paulina", "es-MX");
  const juan = device("Juan", "es-MX");
  const both = genderSwitchState([paulina, juan], paulina);
  assert.equal(both.selected, "woman");
  assert.equal(both.woman?.rawName, "Paulina");
  assert.equal(both.man?.rawName, "Juan");

  const onlyWomen = genderSwitchState([paulina, device("Google español", "es-ES")], null);
  assert.equal(onlyWomen.selected, "woman");
  assert.equal(onlyWomen.man, null);

  const unknownCurrent = device("Google español", "es-ES");
  const onlyMen = genderSwitchState([juan, unknownCurrent], unknownCurrent);
  assert.equal(onlyMen.selected, "man");
  assert.equal(onlyMen.woman, null);

  assert.deepEqual(genderSwitchState([], null), { woman: null, man: null, selected: null });
});
