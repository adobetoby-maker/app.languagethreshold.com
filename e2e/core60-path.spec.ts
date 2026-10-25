import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { MASTER_ROOFING_LESSONS } from "../src/data/master-roofing-curriculum";
import { appUrl, core30Key, seedAppState } from "./app-state";

// The Core 60 path (Foundation, Core 30, Master 20) at the top of every Roofing stage page, and
// the Roofing Master 20 page itself: 70-day plan, "Master · Lesson N" labels, grammar focus, no
// exams link. The Foundation page needs an account, so its half of the path is covered in
// foundation.spec.ts. Runs as a guest (the pilot is free); progress is seeded into the profile envelope.
//
// The assertions that need the Master lessons (the plan card's "Learn all 20 lessons", "Day 1 of
// 70" with a Lesson 1 to open, the grammar focus) are skipped while MASTER_ROOFING_LESSONS is
// empty and run as soon as the content lands.

const FOUNDATION = "foundation-roofing";
const MASTER = "master-roofing";
const HAS_MASTER_CONTENT = MASTER_ROOFING_LESSONS.length > 0;

const pad = (n: number) => String(n).padStart(2, "0");
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function masteredLog(count: number, startDate?: string) {
  const lessons: Record<string, unknown> = {};
  for (let n = 1; n <= count; n++) {
    lessons[String(n)] = { visits: {}, masteredAt: "2026-03-02T12:00:00.000Z" };
  }
  return { ...(startDate ? { startDate } : {}), lessons };
}

/**
 * Opens a module's Core 30 page with `core30Log` in the saved profile. The profile is written
 * after the first load and again (up to three times) until the app keeps it, because a cold dev
 * server can finish loading after the seed and save its own state over it.
 */
async function openStage(
  page: Page,
  moduleId: string,
  core30Log: Record<string, unknown>,
  ready: string,
  purchasedModules: string[] = [FOUNDATION, "roofing", MASTER],
) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      onboardingComplete: true,
      activeModuleId: moduleId,
      purchasedModules,
      selectedLanguage: "Spanish",
      nativeLanguage: "English",
      currentTab: "core30",
      core30Log,
    });
    await page.goto(appUrl({ tab: "core30", module: moduleId }));
    if (ready === "core30-plan-card") {
      await page.getByTestId("study-options").locator(":scope > summary").click();
    }
    await page
      .getByTestId(ready)
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    if (await page.getByTestId(ready).isVisible()) return;
  }
  await expect(page.getByTestId(ready)).toBeVisible();
}

test.describe("Core 60 path", () => {
  test("Roofing page: three compact levels in order, Core is current", async ({ page }) => {
    await openStage(
      page,
      "roofing",
      {
        [core30Key(FOUNDATION)]: masteredLog(3),
        [core30Key("roofing")]: masteredLog(5, today()),
        [core30Key(MASTER)]: masteredLog(2),
      },
      "core60-path",
    );
    const path = page.getByTestId("core60-path");
    const steps = path.locator("li");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Foundation");
    await expect(steps.nth(1)).toContainText("Core");
    await expect(steps.nth(2)).toContainText("Master");

    // The current stage is not a button; the other two are.
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-core")).not.toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-foundation")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-master")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-foundation")).not.toHaveAttribute("aria-current");

    // The eyebrow names the trade and the step above the stage heading.
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Roofing · Step 2 of 3");

    // All three levels share one row with equal-height touch targets.
    const rects = await steps.evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, height: box.height };
      }),
    );
    if (rects[0].top === rects[1].top) {
      expect(Math.abs(rects[0].height - rects[1].height)).toBeLessThanOrEqual(1);
      expect(Math.abs(rects[1].height - rects[2].height)).toBeLessThanOrEqual(1);
      const buttonHeights = await page
        .locator('[data-testid^="core60-step-"]:not([data-testid$="-count"])')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
      expect(Math.abs(buttonHeights[0] - buttonHeights[1])).toBeLessThanOrEqual(1);
      expect(Math.abs(buttonHeights[1] - buttonHeights[2])).toBeLessThanOrEqual(1);
    } else {
      expect(rects[1].top).toBeGreaterThan(rects[0].top);
    }

    // The selector is compact; optional scheduling starts collapsed.
    const pathBox = await path.boundingBox();
    expect(pathBox!.height).toBeLessThan(100);
    await expect(page.getByTestId("study-options")).not.toHaveAttribute("open");
    await expect(page.getByTestId("core30-plan-card")).not.toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("tapping Master opens the Master page, with its own heading, no exams and no How Core 30 works", async ({
    page,
  }) => {
    await openStage(page, "roofing", {}, "core60-path");
    await page.getByTestId("core60-step-master").click();
    await expect(page).toHaveURL(/module=master-roofing/);
    await expect(page.getByRole("heading", { name: "The Roofing Master 20" })).toBeVisible();
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Roofing · Step 3 of 3");
    await expect(page.getByText(/^By Lesson 20, you can train a new roofer/)).toBeVisible();
    await expect(page.getByTestId("core60-step-master")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-core")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByText("Entrance, day 45 and day 90 exams")).toHaveCount(0);
    await expect(page.getByTestId("core30-how-link")).toHaveCount(0);
    // No beginner nudge off the Core 30 page.
    await expect(page.getByText("New to Spanish? Start here.")).toHaveCount(0);
    // The page banner names the stage.
    const banner = page.getByRole("region", { name: /purpose/i }).first();
    await expect(banner).toContainText("Core 60 · Master");
    await expect(banner).toContainText("Twenty lessons for the day that doesn't go as planned.");
    // The way back: Core 30 is a button again.
    await page.getByTestId("core60-step-core").click();
    await expect(page.getByRole("heading", { name: "The Roofing Supervisor Core 30" })).toBeVisible();
  });
});

test.describe("Roofing Master 20 page", () => {
  test("a plan started today shows Day 1 of 70 and no exams prompt", async ({ page }) => {
    await openStage(page, MASTER, { [core30Key(MASTER)]: masteredLog(0, today()) }, "core30-plan-card");
    await expect(page.getByTestId("core30-plan-card")).toContainText("Day 1 of 70");
    await expect(page.getByText("Entrance, day 45 and day 90 exams")).toHaveCount(0);
  });
});

test.describe("Roofing Master 20 lessons", () => {
  test.skip(!HAS_MASTER_CONTENT, "Master lessons have not landed yet (MASTER_ROOFING_LESSONS is empty)");

  test("shows the 70-day plan, starts at Day 1 of 70, and Lesson 1 is a Master lesson with a grammar focus", async ({
    page,
  }) => {
    await openStage(page, MASTER, {}, "core30-plan-card");
    const card = page.getByTestId("core30-plan-card");
    await expect(card).toContainText("70-day plan");
    await expect(card).toContainText("Learn all 20 lessons in 70 days");
    await expect(card).toContainText("Two new lessons a week.");
    await expect(page.getByTestId("core30-start-plan")).toHaveText("Start lessons");
    await page.getByTestId("core30-start-plan").click();
    await expect(card).toContainText("Day 1 of 70");
    await expect(page.getByText(/Your next lesson · Master Lesson 1/)).toBeVisible();

    await page.getByRole("button", { name: /Today: Master Lesson 1|Start Master Lesson 1/ }).first().click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByText(/Master · Lesson 1 · /)).toBeVisible();
    // The runner's previous / next buttons carry the stage: "Master 2", not a bare "Lesson 2".
    const nav = page.getByTestId("lesson-nav-top");
    await expect(nav.getByRole("button", { name: "Next lesson: Master 2" })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Lesson / })).toHaveCount(0);
    if (MASTER_ROOFING_LESSONS[0].grammar) {
      const grammar = page.getByTestId("lesson-grammar-focus");
      await expect(grammar).toBeVisible();
      await expect(grammar).toContainText("Grammar focus");
      await expect(grammar).toContainText(MASTER_ROOFING_LESSONS[0].grammar.focus);
      for (const example of MASTER_ROOFING_LESSONS[0].grammar.examples) {
        await expect(grammar).toContainText(example.es);
        await expect(grammar).toContainText(example.en);
      }
    }
  });
});

test.describe("Grammar focus box", () => {
  test("is absent from a lesson without grammar (Roofing Lesson 1)", async ({ page }) => {
    await openStage(page, "roofing", { [core30Key("roofing")]: masteredLog(0, today()) }, "core30-plan-card");
    await page.getByRole("button", { name: /Today: Lesson 1|Start Lesson 1/ }).first().click();
    await expect(page.getByTestId("lesson-section-see")).toBeVisible();
    await expect(page.getByTestId("lesson-grammar-focus")).toHaveCount(0);
  });
});

test.describe("Core 30 page of a module with a published Foundation and Master (plumber)", () => {
  test("the banner is the whole Core 60 purpose text, and the path has Foundation and Master 20 open", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await seedAppState(page, {
        onboardingComplete: true,
        activeModuleId: "plumber",
        purchasedModules: ["plumber"],
        selectedLanguage: "Spanish",
        nativeLanguage: "English",
        currentTab: "core30",
      });
      await page.goto(appUrl({ tab: "core30", module: "plumber" }));
      const banner = page.getByRole("region", { name: /purpose/i }).first();
      await banner.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
      if (await banner.isVisible()) break;
    }
    const banner = page.getByRole("region", { name: /purpose/i }).first();
    // Both stages are published and listed, so no "coming soon" banner: the page keeps the whole Core 60 text.
    await expect(banner).toContainText(
      "Core 60 — Your module, step by step: the free Foundation, then Core 30, then Master 20.",
    );
    await expect(banner).not.toContainText("coming soon");
    // A trade with both stages published has a full path: Foundation open, Core 30 current, Master 20 open.
    const steps = page.getByTestId("core60-path").locator("li");
    await expect(steps).toHaveCount(3);
    const foundation = page.getByTestId("core60-step-foundation");
    await expect(foundation).toHaveJSProperty("tagName", "BUTTON");
    const master = page.getByTestId("core60-step-master");
    await expect(master).toHaveJSProperty("tagName", "BUTTON");
    await expect(master).not.toContainText("Coming soon");
    await expect(master).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Plumber · Step 2 of 3");
  });
});

// ─── Data-driven stages (src/data/core60) ──────────────────────────────────────
// The synthetic fixture trades in tests/fixtures/core60 ("test": Foundation + Master;
// "test-partial": Master only) are injected into the page before the app loads
// (window.__CORE60_FIXTURE__, read only by a dev build: src/data/core60-stages.ts), so the
// generated-stage path is exercised end to end without shipping fixture data.

function core60Fixture() {
  const dir = resolve("tests/fixtures/core60");
  const read = (file: string) => JSON.parse(readFileSync(resolve(dir, file), "utf8"));
  const fixture = read("fixture.json");
  const files: Record<string, unknown> = {};
  for (const id of ["foundation-test", "master-test", "master-test-partial"]) {
    files[id] = read(`es/${id}.json`);
  }
  return { ...fixture, files };
}

async function openFixtureStage(
  page: Page,
  moduleId: string,
  core30Log: Record<string, unknown>,
  ready: string,
) {
  await page.addInitScript((fixture) => {
    (window as unknown as { __CORE60_FIXTURE__: unknown }).__CORE60_FIXTURE__ = fixture;
  }, core60Fixture());
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      onboardingComplete: true,
      activeModuleId: moduleId,
      purchasedModules: ["test", "foundation-test", "master-test", "test-partial", "master-test-partial"],
      selectedLanguage: "Spanish",
      nativeLanguage: "English",
      currentTab: "core30",
      core30Log,
    });
    await page.goto(appUrl({ tab: "core30", module: moduleId }));
    if (ready === "core30-plan-card") {
      await page.getByTestId("study-options").locator(":scope > summary").click();
    }
    await page
      .getByTestId(ready)
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    if (await page.getByTestId(ready).isVisible()) return;
  }
  await expect(page.getByTestId(ready)).toBeVisible();
}

test.describe("Data-driven Core 60 stage (fixture trade)", { tag: "@dev-only" }, () => {
  test("a generated Master loads on open and renders through the path, plan and lesson runner", async ({
    page,
  }) => {
    await openFixtureStage(page, "master-test", {}, "core30-plan-card");
    await expect(page.getByTestId("core60-stage-loading")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "The Test Trade Master 20" })).toBeVisible();
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Test Trade · Step 3 of 3");
    const steps = page.getByTestId("core60-path").locator("li");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Foundation");
    await expect(steps.nth(2)).toContainText("Master");
    await expect(page.getByTestId("core60-step-master")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-foundation")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByText("Entrance, day 45 and day 90 exams")).toHaveCount(0);

    const card = page.getByTestId("core30-plan-card");
    await expect(card).toContainText("Learn all 20 lessons in 70 days");
    await page.getByTestId("core30-start-plan").click();
    await expect(card).toContainText("Day 1 of 70");
    await page.getByRole("button", { name: /Today: Master Lesson 1|Start Master Lesson 1/ }).first().click();
    await expect(page.getByText(/Master · Lesson 1 · /)).toBeVisible();
    await expect(page.getByTestId("lesson-nav-top").getByRole("button", { name: "Next lesson: Master 2" })).toBeVisible();
    const grammar = page.getByTestId("lesson-grammar-focus");
    await expect(grammar).toContainText("Fixture grammar focus 1");
    await expect(grammar).toContainText("Ejemplo uno 1.");
    await expect(grammar).toContainText("Example two 1.");
  });

  test("the Foundation step opens the generated Foundation, free with an account", async ({ page }) => {
    await openFixtureStage(page, "master-test", {}, "core60-path");
    await page.getByTestId("core60-step-foundation").click();
    await expect(page).toHaveURL(/module=foundation-test/);
    // A guest gets the free-account prompt (never the paid trial), named after the derived module.
    const prompt = page.getByTestId("foundation-signin-prompt");
    await expect(prompt).toContainText("Free with a free account");
    await expect(prompt).toContainText("The Test Trade Foundation is free.");
    await expect(page.getByText("Start Free Trial")).toHaveCount(0);
  });

  test("a stage that is not listed yet shows Coming soon and cannot be opened", async ({ page }) => {
    await openFixtureStage(page, "master-test-partial", {}, "core60-path");
    await expect(page.getByRole("heading", { name: "The Partial Trade Master 20" })).toBeVisible();
    const foundation = page.getByTestId("core60-step-foundation");
    await expect(foundation).toContainText("Coming soon");
    await expect(foundation).toHaveAttribute("aria-disabled", "true");
    await expect(foundation).toHaveJSProperty("tagName", "DIV");
    await expect(page.getByTestId("core60-step-core")).toHaveJSProperty("tagName", "BUTTON");
  });
});

// The coming-soon banner text of src/lib/core60-path.ts (CORE30_WITHOUT_PATH_TEXT).
const CORE30_WITHOUT_PATH_TEXT =
  "Core 30 is ready for this module. The free Foundation and Master 20 are coming soon.";

// ─── Pilot: the generated Electrician stages (src/data/core60/es) ───────────────
// Written by scripts/build-core60.mts and listed in src/data/core60/manifest.ts. Both Opus stages
// ship, so the Electrician Core 30 page shows Foundation and Master 20 open, Core 30 current.

const ELECTRICIAN_STAGES = ["foundation-electrician", "electrician", "master-electrician"];

test.describe("Generated Electrician Core 60 (pilot)", () => {
  test("the Electrician page shows Foundation open, Core 30 current and Master 20 open", async ({
    page,
  }) => {
    await openStage(page, "electrician", {}, "core60-path", ELECTRICIAN_STAGES);
    const steps = page.getByTestId("core60-path").locator("li");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Foundation");
    await expect(steps.nth(1)).toContainText("Core");
    await expect(steps.nth(2)).toContainText("Master 20");
    const foundation = page.getByTestId("core60-step-foundation");
    await expect(foundation).toHaveJSProperty("tagName", "BUTTON");
    await expect(foundation).not.toContainText("Coming soon");
    const master = page.getByTestId("core60-step-master");
    await expect(master).toHaveJSProperty("tagName", "BUTTON");
    await expect(master).not.toContainText("Coming soon");
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Electrician · Step 2 of 3");
    await expect(page.getByText(CORE30_WITHOUT_PATH_TEXT)).toHaveCount(0);
  });

  test("the Electrician banner no longer says any stage is coming soon", async ({ page }) => {
    await openStage(page, "electrician", {}, "tool-purpose", ELECTRICIAN_STAGES);
    const banner = page.getByTestId("tool-purpose");
    await expect(banner).toBeVisible();
    await expect(banner).not.toContainText("coming soon");
  });

  test("the Master 20 step opens the Electrician Master", async ({ page }) => {
    await openStage(page, "electrician", {}, "core60-path", ELECTRICIAN_STAGES);
    await page.getByTestId("core60-step-master").click();
    await expect(page).toHaveURL(/module=master-electrician/);
  });

  test("the Foundation step opens the Electrician Foundation, free with an account", async ({ page }) => {
    await openStage(page, "electrician", {}, "core60-path", ELECTRICIAN_STAGES);
    await page.getByTestId("core60-step-foundation").click();
    await expect(page).toHaveURL(/module=foundation-electrician/);
    const prompt = page.getByTestId("foundation-signin-prompt");
    await expect(prompt).toContainText("Free with a free account");
    await expect(prompt).toContainText("The Electrician Foundation is free.");
    await expect(page.getByText("Start Free Trial")).toHaveCount(0);
  });
});

// ─── A stage chunk that fails to load, and the banner for a half-built path ─────────────────────

// The Foundation page is behind a free account, so this test signs in with a made-up Supabase
// session written into localStorage (the same approach as foundation.spec.ts: the client reads it
// as a signed-in user without any request, so no real account is involved).
const SUPABASE_REF = "pollhlkgltdkdskdzsgd";
const FAKE_USER_ID = "00000000-0000-4000-8000-000000000f00";

function fakeSession() {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const user = {
    id: FAKE_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "core60-e2e@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  };
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: FAKE_USER_ID, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 60 * 60 * 24,
    expires_at: exp,
    user,
  };
}

/** Opens a stage's Core 30 tab as the made-up signed-in learner (profile seeded like openStage). */
async function openStageSignedIn(page: Page, moduleId: string, ready: string) {
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: `sb-${SUPABASE_REF}-auth-token`, session: fakeSession() },
  );
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.waitForTimeout(4000);
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(
      ({ id, user }) => {
        const key = `lt.profile-device.v1.user.${encodeURIComponent(user)}`;
        const previous = JSON.parse(localStorage.getItem(key) || "null");
        const data = {
          ...(previous?.data ?? {}),
          onboardingComplete: true,
          activeModuleId: id,
          purchasedModules: [id],
          selectedLanguage: "Spanish",
          nativeLanguage: "English",
          currentTab: "core30",
          core30Log: {},
        };
        localStorage.setItem(key, JSON.stringify({ schema: 1, userId: user, data }));
      },
      { id: moduleId, user: FAKE_USER_ID },
    );
    await page.goto(appUrl({ tab: "core30", module: moduleId }));
    if (ready === "core30-plan-card") {
      await page.getByTestId("study-options").locator(":scope > summary").click();
    }
    await page
      .getByTestId(ready)
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    if (await page.getByTestId(ready).isVisible()) return;
  }
  await expect(page.getByTestId(ready)).toBeVisible();
}

test.describe("Core 60 stage load failure", { tag: "@dev-only" }, () => {
  test("a stage chunk that fails once shows a clear error, and Retry loads it", async ({ page }) => {
    // Abort the Electrician Foundation chunk until the test presses Retry. Aborting only the first
    // request raced openStageSignedIn: on a cold dev server it re-navigates after 15s, the second
    // request loaded, and the error never showed.
    let aborted = 0;
    let requests = 0;
    let release = false;
    await page.route(/\/core60\/es\/foundation-electrician\.json/, async (route) => {
      requests += 1;
      if (!release) {
        aborted += 1;
        await route.abort("failed");
        return;
      }
      await route.continue();
    });
    await openStageSignedIn(page, "foundation-electrician", "core60-stage-error");
    expect(aborted).toBeGreaterThanOrEqual(1);
    // The error names the problem and offers Retry; it is not the generic "Choose a module" card.
    const error = page.getByTestId("core60-stage-error");
    await expect(error).toContainText("Couldn't load this stage. Check your connection and try again.");
    await expect(page.getByText("Each module has a 30-lesson path")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Choose a module" })).toHaveCount(0);
    await expect(page.getByTestId("core60-stage-loading")).toHaveCount(0);
    await expect(page.getByTestId("core30-plan-card")).toHaveCount(0);

    release = true;
    await page.getByTestId("core60-stage-retry").click();
    await page.getByTestId("study-options").locator(":scope > summary").click();
    await expect(page.getByTestId("core30-plan-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The Electrician Foundation" })).toBeVisible();
    await expect(page.getByTestId("core60-stage-error")).toHaveCount(0);
    expect(requests).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Core 30 banner on a path with one live stage", { tag: "@dev-only" }, () => {
  test("names the stage that is ready instead of saying both are coming soon", async ({ page }) => {
    // "test-partial" lists a Master only; its Foundation is Coming soon (fixture trade).
    await openFixtureStage(page, "test-partial", {}, "tool-purpose");
    const banner = page.getByTestId("tool-purpose");
    await expect(banner).toContainText("Master 20 is ready; the free Foundation is coming soon.");
    await expect(banner).not.toContainText("The free Foundation and Master 20 are coming soon");
  });
});
