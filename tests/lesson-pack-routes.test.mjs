import assert from "node:assert/strict";
import test from "node:test";
import { verifyLessonPackRoutes } from "../scripts/verify-lesson-pack-routes.mjs";
const manifest = {packId:"construction-foreman-es-en",content:{url:`/lesson-packs/construction-foreman-es-en-${"a".repeat(64)}.json`}};
const routes = modules => [
  {src:`/lesson-packs/((?:${modules})-es-en\\.json)`,dest:"/lesson-packs/$1",headers:{"cache-control":"no-store"}},
  {src:`/lesson-packs/((?:${modules})-es-en-[a-f0-9]{64}\\.json)`,dest:"/lesson-packs/$1",headers:{"cache-control":"public, max-age=31536000, immutable"}},
  {src:"/(.*)",dest:"/"},
];
test("artifact verification rejects the observed built-but-unrouted Foreman pack", () => {
  assert.throws(()=>verifyLessonPackRoutes(routes("roofing|landscaper"),[manifest]),/exact static route/);
  assert.doesNotThrow(()=>verifyLessonPackRoutes(routes("roofing|landscaper|construction-foreman"),[manifest]));
});
test("artifact verification enforces first-match destinations and both cache policies", () => {
  const valid=routes("construction-foreman");
  assert.throws(()=>verifyLessonPackRoutes([{src:"/(.*)",dest:"/"},...valid],[manifest]),/exact static route/);
  assert.throws(()=>verifyLessonPackRoutes(valid.map((r,i)=>i===0?{...r,headers:{"cache-control":"public"}}:r),[manifest]),/exact static route/);
  assert.throws(()=>verifyLessonPackRoutes(valid.map((r,i)=>i===1?{...r,dest:"/"}:r),[manifest]),/exact static route/);
  assert.throws(()=>verifyLessonPackRoutes(valid,[]),/No public lesson/);
});
