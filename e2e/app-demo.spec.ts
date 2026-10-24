import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState, readAppState, core30Key } from "./app-state";

async function openDemo(page: Page) {
  await page.goto("/");
  await seedAppState(page, {
    activeModuleId: "roofing",
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    currentTab: "guide",
    onboardingComplete: true,
    core30Log: {
      [core30Key("roofing")]: {
        lessons: { "1": { visits: { "way:see": "2026-10-20T12:00:00Z" } } },
      },
    },
    lessonProgress: { [core30Key("roofing")]: 1 },
    lessonsCompleted: 1,
  });
  await page.evaluate(() => localStorage.setItem("lt.languageChosen", "1"));
  await page.goto(appUrl({ tab: "guide", module: "roofing" }));
  await page.getByRole("button", { name: "Start walkthrough", exact: true }).click();
  await expect(page.getByTestId("app-demo")).toBeVisible();
}

test("walkthrough opens real screens, goes back, exits and leaves learning records intact", async ({
  page,
}) => {
  await openDemo(page);
  const panel = page.getByTestId("app-demo");
  const before = await readAppState(page);
  expect(before.core30Log).toHaveProperty([core30Key("roofing")]);
  expect(before.lessonsCompleted).toBe(1);
  for (const tab of ["core30", "reader", "flashcards", "games", "speak", "dashboard"]) {
    await expect(page).toHaveURL(new RegExp("tab=" + tab));
    await expect(page.locator(`[data-demo-screen="${tab}"]`)).toBeAttached();
    await expect(panel).toHaveCount(1);
    if (tab !== "dashboard") await panel.getByRole("button", { name: "Next", exact: true }).click();
  }
  await panel.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/tab=speak/);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page).toHaveURL(/tab=guide/);
  const after = await readAppState(page);
  for (const key of ["core30Log", "lessonProgress", "lessonsCompleted"])
    expect(after[key]).toEqual(before[key]);
});

test("opt-in playback advances across lazy screens, pauses and cancels on exit", async ({
  page,
}) => {
  await openDemo(page);
  const panel = page.getByTestId("app-demo");
  await expect(page.locator('[data-demo-screen="core30"]')).toBeAttached();
  await page.clock.install();
  await panel.getByRole("button", { name: "Play demo", exact: true }).click();
  await page.clock.fastForward(9100);
  await expect(page).toHaveURL(/tab=reader/);
  await expect(page.locator('[data-demo-screen="reader"]')).toBeAttached();
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.clock.fastForward(9100);
  await expect(page).toHaveURL(/tab=flashcards/);
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.fastForward(20000);
  await expect(page).toHaveURL(/tab=flashcards/);
  await panel.getByRole("button", { name: "Exit demo" }).click();
  await page.clock.fastForward(20000);
  await expect(page).toHaveURL(/tab=guide/);
  await expect(panel).toHaveCount(0);
});

test("manual navigation pauses playback and core demo has five stops", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "iphone-pwa",
    "Desktop navigation; phone controls covered by both walkthrough tests.",
  );
  await openDemo(page);
  const panel = page.getByTestId("app-demo");
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await panel.getByRole("button", { name: "Play demo", exact: true }).click();
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Play demo", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/tab=guide/);
  await page.getByRole("button", { name: "Start walkthrough", exact: true }).click();
  await expect(page).toHaveURL(/tab=core30/);
  await expect(panel).toContainText("1 / 6");
  // A fresh core navigation uses the five-screen general learning loop.
  await page.getByRole("button", { name: "Exit demo" }).click();
  await page.goto(appUrl({ tab: "guide", module: null }));
  await page.getByRole("button", { name: "Start walkthrough", exact: true }).click();
  await expect(panel).toContainText("1 / 5");
  await panel.getByRole("button", { name: "Exit demo" }).click();
});
