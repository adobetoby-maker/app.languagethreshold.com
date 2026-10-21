// Built by TAC — 2026-10-21
import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

/** Opens the Games tab with Spanish selected and no module, retrying like dictionary-roofing.spec.ts. */
async function openVerbs(page: Page, search = ""): Promise<void> {
  await page.goto("/");
  const title = page.getByRole("heading", { name: "Practice by pattern" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, { activeModuleId: null, selectedLanguage: "Spanish", currentTab: "games" });
    await page.goto(appUrl({ tab: "games" }) + search);
    await title.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await title.isVisible()) break;
  }
  await expect(title).toBeVisible({ timeout: 60_000 });
}

test("verbs home lists families and games", async ({ page }) => {
  await openVerbs(page);
  await expect(page.getByText('The "-go" family')).toBeVisible();
  await expect(page.getByText("Regular -ar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bubble Pop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verb Crush" })).toBeVisible();
  await expect(page.getByText("Leaderboards coming soon")).toBeVisible();
});

test("verbs picker opens from a game card, keeps Back working and starts disabled-safe", async ({ page }) => {
  await openVerbs(page);
  await page.locator('[data-game="crush"]').click();
  await expect(page).toHaveURL(/verbs=pick/);
  await expect(page.getByRole("heading", { name: "Choose your round" })).toBeVisible();
  await expect(page.getByText(/Core · \d+ verbs/)).toBeVisible();
  await expect(page.locator('[data-level="1"]')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
});

test("a hand-edited verbs link falls back to the home instead of failing", async ({ page }) => {
  await openVerbs(page, "&verbs=play&vgame=crush&vfamily=mix");
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
  await openVerbs(page, "&verbs=board&vgame=crush&vscope=L9:xyz");
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
});

/** Games → Verbs → Bubble Pop → The "-go" family → Start, with a fixed dev seed. */
async function startBubble(page: Page): Promise<void> {
  await openVerbs(page, "&vseed=5");
  await page.locator('[data-game="bubble"]').click();
  await page.getByTestId("family-es.present.go-yo").click();
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByTestId("bubble-game")).toBeVisible();
}

test.describe("bubble pop", { tag: "@dev-only" }, () => {
  // Ruling F32: clicking an answer runs on the still row; the rising board is covered by its own test below.
  test.describe("still row", () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });
    test("bubble pop: one pop shows the English", async ({ page }) => {
      await startBubble(page);
      await expect(page.getByTestId("game-hud")).toContainText('GAME · BUBBLE POP · THE "-GO" FAMILY');
      await page.locator('[data-correct="true"]').click();
      await expect(page.getByTestId("completion-flash")).toHaveText(/· I (come|have|leave|put|say)/);
      await expect(page.getByTestId("live-region")).toHaveText(/· I (come|have|leave|put|say)/);
      await expect(page.getByTestId("game-hud")).toContainText("STREAK ×1");
    });

    test("bubble pop reduced motion holds bubbles still", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await startBubble(page);
      const bubbles = page.getByTestId("bubble");
      await expect(bubbles.first()).toBeVisible();
      const total = await bubbles.count();
      expect(total).toBeGreaterThanOrEqual(4);
      await expect(page.locator('[data-motion="still"] [data-testid="bubble"]')).toHaveCount(total);
      await expect(page.locator('[data-motion="rise"]')).toHaveCount(0);
      await expect(page.getByTestId("countdown")).toBeVisible();
    });

    test("bubble pop: a wrong pick dims the bubble and shows the reason, End shows the score", async ({ page }) => {
      await startBubble(page);
      await page.locator('[data-bubble]:not([data-correct="true"])').first().click();
      await expect(page.getByTestId("reason-band")).toHaveAttribute("data-state", "shown");
      await expect(page.getByTestId("reason-band")).toContainText("✗ →");
      await expect(page.locator('[data-dimmed="true"]')).toHaveCount(1);
      await page.getByRole("button", { name: "End round", exact: true }).click();
      await expect(page.getByRole("heading", { name: /Round over · \d/ })).toBeVisible();
      await page.getByRole("button", { name: "Play again" }).click();
      await expect(page.getByTestId("bubble-game")).toBeVisible();
    });
  });

  test("bubble pop list mode keeps keyboard focus on the options across frames", async ({ page }) => {
    await openVerbs(page, "&vseed=5");
    await page.locator('[data-game="bubble"]').click();
    await page.getByRole("switch").click();
    await page.getByTestId("family-es.present.go-yo").click();
    await page.getByRole("button", { name: "Start round" }).click();
    await expect(page.getByTestId("frame-choices")).toBeVisible();
    const focusedChoice = () =>
      page.evaluate(() => {
        const a = document.activeElement as HTMLButtonElement | null;
        return a?.hasAttribute("data-choice") && !a.disabled ? a.textContent : null;
      });
    await expect.poll(focusedChoice).not.toBeNull();
    // Enter on whatever option holds focus: a miss disables it and focus moves on; a hit brings a new frame.
    for (let i = 0; i < 6; i++) {
      if ((await page.getByTestId("completion-flash").textContent())?.includes("·")) break;
      await page.keyboard.press("Enter");
      await expect.poll(focusedChoice).not.toBeNull();
    }
    await expect(page.getByTestId("completion-flash")).toHaveText(/· I /);
    await expect(page.getByTestId("flash-mark")).toBeVisible();
    await expect(page.getByTestId("live-region")).toContainText("Next:");
    await expect.poll(focusedChoice).not.toBeNull();
  });

  test("bubble pop: fading bubbles stop taking picks", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await startBubble(page);
    const fading = page.locator('[data-testid="bubble-cluster"][aria-hidden="true"]');
    await expect(fading).toBeAttached({ timeout: 10_000 });
    const key = await page.locator('[data-correct="true"]').getAttribute("data-bubble");
    await page.keyboard.press(String(Number(key) + 1));
    await expect(page.getByTestId("reason-band")).toContainText("Time's up");
    await expect(page.getByTestId("game-hud")).toContainText("SCORE 0");
  });

  test("bubble pop rises and a number key pops the answer", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await startBubble(page);
    await expect(page.locator('[data-motion="rise"]')).toBeVisible();
    const key = await page.locator('[data-correct="true"]').getAttribute("data-bubble");
    await page.keyboard.press(String(Number(key) + 1));
    await expect(page.getByTestId("completion-flash")).toHaveText(/· I (come|have|leave|put|say)/);
  });
});

/** Games → Verbs → Verb Crush → The "-go" family → Level 1 → Start, with a fixed dev seed. */
async function startCrush(page: Page): Promise<void> {
  await openVerbs(page, "&vseed=5");
  await page.locator('[data-game="crush"]').click();
  await page.getByTestId("family-es.present.go-yo").click();
  await page.locator('[data-level="1"]').click();
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByTestId("crush-game")).toBeVisible();
  await expect(page.getByTestId("crush-cell")).toHaveCount(25);
}

/** The arrow key that moves from hint a to hint b. */
async function hintArrow(page: Page): Promise<string> {
  const a = Number(await page.locator('[data-hint="a"]').getAttribute("data-index"));
  const b = Number(await page.locator('[data-hint="b"]').getAttribute("data-index"));
  return b === a + 1 ? "ArrowRight" : b === a - 1 ? "ArrowLeft" : b > a ? "ArrowDown" : "ArrowUp";
}

test.describe("verb crush", { tag: "@dev-only" }, () => {
  test.describe("reduced motion", () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });

    test("crush level 1: one pop shows the English", async ({ page }) => {
      await startCrush(page);
      await expect(page.getByTestId("game-hud")).toContainText("GAME · VERB CRUSH · LEVEL 1");
      await expect(page.getByTestId("game-hud")).toContainText("MOVES 20");
      await expect(page.getByTestId("crush-goal")).toContainText("Make 5 yo forms");
      await expect(page.getByTestId("crush-goal-count")).toHaveText("0 / 5");
      await page.locator('[data-hint="a"]').click();
      await page.locator('[data-hint="b"]').click();
      await expect(page.getByTestId("completion-flash")).toHaveText(/· I /);
      await expect(page.getByTestId("live-region")).toContainText(/· I .*Goal 1 of 5/);
      await expect(page.getByTestId("crush-goal-count")).toHaveText("1 / 5");
      await expect(page.locator("[data-goal-slot][data-filled]")).toHaveCount(1);
      await expect(page.getByTestId("game-hud")).toContainText("MOVES 19");
      await expect(page.getByTestId("game-hud")).toContainText("STREAK ×1");
    });

    test("crush trap shows the reason and costs the streak, not a move", async ({ page }) => {
      await startCrush(page);
      for (let n = 1; n <= 2; n++) {
        await page.locator('[data-hint="a"]').click();
        await page.locator('[data-hint="b"]').click();
        await expect(page.getByTestId("crush-goal-count")).toHaveText(`${n} / 5`);
      }
      await expect(page.getByTestId("game-hud")).toContainText("STREAK ×2 · ");
      // Seed 5 on the signed data: after those two pops, cells 2 and 7 make "decen" (found by replaying the engine).
      await page.locator('[data-index="2"]').click();
      await page.locator('[data-index="7"]').click();
      await expect(page.getByTestId("reason-band")).toHaveAttribute("data-state", "shown");
      await expect(page.getByTestId("reason-band")).toContainText("decen ✗ → dicen");
      await expect(page.locator('[data-testid="crush-cell"] [data-dimmed="true"]')).toHaveCount(2);
      await expect(page.getByTestId("game-hud")).toContainText("STREAK ×0");
      await expect(page.getByTestId("game-hud")).toContainText("MOVES 18");
    });

    test("crush reduced motion", async ({ page }) => {
      await startCrush(page);
      await expect(page.getByTestId("crush-board")).toHaveAttribute("data-motion", "still");
      await page.locator('[data-hint="a"]').click();
      await page.locator('[data-hint="b"]').click();
      await expect(page.getByTestId("crush-goal-count")).toHaveText("1 / 5");
      await expect(page.locator('[data-testid="crush-grid"] [class*="animate-"]')).toHaveCount(0);
      // No tile is moved: nothing in the grid carries a transform.
      const moved = await page.locator('[data-testid="crush-cell"]').evaluateAll((els) => els.filter((el) => getComputedStyle(el).transform !== "none").length);
      expect(moved).toBe(0);
      await page.getByRole("button", { name: "End round", exact: true }).click();
      await expect(page.getByRole("heading", { name: /Round over · \d/ })).toBeVisible();
      await expect(page.getByTestId("round-over")).toContainText("GAME · VERB CRUSH");
      await page.getByRole("button", { name: "Play again" }).click();
      await expect(page.getByTestId("crush-game")).toBeVisible();
    });
  });

  test("crush keyboard: Enter picks, an arrow swaps and pops", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await startCrush(page);
    await expect(page.getByTestId("crush-board")).toHaveAttribute("data-motion", "move");
    const arrow = await hintArrow(page);
    await page.locator('[data-hint="a"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-hint="a"]')).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press(arrow);
    await expect(page.getByTestId("completion-flash")).toHaveText(/· I /);
    await expect(page.getByTestId("crush-goal-count")).toHaveText("1 / 5");
    // Focus stays on the board for the next move.
    await expect(page.locator('[data-testid="crush-cell"]:focus')).toHaveCount(1);
  });

  test("crush drag swaps neighbors (mouse on desktop, touch swipe on the phone)", async ({ page, context }, info) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await startCrush(page);
    // The board scrolls itself into view on start; read positions once it has settled.
    await page.waitForTimeout(900);
    const a = await page.locator('[data-hint="a"]').boundingBox();
    const b = await page.locator('[data-hint="b"]').boundingBox();
    if (!a || !b) throw new Error("hint cells not laid out");
    const ax = a.x + a.width / 2;
    const ay = a.y + a.height / 2;
    const steps = [0.15, 0.3, 0.45, 0.6].map((f) => ({ x: ax + (b.x - a.x) * f, y: ay + (b.y - a.y) * f }));
    if (info.project.name === "iphone-pwa") {
      const cdp = await context.newCDPSession(page);
      const touch = (type: string, x: number, y: number) =>
        cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
      await touch("touchStart", ax, ay);
      for (const p of steps) await touch("touchMove", p.x, p.y);
      await touch("touchEnd", 0, 0);
    } else {
      await page.mouse.move(ax, ay);
      await page.mouse.down();
      for (const p of steps) await page.mouse.move(p.x, p.y);
      await page.mouse.up();
    }
    await expect(page.getByTestId("crush-goal-count")).toHaveText("1 / 5");
    await expect(page.getByTestId("completion-flash")).toHaveText(/· I /);
  });

  test("crush cells are at least 44 px", async ({ page }) => {
    await startCrush(page);
    const box = await page.getByTestId("crush-cell").first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

// Screenshots at four viewports for the visual review: VERB_SCREENS=1 npx playwright test ... --grep @screens
const BUBBLE_PLAY = appUrl({ tab: "games" }) + "&verbs=play&vgame=bubble&vfamily=es.present.go-yo&vseed=5";

/** Mid-round: one correct pick by number key (completion flash up), then one wrong pick (reason band up). */
async function bubbleMidRound(page: Page): Promise<void> {
  await expect(page.getByTestId("bubble-game")).toBeVisible();
  await page.waitForTimeout(1200);
  const key = Number(await page.locator('[data-correct="true"]').getAttribute("data-bubble"));
  await page.keyboard.press(String(key + 1));
  await page.waitForTimeout(400);
  const wrong = Number(await page.locator('[data-bubble]:not([data-correct="true"])').first().getAttribute("data-bubble"));
  await page.keyboard.press(String(wrong + 1));
  await page.waitForTimeout(250);
}

/** From the Bubble picker: list mode on, the "-go" family, Start. */
async function startListRound(page: Page): Promise<void> {
  await page.getByRole("switch").click();
  await page.getByTestId("family-es.present.go-yo").click();
  await page.getByRole("button", { name: "Start round" }).click();
}

const CRUSH_PLAY = appUrl({ tab: "games" }) + "&verbs=play&vgame=crush&vfamily=es.present.go-yo&vlevel=1&vseed=5";

/** Mid-round: two pops by the dev hint (goal 2 / 5, flash up), then the board settles. */
async function crushMidRound(page: Page): Promise<void> {
  await expect(page.getByTestId("crush-game")).toBeVisible();
  await page.waitForTimeout(600);
  for (let n = 0; n < 2; n++) {
    await page.locator('[data-hint="a"]').click();
    await page.locator('[data-hint="b"]').click();
    await page.waitForTimeout(900);
  }
}

const SCREENS: { name: string; path: string; prepare?: (page: Page) => Promise<void> }[] = [
  { name: "home", path: appUrl({ tab: "games" }) },
  { name: "picker-crush", path: appUrl({ tab: "games" }) + "&verbs=pick&vgame=crush&vfamily=es.present.go-yo" },
  { name: "picker-bubble", path: appUrl({ tab: "games" }) + "&verbs=pick&vgame=bubble&vfamily=mix" },
  { name: "bubble", path: BUBBLE_PLAY, prepare: bubbleMidRound },
  {
    name: "bubble-list",
    path: appUrl({ tab: "games" }) + "&verbs=pick&vgame=bubble&vseed=5",
    prepare: async (page) => {
      await startListRound(page);
      await expect(page.getByTestId("frame-choices")).toBeVisible();
      await page.waitForTimeout(800);
      await page.keyboard.press("1");
      await page.waitForTimeout(300);
      await page.keyboard.press("2");
      await page.waitForTimeout(250);
    },
  },
  {
    name: "bubble-over",
    path: BUBBLE_PLAY,
    prepare: async (page) => {
      await bubbleMidRound(page);
      await page.getByRole("button", { name: "End round", exact: true }).click();
      await expect(page.getByTestId("round-over")).toBeVisible();
    },
  },
];
SCREENS.push(
  { name: "crush", path: CRUSH_PLAY, prepare: crushMidRound },
  {
    name: "crush-cascade",
    path: CRUSH_PLAY,
    prepare: async (page) => {
      await expect(page.getByTestId("crush-game")).toBeVisible();
      await page.waitForTimeout(600);
      await page.locator('[data-hint="a"]').click();
      await page.locator('[data-hint="b"]').click();
      // Mid-pop: the burst is up and the refills are dropping in.
      await page.waitForTimeout(260);
    },
  },
  {
    name: "crush-over",
    path: CRUSH_PLAY,
    prepare: async (page) => {
      await crushMidRound(page);
      await page.getByRole("button", { name: "End round", exact: true }).click();
      await expect(page.getByTestId("round-over")).toBeVisible();
    },
  },
);
const VIEWPORTS = [
  { tag: "375", width: 375, height: 812, scale: 2 },
  { tag: "1440", width: 1440, height: 900, scale: 1 },
  { tag: "2560", width: 2560, height: 1440, scale: 1 },
  { tag: "2560x2", width: 2560, height: 1440, scale: 2 },
] as const;

test.describe("verb screens @screens", () => {
  test.skip(!process.env.VERB_SCREENS, "set VERB_SCREENS=1 to capture screens");
  for (const screen of SCREENS) {
    test(`${screen.name} fits every viewport`, async ({ browser, baseURL, storageState }) => {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          baseURL,
          storageState,
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.scale,
        });
        const page = await context.newPage();
        try {
          await page.goto("/");
          await seedAppState(page, { activeModuleId: null, selectedLanguage: "Spanish", currentTab: "games" });
          await page.goto(screen.path);
          await expect(page.locator("[data-verbs-root]")).toBeVisible({ timeout: 60_000 });
          await screen.prepare?.(page);
          await page.evaluate(() => document.fonts.ready);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, `${screen.name} @${vp.tag} scrollWidth overflow`).toBeLessThanOrEqual(0);
          await page.screenshot({ path: `test-results/verb-games-screens/${screen.name}-${vp.tag}.png`, fullPage: true });
          // Fixed bars would paint over the middle of a full-page capture; hide them for the section clip only.
          await page.evaluate(() => {
            for (const el of document.querySelectorAll<HTMLElement>("body *")) {
              if (getComputedStyle(el).position === "fixed" && !el.closest("[data-verbs-root]")) el.style.visibility = "hidden";
            }
          });
          // A clip of the full-page capture keeps the fixed top and bottom bars out of the middle of the section.
          const box = await page.locator("[data-verbs-root]").evaluate((el) => {
            const r = el.getBoundingClientRect();
            return { x: Math.max(0, r.left + scrollX - 8), y: Math.max(0, r.top + scrollY - 8), width: Math.min(innerWidth, r.width + 16), height: r.height + 16 };
          });
          await page.screenshot({ path: `test-results/verb-games-screens/${screen.name}-${vp.tag}-section.png`, fullPage: true, clip: box });
        } finally {
          await context.close();
        }
      }
    });
  }
});
