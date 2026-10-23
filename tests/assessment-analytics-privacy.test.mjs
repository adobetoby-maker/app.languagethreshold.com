import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateAssessmentUrl, anonymousPageUrl } from "../src/lib/assessment-privacy.ts";
test("private assessment, account and team pages and links are excluded from page-view telemetry", () => {
  for (const value of [
    "/exams",
    "/exams?attempt=private",
    "/exam-content?form=private",
    "/exam-reviewers",
    "/team/accept?token=private",
    "/owner",
    "/account",
    "/certificate?id=fixture",
    "/family-setup",
    "/subscribe/success",
    "/?module=roofing&plan=private",
    "/?org=private",
    "/?fromPlan=private",
    "/?attempt=private",
    "/#access_token=private",
    // The router is case-insensitive and decodes percent-escapes.
    "/Team",
    "/TEAM?org=x",
    "/Owner",
    "/OWNER",
    "/Subscribe/success",
    "/SUBSCRIBE/Success?session_id=cs_test_x",
    "/te%61m",
    "/%54eam/accept",
    "/te%2561m",
    "/%65xams",
    "/Exams",
    "/Exam-Content",
    "/Account/Password",
    "/Certificate?id=fixture",
    "/Family-Setup",
    "/?TAB=Exams",
    "/?Org=private",
    "/?ATTEMPT=private",
    "/#Access_Token=private",
    "/te%zz",
  ])
    assert.equal(isPrivateAssessmentUrl(value), true, value);
  for (const value of [
    "/",
    "/pricing",
    "/Pricing",
    "/?module=roofing&target=Spanish",
    "/exams-faq",
    "/teams-info",
    "/%70ricing",
  ])
    assert.equal(isPrivateAssessmentUrl(value), false, value);
  assert.equal(
    anonymousPageUrl(
      "https://app.languagethreshold.com/?module=roofing&plan=private#token=private",
    ),
    "https://app.languagethreshold.com/",
  );
});
