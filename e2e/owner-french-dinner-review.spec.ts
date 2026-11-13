import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// @dev-only: the owner API is mocked; server authorization is tested separately.
const REF = "pollhlkgltdkdskdzsgd";
const OWNER = "00000000-0000-4000-8000-0000000000aa";
const lesson = {
  stage: "foundation", n: 1, stableId: "foundation-travel-dinner:1:fr-en", title: "Greet the Host",
  objective: "Greet a host politely.", focus: "Bonsoir greets a host in the evening.",
  scene: "A guest arrives for dinner.", reviewed: false,
  cards: [{ fr: "bonsoir", en: "good evening", kind: "term", note: "An evening greeting." }],
  reader: [{ speaker: "Guest", fr: "Bonsoir, j'ai une réservation.", en: "Good evening, I have a reservation." }],
  modes: Object.fromEntries(["see", "recall", "hear", "type", "say", "write"].map((mode) =>
    [mode, { cueEnglish: "Find the evening greeting.", sourceCard: 1, responseKind: mode === "say" || mode === "write" ? "open" : "fixed" }])),
  speaking: { role: "Guest", partnerRole: "Host", opening: "Bonsoir !", goal: "Greet the host.", closure: "Merci.", wordBank: ["bonsoir"] },
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
  await page.route("**/api/owner-french-dinner-drafts", (route) => route.fulfill({ json: {
    pairKey: "French:English", courseId: "travel-dinner", status: "owner-review-draft",
    reviewed: false, registered: false, audioRegistered: false, lessons: [lesson],
  } }));
  await page.goto("/owner-french-dinner-review");
  await expect(page.getByRole("heading", { name: "French Dinner draft" })).toBeVisible();
  await expect(page.getByText("reviewed: false")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Greet the Host" })).toBeVisible();
  await page.getByRole("button", { name: "Recall" }).click();
  await page.getByRole("button", { name: "Show source answer" }).click();
  const activity = page.getByRole("heading", { name: "Six activity prompts" }).locator("..");
  await expect(activity.getByText("bonsoir", { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("textbox", { name: "Review note" }).fill("Check the restaurant register.");
  await page.getByRole("button", { name: "Download review note" }).click();
  const file = await download;
  await expect(file.suggestedFilename()).toBe("foundation-travel-dinner-1-fr-en-review-note.json");
  const saved = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(saved).toMatchObject({ lessonId: "foundation-travel-dinner:1:fr-en", reviewed: false });
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(1);
});
