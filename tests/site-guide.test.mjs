import assert from "node:assert/strict";
import test from "node:test";
import { APP_TABS } from "../src/lib/app-navigation.ts";
import {
  SITE_DESTINATIONS,
  siteGuideHref,
  siteGuideInstructions,
  localSiteGuideReply,
  resolveSiteGuideHref,
  externalTutorHref,
} from "../src/lib/site-guide.ts";
import { canOfferSiteGuide } from "../src/lib/site-guide-events.ts";
import { loadModule } from "./helpers/bundle.mjs";
const context = {
  moduleId: "roofing",
  language: "Spanish",
  nativeLanguage: "English",
  currentTab: "reader",
};
test("site guide destinations are real learner routes and preserve the active learning pair", () => {
  const paths = new Set(["/documents", "/account", "/support", "/exams"]);
  for (const destination of SITE_DESTINATIONS) {
    const href = siteGuideHref(destination.id, context);
    const url = new URL(href, "https://app.languagethreshold.com");
    if (url.pathname === "/") {
      assert.ok(APP_TABS.includes(url.searchParams.get("tab")));
      assert.equal(url.searchParams.get("module"), "roofing");
      assert.equal(url.searchParams.get("target"), "Spanish");
      assert.equal(url.searchParams.get("native"), "English");
    } else assert.ok(paths.has(url.pathname));
    assert.equal(resolveSiteGuideHref(href, context), href);
  }
  assert.equal(
    new URL(
      siteGuideHref("lessons", { ...context, moduleId: null }),
      "https://app.languagethreshold.com",
    ).searchParams.get("tab"),
    "modules",
  );
  assert.equal(siteGuideHref("delete-account", context), null);
});
test("local site requests work without an AI call while language questions remain study questions", () => {
  for (const [question, fragment] of [
    ["I want to review my cards", "Short review rounds"],
    ["Take me to conjugation", "Conjugation"],
    ["Where can I change my voice?", "panel=settings"],
    ["How do I add a word?", "panel=add-word"],
    ["I want to upload a PDF", "/documents"],
    ["Quiero practicar tarjetas", "Cards"],
    ["Help me get started", "Choose a module"],
  ])
    assert.ok(localSiteGuideReply(question, context)?.includes(fragment), question);
  for (const question of [
    "What does open the cards mean?",
    "Translate: I want to open the reader",
    "Explain the grammar of this sentence",
    "I want to understand conjugation",
    "Help me understand this passage",
    "Why does this verb change?",
    "Quiz me on this passage",
  ]) {
    assert.equal(localSiteGuideReply(question, context), null, question);
  }
});
test("model navigation cannot invent internal routes, mutate data or replace the learner's language/module", () => {
  for (const href of [
    "javascript:alert(1)",
    "/api/delete-account",
    "/?tab=owner-admin",
    "/?tab=flashcards&action=reset",
    "https://evil.example/?tab=reader",
    "/?tab=reader#hidden-action",
    "/?tab=reader&panel=reset",
    "/account?delete=true",
  ]) {
    assert.equal(resolveSiteGuideHref(href, context), null, href);
  }
  const corrected = new URL(
    resolveSiteGuideHref("/?tab=flashcards&module=fmg&target=French&native=German", context),
    "https://app.languagethreshold.com",
  );
  assert.equal(corrected.searchParams.get("module"), "roofing");
  assert.equal(corrected.searchParams.get("target"), "Spanish");
  for (const bad of [
    "https://",
    "javascript:alert(1)",
    "data:text/html,x",
    "https://secret@example.com",
    "/api/delete-account",
  ]) {
    assert.equal(externalTutorHref(bad), null);
  }
  assert.equal(externalTutorHref("https://example.org/grammar"), "https://example.org/grammar");
});
test("getting-started offer waits for onboarding and stays out of lessons and active practice", () => {
  const ready = {
    hydrated: true,
    onboardingComplete: true,
    tutorOpen: false,
    currentTab: "reader",
    hasLessonLink: false,
  };
  assert.equal(canOfferSiteGuide(ready), true);
  for (const patch of [
    { hydrated: false },
    { onboardingComplete: false },
    { tutorOpen: true },
    { hasLessonLink: true },
    { currentTab: "speak" },
    { currentTab: "core30" },
    { currentTab: "games" },
  ])
    assert.equal(canOfferSiteGuide({ ...ready, ...patch }), false);
});
test("live tutor prompt includes verified website knowledge alongside its original study context", async () => {
  const { BodySchema, buildSystemPrompt } = await loadModule("src/routes/api.tutor.ts", {
    stubs: [/^@anthropic-ai\/sdk$/, /^@tanstack\/react-router$/, /lib\/sentry$/],
  });
  const parsed = BodySchema.parse({
    messages: [{ role: "user", content: "Where can I practice?" }],
    context: {
      language: "Spanish",
      nativeLanguage: "English",
      level: "A1",
      textTitle: "A useful passage",
      site: { currentTab: "reader" },
      module: { id: "roofing", name: "Roofing" },
    },
  });
  const prompt = buildSystemPrompt(parsed.context);
  assert.ok(prompt.includes("WEBSITE GUIDE"));
  assert.ok(prompt.includes("A useful passage"));
  assert.ok(prompt.includes(siteGuideHref("cards", context)));
  assert.ok(prompt.includes("never turns on your microphone"));
  assert.ok(siteGuideInstructions(context).includes("Never invent a URL"));
});
