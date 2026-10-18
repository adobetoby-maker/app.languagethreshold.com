import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && JSON.stringify(n.props.children).includes(label));
const text = (tree) => {
  const values = [];
  const visit = (n) => {
    if (typeof n === "string" || typeof n === "number") values.push(String(n));
    else if (Array.isArray(n)) n.forEach(visit);
    else if (n && typeof n === "object") visit(n.props?.children);
  };
  visit(tree);
  return values.join(" ");
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/quiz-"));
  const saved = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  try {
    const source = readFileSync("src/routes/team.tsx", "utf8");
    const component = source.slice(source.indexOf("function RoofingAssessment("));
    await build({
      stdin: {
        contents: `import {useState,useRef} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';import {c} from 'fixture';const button='button',secondary='secondary',BookOpen='icon',CheckCircle2='icon';${component}export const Route={component:()=> <RoofingAssessment orgId={c.org??'synthetic-org-a'} lessons={0} attempts={[]} certificate={null}/>};export {c};`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      jsx: "automatic",
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-invitation",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@tanstack\/react-router|@\/state\/auth-state|@\/components\/(auth\/AuthModal|ThemeToggle)|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',token:'synthetic-quiz-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.writes++;slots[i]=typeof v==='function'?v(slots[i]):v}]}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i]}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}
 const isCurrentUser=id=>c.actor===id;const canUseReader=id=>c.actor===id&&!c.signingOut;
 export const useAuth=()=>({user:c.actor?{id:c.actor,email:c.actor+'@synthetic.invalid'}:null,loading:!!c.loading,isCurrentUser,canUseReader});
 export const AuthProvider=({children})=>children;export const AuthModal=()=>null;export const ThemeToggle=()=>null;export const Link=({children,...props})=>({type:'a',props:{...props,children}});
 export const createFileRoute=()=>options=>({...options,useSearch:()=>({token:c.token})});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}})}}};
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "case.mjs"));
    globalThis.fetch = (url, init) =>
      new Promise((resolve, reject) => c.requests.push({ url, init, resolve, reject }));
    const instances = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = () => {
      let n = { type: Route.component, key: "root", props: {} },
        depth = 0;
      while (n && typeof n.type === "function") {
        const old = instances[depth];
        if (!old || old.key !== n.key || old.type !== n.type) {
          for (let i = depth; i < instances.length; i++) dispose(i);
          instances.splice(depth);
          instances[depth] = { key: n.key, type: n.type, slots: [] };
        }
        c.slots = instances[depth].slots;
        c.cursor = 0;
        n = n.type(n.props);
        depth++;
      }
      for (let i = depth; i < instances.length; i++) dispose(i);
      instances.splice(depth);
      for (const effect of c.effects.splice(0)) effect();
      return n;
    };
    const reply = async (i, payload = {}, ok = true) => {
      c.requests[i].resolve({ ok, json: async () => payload });
      await tick();
    };
    try {
      await run({ c, render, unmount, reply });
    } finally {
      unmount();
    }
  } finally {
    if (saved) Object.defineProperty(globalThis, "fetch", saved);
    else delete globalThis.fetch;
    rmSync(dir, { recursive: true, force: true });
  }
}
const quiz = (attemptId = "synthetic-attempt-a") => ({
  attemptId,
  questions: [
    {
      id: "synthetic-q",
      area: "synthetic area",
      prompt: "synthetic question",
      options: ["alpha", "beta"],
    },
  ],
});
const result = { correct: 0, total: 1, passed: false, areaScores: {}, certificateId: null };
const radio = (tree) => nodes(tree).find((n) => n.type === "input" && n.props.type === "radio");
async function open(f) {
  f.render();
  button(f.render(), "Start or retake test").props.onClick();
  await tick();
  await f.reply(0, quiz());
  return f.render();
}
test("quiz start and submit share one flight and preserve original attempt/answers", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    render();
    const start = button(render(), "Start or retake test").props.onClick;
    start();
    start();
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].init.cache, "no-store");
    assert.deepEqual(JSON.parse(c.requests[0].init.body), {
      action: "start",
      orgId: "synthetic-org-a",
    });
    await reply(0, quiz());
    start();
    await tick();
    assert.equal(c.requests.length, 1);
    let tree = render();
    radio(tree).props.onChange();
    tree = render();
    const submit = button(tree, "Submit final test").props.onClick;
    submit();
    submit();
    const writes = c.writes;
    radio(tree).props.onChange();
    assert.equal(c.writes, writes);
    await tick();
    assert.deepEqual(JSON.parse(c.requests[1].init.body), {
      action: "submit",
      attemptId: "synthetic-attempt-a",
      answers: { "synthetic-q": "alpha" },
    });
    await reply(1, result);
    tree = render();
    assert.match(text(tree), /Keep practicing/);
    submit();
    await tick();
    assert.equal(c.requests.length, 2);
  }));
test("held quiz credentials cannot use a replacement account and guests have no quiz", () =>
  fixture(async ({ c, render }) => {
    render();
    c.credentials = [];
    button(render(), "Start or retake test").props.onClick();
    c.actor = "b";
    render();
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    c.credentials = null;
    c.sdkActor = "a";
    button(render(), "Start or retake test").props.onClick();
    await tick();
    assert.equal(c.requests.length, 0);
    assert.match(text(render()), /Sign in to use your team workspace/);
    c.actor = null;
    assert.equal(render(), null);
  }));
test("team or account replacement clears quiz state and rejects departed start responses and controls", () =>
  fixture(async ({ c, render, reply }) => {
    render();
    const old = button(render(), "Start or retake test").props.onClick;
    old();
    await tick();
    c.org = "synthetic-org-b";
    render();
    assert.equal(c.requests[0].init.signal.aborted, true);
    const writes = c.writes;
    await reply(0, quiz());
    assert.equal(c.writes, writes);
    assert.equal(radio(render()), undefined);
    old();
    await tick();
    assert.equal(c.requests.length, 1);
    button(render(), "Start or retake test").props.onClick();
    await tick();
    c.actor = "b";
    render();
    await reply(1, { error: "departed start" }, false);
    assert.doesNotMatch(text(render()), /departed start/);
  }));
test("submit result and late parsed start body cannot write after departure", () =>
  fixture(async (f) => {
    const { c, render, reply, unmount } = f;
    let tree = await open(f);
    radio(tree).props.onChange();
    tree = render();
    button(tree, "Submit final test").props.onClick();
    await tick();
    c.org = "synthetic-org-b";
    render();
    const writes = c.writes;
    await reply(1, result);
    assert.equal(c.writes, writes);
    assert.doesNotMatch(text(render()), /Keep practicing/);
    button(render(), "Start or retake test").props.onClick();
    await tick();
    let finish;
    c.requests[2].resolve({ ok: true, json: () => new Promise((r) => (finish = r)) });
    await tick();
    unmount();
    const after = c.writes;
    finish(quiz());
    await tick();
    assert.equal(c.writes, after);
  }));
test("known current failure retries original attempt without starting a replacement and incomplete answers refuse submission", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await open(f);
    button(tree, "Submit final test").props.onClick();
    await tick();
    assert.equal(c.requests.length, 1);
    radio(tree).props.onChange();
    tree = render();
    button(tree, "Submit final test").props.onClick();
    await tick();
    const original = c.requests[1].init.body;
    await reply(1, { error: "synthetic denial" }, false);
    assert.match(text(render()), /synthetic denial/);
    button(render(), "Submit final test").props.onClick();
    await tick();
    assert.equal(c.requests[2].init.body, original);
    await reply(2, result);
    assert.match(text(render()), /Keep practicing/);
  }));
test("pending signout freezes quiz actions/results and releases busy state for cancelled-signout retry", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    render();
    const start = button(render(), "Start or retake test").props.onClick;
    c.signingOut = true;
    start();
    await tick();
    assert.equal(c.requests.length, 0);
    c.signingOut = false;
    let tree = await open(f);
    radio(tree).props.onChange();
    tree = render();
    button(tree, "Submit final test").props.onClick();
    await tick();
    const original = c.requests[1].init.body;
    c.signingOut = true;
    await reply(1, result);
    assert.doesNotMatch(text(render()), /Keep practicing/);
    c.signingOut = false;
    tree = render();
    assert.equal(button(tree, "Submit final test").props.disabled, false);
    button(tree, "Submit final test").props.onClick();
    await tick();
    assert.equal(c.requests[2].init.body, original);
    await reply(2, result);
  }));
test("retake isolates prior answer and submit callbacks even when question IDs repeat", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await open(f);
    const oldAnswer = radio(tree).props.onChange;
    oldAnswer();
    tree = render();
    const oldSubmit = button(tree, "Submit final test").props.onClick;
    oldSubmit();
    await tick();
    await reply(1, result);
    button(render(), "Start or retake test").props.onClick();
    await tick();
    await reply(2, quiz("synthetic-attempt-b"));
    tree = render();
    const writes = c.writes;
    oldAnswer();
    oldSubmit();
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(c.requests.length, 3);
    assert.equal(radio(render()).props.checked, false);
    radio(render()).props.onChange();
    button(render(), "Submit final test").props.onClick();
    await tick();
    assert.equal(JSON.parse(c.requests[3].init.body).attemptId, "synthetic-attempt-b");
    await reply(3, result);
  }));
