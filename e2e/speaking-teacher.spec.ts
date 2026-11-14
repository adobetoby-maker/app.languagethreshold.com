import { test, expect } from "@playwright/test";
import { prepare } from "./speaking-role-fixture";

for (const theme of ["light", "dark"]) {
  test(`Teacher keeps a chosen topic, explains and restarts on topic change (${theme})`, async ({
    page,
  }, info) => {
    const requests = await prepare(page, false, theme);
    const rates: number[] = [];
    await page.route("**/api/mission-tts**", (route) => {
      if (route.request().method() === "POST")
        rates.push(route.request().postDataJSON().speakingRate);
      return route.fallback();
    });
    const frame = page.getByRole("region", { name: "Free conversation practice" });
    await frame.getByRole("button", { name: "Teacher", exact: true }).click();
    const setup = frame.getByTestId("teacher-setup");
    await setup.getByRole("button", { name: "Fantasy adventure", exact: true }).click();
    await setup
      .getByRole("textbox", { name: "Teaching topic" })
      .fill("A friendly dragon exploring Japanese customs");
    await expect(setup.getByLabel("Teaching style")).toHaveValue("gentle");
    await frame.getByRole("button", { name: "Let partner start", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 1",
    );
    expect(requests[0]).toMatchObject({
      partnerRoleId: "teacher",
      teacherTopic: "A friendly dragon exploring Japanese customs",
      teacherStyle: "gentle",
      startConversation: true,
      language: "Spanish",
    });
    await frame.getByRole("button", { name: "Give me a hint", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 2",
    );
    expect(requests[1]).toMatchObject({
      partnerRoleId: "teacher",
      teacherTopic: "A friendly dragon exploring Japanese customs",
      teacherStyle: "gentle",
      startConversation: false,
    });
    expect(requests[1].messages?.at(-1)?.content).toBe("Give me a hint");
    await frame.getByRole("button", { name: "Explain in English", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 3",
    );
    await frame.getByRole("button", { name: "Slow down", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 4",
    );
    await expect.poll(() => rates).toContain(0.75);
    await page.screenshot({
      path: `/tmp/teacher-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole("tab", { name: "Free conversation", exact: true }).click();
    const menu = page
      .locator("details")
      .filter({ has: page.getByText("Topics & challenges", { exact: true }) });
    await menu.locator("summary").click();
    await expect(menu.getByLabel("Teaching topic")).toHaveValue(
      "A friendly dragon exploring Japanese customs",
    );
    await menu.getByRole("button", { name: "Space & science", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).not.toContainText(
      "Respuesta 1",
    );
    await expect(menu.getByLabel("Teaching topic")).toHaveValue("Space & science");
    await menu.getByLabel("Teaching style").selectOption("standard");
    await menu.locator("summary").click();
    await frame.getByRole("button", { name: "Let partner start", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 5",
    );
    expect(requests.at(-1)).toMatchObject({
      teacherTopic: "Space & science",
      teacherStyle: "standard",
      startConversation: true,
    });
  });
}
