import { expect, test, type Locator, type Page } from "@playwright/test";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";
import { appUrl, core30Key, readAppState, seedAppState } from "./app-state.ts";

// Click tests for the "Write it" (handwriting) mode of the Core 30 practice kit, and the
// answer feedback shared with Type mode, on Roofing lesson 1 (Spanish). The handwriting reader
// is a server function, stubbed here with page.route by URL, so these tests need no API key.
// Dev-server URLs only: a production build hides the server function paths.
const REMOTE = /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");
test.skip(REMOTE, "server functions are stubbed by URL, which only a dev server allows");
// The service worker would answer server function calls itself, past page.route.
test.use({ serviceWorkers: "block" });

const MODULE = "roofing";
const WORDS = ROOFING_LESSON_WORDS[1];
const TERMS = WORDS.filter((w) => w.kind === "term");

const pad = (n: number) => String(n).padStart(2, "0");
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Opens the Core 30 tab of the Roofing module with the plan started today (copied from core30-plan.spec.ts). */
async function openCore30(page: Page) {
  const startDate = today();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const seeded = async () => {
    const state = await readAppState(page);
    const log = state.core30Log as Record<string, { startDate?: string }> | undefined;
    return (
      state.activeModuleId === MODULE &&
      state.currentTab === "core30" &&
      log?.[core30Key(MODULE)]?.startDate === startDate
    );
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const previous = await readAppState(page);
    await seedAppState(page, {
      activeModuleId: MODULE,
      selectedLanguage: "Spanish",
      currentTab: "core30",
      lessonProgress: {
        ...((previous.lessonProgress as object | undefined) ?? {}),
        [core30Key(MODULE)]: 0,
      },
      core30Log: { [core30Key(MODULE)]: { startDate, lessons: {} } },
    });
    await page.goto(appUrl({ tab: "core30", module: MODULE }));
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

/**
 * Switches the practice kit to `mode` the way a learner does: the lesson's own section bar when
 * the lesson page has one, otherwise the kit's mode tabs.
 */
async function openKitMode(page: Page, mode: "write" | "type") {
  const kit = page.getByTestId("practice-kit");
  const section = page.getByTestId(`lesson-nav-${mode}`);
  if ((await section.count()) > 0) await section.click();
  const tab = kit.getByTestId(`practice-mode-${mode}`);
  if ((await tab.isVisible()) && (await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
  await expect(kit).toBeVisible();
  return kit;
}

/** Opens lesson 1 and switches the practice kit to Write. */
async function openWriteMode(page: Page) {
  await openCore30(page);
  await page.getByRole("button", { name: /Today: Lesson 1/ }).click();
  await expect(page.getByText("✕ Exit")).toBeVisible();
  const kit = await openKitMode(page, "write");
  const workspace = page.getByRole("dialog", { name: "Writing practice", exact: true });
  await expect(workspace.getByTestId("write-stage-copy")).toBeVisible();
  return workspace.getByTestId("writing-words");
}

/** Draws one wavy stroke across the pad: touch on a phone, mouse on a desktop. */
async function drawStroke(page: Page, pad: Locator, touch: boolean) {
  const canvas = pad.getByTestId("handwriting-canvas");
  // Centre the pad: on a phone the lesson's sticky section bar would cover it at the top edge.
  await expect(canvas).toBeInViewport();
  const scrollBefore = await page.evaluate(() => ({
    page: window.scrollY,
    lesson: document.querySelector("main")?.scrollTop ?? 0,
    workspace: document.querySelector('[data-testid="writing-workspace-body"]')?.scrollTop ?? 0,
  }));
  const box = await canvas.boundingBox();
  expect(box, "the pad has a size").toBeTruthy();
  const { x, y, width, height } = box!;
  const points = Array.from({ length: 14 }, (_, i) => ({
    x: x + width * (0.2 + 0.6 * (i / 13)),
    y: y + height * (0.55 + 0.12 * Math.sin(i)),
  }));
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] });
    for (const p of points.slice(1)) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
    await page.mouse.up();
  }
  await expect(canvas).toHaveAttribute("data-ink", "true");
  expect(await page.evaluate(() => ({
    page: window.scrollY,
    lesson: document.querySelector("main")?.scrollTop ?? 0,
    workspace: document.querySelector('[data-testid="writing-workspace-body"]')?.scrollTop ?? 0,
  }))).toEqual(scrollBefore);
}

/** The seroval body TanStack Start returns for the handwriting reader: { text, error }. */
function readBody(result: { text?: string; error?: string }) {
  let id = 0;
  const str = (s: string) => ({ t: 1, s });
  const nil = { t: 2, s: 0 };
  const undef = { t: 2, s: 1 };
  const payload = {
    t: 10,
    i: ++id,
    p: {
      k: ["text", "error"],
      v: [result.text ? str(result.text) : nil, result.error ? str(result.error) : nil],
    },
    o: 0,
  };
  return JSON.stringify({
    t: 10,
    i: 0,
    p: {
      k: ["result", "error", "context"],
      v: [payload, undef, { t: 11, i: ++id, p: { k: [], v: [] }, o: 0 }],
    },
    o: 0,
  });
}

type Reply = { text?: string; error?: string } | "abort";

/** Answers the handwriting reader; `reply` gets the call number (1-based) and returns the result. */
async function stubReader(page: Page, reply: (call: number) => Reply) {
  const calls: string[] = [];
  await page.route("**/_serverFn/**", async (route) => {
    const body = route.request().postData() ?? "";
    if (!body.includes("imageBase64")) return route.fallback();
    calls.push(body);
    const answer = reply(calls.length);
    if (answer === "abort") return route.abort("failed");
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: readBody(answer),
    });
  });
  return calls;
}

/** The first copy word shown on screen, with its lesson entry. */
async function shownCopyWord(kit: Locator) {
  const es = (await kit.getByTestId("write-copy-word").innerText()).trim();
  const word = WORDS.find((w) => w.es === es);
  expect(word, `copy word "${es}" is a lesson-1 word`).toBeTruthy();
  return word!;
}

/** The lesson word whose English prompt is on screen. */
async function shownAnswerWord(kit: Locator) {
  const en = (await kit.getByTestId("write-answer-prompt").innerText()).trim();
  const word = WORDS.find((w) => w.en === en);
  expect(word, `prompt "${en}" is a lesson-1 word`).toBeTruthy();
  return word!;
}

test("fixed writing workspace keeps pad and lesson steady on a short phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch regression uses the phone project");
  await page.setViewportSize({ width: 390, height: 667 });
  const work = await openWriteMode(page);
  const workspace = page.getByRole("dialog", { name: "Writing practice", exact: true });
  await expect(workspace).toHaveCSS("position", "fixed");
  const pad = work.getByTestId("handwriting-canvas");
  const before = await pad.boundingBox();
  const check = await work.getByTestId("write-check").boundingBox();
  expect(before!.y).toBeGreaterThanOrEqual(0);
  expect(check!.y + check!.height).toBeLessThanOrEqual(667);
  await drawStroke(page, work.getByTestId("handwriting-pad"), true);
  await workspace.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
  const response = workspace.getByRole("region", { name: "Handwritten lesson response", exact: true });
  await drawStroke(page, response.getByTestId("handwriting-pad"), true);
  await workspace.getByRole("combobox", { name: "Writing activity" }).selectOption("words");
  await expect(pad).toHaveAttribute("data-ink", "true");
  await work.getByTestId("write-compare").click();
  await work.getByRole("button", { name: "Matches", exact: true }).click();
  await expect(work.getByText(`2 of ${TERMS.length} · copy`)).toBeVisible();
  const after = await pad.boundingBox();
  expect(Math.abs(after!.y - before!.y), `pad before=${before!.y}, after=${after!.y}`).toBeLessThanOrEqual(1);
  await expect(pad).toHaveAttribute("data-ink", "false");
  await workspace.getByRole("button", { name: "Back to lesson", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Writing practice" })).toHaveCount(0);
  await expect(page.getByTestId("practice-mode-study")).toHaveAttribute("aria-selected", "true");
});

test.describe("Write it: handwriting practice (Roofing lesson 1)", () => {
  test("1. copy it: write over the word, compare it yourself, mark Matches", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    // Inside a lesson the section bar is the only navigation: no second six-way tab row.
    await expect(kit.getByText(/ways to practice/)).toHaveCount(0);
    await expect(kit.getByRole("tablist", { name: "Practice mode" })).toHaveCount(0);
    await expect(kit.getByText(`1 of ${TERMS.length} · copy`)).toBeVisible();
    const word = await shownCopyWord(kit);
    expect(word.kind).toBe("term");

    // Nothing is written yet, so there is nothing to check.
    await expect(kit.getByTestId("write-check")).toBeDisabled();
    await expect(kit.getByTestId("write-compare")).toBeDisabled();

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-compare").click();

    // The learner's ink and the word are shown together, with no network call.
    await expect(kit.getByTestId("write-ink")).toBeVisible();
    await expect(kit.getByTestId("write-reveal").getByText(word.es, { exact: true })).toBeVisible();

    await kit.getByRole("button", { name: "Matches" }).click();
    await expect(kit.getByText(`2 of ${TERMS.length} · copy`)).toBeVisible();
    await expect(kit.getByText("Matched 1")).toBeVisible();
    // A fresh blank pad for the next word.
    await expect(kit.getByTestId("handwriting-canvas")).toHaveAttribute("data-ink", "false");
  });

  test("2. copy it with Check: a misread letter shows the wrong letter and a tip, then Correct", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    const word = await shownCopyWord(kit);
    const at = [...word.es].findIndex((ch, i) => i >= 1 && /[a-y]/.test(ch));
    expect(at, "the word has a plain lowercase letter to change").toBeGreaterThan(0);
    const right = word.es[at];
    const misspelled = word.es.slice(0, at) + "z" + word.es.slice(at + 1);
    const calls = await stubReader(page, (n) => ({ text: n === 1 ? misspelled : word.es }));

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();

    const feedback = kit.getByTestId("answer-feedback");
    await expect(feedback).toHaveAttribute("data-verdict", "close");
    await expect(feedback.locator('[data-status="wrong"]')).toHaveText(right);
    await expect(feedback.getByTestId("answer-feedback-tips")).toContainText(
      `Use ${right} instead of z`,
    );
    await expect(feedback.getByTestId("answer-feedback-read")).toContainText(misspelled);
    // The copied word goes to the reader as a hint, and the language is sent.
    expect(calls[0]).toContain("expected");
    expect(calls[0]).toContain("Spanish");

    // Not a match: try again with a fresh pad, this time read correctly.
    // Try again keeps the writing; Clear is what wipes the pad.
    await kit.getByRole("button", { name: "Try again" }).click();
    await expect(kit.getByTestId("handwriting-canvas")).toHaveAttribute("data-ink", "true");
    await kit.getByRole("button", { name: "Clear" }).click();
    await expect(kit.getByTestId("handwriting-canvas")).toHaveAttribute("data-ink", "false");
    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();
    await expect(kit.getByTestId("answer-feedback")).toHaveAttribute("data-verdict", "correct");
    await expect(kit.getByTestId("answer-feedback-verdict")).toHaveText("Correct");
    expect(calls).toHaveLength(2);

    await kit.getByRole("button", { name: "Next word" }).click();
    await expect(kit.getByText(`2 of ${TERMS.length} · copy`)).toBeVisible();
    await expect(kit.getByText("Matched 1")).toBeVisible();
  });

  test("3. write the answer: the stubbed reader returns the right text and it is Correct", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    const word = await shownAnswerWord(kit);
    const calls = await stubReader(page, () => ({ text: word.es }));

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();

    const feedback = kit.getByTestId("answer-feedback");
    await expect(feedback).toHaveAttribute("data-verdict", "correct");
    await expect(kit.getByTestId("answer-feedback-verdict")).toHaveText("Correct");
    await expect(feedback.getByTestId("answer-feedback-read")).toContainText(word.es);
    // A word written from memory is read with no hint, so a wrong answer cannot be read as right.
    expect(calls[0]).not.toContain("expected");

    await kit.getByRole("button", { name: "Next word" }).click();
    await expect(kit.getByText("Score 1")).toBeVisible();
    await expect(kit.getByText(new RegExp(`^2 of ${WORDS.length} · `))).toBeVisible();
  });

  test("4. write the answer: a wrong reading shows the answer and is not scored", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    await shownAnswerWord(kit);
    await stubReader(page, () => ({ text: "martillo grande" }));

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();

    const feedback = kit.getByTestId("answer-feedback");
    await expect(feedback).toHaveAttribute("data-verdict", "wrong");
    await expect(feedback.getByTestId("answer-feedback-read")).toContainText("martillo grande");
    await kit.getByRole("button", { name: "Next word" }).click();
    await expect(kit.getByText("Score 0")).toBeVisible();
  });

  test("5. a failed check falls back to reveal and self-rate", async ({ page, isMobile }) => {
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    const word = await shownAnswerWord(kit);
    await stubReader(page, () => "abort");

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();

    const reveal = kit.getByTestId("write-reveal");
    await expect(reveal).toBeVisible();
    await expect(reveal.getByText(word.es, { exact: true })).toBeVisible();
    await expect(kit.getByText(/Could not check your writing right now/)).toBeVisible();
    await expect(kit.getByTestId("answer-feedback")).toHaveCount(0);

    await kit.getByRole("button", { name: "Got it" }).click();
    await expect(kit.getByText("Score 1")).toBeVisible();
  });

  test("5b. a failed check keeps the writing: Check again re-sends it, Start over clears it", async ({
    page,
    isMobile,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (/Cannot update a component/.test(message.text())) warnings.push(message.text());
    });
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    const word = await shownAnswerWord(kit);
    const calls = await stubReader(page, (call) => (call === 1 ? "abort" : { text: word.es }));
    const canvas = kit.getByTestId("handwriting-canvas");

    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();
    await expect(kit.getByTestId("write-reveal")).toBeVisible();
    await expect(kit.getByText(/Your writing is kept/)).toBeVisible();
    // The ink is still on the (hidden) pad, and its preview is on screen.
    await expect(canvas).toHaveAttribute("data-ink", "true");
    await expect(kit.getByTestId("write-ink")).toBeVisible();

    // Check again sends the same writing without drawing anything new.
    await kit.getByTestId("write-check-again").click();
    await expect(kit.getByTestId("answer-feedback")).toHaveAttribute("data-verdict", "correct");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(calls[0]);

    expect(warnings).toEqual([]);
  });

  test("5c. Start over after a failed check is the only thing that clears the pad", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    await shownAnswerWord(kit);
    await stubReader(page, () => "abort");
    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await kit.getByTestId("write-check").click();
    await expect(kit.getByTestId("write-reveal")).toBeVisible();

    await kit.getByTestId("write-start-over").click();
    await expect(kit.getByTestId("handwriting-canvas")).toHaveAttribute("data-ink", "false");
    await expect(kit.getByTestId("write-check")).toBeDisabled();
  });

  test("5d. a slow reader shows a spinner, then times out and keeps the writing", async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90_000);
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    await shownAnswerWord(kit);
    await page.route("**/_serverFn/**", async (route) => {
      if (!(route.request().postData() ?? "").includes("imageBase64")) return route.fallback();
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await route.abort("failed").catch(() => undefined);
    });
    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    const started = Date.now();
    await kit.getByTestId("write-check").click();
    await expect(kit.getByText("Reading your handwriting…")).toBeVisible();
    await expect(kit.getByTestId("write-reveal")).toBeVisible({ timeout: 25_000 });
    expect(Date.now() - started).toBeLessThan(18_000);
    await expect(kit.getByText(/taking too long/)).toBeVisible();
    await expect(kit.getByTestId("handwriting-canvas")).toHaveAttribute("data-ink", "true");
  });

  test("6. offline: no network call, reveal the answer and rate yourself", async ({
    page,
    isMobile,
  }) => {
    const kit = await openWriteMode(page);
    await kit.getByTestId("write-stage-answer").click();
    const word = await shownAnswerWord(kit);
    const calls = await stubReader(page, () => ({ text: word.es }));
    // Draw first: the touch helper opens its own CDP session, which can reset the offline switch.
    await drawStroke(page, kit.getByTestId("handwriting-pad"), isMobile);
    await page.context().setOffline(true);
    try {
      await expect(kit.getByText(/You are offline\. Use/)).toBeVisible();
      await kit.getByTestId("write-check").click();
      await expect(kit.getByTestId("write-reveal")).toBeVisible();
      await expect(kit.getByText("You are offline, so check your writing yourself.")).toBeVisible();
      expect(calls).toHaveLength(0);
      await kit.getByRole("button", { name: "Missed it" }).click();
      await expect(kit.getByText("Score 0")).toBeVisible();
      await expect(kit.getByText(new RegExp(`^2 of ${WORDS.length} · `))).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });

  test("7. Type mode: a near miss shows answer feedback with the missing letter", async ({
    page,
  }) => {
    const kit = await openWriteMode(page);
    await openKitMode(page, "type");
    const prompt = kit.getByText("Type this in Spanish").locator("xpath=following-sibling::p[1]");
    await expect(prompt).toBeVisible();
    const english = (await prompt.innerText()).trim();
    const word = WORDS.find((w) => w.en === english);
    expect(word, `prompt "${english}" is a lesson-1 word`).toBeTruthy();

    // Drop one plain letter from the first side of the entry.
    const entry = word!.es.split(/\s*[(/]/)[0].trim();
    const at = [...entry].findIndex((ch, i) => i >= 2 && /[a-z]/.test(ch));
    expect(at, "the entry has a plain letter to drop").toBeGreaterThan(1);
    const dropped = entry[at];
    await kit.getByTestId("type-input").fill(entry.slice(0, at) + entry.slice(at + 1));
    await kit.getByRole("button", { name: "Check" }).click();

    const feedback = kit.getByTestId("answer-feedback");
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute("data-verdict", "close");
    await expect(feedback.locator('[data-status="missing"]').first()).toBeVisible();
    // A short word that loses a letter near its end gets an ending tip instead of a letter tip.
    await expect(feedback.getByTestId("answer-feedback-tips")).toContainText(
      new RegExp(`Missing letter: ${dropped}|Ending should be`),
    );
    await expect(kit.getByRole("status")).toHaveCount(1);
    await expect(kit.getByText("Score 0")).toBeVisible();
  });

  test("8. Type mode: a missing accent is right, with an accent tip", async ({ page }) => {
    const kit = await openWriteMode(page);
    await openKitMode(page, "type");
    // Shuffled order: step through until a word with an accent comes up.
    for (let i = 0; i < WORDS.length; i += 1) {
      const prompt = kit.getByText("Type this in Spanish").locator("xpath=following-sibling::p[1]");
      const english = (await prompt.innerText()).trim();
      const word = WORDS.find((w) => w.en === english)!;
      const entry = word.es.split(/\s*[(/]/)[0].trim();
      const plain = entry.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (plain !== entry) {
        await kit.getByTestId("type-input").fill(plain);
        await kit.getByRole("button", { name: "Check" }).click();
        const feedback = kit.getByTestId("answer-feedback");
        await expect(feedback).toHaveAttribute("data-verdict", "accent");
        await expect(feedback.locator('[data-status="accent"]').first()).toBeVisible();
        // Every earlier word was typed exactly right, and this one counts too: accents do not cost points.
        await expect(kit.getByText(`Score ${i + 1}`)).toBeVisible();
        return;
      }
      await kit.getByTestId("type-input").fill(entry);
      await kit.getByRole("button", { name: "Check" }).click();
      await expect(kit.getByTestId("answer-feedback")).toHaveAttribute("data-verdict", "correct");
      await kit.getByRole("button", { name: /Next word|See score/ }).click();
    }
    test.skip(true, "no lesson-1 word has an accent");
  });
});
