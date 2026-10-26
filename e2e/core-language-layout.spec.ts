import { expect, test } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";

test.use({ serviceWorkers: "block" });

const pairs = [
  ["Spanish", "English"],
  ["French", "English"],
  ["German", "English"],
  ["Italian", "English"],
  ["Japanese", "English"],
  ["Chinese", "English"],
  ["Korean", "English"],
  ["Portuguese", "English"],
  ["Pashto", "English"],
  ["English", "Spanish"],
] as const;

type Frame = {
  viewportOverflow: number;
  scroll: number;
  card: { x: number; y: number; width: number; height: number };
  grading: { x: number; y: number; right: number; bottom: number };
  navTop: number;
};

test("Core card frame and grading fit every language and representative modules on phones", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  const cases = [
    ...pairs.map(([target, native]) => ({ module: "construction-foreman", target, native })),
    { module: "roofing", target: "Spanish", native: "English" },
    { module: "nursing", target: "Spanish", native: "English" },
  ];

  for (const size of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(size);
    for (const entry of cases) {
      await page.goto(
        appUrl({
          tab: "core30",
          module: entry.module,
          target: entry.target,
          native: entry.native,
        }) + "&lesson=1&way=recall",
      );
      await page.getByTestId("practice-mode-flashcards").click();
      const card = page.getByTestId("flashcard");
      const grading = page.getByTestId("lesson-cards-grading");
      await expect(
        card,
        `${entry.module} ${entry.target}/${entry.native} has a card`,
      ).toBeVisible();
      await expect(grading.getByRole("button", { name: "Again", exact: true })).toBeEnabled();
      await expect(grading.getByRole("button", { name: "Got it", exact: true })).toBeEnabled();
      const beforeProgress = (await readAppState(page)).core30Log;

      const readFrame = (): Promise<Frame> =>
        page.evaluate(() => {
          const main = document.querySelector("main")!;
          const card = document.querySelector('[data-testid="flashcard"]')!.getBoundingClientRect();
          const grading = document
            .querySelector('[data-testid="lesson-cards-grading"]')!
            .getBoundingClientRect();
          const nav = document.querySelector('nav[aria-label="Primary"]')!.getBoundingClientRect();
          return {
            viewportOverflow: document.documentElement.scrollWidth - innerWidth,
            scroll: main.scrollTop,
            card: { x: card.x, y: card.y, width: card.width, height: card.height },
            grading: { x: grading.x, y: grading.y, right: grading.right, bottom: grading.bottom },
            navTop: nav.top,
          };
        });
      const front = await readFrame();
      await card.click();
      const back = await readFrame();
      const label = `${size.width}×${size.height} ${entry.module} ${entry.target}/${entry.native}`;
      expect(front.viewportOverflow, `${label}: front horizontal fit`).toBeLessThanOrEqual(0);
      expect(back.viewportOverflow, `${label}: back horizontal fit`).toBeLessThanOrEqual(0);
      expect(front.grading.bottom, `${label}: front grades above nav`).toBeLessThanOrEqual(
        front.navTop,
      );
      expect(back.grading.bottom, `${label}: back grades above nav`).toBeLessThanOrEqual(
        back.navTop,
      );
      expect(front.grading.x, `${label}: grade left edge`).toBeGreaterThanOrEqual(0);
      expect(front.grading.right, `${label}: grade right edge`).toBeLessThanOrEqual(size.width);
      expect(back.scroll, `${label}: flip does not move page`).toBe(front.scroll);
      expect(back.card, `${label}: flip preserves card geometry`).toEqual(front.card);
      expect(back.grading, `${label}: flip preserves grade geometry`).toEqual(front.grading);
      const state = await readAppState(page);
      expect(state.core30Log, `${label}: flip does not grade`).toEqual(beforeProgress);
    }
  }
});
