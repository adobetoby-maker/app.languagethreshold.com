import { test, expect } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state";
test("dragging, wrong placement, demonstration and pickup sequences", async ({ page }, info) => {
  await page.goto("/place-directions");
  const game = page.getByTestId("place-game");
  await expect(game).toBeVisible();
  await expect(game.getByTestId("placement-command")).toHaveText(
    "Pon el martillo debajo de la mesa.",
  );
  await expect
    .poll(() => game.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(1000);
  await game.getByTestId("movable-tool").click();
  await game.locator("summary").click();
  await game.locator('[data-place="on"]').click();
  await expect(game.getByTestId("placement-feedback")).toContainText("Try again");
  await expect(game.getByTestId("placement-next")).toHaveCount(0);
  await game.getByRole("button", { name: "Show me", exact: true }).click();
  await expect(game.getByTestId("placement-feedback")).toContainText("no point awarded");
  await expect(game.getByTestId("placement-next")).toHaveCount(0);
  await game.getByRole("button", { name: "Your turn", exact: true }).click();
  const tool = game.getByTestId("movable-tool"),
    board = game.getByTestId("placement-board");
  await board.scrollIntoViewIfNeeded();
  const b = await board.boundingBox(),
    t = await tool.boundingBox();
  await page.mouse.move(t!.x + t!.width / 2, t!.y + t!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width * 0.61, b!.y + b!.height * 0.59, { steps: 15 });
  await page.mouse.up();
  await expect(game.getByTestId("placement-feedback")).toContainText("Correct placement");
  await game.getByTestId("placement-next").click();
  await game.getByTestId("movable-tool").click();
  await game.locator('[data-place="inside"]').click();
  await game.getByTestId("placement-next").click();
  await game.getByTestId("movable-tool").click();
  await game.locator('[data-place="on"]').click();
  await game.getByTestId("placement-next").click();
  await expect(game.getByTestId("placement-command")).toContainText("Levanta el destornillador");
  await expect(game.locator('[data-place="outside"]')).toBeDisabled();
  await game.getByTestId("movable-tool").click();
  await game.locator('[data-place="outside"]').click();
  await expect(game.getByTestId("placement-feedback")).toContainText("Correct placement");
  await page.screenshot({ path: `/tmp/place-directions-${info.project.name}.png`, fullPage: true });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => window.innerWidth),
  );
});
test("all stages expose lessons and aligned meanings", async ({ page }) => {
  await page.goto("/place-directions");
  await page.getByRole("button", { name: "Explore all 60 lessons" }).click();
  for (const [stage, count] of [
    ["foundation", 10],
    ["core", 30],
    ["master", 20],
  ] as const) {
    await page.getByRole("button", { name: new RegExp(stage + " ·", "i") }).click();
    await expect(page.locator("select option")).toHaveCount(count);
    await page.locator("select").selectOption(String(count - 1));
    await expect(page.locator("article")).toContainText(
      stage === "master"
        ? "Independent placement mission"
        : stage === "core"
          ? "Placement and route checkpoint"
          : "Ask where and confirm",
    );
  }
});
test("Practice Lab and core lesson both expose the placement game", async ({ page }) => {
  await page.goto("/place-directions");
  await seedAppState(page, {
    onboardingComplete: true,
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    activeModuleId: "place-directions",
    purchasedModules: [
      "place-directions",
      "foundation-place-directions",
      "master-place-directions",
    ],
    currentTab: "games",
  });
  await page.goto(appUrl({ tab: "games", module: "place-directions" }));
  await expect(page.getByRole("heading", { name: "Practice Lab", exact: true })).toBeVisible();
  await page
    .getByText("🧰 Place & Directions · pick up and place objects", { exact: true })
    .click();
  await expect(page.getByTestId("place-game")).toBeVisible();
  await page.goto(appUrl({ tab: "core30", module: "place-directions" }));
  await expect(page.locator("body")).toContainText("Place & Directions");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
  await page.getByText("🧰 Practice placement · picture game", { exact: true }).click();
  await expect(page.getByTestId("place-game")).toBeVisible();
  for (const mode of ["recall", "hear", "type", "say", "write", "see"]) {
    await page.getByTestId(`lesson-nav-${mode}`).click();
    await expect(page.getByTestId(`lesson-nav-${mode}`)).toBeVisible();
    if (mode === "write")
      await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
  }
  await expect(page.getByTestId("lesson-section-see")).toContainText(
    "La caja está debajo de la mesa.",
  );
  await page.getByTestId("lesson-open-full-reader").click();
  await expect(page.getByTestId("reader-options")).toBeVisible();
  await expect(page.locator("body")).toContainText("La caja está debajo de la mesa.");
});
