import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { providerReservation, paidProvider } = await loadModule("src/lib/campaign-budget-cost.ts");
const { withCampaignRequest, campaignProviderFetch } = await loadModule(
  "src/lib/campaign-provider-fetch.ts",
);
const USER = "00000000-0000-4000-8000-000000000101";
test("known HD voices are priced per new character; unsupported paid models fail closed", () => {
  const url = "https://texttospeech.googleapis.com/v1/text:synthesize";
  assert.equal(
    providerReservation(url, {
      input: { text: "a".repeat(1000) },
      voice: { name: "es-ES-Chirp3-HD-Aoede" },
    }),
    30000,
  );
  assert.equal(
    providerReservation(url, { input: { text: "test" }, voice: { name: "unknown" } }),
    null,
  );
  assert.equal(
    providerReservation("https://api.anthropic.com/v1/messages", {
      model: "unknown",
      max_tokens: 100,
    }),
    null,
  );
  assert.ok(
    providerReservation("https://api.anthropic.com/v1/messages", {
      model: "claude-haiku-5-5",
      max_tokens: 100,
      messages: [],
    }) > 100,
  );
  assert.equal(
    providerReservation("https://api.anthropic.com/v1/messages", {
      model: "claude-haiku-5-5",
      max_tokens: 100,
      tools: [{ type: "web_search_20250305" }],
    }),
    null,
  );
  assert.equal(paidProvider("https://texttospeech.googleapis.com/v1/voices"), false);
});
async function fixture(action) {
  const oldFetch = globalThis.fetch;
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY"];
  const saved = keys.map((k) => process.env[k]);
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
  delete process.env.STRIPE_SECRET_KEY;
  const state = {
    campaign: true,
    staff: false,
    admit: true,
    providerCalls: 0,
    reservations: [],
    staffReservations: [],
    authCalls: 0,
    metered: [],
  };
  globalThis.fetch = async (input, options) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    if (u.hostname === "texttospeech.googleapis.com") {
      state.providerCalls++;
      return Response.json({ audioContent: "fixture" });
    }
    if (u.pathname === "/auth/v1/user") {
      state.authCalls++;
      return Response.json({ id: USER, email: "fixture@example.invalid" });
    }
    if (u.pathname === "/rest/v1/promo_redemptions")
      return Response.json(state.campaign ? { user_id: USER } : null);
    if (u.pathname === "/rest/v1/staff_coupon_recipients")
      return Response.json(state.staff ? { user_id: USER } : null);
    if (u.pathname === "/rest/v1/rpc/reserve_staff_generation") {
      state.staffReservations.push(JSON.parse(options.body));
      return Response.json(state.admit);
    }
    if (u.pathname === "/rest/v1/team_members") return Response.json([]);
    if (u.pathname === "/rest/v1/api_usage_events") {
      state.metered.push(JSON.parse(options.body));
      return new Response(null, { status: 201 });
    }
    if (u.pathname === "/rest/v1/rpc/reserve_reddit_generation") {
      state.reservations.push(JSON.parse(options.body));
      return Response.json(state.admit);
    }
    throw Error("Unexpected " + u.pathname);
  };
  try {
    await action(state);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  }
}
const scope = () =>
  new Request("https://app.example.invalid/api/mission-tts", {
    headers: { Authorization: "Bearer fixture-token" },
  });
const call = () =>
  campaignProviderFetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    body: JSON.stringify({
      input: { text: "a".repeat(1000) },
      voice: { name: "es-ES-Chirp3-HD-Aoede" },
    }),
  });
test("every provider attempt reserves first and exhausted budget prevents the physical call", () =>
  fixture(async (s) => {
    await withCampaignRequest(scope(), async () => {
      assert.equal((await call()).status, 200);
      s.admit = false;
      assert.equal((await call()).status, 402);
    });
    assert.equal(s.providerCalls, 1);
    assert.equal(s.authCalls, 1);
    assert.equal(s.metered.length, 1);
    assert.deepEqual(s.metered[0], {
      user_id: USER,
      provider: "google_tts",
      request_status: "accepted",
      cost_ceiling_micro_usd: 30000,
    });
    assert.deepEqual(s.reservations, [
      { p_user: USER, p_amount: 30000 },
      { p_user: USER, p_amount: 30000 },
    ]);
  }));
test("unauthenticated generation cannot sidestep campaign identity checks", () =>
  fixture(async (s) => {
    assert.equal(
      (await withCampaignRequest(new Request("https://app.example.invalid/api/mission-tts"), call))
        .status,
      403,
    );
    assert.equal(s.providerCalls, 0);
  }));
test("existing verified non-campaign users retain their normal provider access", () =>
  fixture(async (s) => {
    s.campaign = false;
    assert.equal((await withCampaignRequest(scope(), call)).status, 200);
    assert.equal(s.reservations.length, 0);
    assert.equal(s.providerCalls, 1);
    assert.equal(s.metered.length, 1);
  }));
test("staff generation uses its separate lifetime wallet and blocks exhausted requests", () =>
  fixture(async (s) => {
    s.campaign = false;
    s.staff = true;
    await withCampaignRequest(scope(), async () => {
      assert.equal((await call()).status, 200);
      s.admit = false;
      assert.equal((await call()).status, 402);
    });
    assert.equal(s.reservations.length, 0);
    assert.equal(s.staffReservations.length, 2);
    assert.equal(s.providerCalls, 1);
  }));
