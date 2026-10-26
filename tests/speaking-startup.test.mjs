import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const nodes = (n, out = []) => {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-startup-")),
    old = globalThis.window;
  try {
    await build({
      stdin: {
        contents: `export {SpeakingPrivacyPrompt} from './src/components/speak/SpeakingPrivacyPrompt';export {c,SpeakingConsentSaveError} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "fixture.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "fixture",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/speaking-client|\.\/SpeakingConsentDialog)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              loader: "js",
              contents: `
 export const c={actor:'a',slots:[],cursor:0,effects:[],reads:[],saves:[],writes:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=v=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:v};return c.slots[i];};
 export const useState=v=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof v==='function'?v():v;return[c.slots[i],n=>{c.writes++;c.slots[i]=typeof n==='function'?n(c.slots[i]):n;}];};
 export const useMemo=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={value:fn(),deps};return c.slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>id===c.actor;
 export const useAuth=()=>({user:c.actor?{id:c.actor}:null,loading:false,isCurrentUser});
 export const getSpeakingAgeAttestation=(signal,owner)=>new Promise((resolve,reject)=>c.reads.push({signal,owner,resolve,reject}));
 export const saveSpeakingAgeAttestation=(value,signal,current,owner)=>new Promise((resolve,reject)=>c.saves.push({value,signal,current,owner,resolve,reject}));
 export class SpeakingConsentSaveError extends Error{constructor(outcome){super(outcome);this.outcome=outcome;}}
 export const SpeakingConsentDialog='consent';
 `,
            }));
          },
        },
      ],
    });
    const m = await import(join(dir, "fixture.mjs"));
    const c = m.c;
    const win = new EventTarget(),
      events = [];
    win.addEventListener("lt:speaking-consent-changed", () => events.push("changed"));
    globalThis.window = win;
    const render = (props = {}) => {
      c.cursor = 0;
      const tree = m.SpeakingPrivacyPrompt({ startup: true, ready: true, ...props });
      while (c.effects.length) c.effects.shift()();
      return tree;
    };
    const dialog = (tree) => nodes(tree).find((n) => n.type === "consent").props;
    await run({ m, c, render, dialog, events });
    for (const slot of c.slots) slot?.cleanup?.();
  } finally {
    if (old === undefined) delete globalThis.window;
    else globalThis.window = old;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("startup consent is one explicit write; skipping a pending save permits learning and ignores its late result", () =>
  fixture(async ({ c, render, dialog, events }) => {
    render();
    assert.equal(c.reads.length, 1);
    c.reads[0].resolve(false);
    await tick();
    const d = dialog(render());
    assert.equal(d.open, true);
    assert.equal(d.allowSkipWhileSaving, true);
    d.onConfirm();
    d.onConfirm();
    assert.equal(c.saves.length, 1);
    const saving = dialog(render());
    saving.onOpenChange(false);
    assert.equal(c.saves[0].signal.aborted, true);
    const writes = c.writes;
    c.saves[0].resolve(true);
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(dialog(render()).open, false);
    assert.deepEqual(events, []);
  }));

test("a direct lesson never prompts; a delayed startup read cannot open over a lesson", async () => {
  await fixture(async ({ c, render, dialog }) => {
    render({ skipStartup: true });
    assert.equal(c.reads.length, 0);
    render({ skipStartup: false });
    assert.equal(c.reads.length, 0);
    assert.equal(dialog(render()).open, false);
  });
  await fixture(async ({ c, render, dialog }) => {
    render();
    render({ skipStartup: true });
    assert.equal(c.reads[0].signal.aborted, true);
    c.reads[0].resolve(false);
    await tick();
    assert.equal(dialog(render({ skipStartup: true })).open, false);
  });
});

test("account replacement cancels startup work and refuses captured old consent callbacks", () =>
  fixture(async ({ c, render, dialog }) => {
    render();
    c.reads[0].resolve(false);
    await tick();
    const old = dialog(render());
    c.actor = "b";
    assert.equal(dialog(render()).open, false);
    assert.equal(c.reads.length, 2);
    old.onConfirm();
    assert.equal(c.saves.length, 0);
    c.reads[1].resolve(false);
    await tick();
    assert.equal(dialog(render()).open, true);
  }));

test("an uncertain save stays read-only until a positive saved-status acknowledgement", () =>
  fixture(async ({ m, c, render, dialog, events }) => {
    render();
    c.reads[0].resolve(false);
    await tick();
    const d = dialog(render());
    d.onConfirm();
    c.saves[0].reject(new m.SpeakingConsentSaveError("unknown"));
    await tick();
    assert.equal(dialog(render()).unknown, true);
    d.onConfirm();
    assert.equal(c.saves.length, 1);
    dialog(render()).onCheckSavedStatus();
    c.reads[1].resolve(false);
    await tick();
    assert.equal(dialog(render()).unknown, true);
    dialog(render()).onCheckSavedStatus();
    c.reads[2].resolve(true);
    await tick();
    assert.equal(dialog(render()).open, false);
    assert.deepEqual(events, ["changed"]);
  }));

test("a successful confirmation only signals a server refresh and cannot be resent by a retained callback", () =>
  fixture(async ({ c, render, dialog, events }) => {
    render();
    c.reads[0].resolve(false);
    await tick();
    const d = dialog(render());
    d.onConfirm();
    c.saves[0].resolve(true);
    await tick();
    d.onConfirm();
    assert.equal(c.saves.length, 1);
    assert.equal(dialog(render()).open, false);
    assert.deepEqual(events, ["changed"]);
  }));

test("a slow startup check cannot interrupt a learner who has started interacting", () =>
  fixture(async ({ c, render, dialog }) => {
    render();
    window.dispatchEvent(new Event("pointerdown"));
    assert.equal(c.reads[0].signal.aborted, true);
    c.reads[0].resolve(false);
    await tick();
    assert.equal(dialog(render()).open, false);
    assert.equal(c.saves.length, 0);
  }));
