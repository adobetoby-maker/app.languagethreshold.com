import { expect, test } from "@playwright/test";

// Sign-in offers Google and email only. Apple was removed because it is not set up.
test("sign-in modal offers Google and email, not Apple", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  if (isMobile) {
    // The phone header has no visible Sign in; the "Keep this progress" banner
    // appears after saving a word to My Vocab and opens the same modal.
    await page.getByRole("button", { name: "billete", exact: true }).first().tap();
    await expect(page.getByText(/in this sentence/i).first()).toBeVisible();
    await page.getByRole("button", { name: /^\s*my vocab\s*$/i }).tap();
    await expect(page.getByRole("button", { name: /added/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Save/ }).tap();
  } else {
    await page
      .getByRole("button", { name: /sign in/i })
      .filter({ visible: true })
      .first()
      .click();
  }

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Google" })).toBeVisible();
  await expect(dialog.getByPlaceholder("Email")).toBeVisible();
  await expect(dialog.getByPlaceholder("Password")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /apple/i })).toHaveCount(0);
  await expect(dialog.getByText(/apple/i)).toHaveCount(0);
});
