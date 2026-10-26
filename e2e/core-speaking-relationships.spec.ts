import { expect, test } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";

test("Core Relationships separates parents, friends and dates without changing learning progress", async ({
  page,
}) => {
  let speakingCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/speak" && request.method() === "POST")
      speakingCalls++;
  });
  await page.goto(appUrl({ tab: "speak", module: "core" }));
  const openCore = () =>
    page.getByText("Choose another mission or change settings", { exact: true }).click();
  await openCore();
  const sections = page.getByLabel("Core speaking sections", { exact: true });
  await expect(sections).toBeVisible();
  const before = await readAppState(page);
  await expect(sections).not.toContainText(/intimacy/i);
  await sections.getByRole("button", { name: /^Relationships/ }).click();
  const filters = page.getByRole("group", { name: "Relationship conversations", exact: true });
  const cards = page.getByTestId("speaking-mission-card");
  await expect(cards).toHaveCount(20);
  await filters.getByRole("button", { name: "Family & parents", exact: true }).click();
  await expect(cards).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "Get to know someone on a first date", exact: true }),
  ).toHaveCount(0);
  await filters.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/relationships-family-${test.info().project.name}.png`,
  });
  await cards
    .filter({ has: page.getByRole("heading", { name: "Check in with your parents", exact: true }) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check in with your parents", exact: true, level: 2 }),
  ).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await expect(
    page.getByText(/Ask how things are going, listen and ask a follow-up question/).first(),
  ).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await expect(page.getByText(/Respectful communication practice only/)).toHaveCount(0);
  await page.getByRole("button", { name: "All missions", exact: true }).click();
  await openCore();
  await filters.getByRole("button", { name: "Friends", exact: true }).click();
  await expect(cards).toHaveCount(5);
  await cards
    .filter({
      has: page.getByRole("heading", { name: "Support a friend having a hard day", exact: true }),
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Support a friend having a hard day",
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await expect(page.getByText(/listen without rushing to fix things/).first()).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await page.getByRole("button", { name: "All missions", exact: true }).click();
  await openCore();
  await filters.getByRole("button", { name: "Dating & partners", exact: true }).click();
  await expect(cards).toHaveCount(11);
  await cards
    .filter({
      has: page.getByRole("heading", { name: "Get to know someone on a first date", exact: true }),
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Get to know someone on a first date",
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await expect(
    page.getByText(/respect any topic the other person prefers not to discuss/).first(),
  ).toBeVisible();
  await page.getByText("Practice settings & reference", { exact: true }).click();
  await page.getByRole("button", { name: "All missions", exact: true }).click();
  await openCore();
  await filters.getByRole("button", { name: "All relationships", exact: true }).click();
  await expect(cards).toHaveCount(20);
  await page.reload();
  await openCore();
  await sections.getByRole("button", { name: /^Relationships/ }).click();
  await expect(cards).toHaveCount(20);
  const after = await readAppState(page);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.activeModuleId).toEqual(before.activeModuleId);
  expect(speakingCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
