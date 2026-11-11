import { test, expect } from "@playwright/test";
import { prepare } from "./speaking-role-fixture";
import { appUrl } from "./app-state";
for (const theme of ["light", "dark"])
  test(`partner selection, first question and remembered role (${theme})`, async ({
    page,
  }, info) => {
    const requests = await prepare(page, false, theme);
    const frame = page.getByRole("region", { name: "Free conversation practice" });
    const picker = frame.getByTestId("speaking-partner-picker");
    await picker.getByLabel("Speaking partner role").selectOption("employee");
    await page.screenshot({
      path: `/tmp/roles-setup-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
    await frame.getByRole("button", { name: "Let partner start", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 1",
    );
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({
      partnerRoleId: "employee",
      moduleId: "roofing",
      startConversation: true,
      language: "Spanish",
      nativeLanguage: "English",
    });
    await expect(frame.getByRole("region", { name: "Conversation replies" })).not.toContainText(
      "Begin the conversation.",
    );
    const reply = frame.getByRole("textbox", { name: "Type an answer in Spanish" });
    await reply.fill("Necesito ayuda con el trabajo de hoy.");
    await frame.getByRole("button", { name: "Send answer", exact: true }).click();
    await expect(frame.getByRole("region", { name: "Conversation replies" })).toContainText(
      "Respuesta 2",
    );
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({
      partnerRoleId: "employee",
      moduleId: "roofing",
      startConversation: false,
    });
    expect(requests[1].messages?.[0].role).toBe("assistant");
    expect(requests[1].messages?.at(-1)).toEqual({
      role: "user",
      content: "Necesito ayuda con el trabajo de hoy.",
    });
    await page.screenshot({ path: `/tmp/roles-${theme}-${info.project.name}.png`, fullPage: true });
    await page.reload();
    await page.getByRole("tab", { name: "Free conversation", exact: true }).click();
    const menu = page
      .locator("details")
      .filter({ has: page.getByText("Topics & challenges", { exact: true }) });
    await menu.locator("summary").click();
    await expect(menu.getByLabel("Speaking partner role")).toHaveValue("employee");
    await menu.getByLabel("Speaking partner role").selectOption("patient");
    await expect(page.getByRole("region", { name: "Conversation replies" })).not.toContainText(
      "Respuesta 1",
    );
  });
for (const [base, target, native] of [
  ["or-evs", "English", "Spanish"],
  ["or-cleaning", "Spanish", "English"],
])
  test(`${target} OR crew: every stage opens its own reading and vocabulary`, async ({ page }) => {
    await prepare(page, false, "dark");
    await page.addInitScript(
      ({ base, target, native }) => {
        const id = "00000000-0000-4000-8000-00000000c044";
        localStorage.setItem(
          "lt.profile-device.v1.user." + id,
          JSON.stringify({
            schema: 1,
            userId: id,
            data: {
              onboardingComplete: true,
              selectedLanguage: target,
              nativeLanguage: native,
              activeModuleId: base,
              currentTab: "core30",
              purchasedModules: [base, "foundation-" + base, "master-" + base],
            },
          }),
        );
      },
      { base, target, native },
    );
    for (const [prefix, n] of [
      ["foundation-", 1],
      ["foundation-", 10],
      ["", 1],
      ["", 30],
      ["master-", 1],
      ["master-", 20],
    ]) {
      const mid = prefix + base;
      await page.goto(
        appUrl({ tab: "core30", module: mid, target, native }) + `&lesson=${n}&way=see`,
      );
      await expect(page.getByTestId("lesson-section-see")).toBeVisible();
      await expect(page.getByTestId("lesson-section-see")).toContainText(
        /OR|quirófano|sala|turno|room/i,
      );
      await expect(
        page.getByTestId("lesson-section-see").getByRole("link", { name: "Open verb practice" }),
      ).toBeVisible();
      const res = await page.request.get(
        `/lesson-content/${target === "English" ? "en" : "es"}/${mid}.json`,
      );
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.nativeLanguage).toBe(native);
      const term = data.lessons[n].words.find((w: { kind: string }) => w.kind === "term").es;
      await expect(page.getByTestId("lesson-section-see")).toContainText(
        data.lessons[n].passage.target[0],
      );
      await page.getByTestId("lesson-open-full-reader").click();
      await expect(page.getByTestId("lesson-return-pill")).toBeVisible();
      await page.getByTestId("lesson-return-pill").click();
      await expect(page.getByTestId("lesson-section-see")).toBeVisible();
      for (const way of ["recall", "hear", "type", "say", "write"]) {
        await page.goto(
          appUrl({ tab: "core30", module: mid, target, native }) + `&lesson=${n}&way=${way}`,
        );
        if (way === "write") {
          await expect(
            page.getByRole("heading", { name: "Writing practice", exact: true }),
          ).toBeVisible();
          continue;
        }
        const panel = page.getByTestId(way === "say" ? "lesson-section-say" : "lesson-section-kit");
        await expect(panel).toBeVisible();
        await expect(page.getByTestId(`lesson-nav-${way}`)).toHaveAttribute("aria-current", "step");
        if (way === "recall") await expect(panel).toContainText(term);
      }
    }
  });
