import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("node_modules/.cache/lle-tests");
mkdirSync(dir, { recursive: true });
const outfile = resolve(dir, "grammar-content-view.mjs");
await build({
  stdin: {
    contents: `export {LessonView} from ${JSON.stringify(resolve("src/components/grammar/LessonView.tsx"))}; export {controls} from 'test-controls';`,
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
      name: "grammar-view-boundaries",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(test-controls|react|lucide-react|@tanstack\/react-start|@\/state\/(app|grammar)-state|@\/fns\/grammar.functions|@\/components\/reader\/(ClickableText|FuriganaText|WordCard)|\.\/(QuizCard|MorphologyCard))$/,
          },
          () => ({ path: "controls", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
  export const controls={content:null,calls:0};let slots=[],index=0;
  controls.reset=()=>{slots=[];index=0;controls.calls=0;};controls.begin=()=>{index=0;};
  export const useState=initial=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
  export const useEffect=(fn,deps)=>{const i=index++,old=slots[i];if(!old||deps.some((value,j)=>value!==old.deps[j])){old?.cleanup?.();slots[i]={deps,cleanup:fn()};}};
  export const useApp=()=>({state:{selectedLanguage:'Spanish',nativeLanguage:'English'},dispatch:()=>{}});
  export const useGrammar=()=>({getLevel:()=>({contents:{'qa-practice':controls.content},lessons:[],completed:{}}),setContent:()=>{}});
  export const useServerFn=()=>async()=>{controls.calls++;return {data:null,error:'Synthetic QA offline failure'};};
  export const generateLessonContent=()=>{};export const Loader2='span',BookOpen='span',Sparkles='span',ArrowLeft='span';
  export const ClickableText='fixture-text',FuriganaText='fixture-furigana',WordCard='fixture-word-card',QuizCard='fixture-quiz',MorphologyCard='fixture-morphology';
 `,
        }));
      },
    },
  ],
});
const { LessonView, controls } = await import(outfile);
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return text(node.props?.children);
}
function walk(node, out = []) {
  if (Array.isArray(node)) node.forEach((child) => walk(child, out));
  else if (node && typeof node === "object") {
    out.push(node);
    walk(node.props?.children, out);
  }
  return out;
}
function render() {
  controls.begin();
  return LessonView({
    level: "A1",
    lesson: { id: "qa-practice", title: "Synthetic QA practice", concept: "QA" },
    onBack() {},
  });
}
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}
test("invalid old cached morphology and its explanation are withheld; failure offers Retry and Back", async () => {
  controls.reset();
  controls.content = {
    explanation: "INVALID CACHED EXPLANATION SENTINEL",
    examples: [],
    keyRule: "QA",
    morphology: {
      base: { word: "ser", root: "s", ending: "er" },
      table: [{ root: "s", ending: "eres", full: "eres" }],
    },
  };
  assert.ok(!text(render()).includes("INVALID CACHED EXPLANATION SENTINEL"));
  await settle();
  let tree = render();
  assert.equal(controls.calls, 1);
  assert.ok(!walk(tree).some((node) => node.type === "fixture-morphology"));
  assert.match(text(tree), /Try againBack to Grammar/);
  const retry = walk(tree).find((node) => node.type === "button" && text(node) === "Try again");
  retry.props.onClick();
  render();
  await settle();
  render();
  assert.equal(controls.calls, 2);
});
test("a consistent cached lesson remains readable without requesting regeneration", async () => {
  controls.reset();
  controls.content = {
    explanation: "VALID CACHED EXPLANATION SENTINEL",
    examples: [],
    keyRule: "QA",
    morphology: {
      base: { word: "hablar", root: "habl", ending: "ar" },
      table: [{ root: "habl", ending: "o", full: "hablo" }],
    },
  };
  const tree = render();
  await settle();
  assert.match(text(tree), /VALID CACHED EXPLANATION SENTINEL/);
  assert.equal(controls.calls, 0);
  assert.ok(walk(tree).some((node) => node.type === "fixture-morphology"));
});
