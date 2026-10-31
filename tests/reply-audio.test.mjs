import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["src/lib/reply-audio.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { encodeReplyWav, validateReplyWav } = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
const audio = (rate, seconds, value = 0.2, channels = 1) => ({
  sampleRate: rate,
  length: Math.floor(rate * seconds),
  numberOfChannels: channels,
  getChannelData: () => new Float32Array(Math.floor(rate * seconds)).fill(value),
});
test("canonical WAV resamples stereo and bounds actual duration before transcription", () => {
  for (const rate of [8000, 16000, 44100, 48000]) {
    const data = new Uint8Array(encodeReplyWav(audio(rate, 2, 0.2, 2)));
    assert.equal(data.length, 64044);
    assert.deepEqual(validateReplyWav(data), { seconds: 2, audible: true });
  }
  assert.throws(() => encodeReplyWav(audio(16000, 46)));
  assert.throws(() => encodeReplyWav(audio(16000, 0.01)));
});
test("rejects forged headers and distinguishes silent capture", () => {
  const bytes = new Uint8Array(encodeReplyWav(audio(16000, 1, 0)));
  assert.equal(validateReplyWav(bytes).audible, false);
  for (const index of [0, 4, 8, 12, 16, 20, 22, 24, 28, 32, 34, 36, 40]) {
    const changed = bytes.slice();
    changed[index] ^= 255;
    assert.throws(() => validateReplyWav(changed));
  }
  assert.throws(() => validateReplyWav(bytes.subarray(0, bytes.length - 2)));
});
test("clips invalid sample amplitude without producing invalid PCM", () => {
  const data = new Uint8Array(encodeReplyWav(audio(48000, 1, 5)));
  assert.equal(new DataView(data.buffer).getInt16(44, true), 32767);
  assert.equal(
    validateReplyWav(new Uint8Array(encodeReplyWav(audio(16000, 1, NaN)))).audible,
    false,
  );
});
