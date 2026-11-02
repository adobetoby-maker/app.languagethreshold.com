import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["src/lib/reply-audio-provider.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { transcribeReplyAudio } = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
test("transcription uploads only bounded audio and selected language, trims returned text", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.elevenlabs.io/v1/speech-to-text");
      assert.equal(options.headers["xi-api-key"], "synthetic-key");
      assert.equal(options.body.get("model_id"), "scribe_v1");
      assert.equal(options.body.get("language_code"), "es");
      assert.equal(options.body.get("diarize"), "false");
      assert.equal(options.body.get("file").type, "audio/wav");
      return Response.json({ text: " Hola " });
    };
    assert.equal(
      await transcribeReplyAudio(
        new Uint8Array([1, 2]),
        "es",
        "synthetic-key",
        new AbortController().signal,
      ),
      "Hola",
    );
  } finally {
    globalThis.fetch = previous;
  }
});
test("provider failures never expose private response bodies and cancellation makes no request", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  try {
    for (const [status, expected] of [
      [401, 503],
      [403, 503],
      [429, 429],
      [500, 502],
    ]) {
      globalThis.fetch = async () => {
        calls++;
        return new Response("PRIVATE PROVIDER DETAIL", { status });
      };
      await assert.rejects(
        transcribeReplyAudio(new Uint8Array([1]), "es", "synthetic", new AbortController().signal),
        (error) => error.status === expected && !error.message.includes("PRIVATE"),
      );
    }
    const controller = new AbortController();
    controller.abort();
    const before = calls;
    await assert.rejects(
      transcribeReplyAudio(new Uint8Array([1]), "es", "synthetic", controller.signal),
      (error) => error.status === 499,
    );
    assert.equal(calls, before);
    globalThis.fetch = async () => Response.json({ text: "" });
    await assert.rejects(
      transcribeReplyAudio(new Uint8Array([1]), "es", "synthetic", new AbortController().signal),
      (error) => error.status === 422,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
