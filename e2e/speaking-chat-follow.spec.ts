import { test, expect } from "@playwright/test";
import { prepare } from "./speaking-role-fixture";

for (const theme of ["light", "dark"]) {
  test(`conversation follows replies, pauses for reading, and resumes (${theme})`, async ({
    page,
  }) => {
    await prepare(page, false, theme);
    let count = 0;
    await page.route("**/api/speak", (route) => {
      if (route.request().postDataJSON().mode !== "chat") return route.fallback();
      const text =
        `Respuesta ${++count}\n` +
        "Hablemos del trabajo. Una pregunta para practicar.\n".repeat(65);
      return route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`,
      });
    });
    await page.getByRole("button", { name: "Let partner start", exact: true }).click();
    const transcript = page.getByRole("region", { name: "Conversation replies" });
    await expect(transcript).toContainText("Respuesta 1");
    const distance = () =>
      transcript.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop);
    await expect.poll(distance).toBeLessThan(4);
    await transcript.hover();
    await page.mouse.wheel(0, -900);
    const latest = page.getByRole("button", { name: "Latest response" });
    await expect(latest).toBeVisible();
    const before = await transcript.evaluate((node) => node.scrollTop);
    await page.getByRole("textbox", { name: "Type an answer in Spanish" }).fill("Necesito ayuda.");
    await page.getByRole("button", { name: "Send answer", exact: true }).click();
    await expect(transcript).toContainText("Respuesta 2");
    await expect(latest).toBeVisible();
    expect(await transcript.evaluate((node) => node.scrollTop)).toBeLessThanOrEqual(before + 4);
    const label = transcript.getByText("You", { exact: true });
    await expect(label).toHaveCSS("text-align", "right");
    await latest.click();
    await expect.poll(distance).toBeLessThan(4);
    await expect(latest).not.toBeVisible();
  });
}

for (const theme of ["light", "dark"]) {
  test(`mission follows replies and respects reading history (${theme})`, async ({ page }) => {
    await prepare(page, true, theme);
    let count = 0;
    await page.route("**/api/speak", (route) => {
      if (route.request().postDataJSON().mode !== "mission") return route.fallback();
      return route.fulfill({
        json: {
          assistantText:
            `Misión ${++count}\n` + "Practiquemos las palabras de este trabajo.\n".repeat(65),
          deferredFeedback: [],
          provisionalObjectiveIds: [],
          shouldEnd: false,
        },
      });
    });
    const transcript = page.getByRole("region", { name: "Conversation", exact: true });
    const reply = page.getByRole("textbox", { name: "Type your answer in Spanish" });
    const send = page.getByRole("button", { name: "Send typed answer" });
    await reply.fill("Necesito ayuda.");
    await send.click();
    await expect(transcript).toContainText("Misión 1");
    const distance = () =>
      transcript.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop);
    await expect.poll(distance).toBeLessThan(4);
    await transcript.hover();
    await page.mouse.wheel(0, -900);
    const latest = page.getByRole("button", { name: "Latest response" });
    await expect(latest).toBeVisible();
    const before = await transcript.evaluate((node) => node.scrollTop);
    await reply.fill("Gracias por ayudarme.");
    await send.click();
    await expect(transcript).toContainText("Misión 2");
    expect(await transcript.evaluate((node) => node.scrollTop)).toBeLessThanOrEqual(before + 4);
    await expect(transcript.getByText("You", { exact: true }).first()).toHaveCSS(
      "text-align",
      "right",
    );
    await latest.click();
    await expect.poll(distance).toBeLessThan(4);
  });
}
