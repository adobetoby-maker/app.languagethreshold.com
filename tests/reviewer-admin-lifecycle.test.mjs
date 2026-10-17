import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((v) => nodes(v, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
async function fixture(action) {
  const dir = mkdtempSync(resolve("node_modules/.cache/exam-listening-"));
  const old = Object.fromEntries(
    ["Audio", "URL", "window"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {Route} from './src/routes/exam-reviewers';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "listening-fixture",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture$|react$|@tanstack\/react-router|@\/state\/auth-state|@\/lib\/assessments\/client|@\/data\/(modules|languages)|@\/components\/)/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],actions:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;const actors=new Map();export const useAuth=()=>{if(c.actor&&!actors.has(c.actor))actors.set(c.actor,{id:c.actor});return {user:c.actor?actors.get(c.actor):null,isCurrentUser};};
 export const examAudioRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export const createFileRoute=()=>config=>config,AuthProvider=()=>null,AuthButton=()=>null,ThemeToggle=()=>null,AssessmentCleanupStatus=()=>null;
 export const MODULES=[{id:'roofing',name:'Roofing'},{id:'plumber',name:'Plumber'}],LANGUAGES=['Spanish','French'],NATIVE_LANGUAGES=['English','Spanish'];
 export class ExamRequestError extends Error {constructor(message,status){super(message);this.status=status;}} c.RequestError=ExamRequestError;
 export const examReviewerRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const examContentRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const examRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(out),
      audios = [],
      revoked = [];
    let cancels = 0;
    globalThis.window = { speechSynthesis: { cancel: () => cancels++ } };
    globalThis.URL = {
      createObjectURL: () => `blob:qa-${audios.length}`,
      revokeObjectURL: (url) => revoked.push(url),
    };
    globalThis.Audio = class {
      constructor(src) {
        this.src = src;
        this.paused = false;
        audios.push(this);
      }
      pause() {
        this.paused = true;
      }
      removeAttribute() {
        this.src = "";
      }
      load() {
        this.loaded = true;
      }
      play() {
        return new Promise((resolve, reject) => {
          this.resolvePlay = resolve;
          this.rejectPlay = reject;
        });
      }
    };
    const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      target = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    c.actor = owner;
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    let key;
    const render = () => {
      const page = Route.component().props.children,
        outer = page.type(page.props);
      if (key !== outer.key) {
        unmount();
        c.slots = [];
        key = outer.key;
      }
      c.cursor = 0;
      const tree = outer.type(outer.props);
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const registry = (revision = 0) => ({
      grants: revision
        ? [
            {
              user_id: target,
              module_id: "roofing",
              target_language: "Spanish",
              instruction_language: "English",
              kind: "curriculum",
              active: true,
              revision,
            },
          ]
        : [],
      events: [],
      limited: false,
      eventLimit: 50,
    });
    const load = async (revision = 0) => {
      render();
      c.requests.at(-1).resolve(registry(revision));
      await tick();
      return render();
    };
    const account = (t) => nodes(t).find((n) => n.type === "input" && n.props.pattern);
    const checkbox = (t) => nodes(t).find((n) => n.type === "input" && n.props.type === "checkbox");
    const select = (t) => nodes(t).filter((n) => n.type === "select");
    const button = (t, label) =>
      nodes(t).find((n) => n.type === "button" && n.props.children === label);
    const fill = (tree) => {
      account(tree).props.onChange({ target: { value: target } });
      tree = render();
      nodes(tree)
        .find((n) => n.type === "textarea")
        .props.onChange({ target: { value: "synthetic fixture qualification reason" } });
      tree = render();
      checkbox(tree).props.onChange({ target: { checked: true } });
      return render();
    };
    const submit = (tree) =>
      nodes(tree)
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
    try {
      await action({
        c,
        render,
        load,
        registry,
        account,
        checkbox,
        select,
        button,
        fill,
        submit,
        owner,
        target,
        unmount,
      });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("reviewer editor confirmation follows selected scope and registry rows cannot carry across modules", async () => {
  await fixture(async ({ c, render, load, fill, checkbox, select, submit }) => {
    let tree = await load(3);
    tree = fill(tree);
    assert.equal(checkbox(tree).props.checked, true);
    select(tree)[2].props.onChange({ target: { value: "French" } });
    tree = render();
    assert.equal(checkbox(tree).props.checked, false);
    submit(tree);
    assert.equal(c.actions.length, 0);
    checkbox(tree).props.onChange({ target: { checked: true } });
    tree = render();
    nodes(tree)
      .find((n) => n.type === "textarea")
      .props.onChange({ target: { value: "changed synthetic reason" } });
    tree = render();
    assert.equal(checkbox(tree).props.checked, false);
    select(tree)[0].props.onChange({ target: { value: "plumber" } });
    tree = render();
    assert.equal(
      nodes(tree).some((n) => n.type === "form"),
      false,
    );
    assert.ok(c.requests.at(-1).url.includes("plumber"));
    c.requests.at(-1).resolve({ grants: [], events: [], limited: false, eventLimit: 50 });
    await tick();
    tree = render();
    assert.equal(checkbox(tree).props.checked, false);
  });
});
test("reviewer editor duplicate grant/revoke commands and identical retries use one owned request", async () => {
  await fixture(async ({ c, render, load, fill, submit, button }) => {
    let tree = fill(await load(3));
    submit(tree);
    submit(tree);
    assert.equal(c.actions.length, 1);
    assert.equal(c.actions[0].body.expectedRevision, 3);
    c.actions[0].reject(new Error("synthetic retry"));
    await tick();
    tree = render();
    assert.equal(
      nodes(tree).some((n) => n.props?.role === "alert"),
      true,
    );
    submit(tree);
    assert.equal(c.actions[1].body.requestId, c.actions[0].body.requestId);
    c.actions[1].resolve({});
    await tick();
    tree = render();
    assert.ok(c.requests.length > 1);
    c.requests.at(-1).resolve({
      grants: [
        {
          user_id: c.actions[1].body.userId,
          target_language: "Spanish",
          instruction_language: "English",
          kind: "curriculum",
          active: true,
          revision: 4,
        },
      ],
      events: [],
      limited: false,
      eventLimit: 50,
    });
    await tick();
    tree = fill(render());
    button(tree, "Revoke reviewer access").props.onClick();
    button(tree, "Revoke reviewer access").props.onClick();
    assert.equal(c.actions.length, 3);
    assert.equal(c.actions[2].body.active, false);
    assert.equal(c.actions[2].body.expectedRevision, 4);
  });
});
test("reviewer editor ignores late actor/unmount mutation and registry replies", async () => {
  await fixture(async ({ c, render, load, fill, submit, unmount }) => {
    let tree = fill(await load());
    submit(tree);
    c.actor = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    render();
    assert.equal(c.actions[0].signal.aborted, true);
    const writes = c.writes;
    c.actions[0].resolve({});
    await tick();
    assert.equal(c.writes, writes);
    const pending = c.requests.at(-1);
    unmount();
    const after = c.writes;
    pending.resolve({ grants: [], events: [], limited: false, eventLimit: 50 });
    await tick();
    assert.equal(c.writes, after);
  });
});
test("reviewer editor requires explicit confirmation, valid identity/reason and current existing scope for revoke", async () => {
  await fixture(async ({ c, render, load, fill, submit, account, checkbox, button, owner }) => {
    let tree = await load();
    submit(tree);
    assert.equal(c.actions.length, 0);
    tree = fill(tree);
    button(tree, "Revoke reviewer access").props.onClick();
    assert.equal(c.actions.length, 0);
    account(tree).props.onChange({ target: { value: owner } });
    tree = render();
    checkbox(tree).props.onChange({ target: { checked: true } });
    tree = render();
    submit(tree);
    assert.equal(c.actions.length, 0);
    account(tree).props.onChange({ target: { value: "------------------------------------" } });
    tree = render();
    checkbox(tree).props.onChange({ target: { checked: true } });
    tree = render();
    submit(tree);
    assert.equal(c.actions.length, 0);
  });
});
test("registry request replacement rejects old module rows and current access denial clears the editor", async () =>
  fixture(async ({ c, render, registry, select, fill, submit, button, checkbox }) => {
    let tree = render();
    select(tree)[0].props.onChange({ target: { value: "plumber" } });
    render();
    assert.equal(c.requests[0].signal.aborted, true);
    const writes = c.writes;
    c.requests[0].resolve(registry(9));
    await tick();
    assert.equal(c.writes, writes);
    c.requests[1].resolve(registry());
    await tick();
    tree = fill(render());
    submit(tree);
    c.actions[0].reject(new c.RequestError("synthetic denial", 403));
    await tick();
    tree = render();
    assert.equal(
      nodes(tree).some((n) => n.type === "form"),
      false,
    );
    button(tree, "Refresh reviewer access").props.onClick();
    render();
    c.requests.at(-1).resolve(registry(4));
    await tick();
    tree = render();
    assert.equal(checkbox(tree).props.checked, false);
  }));
