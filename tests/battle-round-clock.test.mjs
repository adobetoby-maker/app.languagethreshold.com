import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve("node_modules/.cache/lle-tests");
mkdirSync(directory, { recursive: true });
const outfile = resolve(directory, "battle-round-clock.mjs");
await build({
  stdin: {
    contents: `export {BattleArena} from ${JSON.stringify(resolve("src/components/match/BattleArena.tsx"))};export {controls} from 'test-controls';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["react/jsx-runtime"],
  logLevel: "silent",
  plugins: [
    {
      name: "battle-clock-boundaries",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(test-controls|react|lucide-react|@\/state\/(app|match|speech)-state|@\/hooks\/use-owned-speaker|@\/lib\/(confetti|voices|tts)|@\/fns\/battle.functions|\.\/RankBadge)$/,
          },
          () => ({ path: "controls", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
 export const controls={};let slots=[],index=0,pending=[];
 controls.reset=()=>{slots=[];index=0;pending=[];controls.dispatches=[];controls.requests=[];};
 controls.begin=()=>{index=0;pending=[];};controls.commit=()=>{for(const fn of pending)fn();pending=[];};
 controls.unmount=()=>{for(const slot of slots)slot?.cleanup?.();};
 export const useState=initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
 export const useRef=initial=>{const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
 export const useEffect=(fn,deps)=>{const i=index++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old.deps?.[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});};
 export const useMemo=(fn,deps)=>{const i=index++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old.deps?.[j]))slots[i]={deps,value:fn()};return slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useApp=()=>({dispatch:action=>controls.dispatches.push(action)});
 export const generateBattleWord=async input=>{controls.requests.push(input);return {data:{word:'casa',correctDefinition:'house',wrongDefinitions:['car','garden','school']},error:null};};
 export const RANK_BADGE={Bronze:'badge'},RANK_COLOR={Bronze:'gold'},RANK_TITLE={Bronze:'practice'};
 export const RankBadge='badge',Volume2='span';export const celebrate=()=>{};
 export const useSpeech=()=>({voiceURI:null}),useOwnedSpeaker=()=>()=>{};
 export const configureUtterance=()=>{},needsRemoteTTS=()=>false,speakRemote=()=>{};
 `,
        }));
      },
    },
  ],
});
const { BattleArena, controls } = await import(outfile);
function nodes(node, out = []) {
  if (Array.isArray(node)) for (const item of node) nodes(item, out);
  else if (node && typeof node === "object") {
    out.push(node);
    nodes(node.props?.children, out);
  }
  return out;
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join("");
  if (typeof node === "object") return text(node.props?.children);
  return String(node);
}
async function fixture(action) {
  const descriptors = new Map(
    ["window", "performance"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const originalRandom = Math.random;
  Math.random = () => 0;
  let id = 0,
    now = 0;
  const intervals = new Map(),
    timeouts = new Map(),
    results = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setInterval: (fn) => {
        intervals.set(++id, fn);
        return id;
      },
      clearInterval: (id) => intervals.delete(id),
      setTimeout: (fn) => {
        timeouts.set(++id, fn);
        return id;
      },
      clearTimeout: (id) => timeouts.delete(id),
    },
  });
  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: { now: () => now },
  });
  controls.reset();
  const render = () => {
    controls.begin();
    const tree = BattleArena({
      playerName: "QA guest",
      playerTier: "Bronze",
      opponentName: "QA simulated",
      opponentTier: "Bronze",
      language: "Spanish",
      onComplete: (r) => results.push(r),
      onExit: () => {},
    });
    controls.commit();
    return tree;
  };
  try {
    render();
    await Promise.resolve();
    await Promise.resolve();
    let tree = render();
    assert.equal(controls.requests.length, 1);
    assert.match(text(tree), /casa/);
    await action({
      render,
      tree,
      intervals,
      timeouts,
      results,
      setTime: (value) => {
        now = value;
      },
      expire: () => {
        now = 16000;
        for (const fn of [...intervals.values()]) fn();
      },
      drain: () => {
        for (let i = 0; timeouts.size && i < 10; i++) {
          const [key, fn] = timeouts.entries().next().value;
          timeouts.delete(key);
          fn();
          render();
        }
      },
    });
  } finally {
    controls.unmount();
    Math.random = originalRandom;
    for (const [key, d] of descriptors)
      if (d) Object.defineProperty(globalThis, key, d);
      else delete globalThis[key];
  }
}

test("a timeout resolves the loaded question rather than stranding the loading-render closure", async () => {
  await fixture(({ render, expire, drain, results, intervals }) => {
    expire();
    assert.match(text(render()), /waiting for/i);
    drain();
    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, "defeat");
    assert.equal(results[0].finalWord, "casa");
    assert.equal(results[0].rounds, 1);
    assert.equal(results[0].wordHistory.length, 1);
    assert.equal(results[0].wordHistory[0].playerCorrect, false);
    assert.equal(intervals.size, 0);
    assert.deepEqual(controls.dispatches, []);
  });
});

test("an answer and an already-queued timeout produce one result and one history entry", async () => {
  await fixture(({ tree, render, intervals, drain, results, setTime }) => {
    const staleTick = [...intervals.values()][0];
    const wrong = nodes(tree).find((n) => n.type === "button" && text(n).endsWith("car"));
    assert.ok(wrong);
    wrong.props.onClick();
    render();
    setTime(16000);
    staleTick();
    render();
    drain();
    assert.equal(results.length, 1);
    assert.equal(results[0].wordHistory.length, 1);
    assert.equal(results[0].outcome, "defeat");
  });
});

test("unmount cancels pending round resolution and cannot create a late practice result", async () => {
  await fixture(({ render, expire, results, timeouts, intervals }) => {
    expire();
    render();
    assert.equal(timeouts.size, 1);
    controls.unmount();
    assert.equal(timeouts.size, 0);
    assert.equal(intervals.size, 0);
    assert.deepEqual(results, []);
  });
});

test("Exit practice cancels pending resolution before the parent unmounts", async () => {
  await fixture(({ render, expire, drain, results, timeouts, intervals }) => {
    expire();
    const tree = render();
    assert.equal(timeouts.size, 1);
    const exit = nodes(tree).find((n) => n.type === "button" && text(n) === "Exit practice");
    assert.ok(exit);
    exit.props.onClick();
    assert.equal(timeouts.size, 0);
    assert.equal(intervals.size, 0);
    drain();
    assert.deepEqual(results, []);
  });
});
