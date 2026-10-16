import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Execute the production server handlers, replacing only the network SDK and
// TanStack registration. No model call, credential or private content is used.
async function loadHandler(name, exportName) {
  const root = resolve("node_modules/.cache/lle-tests");
  mkdirSync(root, { recursive: true });
  const outfile = resolve(root, `cache-handler-${name}.mjs`);
  await build({
    stdin: {
      contents: `export { ${exportName} as handler } from ${JSON.stringify(resolve(`src/fns/${name}.functions.ts`))}; export { default as Network } from '@anthropic-ai/sdk';`,
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    external: ["zod"],
    logLevel: "silent",
    plugins: [
      {
        name: "network-fixture",
        setup(b) {
          b.onResolve({ filter: /^@anthropic-ai\/sdk$/ }, () => ({
            path: "network",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^@tanstack\/react-start$/ }, () => ({
            path: "registration",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
            contents:
              path === "network"
                ? `export default class Network { static calls = 0; static next; static review; static requests = []; messages = { create: async (request) => { Network.calls++; Network.requests.push(request); const name = request.tool_choice.name; return { content: [{type:'tool_use', name, input: structuredClone(name === 'review_conjugation_question' ? Network.review : Network.next)}] }; } }; }`
                : `export const createServerFn = () => ({ inputValidator: (validate) => ({ handler: (fn) => ({data}) => fn({data: validate(data)}) }) });`,
          }));
        },
      },
    ],
  });
  return import(outfile);
}
const question = {
  phrase: "Yo ___ cada día.",
  phraseTranslation: "I [verb] every day.",
  infinitive: "hablar",
  infinitiveTranslation: "to speak",
  correctConjugation: "hablo",
  wrongOptions: ["hablas", "hablamos", "hablan"],
  explanation: "Yo takes hablo in the present tense.",
  axisTested: "person",
  cefr: "A2",
};
const board = {
  pairs: Array.from({ length: 6 }, (_, i) => ({
    target: `QA-target-${i}`,
    english: `QA-English-${i}`,
  })),
  cefr: "A2",
  topic: "QA synthetic public fixture",
};
for (const [name, exportName, fixture] of [
  ["conjugation", "generateConjugationQuestion", question],
  ["word-match", "generateWordMatchBoard", board],
]) {
  test(`${name} handler isolates topics and never reads or stores personalized results`, async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-only-no-network";
    try {
      const { handler, Network } = await loadHandler(name, exportName);
      Network.next = fixture;
      Network.review = {
        acceptableAnswers: ["hablo"],
        unambiguous: true,
        explanationAccurate: true,
        axisAccurate: true,
        levelAppropriate: true,
      };
      const callsPerItem = name === "conjugation" ? 2 : 1;
      const publicInput = { language: "Spanish", level: 1, topic: "Roofing", axis: "person" };
      assert.equal((await handler({ data: publicInput })).cached, false);
      assert.equal((await handler({ data: publicInput })).cached, true);
      assert.equal(Network.calls, callsPerItem);
      const personal = { ...publicInput, userWords: ["QA-private-A"] };
      assert.equal((await handler({ data: personal })).cached, false);
      assert.equal((await handler({ data: personal })).cached, false);
      assert.equal(
        (await handler({ data: { ...personal, userWords: ["QA-private-B"] } })).cached,
        false,
      );
      assert.equal(Network.calls, 4 * callsPerItem);
      assert.equal(
        (await handler({ data: { ...publicInput, topic: "Landscaping" } })).cached,
        false,
      );
      // A private request for a previously uncached topic must not seed its public cache.
      assert.equal((await handler({ data: { ...personal, topic: "Plumbing" } })).cached, false);
      assert.equal((await handler({ data: { ...publicInput, topic: "Plumbing" } })).cached, false);
      assert.equal((await handler({ data: publicInput })).cached, true);
      assert.equal(Network.calls, 7 * callsPerItem);
      if (name === "conjugation") {
        Network.next = { ...fixture, wrongOptions: ["hablo", "hablas", "hablan"] };
        const invalid = await handler({ data: { ...publicInput, topic: "Invalid fixture" } });
        assert.equal(invalid.data, null);
        assert.match(invalid.error, /could not be validated/);
        Network.next = fixture;
        assert.equal(
          (await handler({ data: { ...publicInput, topic: "Invalid fixture" } })).cached,
          false,
        );
        assert.equal(Network.calls, 17);
        const acceptedReview = Network.review;
        for (const patch of [
          { acceptableAnswers: [] },
          { acceptableAnswers: ["hablas"] },
          { acceptableAnswers: ["hablo", "hablas"] },
          { explanationAccurate: false },
          { unambiguous: false },
          { axisAccurate: false },
          { levelAppropriate: false },
        ]) {
          Network.review = { ...acceptedReview, ...patch };
          const rejected = await handler({
            data: { ...publicInput, topic: "Semantic review fixture" },
          });
          assert.equal(rejected.data, null);
          assert.match(rejected.error, /AI consistency check/);
        }
        Network.review = acceptedReview;
        const accepted = await handler({
          data: { ...publicInput, topic: "Semantic review fixture" },
        });
        assert.equal(accepted.cached, false);
        assert.equal(
          (await handler({ data: { ...publicInput, topic: "Semantic review fixture" } })).cached,
          true,
        );
        const reviewRequest = Network.requests.find(
          (r) => r.tool_choice.name === "review_conjugation_question",
        );
        const reviewItem = JSON.parse(reviewRequest.messages[0].content);
        assert.equal("correctConjugation" in reviewItem, false);
        assert.deepEqual(reviewItem.options, ["hablamos", "hablan", "hablas", "hablo"]);
      }
    } finally {
      if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = saved;
    }
  });
}
