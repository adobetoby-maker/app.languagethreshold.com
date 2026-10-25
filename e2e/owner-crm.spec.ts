import { expect, test, type Page } from "@playwright/test";
const OWNER = "10000000-0000-4000-8000-000000000001";
const CONTACT = "20000000-0000-4000-8000-000000000001";
const ASSET = "30000000-0000-4000-8000-000000000001";
async function openCrm(page: Page, linked = false) {
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    {
      key: "sb-pollhlkgltdkdskdzsgd-auth-token",
      session: {
        access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: OWNER, aud: "authenticated", role: "authenticated", exp })}.fixture`,
        refresh_token: "fixture-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: exp,
        user: {
          id: OWNER,
          aud: "authenticated",
          role: "authenticated",
          email: "owner@example.test",
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    },
  );
  await page.route(/supabase\.co\//, (route) =>
    route.fulfill({ status: 401, json: { message: "Synthetic local test" } }),
  );
  const state = {
    contacts: [
      {
        id: CONTACT,
        name: "Synthetic Reviewer",
        email: "reviewer@example.test",
        expertise: "Synthetic expertise",
        notes: "PRIVATE NOTE MUST STAY PRIVATE",
        status: "follow_up",
        follow_up_on: "2026-11-01",
        user_id: linked ? OWNER : null,
      },
    ],
    assets: [
      {
        id: ASSET,
        title: "Original synthetic ad",
        category: "Synthetic",
        url: "https://drive.google.com/file/d/synthetic-file/view",
      },
    ],
    drafts: [] as Record<string, unknown>[],
    referrals: linked
      ? [{ user_id: OWNER, code: "50000000-0000-4000-8000-000000000001", active: true }]
      : [],
    aiReady: true,
  };
  const posts: Record<string, unknown>[] = [];
  let release: (() => void) | undefined;
  await page.route(/\/api\//, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      posts.push(body);
      if (body.action === "generate") {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return route
          .fulfill({ json: { subject: "AI fixture subject", body: "AI fixture cover note." } })
          .catch(() => {});
      }
      if (url.pathname === "/api/owner-customers")
        return route.fulfill({ json: { notice: "Customer draft saved. No email sent." } });
      if (body.action === "draft")
        state.drafts.push({ ...body.draft, created_at: new Date().toISOString() });
      if (body.action === "contact")
        state.contacts = state.contacts.map((c) => (c.id === body.contact.id ? body.contact : c));
      return route.fulfill({ json: { notice: "Saved. No email sent." } });
    }
    if (url.pathname === "/api/owner-crm") return route.fulfill({ json: state });
    if (url.pathname === "/api/platform")
      return route.fulfill({
        json: {
          counts: {},
          financial: { months: [] },
          categories: [],
          siteUsage: [],
          organizations: [],
          entitlements: [],
          members: [],
          activity: [],
          attempts: [],
          ledger: [],
          auditEvents: [],
          moduleRequests: [],
        },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto("/owner?tab=email");
  await expect(page.getByRole("heading", { name: "Email & contacts", exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.getByRole("button", { name: /Synthetic Reviewer/ }).click();
  return { posts, state, release: () => release?.() };
}
test("owner prepares, previews and saves an unsent packet without private notes or sends", async ({
  page,
}) => {
  const { posts } = await openCrm(page);
  await page.getByLabel("Subject", { exact: true }).fill("Review these existing ads");
  await page.getByLabel("Editable cover note").fill("Please share feedback on these ads.");
  await page.getByLabel(/Original synthetic ad/).check();
  await page.getByRole("button", { name: "Preview complete email" }).click();
  // aria-label on the plain preview container, queried explicitly for cross-browser semantics.
  const packet = page.locator('[aria-label="Complete email preview"]');
  await expect(packet).toContainText("reviewer@example.test");
  await expect(packet).toContainText("Ads for review:");
  await expect(packet).not.toContainText("PRIVATE NOTE");
  const download = page.getByRole("button", { name: /Download reviewed unsent email/ });
  await expect(download).toBeDisabled();
  await page.getByLabel(/I reviewed the exact recipient/).check();
  await expect(download).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await download.click();
  expect((await downloaded).suggestedFilename()).toBe("language-threshold-review-draft.eml");
  await expect(download).toBeDisabled();
  await page.screenshot({ path: `/tmp/lt-crm-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel preview" }).click();
  await expect(packet).not.toBeVisible();
  await page.getByRole("button", { name: "Save unsent draft" }).dblclick();
  await expect(page.getByText("Saved. No email sent.", { exact: true })).toBeVisible();
  expect(posts.filter((p) => p.action === "draft")).toHaveLength(1);
  expect(posts.some((p) => p.action === "send")).toBeFalsy();
  await expect(page.getByRole("button", { name: /Review these existing ads ·/ })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Synthetic Reviewer/ }).click();
  await page.getByRole("button", { name: /Review these existing ads ·/ }).click();
  await expect(page.getByLabel("Editable cover note")).toHaveValue(
    "Please share feedback on these ads.",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test("cancelled AI draft cannot replace text; repeated generation is single-flight", async ({
  page,
}) => {
  const fixture = await openCrm(page);
  await page.getByLabel("Editable cover note").fill("Keep my handwritten draft.");
  await page.getByRole("button", { name: "Write with AI", exact: true }).click();
  await page.getByLabel("Brief for AI").fill("Ask a synthetic reviewer for feedback.");
  await page.getByRole("button", { name: "Generate editable draft" }).dblclick();
  await expect(page.getByRole("button", { name: "Writing draft…" })).toBeDisabled();
  await expect.poll(() => fixture.posts.filter((p) => p.action === "generate").length).toBe(1);
  await page.getByRole("button", { name: "Cancel AI draft" }).click();
  fixture.release();
  await expect(page.getByLabel("Editable cover note")).toHaveValue("Keep my handwritten draft.");
  await page.getByRole("button", { name: "Write with AI", exact: true }).click();
  await page.getByLabel("Brief for AI").fill("Write a second synthetic cover note.");
  await page.getByRole("button", { name: "Generate editable draft" }).click();
  await expect.poll(() => fixture.posts.filter((p) => p.action === "generate").length).toBe(2);
  fixture.release();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("AI fixture subject");
  await page.getByLabel("Editable cover note").fill("Owner-edited AI draft.");
  expect(fixture.posts.every((p) => p.action === "generate")).toBeTruthy();
});

test("linked customer packet reuses saved customer drafts and requires review", async ({
  page,
}) => {
  const { posts } = await openCrm(page, true);
  await page.getByLabel("Subject", { exact: true }).fill("Customer review packet");
  await page.getByLabel("Editable cover note").fill("Please review the selected ad.");
  await page.getByLabel(/Original synthetic ad/).check();
  await page.getByLabel(/Include existing referral link/).check();
  await page.getByRole("button", { name: "Preview complete email" }).click();
  const button = page.getByRole("button", {
    name: "Save reviewed packet to customer email drafts",
  });
  await expect(button).toBeDisabled();
  await page.getByLabel(/I reviewed the exact recipient/).check();
  await button.click();
  await expect(button).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("no email sent");
  expect(posts).toHaveLength(1);
  expect(posts[0].action).toBe("draft");
  expect(posts[0].userId).toBe(OWNER);
  expect(String(posts[0].body)).toContain("refer?code=");
  expect(String(posts[0].body)).not.toContain("PRIVATE NOTE");
});
