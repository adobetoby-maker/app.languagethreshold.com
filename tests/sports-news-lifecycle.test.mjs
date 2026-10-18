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
const refresh = (tree) => nodes(tree).find((n) => n.props?.["aria-label"] === "Refresh news");
const titles = (tree) =>
  nodes(tree)
    .filter((n) => n.props?.article)
    .map((n) => n.props.article.title);
const favorite = (tree) => nodes(tree).find((n) => n.type?.name === "FavoriteTeamInput");
const article = (title) => ({
  id: title,
  title,
  summary: "Synthetic summary",
  url: "https://fixture.invalid/news",
  pubDate: "2026-10-18T00:00:00Z",
  source: "Synthetic",
  sport: "soccer",
  teamMentions: [],
});
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/sports-lifecycle-"));
  const saved = fetch;
  const savedSet = setTimeout,
    savedClear = clearTimeout;
  const timers = new Map();
  let mounted;
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (ms !== 30000) return savedSet(fn, ms, ...args);
    const token = {};
    timers.set(token, fn);
    return token;
  };
  globalThis.clearTimeout = (token) => {
    if (timers.has(token)) timers.delete(token);
    else savedClear(token);
  };
  try {
    await build({
      stdin: {
        contents: `export {SportsNewsPanel,TeamEditor} from '@/components/soccer/SportsNewsPanel';export {c} from 'fixture';`,
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
          name: "controlled-sports",
          setup(b) {
            b.onLoad({ filter: /SportsNewsPanel\.tsx$/ }, (args) => ({
              contents:
                readFileSync(args.path, "utf8") + "\nexport {FavoriteTeamInput as TeamEditor};",
              loader: "tsx",
              resolveDir: process.cwd(),
            }));
            b.onResolve(
              {
                filter:
                  /^(fixture|react|lucide-react|@\/state\/auth-state|@\/components\/ui\/(badge|button|skeleton))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],writes:0,favorites:[]};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.writes++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const actors=new Map();const isCurrentUser=id=>c.actor===id;export const useAuth=()=>{if(!actors.has(c.actor)){actors.set(c.actor,{user:c.actor?{id:c.actor}:null,isCurrentUser});}return actors.get(c.actor);};
 export const Pencil='icon',RefreshCw='icon',X='icon',Check='icon',Badge='badge',Button='button',Skeleton='skeleton';
 `,
            }));
          },
        },
      ],
    });
    const { SportsNewsPanel, TeamEditor, c } = await import(join(dir, "case.mjs"));
    globalThis.fetch = (url, options) =>
      new Promise((resolve, reject) => c.requests.push({ url, options, resolve, reject }));
    mounted = c;
    c.expire = () => {
      for (const fn of [...timers.values()]) fn();
    };
    c.props = {
      sport: "soccer",
      favoriteTeam: "Arsenal",
      language: "Spanish",
      onSetFavoriteTeam: (team) => c.favorites.push(team),
    };
    c.render = (flush = true) => {
      c.cursor = 0;
      let tree = (c.editor ? TeamEditor : SportsNewsPanel)(c.props);
      if (flush) {
        while (c.effects.length) c.effects.shift()();
        c.cursor = 0;
        tree = (c.editor ? TeamEditor : SportsNewsPanel)(c.props);
      }
      return tree;
    };
    c.unmount = () => {
      for (const slot of c.slots) slot?.cleanup?.();
    };
    await run(c);
    c.unmount();
  } finally {
    mounted?.unmount?.();
    globalThis.fetch = saved;
    globalThis.setTimeout = savedSet;
    globalThis.clearTimeout = savedClear;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("sports actual panel owns one current selection request and refuses retained refresh/team callbacks", () =>
  fixture(async (c) => {
    let tree = c.render();
    const oldRefresh = refresh(tree).props.onClick,
      oldFavorite = favorite(tree).props.onChange;
    oldRefresh();
    oldRefresh();
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].options.cache, "no-store");
    c.props = { ...c.props, favoriteTeam: "Chelsea", sport: "baseball" };
    tree = c.render();
    assert.equal(c.requests.length, 2);
    assert.equal(c.requests[0].options.signal.aborted, true);
    oldRefresh();
    oldFavorite("PRIVATE old favorite");
    assert.equal(c.requests.length, 2);
    assert.deepEqual(c.favorites, []);
    let cancelled = false;
    const late = new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
          return new Promise(() => {});
        },
      }),
    );
    const before = c.writes;
    c.requests[0].resolve(late);
    await tick();
    assert.equal(cancelled, true);
    assert.equal(c.writes, before);
    c.requests[1].resolve(
      Response.json({ articles: [{ ...article("Current selection"), sport: "baseball" }] }),
    );
    await tick();
    tree = c.render();
    assert.deepEqual(titles(tree), ["Current selection"]);
    favorite(tree).props.onChange("New team");
    assert.deepEqual(c.favorites, ["New team"]);
  }));
test("sports panel hides departed account data before effects and ignores late parsed results through guest/B", () =>
  fixture(async (c) => {
    c.render();
    c.requests[0].resolve(Response.json({ articles: [article("Account A selection")] }));
    await tick();
    let tree = c.render();
    assert.deepEqual(titles(tree), ["Account A selection"]);
    const retained = refresh(tree).props.onClick;
    retained();
    assert.equal(c.requests.length, 2);
    let parsed,
      cancelled = false;
    const body = new ReadableStream({
      start(out) {
        parsed = out;
        out.enqueue(new TextEncoder().encode('{"articles":'));
      },
      cancel() {
        cancelled = true;
        return new Promise(() => {});
      },
    });
    c.requests[1].resolve(new Response(body));
    await tick();
    c.actor = null;
    tree = c.render(false);
    assert.deepEqual(titles(tree), []);
    while (c.effects.length) c.effects.shift()();
    tree = c.render();
    assert.equal(c.requests.length, 3);
    assert.equal(c.requests[1].options.signal.aborted, true);
    const before = c.writes;
    assert.equal(cancelled, true);
    assert.throws(() => parsed.enqueue(new TextEncoder().encode("late")));
    await tick();
    assert.equal(c.writes, before);
    retained();
    assert.equal(c.requests.length, 3);
    c.actor = "b";
    tree = c.render();
    assert.deepEqual(titles(tree), []);
    assert.equal(c.requests.length, 4);
    assert.equal(c.requests[2].options.signal.aborted, true);
    c.requests[2].reject(Error("PRIVATE guest failure"));
    await tick();
    assert.deepEqual(titles(c.render()), []);
    c.requests[3].resolve(Response.json({ articles: [article("Account B selection")] }));
    await tick();
    assert.deepEqual(titles(c.render()), ["Account B selection"]);
  }));
test("sports panel unmount aborts active work and late rejection performs no state writes", () =>
  fixture(async (c) => {
    const tree = c.render();
    const retained = refresh(tree).props.onClick;
    c.unmount();
    assert.equal(c.requests[0].options.signal.aborted, true);
    const before = c.writes;
    c.requests[0].reject(Error("PRIVATE late transport"));
    await tick();
    assert.equal(c.writes, before);
    retained();
    assert.equal(c.requests.length, 1);
  }));
test("sports panel current failures use fixed errors, release retry and reset view on language change", () =>
  fixture(async (c) => {
    c.render();
    c.requests[0].resolve(Response.json({ articles: [], error: "PRIVATE upstream detail" }));
    await tick();
    let tree = c.render();
    const rendered = JSON.stringify(tree);
    assert.ok(rendered.includes("News unavailable — try again later."));
    assert.ok(!rendered.includes("PRIVATE"));
    refresh(tree).props.onClick();
    assert.equal(c.requests.length, 2);
    c.requests[1].resolve(
      Response.json({ articles: Array.from({ length: 9 }, (_, i) => article(`Article ${i}`)) }),
    );
    await tick();
    tree = c.render();
    assert.equal(titles(tree).length, 6);
    const more = nodes(tree).find(
      (n) => (JSON.stringify(n.props?.children) ?? "").includes("Load more") && n.props?.onClick,
    );
    more.props.onClick();
    assert.equal(titles(c.render()).length, 9);
    c.props = { ...c.props, language: "French" };
    tree = c.render();
    assert.deepEqual(titles(tree), []);
    assert.equal(c.requests.length, 3);
    c.requests[2].resolve(
      Response.json({ articles: Array.from({ length: 9 }, (_, i) => article(`New ${i}`)) }),
    );
    await tick();
    assert.equal(titles(c.render()).length, 6);
  }));
test("sports panel deadline clears current busy state and allows one explicit retry", () =>
  fixture(async (c) => {
    c.render();
    c.expire();
    await tick();
    let tree = c.render();
    assert.ok(JSON.stringify(tree).includes("News unavailable — try again later."));
    assert.equal(refresh(tree).props.disabled, false);
    refresh(tree).props.onClick();
    assert.equal(c.requests.length, 2);
    c.requests[0].resolve(Response.json({ articles: [article("Late expired selection")] }));
    await tick();
    assert.deepEqual(titles(c.render()), []);
    c.requests[1].resolve(Response.json({ articles: [article("Retry selection")] }));
    await tick();
    assert.deepEqual(titles(c.render()), ["Retry selection"]);
  }));
test("sports panel rejects unsafe article data before card rendering", () =>
  fixture(async (c) => {
    c.render();
    c.requests[0].resolve(
      Response.json({
        articles: [{ ...article("Unsafe private-shaped title"), url: "javascript:alert(1)" }],
      }),
    );
    await tick();
    const tree = c.render();
    assert.deepEqual(titles(tree), []);
    assert.ok(JSON.stringify(tree).includes("News unavailable — try again later."));
    assert.ok(!JSON.stringify(tree).includes("Unsafe private-shaped title"));
  }));
test("sports favorite editor remount key changes across account, guest, language and selection", () =>
  fixture(async (c) => {
    let tree = c.render();
    const a = favorite(tree).key;
    assert.ok(a);
    c.actor = null;
    tree = c.render();
    const guest = favorite(tree).key;
    assert.notEqual(guest, a);
    c.actor = "b";
    tree = c.render();
    const b = favorite(tree).key;
    assert.notEqual(b, guest);
    assert.notEqual(b, a);
    c.props = { ...c.props, language: "French" };
    tree = c.render();
    const language = favorite(tree).key;
    assert.notEqual(language, b);
    c.props = { ...c.props, favoriteTeam: "Chelsea" };
    tree = c.render();
    assert.notEqual(favorite(tree).key, language);
    for (const req of c.requests) req.resolve(Response.json({ articles: [] }));
    await tick();
  }));
test("actual favorite editor cancels owned focus and refuses retained input/commit after unmount", () =>
  fixture(async (c) => {
    const saved = { raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
    let callback,
      focused = 0,
      cancelled = 0;
    globalThis.requestAnimationFrame = (fn) => {
      callback = fn;
      return 12;
    };
    globalThis.cancelAnimationFrame = (id) => {
      assert.equal(id, 12);
      cancelled++;
    };
    try {
      c.editor = true;
      c.props = { value: "Arsenal", onChange: (team) => c.favorites.push(team) };
      let tree = c.render();
      const start = nodes(tree).find((n) => n.type === "button").props.onClick;
      start();
      tree = c.render();
      const input = nodes(tree).find((n) => n.type === "input");
      assert.equal(input.props.maxLength, 80);
      input.props.ref.current = {
        focus() {
          focused++;
        },
      };
      input.props.onChange({ target: { value: "x".repeat(100) } });
      tree = c.render();
      assert.equal(nodes(tree).find((n) => n.type === "input").props.value.length, 80);
      const commit = nodes(tree).find((n) => n.props?.["aria-label"] === "Confirm").props.onClick;
      c.unmount();
      assert.equal(cancelled, 1);
      const before = c.writes;
      callback();
      start();
      input.props.onChange({ target: { value: "PRIVATE departed draft" } });
      commit();
      assert.equal(c.writes, before);
      assert.equal(focused, 0);
      assert.deepEqual(c.favorites, []);
    } finally {
      globalThis.requestAnimationFrame = saved.raf;
      globalThis.cancelAnimationFrame = saved.caf;
    }
  }));
