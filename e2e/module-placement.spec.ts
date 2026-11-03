import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { placementBlocks } from "../src/lib/module-placement";
import { readAppState as readProfile, core30Key } from "./app-state";
const userId = "00000000-0000-4000-8000-00000000a061";
const readAppState = (page: Page) => readProfile(page, userId);
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
async function open(page: Page, moduleId = "foundation-spanish-basics") {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "placement-e2e@example.test",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
  await page.addInitScript(
    ({ session, userId }) => {
      localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      const key = `lt.profile-device.v1.user.${userId}`;
      const old = localStorage.getItem("lt.profile-device.v1.guest");
      if (!localStorage.getItem(key) && old)
        localStorage.setItem(key, JSON.stringify({ ...JSON.parse(old), userId }));
    },
    { session, userId },
  );
  await page.addInitScript(
    ({ moduleId, userId }) => {
      const key = `lt.profile-device.v1.user.${userId}`;
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: 1,
            userId,
            data: {
              onboardingComplete: true,
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: [moduleId],
            },
          }),
        );
    },
    { moduleId, userId },
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic local test account" }),
    }),
  );
  await page.goto(`/?module=${moduleId}&target=Spanish&native=English&tab=core30`);
  await page.getByRole("button", { name: "Take placement test", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("question 1 of 10", { exact: false })).toBeVisible();
}
async function questions(page: Page) {
  const attempt = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((k) => k.includes("module-placement-v1"));
    return JSON.parse(sessionStorage.getItem(key!)!);
  });
  const stage = read("src/data/core60/es/foundation-spanish-basics.json");
  const checks = read("src/data/spanish-basics-practice.json")[stage.module];
  return placementBlocks(
    stage.lessons.map((l: { n: number }) => ({
      ...l,
      moduleId: stage.module,
      stage: "foundation",
      checks: checks[String(l.n)].checks,
    })),
    attempt.seed,
  );
}
test("first weak block recommends lesson 1 without changing progress, and the test resumes", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "I don’t know", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Take placement test", exact: true }).click();
  await expect(page.getByText("question 2 of 10", { exact: false })).toBeVisible();
  for (let i = 1; i < 10; i++)
    await page.getByRole("button", { name: "I don’t know", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start at Foundation Lesson 1", exact: true }),
  ).toBeVisible();
  expect((await readAppState(page)).core30Log ?? {}).toEqual({});
  await expect(page.getByRole("button", { name: /Take credit for/ })).toHaveCount(0);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
test("passed block gives opt-in credit, persists it, and opens the recommended lesson", async ({
  page,
}, info) => {
  await open(page);
  const blocks = await questions(page);
  for (const question of blocks[0].questions) {
    if (question.type === "choice")
      await page
        .getByRole("radio", {
          name: `${String.fromCharCode(65 + question.options!.indexOf(question.answer))}. ${question.answer}`,
          exact: true,
        })
        .check();
    else
      await page
        .getByLabel("Type the missing word or phrase.", { exact: false })
        .fill(question.answer);
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  }
  for (let i = 0; i < 10; i++)
    await page.getByRole("button", { name: "I don’t know", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start at Foundation Lesson 6", exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      theme,
    );
    await page.waitForTimeout(250);
    expect(await page.getByRole("dialog").evaluate((el) => el.scrollTop)).toBe(0);
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({
      path: `/tmp/module-placement-result-${info.project.name}-${theme}.png`,
    });
  }
  expect((await readAppState(page)).core30Log ?? {}).toEqual({});
  await page
    .getByRole("button", { name: "Take credit for 5 earlier lessons", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep my progress unchanged", exact: true }).click();
  expect((await readAppState(page)).core30Log ?? {}).toEqual({});
  await page
    .getByRole("button", { name: "Take credit for 5 earlier lessons", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm completion credit", exact: true }).click();
  await expect
    .poll(async () => (await readAppState(page)).lessonProgress)
    .toEqual({ [core30Key("foundation-spanish-basics")]: 5 });
  const state = await readAppState(page);
  expect(
    Object.keys(
      (state.core30Log![core30Key("foundation-spanish-basics")] as { lessons: object }).lessons,
    ),
  ).toHaveLength(5);
  await page.reload();
  await expect(page.getByText("5 completed by placement credit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Take placement test", exact: true }).click();
  await expect(
    page.getByText("These lessons are already complete in your independent progress.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start recommended lesson", exact: true }).click();
  await expect(page).toHaveURL(/lesson=6/);
});
for (const moduleId of [
  "foundation-spanish-102",
  "foundation-spanish-cognates",
  "foundation-roofing",
]) {
  test(`${moduleId} has usable checks`, async ({ page }) => {
    await open(page, moduleId);
    await expect(page.getByRole("radio")).toHaveCount(4);
    await page.getByRole("button", { name: "I don’t know", exact: true }).click();
    await expect(
      page.getByLabel("Type the missing word or phrase.", { exact: false }),
    ).toBeVisible();
  });
}

test("@dev-only runtime loader covers every Spanish course and rejects borrowed language data", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop" || !!process.env.E2E_BASE_URL,
    "Source-module audit runs locally once.",
  );
  await open(page);
  const result = await page.evaluate(async () => {
    const loaderPath = "/src/lib/module-placement-loader.ts";
    const modulesPath = "/src/data/modules.ts";
    const { loadModulePlacement } = await import(loaderPath);
    const { MODULES, moduleSupportsLearningPair } = await import(modulesPath);
    const modules = MODULES.filter(
      (m: { id: string }) =>
        !/^(foundation|master)-/.test(m.id) && moduleSupportsLearningPair(m, "Spanish", "English"),
    );
    const coverage = [];
    for (const m of modules) {
      const data = await loadModulePlacement(m.id, "Spanish", "English", "runtime-audit");
      coverage.push({
        id: m.id,
        lessons: data.totalLessons,
        covered: data.blocks.flatMap((b: { lessons: unknown[] }) => b.lessons).length,
      });
    }
    let frenchBlocks = 0;
    try {
      frenchBlocks = (await loadModulePlacement("roofing", "French", "English", "runtime-audit"))
        .blocks.length;
    } catch {
      /* Unsupported catalog pair is also correctly rejected. */
    }
    let rejected = false;
    try {
      await loadModulePlacement("spanish-basics", "Spanish", "Spanish", "runtime-audit");
    } catch {
      rejected = true;
    }
    return { coverage, frenchBlocks, rejected };
  });
  expect(result.coverage).toHaveLength(67);
  for (const row of result.coverage) expect(row.covered, row.id).toBe(row.lessons);
  expect(result.frenchBlocks).toBe(0);
  expect(result.rejected).toBe(true);
});
