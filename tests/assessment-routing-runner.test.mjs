import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
mkdirSync(resolve("node_modules/.cache/lle-tests"), { recursive: true });
const root = mkdtempSync(resolve("node_modules/.cache/lle-tests/routing-runner-"));
let module;
try {
  const outfile = join(root, "runner.mjs");
  await build({
    stdin: {
      contents: `export {ExamRunner} from './src/components/exams/ExamsArea.tsx';export {controls} from 'test-controls';`,
      resolveDir: process.cwd(),
    },
    banner: {
      js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);",
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    external: ["react", "react-dom", "react/jsx-runtime", "zod"],
    plugins: [
      {
        name: "runner-boundaries",
        setup(b) {
          b.onLoad({ filter: /ExamsArea\.tsx$/ }, (args) => ({
            contents: readFileSync(args.path, "utf8") + "\nexport {ExamRunner};",
            loader: "tsx",
            resolveDir: resolve("src/components/exams"),
          }));
          b.onResolve(
            {
              filter:
                /^(test-controls|@\/hooks\/use-exam-draft|@\/state\/auth-state|@\/integrations\/supabase\/client)$/,
            },
            (args) => ({ path: args.path, namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
            if (args.path === "test-controls")
              return { contents: "export const controls={draft:null};" };
            if (args.path === "@/hooks/use-exam-draft")
              return {
                contents: `import {controls} from 'test-controls';export const useExamDraft=()=>controls.draft;`,
              };
            if (args.path === "@/state/auth-state")
              return { contents: 'export const useAuth=()=>({user:{id:"local-owner"}});' };
            return { contents: "export const supabase={};" };
          });
        },
      },
    ],
  });
  module = await import(outfile);
} finally {
  rmSync(root, { recursive: true, force: true });
}

function render(state, routePending = false) {
  const items = [
    {
      id: "core-typed",
      skill: "writing",
      type: "production",
      prompt: "Synthetic core writing",
      inputMethods: ["typed"],
    },
  ];
  if (state === "selected")
    items.push({ ...items[0], id: "server-branch", prompt: "Synthetic server follow-up" });
  const attempt = {
    id: "local-attempt",
    form: { items },
    studiedObjectiveCount: 0,
    checkpoint: { checkpoint: "entrance" },
    enrollment: { moduleId: "roofing", targetLanguage: "Spanish", programScope: "full_module" },
    ...(state ? { routing: { state, coreItemCount: 1 } } : {}),
  };
  module.controls.draft = {
    index: items.length - 1,
    answers: {},
    status: "synced",
    routePending,
    pendingCount: 0,
    setIndex() {},
    edit() {},
    sync() {},
    serverAnswers: {},
    speechEvidence: [],
  };
  return renderToStaticMarkup(
    createElement(module.ExamRunner, {
      attempt,
      fromDevice: false,
      checkingServer: false,
      onCheckServer() {},
      onBack() {},
      onSubmitted() {},
      onContinued() {},
    }),
  );
}

test("actual runner keeps typed core input, offers explicit continuation and excludes submission controls", () => {
  const html = render("core");
  assert.match(html, /<textarea/);
  assert.match(html, /Continue to follow-up questions/);
  assert.match(html, /explicitly mark its input not assessed/);
  assert.ok(!html.includes("Review submission"));
  assert.ok(!html.includes("Sync and submit exam"));
});

test("uncertain continuation locks core input and exposes retry; selected and flat forms retain review controls", () => {
  const pending = render("core", true);
  assert.match(pending, /<fieldset disabled=""/);
  assert.match(pending, /Connect and retry continuation/);
  const selected = render("selected");
  assert.match(selected, /Synthetic server follow-up/);
  assert.match(selected, /Review submission/);
  assert.ok(!selected.includes("Continue to follow-up questions"));
  const flat = render(undefined);
  assert.match(flat, /<textarea/);
  assert.match(flat, /Review submission/);
  assert.ok(!flat.includes("Core questions."));
});
