import assert from "node:assert/strict";
import test from "node:test";
import {
  criticalSpeakingObjectivesAddressed,
  validSpeakingObjectiveIds,
} from "../src/lib/speaking-mission-progress.ts";
import { bestAvailableSpeechTranscript } from "../src/lib/speaking-transcript.ts";

const objectives = [
  { id: "greet", critical: true },
  { id: "ask-price", critical: true },
  { id: "say-thanks", critical: false },
];

test("mission progress accepts only unique objective IDs from the immutable mission", () => {
  assert.deepEqual(
    validSpeakingObjectiveIds(objectives, ["ask-price", "unknown", "ask-price", "greet"]),
    ["ask-price", "greet"],
  );
  assert.deepEqual(validSpeakingObjectiveIds(objectives, undefined), []);
});

test("a mission cannot end naturally until every critical goal is addressed", () => {
  assert.equal(criticalSpeakingObjectivesAddressed(objectives, ["greet"]), false);
  assert.equal(criticalSpeakingObjectivesAddressed(objectives, ["greet", "ask-price"]), true);
  assert.equal(
    criticalSpeakingObjectivesAddressed(objectives, ["greet", "ask-price", "say-thanks"]),
    true,
  );
});

test("Safari interim speech is retained when no final transcript arrives", () => {
  assert.equal(bestAvailableSpeechTranscript("", "  vorrei un tavolo  "), "vorrei un tavolo");
  assert.equal(bestAvailableSpeechTranscript("  quisiera pagar  ", "quisiera"), "quisiera pagar");
  assert.equal(bestAvailableSpeechTranscript("", ""), "");
});
