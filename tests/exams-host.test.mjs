import assert from "node:assert/strict";
import test from "node:test";
import { examsHostEntry } from "../src/lib/exams-host.ts";
import { authenticationRedirectUrl } from "../src/lib/auth-return.ts";

test("companion root opens focused Exams with validated assignment context", () => {
  const id = "2210372a-8ca8-47d6-a1d8-5ebcfe5e1cb3";
  const incoming = `https://exams.languagethreshold.com/?module=roofing&target=Spanish&native=English&fromPlan=${id}&lesson=4&way=write&token=secret&redirect=https://evil.example`;
  const destination = examsHostEntry(incoming, "GET");
  const url = new URL(destination, "https://exams.languagethreshold.com");
  assert.equal(url.pathname, "/exams");
  assert.equal(url.searchParams.get("fromPlan"), id);
  assert.equal(url.searchParams.get("lesson"), "4");
  assert.equal(url.searchParams.get("way"), "write");
  assert.equal(url.searchParams.has("token"), false);
  assert.equal(url.searchParams.has("redirect"), false);
  assert.equal(authenticationRedirectUrl(url.href), url.href);
  assert.equal(examsHostEntry(url.href, "GET"), null);
});

test("companion entry preserves explicit learning tabs, APIs and live app behavior", () => {
  for (const url of [
    "https://exams.languagethreshold.com/?tab=core30&lesson=4&way=write",
    "https://exams.languagethreshold.com/exams?attempt=2210372a-8ca8-47d6-a1d8-5ebcfe5e1cb3",
    "https://exams.languagethreshold.com/api/exams",
    "https://app.languagethreshold.com/",
    "https://exams.languagethreshold.com.evil.example/",
  ]) assert.equal(examsHostEntry(url, "GET"), null);
  assert.equal(examsHostEntry("https://exams.languagethreshold.com/", "POST"), null);
  assert.match(examsHostEntry("https://exams.languagethreshold.com/", "HEAD"), /^\/exams/);
});
