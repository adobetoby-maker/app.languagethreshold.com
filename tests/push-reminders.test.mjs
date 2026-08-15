import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReminderNotification, daysUntilDate } from "../src/lib/reminder-message.ts";

const context = {
  version: 1,
  language: "Spanish",
  topicTitle: "Renting a Vespa",
  lastPracticeDate: null,
  mission: null,
  trip: { label: "Costa Rica", date: "2026-10-21", kind: "trip" },
  stack: {
    moduleId: "international-travel",
    name: "Travel",
    totalLessons: 92,
    completedLessons: 24,
    remainingLessons: 68,
    nextLessonTitle: "Renting a Vespa",
  },
};

test("layered reminder combines the nearest trip, topic, and lesson countdown", () => {
  const notification = buildReminderNotification(context, "2026-08-14");
  assert.equal(daysUntilDate("2026-10-21", "2026-08-14"), 68);
  // Reminders open with a greeting in the target language, then invite in English.
  assert.equal(notification.title, "¡Buenos días! 68 days until Costa Rica");
  assert.match(notification.body, /Renting a Vespa/);
  assert.match(notification.body, /68 of 92 lessons remain/);
  // Deep link carries the language so tapping a Spanish reminder opens Spanish.
  assert.equal(notification.url, "/?tab=speak&lang=Spanish");
});

test("the nearer departure wins when both mission and vacation dates exist", () => {
  const notification = buildReminderNotification(
    {
      ...context,
      mission: { label: "Argentina Córdoba Mission", date: "2026-09-01", kind: "mission" },
    },
    "2026-08-14",
  );
  assert.equal(notification.title, "¡Buenos días! 18 days until departure");
});

test("daily notification is suppressed after real practice", () => {
  assert.equal(
    buildReminderNotification({ ...context, lastPracticeDate: "2026-08-14" }, "2026-08-14"),
    null,
  );
});

test("recovery reminder says exactly how many lessons restore the streak", () => {
  const notification = buildReminderNotification(
    {
      ...context,
      language: "Italian",
      streak: {
        current: 18,
        best: 18,
        lessonsCompletedToday: 1,
        recoveryLessonsRemaining: 1,
        travelPasses: 1,
        travelBreakEndsOn: null,
      },
    },
    "2026-08-14",
  );
  assert.equal(notification.title, "Buongiorno! 1 lesson can restore your streak");
  // Streak is overall, not per-language (a polyglot keeps ONE streak), so the
  // copy says "your 18-day streak" and names the language only as the action.
  assert.match(notification.body, /18-day streak/);
  assert.match(notification.body, /in Italian/);
  assert.equal(notification.badgeCount, 1);
});

test("daily reminders pause while a travel pass protects the streak", () => {
  assert.equal(
    buildReminderNotification(
      {
        ...context,
        streak: {
          current: 18,
          best: 18,
          lessonsCompletedToday: 0,
          recoveryLessonsRemaining: 0,
          travelPasses: 0,
          travelBreakEndsOn: "2026-08-18",
        },
      },
      "2026-08-14",
    ),
    null,
  );
});

test("service worker handles push, safe deep links, and notification clicks", async () => {
  const serviceWorker = await readFile("public/sw.js", "utf8");
  assert.match(serviceWorker, /addEventListener\("push"/);
  assert.match(serviceWorker, /showNotification/);
  assert.match(serviceWorker, /addEventListener\("notificationclick"/);
  assert.match(serviceWorker, /payload\.url\.startsWith\("\/"\)/);
});

test("the hourly scheduler stays in Supabase rather than unsupported Vercel Hobby cron", async () => {
  const adapter = await readFile("scripts/vercel-adapter.mjs", "utf8");
  const migration = await readFile(
    "supabase/migrations/20260814202507_schedule_push_reminders_hourly.sql",
    "utf8",
  );
  assert.doesNotMatch(adapter, /crons:/);
  assert.match(migration, /cron\.schedule/);
  assert.match(migration, /0 \* \* \* \*/);
  assert.match(migration, /vault\.decrypted_secrets/);
});

// --- Multi-language reminders -------------------------------------------------
// A polyglot studying 2-3 languages gets one reminder per language, each at its
// own hour. Two properties must hold or the feature is worse than useless:
// notifications must not collapse into one another, and the greeting must match
// both the language and the time of day.

test("each language gets its own notification tag so reminders do not replace each other", () => {
  const italian = buildReminderNotification({ ...context, language: "Italian" }, "2026-08-14", 7);
  const spanish = buildReminderNotification({ ...context, language: "Spanish" }, "2026-08-14", 12);
  const japanese = buildReminderNotification({ ...context, language: "Japanese" }, "2026-08-14", 20);

  const tags = [italian.tag, spanish.tag, japanese.tag];
  assert.equal(new Set(tags).size, 3, "a shared tag makes iOS replace the previous notification");
  assert.match(italian.tag, /Italian$/);
  assert.match(spanish.tag, /Spanish$/);
  assert.match(japanese.tag, /Japanese$/);
});

test("greeting matches the target language and the hour the reminder fires", () => {
  assert.match(
    buildReminderNotification({ ...context, language: "Italian" }, "2026-08-14", 7).title,
    /^Buongiorno!/,
  );
  assert.match(
    buildReminderNotification({ ...context, language: "Italian" }, "2026-08-14", 14).title,
    /^Buon pomeriggio!/,
  );
  assert.match(
    buildReminderNotification({ ...context, language: "Italian" }, "2026-08-14", 20).title,
    /^Buonasera!/,
  );
  assert.match(
    buildReminderNotification({ ...context, language: "Japanese" }, "2026-08-14", 8).title,
    /^おはようございます！/,
  );
});

test("the invite stays English even when the greeting is not", () => {
  const notification = buildReminderNotification(
    { ...context, language: "Pashto" },
    "2026-08-14",
    9,
  );
  // Greeting is Pashto; the actionable half must remain readable half-asleep.
  assert.match(notification.title, /^سهار مو په خیر!/);
  assert.match(notification.body, /Renting a Vespa/);
});

test("deep link opens the language the reminder is about", () => {
  const notification = buildReminderNotification({ ...context, language: "Korean" }, "2026-08-14", 9);
  assert.equal(notification.url, "/?tab=speak&lang=Korean");
});

test("an unknown language degrades to an English greeting rather than breaking", () => {
  const notification = buildReminderNotification({ ...context, language: "Klingon" }, "2026-08-14", 9);
  assert.match(notification.title, /^Good morning!/);
  assert.ok(notification.tag.endsWith("Klingon"));
});
