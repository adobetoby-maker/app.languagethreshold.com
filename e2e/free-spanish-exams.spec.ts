import { expect, test } from "@playwright/test";

// Public lesson-derived checks only. No users, private banks or real exam sessions are created.
test.use({ storageState: { cookies: [], origins: [] } });
test("guest placement, full post-Core check and unrestricted retake", async ({ page }) => {
  await page.route("**/api/exam-check", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "disabled", code: "disabled" },
    }),
  );
  await page.goto("/exams?module=spanish-basics&target=Spanish&native=English", {
    waitUntil: "networkidle",
  });
  page.on("pageerror", (error) => console.log("Browser error:", error.message));
  const hub = page.getByTestId("free-spanish-exams");
  await hub.getByRole("button", { name: "Take free placement test" }).click();
  for (let i = 0; i < 10; i++)
    await hub.getByRole("button", { name: "I don’t know", exact: true }).click();
  await expect(hub.getByRole("heading", { name: /Estimated starting point/ })).toBeVisible();
  await hub.getByLabel("Choose your test").selectOption("post-core");
  await hub.getByRole("button", { name: "Take post-Core test", exact: true }).click();
  for (let i = 0; i < 60; i++)
    await hub.getByRole("button", { name: "I don’t know", exact: true }).click();
  await expect(hub.getByRole("heading", { name: "Your Core score: 0%" })).toBeVisible();
  await hub.getByRole("button", { name: "Retake with a new question draw" }).click();
  await expect(hub.getByText("Question 1 of 60", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
