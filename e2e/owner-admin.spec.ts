import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Owner area tabs with every /api/* response mocked, so no real owner session or database is used.
// The Supabase session below is made up and lives only in this browser's localStorage. The real
// server-side owner gate is covered by tests/owner-admin-routes.test.mjs.
// @dev-only: needs the local dev server (the API mocks never reach production).

const SUPABASE_REF = "pollhlkgltdkdskdzsgd";
const OWNER_ID = "00000000-0000-4000-8000-0000000000aa";
const LEARNER_ID = "00000000-0000-4000-8000-0000000000bb";
const ORG_ID = "00000000-0000-4000-8000-0000000000cc";

function fakeSession() {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: OWNER_ID, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 60 * 60 * 24,
    expires_at: exp,
    user: {
      id: OWNER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "owner-e2e@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
    },
  };
}

const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const days = (n: number) => Array.from({ length: n }, (_, i) => day(n - 1 - i));

const platform = {
  counts: {
    total_accounts: 412,
    adult_accounts: 398,
    junior_accounts: 14,
    organizations: 2,
    paid_seats: 25,
    assigned_seats: 19,
    certificates: 6,
    pending_invites: 3,
    email_failures: 0,
    assessment_passes_30d: 4,
    active_7d: 58,
    active_30d: 141,
  },
  financial: {
    income_cents: 482000,
    expense_cents: 91000,
    net_cents: 391000,
    months: [
      { month: "2026-10-01", income_cents: 182000, expense_cents: 31000, net_cents: 151000 },
    ],
  },
  categories: [
    { category: "Subscriptions", income_cents: 482000, expense_cents: 0, net_cents: 482000 },
  ],
  siteUsage: [
    { module_id: "roofing", active_seconds: 54000, active_users: 31 },
    { module_id: "restaurant", active_seconds: 21000, active_users: 12 },
  ],
  organizations: [
    {
      id: ORG_ID,
      name: "Ridgeline Roofing",
      billing_email: "billing@ridgeline.example.test",
      created_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-0000000000dd",
      name: "Harbor Kitchens",
      billing_email: "ops@harbor.example.test",
      created_at: "2026-09-12T00:00:00Z",
    },
  ],
  entitlements: [
    {
      organization_id: ORG_ID,
      seat_limit: 20,
      term: "annual",
      status: "active",
      period_end: "2027-09-01T00:00:00Z",
      stripe_subscription_id: "sub_e2e",
    },
    {
      organization_id: "00000000-0000-4000-8000-0000000000dd",
      seat_limit: 5,
      term: "quarterly",
      status: "manual",
      period_end: "2026-12-31T00:00:00Z",
      stripe_subscription_id: null,
    },
  ],
  members: [],
  activity: [],
  attempts: [],
  ledger: [
    {
      id: "l1",
      occurred_on: day(2),
      category: "Subscriptions",
      amount_cents: 4900,
      source: "stripe",
      external_ref: "in_e2e",
      organization_id: null,
      memo: "Monthly plan",
    },
  ],
  auditEvents: [
    {
      id: 1,
      actor_user_id: OWNER_ID,
      action: "platform.view",
      organization_id: null,
      created_at: new Date().toISOString(),
    },
  ],
  moduleRequests: [],
};

const users = [
  {
    id: LEARNER_ID,
    email: "maria.learner@example.test",
    displayName: "Maria Learner",
    createdAt: day(3) + "T10:00:00Z",
    lastSignInAt: day(1) + "T09:00:00Z",
    confirmed: true,
    bannedUntil: null,
    subscriptionStatus: "active",
    activeSeconds30d: 5400,
    activeDays30d: 9,
    lastPracticeAt: day(1) + "T09:30:00Z",
    freeUntil: null,
    freeActive: false,
  },
  {
    id: "00000000-0000-4000-8000-0000000000be",
    email: "new.signup@example.test",
    displayName: "",
    createdAt: day(0) + "T08:00:00Z",
    lastSignInAt: null,
    confirmed: false,
    bannedUntil: null,
    subscriptionStatus: "none",
    activeSeconds30d: 0,
    activeDays30d: 0,
    lastPracticeAt: null,
    freeUntil: null,
    freeActive: false,
  },
  {
    id: "00000000-0000-4000-8000-0000000000bf",
    email: "paused@example.test",
    displayName: "Paused Account",
    createdAt: day(40) + "T08:00:00Z",
    lastSignInAt: day(20) + "T08:00:00Z",
    confirmed: true,
    bannedUntil: "2126-01-01T00:00:00Z",
    subscriptionStatus: "canceled",
    activeSeconds30d: 0,
    activeDays30d: 0,
    lastPracticeAt: null,
    freeUntil: null,
    freeActive: false,
  },
];

const gaDaily = days(30).map((date, i) => ({
  date,
  activeUsers: 20 + ((i * 7) % 15),
  newUsers: 5 + ((i * 3) % 6),
  sessions: 30 + ((i * 11) % 20),
  views: 90 + ((i * 13) % 50),
}));
const ga = {
  configured: true,
  hostname: "app.languagethreshold.com",
  range: 30,
  fetchedAt: new Date().toISOString(),
  totals: { activeUsers: 640, newUsers: 210, sessions: 1180, views: 3420 },
  daily: gaDaily,
  pages: [
    { label: "/", value: 1200, secondary: 410 },
    { label: "/pricing", value: 380, secondary: 190 },
    { label: "/team", value: 210, secondary: 60 },
  ],
  channels: [
    { label: "Organic Search", value: 520 },
    { label: "Direct", value: 410 },
    { label: "Referral", value: 120 },
  ],
  sources: [
    { label: "google / organic", value: 500 },
    { label: "(direct) / (none)", value: 410 },
  ],
  countries: [
    { label: "United States", value: 520 },
    { label: "Mexico", value: 61 },
  ],
  devices: [
    { label: "Mobile", value: 380 },
    { label: "Desktop", value: 250 },
  ],
  events: [
    { label: "sign_up", value: 42 },
    { label: "begin_checkout", value: 18 },
    { label: "purchase", value: 9 },
    { label: "lesson_mastered", value: 230 },
    { label: "team_seat_assigned", value: 7 },
  ],
  realtimeActiveUsers: 4,
};
const app = {
  range: 30,
  signups: days(30).map((date, i) => ({ date, count: (i * 5) % 4 })),
  signupTotal: 44,
  unconfirmedSignups: 6,
  directoryTruncated: false,
  active7d: 58,
  active30d: 141,
  totalAccounts: 412,
  modules: platform.siteUsage,
  revenue: days(30).map((date, i) => ({
    date,
    receiptsCents: i % 6 === 0 ? 4900 : 0,
    outflowCents: 0,
    purchases: i % 6 === 0 ? 1 : 0,
  })),
  receiptsCents: 24500,
  outflowCents: 0,
  purchases: 5,
  seats: { paid: 20, pilot: 5, enabled: 25, assigned: 19 },
};
const team = {
  organization: {
    id: ORG_ID,
    name: "Ridgeline Roofing",
    billing_email: "billing@ridgeline.example.test",
    owner_user_id: OWNER_ID,
    created_at: "2026-09-01T00:00:00Z",
  },
  entitlement: {
    seat_limit: 20,
    term: "annual",
    status: "active",
    period_end: "2027-09-01T00:00:00Z",
    stripeManaged: true,
  },
  complimentary: false,
  members: [
    {
      id: "m1",
      user_id: OWNER_ID,
      display_name: "Riley Owner",
      role: "owner",
      status: "active",
      joined_at: "2026-09-01T00:00:00Z",
      email: "riley@ridgeline.example.test",
    },
    {
      id: "m2",
      user_id: LEARNER_ID,
      display_name: "Maria Learner",
      role: "learner",
      status: "active",
      joined_at: "2026-09-03T00:00:00Z",
      email: "maria.learner@example.test",
    },
  ],
  invitations: [
    {
      id: "i1",
      email: "crew.lead@ridgeline.example.test",
      display_name: "Crew Lead",
      role: "admin",
      module_id: null,
      require_certificate: false,
      status: "pending",
      expires_at: day(-5) + "T00:00:00Z",
      sent_at: day(2) + "T00:00:00Z",
      last_email_error: null,
    },
  ],
  assignments: [
    {
      id: "a1",
      user_id: LEARNER_ID,
      module_id: "roofing",
      require_certificate: true,
      due_at: null,
      assigned_at: "2026-09-03T00:00:00Z",
    },
  ],
  modules: [
    { id: "roofing", name: "Roofing Supervisor" },
    { id: "restaurant", name: "Restaurant" },
  ],
  emailEnabled: true,
};
const activityLog = {
  total: 2,
  page: 0,
  pageSize: 100,
  events: [
    {
      id: 2,
      created_at: new Date().toISOString(),
      action: "user.disabled",
      actor_user_id: OWNER_ID,
      actor_email: "owner-e2e@example.test",
      organization_id: null,
      organization_name: null,
      detail: {},
      summary: "userId: 0000… · reason: Chargeback abuse",
    },
    {
      id: 1,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      action: "owner_team.role_changed",
      actor_user_id: OWNER_ID,
      actor_email: "owner-e2e@example.test",
      organization_id: ORG_ID,
      organization_name: "Ridgeline Roofing",
      detail: {},
      summary: "from: admin · to: learner",
    },
  ],
};

type Posted = { path: string; body: Record<string, unknown> };
async function openOwner(page: Page, tab = "overview", { gaConfigured = true } = {}) {
  const posted: Posted[] = [];
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("lt.theme.v1", "light");
    },
    { key: `sb-${SUPABASE_REF}-auth-token`, session: fakeSession() },
  );
  await page.route(/supabase\.co\//, (route) =>
    route.fulfill({ status: 401, json: { message: "e2e" } }),
  );
  await page.route(/\/api\//, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      posted.push({ path: url.pathname, body: route.request().postDataJSON() });
      return route.fulfill({ json: { notice: "Done (mocked).", ok: true } });
    }
    const json = (() => {
      switch (url.pathname) {
        case "/api/platform":
          return platform;
        case "/api/owner-users":
          return url.searchParams.get("userId")
            ? { usage: [], memberships: [], grant: null, invitation: null }
            : {
                users,
                total: users.length,
                page: 0,
                pageSize: 50,
                emailReady: true,
                truncated: false,
              };
        case "/api/owner-customers":
          return {
            ready: true,
            unsubscribed: false,
            referral: null,
            referralCount: 0,
            messages: [],
          };
        case "/api/owner-discounts":
          return { ready: true, discounts: [], hasMore: false, nextCursor: null };
        case "/api/owner-analytics":
          if (url.searchParams.get("part") === "app") return app;
          return gaConfigured
            ? ga
            : {
                configured: false,
                missing: ["GA_PROPERTY_ID", "GA_SERVICE_ACCOUNT_JSON"],
                invalid: [],
                setup: [
                  "Enable the Google Analytics Data API.",
                  "Add the service account as Viewer.",
                ],
              };
        case "/api/owner-teams":
          return team;
        case "/api/owner-activity":
          return activityLog;
        default:
          return { error: "unmocked " + url.pathname };
      }
    })();
    return route.fulfill({ json });
  });
  await page.goto(`/owner?tab=${tab}`);
  await expect(page.getByRole("tablist", { name: "Owner sections" })).toBeVisible({
    timeout: 60_000,
  });
  return posted;
}

const TABS = [
  ["overview", "Total accounts"],
  ["analytics", "Website traffic · Google Analytics"],
  ["users", "Users and usage"],
  ["companies", "Companies and seat use"],
  ["money", "Site P/L ledger"],
  ["activity", "Activity log"],
] as const;

test("owner tabs switch with the URL and render each section without horizontal scroll", async ({
  page,
  isMobile,
}) => {
  await openOwner(page);
  // Phones get an edge fade while more tabs sit off-screen; desktop shows every tab.
  await expect(page.getByTestId("owner-tabs-fade-right")).toHaveCSS(
    "opacity",
    isMobile ? "1" : "0",
  );
  for (const [tab, heading] of TABS) {
    await page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]tab=${tab}`));
    await expect(page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
  await page.goto("/owner?tab=activity");
  await expect(page.getByText("user.disabled")).toBeVisible();
  await expect(page.getByText("owner-e2e@example.test").first()).toBeVisible();
});

test("analytics shows GA charts, and a Connect card when GA is not configured", async ({
  page,
}) => {
  await openOwner(page, "analytics");
  await expect(page.getByText("Active now")).toBeVisible();
  await expect(page.getByText("/pricing")).toBeVisible();
  await expect(page.getByText("team_seat_assigned")).toBeVisible();
  await expect(page.getByText("Practice time by module")).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
  const fresh = await page.context().newPage();
  await openOwner(fresh, "analytics", { gaConfigured: false });
  await expect(fresh.getByTestId("ga-connect")).toContainText("Connect Google Analytics");
  await expect(fresh.getByTestId("ga-connect")).toContainText("GA_SERVICE_ACCOUNT_JSON");
});

test("disabling an account needs a reason and the typed email before anything is sent", async ({
  page,
}) => {
  const posted = await openOwner(page, "users");
  await page.getByRole("button", { name: /Maria Learner/ }).click();
  await page.getByRole("button", { name: "Disable account" }).click();
  const confirm = page.getByRole("button", { name: "Confirm disable account" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Reason (kept in the activity log)").fill("Chargeback abuse");
  await expect(confirm).toBeDisabled();
  const group = page.getByRole("group", { name: "Confirm: Disable account" });
  await group.getByRole("textbox").last().fill("maria.learner@example.test");
  await expect(confirm).toBeEnabled();
  expect(posted).toHaveLength(0);
  await confirm.click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toEqual({
    path: "/api/owner-users",
    body: {
      userId: LEARNER_ID,
      action: "disable",
      confirmEmail: "maria.learner@example.test",
      reason: "Chargeback abuse",
    },
  });
  await expect(page.getByText("Done (mocked).").first()).toBeVisible();
});

test("company team manager: Stripe-managed seats, role change and removal confirm", async ({
  page,
}) => {
  const posted = await openOwner(page, "companies");
  await expect(page.getByText("Managed in Stripe")).toBeVisible();
  await page.getByRole("button", { name: "Manage team" }).first().click();
  const manager = page.getByTestId("owner-team-manager");
  await expect(manager).toContainText("Seats managed in Stripe");
  await expect(manager).toContainText("Crew Lead");
  await manager.getByRole("button", { name: "Remove from company" }).click();
  const remove = manager.getByRole("button", { name: "Confirm remove from company" });
  await expect(remove).toBeDisabled();
  await manager
    .getByRole("group", { name: "Confirm: Remove from company" })
    .getByRole("textbox")
    .fill("maria learner");
  await remove.click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0].body).toMatchObject({
    orgId: ORG_ID,
    action: "remove_member",
    memberId: "m2",
    confirmName: "maria learner",
  });
});

// Screenshot capture for review (OWNER_SHOTS=1). Light theme, 375×812@2x and 1440×900.
test("capture owner tab screenshots", async ({ browser }, info) => {
  test.skip(!process.env.OWNER_SHOTS || info.project.name !== "desktop", "capture runs on demand");
  mkdirSync(".claude/verify/owner", { recursive: true });
  for (const [name, viewport, scale] of [
    ["375", { width: 375, height: 812 }, 2],
    ["1440", { width: 1440, height: 900 }, 1],
  ] as const) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: scale,
      colorScheme: "light",
    });
    const page = await context.newPage();
    for (const [tab] of TABS) {
      await openOwner(page, tab);
      if (tab === "users") await page.getByRole("button", { name: /Maria Learner/ }).click();
      if (tab === "companies")
        await page.getByRole("button", { name: "Manage team" }).first().click();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `.claude/verify/owner/${tab}-${name}.png`, fullPage: true });
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
    await context.close();
  }
});
