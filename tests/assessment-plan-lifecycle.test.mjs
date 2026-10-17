import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
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
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/plan-lifecycle-"));
  try {
    await build({
      stdin: {
        contents: `export {AssessmentPlanPanel} from './src/components/exams/AssessmentPlanPanel';export {c} from 'fixture';`,
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
          name: "controlled-plan",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client|@\/components\/ui\/dialog|@\/data\/(modules|curriculum)|@\/lib\/(core30-plan|learning-link)|\.\/(AssessmentAuditHistory|CheckpointAttemptHistory|LearnerGoalsEditor))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',reads:[],writes:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examPlanRequest=(body,signal)=>new Promise((resolve,reject)=>(typeof body==='string'?c.reads:c.writes).push({body,signal,resolve,reject}));
 export const examRequest=(body,signal)=>new Promise((resolve,reject)=>c.writes.push({body,signal,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 export const getModule=()=>({name:'Synthetic module'}),getCurriculum=()=>({lessons:[]}),toDateKey=()=>'',moduleLessonUrl=()=>'/';
 export const Dialog='dialog',DialogContent='dialog-content',DialogHeader='dialog-header',DialogTitle='dialog-title',DialogDescription='dialog-description';
 export const AssessmentAuditHistory='audit',CheckpointAttemptHistory='attempt-history',LearnerGoalsEditor='goals-editor';
 `,
            }));
          },
        },
      ],
    });
    const { AssessmentPlanPanel, c } = await import(join(dir, "case.mjs"));
    const instances = [];
    const opened = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = (props = {}) => {
      let n = {
          type: AssessmentPlanPanel,
          props: { enrollmentId: "plan-a", onOpenAttempt: (id) => opened.push(id), ...props },
          key: "root",
        },
        depth = 0;
      while (typeof n.type === "function") {
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
      for (const e of c.effects.splice(0)) e();
      return n;
    };
    const payload = (id = "plan-a") => ({
      enrollment: { id, moduleId: "synthetic", userId: c.actor, scope: "personal" },
      goals: { revision: 1, topics: [] },
      isLearner: true,
      canManage: false,
      source: { id: "evidence-a", pilot: true, calibrated: false },
      availableSources: [],
      availability: "ready",
      revisions: [],
      recommendations: [],
      candidates: [],
      assignments: [
        {
          id: "support-a",
          status: "active",
          mode: "units",
          lessonIds: [],
          capability_snapshot: {
            lessonIds: [],
            title: "Synthetic support",
            offlineAvailable: false,
          },
          checkpoints: [
            { id: "check-a", checkpoint: "entrance", due_date: "2026-10-17", attempts: [] },
          ],
        },
      ],
      limit: 10,
    });
    const ready = async (props = {}) => {
      render(props);
      c.reads.at(-1).resolve(payload(props.enrollmentId));
      await tick();
      return render(props);
    };
    const button = (tree, label) =>
      nodes(tree).find((n) => n.type === "button" && n.props.children === label);
    const goals = (tree) => nodes(tree).find((n) => n.type === "goals-editor");
    try {
      await run({ c, render, ready, payload, button, goals, opened, unmount });
    } finally {
      unmount();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("plan read and state reset on enrollment, selected source, source prop and account changes", () =>
  fixture(async ({ c, ready, render, payload, goals }) => {
    let tree = await ready();
    const oldSave = goals(tree).props.onSave;
    nodes(tree)
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: "evidence-b" } });
    tree = render();
    assert.equal(goals(tree), undefined);
    assert.match(c.reads.at(-1).body, /attempt=evidence-b/);
    const old = c.reads.at(-1);
    tree = render({ enrollmentId: "plan-b", sourceAttemptId: "prop-source" });
    assert.equal(old.signal.aborted, true);
    assert.match(c.reads.at(-1).body, /plan-b&attempt=prop-source/);
    oldSave([], true);
    assert.equal(c.writes.length, 0);
    const current = c.reads.at(-1);
    old.resolve(payload());
    await tick();
    assert.equal(
      goals(render({ enrollmentId: "plan-b", sourceAttemptId: "prop-source" })),
      undefined,
    );
    current.resolve(payload("plan-b"));
    await tick();
    assert.ok(goals(render({ enrollmentId: "plan-b", sourceAttemptId: "prop-source" })));
    c.actor = "b";
    assert.equal(goals(render()), undefined);
    assert.match(c.reads.at(-1).body, /plan-a/);
  }));
test("plan saves are one flight, preserve retry identity and reload current revision after conflict", () =>
  fixture(async ({ c, ready, render, goals, payload }) => {
    let tree = await ready();
    goals(tree).props.onSave([], true);
    goals(tree).props.onSave([], true);
    assert.equal(c.writes.length, 1);
    const id = c.writes[0].body.requestId;
    c.writes[0].reject(new Error("synthetic failure"));
    await tick();
    tree = render();
    assert.equal(goals(tree).props.busy, false);
    goals(tree).props.onSave([], true);
    assert.equal(c.writes[1].body.requestId, id);
    assert.equal(c.writes[1].body.expectedRevision, 1);
    c.writes[1].reject(new c.Error("conflict", 409));
    await tick();
    assert.equal(c.reads.length, 2);
    const latest = c.reads.at(-1);
    latest.resolve({ ...payload(), goals: { revision: 3, topics: [] } });
    await tick();
    tree = render();
    assert.equal(goals(tree).props.goals.revision, 3);
    assert.equal(goals(tree).props.busy, false);
  }));
test("checkpoint start rejects duplicate and departed completion; current success navigates once", () =>
  fixture(async ({ c, ready, render, button, opened, unmount }) => {
    let tree = await ready();
    const start = button(tree, "Start check");
    start.props.onClick();
    start.props.onClick();
    assert.equal(c.writes.length, 1);
    render({ enrollmentId: "plan-b" });
    assert.equal(c.writes[0].signal.aborted, true);
    c.writes[0].resolve({ id: "old-attempt" });
    await tick();
    assert.deepEqual(opened, []);
    tree = await ready({ enrollmentId: "plan-b" });
    button(tree, "Start check").props.onClick();
    c.writes[1].resolve({ id: "new-attempt" });
    await tick();
    assert.deepEqual(opened, ["new-attempt"]);
    tree = render({ enrollmentId: "plan-b" });
    button(tree, "Start check").props.onClick();
    unmount();
    const writes = c.stateWrites;
    c.writes[2].reject(new Error("late"));
    await tick();
    assert.equal(c.stateWrites, writes);
  }));
test("current save reloads; superseded retries and late save replies cannot reload or change departed state", () =>
  fixture(async ({ c, ready, render, payload, goals, unmount }) => {
    let tree = await ready();
    goals(tree).props.onSave([], false);
    c.writes[0].resolve({});
    await tick();
    assert.equal(c.reads.length, 2);
    c.reads[1].resolve({ ...payload(), goals: { revision: 2, topics: [] } });
    await tick();
    tree = render();
    assert.equal(goals(tree).props.goals.revision, 2);
    assert.equal(goals(tree).props.busy, false);
    goals(tree).props.onSave([], false);
    unmount();
    assert.equal(c.writes[1].signal.aborted, true);
    const writes = c.stateWrites;
    c.writes[1].resolve({});
    await tick();
    assert.equal(c.reads.length, 2);
    assert.equal(c.stateWrites, writes);
    render();
    c.reads.at(-1).reject(new Error("read failed"));
    await tick();
    tree = render();
    const retry = nodes(tree).find((n) => n.type === "button" && n.props.children === "Try again");
    retry.props.onClick();
    retry.props.onClick();
    const first = c.reads.at(-2),
      last = c.reads.at(-1);
    assert.equal(first.signal.aborted, true);
    first.resolve(payload());
    await tick();
    assert.equal(goals(render()), undefined);
    last.resolve(payload());
    await tick();
    assert.ok(goals(render()));
  }));
test("actor loss without rerender and departure during conflict reload suppress state and navigation", () =>
  fixture(async ({ c, ready, render, goals, button, payload, opened, unmount }) => {
    let tree = await ready();
    button(tree, "Start check").props.onClick();
    c.actor = "b";
    const writes = c.stateWrites;
    c.writes[0].resolve({ id: "foreign" });
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.deepEqual(opened, []);
    tree = await ready();
    goals(tree).props.onSave([], true);
    c.writes[1].reject(new c.Error("conflict", 409));
    await tick();
    const read = c.reads.at(-1);
    unmount();
    const after = c.stateWrites;
    read.resolve(payload());
    await tick();
    assert.equal(c.stateWrites, after);
    assert.equal(read.signal.aborted, true);
    c.actor = null;
    render();
    const count = c.reads.length;
    await tick();
    assert.equal(c.reads.length, count);
  }));
