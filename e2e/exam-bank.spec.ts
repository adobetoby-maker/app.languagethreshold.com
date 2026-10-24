// Built by TAC — 2026-10-23
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Owner exam-bank page with /api/exam-bank mocked: no real owner session, database or bank content
// is used (every string is synthetic). The real server-side owner gate and approval guards are
// covered by tests/exams2-api.test.mjs and tests/exams2-routes.test.mjs.
// @dev-only: needs the local dev server (the API mocks never reach production).

const SUPABASE_REF = "pollhlkgltdkdskdzsgd";
const OWNER_ID = "00000000-0000-4000-8000-0000000000aa";
const SHA = "0123456789abcdef".repeat(4);

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

const review = (reviewer: string, extra: Record<string, unknown> = {}) => ({
  reviewer,
  at: "2026-10-23T12:00:00.000Z",
  current: true,
  independent: true,
  accept: 300,
  revise: 0,
  reject: 0,
  missing: 0,
  ...extra,
});
const draft = {
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  version: "v2",
  status: "draft",
  sha256: SHA,
  shaVerified: true,
  approvedBy: null,
  approvedAt: null,
  approvedSha256: null,
  createdAt: "2026-10-23T10:00:00.000Z",
  counts: {
    items: 300,
    lessons: 30,
    phases: 6,
    forms: { A: 30, B: 30, C: 60 },
    diagnosticPool: 180,
    byType: { mc: 180, typed: 90, match: 30 },
  },
  reviews: [review("reviewer-agent-1"), review("reviewer-agent-2")],
  blockers: [] as string[],
  warnings: 0,
  approvable: true,
};
const approved = {
  ...draft,
  version: "v1",
  status: "approved",
  sha256: "f".repeat(64),
  approvedBy: OWNER_ID,
  approvedAt: "2026-10-01T09:00:00.000Z",
  approvedSha256: "f".repeat(64),
  approvable: false,
};
const blocked = {
  ...draft,
  version: "v3",
  sha256: "e".repeat(64),
  reviews: [review("reviewer-agent-1", { revise: 2, accept: 298 })],
  blockers: ["reviews.too_few", "review.revise_pending"],
  approvable: false,
};
const choice = (id: string, text: string, right: boolean) => ({
  id,
  text,
  right,
  ...(right ? {} : { why: `Synthetic rationale ${id}.` }),
});
const preview = {
  phases: [
    { id: "phase-1", title: "Synthetic phase 1", lessons: [1, 2, 3, 4, 5] },
    { id: "phase-2", title: "Synthetic phase 2", lessons: [6, 7, 8, 9, 10] },
  ],
  lessons: [1, 2, 6].map((lesson) => ({ lesson, title: `Synthetic lesson ${lesson}` })),
  forms: {
    A: ["roofing.L01.i01"],
    B: ["roofing.L02.i04"],
    C: ["roofing.L01.i02"],
    diagnostic: ["roofing.L06.i06"],
  },
  items: [
    {
      id: "roofing.L01.i01",
      rev: 1,
      lesson: 1,
      skill: "recognize",
      difficulty: 1,
      type: "mc",
      placement: "A",
      prompt: "Synthetic mc prompt for lesson 1.",
      choices: [
        choice("a", "syn-alder-a", true),
        choice("b", "syn-alder-b", false),
        choice("c", "syn-alder-c", false),
        choice("d", "syn-alder-d", false),
      ],
      explanation: "Synthetic explanation for lesson 1 item 1.",
      sourceRefs: ["syn-ref-1"],
      author: "author-agent-1",
    },
    {
      id: "roofing.L01.i02",
      rev: 2,
      lesson: 1,
      skill: "recall",
      difficulty: 1,
      type: "typed",
      placement: "C",
      prompt: "Synthetic typed prompt for lesson 1.",
      context: "Synthetic crew line.",
      answers: ["syn-birch-ans", "syn-birch-alt"],
      accentsRequired: true,
      explanation: "Synthetic explanation for lesson 1 item 2.",
      sourceRefs: ["syn-ref-1"],
      author: "author-agent-1",
    },
    {
      id: "roofing.L02.i04",
      rev: 1,
      lesson: 2,
      skill: "use",
      difficulty: 2,
      type: "match",
      placement: "B",
      prompt: "Synthetic match prompt for lesson 2.",
      pairs: [1, 2, 3, 4].map((n) => ({ left: `syn left ${n}`, right: `syn right ${n}` })),
      explanation: "Synthetic explanation for lesson 2 item 4.",
      sourceRefs: ["syn-ref-2"],
      author: "author-agent-2",
    },
    {
      id: "roofing.L06.i06",
      rev: 1,
      lesson: 6,
      skill: "understand",
      difficulty: 3,
      type: "mc",
      placement: "diagnostic",
      prompt: "Synthetic check-pool prompt for lesson 6.",
      choices: [
        choice("a", "syn-cedar-a", false),
        choice("b", "syn-cedar-b", true),
        choice("c", "syn-cedar-c", false),
        choice("d", "syn-cedar-d", false),
      ],
      explanation: "Synthetic explanation for lesson 6 item 6.",
      sourceRefs: ["syn-ref-6"],
      author: "author-agent-2",
    },
  ],
};

type Posted = Record<string, unknown>;
async function openBanks(page: Page) {
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
    if (url.pathname !== "/api/exam-bank")
      return route.fulfill({ status: 404, json: { error: "unmocked " + url.pathname } });
    if (route.request().method() === "POST") {
      posted.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true, notice: "Approved roofing v2.", retired: ["v1"] } });
    }
    const version = url.searchParams.get("version");
    if (version) {
      const bank = [draft, approved, blocked].find((entry) => entry.version === version);
      return route.fulfill({ json: { bank, preview } });
    }
    return route.fulfill({ json: { banks: [approved, draft, blocked] } });
  });
  await page.goto("/exam-bank");
  await expect(page.getByRole("heading", { name: "Exam banks" })).toBeVisible({ timeout: 60_000 });
  return posted;
}
const card = (page: Page, version: string) =>
  page.getByRole("region", { name: `roofing ${version}`, exact: true });

test("lists banks with status, sha, counts and review summaries without horizontal scroll", async ({
  page,
}) => {
  await openBanks(page);
  await expect(card(page, "v1")).toContainText("approved");
  await expect(card(page, "v2")).toContainText(SHA);
  await expect(card(page, "v2")).toContainText("30 / 30 / 60");
  await expect(card(page, "v2")).toContainText("reviewer-agent-2");
  await expect(card(page, "v2")).toContainText("Signed against this sha");
  await expect(card(page, "v3")).toContainText("Not ready to approve");
  await expect(card(page, "v3")).toContainText("A reviewer asked for a revision");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

test("preview groups items by phase and lesson, shows answers and filters by form", async ({
  page,
}) => {
  await openBanks(page);
  await card(page, "v2").getByRole("button", { name: "Review items" }).click();
  const draftCard = card(page, "v2");
  await expect(draftCard.getByRole("region", { name: "Synthetic phase 1" })).toBeVisible();
  await expect(draftCard).toContainText("Lesson 1 · Synthetic lesson 1");
  await expect(draftCard).toContainText("syn-birch-ans · syn-birch-alt (accents required)");
  await expect(draftCard).toContainText("Why wrong: Synthetic rationale b.");
  await expect(draftCard).toContainText("syn left 2 → syn right 2");
  await draftCard.getByRole("tab", { name: /Form C/ }).click();
  await expect(draftCard).toContainText("Synthetic typed prompt for lesson 1.");
  await expect(draftCard).not.toContainText("Synthetic mc prompt for lesson 1.");
  await expect(draftCard.getByRole("region", { name: "Synthetic phase 2" })).toHaveCount(0);
  await draftCard.getByRole("tab", { name: /Check pool/ }).click();
  await expect(draftCard.getByRole("region", { name: "Synthetic phase 2" })).toBeVisible();
});

test("approval needs the typed module id and sends the exact sha", async ({ page }) => {
  const posted = await openBanks(page);
  await card(page, "v2").getByRole("button", { name: "Review items" }).click();
  const group = page.getByRole("group", { name: "Approve this version" });
  const approve = group.getByRole("button", { name: "Approve this version" });
  await expect(approve).toBeDisabled();
  await group.getByLabel(/Type the module id/).fill("roofin");
  await expect(approve).toBeDisabled();
  await group.getByLabel(/Type the module id/).fill("roofing");
  await expect(approve).toBeEnabled();
  expect(posted).toHaveLength(0);
  await approve.click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toEqual({
    action: "approve",
    moduleId: "roofing",
    target: "Spanish",
    native: "English",
    version: "v2",
    sha256: SHA,
    confirmModuleId: "roofing",
  });
  await expect(page.getByText("Approved roofing v2.")).toBeVisible();
});

test("a blocked bank cannot be approved from the page", async ({ page }) => {
  const posted = await openBanks(page);
  await card(page, "v3").getByRole("button", { name: "Review items" }).click();
  const group = page.getByRole("group", { name: "Approve this version" });
  await expect(group.getByLabel(/Type the module id/)).toBeDisabled();
  await expect(group.getByRole("button", { name: "Approve this version" })).toBeDisabled();
  expect(posted).toHaveLength(0);
  // Approved versions show no approval control at all.
  await card(page, "v3").getByRole("button", { name: "Hide items" }).click();
  await card(page, "v1").getByRole("button", { name: "Review items" }).click();
  await expect(card(page, "v1").getByText("Synthetic phase 1")).toBeVisible();
  await expect(page.getByRole("group", { name: "Approve this version" })).toHaveCount(0);
});

// Screenshot capture for review (EXAM_SHOTS=1). Light theme, 375x812@2x and 1440x900.
test("capture exam-bank screenshots", async ({ browser }, info) => {
  test.skip(!process.env.EXAM_SHOTS || info.project.name !== "desktop", "capture runs on demand");
  mkdirSync(".claude/verify/exams", { recursive: true });
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
    await openBanks(page);
    await page.screenshot({
      path: `.claude/verify/exams/exam-bank-list-${name}.png`,
      fullPage: true,
    });
    await card(page, "v2").getByRole("button", { name: "Review items" }).click();
    await page.getByLabel(/Type the module id/).fill("roofing");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.claude/verify/exams/exam-bank-preview-${name}.png`,
      fullPage: true,
    });
    await context.close();
  }
});
