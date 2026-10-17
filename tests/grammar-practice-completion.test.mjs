import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("node_modules/.cache/lle-tests");
mkdirSync(dir, { recursive: true });
const outfile = resolve(dir, "grammar-practice-completion.mjs");
await build({
  stdin: {
    contents: `export {QuizCard} from ${JSON.stringify(resolve("src/components/grammar/QuizCard.tsx"))}; export {controls} from 'test-controls';`,
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
      name: "practice-boundaries",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(test-controls|react|canvas-confetti|sonner|lucide-react|@tanstack\/react-start|@\/state\/(app|grammar)-state|@\/fns\/grammar.functions)$/,
          },
          () => ({ path: "controls", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
  export const controls={completed:{},actions:[],completions:0};let slots=[],index=0,cleanups=[];
  controls.resetHooks=()=>{for(const fn of cleanups)fn?.();slots=[];index=0;cleanups=[];};controls.begin=()=>{index=0;};
  export const useState=initial=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
  export const useRef=initial=>{const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
  export const useEffect=fn=>{const i=index++;if(!(i in slots)){slots[i]=true;cleanups.push(fn());}};
  export const useServerFn=()=>async()=>({data:{questions:[0,1,2].map(i=>({type:'multiple_choice',question:'Fictional QA practice '+i,options:['answer-'+i,'other-'+i],answer:'answer-'+i,explanation:'Synthetic QA item.'}))}});
  export const generateLessonQuiz=()=>{};export const useApp=()=>({state:{selectedLanguage:'Spanish'},dispatch:action=>controls.actions.push(action)});
  export const useGrammar=()=>({markComplete:(_language,_level,id)=>{controls.completed[id]=true;controls.completions++;},addBadge:()=>{},getLevel:()=>({lessons:[{id:'qa-practice'},{id:'another-practice'}],completed:controls.completed}),state:{badges:[]}});
  export const toast=()=>{};export default ()=>{};export const X='span',Loader2='span',Check='span',AlertCircle='span',ArrowLeft='span';
 `,
        }));
      },
    },
  ],
});
const { QuizCard, controls } = await import(outfile);
function text(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return text(node.props?.children);
}
function walk(node, out = []) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
  } else if (node && typeof node === "object") {
    out.push(node);
    walk(node.props?.children, out);
  }
  return out;
}
function render() {
  controls.begin();
  return QuizCard({
    level: "A1",
    lesson: { id: "qa-practice", title: "Synthetic QA practice", concept: "QA" },
    onClose() {},
    onComplete() {},
  });
}
function button(label) {
  const node = walk(render()).find(
    (node) => node.type === "button" && text(node.props.children) === label,
  );
  assert.ok(node, `Visible button ${label}`);
  return node.props.onClick;
}
async function mount() {
  controls.resetHooks();
  render();
  await Promise.resolve();
  await Promise.resolve();
}
function answerAll({ doubleSubmit = false } = {}) {
  for (let i = 0; i < 3; i++) {
    button("answer-" + i)();
    const submit = button("Submit");
    submit();
    if (doubleSubmit && i === 0) submit();
    if (i < 2) button("Next →")();
  }
  return button("See results");
}
function reset() {
  controls.completed = {};
  controls.actions = [];
  controls.completions = 0;
}

test("rapid duplicate Submit and See results do not inflate the practice score or award completion twice", async () => {
  reset();
  await mount();
  const finish = answerAll({ doubleSubmit: true });
  finish();
  finish();
  assert.match(text(render()), /3 \/ 3 correct/);
  assert.equal(controls.completions, 1);
  assert.equal(controls.actions.filter((a) => a.type === "ADD_XP").length, 1);
  assert.equal(controls.actions.filter((a) => a.type === "INC_COUNTER").length, 1);
});
test("replaying an already completed practice lesson keeps completion without another XP/counter award", async () => {
  reset();
  controls.completed["qa-practice"] = true;
  await mount();
  answerAll()();
  assert.match(text(render()), /3 \/ 3 correct/);
  assert.equal(controls.completions, 0);
  assert.equal(controls.actions.length, 0);
  assert.ok(!text(render()).includes("+50 XP awarded"));
  assert.ok(!text(render()).includes("Lesson mastered"));
});
test("a fresh completed practice is labeled as practice and awards its first completion once", async () => {
  reset();
  await mount();
  answerAll()();
  assert.equal(controls.completions, 1);
  assert.match(text(render()), /Practice complete/);
  assert.equal(controls.actions.find((a) => a.type === "ADD_XP")?.payload, 50);
});
