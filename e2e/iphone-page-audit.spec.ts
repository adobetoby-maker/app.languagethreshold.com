import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { appUrl } from "./app-state";

// Layout fixtures use network responses directly, without a cached app shell.
test.use({ serviceWorkers: "block" });

const directory = process.env.LT_PHONE_REVIEW_DIR ?? "test-results/iphone-page-audit";
const screens = [
  "dashboard",
  "dictionary",
  "discussions",
  "falseFriends",
  "flashcards",
  "games",
  "grammar",
  "guide",
  "idiomMaster",
  "modules",
  "patterns",
  "penpal",
  "reader",
  "sentenceBuild",
  "speak",
  "story",
  "wordMatch",
  "conjugation",
  "core30",
  ["anatomy", "orthopedics"],
  ["orthopedics", "orthopedics"],
  ["fmg", "fmg"],
  ["orEvs", "or-evs"],
  ["fishing", "sport-fishing"],
  ["climbing", "rock-climbing"],
  ["baseball", "baseball"],
  ["soccer", "soccer"],
  ["fieldPrep", "roofing"],
  ["missionary", "lds-missionary"],
  ["kana", "core", "Japanese"],
  ["characters", "core", "Japanese"],
] as const;
for (const height of [667, 844]) {
  for (const entry of screens) {
    const [tab, module, target] = typeof entry === "string" ? [entry, "roofing", "Spanish"] : entry;
    test(`${tab} entry at 390×${height}`, async ({ page, isMobile }) => {
      test.skip(!isMobile);
      await page.setViewportSize({ width: 390, height });
      await page.goto(appUrl({ tab, module, target: target ?? "Spanish" }));
      await expect(page.locator(`[data-demo-screen="${tab}"]`)).toBeAttached();
      await page.locator("main").evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      });
      const report = await page.locator("main").evaluate((main) => {
        const nav = document.querySelector('nav[aria-label="Primary"]')!;
        const boundary = nav.getBoundingClientRect().top;
        const controls = [
          ...main.querySelectorAll<HTMLElement>("button,input,select,textarea,summary"),
        ].filter((el) => {
          let parent: HTMLElement | null = el;
          while (parent && parent !== main) {
            if (
              parent.tagName === "DETAILS" &&
              !parent.hasAttribute("open") &&
              !parent.querySelector(":scope > summary")?.contains(el)
            )
              return false;
            parent = parent.parentElement;
          }
          const b = el.getBoundingClientRect(),
            s = getComputedStyle(el);
          return (
            b.width > 0 &&
            b.height > 0 &&
            b.bottom > 0 &&
            b.top < boundary &&
            s.visibility !== "hidden" &&
            s.display !== "none"
          );
        });
        const overlaps: string[] = [];
        for (let i = 0; i < controls.length; i++)
          for (let j = i + 1; j < controls.length; j++) {
            const a = controls[i],
              b = controls[j];
            if (a.contains(b) || b.contains(a)) continue;
            const x = a.getBoundingClientRect(),
              y = b.getBoundingClientRect();
            if (
              Math.min(x.right, y.right) - Math.max(x.left, y.left) > 4 &&
              Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 4
            )
              overlaps.push(
                `${a.textContent?.trim().slice(0, 45)} / ${b.textContent?.trim().slice(0, 45)}`,
              );
          }
        const first = controls.find((el) => el.getBoundingClientRect().bottom <= boundary);
        return {
          width: innerWidth,
          height: innerHeight,
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          visibleControlCount: controls.length,
          firstAction: first?.textContent?.trim().slice(0, 65),
          overlaps,
          text: main.textContent?.trim().slice(0, 160),
          scrollTop: main.scrollTop,
        };
      });
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${directory}/${tab}-${height}.json`, JSON.stringify(report, null, 2));
      await page.screenshot({ path: `${directory}/${tab}-${height}.png` });
      expect(report.horizontalOverflow, JSON.stringify(report)).toBeLessThanOrEqual(0);
      expect(report.overlaps, JSON.stringify(report)).toEqual([]);
    });
  }
}
