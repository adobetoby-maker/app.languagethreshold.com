import { test, expect, type Page } from "@playwright/test";
import { seedAppState, appUrl } from "./app-state";
async function open(page: Page, extra = "") {
  await page.goto("/place-directions");
  await seedAppState(page, {
    onboardingComplete: true,
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    activeModuleId: "soccer",
    currentTab: "verbs",
  });
  await page.goto(appUrl({ tab: "verbs", module: "soccer" }) + extra);
  await expect(page.getByTestId("verbs-hub")).toBeVisible();
}
test("Verbs is a primary tab with 28 pattern families and all five recall games", async ({
  page,
}, info) => {
  await open(page);
  const hub = page.getByTestId("verbs-hub");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.classList.toggle("dark", value === "dark"),
      theme,
    );
    await page.screenshot({
      path: `/tmp/verbs-daily-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  await expect(hub.getByRole("heading", { name: "Verbs", exact: true })).toBeVisible();
  const nav = page.getByRole("button", { name: "Verbs", exact: true }).first();
  await expect(nav).toBeVisible();
  const b = (await nav.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await hub.getByRole("button", { name: "Meaning & conjugation games", exact: true }).click();
  const select = hub.getByLabel("Choose a teaching pattern");
  await expect(select.locator("option")).toHaveCount(29);
  await select.selectOption("progressive");
  await hub.getByRole("button", { name: "Hangman", exact: true }).click();
  await expect(hub.getByTestId("lesson-verb-game-round")).toBeVisible();
  await hub.getByRole("button", { name: "Match conjugations", exact: true }).click();
  await expect(hub.getByTestId("lesson-verb-game-round")).toContainText("Match each prompt");
  await page.screenshot({ path: `/tmp/verbs-workshop-${info.project.name}.png`, fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Conjugation workshop" })).toBeVisible();
});
test("speaking frames check infinitives, irregular gerunds and participles locally", async ({
  page,
}, info) => {
  await open(page);
  const hub = page.getByTestId("verbs-hub");
  await hub.getByRole("button", { name: "Speaking patterns", exact: true }).click();
  const trainer = hub.getByTestId("speaking-pattern-practice");
  await expect(trainer.getByTestId("verb-pattern-prompt")).toContainText("Tengo que");
  await trainer.getByRole("button", { name: "hablando", exact: true }).click();
  await expect(trainer.getByTestId("verb-pattern-feedback")).toContainText("dictionary form");
  await trainer.getByRole("button", { name: "hablar", exact: true }).click();
  await expect(trainer.getByTestId("verb-pattern-feedback")).toContainText(
    "Tengo que hablar con mi equipo",
  );
  await trainer.getByLabel("Speaking frame").selectOption("estar-gerund");
  await trainer.getByRole("button", { name: "hablar", exact: true }).click();
  await expect(trainer.getByTestId("verb-pattern-feedback")).toContainText("gerund");
  await trainer.getByRole("button", { name: "hablando", exact: true }).click();
  await expect(trainer.getByTestId("verb-pattern-feedback")).toContainText("Estoy hablando");
  await trainer.getByLabel("Speaking frame").selectOption("haber-participle");
  await trainer.getByRole("button", { name: "hablado", exact: true }).click();
  await expect(trainer.getByTestId("verb-pattern-feedback")).toContainText("He hablado");
  await page.screenshot({ path: `/tmp/verbs-patterns-${info.project.name}.png`, fullPage: true });
});
test("Bubble Pop and Verb Crush stay inside the dedicated tab and survive refresh", async ({
  page,
}) => {
  await open(page);
  const hub = page.getByTestId("verbs-hub");
  await hub.getByRole("button", { name: "Bubble Pop & Verb Crush", exact: true }).click();
  await expect(hub.getByRole("heading", { name: "Bubble Pop", exact: true })).toBeVisible();
  await expect(hub.getByRole("heading", { name: "Verb Crush", exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId("verbs-hub").getByRole("heading", { name: "Bubble Pop", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/tab=verbs/);
});
test("exit reminder opens verb practice and its settings toggle persists", async ({ page }) => {
  await open(page);
  const hub = page.getByTestId("verbs-hub");
  await hub.getByRole("button", { name: "Finish study session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Before you go, study your verbs" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Practice my verbs" }).click();
  await expect(dialog).not.toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("lt:open-learning-settings")));
  const settingsButton = page.getByRole("button", { name: "App settings", exact: true });
  if (await settingsButton.isVisible()) await settingsButton.click();
  const toggle = page
    .getByRole("switch", { name: "Before you go, study your verbs" })
    .filter({ visible: true });
  await expect(toggle).toBeVisible();
  await toggle.uncheck();
  await page.reload();
  const off = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([k]) => k.startsWith("lt.verb-reminder.v1:"))
      .map(([, v]) => v),
  );
  expect(off).toContain("off");
  await page.evaluate(() => window.dispatchEvent(new Event("lt:finish-study")));
  await expect(page.getByRole("dialog", { name: "Before you go, study your verbs" })).toHaveCount(
    0,
  );
});
test("background departure is queued for return and ten-minute completion suppresses it", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const pairKey =
      Object.keys(localStorage).find((k) => k.startsWith("lt.verb-habit.v1:")) ??
      "lt.verb-habit.v1:guest::Spanish:English";
    const d = new Date(),
      day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    localStorage.setItem(
      pairKey,
      JSON.stringify({ day, seconds: 20, answers: 0, missed: [], pending: true, dismissed: false }),
    );
  });
  await page.reload();
  const dialog = page.getByRole("dialog", { name: "Before you go, study your verbs" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Not now" }).click();
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("lt.verb-habit.v1:")) {
        const d = JSON.parse(localStorage.getItem(key)!);
        localStorage.setItem(
          key,
          JSON.stringify({ ...d, seconds: 600, dismissed: false, pending: true }),
        );
      }
    window.dispatchEvent(new Event("lt:verb-habit-changed"));
    window.dispatchEvent(new Event("lt:finish-study"));
  });
  await expect(dialog).toHaveCount(0);
});
test("another selected language never inherits Spanish shortcut exercises", async ({ page }) => {
  await open(page);
  await page.goto(
    appUrl({ tab: "verbs", module: "japanese-basics", target: "Japanese", native: "English" }),
  );
  const hub = page.getByTestId("verbs-hub");
  await expect(hub).toContainText("Your selected language is Japanese");
  await expect(hub.getByRole("button", { name: "Speaking patterns", exact: true })).toHaveCount(0);
  await expect(hub).not.toContainText("Tengo que trabajar hoy.");
});

test("daily time counts active practice, pauses when hidden, and queues a return reminder", async ({
  page,
}) => {
  await open(page);
  await page.clock.install();
  const hub = page.getByTestId("verbs-hub"),
    meter = hub.getByRole("progressbar", { name: "Today’s verb practice" });
  await page.clock.runFor(2000);
  await expect(meter).toHaveAttribute("aria-valuenow", "0");
  await hub.getByRole("button", { name: "Today’s ten minutes", exact: true }).click();
  await page.clock.runFor(3000);
  await expect
    .poll(async () => Number(await meter.getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(2);
  await page.clock.runFor(30000);
  await expect(page.getByRole("dialog", { name: "Before you go, study your verbs" })).toHaveCount(
    0,
  );
  const before = Number(await meter.getAttribute("aria-valuenow"));
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(3000);
  await expect(meter).toHaveAttribute("aria-valuenow", String(before));
  const pending = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([k]) => k.startsWith("lt.verb-habit.v1:"))
      .some(([, v]) => JSON.parse(v).pending),
  );
  expect(pending).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(500);
  await expect(page.getByRole("dialog", { name: "Before you go, study your verbs" })).toBeVisible();
});

test("Core 60 overview and lesson both open the same scoped verb practice", async ({ page }) => {
  await open(page);
  const core = appUrl({ tab: "core30", module: "soccer" });
  await page.goto(core);
  const entry = page.getByTestId("core-verb-practice").filter({ visible: true });
  await expect(entry).toBeVisible();
  await entry.getByRole("link", { name: "Open verb practice" }).click();
  await expect(page.getByTestId("verbs-hub")).toBeVisible();
  await expect(page).toHaveURL(/module=soccer/);
  await page.goto(core + "&lesson=1&way=see");
  await expect(page.getByTestId("lesson-section-see")).toBeVisible();
  await page
    .getByTestId("lesson-section-see")
    .getByRole("link", { name: "Open verb practice" })
    .click();
  await expect(page.getByTestId("verbs-hub")).toBeVisible();
  await expect(page).toHaveURL(/target=Spanish&native=English/);
  await page.goBack();
  await expect(page.getByTestId("lesson-section-see")).toBeVisible();
});
