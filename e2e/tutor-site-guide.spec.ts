import { expect, test } from "@playwright/test";
import { appUrl, readAppState, seedAppState } from "./app-state";

async function openSiteTutor(page: import("@playwright/test").Page, isMobile: boolean) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  await seedAppState(page, {
    activeModuleId: "roofing",
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    currentTab: "reader",
    purchasedModules: ["roofing"],
    onboardingComplete: true,
  });
  await page.goto(appUrl({ tab: "reader", module: "roofing" }));
  await page
    .getByRole("button", { name: isMobile ? "Ask Tutor" : "Open AI Tutor", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Language Threshold Tutor" });
}

test("site requests produce real links without AI calls and keep the learning context", async ({
  page,
  isMobile,
}) => {
  let aiCalls = 0;
  await page.route("**/api/tutor", (route) => {
    aiCalls++;
    return route.fulfill({ status: 500, json: { error: "Site help should not call AI" } });
  });
  const tutor = await openSiteTutor(page, isMobile);
  await tutor.getByLabel("Message your tutor").fill("I want to review my cards");
  await tutor.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    tutor.getByRole("link", { name: "Short review rounds", exact: true }),
  ).toHaveAttribute("href", /tab=core30/);
  const cards = tutor.getByRole("link", { name: "Cards", exact: true });
  await expect(cards).toHaveAttribute(
    "href",
    /module=roofing&target=Spanish&native=English&tab=flashcards/,
  );
  const before = await readAppState(page);
  await cards.click();
  await expect(
    page.getByRole("heading", { name: "Roofing Supervisor cards", exact: true }),
  ).toBeVisible();
  const after = await readAppState(page);
  expect(after.activeModuleId).toBe("roofing");
  expect(after.selectedLanguage).toBe("Spanish");
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(aiCalls).toBe(0);
});

test("voice and Add word links open the actual panels without changing preferences or saving words", async ({
  page,
  isMobile,
}) => {
  let tutor = await openSiteTutor(page, isMobile);
  await tutor.getByLabel("Message your tutor").fill("Where can I change my voice?");
  await tutor.getByRole("button", { name: "Send", exact: true }).click();
  await tutor.getByRole("link", { name: "Learning settings", exact: true }).click();
  const voices = page.getByRole("region", { name: "Voice settings", exact: true });
  await expect(voices).toBeVisible();
  await expect(page).not.toHaveURL(/panel=/);
  await page.screenshot({ path: `test-results/tutor-settings-${test.info().project.name}.png` });
  await page.goto(appUrl({ tab: "reader", module: "roofing" }));
  await page
    .getByRole("button", { name: isMobile ? "Ask Tutor" : "Open AI Tutor", exact: true })
    .click();
  tutor = page.getByRole("dialog", { name: "Language Threshold Tutor" });
  await tutor.getByLabel("Message your tutor").fill("How do I add a word?");
  await tutor.getByRole("button", { name: "Send", exact: true }).click();
  const before = await readAppState(page);
  await tutor.getByRole("link", { name: "Add a word to My Vocab", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Add.*Vocab/i })).toBeVisible();
  expect((await readAppState(page)).userVocab).toEqual(before.userVocab);
});

test("getting-started offer is dismissible, does not steal focus, and stays dismissed on reload", async ({
  page,
}) => {
  await page.goto(appUrl({ tab: "reader" }));
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("lt.learner-device.v1.tutor-site-guide.guest"));
  await page.reload();
  const offer = page.getByTestId("tutor-site-guide-offer");
  await expect(offer).toBeVisible({ timeout: 20000 });
  expect(await offer.evaluate((el) => el.contains(document.activeElement))).toBe(false);
  await page.screenshot({ path: `test-results/tutor-welcome-${test.info().project.name}.png` });
  await offer.getByRole("button", { name: "Not now", exact: true }).click();
  await page.reload();
  await page.waitForTimeout(13000);
  await expect(offer).toHaveCount(0);
});

test("welcome opens a useful site tour without sending a message or calling AI", async ({
  page,
}) => {
  let aiCalls = 0;
  await page.route("**/api/tutor", (route) => {
    aiCalls++;
    return route.abort();
  });
  await page.goto(appUrl({ tab: "reader" }));
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("lt.learner-device.v1.tutor-site-guide.guest"));
  await page.reload();
  const offer = page.getByTestId("tutor-site-guide-offer");
  await expect(offer).toBeVisible({ timeout: 20000 });
  await offer.getByRole("button", { name: "Help me get started", exact: true }).click();
  const tutor = page.getByRole("dialog", { name: "Language Threshold Tutor" });
  await expect(tutor.getByRole("link", { name: "Choose a module", exact: true })).toBeInViewport();
  await expect(tutor.getByRole("link", { name: "Reader", exact: true })).toBeVisible();
  await expect(tutor.getByRole("link", { name: "Speak & Learn", exact: true })).toBeVisible();
  expect(aiCalls).toBe(0);
  await page.screenshot({ path: `test-results/tutor-tour-${test.info().project.name}.png` });
});

test("ordinary study questions still stream, with site context and verified model links", async ({
  page,
  isMobile,
}) => {
  let calls = 0;
  let payload: {
    context?: {
      language?: string;
      site?: { currentTab?: string };
      module?: { id?: string };
      passage?: string;
    };
  } = {};
  await page.route("**/api/tutor", (route) => {
    calls++;
    payload = route.request().postDataJSON();
    const answer =
      "The verb agrees with its subject. Try [Grammar Studio](/?tab=grammar&module=fmg&target=French&native=German). [Invented page](/not-a-real-page)";
    return route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({ choices: [{ delta: { content: answer } }] })}\n\ndata: [DONE]\n\n`,
    });
  });
  const tutor = await openSiteTutor(page, isMobile);
  await tutor.getByLabel("Message your tutor").fill("Explain the grammar of this sentence.");
  await tutor.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    tutor.getByText("The verb agrees with its subject.", { exact: false }),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect(payload.context?.site?.currentTab).toBe("reader");
  expect(payload.context?.module?.id).toBe("roofing");
  expect(payload.context?.language).toBe("Spanish");
  expect(payload.context?.passage?.length).toBeGreaterThan(0);
  await expect(tutor.getByRole("link", { name: "Grammar Studio", exact: true })).toHaveAttribute(
    "href",
    /module=roofing&target=Spanish&native=English&tab=grammar/,
  );
  await expect(tutor.getByRole("link", { name: "Invented page", exact: true })).toHaveCount(0);
});
