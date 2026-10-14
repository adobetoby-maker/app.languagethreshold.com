import { expect, test, type Page, type Response } from "@playwright/test";

// Each test clicks through one AI feature the way a learner would and checks
// that the model call succeeds and its result shows up on screen.

function serverFnName(url: string) {
  const id = url.match(/\/_serverFn\/([^?/]+)/)?.[1];
  if (!id) return null;
  try {
    const decoded = JSON.parse(Buffer.from(id, "base64url").toString()) as { export?: string };
    return decoded.export?.replace(/_createServerFn_handler$/, "") ?? null;
  } catch {
    return null;
  }
}

function waitForServerFn(page: Page, name: string) {
  return page.waitForResponse(
    (res) => res.request().method() === "POST" && serverFnName(res.url()) === name,
    { timeout: 90_000 },
  );
}

async function expectAiSuccess(response: Response) {
  expect(response.status(), `${response.url()} status`).toBe(200);
  const body = await response.text();
  expect(body, "server function returned an error").not.toMatch(
    /"error":"(?!null)[^"]+"|Request failed|Generation failed|AI is not configured/,
  );
  return body;
}

async function openApp(page: Page) {
  // Onboarding is already done: auth.setup.ts saved the state.
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Start reading" })).toHaveCount(0);
  await expect(page.getByText("What are you learning?")).toHaveCount(0);
}

async function openTool(page: Page, railLabel: string) {
  await page.getByRole("button", { name: railLabel, exact: true }).first().click();
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("reader: tapping a word shows its AI word card", async ({ page }) => {
  const lookup = waitForServerFn(page, "lookupWord");
  await page.getByRole("button", { name: "billete", exact: true }).first().click();
  await expectAiSuccess(await lookup);
  await expect(page.getByText(/in this sentence/i).first()).toBeVisible();
  await expect(page.getByText(/ticket/i).first()).toBeVisible();
});

test("daily story: a story is generated", async ({ page }) => {
  const story = waitForServerFn(page, "generateDailyStory");
  await openTool(page, "Story");
  await expectAiSuccess(await story);
  await expect(page.getByRole("button", { name: "New Story" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check Answer" })).toBeVisible();
});

test("grammar studio: lessons load and a lesson opens", async ({ page }) => {
  // The sidebar requests the A1 titles on its own as soon as Grammar mounts,
  // so check what the learner sees rather than racing that request.
  await openTool(page, "Grammar");
  const lessons = page.getByRole("button", { name: /^\s*\d\s/ });
  const timedOut = page.getByText(/took longer than expected/i);
  await expect(lessons.first().or(timedOut)).toBeVisible({ timeout: 60_000 });
  if (await timedOut.isVisible()) {
    // The app gives the first request 20s. The dev server compiles on first use
    // and can be slower than that; a learner's recovery is the Retry link.
    test.info().annotations.push({
      type: "note",
      description: "A1 titles hit the app's 20s limit on the first try; used Retry",
    });
    await page.getByRole("button", { name: "Retry" }).click();
  }
  await expect(lessons.first()).toBeVisible({ timeout: 60_000 });
  await expect(timedOut).toHaveCount(0);
  await expect(page.getByText("Choose a lesson to begin")).toBeVisible();

  const lesson = waitForServerFn(page, "generateLessonContent");
  await lessons.first().click();
  await expectAiSuccess(await lesson);
  await expect(page.getByText("Choose a lesson to begin")).toBeHidden();
});

for (const tool of [
  { rail: "Conjugate", fn: "generateConjugationQuestion" },
  { rail: "Sentences", fn: "generateSentenceBuilder" },
  { rail: "Listening", fn: "generateListeningDrill" },
]) {
  test(`${tool.rail}: starting a run generates the first question`, async ({ page }) => {
    await openTool(page, tool.rail);
    const generated = waitForServerFn(page, tool.fn);
    await page.getByRole("button", { name: /start run/i }).click();
    await expectAiSuccess(await generated);
    await expect(page.getByRole("button", { name: /start run/i })).toBeHidden();
  });
}

for (const tool of [
  { nav: "Idioms", fn: "generateIdiomQuestion" },
  { nav: "False Friends", fn: "generateFalseFriend" },
]) {
  test(`${tool.nav}: starting a run generates the first question`, async ({ page }) => {
    await page.getByRole("button", { name: tool.nav, exact: true }).first().click();
    const generated = waitForServerFn(page, tool.fn);
    await page.getByRole("button", { name: /start run/i }).click();
    await expectAiSuccess(await generated);
    await expect(page.getByRole("button", { name: /start run/i })).toBeHidden();
  });
}

test("ask tutor: a question gets a streamed answer", async ({ page }) => {
  await page
    .getByRole("button", { name: /ask tutor/i })
    .first()
    .click();
  const input = page.getByRole("textbox").last();
  await input.fill("¿Cuál es la diferencia entre por y para? Responde en una frase.");
  const reply = page.waitForResponse((res) => res.url().includes("/api/tutor"), {
    timeout: 90_000,
  });
  await input.press("Enter");
  const res = await reply;
  expect(res.status()).toBe(200);
  const stream = await res.text();
  expect(stream).toMatch(/"content":"[^"]+/);
  await expect(page.getByText(/\bpara\b/i).last()).toBeVisible();
});
