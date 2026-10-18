import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
const get = (tree, type) => nodes(tree).find((n) => n.type === type);
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && n.props.children === label);
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/ink-"));
  const names = ["window", "requestAnimationFrame", "cancelAnimationFrame"];
  const originals = names.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  try {
    await build({
      stdin: {
        contents: `export {HandwrittenExamAnswer} from '@/components/exams/HandwrittenExamAnswer';export {c} from 'fixture';export {examInkKey,readExamInk} from '@/lib/assessments/ink';export {hasUnsyncedExamDrafts} from '@/lib/assessments/drafts';`,
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
          name: "controlled-ink",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/components\/core30\/HandwritingPad)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: ` export const HandwritingPad='pad';
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
`,
            }));
          },
        },
      ],
    });
    const { HandwrittenExamAnswer, c, examInkKey, readExamInk, hasUnsyncedExamDrafts } =
      await import(join(dir, "case.mjs"));
    const bytes = new Map();
    let writes = 0,
      serial = 0;
    const frames = new Map(),
      cancelled = [];
    const storage = {
      get length() {
        return bytes.size;
      },
      key: (i) => [...bytes.keys()][i] ?? null,
      getItem: (k) => bytes.get(k) ?? null,
      setItem(k, v) {
        writes++;
        if (c.quota) throw Error("quota");
        bytes.set(k, v);
      },
      removeItem: (k) => bytes.delete(k),
    };
    globalThis.window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    globalThis.requestAnimationFrame = (fn) => {
      const id = ++serial;
      frames.set(id, fn);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      cancelled.push(id);
      frames.delete(id);
    };
    const instances = [],
      answers = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = (opts = {}) => {
      let n = {
          type: HandwrittenExamAnswer,
          key: "root",
          props: {
            attemptId: "attempt",
            itemId: "item",
            onAnswer: (a) => answers.push(a),
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
      if (n) {
        get(n, "pad").props.ref.current = {
          toPngBase64: () => {
            c.exports = (c.exports ?? 0) + 1;
            return c.ink ?? "SU5L";
          },
          clear: () => {
            c.clears = (c.clears ?? 0) + 1;
          },
        };
      }
      return n;
    };
    const read = (actor = "a", attempt = "attempt", item = "item") =>
      readExamInk(storage, examInkKey(actor, attempt, item));
    const draw = (tree) => {
      get(tree, "pad").props.onChange(true);
      nodes(tree)
        .find((n) => n.props?.onPointerUp)
        .props.onPointerUp();
      for (const [id, fn] of [...frames]) {
        frames.delete(id);
        fn();
      }
    };
    try {
      await run({
        c,
        render,
        unmount,
        draw,
        read,
        frames,
        cancelled,
        answers,
        storage,
        bytes,
        pending: (actor) => hasUnsyncedExamDrafts(storage, actor),
        writes: () => writes,
      });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, d] of originals) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("manual ink confirmation uses the latest transcript and PNG and refuses duplicate or empty confirmation", () =>
  fixture(({ c, render, draw, read, answers, pending }) => {
    let tree = render();
    const confirm = button(tree, "Use this transcript for review");
    confirm.props.onClick();
    assert.equal(answers.length, 0);
    draw(tree);
    get(tree, "textarea").props.onChange({ target: { value: "first" } });
    tree = render();
    const old = button(tree, "Use this transcript for review");
    get(tree, "textarea").props.onChange({ target: { value: "latest exact errors" } });
    c.ink = "TkVX";
    old.props.onClick();
    old.props.onClick();
    assert.deepEqual(answers, [
      {
        inputMethod: "handwriting",
        originalTranscript: "latest exact errors",
        correctedTranscript: "latest exact errors",
        recognitionIssue: true,
      },
    ]);
    assert.deepEqual(read(), { ink: "TkVX", transcript: "latest exact errors", confirmed: true });
    assert.equal(pending("a"), false);
  }));
test("actor loss and unmount refuse pad, RAF, clear, transcript and confirmation callbacks while retaining original ink", () =>
  fixture(({ c, render, draw, unmount, read, frames, answers, writes, pending }) => {
    const tree = render();
    draw(tree);
    get(tree, "textarea").props.onChange({ target: { value: "owned ink" } });
    const current = render();
    nodes(current)
      .find((n) => n.props?.onPointerUp)
      .props.onPointerUp();
    const late = [...frames.values()][0];
    const before = writes(),
      bytes = read();
    c.actor = "b";
    get(current, "pad").props.onChange(true);
    get(current, "textarea").props.onChange({ target: { value: "other" } });
    button(current, "Write a new answer").props.onClick();
    button(current, "Use this transcript for review").props.onClick();
    late();
    assert.equal(writes(), before);
    assert.equal(answers.length, 0);
    assert.deepEqual(read(), bytes);
    assert.equal(pending("b"), false);
    c.actor = "a";
    unmount();
    assert.equal(frames.size, 0);
    late();
    button(current, "Use this transcript for review").props.onClick();
    assert.equal(answers.length, 0);
    assert.deepEqual(read(), bytes);
  }));
test("attempt/item/account replacement resets view and old handlers cannot mutate replacement storage; own ink restores", () =>
  fixture(({ c, render, draw, read, answers }) => {
    let tree = render();
    draw(tree);
    get(tree, "textarea").props.onChange({ target: { value: "A item" } });
    tree = render();
    const old = tree;
    let next = render({ itemId: "other" });
    assert.equal(get(next, "textarea").props.value, "");
    button(old, "Use this transcript for review").props.onClick();
    get(old, "pad").props.onChange(false);
    assert.equal(answers.length, 0);
    assert.equal(read().transcript, "A item");
    next = render({ attemptId: "different" });
    assert.equal(get(next, "textarea").props.value, "");
    c.actor = "b";
    next = render();
    assert.equal(get(next, "textarea").props.value, "");
    assert.equal(read("b"), null);
    c.actor = null;
    assert.equal(render(), null);
    c.actor = "a";
    next = render();
    assert.equal(get(next, "textarea").props.value, "A item");
    assert.equal(get(next, "img").props.src, "data:image/png;base64,SU5L");
  }));
test("clear cancels pending export and a cancelled callback cannot restore ink", () =>
  fixture(({ render, frames, cancelled, read, answers }) => {
    const tree = render();
    get(tree, "pad").props.onChange(true);
    nodes(tree)
      .find((n) => n.props?.onPointerUp)
      .props.onPointerUp();
    const late = [...frames.values()][0];
    button(tree, "Write a new answer").props.onClick();
    assert.equal(cancelled.length, 1);
    late();
    assert.deepEqual(read(), { ink: null, transcript: "", confirmed: false });
    button(tree, "Use this transcript for review").props.onClick();
    assert.equal(answers.length, 0);
  }));
test("quota fallback keeps original owner ink and reports unsaved status after remount", () =>
  fixture(({ c, render, draw, unmount, read, pending }) => {
    c.quota = true;
    let tree = render();
    draw(tree);
    get(tree, "textarea").props.onChange({ target: { value: "memory only" } });
    tree = render();
    assert.match(JSON.stringify(tree), /Ink is not saved/);
    assert.equal(pending("a"), true);
    unmount();
    tree = render();
    assert.equal(get(tree, "textarea").props.value, "memory only");
    assert.equal(read().ink, "SU5L");
    assert.match(JSON.stringify(tree), /Ink is not saved/);
    c.actor = "b";
    tree = render();
    assert.equal(get(tree, "textarea").props.value, "");
    assert.equal(pending("b"), false);
  }));

test("superseded frame cannot export or clear newer work and empty pad cannot confirm saved ink", () =>
  fixture(({ c, render, frames, read, answers, pending }) => {
    let tree = render();
    get(tree, "pad").props.onChange(true);
    get(tree, "textarea").props.onChange({ target: { value: "before export" } });
    assert.equal(pending("a"), true);
    const pointer = nodes(tree).find((n) => n.props?.onPointerUp).props.onPointerUp;
    pointer();
    const old = [...frames.values()][0];
    pointer();
    const newest = [...frames.values()][0];
    old();
    assert.equal(c.exports ?? 0, 0);
    assert.equal(frames.size, 1);
    newest();
    assert.equal(read().ink, "SU5L");
    tree = render();
    c.ink = null;
    // Explicitly return no PNG for a pad which no longer has strokes.
    get(tree, "pad").props.ref.current.toPngBase64 = () => null;
    button(tree, "Use this transcript for review").props.onClick();
    assert.equal(answers.length, 0);
    get(tree, "pad").props.onChange(false);
    assert.equal(read().ink, null);
    assert.equal(pending("a"), false);
  }));
