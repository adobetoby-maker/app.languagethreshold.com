import { test, expect } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";

test("selected-module speaking starts above the fold and keeps preparation in one frame", async ({
  page,
}, info) => {
  let speakingCalls = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/speak" && req.method() === "POST") speakingCalls++;
  });
  await page.goto(appUrl({ tab: "speak", module: "roofing" }));
  const start = page.getByRole("button", { name: "Start practice", exact: true });
  await expect(start).toBeVisible();
  const startBox = await start.boundingBox();
  expect(startBox!.y + startBox!.height).toBeLessThan(page.viewportSize()!.height - 80);
  const before = await readAppState(page);
  await start.click();
  const frame = page.getByTestId("focused-speaking-frame");
  const steps = page.getByRole("tablist", { name: "Speaking practice steps" });
  await expect(steps.getByRole("tab", { name: "Hear & say" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const next = page.getByRole("button", { name: /I've said it|Try answering a prompt/ });
  for (let i = 0; i < 5 && (await next.count()); i++) await next.click();
  await expect(steps.getByRole("tab", { name: "Answer a prompt" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Help me answer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide useful words" })).toBeVisible();
  await steps.getByRole("tab", { name: "Conversation", exact: true }).click();
  const signIn = page.getByRole("button", { name: "Sign in to start mission", exact: true });
  await expect(signIn).toBeVisible();
  const rect = await frame.boundingBox(),
    button = await signIn.boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 10);
  expect(button!.y + button!.height).toBeLessThanOrEqual(rect!.y + rect!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/focused-speaking-${info.project.name}.png` });
  const after = await readAppState(page);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.xp).toEqual(before.xp);
  expect(speakingCalls).toBe(0);
});

test("free conversation keeps its microphone above the phone navigation", async ({ page }) => {
  await page.goto(appUrl({ tab: "speak", module: "roofing" }));
  await page.getByRole("tab", { name: "Free conversation", exact: true }).click();
  const frame = page.getByRole("region", { name: "Free conversation practice" });
  const mic = frame.getByRole("button", { name: "Start listening", exact: true });
  await expect(mic).toBeVisible();
  await expect
    .poll(async () => {
      const box = await mic.boundingBox();
      const outer = await frame.boundingBox();
      return (
        !!box &&
        !!outer &&
        box.y >= outer.y &&
        box.y + box.height <= outer.y + outer.height &&
        outer.y + outer.height < page.viewportSize()!.height
      );
    })
    .toBe(true);
  await frame.getByText("Topics & challenges", { exact: true }).click();
  await expect(frame.getByText("Topic starters", { exact: true })).toBeVisible();
  await frame.getByText("Topics & challenges", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
