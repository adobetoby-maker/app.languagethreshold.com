import { test, expect } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";
test("compact word tutor saves vocabulary without leaving the conversation", async ({
  page,
}, info) => {
  let calls = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/speak") calls++;
  });
  await page.goto(appUrl({ tab: "speak", module: "roofing" }));
  await page.getByRole("tab", { name: "Free conversation", exact: true }).click();
  const frame = page.getByRole("region", { name: "Free conversation practice" });
  const draft = frame.getByRole("textbox", { name: "Type an answer in Spanish" });
  const before = await readAppState(page);
  const toggle = frame.getByRole("button", { name: "Tutor · word help" });
  await toggle.click();
  const panel = page.getByRole("region", { name: "Speaking word tutor" });
  await expect(draft).toBeHidden();
  await panel.getByRole("textbox", { name: "Tutor word or phrase" }).fill("mapa");
  await panel.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(panel).toContainText("map");
  await panel.getByRole("button", { name: "Save word", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Saved", exact: true })).toBeDisabled();
  const saved = (await readAppState(page)).userVocab as { word: string; translation: string }[];
  expect(saved.some((v) => v.word === "mapa" && v.translation.includes("map"))).toBe(true);
  await panel.getByRole("button", { name: "Next tutor card" }).click();
  await expect(panel).toContainText("Use");
  expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  expect((await panel.boundingBox())!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height * 0.36,
  );
  await page.screenshot({ path: `test-results/speak-tutor-${info.project.name}.png` });
  await toggle.click();
  await expect(draft).toBeVisible();
  const after = await readAppState(page);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(calls).toBe(0);
});
