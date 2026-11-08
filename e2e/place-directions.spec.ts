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
    .toBeGreaterThan(0);
  await game.getByTestId("movable-tool").click();
  await game.getByText("Act without dragging", { exact: true }).click();
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
  await expect(game.getByTestId("placement-feedback")).toHaveText("");
  await game.getByTestId("movable-tool").click();
  await game.locator('[data-place="inside"]').click();
  await expect(game.getByTestId("placement-feedback")).toHaveText("");
  await game.getByTestId("movable-tool").click();
  await game.locator('[data-place="on"]').click();
  await expect(game.getByTestId("placement-feedback")).toHaveText("");
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
  await page.getByText("Picture & Action · words, objects, and actions", { exact: true }).click();
  await expect(page.getByTestId("place-game")).toBeVisible();
  await page.goto(appUrl({ tab: "core30", module: "place-directions" }));
  await expect(page.locator("body")).toContainText("Place & Directions");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
  await page.getByText("Picture & Action · scene practice", { exact: true }).click();
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

test("clinic actions, voice-only privacy, replay and remembered preferences", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { pictureSpeech: string[] }).pictureSpeech = calls;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        getVoices() {
          return [];
        },
        speak(u: SpeechSynthesisUtterance) {
          calls.push(u.text);
        },
      },
    });
  });
  await page.goto("/place-directions");
  const game = page.getByTestId("place-game");
  await game.getByTestId("picture-scene").selectOption("clinic");
  await expect(game.getByTestId("placement-command")).toContainText("Cuelga el sombrero");
  await game.getByTestId("instruction-mode").selectOption("voice");
  await expect(game.getByTestId("placement-command")).toHaveText("Listen and act.");
  await expect(
    game.getByText("Cuelga el sombrero en el gancho detrás de la puerta.", { exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { pictureSpeech: string[] }).pictureSpeech.length),
    )
    .toBeGreaterThan(0);
  await game.getByRole("button", { name: /Replay · device voice/ }).click();
  await game.getByTestId("movable-tool").click();
  await game.getByText("Act without dragging", { exact: true }).click();
  await game.locator('[data-place="door-hook"]').click();
  await expect(game.getByTestId("placement-feedback")).toContainText("Correct placement");
  await expect(game.getByTestId("placement-feedback")).toHaveText("");
  await expect(game.getByTestId("placement-command")).toHaveText("Listen and act.");
  await game.getByRole("button", { name: "Show text help", exact: true }).click();
  await expect(game).toContainText("Pon los zapatos debajo del asiento de la silla.");
  await page.reload();
  await expect(game.getByTestId("picture-scene")).toHaveValue("clinic");
  await expect(game.getByTestId("instruction-mode")).toHaveValue("voice");
  await game.getByTestId("instruction-mode").selectOption("text");
  await expect(game.getByRole("button", { name: /device voice/ })).toHaveCount(0);
  await expect(game.getByTestId("placement-command")).toContainText("Cuelga el sombrero");
});
test("cleaning behind the bed needs actual strokes; all images and the native pack are accessible", async ({
  page,
}, info) => {
  await page.goto("/place-directions");
  const game = page.getByTestId("place-game");
  await game.getByTestId("picture-scene").selectOption("bedroom");
  await expect(game.getByTestId("placement-command")).toHaveText("Limpia detrás de la cama.");
  const board = game.getByTestId("placement-board"),
    tool = game.getByTestId("movable-tool");
  await board.scrollIntoViewIfNeeded();
  const b = (await board.boundingBox())!,
    t = (await tool.boundingBox())!;
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.57, b.y + b.height * 0.255, { steps: 1 });
  await page.mouse.up();
  await expect(game.getByTestId("placement-next")).toHaveCount(0);
  const moved = (await tool.boundingBox())!;
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await page.mouse.down();
  for (const x of [0.45, 0.65, 0.45, 0.65, 0.57])
    await page.mouse.move(b.x + b.width * x, b.y + b.height * 0.255, { steps: 8 });
  await page.mouse.up();
  await expect(game.getByTestId("placement-feedback")).toContainText("Cleaned");
  await page.screenshot({ path: `/tmp/picture-cleaning-${info.project.name}.png`, fullPage: true });
  for (const s of ["or", "truck", "clinic", "workshop"]) {
    await game.getByTestId("picture-scene").selectOption(s);
    await expect(game.locator("img")).toHaveAttribute("src", `/images/picture-action/${s}-hq.webp`);
    await expect
      .poll(() => game.locator("img").evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBeGreaterThan(0);
  }
  const r = await page.request.get("/downloads/picture-action-app-assets.zip");
  expect(r.ok()).toBe(true);
  expect((await r.body()).byteLength).toBeLessThan(1500000);
});

test("medical and OR modules get their own scene area and preserve the instruction language", async ({
  page,
}) => {
  await page.goto("/place-directions");
  await seedAppState(page, {
    onboardingComplete: true,
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    activeModuleId: "nursing",
    currentTab: "games",
  });
  await page.goto(appUrl({ tab: "games", module: "nursing" }));
  await page.getByText("Picture & Action · words, objects, and actions", { exact: true }).click();
  const game = page.getByTestId("place-game");
  await expect(game.getByTestId("picture-scene")).toHaveValue("clinic");
  await game.getByTestId("picture-scene").selectOption("truck");
  await page.goto(appUrl({ tab: "games", module: "or-evs", target: "English", native: "Spanish" }));
  await page.getByText("Picture & Action · words, objects, and actions", { exact: true }).click();
  await expect(game.getByTestId("picture-scene")).toHaveValue("or");
  await expect(game.getByTestId("placement-command")).toHaveText(
    "Put the tray on top of the cart.",
  );
  await page.goto(appUrl({ tab: "games", module: "nursing" }));
  await page.getByText("Picture & Action · words, objects, and actions", { exact: true }).click();
  await expect(game.getByTestId("picture-scene")).toHaveValue("truck");
  await expect(game.getByTestId("placement-command")).toContainText("Pon la mochila");
});
