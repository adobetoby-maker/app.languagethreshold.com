import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  destinationPromptContext,
  getTravelDestination,
  getTravelDestinations,
  isDestinationForLanguage,
  TRAVEL_DESTINATIONS,
} from "../src/data/travel-destinations.ts";

describe("country-specific next-trip curriculum", () => {
  test("covers the complete current Speaking rollout without duplicate destinations", () => {
    assert.equal(TRAVEL_DESTINATIONS.length, 33);
    assert.equal(new Set(TRAVEL_DESTINATIONS.map((destination) => destination.id)).size, 33);
    assert.equal(getTravelDestinations("Spanish").length, 21);
    assert.equal(getTravelDestinations("Italian").length, 4);
    assert.equal(getTravelDestinations("Japanese").length, 1);
    assert.equal(getTravelDestinations("English").length, 7);
  });

  test("every destination has a real country lens, practical notes, and phrases", () => {
    for (const destination of TRAVEL_DESTINATIONS) {
      assert.ok(destination.localLens.length >= 80, `${destination.id} needs a fuller local lens`);
      assert.ok(destination.practicalNotes.length >= 3, `${destination.id} needs practical notes`);
      assert.ok(destination.phrases.length >= 4, `${destination.id} needs a useful phrase pack`);
      assert.ok(destination.ttsLocale.length >= 5, `${destination.id} needs a voice locale`);
      for (const phrase of destination.phrases) {
        assert.ok(phrase.english.trim());
        assert.ok(phrase.target.trim());
        assert.ok(phrase.note.trim());
      }
    }
  });

  test("English destinations cover the major accent regions", () => {
    const english = getTravelDestinations("English");
    assert.deepEqual(
      new Set(english.map((destination) => destination.ttsLocale)),
      new Set(["en-US", "en-GB", "en-CA", "en-IE", "en-AU", "en-NZ", "en-ZA"]),
    );
    for (const required of [
      "united-states",
      "united-kingdom",
      "canada",
      "ireland",
      "australia",
      "new-zealand",
      "south-africa",
    ]) {
      assert.ok(getTravelDestination(required), required);
    }
  });

  test("Italy includes the Rome pain points that motivated the destination layer", () => {
    const italy = getTravelDestination("italy");
    assert.ok(italy);
    const content = JSON.stringify(italy).toLocaleLowerCase();
    for (const required of [
      "vespa",
      "tasse e assicurazione",
      "ztl",
      "mal di testa",
      "calzini",
      "biancheria intima",
      "figli",
    ]) {
      assert.match(content, new RegExp(required));
    }
  });

  test("destination lookup fails closed across languages", () => {
    assert.equal(isDestinationForLanguage("italy", "Italian"), true);
    assert.equal(isDestinationForLanguage("italy", "Spanish"), false);
    assert.equal(isDestinationForLanguage("not-a-country", "Italian"), false);
  });

  test("AI context carries local language and an explicit changing-facts guard", () => {
    const italy = getTravelDestination("italy");
    assert.ok(italy);
    const prompt = destinationPromptContext(italy);
    assert.match(prompt, /Destination country: Italy/);
    assert.match(prompt, /Quanto costa in tutto/);
    assert.match(prompt, /Do not invent current prices, schedules, laws/);
  });
});
