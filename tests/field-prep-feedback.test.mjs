import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

test("actual feedback dialog reports failed saves, blocks duplicate submits and ignores unmounted replies/timers", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/feedback-dialog-"));
  const oldSet = globalThis.setTimeout,
    oldClear = globalThis.clearTimeout;
  const timers = new Map();
  let timerId = 0;
  globalThis.setTimeout = (fn) => {
    const id = ++timerId;
    timers.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    const outfile = join(dir, "dialog.mjs");
    await build({
      stdin: {
        contents: `export {PostSessionFeedback} from './src/components/missionary/PostSessionFeedback';export {controls} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [
        {
          name: "feedback-host",
          setup(b) {
            b.onResolve(
              { filter: /^(fixture|react|react\/jsx-runtime|lucide-react|@\/lib\/utils)$/ },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const controls={slots:[],cursor:0,effects:[],begin(){this.cursor=0;},commit(){for(const f of this.effects.splice(0))f();},unmount(){for(const s of this.slots)s?.cleanup?.();this.slots=[];this.effects=[];}};export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=initial;return [controls.slots[i],v=>controls.slots[i]=v];}export function useRef(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]={current:initial};return controls.slots[i];}export function useEffect(fn){const i=controls.cursor++;if(!(i in controls.slots))controls.effects.push(()=>controls.slots[i]={cleanup:fn()});}export const jsx=(type,props)=>({type,props}),jsxs=jsx,Fragment='fragment',Star='star',X='x',cn=(...args)=>args.join(' ');`,
            }));
          },
        },
      ],
    });
    const { PostSessionFeedback, controls: c } = await import(outfile);
    const jobs = [];
    let closes = 0;
    const props = {
      analytics: {
        submitFeedback: () => {
          const job = deferred();
          jobs.push(job);
          return job.promise;
        },
      },
      scenarioId: "fixture",
      scenarioTitle: "QA fixture",
      language: "Spanish",
      onClose: () => closes++,
    };
    const render = () => {
      c.begin();
      const tree = PostSessionFeedback(props);
      c.commit();
      return tree;
    };
    const find = (node, p) => {
      if (!node || typeof node !== "object") return null;
      if (p(node)) return node;
      for (const child of [node.props?.children].flat(Infinity)) {
        const result = find(child, p);
        if (result) return result;
      }
      return null;
    };
    const button = (tree) =>
      find(tree, (n) => n.type === "button" && n.props.children === "Submit");
    let tree = render();
    find(tree, (n) => n.props?.["aria-label"] === "4 stars").props.onClick();
    tree = render();
    const first = button(tree).props.onClick();
    button(tree).props.onClick();
    assert.equal(jobs.length, 1);
    jobs[0].resolve(false);
    await first;
    tree = render();
    assert.ok(find(tree, (n) => n.props?.role === "alert"));
    assert.equal(closes, 0);
    const second = button(tree).props.onClick();
    c.unmount();
    jobs[1].resolve(true);
    await second;
    assert.equal(timers.size, 0);
    assert.equal(closes, 0);
    tree = render();
    find(tree, (n) => n.props?.["aria-label"] === "4 stars").props.onClick();
    tree = render();
    const success = button(tree).props.onClick();
    jobs[2].resolve(true);
    await success;
    tree = render();
    assert.equal(button(tree), null);
    assert.equal(timers.size, 1);
    const captured = [...timers.values()][0];
    c.unmount();
    assert.equal(timers.size, 0);
    captured();
    await tick();
    assert.equal(closes, 0);
  } finally {
    globalThis.setTimeout = oldSet;
    globalThis.clearTimeout = oldClear;
    rmSync(dir, { recursive: true, force: true });
  }
});
