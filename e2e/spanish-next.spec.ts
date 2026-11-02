import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readAppState } from "./app-state";
const practice = JSON.parse(readFileSync("src/data/spanish-next-practice.json", "utf8"));
test.use({ storageState: { cookies: [], origins: [] } });
async function openCourse(page: Page, moduleId: string, signedIn = false) {
  const id = "00000000-0000-4000-8000-00000000a060";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "spanish-basics-e2e@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user,
  };
  await page.addInitScript(
    ({ moduleId, signedIn, id, session }) => {
      const actor = signedIn ? id : null;
      if (signedIn)
        localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      const key = actor ? `lt.profile-device.v1.user.${actor}` : "lt.profile-device.v1.guest";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: 1,
            userId: actor,
            data: {
              onboardingComplete: true,
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: [moduleId, moduleId.replace(/^(foundation-|master-)/, "")],
            },
          }),
        );
    },
    { moduleId, signedIn, id, session },
  );
  await page.route("**/api/team-activity", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: {}, recorded: 0 }),
    }),
  );
  await page.goto(`/?module=${moduleId}&target=Spanish&native=English&tab=core30`);
}

for (const [moduleId, opening] of [
  ["foundation-spanish-cognates", "Busco un hotel cerca del hospital."],
  ["spanish-cognates", "Una periodista prepara una entrevista con un artista."],
  ["master-spanish-cognates", "Busco un hotel cerca del hospital."],
  ["spanish-102", "Se lo voy a devolver esta tarde."],
  ["spanish-usage-verbs", "Veo una fecha distinta en el documento."],
  ["spanish-common-patterns", "Acabo de limpiar la sala."],
  ["spanish-frequent-verbs", "Ayer llegué tarde a la estación."],
  ["master-spanish-102", "Al contar la historia, expliqué por qué llegué tarde."],
  ["master-spanish-conjugation-patterns", "Al contar la historia, expliqué por qué llegué tarde."],
] as const)
  test(`${moduleId}: original reading and English grammar reach all six modes`, async ({
    page,
  }) => {
    await openCourse(page, moduleId, moduleId === "foundation-spanish-cognates");
    await expect(
      page.getByRole("navigation", { name: "General Spanish course sequence" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
      .click();
    await expect(page.getByTestId("lesson-section-see")).toContainText(opening);
    await expect(page.getByTestId("lesson-grammar-focus")).toBeVisible();
    await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
    await page.getByTestId("lesson-nav-recall").click();
    await expect(page.getByTestId("lesson-practice-section")).toBeVisible();
    await page.getByTestId("lesson-nav-hear").click();
    await expect(page.getByTestId("lesson-section-kit")).toBeVisible();
    await page.getByTestId("lesson-nav-type").click();
    await expect(page.getByRole("region", { name: "Typed lesson response" })).toBeVisible();
    await page.getByTestId("lesson-nav-write").click();
    await page.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
    await expect(page.getByRole("region", { name: "Handwritten lesson response" })).toBeVisible();
    await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
    await page.getByTestId("lesson-nav-say").click();
    await expect(page.getByTestId("lesson-speaking-practice")).toContainText(
      practice[moduleId]["1"].openingLine,
    );
    await page.getByTestId("lesson-nav-see").click();
    await page
      .getByTestId("lesson-section-see")
      .getByRole("button", { name: /full reader/i })
      .click();
    await expect(page.getByTestId("reader-options")).toBeVisible();
    await expect(page.locator("body")).toContainText(opening);
  });
test("one pattern has ten verbs, ten checked answers and no mastery before retrieval", async ({
  page,
}, info) => {
  const id = "spanish-conjugation-patterns";
  await openCourse(page, id);
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  const models = page.getByRole("region", { name: "Ten-verb pattern models" });
  await expect(models.locator("details")).toHaveCount(10);
  await models.locator("summary").first().click();
  await expect(models.getByRole("button", { name: "Listen: yo hablé", exact: true })).toBeVisible();
  const mastery = page.getByTestId("core30-mastered-button");
  await expect(mastery).toBeDisabled();
  for (const [i, q] of practice[id]["1"].checks.entries())
    await page.getByLabel(`Grammar answer ${i + 1}`, { exact: true }).fill(q.answer);
  await page.getByRole("button", { name: "Check grammar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Grammar practice check" })).toContainText(
    "10 of 10 correct",
  );
  await expect(mastery).toBeEnabled();
  await models.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/spanish-next-${info.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("lesson-nav-recall").click();
  await expect(page.getByTestId("lesson-practice-section")).toContainText("hablé");
});

test("authored HD recordings play both selected voices without a synthesis request @dev-only", async ({
  page,
}) => {
  await openCourse(page, "spanish-conjugation-patterns");
  await page.getByRole("button", { name: /^Start Lesson 1$/, exact: true }).click();
  await expect(page.getByRole("region", { name: "Ten-verb pattern models" })).toBeVisible();
  let synthesisRequests = 0;
  await page.route("**/api/mission-tts", (route) => {
    synthesisRequests++;
    return route.abort();
  });
  for (const gender of ["female", "male"] as const) {
    await page.evaluate(
      async ({ gender }) => {
        const ttsPath = "/src/lib/tts.ts",
          prefsPath = "/src/data/mission-tts.ts";
        const { speakRemote } = await import(ttsPath);
        const { encodeGoogleVoicePreference } = await import(prefsPath);
        const qa = window as typeof window & {
          recordedQa?: { started: boolean; ended: boolean; failed: boolean };
        };
        qa.recordedQa = { started: false, ended: false, failed: false };
        document.getElementById("qa-recorded-play")?.remove();
        const button = document.createElement("button");
        button.id = "qa-recorded-play";
        button.textContent = "QA play authored recording";
        Object.assign(button.style, {
          position: "fixed",
          top: "100px",
          left: "20px",
          zIndex: "99999",
        });
        button.onclick = () =>
          void speakRemote("Se lo voy a devolver esta tarde.", "es-US", {
            voiceURI: encodeGoogleVoicePreference({
              name: `es-US-Chirp3-HD-${gender === "female" ? "Aoede" : "Charon"}`,
              languageCodes: ["es-US"],
            }),
            onPlaybackStart: () => {
              qa.recordedQa!.started = true;
            },
            onend: () => {
              qa.recordedQa!.ended = true;
            },
            onerror: () => {
              qa.recordedQa!.failed = true;
            },
          });
        document.body.append(button);
      },
      { gender },
    );
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/audio/spanish-next/") &&
          response.url().endsWith(`-${gender}.mp3`),
      ),
      page.locator("#qa-recorded-play").click(),
    ]);
    expect([200, 206]).toContain(response.status());
    expect((await response.body()).length).toBeGreaterThan(500);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as typeof window & { recordedQa?: { ended: boolean } }).recordedQa?.ended,
          ),
        { timeout: 15000 },
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { recordedQa?: { started: boolean; failed: boolean } })
            .recordedQa,
      ),
    ).toMatchObject({ started: true, failed: false });
  }
  expect(synthesisRequests).toBe(0);
});

test("cognates HD recordings play both selected voices without a synthesis request @dev-only", async ({
  page,
}) => {
  await openCourse(page, "spanish-cognates");
  await page.getByRole("button", { name: /^Start Lesson 1$/, exact: true }).click();
  let synthesisRequests = 0;
  await page.route("**/api/mission-tts", (route) => {
    synthesisRequests++;
    return route.abort();
  });
  for (const gender of ["female", "male"] as const) {
    await page.evaluate(
      async ({ gender }) => {
        const ttsPath = "/src/lib/tts.ts",
          prefsPath = "/src/data/mission-tts.ts";
        const { speakRemote } = await import(ttsPath);
        const { encodeGoogleVoicePreference } = await import(prefsPath);
        const qa = window as typeof window & {
          recordedQa?: { started: boolean; ended: boolean; failed: boolean };
        };
        qa.recordedQa = { started: false, ended: false, failed: false };
        document.getElementById("qa-recorded-play")?.remove();
        const button = document.createElement("button");
        button.id = "qa-recorded-play";
        button.textContent = "QA play authored recording";
        Object.assign(button.style, {
          position: "fixed",
          top: "100px",
          left: "20px",
          zIndex: "99999",
        });
        button.onclick = () =>
          void speakRemote("Una periodista prepara una entrevista con un artista.", "es-US", {
            voiceURI: encodeGoogleVoicePreference({
              name: `es-US-Chirp3-HD-${gender === "female" ? "Aoede" : "Charon"}`,
              languageCodes: ["es-US"],
            }),
            onPlaybackStart: () => {
              qa.recordedQa!.started = true;
            },
            onend: () => {
              qa.recordedQa!.ended = true;
            },
            onerror: () => {
              qa.recordedQa!.failed = true;
            },
          });
        document.body.append(button);
      },
      { gender },
    );
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/audio/spanish-next/") &&
          response.url().endsWith(`-${gender}.mp3`),
      ),
      page.locator("#qa-recorded-play").click(),
    ]);
    expect([200, 206]).toContain(response.status());
    expect((await response.body()).length).toBeGreaterThan(500);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as typeof window & { recordedQa?: { ended: boolean } }).recordedQa?.ended,
          ),
        { timeout: 15000 },
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { recordedQa?: { started: boolean; failed: boolean } })
            .recordedQa,
      ),
    ).toMatchObject({ started: true, failed: false });
  }
  expect(synthesisRequests).toBe(0);
});

for (const moduleId of [
  "spanish-usage-verbs",
  "spanish-conjugation-patterns",
  "master-spanish-common-patterns",
])
  test(`${moduleId}: lesson-local matching, hangman, choices and typing`, async ({ page }) => {
    await openCourse(page, moduleId, moduleId === "foundation-spanish-cognates");
    await page
      .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
      .click();
    const games = page.getByRole("region", { name: "Lesson verb games", exact: true });
    await expect(games).toBeVisible();
    const raw = JSON.parse(readFileSync(`public/lesson-content/es/${moduleId}.json`, "utf8"))
      .lessons["1"];
    const pattern = practice[moduleId]["1"].pattern;
    const source = pattern?.verbs ?? raw.verbs;
    const forms = source.flatMap(
      (v: { infinitive: string; native: string; forms: Record<string, string> }) =>
        Object.entries(v.forms).map(([person, answer]) => ({
          verb: v.infinitive,
          person,
          answer,
          native: v.native,
        })),
    );
    await games.getByRole("button", { name: "Match verb meanings", exact: true }).click();
    for (let i = 0; i < Math.min(source.length, 10); i++) {
      const round = games.getByTestId("lesson-verb-game-round");
      // Select the first unmatched prompt; answer buttons are in the other column.
      const left = round
        .locator(".grid.grid-cols-2 > div")
        .first()
        .getByRole("button", { disabled: false })
        .first();
      const meaning = await left.innerText();
      const verb = source.find((v: { native: string }) => v.native === meaning);
      await left.click();
      await round.getByRole("button", { name: verb.infinitive, exact: true }).click();
    }
    await expect(games).toContainText("Round complete");
    for (const game of ["Match conjugations", "Hangman", "Choose the form", "Type the form"]) {
      await games.getByRole("button", { name: game, exact: true }).click();
      const round = games.getByTestId("lesson-verb-game-round");
      if (game === "Match conjugations") {
        const left = round.locator(".grid.grid-cols-2 > div").first().getByRole("button").first();
        const prompt = await left.innerText();
        const verb = prompt.split(" · ")[1];
        const person = prompt.split(" · ")[0];
        const form = forms.find(
          (v: { verb: string; person: string }) =>
            v.verb === verb &&
            (v.person.replaceAll("_", " / ") === person ||
              (
                { tu: "tú", el: "él / ella / usted", ellos: "ellos / ellas / ustedes" } as Record<
                  string,
                  string
                >
              )[v.person] === person),
        );
        await left.click();
        await round.getByRole("button", { name: form.answer, exact: true }).click();
        await expect(round).toContainText("Matched.");
        continue;
      }
      const prompt = await round.locator("p.font-semibold").innerText();
      const verb = prompt.split(" · ")[1];
      const person = prompt.split(" · ")[0];
      const form = forms.find(
        (v: { verb: string; person: string }) =>
          v.verb === verb &&
          (v.person.replaceAll("_", " / ") === person ||
            (
              { tu: "tú", el: "él / ella / usted", ellos: "ellos / ellas / ustedes" } as Record<
                string,
                string
              >
            )[v.person] === person),
      );
      expect(form).toBeTruthy();
      if (game === "Hangman") {
        for (const letter of new Set(
          [...form.answer.toLowerCase()].filter((c) => /[a-záéíóúüñ]/.test(c)),
        ))
          await round.getByRole("button", { name: letter, exact: true }).click();
        await expect(round).toContainText("Solved.");
        if (moduleId === "spanish-conjugation-patterns")
          await page.screenshot({ path: `/tmp/lt-verb-games-${test.info().project.name}.png` });
      } else if (game === "Choose the form") {
        await round.getByRole("button", { name: form.answer, exact: true }).click();
        await expect(round).toContainText("Correct.");
      } else {
        await round.getByLabel("Game Spanish form").fill("wrong");
        await round.getByRole("button", { name: "Check form", exact: true }).click();
        await expect(round).toContainText("Try again.");
        await round.getByLabel("Game Spanish form").fill(form.answer);
        await round.getByRole("button", { name: "Check form", exact: true }).click();
        await expect(round).toContainText("Correct.");
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

for (const [moduleId, last] of [
  ["foundation-spanish-cognates", 10],
  ["spanish-cognates", 30],
  ["master-spanish-cognates", 20],
] as const)
  test(`${moduleId}: final lesson keeps its own reading and checked cognate answers`, async ({
    page,
  }, info) => {
    await openCourse(page, moduleId, moduleId.startsWith("foundation-"));
    await page.goto(
      `/?tab=core30&module=${moduleId}&target=Spanish&native=English&lesson=${last}&way=see`,
    );
    const lesson = practice[moduleId][String(last)];
    await expect(page.getByTestId("lesson-section-see")).toContainText(lesson.reading.target[0]);
    const check = page.getByRole("region", { name: "Cognate practice check" });
    await expect(page.getByTestId("core30-mastered-button")).toBeDisabled();
    await check.getByRole("button", { name: "Check cognate", exact: true }).click();
    await expect(check).toContainText("Review:");
    for (const [i, q] of lesson.checks.entries())
      await check.getByLabel(`Cognate answer ${i + 1}`, { exact: true }).fill(q.answer);
    await check.getByRole("button", { name: "Check cognate", exact: true }).click();
    await expect(check).toContainText("3 of 3 correct");
    await expect(page.getByTestId("core30-mastered-button")).toBeEnabled();
    if (moduleId.startsWith("master-"))
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
          theme,
        );
        await page.getByTestId("lesson-section-see").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `/tmp/cognates-${info.project.name}-${theme}.png` });
      }
    await page
      .getByTestId("lesson-section-see")
      .getByRole("button", { name: /full reader/i })
      .click();
    await expect(page.getByTestId("reader-options")).toBeVisible();
    await expect(page.locator("body")).toContainText(lesson.reading.target.at(-1));
  });
