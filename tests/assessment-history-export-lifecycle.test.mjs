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
    ["Audio", "URL", "window", "document", "setTimeout", "clearTimeout"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {AssessmentAuditHistory} from './src/components/exams/AssessmentAuditHistory';export {c} from 'fixture';`,
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
            b.onResolve({ filter: /^@\/hooks\/use-private-paged-report$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/(assessments\/client|voices|tts))$/,
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
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examAudioRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export class ExamRequestError extends Error {constructor(message,status){super(message);this.status=status;}} c.RequestError=ExamRequestError;
 export const examRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const examHistoryExport=(enrollment,signal)=>new Promise((resolve,reject)=>c.requests.push({enrollment,signal,resolve,reject}));
 export const usePrivatePagedReport=()=>({loading:false,error:'',items:[],hasMore:false,moreBusy:false,refresh:()=>{},loadMore:()=>{}});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { AssessmentAuditHistory, c } = await import(out),
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
    const downloads = [],
      timers = new Map(),
      opened = [];
    let urlId = 0,
      timerId = 0;
    globalThis.URL.createObjectURL = () => `blob:history-${urlId++}`;
    globalThis.setTimeout = (fn) => {
      const id = ++timerId;
      timers.set(id, fn);
      return id;
    };
    globalThis.clearTimeout = (id) => timers.delete(id);
    globalThis.document = {
      createElement: () => ({
        click() {
          if (c.failClick) throw new Error("synthetic download failure");
          downloads.push({ url: this.href, name: this.download });
        },
      }),
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    let key;
    const render = (enrollmentId = "plan-a") => {
      c.cursor = 0;
      const outer = AssessmentAuditHistory({
        enrollmentId,
        onOpenAttempt: (id) => opened.push(id),
      });
      let tree = outer;
      if (typeof outer.type === "function") {
        if (key !== outer.key) {
          unmount();
          c.slots = [];
          key = outer.key;
        }
        c.cursor = 0;
        tree = outer.type(outer.props);
      }
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const open = (enrollment = "plan-a") => {
      const tree = render(enrollment);
      tree.props.onToggle({ currentTarget: { open: true } });
      return render(enrollment);
    };
    const button = (tree, label) =>
      nodes(tree).find((n) => n.type === "button" && n.props.children === label);
    const payload = () => ({ blob: new Blob(["synthetic CSV fixture"]), eventCount: 3 });
    const text = (tree) => {
      const strings = [];
      const walk = (n) => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === "object") walk(n.props?.children);
        else if (typeof n === "string") strings.push(n);
      };
      walk(tree);
      return strings.join(" ");
    };
    try {
      await action({
        c,
        render,
        open,
        unmount,
        button,
        payload,
        downloads,
        timers,
        revoked,
        opened,
        text,
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
test("history export state resets when enrollment changes while export is pending", async () => {
  await fixture(async ({ c, open, button, payload, downloads, text }) => {
    let tree = open();
    const start = button(tree, "Export all plan and assignment activity");
    start.props.onClick();
    start.props.onClick();
    assert.equal(c.requests.length, 1);
    tree = open("plan-b");
    assert.equal(c.requests[0].signal.aborted, true);
    assert.equal(
      button(tree, "Export all plan and assignment activity")?.props.disabled ?? true,
      false,
    );
    assert.doesNotMatch(text(tree), /Preparing complete history/);
    c.requests[0].resolve(payload());
    await tick();
    assert.equal(downloads.length, 0);
    button(tree, "Export all plan and assignment activity").props.onClick();
    assert.equal(c.requests[1].enrollment, "plan-b");
  });
});
test("history export cancel and retry ignore old completion/finalizer and keep current request busy", async () => {
  await fixture(async ({ c, open, button, payload, downloads, text }) => {
    let tree = open();
    button(tree, "Export all plan and assignment activity").props.onClick();
    tree = open();
    button(tree, "Cancel export").props.onClick();
    assert.equal(c.requests[0].signal.aborted, true);
    tree = open();
    assert.match(text(tree), /Export canceled/);
    button(tree, "Export all plan and assignment activity").props.onClick();
    c.requests[0].resolve(payload());
    await tick();
    assert.equal(downloads.length, 0);
    assert.ok(button(open(), "Cancel export"));
    c.requests[1].resolve(payload());
    await tick();
    assert.equal(downloads.length, 1);
    assert.match(text(open()), /Prepared 3 recorded events/);
  });
});
test("history export URL and timer belong to mounted actor; late replies and old callbacks cannot download", async () => {
  await fixture(
    async ({ c, open, render, button, payload, downloads, timers, revoked, unmount }) => {
      let tree = open();
      const oldButton = button(tree, "Export all plan and assignment activity");
      oldButton.props.onClick();
      c.actor = "b";
      open();
      c.requests[0].resolve(payload());
      await tick();
      assert.equal(downloads.length, 0);
      oldButton.props.onClick();
      assert.equal(c.requests.length, 1);
      tree = open();
      button(tree, "Export all plan and assignment activity").props.onClick();
      c.requests[1].resolve(payload());
      await tick();
      assert.equal(downloads.length, 1);
      assert.equal(timers.size, 1);
      const expiry = [...timers.values()][0];
      unmount();
      assert.equal(timers.size, 0);
      assert.deepEqual(revoked, [downloads[0].url]);
      expiry();
      assert.equal(revoked.length, 1);
    },
  );
});
test("history export errors are retryable and failing native download releases its private URL", async () => {
  await fixture(async ({ c, open, button, payload, downloads, revoked, text, unmount }) => {
    let tree = open();
    button(tree, "Export all plan and assignment activity").props.onClick();
    c.requests[0].reject(new Error("synthetic connection failure"));
    await tick();
    tree = open();
    assert.match(text(tree), /synthetic connection failure/);
    assert.equal(
      button(tree, "Export all plan and assignment activity")?.props.disabled ?? true,
      false,
    );
    c.failClick = true;
    button(tree, "Export all plan and assignment activity").props.onClick();
    c.requests[1].resolve(payload());
    await tick();
    assert.equal(downloads.length, 0);
    assert.equal(revoked.length, 1);
    assert.match(text(open()), /synthetic download failure/);
    c.failClick = false;
    button(open(), "Export all plan and assignment activity").props.onClick();
    unmount();
    const writes = c.writes;
    c.requests[2].reject(new Error("late"));
    await tick();
    assert.equal(c.writes, writes);
  });
});
