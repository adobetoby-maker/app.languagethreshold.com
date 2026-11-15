import { expect, type Page } from "@playwright/test";
export async function collectRecallCards(page: Page) {
  const deck = page.getByTestId("lesson-recall-deck");
  const cards: { target: string; kind: string }[] = [];
  for (let step = 0; step < 200; step++) {
    const current = await deck.getAttribute("data-current-id");
    if (!current) return cards;
    const card = deck.getByTestId("recall-step");
    if ((await card.getAttribute("data-kind")) === "card") {
      const kind = await card.locator("p").first().innerText();
      await card.getByRole("button", { name: "Flip the card", exact: true }).click();
      cards.push({ target: await card.getByTestId("recall-card-text").innerText(), kind });
      await card.getByRole("button", { name: "Got it", exact: true }).click();
    } else await deck.getByRole("button", { name: "Skip this activity", exact: true }).click();
    await expect(deck).not.toHaveAttribute("data-current-id", current);
  }
  throw new Error("Recall did not finish within 200 steps");
}
export async function openRecallTools(page: Page) {
  const tools = page.getByTestId("recall-tools");
  if (await tools.evaluate((element) => !(element as HTMLDetailsElement).open))
    await tools.locator(":scope > summary").click();
}
