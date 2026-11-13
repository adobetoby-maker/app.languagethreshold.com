import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// @dev-only: the owner API is mocked; server authorization is tested separately.
const REF = "pollhlkgltdkdskdzsgd";
const OWNER = "00000000-0000-4000-8000-0000000000aa";
const lesson = {
  stage: "master", n: 1, stableId: "master-travel-lunch:1:fr-en", title: "Explain a Lunch Formula",
  objective: "Explain what a lunch formula includes.", focus: "La formule du midi names a fixed-price lunch.",
  scene: "A friend asks about the lunch formula.", reviewed: false,
  cards: [{ fr: "la formule du midi", en: "fixed-price lunch", kind: "term", note: "A set lunch menu." }],
  reader: [{ speaker: "Camille", fr: "La formule du midi comprend une entrée.", en: "The fixed-price lunch includes a starter." }],
  modes: Object.fromEntries(["see", "recall", "hear", "type", "say", "write"].map((mode) =>
    [mode, { cueEnglish: "Find the fixed-price lunch.", sourceCard: 1, responseKind: mode === "say" || mode === "write" ? "open" : "fixed" }])),
  speaking: { role: "Friend", partnerRole: "Friend", opening: "Bonjour !", goal: "Explain the included courses.", closure: "Merci.", wordBank: ["la formule du midi"] },
};

function fakeSession() {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 86400;
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: OWNER, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "e2e-refresh", token_type: "bearer", expires_in: 86400, expires_at: exp,
    user: { id: OWNER, aud: "authenticated", role: "authenticated", email: "owner-e2e@example.test", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  };
}

test("owner can inspect a French draft and export a lesson note without marking it reviewed @dev-only", async ({ page }) => {
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: `sb-${REF}-auth-token`, session: fakeSession() });
  await page.route(/supabase\.co\//, (route) => route.fulfill({ status: 401, json: { message: "e2e" } }));
  await page.route("**/api/owner-french-drafts", (route) => route.fulfill({ json: {
    pairKey: "French:English", courseId: "travel-lunch", status: "owner-review-draft",
    reviewed: false, registered: false, audioRegistered: false, lessons: [lesson],
  } }));
  await page.goto("/owner-french-review");
  await expect(page.getByRole("heading", { name: "French Lunch draft" })).toBeVisible();
  await expect(page.getByText("reviewed: false")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explain a Lunch Formula" })).toBeVisible();
  await page.getByRole("button", { name: "Recall" }).click();
  await page.getByRole("button", { name: "Show source answer" }).click();
  const activity = page.getByRole("heading", { name: "Six activity prompts" }).locator("..");
  await expect(activity.getByText("la formule du midi", { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("textbox", { name: "Review note" }).fill("Check the restaurant register.");
  await page.getByRole("button", { name: "Download review note" }).click();
  const file = await download;
  await expect(file.suggestedFilename()).toBe("master-travel-lunch-1-fr-en-review-note.json");
  const saved = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(saved).toMatchObject({ lessonId: "master-travel-lunch:1:fr-en", reviewed: false });
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(1);
});
