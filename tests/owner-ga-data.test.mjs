// GA4 Data API client: config parsing, RS256 JWT, report bodies, response mapping and caching.
// No network: every Google call goes through an injected fetcher with fixture responses.
import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, verify } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";

const ga = await loadModule("src/lib/ga-data.ts");
const server = await loadModule("src/lib/ga-data-server.ts");
const shared = await loadModule("src/lib/owner-analytics.ts");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const keyJson = JSON.stringify({
  type: "service_account",
  client_email: "reader@fixture-project.iam.gserviceaccount.com",
  private_key: pem,
  token_uri: "https://evil.invalid/token",
});
const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

test("config: missing and invalid env never crash or echo secrets; raw and base64 JSON both work", () => {
  const empty = ga.readGaConfig({});
  assert.equal(empty.configured, false);
  assert.deepEqual(empty.missing, ["GA_PROPERTY_ID", "GA_SERVICE_ACCOUNT_JSON"]);
  const bad = ga.readGaConfig({
    GA_PROPERTY_ID: "abc",
    GA_SERVICE_ACCOUNT_JSON: '{"private_key":"nope"}',
  });
  assert.deepEqual(bad.invalid, ["GA_PROPERTY_ID", "GA_SERVICE_ACCOUNT_JSON"]);
  assert.doesNotMatch(JSON.stringify(bad), /nope|private/);
  for (const raw of [keyJson, Buffer.from(keyJson).toString("base64")]) {
    const config = ga.readGaConfig({
      GA_PROPERTY_ID: "properties/538705307",
      GA_SERVICE_ACCOUNT_JSON: raw,
    });
    assert.equal(config.configured, true);
    assert.equal(config.propertyId, "538705307");
    assert.equal(config.hostname, "app.languagethreshold.com");
    assert.equal(config.account.clientEmail, "reader@fixture-project.iam.gserviceaccount.com");
  }
  const custom = ga.readGaConfig({
    GA_PROPERTY_ID: "1",
    GA_SERVICE_ACCOUNT_JSON: keyJson,
    GA_HOSTNAME: " Staging.Example.Test ",
  });
  assert.equal(custom.hostname, "staging.example.test");
  assert.equal(
    ga.readGaConfig({ GA_PROPERTY_ID: "1", GA_SERVICE_ACCOUNT_JSON: keyJson, GA_HOSTNAME: "a b" })
      .configured,
    false,
  );
});

test("JWT: RS256 header, readonly scope, fixed Google audience, one-hour lifetime, valid signature", () => {
  const claims = ga.gaJwtClaims("reader@fixture-project.iam.gserviceaccount.com", 1_800_000_000.7);
  assert.deepEqual(claims, {
    iss: "reader@fixture-project.iam.gserviceaccount.com",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: 1_800_000_000,
    exp: 1_800_003_600,
  });
  const jwt = ga.signGaJwt(claims, pem);
  const [header, payload, signature] = jwt.split(".");
  assert.deepEqual(decode(header), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(decode(payload), claims);
  assert.equal(
    verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      publicKey,
      Buffer.from(signature, "base64url"),
    ),
    true,
  );
  const body = new URLSearchParams(ga.gaTokenRequestBody(jwt));
  assert.equal(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  assert.equal(body.get("assertion"), jwt);
});

test("every runReport body is restricted to the configured hostname", () => {
  for (const name of ga.GA_REPORTS) {
    const body = ga.gaReportBody(name, 30, "app.languagethreshold.com");
    assert.deepEqual(body.dateRanges, [{ startDate: "29daysAgo", endDate: "today" }]);
    const text = JSON.stringify(body.dimensionFilter);
    assert.match(text, /"fieldName":"hostName"/, name);
    assert.match(text, /"value":"app.languagethreshold.com"/, name);
  }
  const events = ga.gaReportBody("events", 7, "h.test");
  assert.deepEqual(events.dimensionFilter.andGroup.expressions[1].filter.inListFilter.values, [
    "sign_up",
    "begin_checkout",
    "purchase",
    "lesson_mastered",
    "team_seat_assigned",
  ]);
});

const row = (dims, mets) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: mets.map((value) => ({ value: String(value) })),
});
const fixtures = {
  totals: { rows: [row([], [12, 5, 30, 90])] },
  daily: { rows: [row(["20261021"], [3, 1, 4, 9]), row(["20261023"], [5, 2, 6, 20])] },
  pages: { rows: [row(["/"], [50, 10]), row(["/pricing"], [20, 8])] },
  channels: { rows: [row(["Organic Search"], [12])] },
  sources: { rows: [row(["google / organic"], [12])] },
  countries: { rows: [row(["United States"], [9])] },
  devices: { rows: [row(["mobile"], [7]), row(["desktop"], [5])] },
  events: { rows: [row(["sign_up"], [4]), row(["purchase"], [1])] },
};

test("mapping: dates fill gaps, totals, breakdowns, zero-filled key events, realtime", () => {
  const today = new Date("2026-10-23T12:00:00Z");
  const mapped = ga.mapGaReports(fixtures, {
    range: 7,
    hostname: "h.test",
    realtime: { rows: [row([], [3])] },
    fetchedAt: "2026-10-23T12:00:00.000Z",
    today,
  });
  assert.deepEqual(mapped.totals, { activeUsers: 12, newUsers: 5, sessions: 30, views: 90 });
  assert.equal(mapped.daily.length, 7);
  assert.equal(mapped.daily[0].date, "2026-10-17");
  assert.deepEqual(mapped.daily.at(-1), {
    date: "2026-10-23",
    activeUsers: 5,
    newUsers: 2,
    sessions: 6,
    views: 20,
  });
  assert.equal(mapped.daily.find((d) => d.date === "2026-10-22").views, 0);
  assert.deepEqual(mapped.pages[1], { label: "/pricing", value: 20, secondary: 8 });
  assert.deepEqual(
    mapped.devices.map((d) => d.label),
    ["Mobile", "Desktop"],
  );
  assert.deepEqual(
    mapped.events.map((e) => [e.label, e.value]),
    [
      ["sign_up", 4],
      ["begin_checkout", 0],
      ["purchase", 1],
      ["lesson_mastered", 0],
      ["team_seat_assigned", 0],
    ],
  );
  assert.equal(mapped.realtimeActiveUsers, 3);
  const empty = ga.mapGaReports(
    {},
    { range: 30, hostname: "h", realtime: null, fetchedAt: "x", today },
  );
  assert.equal(empty.daily.length, 30);
  assert.equal(empty.realtimeActiveUsers, null);
  assert.deepEqual(ga.gaRows({ rows: [row(["x"], ["not-a-number"])] })[0].metrics, [0]);
  assert.deepEqual(shared.dayKeys(3, today), ["2026-10-21", "2026-10-22", "2026-10-23"]);
});

test("Google failures map to fixed guidance and never echo the provider message", () => {
  const cases = [
    [
      401,
      { error: "invalid_grant", error_description: "PRIVATE" },
      /rejected the service account key/,
    ],
    [
      403,
      { error: { status: "PERMISSION_DENIED", message: "PRIVATE user lacks" } },
      /Viewer access/,
    ],
    [
      403,
      { error: { status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] } },
      /Enable the "Google Analytics Data API"/,
    ],
    [404, { error: { status: "NOT_FOUND" } }, /GA_PROPERTY_ID/],
    [429, { error: { status: "RESOURCE_EXHAUSTED" } }, /quota/],
    [500, null, /could not be reached/],
  ];
  for (const [status, body, expected] of cases) {
    const message = ga.gaErrorMessage(status, body);
    assert.match(message, expected);
    assert.doesNotMatch(message, /PRIVATE/);
  }
});

function googleFixture({ fail = null, realtimeFail = false } = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === "https://oauth2.googleapis.com/token")
      return Response.json({ access_token: "fixture-access-token", expires_in: 3600 });
    if (String(url).endsWith(":runRealtimeReport"))
      return realtimeFail
        ? Response.json({ error: { status: "INTERNAL" } }, { status: 500 })
        : Response.json({ rows: [row([], [2])] });
    if (fail) return Response.json(fail.body, { status: fail.status });
    const name = ga.GA_REPORTS.find((n) => {
      const body = JSON.parse(init.body);
      return (
        JSON.stringify(
          ga.gaReportBody(
            n,
            body.dateRanges[0].startDate === "6daysAgo" ? 7 : 30,
            "app.languagethreshold.com",
          ),
        ) === init.body
      );
    });
    return Response.json(fixtures[name] ?? {});
  };
  return { calls, fetcher };
}
const config = () =>
  ga.readGaConfig({ GA_PROPERTY_ID: "538705307", GA_SERVICE_ACCOUNT_JSON: keyJson });

test("loadGaAnalytics: one token exchange, nine reports, ten-minute cache, realtime optional", async () => {
  server.resetGaCache();
  let clock = Date.parse("2026-10-23T12:00:00Z");
  const now = () => clock;
  const google = googleFixture();
  const data = await server.loadGaAnalytics(config(), 7, { fetcher: google.fetcher, now });
  const token = google.calls.filter((c) => c.url === "https://oauth2.googleapis.com/token");
  assert.equal(token.length, 1);
  const form = new URLSearchParams(token[0].init.body);
  const [, claims] = form.get("assertion").split(".");
  assert.equal(decode(claims).iss, "reader@fixture-project.iam.gserviceaccount.com");
  assert.equal(decode(claims).aud, "https://oauth2.googleapis.com/token");
  const reports = google.calls.filter((c) => c.url.includes("analyticsdata.googleapis.com"));
  assert.equal(reports.length, 9);
  for (const call of reports) {
    assert.match(
      call.url,
      /^https:\/\/analyticsdata\.googleapis\.com\/v1beta\/properties\/538705307:run(Realtime)?Report$/,
    );
    assert.equal(call.init.headers.Authorization, "Bearer fixture-access-token");
    assert.equal(call.init.redirect, "error");
  }
  assert.equal(data.totals.views, 90);
  assert.equal(data.realtimeActiveUsers, 2);
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE KEY|fixture-access-token/);

  google.calls.length = 0;
  clock += 5 * 60 * 1000;
  await server.loadGaAnalytics(config(), 7, { fetcher: google.fetcher, now });
  assert.deepEqual(
    google.calls.map((c) => c.url.split(":").at(-1)),
    ["runRealtimeReport"],
  );

  google.calls.length = 0;
  clock += 6 * 60 * 1000;
  await server.loadGaAnalytics(config(), 7, { fetcher: google.fetcher, now });
  assert.equal(google.calls.filter((c) => c.url.endsWith(":runReport")).length, 8);

  google.calls.length = 0;
  await server.loadGaAnalytics(config(), 30, { fetcher: google.fetcher, now });
  assert.equal(
    google.calls.filter((c) => c.url.endsWith(":runReport")).length,
    8,
    "other range is its own cache entry",
  );

  server.resetGaCache();
  const noRealtime = googleFixture({ realtimeFail: true });
  const partial = await server.loadGaAnalytics(config(), 7, { fetcher: noRealtime.fetcher, now });
  assert.equal(partial.realtimeActiveUsers, null);
  assert.equal(partial.totals.activeUsers, 12);
});

test("loadGaAnalytics: a permission failure is a fixed GaRequestError and is not cached", async () => {
  server.resetGaCache();
  const google = googleFixture({
    fail: {
      status: 403,
      body: { error: { status: "PERMISSION_DENIED", message: "PRIVATE detail" } },
    },
  });
  await assert.rejects(
    server.loadGaAnalytics(config(), 30, { fetcher: google.fetcher }),
    (error) =>
      error instanceof server.GaRequestError &&
      /Viewer access/.test(error.message) &&
      !/PRIVATE/.test(error.message),
  );
  const ok = googleFixture();
  const data = await server.loadGaAnalytics(config(), 30, { fetcher: ok.fetcher });
  assert.equal(data.totals.sessions, 30);
});
