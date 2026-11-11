import { expect, test } from "@playwright/test";

// @dev-only: the owner API is mocked; server authorization is tested separately.
const REF = "pollhlkgltdkdskdzsgd";
const OWNER = "00000000-0000-4000-8000-0000000000aa";
const lesson = {
  stage: "core", n: 9, stableId: "travel-dinner:9:ja-en", title: "Set the Pace of Dinner",
  objective: "Ask the server to slow down.", focus: "～ていただけますか makes a polite request.",
  scene: "The next course arrives early.", reviewed: false,
  cards: [{ ja: "次の料理", en: "next course", kind: "term", readingKana: "つぎのりょうり" }],
  reader: [{ speaker: "Yui", ja: "次の料理は後でお願いします。", en: "The next course later, please." }],
  forms: [{ base: "待つ", polite: "待ちます", meaning: "wait" }],
  modes: Object.fromEntries(["see", "recall", "hear", "type", "say", "write"].map((mode) =>
    [mode, { cueEnglish: "Find the next course.", sourceCard: 1, responseKind: mode === "say" || mode === "write" ? "open" : "fixed" }])),
  speaking: { role: "Guest", partnerRole: "Server", opening: "いらっしゃいませ。", goal: "Hold the next course.", closure: "かしこまりました。", wordBank: ["次の料理"] },
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

test("owner can inspect a Japanese draft and export a lesson note without marking it reviewed @dev-only", async ({ page }) => {
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: `sb-${REF}-auth-token`, session: fakeSession() });
  await page.route(/supabase\.co\//, (route) => route.fulfill({ status: 401, json: { message: "e2e" } }));
  await page.route("**/api/owner-japanese-drafts", (route) => route.fulfill({ json: {
    pairKey: "Japanese:English", courseId: "travel-dinner", status: "owner-review-draft",
    reviewed: false, registered: false, audioRegistered: false, lessons: [lesson],
  } }));
  await page.goto("/owner-japanese-review");
  await expect(page.getByRole("heading", { name: "Japanese Dinner draft" })).toBeVisible();
  await expect(page.getByText("reviewed: false")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Set the Pace of Dinner" })).toBeVisible();
  await page.getByRole("button", { name: "Recall" }).click();
  await page.getByRole("button", { name: "Show source answer" }).click();
  await expect(page.getByText("次の料理", { exact: true }).first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("textbox", { name: "Review note" }).fill("Check the restaurant register.");
  await page.getByRole("button", { name: "Download review note" }).click();
  await expect((await download).suggestedFilename()).toBe("travel-dinner-9-ja-en-review-note.json");
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(1);
});
