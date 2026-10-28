import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// These tests identify server functions by the name encoded in the dev-server URL.
// Production builds use hashed ids, so they only run against a local dev server.
const REMOTE = /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");
test.skip(REMOTE, "server functions are named only on a dev server");

// Grammar quiz: every screen must leave the learner a way forward or back.
// The AI calls are stubbed (TanStack server-function wire format) so the quiz outcome is
// deterministic and the test never spends tokens.

type Json = null | undefined | string | number | Json[] | { [k: string]: Json };

function encode(root: Json): string {
  let nextId = 0;
  const enc = (v: Json): unknown => {
    if (v === null) return { t: 2, s: 0 };
    if (v === undefined) return { t: 2, s: 1 };
    if (typeof v === "string") return { t: 1, s: v };
    if (typeof v === "number") return { t: 0, s: v };
    if (Array.isArray(v)) return { t: 9, i: ++nextId, a: v.map(enc), o: 0 };
    const keys = Object.keys(v);
    return { t: 10, i: ++nextId, p: { k: keys, v: keys.map((k) => enc(v[k])) }, o: 0 };
  };
  const result = enc(root);
  return JSON.stringify({
    t: 10,
    i: 0,
    p: {
      k: ["result", "error", "context"],
      v: [result, { t: 2, s: 1 }, { t: 11, i: 9999, p: { k: [], v: [] }, o: 0 }],
    },
    o: 0,
  });
}

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

const QUESTIONS = [
  {
    type: "multiple_choice",
    question: "Pick the masculine article",
    options: ["el", "la", "las"],
    answer: "el",
    explanation: "El is masculine singular.",
  },
  {
    type: "fill_blank",
    question: "___ casa es grande.",
    answer: "La",
    explanation: "Casa is feminine.",
  },
  {
    type: "multiple_choice",
    question: "Pick the plural feminine",
    options: ["los", "las", "el"],
    answer: "las",
    explanation: "Las is feminine plural.",
  },
];

type QuizReply = { data: { questions: typeof QUESTIONS } | null; error: string | null };

async function openQuiz(page: Page, initialReply: QuizReply) {
  // One mutable reply, not a per-call queue: React StrictMode runs the load effect twice in dev,
  // so a call counter would hand the second (real) request the wrong reply.
  const quiz = { reply: initialReply };
  const replies: Record<string, () => Json> = {
    generateLessonTitles: () => ({
      data: {
        lessons: [1, 2, 3, 4, 5, 6].map((n) => ({
          id: `l${n}`,
          title: `Lesson title ${n}`,
          concept: `Concept ${n}`,
        })),
      },
      error: null,
    }),
    generateLessonContent: () => ({
      data: {
        explanation: "Spanish nouns have a grammatical gender. ".repeat(10),
        examples: [{ target: "El libro", english: "The book" }],
        keyRule: "Masculine takes el, feminine takes la.",
      },
      error: null,
    }),
    generateLessonQuiz: () => quiz.reply as unknown as Json,
  };
  await page.route("**/_serverFn/**", async (route) => {
    const name = serverFnName(route.request().url());
    const reply = name ? replies[name] : undefined;
    if (!reply) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-tss-serialized": "true" },
      body: encode(reply()),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const lesson = page.getByRole("button", { name: /Lesson title 1/ }).first();
  // On a cold dev server the app can finish loading after the seed is written and drop it,
  // so seed again (up to three times) until the Grammar tab is showing.
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, { currentTab: "grammar" });
    await page.goto(appUrl({ tab: "grammar" }));
    if (await lesson.isVisible({ timeout: 20_000 }).catch(() => false)) break;
  }
  await expect(lesson).toBeVisible({ timeout: 20_000 });
  await lesson.click();
  await page.getByRole("button", { name: /Begin Quiz/ }).click();
  return { dialog: page.getByRole("dialog"), quiz };
}

async function answerAll(dialog: ReturnType<Page["getByRole"]>, correct: boolean) {
  for (const q of QUESTIONS) {
    if (q.type === "multiple_choice") {
      const pick = correct ? q.answer : q.options.find((o) => o !== q.answer)!;
      await dialog.getByRole("button", { name: pick, exact: true }).click();
    } else {
      await dialog.getByPlaceholder("Type your answer…").fill(correct ? q.answer : "zzz");
    }
    await dialog.getByRole("button", { name: "Submit" }).click();
    await dialog.getByRole("button", { name: /Next|See results/ }).click();
  }
}

test("a failed quiz load offers Try again and Back to Grammar", async ({ page }) => {
  const { dialog, quiz } = await openQuiz(page, { data: null, error: "AI is not configured" });
  await expect(dialog.getByRole("alert")).toContainText("AI is not configured");
  await expect(dialog.getByRole("button", { name: "Back to Grammar" })).toBeVisible();
  quiz.reply = { data: { questions: QUESTIONS }, error: null };
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText("Pick the masculine article")).toBeVisible();
});

test("an empty quiz is not a blank dialog", async ({ page }) => {
  const { dialog } = await openQuiz(page, { data: { questions: [] }, error: null });
  await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();
  await dialog.getByRole("button", { name: "Back to Grammar" }).click();
  await expect(dialog).toBeHidden();
});

test("a failing score offers Try again, which restarts the quiz", async ({ page }) => {
  const { dialog } = await openQuiz(page, { data: { questions: QUESTIONS }, error: null });
  await answerAll(dialog, false);
  await expect(dialog.getByText("0 / 3 correct")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue anyway" })).toBeVisible();
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText("Pick the masculine article")).toBeVisible();
});

test("a perfect score offers Continue and ends on the lesson-complete panel", async ({ page }) => {
  const { dialog } = await openQuiz(page, { data: { questions: QUESTIONS }, error: null });
  await answerAll(dialog, true);
  await expect(dialog.getByText("3 / 3 correct")).toBeVisible();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Lesson complete", { exact: true })).toBeVisible();
});

test("Back exits the quiz first and the grammar lesson on the next press", async ({ page }) => {
  const { dialog } = await openQuiz(page, { data: { questions: QUESTIONS }, error: null });
  await expect(dialog.getByRole("button", { name: "Close quiz", exact: true })).toBeVisible();
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Begin Quiz/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: /Begin Quiz/ })).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Lesson title 1/ }).first()).toBeVisible();
});
