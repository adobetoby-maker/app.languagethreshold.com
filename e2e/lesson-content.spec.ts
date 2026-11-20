import { collectRecallCards, openRecallTools } from "./recall-deck";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { core30Key, readAppState, seedAppState } from "./app-state.ts";

// Authored lesson content on the Landscaper module (Spanish): lesson 1's passage in See it, and
// the verb drill under Type it. The expected text is read from the same generated file the app
// serves (public/lesson-content/es/plumber.json; landscaper, roofing and
// construction-foreman show their hand-written readings instead), so the test follows the content.

const MODULE = "plumber";

interface Verb {
  infinitive: string;
  native: string;
  forms: Record<string, string>;
}
interface LessonContent {
  passage: { title: string; target: string[]; native: string[] };
  words: { es: string; en: string; kind: string }[];
  verbs: Verb[];
}
const content = JSON.parse(
  readFileSync(new URL("../public/lesson-content/es/plumber.json", import.meta.url), "utf8"),
) as { lessons: Record<string, LessonContent> };
const LESSON_1 = content.lessons["1"];

const pad = (n: number) => String(n).padStart(2, "0");
function dateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Opens the app on the Core 30 tab of the test module with the plan started today. A cold
 * dev server can finish loading after the seed is written and drop it, so the seed is written
 * again (up to three times) until the app keeps it.
 */
async function openModuleCore30(page: Page, moduleId = MODULE) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Study", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const startDate = dateKey(0);
  const seeded = async () => {
    const state = await readAppState(page);
    const log = state.core30Log as Record<string, { startDate?: string }> | undefined;
    return (
      state.activeModuleId === moduleId &&
      state.currentTab === "core30" &&
      log?.[core30Key(moduleId)]?.startDate === startDate
    );
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const previous = await readAppState(page);
    await seedAppState(page, {
      activeModuleId: moduleId,
      selectedLanguage: "Spanish",
      currentTab: "core30",
      lessonProgress: {
        ...((previous.lessonProgress as object | undefined) ?? {}),
        [core30Key(moduleId)]: 0,
      },
      core30Log: { [core30Key(moduleId)]: { startDate, lessons: {} } },
    });
    // Name the module in the address: the app routes a bare Core 30 link to its default module.
    await page.goto(`/?tab=core30&module=${moduleId}&target=Spanish&native=English`);
    await page.getByTestId("study-options").locator(":scope > summary").click();
    await page
      .getByTestId("core30-plan-card")
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    if ((await page.getByTestId("core30-plan-card").isVisible()) && (await seeded())) return;
  }
  await expect(page.getByTestId("core30-plan-card")).toBeVisible();
  expect(await seeded()).toBe(true);
}

async function openLesson1(page: Page) {
  await page
    .getByRole("button", { name: /Today: Lesson 1|Start Lesson 1/ })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson details and goal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Lesson practice modes", exact: true }),
  ).toBeVisible();
}

async function goSection(page: Page, section: "see" | "recall" | "type") {
  await page.getByTestId(`v6-nav-${section}`).click();
  await expect(page.getByTestId(`v6-nav-${section}`)).toHaveAttribute("aria-current", "page");
}

test.describe("Lesson content: Plumber lesson 1", () => {
  test("See it shows the passage written for this lesson", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    const reader = page.getByTestId("lesson-reader");
    await expect(reader).toBeVisible({ timeout: 60_000 });
    await expect(reader.getByRole("article", { name: "Lesson phrase" })).toHaveCount(1);
    for (let index = 0; index < LESSON_1.passage.target.length; index++) {
      await expect(reader.locator(".lt-native-reading-target")).toHaveText(
        LESSON_1.passage.target[index],
      );
      await expect(reader.locator(".lt-native-reading-translation")).toHaveText(
        LESSON_1.passage.native[index],
      );
      if (index + 1 < LESSON_1.passage.target.length)
        await reader.getByRole("button", { name: "Next →", exact: true }).click();
    }
    await expect(reader.getByRole("button", { name: "Finish round", exact: true })).toBeVisible();
  });

  test("Recall combines word, phrase and verb cards with practice breaks", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    const deck = page.getByTestId("lesson-recall-deck");
    await expect(deck).toBeVisible();
    await expect(page.getByTestId("practice-recall-switch")).not.toBeVisible();
    const recalled = await collectRecallCards(page);
    for (const verb of LESSON_1.verbs)
      expect(recalled.some((card) => card.target === verb.infinitive && card.kind === "Verb")).toBe(
        true,
      );
    expect(recalled.some((card) => card.kind === "Word")).toBe(true);
    expect(recalled.some((card) => card.kind === "Phrase")).toBe(true);
    await expect(deck).toContainText("skipped");
  });

  test("Recall ignores rapid grading taps across reveal and card changes", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    const deck = page.getByTestId("lesson-recall-deck");
    await expect(deck).toBeVisible();
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 1000);
    await deck.getByRole("button", { name: "Reveal Spanish", exact: true }).click();
    const got = deck.getByRole("button", { name: "Got it", exact: true });
    await expect(got).toBeDisabled();
    await got.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(deck.getByTestId("recall-progress")).toHaveText(/^0 \/ /);
    await page.clock.runFor(301);
    await got.click();
    const again = deck.getByRole("button", { name: "Again", exact: true });
    await expect(again).toBeDisabled();
    await again.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(deck.getByTestId("recall-progress")).toHaveText(/^1 \/ /);
    await page.clock.resume();
  });

  test("Recall matching and verb rounds return to the combined cards", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    const deck = page.getByTestId("lesson-recall-deck");
    const seen = new Map<string, string>();
    for (let step = 0; step < 30; step++) {
      const current = deck.getByTestId("recall-step");
      if ((await current.getAttribute("data-kind")) !== "card") break;
      const native = await current.getByTestId("recall-card-text").innerText();
      await current.getByRole("button", { name: "Flip the card", exact: true }).click();
      seen.set(await current.getByTestId("recall-card-text").innerText(), native);
      await current.getByRole("button", { name: "Got it", exact: true }).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "match");
    const targets = deck.locator('[data-testid="match-tile"][lang="es"]');
    const meanings = deck.locator('[data-testid="match-tile"][lang="en"]');
    const texts = await targets.allInnerTexts();
    const nativeTexts = await meanings.allInnerTexts();
    for (let i = 0; i < texts.length; i++) {
      const at = nativeTexts.indexOf(seen.get(texts[i])!);
      expect(at).toBeGreaterThanOrEqual(0);
      await targets.nth(i).click();
      await meanings.nth(at).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "card");
    for (let step = 0; step < 30; step++) {
      const current = deck.getByTestId("recall-step");
      const kind = await current.getAttribute("data-kind");
      if (kind === "verb-game") break;
      if (kind === "card") {
        await current.getByRole("button", { name: "Flip the card", exact: true }).click();
        await current.getByRole("button", { name: "Got it", exact: true }).click();
      } else await deck.getByRole("button", { name: "Skip this activity", exact: true }).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "verb-game");
    const game = deck.getByTestId("lesson-verb-game-round");
    for (let question = 0; question < 4; question++) {
      const options = game.locator("div.grid > button");
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
      for (let option = 0; option < count; option++) {
        await options.nth(option).click();
        if (await game.getByText(/^Correct\./).isVisible()) break;
      }
      await expect(game.getByText(/^Correct\./)).toBeVisible();
      await game.getByRole("button", { name: /^(Next question|See score)$/ }).click();
    }
    await expect(deck.getByRole("button", { name: "Skip this activity", exact: true })).toHaveCount(
      0,
    );
    await game.getByRole("button", { name: "Continue cards", exact: true }).click();
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "card");
  });

  test("Recall tools retain the lesson's verb reference cards", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    await expect(page.getByTestId("lesson-recall-deck")).toBeVisible({ timeout: 60_000 });
    await openRecallTools(page);
    await page.getByTestId("practice-mode-verbs").click();
    const study = page.getByTestId("verb-practice-study");
    await expect(study).toBeVisible();
    await expect(study.getByTestId("verb-card")).toHaveCount(LESSON_1.verbs.length);
    const first = LESSON_1.verbs[0];
    await expect(study).toContainText(first.infinitive);
    await expect(study).toContainText(first.forms["nosotros"]);
  });

  test("Type it, Verbs: a correct form is accepted and a wrong one gets feedback", async ({
    page,
  }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "type");
    await expect(page.getByTestId("type-kind-switch")).toBeVisible({ timeout: 60_000 });
    // Words is the default and keeps working.
    await expect(page.getByTestId("type-input")).toBeVisible();
    await page.getByTestId("type-kind-verbs").click();
    await expect(page.getByTestId("verb-practice-conjugate")).toBeVisible();

    const expectedFor = async (): Promise<string> => {
      const prompt = page.getByTestId("verb-prompt");
      const infinitive = (await prompt.getAttribute("data-infinitive")) ?? "";
      const key = (await prompt.getAttribute("data-pronoun-key")) ?? "";
      const verb = LESSON_1.verbs.find((v) => v.infinitive === infinitive);
      expect(verb, `verb ${infinitive} is in the lesson`).toBeTruthy();
      return verb!.forms[key];
    };

    // Right answer.
    const right = await expectedFor();
    await page.getByTestId("verb-input").fill(right);
    await page.getByRole("button", { name: "Check" }).click();
    const verdict = page.getByTestId("answer-feedback-verdict");
    await expect(verdict).toHaveText("Correct");
    await expect(page.getByTestId("answer-feedback-word")).toContainText(right);
    await page.getByRole("button", { name: "Next form" }).click();

    // Wrong answer: feedback explains it and shows the right form.
    const wanted = await expectedFor();
    await page.getByTestId("verb-input").fill("zzzzz");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByTestId("answer-feedback")).toHaveAttribute("data-verdict", "wrong");
    await expect(verdict).toHaveText("Not quite");
    await expect(page.getByTestId("answer-feedback-word")).toContainText(wanted);
  });
});

test("Recall HD recordings, authored forms and wrong-pair retry work in both themes", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  // Observe real media playback; do not replace it with a successful mock.
  await page.addInitScript(() => {
    const state = window as unknown as {
      recallAudio: HTMLMediaElement[];
      deviceSpeechCalls: number;
    };
    localStorage.setItem("lt.languageChosen", "1");
    const profileKey = "lt.profile-device.v1.guest";
    const profile = JSON.parse(localStorage.getItem(profileKey) ?? "null") ?? {
      schema: 1,
      userId: null,
      data: {},
    };
    profile.data = { ...profile.data, onboardingComplete: true, selectedLanguage: "Spanish" };
    localStorage.setItem(profileKey, JSON.stringify(profile));
    state.recallAudio = [];
    state.deviceSpeechCalls = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      state.recallAudio.push(this);
      return play.call(this);
    };
    if (window.speechSynthesis)
      window.speechSynthesis.speak = () => {
        state.deviceSpeechCalls++;
      };
  });
  let cloudRequests = 0;
  await page.route("**/api/mission-tts", async (route) => {
    if (route.request().method() === "POST") cloudRequests++;
    await route.fulfill({
      status: 503,
      json: { error: "Public recordings should not need cloud synthesis" },
    });
  });
  const recordings = JSON.parse(
    readFileSync(new URL("../src/data/spanish-next-recordings.json", import.meta.url), "utf8"),
  ).entries;
  async function expectHD(text: string, gender: "female" | "male", action: () => Promise<unknown>) {
    const normalized = text
      .normalize("NFC")
      .trim()
      .toLocaleLowerCase("es")
      .replace(/\s+/g, " ")
      .replace(/[.!?¿¡,;:]+$/g, "");
    const filename = recordings[normalized]?.[gender];
    expect(filename).toBeTruthy();
    const before = await page.evaluate(
      () => (window as unknown as { recallAudio: HTMLMediaElement[] }).recallAudio.length,
    );
    await action();
    await expect
      .poll(() =>
        page.evaluate(
          ({ before, filename }) => {
            const audio = (
              window as unknown as { recallAudio: HTMLMediaElement[] }
            ).recallAudio.slice(before);
            return audio.some(
              (item) =>
                item.currentSrc.includes(filename) && item.currentTime > 0.02 && !item.error,
            );
          },
          { before, filename },
        ),
      )
      .toBe(true);
  }
  await openModuleCore30(page, "orthopedics");
  await openLesson1(page);
  await goSection(page, "recall");
  const deck = page.getByTestId("lesson-recall-deck");
  const seen = new Map<string, string>();
  for (let step = 0; step < 30; step++) {
    const current = deck.getByTestId("recall-step");
    if ((await current.getAttribute("data-kind")) !== "card") break;
    const native = await current.getByTestId("recall-card-text").innerText();
    await current.getByRole("button", { name: "Flip the card", exact: true }).click();
    seen.set(await current.getByTestId("recall-card-text").innerText(), native);
    await current.getByRole("button", { name: "Got it", exact: true }).click();
  }
  await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "match");
  const targets = deck.locator('[data-testid="match-tile"][lang="es"]');
  const meanings = deck.locator('[data-testid="match-tile"][lang="en"]');
  const target = (await targets.allInnerTexts())[0];
  const nativeTexts = await meanings.allInnerTexts();
  const correctIndex = nativeTexts.indexOf(seen.get(target)!);
  expect(correctIndex).toBeGreaterThanOrEqual(0);
  await expectHD(target, "female", () => targets.first().click());
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await meanings.nth((correctIndex + 1) % nativeTexts.length).click();
  await expect(deck.locator('[data-wrong="true"]')).toHaveCount(2);
  await expect(deck.locator('[data-matched="true"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("wrong-pair-dark.png"), fullPage: true });
  await page.clock.resume();
  await expect(deck.locator('[data-wrong="true"]')).toHaveCount(0);
  await targets.first().click();
  await meanings.nth(correctIndex).click();
  await expect(deck.locator('[data-matched="true"]')).toHaveCount(2);
  await deck.getByRole("button", { name: "Skip this activity", exact: true }).click();
  let foundVerb = false;
  for (let step = 0; step < 40; step++) {
    const current = deck.getByTestId("recall-step");
    if ((await current.getAttribute("data-kind")) === "card") {
      await current.getByRole("button", { name: "Flip the card", exact: true }).click();
      if (await current.getByTestId("recall-verb-forms").isVisible()) {
        foundVerb = true;
        break;
      }
      await current.getByRole("button", { name: "Got it", exact: true }).click();
    } else await deck.getByRole("button", { name: "Skip this activity", exact: true }).click();
  }
  expect(foundVerb).toBe(true);
  const rows = deck.getByTestId("recall-verb-form");
  await expect(rows).toHaveCount(5);
  for (const text of ["yo", "me llamo", "tú", "te llamas", "nosotros", "nos llamamos", "se llaman"])
    await expect(deck.getByTestId("recall-verb-forms")).toContainText(text);
  const cardId = await deck.getAttribute("data-current-id");
  await expectHD("me llamo", "female", () => rows.first().click());
  await expect(deck).toHaveAttribute("data-current-id", cardId!);
  await page.screenshot({ path: testInfo.outputPath("verb-card-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Navigation menu", exact: true }).click();
  const settings = page.getByTestId("more-settings");
  if ((await settings.getAttribute("open")) === null)
    await settings.locator(":scope > summary").click();
  const voice = page.getByRole("group", { name: "Listening voice", exact: true });
  await voice.getByRole("button", { name: "Male", exact: true }).click();
  await expect(voice.getByRole("button", { name: "Male", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Appearance.*Dark/ }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.goBack();
  await expect(rows.first()).toBeVisible();
  await expectHD("me llamo", "male", () => rows.first().click());
  await expect(deck).toHaveAttribute("data-current-id", cardId!);
  await page.screenshot({ path: testInfo.outputPath("verb-card-light.png"), fullPage: true });
  expect(
    await page.evaluate(
      () => (window as unknown as { deviceSpeechCalls: number }).deviceSpeechCalls,
    ),
  ).toBe(0);
  expect(cloudRequests).toBe(0);
});
