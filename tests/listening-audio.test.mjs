import assert from "node:assert/strict";
import test from "node:test";
import {
  hdListeningSupported,
  listeningIssueCopy,
  listeningIssueReason,
  listeningNowUsing,
  listeningStatus,
  planListening,
  rememberedHdVoice,
} from "../src/lib/listening-audio.ts";
import { encodeGoogleVoicePreference } from "../src/data/mission-tts.ts";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";

const hd = (locale, name) =>
  encodeGoogleVoicePreference({ name: `${locale}-Chirp3-HD-${name}`, languageCodes: [locale] });
const base = {
  locale: "es-CR",
  source: "hd",
  gender: "woman",
  voiceURI: hd("es-US", "Aoede"),
  signedIn: true,
  deviceFallback: false,
};

test("HD chosen and available: the HD voice, recordings in the chosen gender, never a device voice", () => {
  assert.deepEqual(planListening(base), {
    mode: "hd",
    voiceURI: hd("es-US", "Aoede"),
    recordedGender: "female",
    strict: true,
    pending: null,
  });
  const man = planListening({ ...base, gender: "man", voiceURI: hd("es-US", "Charon") });
  assert.equal(man.recordedGender, "male");
  assert.equal(man.voiceURI, hd("es-US", "Charon"));
  assert.equal(man.strict, true);
});

test("HD chosen but no cloud voice: recordings still play and a miss is reported, not replaced", () => {
  const resolving = planListening({ ...base, voiceURI: null });
  assert.equal(resolving.mode, "hd");
  assert.equal(resolving.strict, true);
  assert.equal(resolving.pending, "loading");
  assert.equal(resolving.recordedGender, "female");
  const down = planListening({ ...base, voiceURI: DEVICE_DEFAULT_VOICE });
  assert.equal(down.strict, true);
  assert.equal(down.pending, "unavailable");
  // A cloud voice for another language is not this language's HD voice.
  const other = planListening({ ...base, voiceURI: hd("fr-FR", "Aoede") });
  assert.equal(other.pending, "unavailable");
  assert.equal(other.voiceURI, DEVICE_DEFAULT_VOICE);
});

test("the device voice fills in only after the learner allows it, and HD is still tried first", () => {
  const allowed = planListening({ ...base, deviceFallback: true });
  assert.equal(allowed.mode, "hd");
  assert.equal(allowed.strict, false);
  assert.equal(allowed.voiceURI, hd("es-US", "Aoede"));
  assert.equal(allowed.recordedGender, "female");
});

test("an explicit Device voice choice never routes to a cloud voice or a recording", () => {
  const device = planListening({ ...base, source: "device" });
  assert.deepEqual(device, {
    mode: "device",
    voiceURI: DEVICE_DEFAULT_VOICE,
    recordedGender: null,
    strict: false,
    pending: null,
  });
  // An installed voice the learner picked is kept as-is.
  assert.equal(
    planListening({ ...base, source: "device", voiceURI: "com.apple.voice.Paulina" }).voiceURI,
    "com.apple.voice.Paulina",
  );
});

test("signed out: HD still means HD. Recordings need no account; a miss asks instead of swapping voices", () => {
  const guest = planListening({ ...base, signedIn: false, voiceURI: DEVICE_DEFAULT_VOICE });
  assert.equal(guest.mode, "recordings");
  assert.equal(guest.recordedGender, "female", "public recordings play without an account");
  assert.equal(guest.strict, true, "no device voice stands in for a missing recording");
  assert.equal(guest.pending, "sign-in", "and the miss says what would make it HD");
  // Even a stale cloud preference is never used without an account.
  assert.equal(planListening({ ...base, signedIn: false }).voiceURI, DEVICE_DEFAULT_VOICE);
  // The device voice fills in only once the signed-out learner has said so...
  const allowed = planListening({ ...base, signedIn: false, deviceFallback: true });
  assert.equal(allowed.strict, false);
  assert.equal(allowed.recordedGender, "female", "recordings are still preferred");
  // ...or chose Device voice outright.
  const device = planListening({ ...base, signedIn: false, source: "device" });
  assert.equal(device.mode, "device");
  assert.equal(device.strict, false);
});

test("the HD choice covers the language being learned; other-language text keeps the device voice", () => {
  const learning = { ...base, learningLocale: "es-CR" };
  // The learner's own accents are all covered.
  assert.equal(planListening({ ...learning, locale: "es-MX" }).mode, "hd");
  // A native-language card back while learning Spanish: device voice, real account state, no
  // borrowed Spanish cloud voice, and nothing to report.
  for (const signedIn of [true, false]) {
    const back = planListening({ ...learning, locale: "en-US", signedIn });
    assert.deepEqual(back, {
      mode: "device",
      voiceURI: DEVICE_DEFAULT_VOICE,
      recordedGender: null,
      strict: false,
      pending: null,
    });
  }
});

test("languages without an HD voice read with the device voice and are never called HD", () => {
  for (const locale of ["zh-CN", "ps-AF"]) {
    assert.equal(hdListeningSupported(locale), false);
    const plan = planListening({ ...base, locale, voiceURI: DEVICE_DEFAULT_VOICE });
    assert.equal(plan.mode, "device");
    assert.equal(plan.strict, false);
    assert.equal(plan.recordedGender, null);
  }
  for (const locale of ["es-MX", "fr-CA", "de-DE", "it-IT", "ja-JP", "ko-KR", "pt-BR", "en-GB"])
    assert.equal(hdListeningSupported(locale), true);
});

test("a failed HD request is classified by what actually happened", () => {
  const reason = (input) =>
    listeningIssueReason({ status: null, online: true, signedIn: true, ...input });
  assert.equal(reason({ signedIn: false }), "sign-in");
  assert.equal(reason({ status: 401 }), "sign-in");
  assert.equal(reason({ status: 403 }), "sign-in");
  assert.equal(reason({ needsSignIn: true }), "sign-in");
  assert.equal(reason({ online: false }), "offline");
  assert.equal(reason({ network: true }), "offline");
  assert.equal(reason({ status: 429 }), "busy");
  assert.equal(reason({ status: 503 }), "unavailable");
  assert.equal(reason({ status: 502 }), "unavailable");
  assert.equal(reason({}), "unavailable");
});

test("learner-facing wording names no provider or model and never calls a device voice HD", () => {
  const texts = [];
  for (const reason of ["loading", "sign-in", "offline", "busy", "unavailable"]) {
    const copy = listeningIssueCopy(reason);
    assert.ok(copy.title && copy.description);
    texts.push(copy.title, copy.description);
  }
  const states = [
    { mounted: false, signedIn: false, cloudReady: false, hdSupported: true },
    { mounted: true, signedIn: false, cloudReady: false, hdSupported: true },
    { mounted: true, signedIn: true, cloudReady: false, hdSupported: true },
    { mounted: true, signedIn: true, cloudReady: true, hdSupported: true },
    { mounted: true, signedIn: true, cloudReady: false, hdSupported: false },
  ];
  for (const state of states) texts.push(listeningStatus({ ...state, language: "Chinese" }));
  const plans = [
    planListening(base),
    planListening({ ...base, deviceFallback: true }),
    planListening({ ...base, voiceURI: DEVICE_DEFAULT_VOICE }),
    planListening({ ...base, source: "device" }),
    planListening({ ...base, signedIn: false }),
  ];
  for (const plan of plans) texts.push(listeningNowUsing(plan, "woman"));
  for (const text of texts)
    assert.doesNotMatch(text, /google|chirp|gemini|eleven|neural|wavenet|speechsynthesis/i, text);

  assert.match(listeningStatus(states[1]), /^Sign in/);
  assert.match(listeningStatus(states[1]), /Recorded HD audio plays without an account/);
  assert.match(listeningStatus(states[1]), /asked before this device’s voice is used/);
  assert.match(listeningStatus({ ...states[3], language: "Spanish" }), /^HD voices are ready/);
  assert.match(listeningStatus({ ...states[4], language: "Chinese" }), /not available for Chinese/);
  // What is reading aloud is stated for what it is.
  assert.match(listeningNowUsing(plans[0], "woman"), /^Now reading with the HD voice \(female\)/);
  assert.match(listeningNowUsing(planListening({ ...base, gender: "man" }), "man"), /\(male\)/);
  assert.match(listeningNowUsing(plans[1], "woman"), /device’s voice is filling in for now/);
  assert.match(listeningNowUsing(plans[3], "woman"), /^Now reading with this device’s voice/);
  assert.doesNotMatch(listeningNowUsing(plans[3], "woman"), /HD voice \(/);
  // Signed out: recordings only, and the device voice is named only once it is really in use.
  assert.match(listeningNowUsing(plans[4], "woman"), /^Now reading with recorded HD audio \(female\)\./);
  assert.match(listeningNowUsing(plans[4], "woman"), /never swapped for a different voice/);
  const guestFillIn = planListening({ ...base, signedIn: false, deviceFallback: true });
  assert.match(listeningNowUsing(guestFillIn, "woman"), /device’s voice is filling in for now, as you chose/);
});

test("a remembered HD voice is reused only for the same language, accent and gender", () => {
  const voiceURI = hd("es-US", "Aoede");
  const saved = { hdVoiceByLang: { Spanish: { accent: "es-CR", gender: "woman", voiceURI } } };
  assert.equal(rememberedHdVoice(saved, "Spanish", "es-CR", "woman"), voiceURI);
  assert.equal(rememberedHdVoice(saved, "Spanish", "es-MX", "woman"), null);
  assert.equal(rememberedHdVoice(saved, "Spanish", "es-CR", "man"), null);
  assert.equal(rememberedHdVoice(saved, "French", "es-CR", "woman"), null);
  for (const bad of [null, {}, { hdVoiceByLang: null }, { hdVoiceByLang: { Spanish: null } }])
    assert.equal(rememberedHdVoice(bad, "Spanish", "es-CR", "woman"), null);
  // Only a real cloud preference qualifies; a device voice is never remembered as HD.
  const device = {
    hdVoiceByLang: {
      Spanish: { accent: "es-CR", gender: "woman", voiceURI: DEVICE_DEFAULT_VOICE },
    },
  };
  assert.equal(rememberedHdVoice(device, "Spanish", "es-CR", "woman"), null);
});
