import { expect, test } from "@playwright/test";
import { appUrl, core30Key, readAppState, seedAppState } from "./app-state";

test("one desktop menu retains tools and utilities; phone navigation stays familiar", async ({
  page,
  isMobile,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  const log = { lessons: { "1": { masteredAt: "2026-10-20T12:00:00Z", visits: {} } } };
  await seedAppState(page, {
    activeModuleId: "roofing",
    currentTab: "core30",
    onboardingComplete: true,
    core30Log: { [core30Key("roofing")]: log },
    lessonProgress: { [core30Key("roofing")]: 1 },
  });
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  await expect(page.getByTestId("continue-learning")).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Desktop navigation" });
  const bottom = page.getByRole("navigation", { name: "Primary", exact: true });
  if (isMobile) {
    await expect(sidebar).not.toBeVisible();
    await expect(page.locator("header")).not.toBeVisible();
    await expect(bottom).toBeVisible();
    expect(
      await bottom.locator("div.flex.items-center.justify-around > button").allTextContents(),
    ).toEqual(["More", "Reader", "Cards", "Grammar", "Games", "Speak", "Core 60", "Tutor"]);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--lt-nav-height").trim(),
      ),
    ).toBe("6.5rem");
    await page.screenshot({ path: `test-results/navigation-${info.project.name}.png` });
    // A touch tablet keeps the phone navigation even above the desktop width threshold.
    await page.setViewportSize({ width: 1024, height: 1366 });
    await expect(bottom).toBeVisible();
    await expect(sidebar).not.toBeVisible();
  } else {
    await expect(sidebar).toBeVisible();
    await expect(bottom).not.toBeVisible();
    await expect(page.locator("header nav")).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Exams", exact: true })).toHaveCount(0);
    const navFont = await sidebar
      .getByRole("button", { name: "Core 60", exact: true })
      .locator("span")
      .last()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(navFont).toBeGreaterThanOrEqual(12);
    for (const label of [
      "Reader",
      "Cards",
      "Grammar",
      "Practice Lab",
      "Speak",
      "Core 60",
      "Modules",
      "Anatomy",
    ]) {
      await expect(sidebar.getByRole("button", { name: label, exact: true })).toHaveCount(1);
    }
    for (const width of [1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("header")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      expect(
        await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--lt-nav-height").trim(),
        ),
      ).toBe("0rem");
      await page.screenshot({ path: `test-results/navigation-desktop-${width}.png` });
    }
    await page
      .getByRole("button", { name: "Add a word to My Vocab from this page", exact: true })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole("dialog", { name: "Add to My Vocab" })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Open AI Tutor", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Language Threshold Tutor" })).toBeVisible();
    await page.getByRole("button", { name: "Minimize tutor" }).click();
    await sidebar.getByRole("button", { name: "Reader", exact: true }).click();
    await expect(page).toHaveURL(/tab=reader/);
    await sidebar.getByRole("button", { name: "Core 60", exact: true }).click();
    await expect(page).toHaveURL(/tab=core30/);
    await expect(sidebar.getByRole("button", { name: "Core 60", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  const after = await readAppState(page);
  expect(after.core30Log).toEqual({ [core30Key("roofing")]: log });
  expect(after.lessonProgress).toEqual({ [core30Key("roofing")]: 1 });
});

test("desktop keeps the Japanese-only Kana entry in the sidebar", async ({ page, isMobile }) => {
  test.skip(isMobile, "phone menu is intentionally unchanged");
  await page.goto(appUrl({ tab: "reader", target: "Japanese" }));
  const sidebar = page.getByRole("navigation", { name: "Desktop navigation" });
  await expect(sidebar.getByRole("button", { name: "Kana Pad", exact: true })).toBeVisible();
  await sidebar.getByRole("button", { name: "Kana Pad", exact: true }).click();
  await expect(page).toHaveURL(/tab=kana/);
});

test("module picker and catalogue alphabetize trades with Foundation, Core, Master together", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "catalogue ordering is shared across devices");
  await page.goto(appUrl({ tab: "modules" }));
  const checkOrder = async (root: import("@playwright/test").Locator) => {
    const cards = await root.locator("[data-module-id]").evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute("data-module-id")!,
        name: el.getAttribute("data-module-name")!,
      })),
    );
    expect(cards.length).toBeGreaterThan(20);
    const ids = cards.map((card) => card.id);
    expect(ids.filter((id) => /^(foundation|master)-/.test(id))).toEqual([]);
    expect(ids.filter((id) => id === "roofing")).toHaveLength(1);
    const roofing = root.locator('[data-module-id="roofing"]');
    expect(await roofing.locator("[data-stage]").allTextContents()).toEqual([
      "Foundation",
      "Core",
      "Master",
    ]);
    expect(
      await roofing
        .locator("[data-stage]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-stage-module-id"))),
    ).toEqual(["foundation-roofing", "roofing", "master-roofing"]);
    const baseNames = cards
      .filter((card) => !card.id.startsWith("foundation-") && !card.id.startsWith("master-"))
      .map((card) => card.name);
    expect(baseNames).toEqual(
      [...baseNames].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    );
  };
  await expect(page.locator("main [data-module-id]").first()).toBeVisible();
  await checkOrder(page.locator("main"));
  await page.getByTitle("Change module").click();
  const picker = page.getByRole("dialog", { name: "Select Module" });
  await expect(picker).toBeVisible();
  await checkOrder(picker);
  const roofing = picker.locator('[data-module-id="roofing"]');
  await roofing.getByRole("button", { name: "Core", exact: true }).click();
  await expect(page).toHaveURL(/module=roofing/);
  await expect(page).toHaveURL(/tab=core30/);
  await page.goto(appUrl({ tab: "modules" }));
  const master = page
    .locator('main [data-module-id="roofing"]')
    .getByRole("button", { name: "Master", exact: true });
  await master.click();
  await expect(page).toHaveURL(/module=master-roofing/);
  await expect(page).toHaveURL(/tab=core30/);
});

test("Exams opens from Core 60 and Practice Lab with the current learning pair", async ({
  page,
}) => {
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  await page.getByRole("link", { name: "Entrance, day 45 and day 90 exams" }).click();
  await expect(page).toHaveURL(/\/exams\?/);
  let params = new URL(page.url()).searchParams;
  expect(params.get("module")).toBe("roofing");
  expect(params.get("target")).toBe("Spanish");
  expect(params.get("native")).toBe("English");
  await page.goto(appUrl({ tab: "games", module: "roofing" }));
  await expect(page.getByRole("heading", { name: "Practice Lab", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exams", exact: true }).click();
  await expect(page).toHaveURL(/\/exams\?/);
  params = new URL(page.url()).searchParams;
  expect(params.get("module")).toBe("roofing");
  expect(params.get("target")).toBe("Spanish");
});

test("device voice setup instructions are reachable in desktop and phone settings", async ({
  page,
  isMobile,
}) => {
  await page.goto(appUrl({ tab: "reader" }));
  if (isMobile) await page.getByRole("button", { name: "App settings", exact: true }).click();
  else await page.getByRole("button", { name: "Learning settings", exact: true }).click();
  await page
    .getByText("Add voices to your device", { exact: true })
    .filter({ visible: true })
    .click();
  await page.getByText("iPhone / iPad", { exact: true }).filter({ visible: true }).click();
  await expect(
    page.getByText(/Open Settings → Accessibility → Read & Speak → Voices/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Apple voice settings", exact: true }),
  ).toHaveAttribute("href", /^https:\/\/support\.apple\.com\//);
  for (const device of ["Mac", "Android", "Windows"])
    await expect(page.getByText(device, { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Check audio routing", exact: true }).filter({ visible: true }).click();
  const audio = page.getByRole("dialog", { name: "Audio & microphone", exact: true });
  await expect(audio).toBeVisible();
  await expect(audio.getByRole("button", { name: "Test microphone", exact: true })).toBeVisible();
  await expect(audio.getByRole("button", { name: "Play test sound", exact: true })).toBeVisible();
  await audio.getByRole("button", { name: "Close", exact: true }).click();
  await expect(audio).not.toBeVisible();
});

test('Speak keeps a selected country lens collapsed and editable after save and reload', async ({page}) => {
 await page.goto(appUrl({tab:'speak',module:'core'}));
 const banner = page.locator('section[aria-labelledby="next-trip-heading"]');
 const before = await readAppState(page);
 await banner.getByRole('combobox').selectOption('mexico');
 await banner.getByRole('button',{name:'Save',exact:true}).click();
 const summary = page.getByTestId('next-trip-summary');
 await expect(summary).toContainText('Mexico');
 await expect(banner).toHaveCount(0);
 await summary.getByRole('button',{name:'Show country lens details'}).click();
 await expect(banner.getByText('Country lens',{exact:true})).toBeVisible();
 await banner.getByRole('button',{name:'Collapse country lens details'}).click();
 await expect(summary).toBeVisible();
 await summary.getByRole('button',{name:'Edit next trip'}).click();
 await banner.getByRole('combobox').selectOption('spain');
 await banner.getByRole('button',{name:'Save',exact:true}).click();
 await expect(summary).toContainText('Spain');
 await page.reload();
 await expect(summary).toContainText('Spain');
 await expect(banner).toHaveCount(0);
 const after=await readAppState(page);
 expect(after.lessonProgress).toEqual(before.lessonProgress);
 expect(after.core30Log).toEqual(before.core30Log);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/country-lens-${test.info().project.name}.png`});
});
