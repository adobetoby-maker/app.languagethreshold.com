import assert from "node:assert/strict";
import test from "node:test";
import {
  bearerToken,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  hasSpeakingAgeAttestation,
  isSpeakingMissionLanguageEnabled,
  isStrictSameOrigin,
} from "../src/lib/speaking-security.ts";

async function withSpeakingServerEnv(run) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret-test-key";
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}

test("speaking POST security requires an exact, present origin", () => {
  const url = "https://app.languagethreshold.com/api/speak";
  assert.equal(isStrictSameOrigin(new Request(url)), false);
  assert.equal(
    isStrictSameOrigin(
      new Request(url, { headers: { Origin: "https://app.languagethreshold.com" } }),
    ),
    true,
  );
  assert.equal(
    isStrictSameOrigin(new Request(url, { headers: { Origin: "https://example.com" } })),
    false,
  );
});

test("speaking auth accepts only bearer tokens", () => {
  const url = "https://app.languagethreshold.com/api/speak";
  assert.equal(bearerToken(new Request(url)), null);
  assert.equal(bearerToken(new Request(url, { headers: { Authorization: "Basic abc" } })), null);
  assert.equal(
    bearerToken(new Request(url, { headers: { Authorization: "Bearer signed-token" } })),
    "signed-token",
  );
});

test("Japanese missions fail closed until the server-side curriculum review flag is set", () => {
  assert.equal(isSpeakingMissionLanguageEnabled("Spanish", {}), true);
  assert.equal(isSpeakingMissionLanguageEnabled("Italian", {}), true);
  assert.equal(isSpeakingMissionLanguageEnabled("Japanese", {}), false);
  assert.equal(
    isSpeakingMissionLanguageEnabled("Japanese", { JAPANESE_SPEAKING_REVIEWED: "true" }),
    true,
  );
});

test("Vercel speaking budget uses the shared Supabase RPC with a hashed bucket", async () => {
  await withSpeakingServerEnv(async () => {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url: String(url), init };
      return new Response("true", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const result = await enforceSpeakingPreAuthRateLimit(
      new Request("https://app.languagethreshold.com/api/speak", {
        headers: { "x-vercel-forwarded-for": "192.0.2.10" },
      }),
    );
    assert.deepEqual(result, { allowed: true, misconfigured: false });
    assert.equal(captured.url, "https://project.supabase.co/rest/v1/rpc/consume_speaking_request");
    const body = JSON.parse(captured.init.body);
    assert.match(body.p_bucket_hash, /^[0-9a-f]{64}$/);
    assert.equal(body.p_bucket_hash.includes("192.0.2.10"), false);
    assert.equal(body.p_request_limit, 40);
  });
});

test("speaking budgets fail closed when the shared store rejects the request", async () => {
  await withSpeakingServerEnv(async () => {
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(() => enforceSpeakingRateLimit("user-123"), /rejected/);
  });
});

test("account age self-attestation is read from server-only storage", async () => {
  await withSpeakingServerEnv(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([{ attested_at: "2026-08-13T12:00:00.000Z" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    assert.equal(await hasSpeakingAgeAttestation("user-123"), true);
    globalThis.fetch = async () =>
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    assert.equal(await hasSpeakingAgeAttestation("user-123"), false);
  });
});
