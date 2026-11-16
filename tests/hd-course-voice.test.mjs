import test from "node:test";
import assert from "node:assert/strict";
import { hdCourseVoice } from "../src/lib/hd-course-voice.ts";
import {
  decodeGoogleVoicePreference,
  encodeGoogleVoicePreference,
} from "../src/data/mission-tts.ts";
test("HD-only courses choose compatible HD audio without overwriting saved preferences", () => {
  for (const [locale, code] of [
    ["es-CR", "es-US"],
    ["en-US", "en-US"],
  ])
    for (const preference of [null, "device:default", "browser-voice"]) {
      const picked = decodeGoogleVoicePreference(hdCourseVoice(locale, preference));
      assert.equal(picked.languageCode, code);
      assert.match(picked.voiceName, /-Chirp3-HD-/);
    }
  const male = encodeGoogleVoicePreference({
    name: "es-US-Chirp3-HD-Charon",
    languageCodes: ["es-US"],
  });
  assert.equal(hdCourseVoice("es-MX", male), male);
  assert.notEqual(hdCourseVoice("en-US", male), male);
});

test("HD-only Spanish playback never substitutes an older model-unverified native recording", async () => {
  const { readFileSync } = await import("node:fs");
  const { recordedSpanishHdPath, recordedSpanishPath } =
    await import("../src/lib/recorded-spanish.ts");
  const native = JSON.parse(readFileSync("src/data/native-v3-recordings.json", "utf8"));
  const hd = JSON.parse(readFileSync("src/data/spanish-next-recordings.json", "utf8"));
  const text = Object.keys(native.entries).find(
    (t) => native.entries[t].female && !hd.entries[t]?.female,
  );
  assert(text, "requires an older native-only clip to exercise the fallback boundary");
  assert(recordedSpanishPath(text, "es-US-Chirp3-HD-Aoede", "es-US"));
  assert.equal(recordedSpanishHdPath(text, "es-US-Chirp3-HD-Aoede", "es-US"), null);
  const hdText = Object.keys(hd.entries).find((t) => hd.entries[t].female);
  assert(recordedSpanishHdPath(hdText, "es-US-Chirp3-HD-Aoede", "es-US"));
});
