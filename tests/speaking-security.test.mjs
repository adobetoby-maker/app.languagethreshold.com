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

test("speaking pre-auth refuses absent/malformed canonical IPs and ignores caller forwarding fallbacks", async () => {
  await withSpeakingServerEnv(async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json(true);
    };
    for (const headers of [
      {},
      { "x-forwarded-for": "192.0.2.10" },
      { "x-real-ip": "192.0.2.11" },
      { "x-vercel-forwarded-for": "synthetic-chosen-bucket", "x-forwarded-for": "192.0.2.12" },
      { "x-vercel-forwarded-for": "192.0.2.999" },
      { "x-vercel-forwarded-for": " ,192.0.2.13" },
    ]) {
      assert.deepEqual(
        await enforceSpeakingPreAuthRateLimit(
          new Request("https://fixture.invalid/api/speak", { headers }),
        ),
        { allowed: false, misconfigured: true },
      );
    }
    assert.equal(calls, 0);
  });
});
test("speaking canonical IPv4/IPv6 retain the exact hashed IP budget and ignore rotated fallback values", async () => {
  await withSpeakingServerEnv(async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, opts, body: JSON.parse(opts.body) });
      return Response.json(true);
    };
    for (const ip of ["192.0.2.10", "2001:db8::10"]) {
      for (const fallback of ["192.0.2.20", "192.0.2.21"]) {
        assert.deepEqual(
          await enforceSpeakingPreAuthRateLimit(
            new Request("https://fixture.invalid/api/speak", {
              headers: {
                "x-vercel-forwarded-for": ` ${ip}, 192.0.2.30`,
                "x-forwarded-for": fallback,
                "x-real-ip": fallback,
              },
            }),
          ),
          { allowed: true, misconfigured: false },
        );
      }
    }
    assert.equal(calls.length, 4);
    const { createHmac } = await import("node:crypto");
    for (let i = 0; i < 4; i++) {
      const ip = i < 2 ? "192.0.2.10" : "2001:db8::10";
      const hash = createHmac("sha256", "server-secret-test-key")
        .update(`language-threshold:speaking:v1:ip:${ip}`)
        .digest("hex");
      assert.deepEqual(calls[i].body, {
        p_bucket_hash: hash,
        p_request_limit: 40,
        p_window_seconds: 60,
      });
      assert.equal(calls[i].opts.cache, "no-store");
      assert.doesNotMatch(JSON.stringify(calls[i].body), /192\.0\.2|2001:db8/);
    }
  });
});
test("only explicit loopback development uses the fixed local speaking bucket", async () => {
  const nodeEnv = process.env.NODE_ENV;
  try {
    await withSpeakingServerEnv(async () => {
      const calls = [];
      globalThis.fetch = async (url, opts) => {
        calls.push(JSON.parse(opts.body));
        return Response.json(true);
      };
      process.env.NODE_ENV = "development";
      for (const host of ["localhost", "127.0.0.1", "[::1]"])
        assert.deepEqual(
          await enforceSpeakingPreAuthRateLimit(new Request(`http://${host}/api/speak`)),
          { allowed: true, misconfigured: false },
        );
      assert.equal(new Set(calls.map((c) => c.p_bucket_hash)).size, 1);
      assert.deepEqual(
        await enforceSpeakingPreAuthRateLimit(
          new Request("https://outside.invalid/api/speak", {
            headers: { "x-forwarded-for": "192.0.2.10" },
          }),
        ),
        { allowed: false, misconfigured: true },
      );
      process.env.NODE_ENV = "production";
      assert.deepEqual(
        await enforceSpeakingPreAuthRateLimit(new Request("http://localhost/api/speak")),
        { allowed: false, misconfigured: true },
      );
      assert.equal(calls.length, 3);
    });
  } finally {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
  }
});
