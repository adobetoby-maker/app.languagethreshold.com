// Built by TAC — 2026-10-23
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Exams v2 learner page with /api/exam-check mocked. Every question, option and explanation below
// is an invented FIXTURE: no real bank content, database or exam answer is used here. The server
// rules (windows, the 45 s clock, grace, scoring) are covered by tests/exams2-api.test.mjs and
// tests/exams2-timing.test.mjs; this spec covers what the learner sees and does.
// @dev-only: needs the local dev server (the API mock never reaches production).

const SUPABASE_REF = "pollhlkgltdkdskdzsgd";
const LEARNER_ID = "00000000-0000-4000-8000-0000000000bb";
const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_DONE = "22222222-2222-4222-8222-222222222222";
const TOTAL = 30;

function fakeSession() {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: LEARNER_ID, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 60 * 60 * 24,
    expires_at: exp,
    user: {
      id: LEARNER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "learner-e2e@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
    },
  };
}

// ── Fixture bank: 30 invented questions, mixed types ────────────────────────
type Item = {
  id: string;
  lesson: number;
  type: "mc" | "typed" | "match";
  prompt: string;
  context?: string;
  options?: { id: string; text: string }[];
  left?: string[];
  right?: string[];
  accentsRequired?: true;
};
const fixtureItem = (index: number): Item => {
  const lesson = index + 1;
  const base = { id: `fixture.L${String(lesson).padStart(2, "0")}.i01`, lesson };
  const kind = index % 3;
  if (kind === 0)
    return {
      ...base,
      type: "mc",
      prompt: `FIXTURE question ${lesson}: which word is the invented answer?`,
      context: index === 0 ? "FIXTURE crew line, invented for this test." : undefined,
      options: ["a", "b", "c", "d"].map((letter) => ({
        id: `o${lesson}${letter}`,
        text: `fixture option ${letter.toUpperCase()}${lesson}`,
      })),
    };
  if (kind === 1)
    return {
      ...base,
      type: "typed",
      prompt: `FIXTURE question ${lesson}: type the invented word.`,
      accentsRequired: index === 1 ? true : undefined,
    };
  return {
    ...base,
    type: "match",
    prompt: `FIXTURE question ${lesson}: match each invented pair.`,
    left: [1, 2, 3, 4].map((n) => `fixture left ${n}`),
    right: [3, 1, 4, 2].map((n) => `fixture right ${n}`),
  };
};
const ITEMS = Array.from({ length: TOTAL }, (_, index) => fixtureItem(index));

const windowFor = (kind: "A" | "B" | "C") => {
  if (kind === "A") return { kind, open: true, via: "always", message: "" };
  return kind === "B"
    ? {
        kind,
        open: false,
        opensOn: "2026-11-15",
        lessons: { from: 1, to: 15, done: 3 },
        message: "Opens Nov 15, 2026, or when lessons 1–15 are done.",
      }
    : {
        kind,
        open: false,
        opensOn: "2026-12-30",
        lessons: { from: 1, to: 30, done: 3 },
        message: "Opens Dec 30, 2026, or when lessons 1–30 are done.",
      };
};
const form = (kind: "A" | "B" | "C", extra: Record<string, unknown> = {}) => ({
  kind,
  title: { A: "Baseline", B: "Midpoint", C: "Final" }[kind],
  questions: { A: 30, B: 30, C: 60 }[kind],
  window: windowFor(kind),
  preview: false,
  status: "not_taken",
  inProgress: null,
  attempts: 0,
  best: null,
  last: null,
  retake: { allowed: true },
  ...extra,
});

const lessonHref = (lesson: number) =>
  `/?module=roofing&tab=core30&target=Spanish&native=English&lesson=${lesson}&way=recall`;
function resultFor() {
  const missed = [3, 7, 12];
  return {
    sessionId: SESSION_DONE,
    kind: "A",
    status: "completed",
    completedAt: "2026-10-23T15:20:00.000Z",
    result: {
      kind: "A",
      pct: 68,
      lessons: ITEMS.map((item) => ({
        lesson: item.lesson,
        title: `Fixture lesson ${item.lesson}`,
        pct: missed.includes(item.lesson) ? 0 : 100,
        href: lessonHref(item.lesson),
      })),
      missedLessons: missed.map((lesson) => ({
        lesson,
        title: `Fixture lesson ${lesson}`,
        href: lessonHref(lesson),
      })),
    },
    review: ITEMS.map((item) => {
      const miss = missed.includes(item.lesson);
      return {
        ...item,
        explanation: `FIXTURE explanation for lesson ${item.lesson}, invented for this test.`,
        solution:
          item.type === "mc"
            ? { optionId: item.options![0].id }
            : item.type === "typed"
              ? { text: "fixture-word" }
              : {
                  pairs: [1, 2, 3, 4].map((n) => ({
                    left: `fixture left ${n}`,
                    right: `fixture right ${n}`,
                  })),
                },
        yourAnswer: miss
          ? { type: "dont_know" }
          : item.type === "mc"
            ? { type: "mc", optionId: item.options![0].id }
            : item.type === "typed"
              ? { type: "typed", text: "fixture-word" }
              : { type: "dont_know" },
        points: miss ? 0 : 1,
      };
    }),
  };
}

type Session = { kind: "A"; step: number; status: "in_progress" | "completed" };
interface MockOptions {
  /** Start new tests part-way, so a screenshot can show a mid-test question. */
  startAt?: number;
  signedIn?: boolean;
}
async function mockExams(page: Page, options: MockOptions = {}) {
  const signedIn = options.signedIn ?? true;
  const posted: Record<string, unknown>[] = [];
  const sessions = new Map<string, Session>([
    [SESSION_DONE, { kind: "A", step: TOTAL, status: "completed" }],
  ]);
  let finished = false;

  // Time the server says a question has already been running when it is served: question 2
  // arrives 36 s into its clock (9 s left, amber), question 3 at 41 s (4 s left, red). The rest
  // are fresh.
  const elapsedFor = (step: number) => (step === 1 ? 36_000 : step === 2 ? 41_000 : 0);
  const view = (id: string, session: Session, extra: Record<string, unknown> = {}) => ({
    sessionId: id,
    kind: session.kind,
    moduleId: "roofing",
    target: "Spanish",
    native: "English",
    status: session.status,
    step: session.step,
    total: TOTAL,
    item: session.status === "in_progress" ? ITEMS[session.step] : null,
    timer:
      session.status === "in_progress"
        ? { limitMs: 45_000, graceMs: 5_000, elapsedMs: elapsedFor(session.step) }
        : null,
    ...extra,
  });
  const overview = () => {
    const a = sessions.get(SESSION_A);
    const aForm = !a
      ? form("A")
      : a.status === "in_progress"
        ? form("A", {
            status: "in_progress",
            inProgress: { sessionId: SESSION_A, step: a.step, total: TOTAL },
          })
        : form("A", {
            status: "completed",
            attempts: 1,
            best: { pct: 68, at: "2026-10-23T15:20:00.000Z" },
            last: { pct: 68, at: "2026-10-23T15:20:00.000Z" },
            retake: { allowed: false, message: "You've already taken the baseline test." },
          });
    return {
      target: "Spanish",
      native: "English",
      signedIn,
      staff: false,
      modules: [
        {
          moduleId: "roofing",
          forms: signedIn ? { A: aForm, B: form("B"), C: form("C") } : null,
        },
      ],
    };
  };

  await page.addInitScript(
    ({ key, session, authed }) => {
      if (authed) localStorage.setItem(key, JSON.stringify(session));
    },
    { key: `sb-${SUPABASE_REF}-auth-token`, session: fakeSession(), authed: signedIn },
  );
  await page.route(/supabase\.co\//, (route) =>
    route.fulfill({ status: 401, json: { message: "e2e" } }),
  );
  await page.route(/\/api\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/exam-check")
      return route.fulfill({ status: 404, json: { error: "unmocked " + url.pathname } });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    posted.push(body);
    switch (body.action) {
      case "overview":
        return route.fulfill({ json: overview() });
      case "start": {
        const session: Session = { kind: "A", step: options.startAt ?? 0, status: "in_progress" };
        sessions.set(SESSION_A, session);
        return route.fulfill({ json: view(SESSION_A, session, { resumed: false }) });
      }
      case "resume": {
        const id = body.sessionId as string;
        const session = sessions.get(id);
        if (!session)
          return route.fulfill({
            status: 404,
            json: { error: "We couldn't find that exam session.", code: "not_found" },
          });
        return route.fulfill({ json: view(id, session) });
      }
      case "answer": {
        const id = body.sessionId as string;
        const session = sessions.get(id)!;
        if (body.step !== session.step || body.itemId !== ITEMS[session.step].id)
          return route.fulfill({
            status: 409,
            json: { error: "This question was already answered.", code: "step_mismatch" },
          });
        const expired = body.answer === null;
        session.step += 1;
        if (session.step >= TOTAL) {
          session.status = "completed";
          finished = true;
        }
        return route.fulfill({
          json: view(id, session, { outcome: expired ? "expired" : "recorded" }),
        });
      }
      case "result":
        return route.fulfill({ json: resultFor() });
      default:
        return route.fulfill({ status: 400, json: { error: "bad action", code: "bad_request" } });
    }
  });
  return { posted, wasFinished: () => finished };
}

const clock = (page: Page) => page.getByTestId("question-clock");
const prompt = (page: Page) => page.getByTestId("question-prompt");

/** Answer whatever question is on screen, then press Next. */
async function answerCurrent(page: Page) {
  if (await page.getByRole("radio").count()) {
    await page.getByRole("radio").first().check({ force: true });
  } else if (await page.getByTestId("typed-answer").count()) {
    await page.getByTestId("typed-answer").fill("fixture-word");
  } else {
    const selects = page.locator("select");
    const count = await selects.count();
    for (let index = 0; index < count; index++)
      await selects.nth(index).selectOption({ index: index + 1 });
  }
  await page.getByRole("button", { name: /^(Next|Finish)/ }).click();
}

async function openExams(page: Page, path = "/exams?module=roofing") {
  await page.addInitScript(() => localStorage.setItem("lt.theme.v1", "light"));
  await page.goto(path);
}
const noHorizontalScroll = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);

test("module picker shows the three tests, their status and when each opens", async ({ page }) => {
  await mockExams(page);
  await openExams(page);
  await expect(page.getByRole("heading", { name: "Exams", level: 1 })).toBeVisible({
    timeout: 60_000,
  });

  // Roofing, gutters and siding are offered; roofing has tests, the others say so.
  const picker = page.getByRole("group", { name: "Choose a module" });
  await expect(picker.getByRole("button", { name: /Roofing Foreman/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(picker.getByRole("button", { name: /Roofing Foreman/ })).toContainText(
    "Tests ready",
  );
  await expect(
    picker.getByRole("button", { name: /Gutter Installation Supervisor/ }),
  ).toContainText("Coming soon");
  await expect(
    picker.getByRole("button", { name: /Siding Installation Supervisor/ }),
  ).toContainText("Coming soon");

  const a = page.getByTestId("form-card-A");
  const b = page.getByTestId("form-card-B");
  const c = page.getByTestId("form-card-C");
  await expect(a).toContainText("Baseline");
  await expect(a).toContainText("30 questions, 45 seconds each");
  await expect(a.getByRole("button", { name: "Start" })).toBeEnabled();
  await expect(b).toContainText("Midpoint");
  await expect(c).toContainText("60 questions, 45 seconds each");
  await expect(c).toContainText("Pass at 80%");
  // Locked tests say when they open and are not clickable.
  await expect(b.getByRole("button", { name: "Not open yet" })).toBeDisabled();
  await expect(page.getByTestId("form-opens-B")).toContainText(
    "Opens Nov 15, 2026, or when lessons 1–15 are done.",
  );
  await expect(page.getByTestId("form-opens-B")).toContainText("3 of 15 lessons done so far.");
  await expect(c.getByRole("button", { name: "Not open yet" })).toBeDisabled();
  await expect(page.getByTestId("form-opens-C")).toContainText("Opens Dec 30, 2026");
  await noHorizontalScroll(page);

  // A module without a bank shows all three tests disabled.
  await picker.getByRole("button", { name: /Gutter Installation Supervisor/ }).click();
  for (const kind of ["A", "B", "C"]) {
    const card = page.getByTestId(`form-card-${kind}`);
    await expect(card).toHaveAttribute("data-state", "soon");
    await expect(card.getByRole("button", { name: "Coming soon" })).toBeDisabled();
  }
  await noHorizontalScroll(page);
});

test("a signed-out visitor sees the tests and is asked to sign in to start", async ({ page }) => {
  await mockExams(page, { signedIn: false });
  await openExams(page);
  await expect(page.getByRole("heading", { name: "Exams", level: 1 })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Sign in to take a test and save your results.")).toBeVisible();
  await expect(
    page.getByTestId("form-card-A").getByRole("button", { name: "Sign in to start" }),
  ).toBeEnabled();
  await expect(
    page.getByTestId("form-card-B").getByRole("button", { name: "Sign in to start" }),
  ).toBeEnabled();
});

test("start A: the clock counts down, a question that times out moves on, then the result", async ({
  page,
}) => {
  // Fake clock, installed before the page loads: time still flows, and fastForward / runFor jump it.
  await page.clock.install();
  const mock = await mockExams(page);
  await openExams(page);
  await expect(page.getByRole("heading", { name: "Exams", level: 1 })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByTestId("form-card-A").getByRole("button", { name: "Start" }).click();
  const dialog = page.getByRole("dialog", { name: /Start test A: Baseline/ });
  await expect(dialog).toContainText("30 questions, 45 seconds each");
  await expect(dialog).toContainText("You can take the baseline test once.");
  await dialog.getByRole("button", { name: "Begin test" }).click();

  // Question 1: one question per screen, a progress bar, and the clock near 45 seconds.
  await expect(page.getByTestId("progress-label")).toHaveText("Question 1 of 30");
  await expect(prompt(page)).toContainText("FIXTURE question 1");
  await expect(page.getByRole("progressbar", { name: "Test progress" })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  const readSeconds = async () => Number(await clock(page).getAttribute("data-seconds"));
  await expect.poll(readSeconds).toBeGreaterThanOrEqual(43);
  await expect(clock(page)).toHaveAttribute("data-tone", "calm");
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  const before = await readSeconds();
  await page.clock.runFor(3_000);
  await expect.poll(readSeconds).toBeLessThanOrEqual(before - 3);
  // The visible number is not read out every second; the polite region is still empty.
  const announcer = page.locator('[role="status"].sr-only');
  await expect(announcer).toHaveText("");

  // Let question 1 run out. The page reports it unanswered and the next question appears.
  await page.clock.runFor(46_000);
  await expect(page.getByTestId("progress-label")).toHaveText("Question 2 of 30");
  await expect(
    page.getByText("Time ran out on question 1. It counts as unanswered."),
  ).toBeVisible();
  const expiredPost = mock.posted.find((entry) => entry.action === "answer" && entry.step === 0);
  expect(expiredPost).toMatchObject({ action: "answer", step: 0, answer: null });

  // Question 2 arrives with 9 s left: amber, and announced once at 10 s.
  await expect(clock(page)).toHaveAttribute("data-tone", "warn");
  await expect(announcer).toHaveText("10 seconds left.");
  await answerCurrent(page);

  // Question 3 arrives with 4 s left: red.
  await expect(page.getByTestId("progress-label")).toHaveText("Question 3 of 30");
  await expect(clock(page)).toHaveAttribute("data-tone", "urgent");
  await page.getByRole("button", { name: "I don’t know" }).click();

  // No way back: there is no previous-question control.
  await expect(page.getByRole("button", { name: /previous/i })).toHaveCount(0);

  // Answer the rest. The last button says Finish.
  for (let step = 3; step < TOTAL; step++) {
    await expect(page.getByTestId("progress-label")).toHaveText(`Question ${step + 1} of 30`);
    if (step === TOTAL - 1)
      await expect(page.getByRole("button", { name: "Finish" })).toBeDisabled();
    await answerCurrent(page);
  }
  await expect.poll(() => mock.wasFinished()).toBe(true);

  // Results: score, per-lesson table, missed lessons linked to study, answers and explanations.
  await expect(page.getByRole("heading", { name: "Your baseline" })).toBeVisible();
  await expect(page.getByTestId("result-score")).toHaveText("68%");
  await expect(page.getByText(/Saved to your account/)).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(TOTAL + 1);
  await expect(table.getByRole("link", { name: "Study lesson 3" })).toHaveAttribute(
    "href",
    /lesson=3&way=recall/,
  );
  await expect(table.getByRole("link", { name: "Study lesson 7" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Study lesson 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Missed" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const review = page.getByRole("listitem").filter({ hasText: "FIXTURE question 3:" });
  await review.locator("summary").click();
  await expect(review).toContainText("Right answer");
  await expect(review).toContainText("FIXTURE explanation for lesson 3");
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "FIXTURE question 4:" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("reduced motion keeps the number and drops the ring", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockExams(page);
  await openExams(page);
  await page.getByTestId("form-card-A").getByRole("button", { name: "Start" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Begin test" }).click();
  await expect(page.getByTestId("progress-label")).toHaveText("Question 1 of 30");
  await expect(clock(page)).toContainText("seconds left");
  await expect(clock(page).locator("svg")).toHaveCount(0);
  await expect
    .poll(async () => Number(await clock(page).getAttribute("data-seconds")))
    .toBeGreaterThanOrEqual(43);
});

test("the test can be answered from the keyboard", async ({ page }) => {
  await mockExams(page);
  await openExams(page);
  await page.getByTestId("form-card-A").getByRole("button", { name: "Start" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Begin test" }).click();
  await expect(prompt(page)).toContainText("FIXTURE question 1");
  // The prompt has focus; Tab reaches the options, an arrow key picks one, Enter sends.
  await expect(prompt(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("progress-label")).toHaveText("Question 2 of 30");
  // Question 2 is typed: its field takes focus, and Enter sends the answer.
  await expect(page.getByTestId("typed-answer")).toBeFocused();
  await page.keyboard.type("fixture-word");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("progress-label")).toHaveText("Question 3 of 30");
});

// Screenshot capture for review (EXAM_SHOTS=1): light and dark, 375@2x, 1440, 2560 and 2560@2x.
for (const theme of ["light", "dark"] as const) {
  test(`capture exams v2 screenshots (${theme})`, async ({ browser }, info) => {
    test.skip(!process.env.EXAM_SHOTS || info.project.name !== "desktop", "capture runs on demand");
    mkdirSync(".claude/verify/exams-ui", { recursive: true });
    for (const [name, viewport, scale] of [
      ["375", { width: 375, height: 812 }, 2],
      ["1440", { width: 1440, height: 900 }, 1],
      ["2560", { width: 2560, height: 1440 }, 1],
      ["2560@2x", { width: 2560, height: 1440 }, 2],
    ] as const) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: scale,
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.addInitScript((value) => localStorage.setItem("lt.theme.v1", value), theme);
      await mockExams(page, { startAt: 6 });
      await page.goto("/exams?module=roofing");
      await expect(page.getByTestId("form-card-C")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("form-status-A")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `.claude/verify/exams-ui/picker-${theme}-${name}.png`,
        fullPage: true,
      });

      await page.getByTestId("form-card-A").getByRole("button", { name: "Start" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Begin test" }).click();
      await expect(page.getByTestId("progress-label")).toHaveText("Question 7 of 30");
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `.claude/verify/exams-ui/runner-${theme}-${name}.png`,
        fullPage: true,
      });

      // Answer question 7 (multiple choice) to reach question 8, a typed question with a fresh clock.
      await answerCurrent(page);
      await expect(page.getByTestId("progress-label")).toHaveText("Question 8 of 30");
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `.claude/verify/exams-ui/runner-next-${theme}-${name}.png`,
        fullPage: true,
      });

      await page.goto(`/exams?module=roofing&session=${SESSION_DONE}`);
      await expect(page.getByTestId("result-score")).toBeVisible({ timeout: 60_000 });
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `.claude/verify/exams-ui/results-${theme}-${name}.png`,
        fullPage: true,
      });
      await context.close();
    }
  });
}
