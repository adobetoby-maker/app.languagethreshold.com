import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["src/routes/api.speaking-transcribe.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [
    {
      name: "request-boundaries",
      setup(b) {
        b.onResolve(
          {
            filter:
              /(@tanstack\/react-router|speaking-security|learning-generation-security|reply-audio-provider)$/,
          },
          (a) => ({ path: a.path, namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents: a.path.includes("react-router")
            ? "export const createFileRoute=()=>x=>x;"
            : a.path.includes("learning-generation")
              ? "export const checkLearningGenerationBudget=async()=>null;"
              : a.path.includes("provider")
                ? 'export class ReplyTranscriptionError extends Error {};export const transcribeReplyAudio=async()=>{globalThis.replyProviderCalls++;return "Hola";}'
                : `export const isStrictSameOrigin=r=>r.headers.get('origin')==='https://fixture.invalid';export const enforceSpeakingPreAuthRateLimit=async()=>({allowed:true});export const authenticateSpeakingRequest=async r=>r.headers.get('authorization')?{userId:'synthetic'}:null;export const hasSpeakingAgeAttestation=async()=>globalThis.replyConsent;export const enforceSpeakingRateLimit=async()=>({allowed:true});`,
        }));
      },
    },
  ],
});
const { Route } = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
const codec = await build({
  entryPoints: ["src/lib/reply-audio.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { encodeReplyWav } = await import(
  "data:text/javascript;base64," + Buffer.from(codec.outputFiles[0].text).toString("base64")
);
test("recorded reply route refuses foreign origin, missing actor, consent and invalid audio before provider", async () => {
  const previous = process.env.ELEVEN_API_KEY;
  process.env.ELEVEN_API_KEY = "synthetic";
  globalThis.replyProviderCalls = 0;
  globalThis.replyConsent = true;
  const request = (body, headers = {}) =>
    new Request("https://fixture.invalid/api/speaking-transcribe", {
      method: "POST",
      headers: {
        origin: "https://fixture.invalid",
        authorization: "Bearer synthetic",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const data = encodeReplyWav({
    sampleRate: 16000,
    length: 16000,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(16000).fill(0.2),
  });
  const body = {
    audio: Buffer.from(data).toString("base64"),
    language: "es",
    audioConsent: "recorded-reply-v1",
  };
  try {
    for (const [req, status] of [
      [request(body, { origin: "https://foreign.invalid" }), 403],
      [request(body, { authorization: "" }), 401],
      [request({ ...body, audioConsent: undefined }), 400],
      [request({ ...body, audio: "invalid" }), 400],
    ]) {
      const res = await Route.server.handlers.POST({ request: req });
      assert.equal(res.status, status);
      assert.match(res.headers.get("cache-control"), /no-store/);
    }
    globalThis.replyConsent = false;
    assert.equal((await Route.server.handlers.POST({ request: request(body) })).status, 403);
    globalThis.replyConsent = true;
    assert.equal(globalThis.replyProviderCalls, 0);
    const response = await Route.server.handlers.POST({ request: request(body) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: "Hola", seconds: 1 });
    assert.equal(globalThis.replyProviderCalls, 1);
  } finally {
    if (previous === undefined) delete process.env.ELEVEN_API_KEY;
    else process.env.ELEVEN_API_KEY = previous;
    delete globalThis.replyConsent;
    delete globalThis.replyProviderCalls;
  }
});
