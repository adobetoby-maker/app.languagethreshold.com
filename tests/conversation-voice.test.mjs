import assert from "node:assert/strict";
import test from "node:test";
import { conversationGoogleVoice } from "../src/lib/conversation-voice.ts";
const voice = (name, gender = "FEMALE", locale = "es-US") => ({
  name,
  ssmlGender: gender,
  languageCodes: [locale],
  naturalSampleRateHertz: 24000,
  label: name,
  tier: name.includes("Chirp3") ? "Chirp 3 HD" : "Standard",
});
test("conversation uses the V3 Chirp 3 HD pair even when a cheaper exact-accent voice exists", () => {
  const female = voice("es-US-Chirp3-HD-Aoede"),
    male = voice("es-US-Chirp3-HD-Charon", "MALE");
  const voices = [voice("es-CR-Standard-A", "FEMALE", "es-CR"), female, male];
  assert.equal(conversationGoogleVoice(voices, "es-CR", "woman"), female);
  assert.equal(conversationGoogleVoice(voices, "es-CR", "man"), male);
  assert.equal(conversationGoogleVoice([voices[0]], "es-CR", "woman"), null);
  assert.equal(conversationGoogleVoice([female], "es-CR", "man"), null);
  assert.equal(conversationGoogleVoice([female], "fr-FR", "woman"), null);
});
