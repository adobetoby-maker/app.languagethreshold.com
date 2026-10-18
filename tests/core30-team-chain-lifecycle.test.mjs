import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/lesson-team-"));
  const saved = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  try {
    const source = readFileSync("src/components/guide/AppGuide.tsx", "utf8");
    const wrapper = source
      .slice(
        source.indexOf("function LessonRunner("),
        source.indexOf("function OwnedLessonRunner("),
      )
      .replace("function LessonRunner", "export function LessonRunner");
    const setupStart = source.indexOf(
      "  const { state, dispatch } = useApp();",
      source.indexOf("function OwnedLessonRunner("),
    );
    const setup = source.slice(
      setupStart,
      source.indexOf("  const { dispatch: libDispatch }", setupStart),
    );
    const start = source.indexOf("  useEffect(() => {\n    teamSessions.current = {};");
    const effect = source.slice(start, source.indexOf("  // Later practice steps", start));
    const actionsStart = source.indexOf("  /** Posts lesson `n`");
    const actions = source.slice(
      actionsStart,
      source.indexOf("  /** Each mode shows", actionsStart),
    );
    await build({
      stdin: {
        contents: `import {useEffect,useMemo,useRef,useState} from 'react';import {useAuth} from '@/state/auth-state';import {useApp} from '@/state/app-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';import {c,toast,core30ScopeKey,getCurriculum} from 'fixture';type TeamRequestOwner=any;${wrapper}function OwnedLessonRunner({moduleId,lesson,enrollmentId,onComplete}){${setup}const [marking,setMarking]=useState(false);const completionLock=useRef(false);const isCurrentSequential=(state.lessonProgress[progressKey]??0)+1===lesson.n;${effect}${actions}return {markMastered,recordAlreadyMastered,leaveLesson,marking,progressKey};}export {c};`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      external: ["react/jsx-runtime"],
      outfile: join(dir, "case.mjs"),
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-lesson-chain",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/(auth-state|app-state)|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: ` export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,setup:fn,cleanup:fn()};});}

 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});export const useApp=()=>({state:c.state,dispatch:action=>c.actions.push(action)});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}});}}};
export const toast={error:message=>c.errors.push(message)};export const core30ScopeKey=(module,context)=>JSON.stringify([module,context.targetLanguage,context.instructionLanguage,context.enrollmentId]);export const getCurriculum=()=>({lessons:Array.from({length:4},(_,i)=>({n:i+1}))});export const useMemo=(fn,deps)=>useCallback(fn,deps)();`,
            }));
          },
        },
      ],
    });
    const { LessonRunner, c } = await import(join(dir, "case.mjs"));
    Object.assign(c, {
      credentialReads: 0,
      actions: [],
      errors: [],
      navigations: 0,
      state: {
        selectedLanguage: "English",
        nativeLanguage: "Spanish",
        lessonProgress: {},
        core30Log: {},
      },
    });
    globalThis.fetch = (path, init) =>
      new Promise((resolve, reject) => c.requests.push({ path, init, resolve, reject }));
    const instances = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = (opts = {}) => {
      let n = {
          type: LessonRunner,
          key: "root",
          props: {
            moduleId: "roofing",
            lesson: { n: 1 },
            onComplete: () => c.navigations++,
            ...opts,
          },
        },
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
      for (const e of c.effects.splice(0)) e();
      return n;
    };
    const reply = async (i, payload = { sessions: { org: "synthetic-session" } }, ok = true) => {
      c.requests[i].resolve({ ok, json: async () => payload });
      await tick();
    };
    const body = (i) => JSON.parse(c.requests[i].init.body);
    try {
      await run({ c, render, unmount, reply, body });
    } finally {
      unmount();
    }
  } finally {
    if (saved) Object.defineProperty(globalThis, "fetch", saved);
    else delete globalThis.fetch;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("completion joins in-flight start, serializes duplicate actions and credits only once after current acknowledgement", () =>
  fixture(async ({ c, render, reply, body }) => {
    const view = render();
    await tick();
    assert.equal(body(0).action, "lesson_start");
    const done = view.markMastered();
    view.markMastered();
    view.recordAlreadyMastered();
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(c.actions.length, 0);
    await reply(0);
    assert.equal(body(1).action, "lesson");
    assert.deepEqual(body(1).sessions, { org: "synthetic-session" });
    await reply(1, { recorded: 1 });
    await done;
    assert.deepEqual(
      c.actions.map((x) => x.type),
      ["COMPLETE_LESSON", "ADD_XP", "CORE30_SET_MASTERED"],
    );
    assert.equal(c.navigations, 1);
    await view.markMastered();
    assert.equal(c.actions.length, 3);
  }));
test("unmount during start or completion refuses late local credit, mastery, toast and navigation", () =>
  fixture(async ({ c, render, reply, unmount }) => {
    let view = render();
    await tick();
    let done = view.markMastered();
    unmount();
    await reply(0);
    await done;
    assert.equal(c.requests.length, 1);
    assert.equal(c.actions.length, 0);
    assert.equal(c.errors.length, 0);
    assert.equal(c.navigations, 0);
    view = render();
    await tick();
    await reply(1);
    done = view.markMastered();
    await tick();
    assert.equal(c.requests.length, 3);
    unmount();
    await reply(2, { recorded: 1 });
    await done;
    assert.equal(c.actions.length, 0);
    assert.equal(c.navigations, 0);
  }));
test("account and lesson/pair/enrollment replacement isolate session IDs and old completion callbacks", () =>
  fixture(async ({ c, render, reply, body }) => {
    const old = render();
    await tick();
    await reply(0);
    const done = old.markMastered();
    await tick();
    c.actor = "b";
    let next = render({ lesson: { n: 2 }, enrollmentId: "plan-b" });
    await tick();
    await reply(1, { recorded: 1 });
    await done;
    assert.equal(c.actions.length, 0);
    assert.equal(c.navigations, 0);
    await old.markMastered();
    assert.equal(c.requests.length, 3);
    assert.equal(body(2).lessonNumber, 2);
    assert.equal(next.marking, false);
    c.state = { ...c.state, selectedLanguage: "Japanese" };
    render({ lesson: { n: 2 }, enrollmentId: "plan-b" });
    await tick();
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(3, { sessions: {} });
  }));
test("mastered-lesson advancement stops between every late start and completion boundary", () =>
  fixture(async ({ c, render, reply, unmount, body }) => {
    const view = render();
    c.state.core30Log[view.progressKey] = {
      lessons: { 2: { masteredAt: "synthetic" }, 3: { masteredAt: "synthetic" } },
    };
    await tick();
    await reply(0);
    const done = view.markMastered();
    await tick();
    await reply(1, { recorded: 1 });
    assert.equal(body(2).lessonNumber, 2);
    await reply(2);
    assert.equal(body(3).action, "lesson");
    unmount();
    await reply(3, { recorded: 1 });
    await done;
    assert.deepEqual(
      c.actions.map((x) => x.type),
      ["COMPLETE_LESSON", "ADD_XP"],
    );
    assert.equal(c.navigations, 0);
    assert.equal(c.requests.length, 4);
  }));
test("current start and completion errors retain retry; guests and non-sequential mastery make no team request", () =>
  fixture(async ({ c, render, reply }) => {
    let view = render();
    await tick();
    await reply(0, { error: "synthetic start failure" }, false);
    let done = view.markMastered();
    await tick();
    assert.equal(c.requests.length, 2);
    await reply(1);
    await reply(2, { error: "synthetic post failure" }, false);
    await done;
    assert.equal(c.actions.length, 0);
    done = view.markMastered();
    await tick();
    await reply(3, { recorded: 1 });
    await done;
    assert.equal(c.navigations, 1);
    assert.ok(c.errors.some((x) => x.includes("synthetic post failure")));
    c.actor = null;
    view = render({ lesson: { n: 3 } });
    await view.markMastered();
    assert.equal(c.requests.length, 4);
    assert.equal(c.actions.at(-1).type, "CORE30_SET_MASTERED");
  }));

test("explicit lesson exit invalidates pending completion before unmount and refuses repeated old controls", () =>
  fixture(async ({ c, render, reply }) => {
    const view = render();
    await tick();
    await reply(0);
    const done = view.markMastered();
    await tick();
    view.leaveLesson(() => c.navigations++);
    view.leaveLesson(() => c.navigations++);
    assert.equal(c.requests[1].init.signal.aborted, true);
    await reply(1, { recorded: 1 });
    await done;
    await view.markMastered();
    assert.equal(c.actions.length, 0);
    assert.equal(c.navigations, 1);
    assert.equal(c.requests.length, 2);
  }));
