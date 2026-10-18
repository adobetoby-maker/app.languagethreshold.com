import assert from "node:assert/strict";
import test from "node:test";
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
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-owner-")),
    saved = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export * from './src/lib/speaking-client';export {ChallengePanel} from './src/components/speak/ChallengePanel';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "owned-speaking",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|lucide-react|sonner|@\/state\/(auth|grammar)-state|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',sessions:[],requests:[],slots:[],cursor:0,effects:[],toasts:[]};
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=v=>{const i=c.cursor++;return c.slots[i]??=( {current:v});};
 export const useState=v=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof v==='function'?v():v;return[c.slots[i],v=>c.slots[i]=typeof v==='function'?v(c.slots[i]):v];};
 export const useMemo=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={value:fn(),deps};return c.slots[i].value;};
 export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser}),useGrammar=()=>({state:{store:{}}});
 export const Sparkles='span',Target='span',Zap='span',toast=(...args)=>c.toasts.push(args);
 `,
            }));
          },
        },
      ],
    });
    const m = await import(join(dir, "case.mjs")),
      c = m.c,
      started = [],
      spoken = [];
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.requests.push({ url, opts, resolve }));
    const render = (props = {}) => {
      c.cursor = 0;
      const tree = m.ChallengePanel({
        language: "Spanish",
        nativeLanguage: "English",
        level: "A1",
        active: null,
        onStart: (v) => started.push(v),
        onSpeakAloud: (v) => spoken.push(v),
        ...props,
      });
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    try {
      await run({
        m,
        c,
        render,
        unmount,
        started,
        spoken,
        reach: (tree) =>
          nodes(tree)
            .filter((n) => n.type === "button")[1]
            .props.onClick(),
      });
    } finally {
      unmount();
    }
  } finally {
    globalThis.fetch = saved;
    rmSync(dir, { recursive: true, force: true });
  }
}
const auth = (id = "a") => ({
  data: { session: { user: { id }, access_token: `synthetic-${id}` } },
});
const owner = (c) => ({ userId: "a", isCurrent: () => c.actor === "a" });
test("speaking headers and attestation helpers reject mismatched SDK and stale owners before transport", () =>
  fixture(async ({ m, c }) => {
    for (const call of [
      () => m.speakingRequestHeaders(owner(c)),
      () => m.getSpeakingAgeAttestation(undefined, owner(c)),
      () => m.saveSpeakingAgeAttestation(true, undefined, () => true, owner(c)),
    ]) {
      const work = call();
      const denial = assert.rejects(work, /Sign in/);
      c.sessions.shift()(auth("b"));
      await denial;
      assert.equal(c.requests.length, 0);
    }
    c.actor = "b";
    await assert.rejects(m.speakingRequestHeaders(owner(c)), { name: "AbortError" });
    assert.equal(c.sessions.length, 0);
    await assert.rejects(m.speakingRequestHeaders({ userId: "", isCurrent: () => true }), {
      name: "AbortError",
    });
    assert.equal(c.sessions.length, 0);
  }));
test("owned attestation preserves exact request contract and rejects late JSON after identity loss", () =>
  fixture(async ({ m, c }) => {
    const work = m.saveSpeakingAgeAttestation(true, undefined, () => true, owner(c));
    c.sessions.shift()(auth());
    await tick();
    assert.deepEqual(JSON.parse(c.requests[0].opts.body), { attested: true });
    assert.equal(c.requests[0].opts.headers.Authorization, "Bearer synthetic-a");
    c.requests[0].resolve({ ok: true, json: async () => ({ attested: true }) });
    assert.equal(await work, true);
    const read = m.getSpeakingAgeAttestation(undefined, owner(c)),
      denial = assert.rejects(read, { name: "AbortError" });
    c.sessions.shift()(auth());
    await tick();
    let finish;
    c.requests[1].resolve({ ok: true, json: () => new Promise((r) => (finish = r)) });
    await tick();
    c.actor = "b";
    finish({ attested: true });
    await denial;
  }));
test("challenge generation binds SDK actor, serializes duplicate requests and accepts current exact body", () =>
  fixture(async ({ c, render, reach, started, spoken }) => {
    let tree = render();
    reach(tree);
    reach(tree);
    assert.equal(c.sessions.length, 1);
    c.sessions.shift()(auth("b"));
    await tick();
    assert.equal(c.requests.length, 0);
    assert.deepEqual(started, []);
    reach(render());
    c.sessions.shift()(auth());
    await tick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(JSON.parse(c.requests[0].opts.body), {
      mode: "challenge",
      language: "Spanish",
      nativeLanguage: "English",
      level: "A1",
      kind: "reach",
    });
    c.requests[0].resolve({
      ok: true,
      json: async () => ({
        target: "fixture target",
        gloss: "fixture gloss",
        hint: "fixture hint",
        keyword: "fixture",
      }),
    });
    await tick();
    assert.equal(started.length, 1);
    assert.deepEqual(spoken, ["fixture target"]);
  }));
test("challenge departure aborts transport and cannot deliver late callbacks or overwrite another request", () =>
  fixture(async ({ c, render, reach, started, spoken, unmount }) => {
    const old = render();
    reach(old);
    const credential = c.sessions.shift();
    render({ level: "B1" });
    credential(auth());
    await tick();
    assert.equal(c.requests.length, 0);
    reach(old);
    assert.equal(c.sessions.length, 0);
    reach(render({ level: "B1" }));
    c.sessions.shift()(auth());
    await tick();
    const req = c.requests[0];
    let finish;
    req.resolve({ ok: true, json: () => new Promise((r) => (finish = r)) });
    await tick();
    unmount();
    finish({ target: "late" });
    await tick();
    assert.equal(req.opts.signal.aborted, true);
    assert.deepEqual(started, []);
    assert.deepEqual(spoken, []);
  }));
