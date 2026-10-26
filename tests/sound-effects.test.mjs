import test from "node:test";
import assert from "node:assert/strict";
import {
  playFlashcardSuccess,
  setSoundEffectsEnabled,
  soundEffectsEnabled,
} from "../src/lib/sound-effects.ts";

test("reward audio honors off, closes resources, and never blocks on unavailable audio", async () => {
  const old = globalThis.window;
  const events = [],
    notes = [],
    contexts = [],
    values = new Map();
  class Audio {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() {
      contexts.push(this);
    }
    createOscillator() {
      const n = { frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
      notes.push(n);
      return n;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
    async close() {
      this.state = "closed";
    }
  }
  globalThis.window = {
    AudioContext: Audio,
    localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
    dispatchEvent: (event) => events.push(event.type),
  };
  try {
    setSoundEffectsEnabled(true);
    await playFlashcardSuccess();
    assert.deepEqual(
      notes.map((n) => n.frequency.value),
      [784, 988],
    );
    notes[1].onended();
    assert.equal(contexts[0].state, "closed");
    await playFlashcardSuccess();
    setSoundEffectsEnabled(false);
    assert.equal(contexts[1].state, "closed");
    await playFlashcardSuccess();
    assert.equal(contexts.length, 2);
    assert.equal(soundEffectsEnabled(), false);
    assert.equal(values.get("lt.sound-effects.v1"), "off");
    setSoundEffectsEnabled(true);
    window.AudioContext = class {
      constructor() {
        throw new Error("audio blocked");
      }
    };
    await assert.doesNotReject(playFlashcardSuccess());
    assert.equal(events.length, 3);
  } finally {
    if (old === undefined) delete globalThis.window;
    else globalThis.window = old;
  }
});

test("muting during a suspended audio resume cannot play a late chime", async () => {
  const old = globalThis.window;
  let resume,
    notes = 0;
  class Audio {
    state = "suspended";
    async resume() {
      await new Promise((resolve) => {
        resume = resolve;
      });
    }
    async close() {
      this.state = "closed";
    }
    createOscillator() {
      notes++;
      throw new Error("should not play");
    }
  }
  const values = new Map();
  globalThis.window = {
    AudioContext: Audio,
    localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
    dispatchEvent() {},
  };
  try {
    setSoundEffectsEnabled(true);
    const playing = playFlashcardSuccess();
    setSoundEffectsEnabled(false);
    resume();
    await playing;
    assert.equal(notes, 0);
  } finally {
    setSoundEffectsEnabled(true);
    if (old === undefined) delete globalThis.window;
    else globalThis.window = old;
  }
});
