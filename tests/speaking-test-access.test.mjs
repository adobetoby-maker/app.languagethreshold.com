import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const output = await build({
  entryPoints: ["src/lib/speaking-test-access.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { speakingTestPrincipal } = await import(
  "data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64")
);
const host = "https://language-threshold-speaking-test.vercel.app";
const id = "00000000-0000-4000-8000-00000000c044";
const request = (path = "/api/speak", origin = host, urlHost = host, extra = {}) =>
  new Request(urlHost + path, {
    method: "POST",
    headers: { origin, "x-speaking-test-session": id, "x-speaking-test-adult": "true", ...extra },
  });
test("temporary speech guest access is limited to exact test host, matching origin and speech routes", () => {
  for (const path of ["/api/speak", "/api/mission-tts", "/api/speaking-transcribe"])
    assert.deepEqual(speakingTestPrincipal(request(path)), { userId: "speaking-test:" + id });
  for (const path of ["/api/push", "/api/tutor", "/api/speaking-consent", "/api/speak/private"])
    assert.equal(speakingTestPrincipal(request(path)), null);
  for (const production of [
    "https://app.languagethreshold.com",
    "https://language-threshold-speaking-test.vercel.app.evil.invalid",
    "http://language-threshold-speaking-test.vercel.app",
  ])
    assert.equal(speakingTestPrincipal(request("/api/speak", production, production)), null);
  assert.equal(speakingTestPrincipal(request("/api/speak", "https://foreign.invalid")), null);
  assert.equal(
    speakingTestPrincipal(
      request("/api/speak", host, host, { "x-speaking-test-session": "arbitrary-account-id" }),
    ),
    null,
  );
  assert.equal(
    speakingTestPrincipal(request("/api/speak", host, host, { "x-speaking-test-adult": "false" })),
    null,
  );
});
