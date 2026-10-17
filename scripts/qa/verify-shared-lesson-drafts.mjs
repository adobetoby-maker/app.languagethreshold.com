/** Shared draft API/RLS smoke. --live permits one cold canonical lesson generation, never an exam. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { getModule } from "../../src/data/modules.ts";
import { getCurriculum } from "../../src/data/curriculum.ts";
import { buildLessonWordsRequest } from "../../src/lib/lesson-words-prompt.ts";
import { WORD_LIMITS, cleanLessonWords, hasEnoughWords } from "../../src/lib/lesson-words-core.ts";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`,
  anon = keys.find((k) => k.name === "anon").api_key,
  secret = keys.find((k) => k.name === "service_role").api_key;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options),
  learner = createClient(url, anon, options),
  guest = createClient(url, anon, options);
const rpcNames = [
  "claim_lesson_word_draft",
  "complete_lesson_word_draft",
  "release_lesson_word_draft",
];
const isolatedKey = createHash("sha256")
  .update("disposable-draft-access-fixture:" + randomUUID())
  .digest("hex");
const lease = randomUUID();
const fixtureArgs = { p_environment: "development", p_cache_key: isolatedKey, p_lease: lease };
let logged = false;
try {
  const login = await learner.auth.signInWithPassword({ email: qa.email, password: qa.password });
  assert.equal(login.error, null);
  logged = true;
  for (const client of [guest, learner]) {
    assert.ok(
      (await client.from("lesson_word_drafts").select("cache_key").limit(1)).error,
      "Direct client table read denied",
    );
    for (const name of rpcNames) {
      const args = name.startsWith("complete") ? { ...fixtureArgs, p_words: [] } : fixtureArgs;
      assert.ok((await client.rpc(name, args)).error, "Direct client RPC denied");
    }
  }
  const own = await admin.rpc("claim_lesson_word_draft", fixtureArgs);
  assert.equal(own.error, null);
  assert.equal(own.data.status, "claimed");
  const competing = await admin.rpc("claim_lesson_word_draft", {
    ...fixtureArgs,
    p_lease: randomUUID(),
  });
  assert.equal(competing.error, null);
  assert.equal(competing.data.status, "pending");
  const removed = await admin
    .from("lesson_word_drafts")
    .delete()
    .eq("environment", "development")
    .eq("cache_key", isolatedKey);
  assert.equal(removed.error, null);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    preview: base,
    checks: {
      guestAndLearnerTableReadsDenied: true,
      allThreeDraftRpcsDeniedToGuestAndLearner: true,
      serverRoleClaimWorks: true,
      competingClaimPending: true,
      disposableClaimRemoved: true,
    },
    liveGeneration: { attempted: false },
    limits: [
      "No learner progress, exam, score, approval or certificate writes",
      "Generated vocabulary remains an unreviewed public draft; this does not validate terminology",
    ],
  };
  if (process.argv.includes("--live") || process.argv.includes("--resume-live")) {
    const resume = process.argv.includes("--resume-live");
    const data = {
      moduleId: "orthopedics",
      lessonNumber: 1,
      language: "Spanish",
      nativeLanguage: "English",
    };
    const request = buildLessonWordsRequest({
      module: getModule(data.moduleId),
      lesson: getCurriculum(data.moduleId).lessons.find((l) => l.n === data.lessonNumber),
      targetLanguage: data.language,
      nativeLanguage: data.nativeLanguage,
    });
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          "lesson-words-draft-v1",
          data.moduleId,
          data.lessonNumber,
          WORD_LIMITS,
          request,
        ]),
      )
      .digest("hex");
    const existing = await admin
      .from("lesson_word_drafts")
      .select("words")
      .eq("environment", "preview")
      .eq("cache_key", key)
      .maybeSingle();
    assert.equal(existing.error, null);
    if (resume) assert.ok(existing.data, "Resume must reuse an already stored draft");
    else
      assert.equal(
        existing.data,
        null,
        "--live requires a cold canonical key; never delete a shared draft to force a charge",
      );
    const built = readdirSync("dist/server/assets")
      .filter((n) => /^lesson-words.*\.js$/.test(n))
      .map((n) => readFileSync("dist/server/assets/" + n, "utf8"))
      .join("\n");
    const id = built.match(/id: "([a-f0-9]{64})",\s*name: "generateLessonWords"/)?.[1];
    assert.ok(id);
    const body = JSON.stringify(await toJSONAsync({ data }));
    async function call(origin = base) {
      const response = await fetch(base + "/_serverFn/" + id, {
        method: "POST",
        headers: {
          Origin: origin,
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
          "x-tsr-serverFn": "true",
          Accept: "application/json",
        },
        body,
      });
      const raw = await response.text();
      return { response, decoded: fromCrossJSON(JSON.parse(raw), { refs: new Map() }) };
    }
    const firstTwo = await Promise.all([call(), call()]);
    const results = firstTwo.map((x) => x.decoded.result);
    const generated = results.filter((r) => r?.words && r.cached === false);
    assert.equal(generated.length, resume ? 0 : 1, "Only a cold owner may generate");
    const words = resume ? existing.data.words : generated[0].words;
    assert.ok(hasEnoughWords(cleanLessonWords(words)));
    if (resume)
      for (const result of results) {
        assert.equal(result.cached, true);
        assert.deepEqual(result.words, words);
      }
    for (const [i, item] of firstTwo.entries()) {
      assert.equal(item.response.headers.get("cache-control"), "no-store");
      assert.ok([200, 202].includes(item.response.status));
      if (item.response.status === 202) {
        assert.equal(item.response.headers.get("retry-after"), "3");
        assert.match(results[i].error, /being prepared/);
      }
    }
    const repeat = await call();
    assert.equal(repeat.response.status, 200);
    assert.equal(repeat.decoded.result.cached, true);
    assert.deepEqual(repeat.decoded.result.words, words);
    const receipt = JSON.parse(repeat.response.headers.get("x-lt-ai-usage"));
    assert.equal(receipt.providerCalls, 0);
    const denied = await call("https://outside.invalid");
    assert.equal(denied.response.status, 403);
    assert.equal(denied.response.headers.get("cache-control"), "no-store");
    const stored = await admin
      .from("lesson_word_drafts")
      .select("words,lease_id,ready_until")
      .eq("environment", "preview")
      .eq("cache_key", key)
      .single();
    assert.equal(stored.error, null);
    assert.deepEqual(stored.data.words, words);
    assert.equal(stored.data.lease_id, null);
    assert.ok(Date.parse(stored.data.ready_until) > Date.now());
    report.liveGeneration = {
      attempted: true,
      moduleId: data.moduleId,
      lessonNumber: data.lessonNumber,
      pair: "English → Spanish",
      simultaneousResponses: firstTwo.map((x) => x.response.status),
      generatedListsThisVerification: generated.length,
      resumedExistingDraftAfterTestDecoderFailure: resume,
      coldConcurrentHttpAcceptance: !resume,
      wordCount: words.length,
      durableCopyVerified: true,
      repeatSharedHit: true,
      repeatProviderCalls: 0,
      warmCacheWrongOriginDenied: true,
      rawWordsPrinted: false,
    };
  }
  writeFileSync(
    "docs/reviews/qa-shared-lesson-drafts-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await admin
    .from("lesson_word_drafts")
    .delete()
    .eq("environment", "development")
    .eq("cache_key", isolatedKey);
  if (logged) await learner.auth.signOut({ scope: "local" });
}
