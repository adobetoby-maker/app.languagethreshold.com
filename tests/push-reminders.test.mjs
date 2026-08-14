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
  assert.equal(notification.title, "68 days until Costa Rica");
  assert.match(notification.body, /Renting a Vespa/);
  assert.match(notification.body, /68 of 92 lessons remain/);
  assert.equal(notification.url, "/?tab=speak");
});

test("the nearer departure wins when both mission and vacation dates exist", () => {
  const notification = buildReminderNotification(
    {
      ...context,
      mission: { label: "Argentina Córdoba Mission", date: "2026-09-01", kind: "mission" },
    },
    "2026-08-14",
  );
  assert.equal(notification.title, "18 days until departure");
});

test("daily notification is suppressed after real practice", () => {
  assert.equal(
    buildReminderNotification({ ...context, lastPracticeDate: "2026-08-14" }, "2026-08-14"),
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
