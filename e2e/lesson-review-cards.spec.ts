import type { FlashcardEntry } from "../src/state/flashcard-state";
import { expect, test } from "@playwright/test";
import { appUrl, core30Key, seedAppState } from "./app-state";
import { getCurriculum } from "../src/data/curriculum";
const pathScope = core30Key("roofing");
const reviewKey = `lt.learner-device.v1.${encodeURIComponent(`lesson-review:${pathScope}`)}.guest`;
const flashKey = "lt.learner-device.v1.flashcards.guest";
const source = getCurriculum("roofing")!.lessons[0].words![0];
const history = [{ grade: "hard", at: 1000 }];
const existingSrs = {
  easeFactor: 2.1,
  interval: 8,
  repetitions: 3,
  dueDate: 1000,
  lastReviewedAt: 1000,
};
const existingId = "module-generated:Spanish:roofing:legacy-existing-word";
const mastered = (count: number) => ({
  lessons: Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      String(i + 1),
      { visits: {}, masteredAt: "2026-10-01T12:00:00Z" },
    ]),
  ),
});

test("checkpoint crosses Foundation/Core boundary, reuses history, resumes and continues once", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60000,
  });
  await seedAppState(page, {
    onboardingComplete: true,
    activeModuleId: "roofing",
    selectedLanguage: "Spanish",
    nativeLanguage: "English",
    currentTab: "core30",
    purchasedModules: ["roofing"],
    lessonProgress: { [core30Key("foundation-roofing")]: 10, [pathScope]: 2 },
    core30Log: { [core30Key("foundation-roofing")]: mastered(10), [pathScope]: mastered(2) },
  });
  await page.evaluate(
    ({ reviewKey, flashKey, pathScope, existingId, source, history, existingSrs }) => {
      localStorage.setItem(
        reviewKey,
        JSON.stringify({
          schema: 1,
          actor: null,
          kind: `lesson-review:${pathScope}`,
          data: { completed: { 3: 1, 6: 1, 9: 1 }, round: null },
        }),
      );
      const card = {
        id: existingId,
        language: "Spanish",
        moduleId: "roofing",
        word: source.es,
        translation: source.en,
        example: "",
        exampleTranslation: "",
        category: "module",
        source: "starter",
        addedAt: 1,
        srs: existingSrs,
        reviewHistory: history,
      };
      localStorage.setItem(
        flashKey,
        JSON.stringify({
          schema: 1,
          actor: null,
          kind: "flashcards",
          data: { cards: { [existingId]: card }, seededLanguages: [], seededDecks: [] },
        }),
      );
    },
    { reviewKey, flashKey, pathScope, existingId, source, history, existingSrs },
  );
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  const overview = page.getByTestId("lesson-review-checkpoint");
  await expect(
    overview.getByRole("button", { name: "Review after lesson 12", exact: true }),
  ).toBeVisible();
  await page.getByTestId("core30-all-lessons-toggle").click();
  await expect(page.getByTestId("review-checkpoint-12")).toContainText("Ready");
  await expect(page.getByTestId("review-checkpoint-15")).toBeDisabled();
  await page.getByRole("button", { name: "Start Lesson 3", exact: true }).click();
  const review = page.getByTestId("lesson-review-cards");
  await expect(review.getByTestId("lesson-review-flip")).toContainText(source.es);
  await expect(review.getByRole("button", { name: /^Good/ })).toBeDisabled();
  await review.getByTestId("lesson-review-flip").click();
  await expect(review.getByTestId("lesson-review-flip")).toContainText(source.en);
  await review.getByRole("button", { name: /^Again/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        ({ flashKey, existingId }) =>
          JSON.parse(localStorage.getItem(flashKey)!).data.cards[existingId].reviewHistory.length,
        { flashKey, existingId },
      ),
    )
    .toBe(2);
  await expect
    .poll(() =>
      page.evaluate(
        ({ flashKey, existingId }) =>
          JSON.parse(localStorage.getItem(flashKey)!).data.cards[existingId].srs.interval,
        { flashKey, existingId },
      ),
    )
    .toBe(1);
  await review.getByRole("button", { name: "Save & exit" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Resume review", exact: true }).click();
  await expect(review).toContainText("1 reviewed");
  for (let i = 0; i < 18 && (await review.getByTestId("lesson-review-flip").count()); i++) {
    await review.getByTestId("lesson-review-flip").click();
    await review.getByRole("button", { name: /^Good/ }).click();
  }
  await expect(review.getByText("Review complete", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Continue learning", exact: true }).click();
  await expect(page.getByTestId("lesson-review-checkpoint")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review after lesson 12", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume review", exact: true })).toHaveCount(0);
  const snapshot = await page.evaluate(
    ({ flashKey, reviewKey }) => ({
      cards: JSON.parse(localStorage.getItem(flashKey)!).data.cards,
      review: JSON.parse(localStorage.getItem(reviewKey)!).data,
    }),
    { flashKey, reviewKey },
  );
  expect(snapshot.review.completed["12"]).toBeGreaterThan(1);
  expect(snapshot.cards[existingId].reviewHistory[0]).toEqual(history[0]);
  const same = Object.values(snapshot.cards).filter(
    (c: FlashcardEntry) => c.moduleId === "roofing" && c.word === source.es && c.translation === source.en,
  );
  expect(same).toHaveLength(1);
  // No future roofing lesson 3+ cards were seeded by this checkpoint.
  const encountered = new Set(
    getCurriculum("roofing")!
      .lessons.slice(0, 2)
      .flatMap((l) => (l.words ?? []).map((w) => JSON.stringify([w.es, w.en]))),
  );
  for (const c of Object.values(snapshot.cards) as FlashcardEntry[]) {
    if (c.moduleId === "roofing")
      expect(encountered.has(JSON.stringify([c.word, c.translation]))).toBe(true);
  }
});
