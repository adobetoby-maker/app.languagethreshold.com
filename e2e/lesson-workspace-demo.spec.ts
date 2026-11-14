import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("public lesson workspace demo keeps practice temporary across all six modes", async ({
  page,
}, info) => {
  const accountRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co"))
      accountRequests.push(url.pathname);
  });
  await page.goto("/demo/lesson-workspace");
  await expect(page.getByRole("button", { name: "Speaking menu", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Study", exact: true }).click();
  await expect(page.getByRole("article", { name: "Published lesson reading" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sounds and Greetings", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "See it", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("navigation", { name: "Study and speak" })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("demo-see.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Recall it", exact: true }).click();
  await page.getByRole("button", { name: "Reveal meaning", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide meaning", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(page.getByText(/Published vocabulary · 2 of/)).toBeVisible();
  await page.getByRole("button", { name: "Hear it", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play demo audio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reveal phrase", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide phrase", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Type it", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Type the Spanish word", exact: true })
    .fill("mi respuesta");
  await page.getByRole("button", { name: "Check demo answer", exact: true }).click();
  await expect(page.getByText(/Compare with the lesson word:/)).toBeVisible();
  await page.getByRole("button", { name: "Write it", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Demo writing notes", exact: true })
    .fill("Buenos días. Me llamo Ana.");
  await page.getByRole("button", { name: "Say it", exact: true }).click();
  await page
    .getByRole("textbox", { name: "What you want to say", exact: true })
    .fill("Más despacio, por favor.");
  await expect(
    page.getByRole("link", { name: "Open actual speaking practice", exact: true }),
  ).toHaveAttribute("href", /way=say/);
  await page.getByRole("button", { name: "Write it", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Demo writing notes", exact: true })).toHaveValue(
    "Buenos días. Me llamo Ana.",
  );
  await page.getByRole("button", { name: "Type it", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Type the Spanish word", exact: true }),
  ).toHaveValue("mi respuesta");
  await page.getByRole("button", { name: "Lesson details and goal", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const themeButton = page.getByRole("button", { name: "Navigation menu", exact: true });
  await themeButton.click();
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await page.screenshot({ path: info.outputPath("demo-other-theme.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "See it", exact: true }).click();
  expect(
    await page
      .locator(".lt-lesson-demo-panel")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: /Choose course,/ }).click();
  await expect(
    page.getByRole("button", { name: "Return to preview lesson", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Study and speak" })).toBeVisible();
  await page.getByRole("button", { name: "Return to preview lesson", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Study and speak" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => /profile-device|core30|lesson-review/.test(key)),
    ),
  ).toEqual([]);
  expect(accountRequests).toEqual([]);
});

test("public lesson demo can retry a failed lesson fetch", async ({ page }) => {
  let attempts = 0;
  await page.route("**/lesson-content/es/foundation-roofing.json", (route) => {
    if (++attempts === 1) return route.fulfill({ status: 503, body: "temporarily unavailable" });
    return route.continue();
  });
  await page.goto("/demo/lesson-workspace");
  await expect(page.getByRole("button", { name: "Speaking menu", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Study", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Retry sample lesson", exact: true }).click();
  await expect(page.getByRole("article", { name: "Published lesson reading" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("demo keeps its activity visible on a short landscape screen", async ({ page }, info) => {
  await page.setViewportSize({ width: 852, height: 393 });
  await page.goto("/demo/lesson-workspace");
  await expect(page.getByRole("button", { name: "Speaking menu", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Study", exact: true }).click();
  await expect(page.getByRole("article", { name: "Published lesson reading" })).toBeVisible();
  await expect(page.locator(".lt-lesson-workspace-header")).toHaveCSS("position", "static");
  await page.getByRole("button", { name: "Type it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Type it", exact: true })).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Study and speak" })).toBeInViewport();
  expect(
    await page
      .locator("main[data-demo-scroll]")
      .evaluate((el) => parseFloat(getComputedStyle(el).scrollPaddingTop)),
  ).toBeLessThan(25);
  await page.screenshot({ path: info.outputPath("demo-landscape.png"), animations: "disabled" });
});
