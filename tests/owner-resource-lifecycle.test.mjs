import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-resource-")),
    old = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export {useOwnerResource} from '@/components/owner/use-owner-resource';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
      plugins: [
        {
          name: "hooks",
          setup(b) {
            b.onResolve(
              {
                filter: /^(react|fixture|@\/state\/auth-state|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',signingOut:false,slots:[],cursor:0,effects:[],requests:[]};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return[c.slots[i],v=>{c.slots[i]=typeof v==='function'?v(c.slots[i]):v}]}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i]}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn}
 export function useEffect(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()}})}
 const isCurrentUser=id=>c.actor===id,canUseReader=id=>c.actor===id&&!c.signingOut;
 // New user object every render deliberately tests provider-object instability.
 export const useAuth=()=>({user:c.actor?{id:c.actor}:null,loading:false,isCurrentUser,canUseReader});
 export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:c.actor},access_token:'fixture-'+c.actor}}})}};
 `,
            }));
          },
        },
      ],
    });
    const { useOwnerResource, c } = await import(join(dir, "case.mjs"));
    globalThis.fetch = (url, init) =>
      new Promise((resolve) => c.requests.push({ url, init, resolve }));
    const render = () => {
      c.cursor = 0;
      const out = useOwnerResource("/api/owner-users");
      const effects = c.effects.splice(0);
      effects.forEach((f) => f());
      return out;
    };
    await run(c, render);
    c.slots.forEach((s) => s?.cleanup?.());
  } finally {
    globalThis.fetch = old;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("same identity with new provider objects does not restart reads on every render", () =>
  fixture(async (c, render) => {
    render();
    await tick();
    assert.equal(c.requests.length, 1);
    c.requests[0].resolve(Response.json({ users: ["a-private"] }));
    await tick();
    const view = render();
    assert.deepEqual(view.data, { users: ["a-private"] });
    render();
    await tick();
    assert.equal(c.requests.length, 1);
  }));
test("identity departure aborts pending reads and rejects late private results", () =>
  fixture(async (c, render) => {
    render();
    await tick();
    const first = c.requests[0];
    c.actor = "b";
    let view = render();
    assert.equal(view.data, undefined);
    assert.equal(first.init.signal.aborted, true);
    await tick();
    first.resolve(Response.json({ users: ["a-private"] }));
    c.requests[1].resolve(Response.json({ users: ["b-private"] }));
    await tick();
    view = render();
    assert.deepEqual(view.data, { users: ["b-private"] });
    assert.doesNotMatch(JSON.stringify(view.data), /a-private/);
  }));
test("only one mutation runs at a time; pending signout suppresses stale success", () =>
  fixture(async (c, render) => {
    let view = render();
    await tick();
    c.requests[0].resolve(Response.json({ users: [] }));
    await tick();
    view = render();
    const first = view.run({ action: "fixture" });
    const second = await view.run({ action: "duplicate" });
    assert.equal(second, undefined);
    await tick();
    assert.equal(c.requests.length, 2);
    c.signingOut = true;
    assert.equal(render().allowed, false);
    c.requests[1].resolve(Response.json({ link: "private-fixture-link" }));
    await assert.rejects(first, /cancelled/);
    assert.equal(render().data, undefined);
  }));

test("same-resource refresh keeps edits mounted but an account change immediately hides old data", () =>
  fixture(async (c, render) => {
    render();
    await tick();
    c.requests[0].resolve(Response.json({ users: ["a-private"] }));
    await tick();
    let view = render();
    view.refresh();
    render();
    view = render();
    assert.equal(view.loading, true);
    assert.deepEqual(view.data, { users: ["a-private"] });
    await tick();
    c.actor = "b";
    view = render();
    assert.equal(view.data, undefined);
    assert.equal(c.requests[1].init.signal.aborted, true);
    await tick();
    c.requests[1].resolve(Response.json({ users: ["a-stale"] }));
    c.requests[2].resolve(Response.json({ users: ["b-private"] }));
    await tick();
    view = render();
    assert.deepEqual(view.data, { users: ["b-private"] });
  }));
