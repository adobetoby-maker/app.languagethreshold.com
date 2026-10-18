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
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && JSON.stringify(n.props.children).includes(label));
const text = (tree) => {
  const values = [];
  const visit = (n) => {
    if (typeof n === "string" || typeof n === "number") values.push(String(n));
    else if (Array.isArray(n)) n.forEach(visit);
    else if (n && typeof n === "object") visit(n.props?.children);
  };
  visit(tree);
  return values.join(" ").replace(/\s+/g, " ").trim();
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/assignment-row-"));
  const saved = ["fetch", "window", "document", "navigator", "setTimeout", "clearTimeout"].map(
    (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)],
  );
  const oldCreate = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  try {
    const source = readFileSync("src/routes/team.tsx", "utf8");
    const start = source.indexOf("function AssignModule("),
      end = source.indexOf("function LearnerWorkspace(", start);
    const component = source.slice(start, end);
    await build({
      stdin: {
        contents: `import {useState,useRef} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';import {assessmentCsv} from '@/lib/assessments/export';import {c} from 'fixture';const TEAM_MIN_SEATS=5;const MODULES=[{id:'roofing',name:'Synthetic Roofing'},{id:'landscaping',name:'Synthetic Landscaping'}],teamPeriodCents=()=>100;const card='',input='',button='',secondary='',money=String;const Icon=()=>null,BookOpen=Icon,CheckCircle2=Icon,CreditCard=Icon,FileDown=Icon,Mail=Icon,Plus=Icon,RefreshCw=Icon,Users=Icon,EmployeeRow=Icon,ReleaseSeat=Icon,TeamExamsPanel=Icon,Suspense=Icon;const minutes=n=>String(n/60),getModule=id=>MODULES.find(m=>m.id===id),memberModules=(data,id)=>data.assignments.filter(a=>a.user_id===id),describeCore30=()=>({mastered:0,total:30,statusLabel:'synthetic'}),core30Total=()=>30;${source.slice(source.indexOf("function parseCsvLine("), source.indexOf("function TeamPage("))}${component}export const Route={component:()=> <AssignModule member={c.report.members[0]} orgId={c.report.organization.id} assignments={c.report.assignments} initialAssignment={c.initialAssignment} busy={c.busy} isBusy={()=>c.busy||c.parentRead} isContextCurrent={()=>c.parentCurrent!==false} act={async(body,message,after,intent)=>{if(c.busy)return;c.busy=true;await new Promise(resolve=>{let acknowledged=false;const ack=result=>{if(!acknowledged&&(!intent||(!intent.signal.aborted&&intent.isCurrent()))){acknowledged=true;after?.(result)}};c.actions.push({body,message,intent,ack,finish:result=>{ack(result);c.busy=false;resolve()},fail:()=>{c.busy=false;resolve()}})})}}/>};export {c};`,
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
          name: "controlled-invitation",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@tanstack\/react-router|@\/state\/auth-state|@\/components\/(auth\/AuthModal|ThemeToggle)|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',token:'synthetic-admin-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.writes++;slots[i]=typeof v==='function'?v(slots[i]):v}]}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i]}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}
 const isCurrentUser=id=>c.actor===id;const canUseReader=id=>c.actor===id&&!c.signingOut;
 export const useAuth=()=>({user:c.actor?{id:c.actor,email:c.actor+'@synthetic.invalid'}:null,loading:!!c.loading,isCurrentUser,canUseReader});
 export const AuthProvider=({children})=>children;export const AuthModal=()=>null;export const ThemeToggle=()=>null;export const Link=({children,...props})=>({type:'a',props:{...props,children}});
 export const createFileRoute=()=>options=>({...options,useSearch:()=>({token:c.token})});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}})}}};
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "case.mjs"));
    globalThis.fetch = (url, init) =>
      new Promise((resolve, reject) => c.requests.push({ url, init, resolve, reject }));
    Object.assign(c, {
      report: { ...report(), emailEnabled: true },
      actions: [],
      busy: false,
      busyWrites: [],
      errors: [],
      notices: [],
      refreshes: 0,
      urls: [],
      revoked: [],
      clicks: [],
      copies: [],
      timers: [],
    });
    globalThis.window = {
      location: new URL("https://synthetic.invalid/team"),
      setTimeout,
      clearTimeout,
    };
    globalThis.document = {
      createElement: () => {
        const a = { click: () => c.clicks.push({ href: a.href, download: a.download }) };
        return a;
      },
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: (value) => {
            c.copies.push(value);
            return c.copyWait ? new Promise((r) => c.copyWait.push(r)) : Promise.resolve();
          },
        },
      },
    });
    URL.createObjectURL = (blob) => {
      const url = "blob:synthetic-" + c.urls.length;
      c.urls.push({ url, blob });
      return url;
    };
    URL.revokeObjectURL = (url) => c.revoked.push(url);
    globalThis.setTimeout = (fn) => {
      c.timers.push(fn);
      return c.timers.length;
    };
    globalThis.clearTimeout = () => {};
    const instances = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = () => {
      let n = { type: Route.component, key: "root", props: {} },
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
      for (const effect of c.effects.splice(0)) effect();
      return n;
    };
    const reply = async (i, payload = {}, ok = true) => {
      c.requests[i].resolve({ ok, json: async () => payload });
      await tick();
    };
    try {
      await run({ c, render, unmount, reply });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, value] of saved) {
      if (value) Object.defineProperty(globalThis, k, value);
      else delete globalThis[k];
    }
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
    rmSync(dir, { recursive: true, force: true });
  }
}
const report = (id = "synthetic-org") => ({
  organization: { id, name: "synthetic company", onboarding_step: 6 },
  entitlement: { seat_limit: 10, status: "manual" },
  members: [
    {
      id: "synthetic-member",
      user_id: "synthetic-user",
      display_name: "  =synthetic member",
      role: "learner",
      status: "active",
    },
  ],
  invitations: [],
  activity: [],
  activity7: [],
  lessons: [],
  attempts: [],
  certificates: [],
  assignments: [{ id: "synthetic-assignment", user_id: "synthetic-user", module_id: "roofing" }],
});
const file = (text = "Name,Email\nOne,one@synthetic.invalid\nTwo,two@synthetic.invalid") => ({
  size: 100,
  text: async () => text,
});
const link = (id = "one") => ({
  invitationId: id,
  inviteUrl: "https://synthetic.invalid/invite/" + id,
});

const moduleSelect = (tree) => nodes(tree).find((n) => n.type === "select");
function start(f) {
  button(f.render(), "Assign module").props.onClick();
  return f.render();
}
const save = (tree) =>
  (button(tree, "Save assignment") ?? button(tree, "Assign module")).props.onClick();
test("assignment uses the current module revision, refuses duplicate Save, and retains its intent through parent refresh", () =>
  fixture(async (f) => {
    let tree = start(f);
    const oldSave = button(tree, "Save assignment").props.onClick;
    moduleSelect(tree).props.onChange({ target: { value: "landscaping" } });
    oldSave();
    assert.equal(f.c.actions.length, 0);
    tree = f.render();
    save(tree);
    save(tree);
    assert.equal(f.c.actions.length, 1);
    assert.deepEqual(f.c.actions[0].body, {
      action: "assign",
      orgId: "synthetic-org",
      memberId: "synthetic-member",
      moduleId: "landscaping",
      requireCertificate: false,
      dueAt: null,
    });
    assert.equal(moduleSelect(f.render()).props.disabled, true);
    moduleSelect(f.render()).props.onChange({ target: { value: "roofing" } });
    assert.equal(moduleSelect(f.render()).props.value, "landscaping");
    f.c.actions[0].ack({});
    assert.equal(f.c.actions[0].intent.isCurrent(), true);
    assert.equal(f.c.actions[0].intent.signal.aborted, false);
    f.c.actions[0].finish({});
    await tick();
    assert.equal(moduleSelect(f.render()), undefined);
    assert.equal(f.c.actions[0].intent.signal.aborted, true);
    oldSave();
    assert.equal(f.c.actions.length, 1);
  }));
test("assignment edits remain stale after cancel/reopen and module round trips", () =>
  fixture(async (f) => {
    let tree = start(f);
    const old = button(tree, "Save assignment").props.onClick;
    moduleSelect(tree).props.onChange({ target: { value: "landscaping" } });
    moduleSelect(f.render()).props.onChange({ target: { value: "roofing" } });
    f.render();
    old();
    assert.equal(f.c.actions.length, 0);
    const current = button(f.render(), "Save assignment").props.onClick;
    button(f.render(), "Cancel").props.onClick();
    start(f);
    current();
    assert.equal(f.c.actions.length, 0);
    save(f.render());
    f.c.actions[0].fail();
    await tick();
    assert.ok(moduleSelect(f.render()));
    save(f.render());
    assert.equal(f.c.actions.length, 2);
  }));
test("account/member/company/assignment replacement remounts editor and aborts departed intent", () =>
  fixture(async (f) => {
    start(f);
    save(f.render());
    const first = f.c.actions[0];
    f.c.actor = "b";
    f.render();
    assert.equal(first.intent.signal.aborted, true);
    first.finish({});
    await tick();
    assert.equal(moduleSelect(f.render()), undefined);
    start(f);
    const old = button(f.render(), "Save assignment").props.onClick;
    f.c.report = {
      ...f.c.report,
      assignments: [{ ...f.c.report.assignments[0], due_at: "2026-11-01T00:00:00Z" }],
    };
    f.render();
    old();
    assert.equal(f.c.actions.length, 1);
    assert.equal(moduleSelect(f.render()), undefined);
    start(f);
    save(f.render());
    assert.equal(f.c.actions[1].body.dueAt, "2026-11-01T00:00:00.000Z");
    f.c.report = {
      ...f.c.report,
      organization: { ...f.c.report.organization, id: "different-org" },
    };
    f.render();
    assert.equal(f.c.actions[1].intent.signal.aborted, true);
    f.c.actions[1].finish({});
    await tick();
  }));
test("shared parent read/busy, pending signout, inactive learner and malformed due date refuse assignment", () =>
  fixture(async (f) => {
    let tree = start(f);
    f.c.parentRead = true;
    save(tree);
    assert.equal(f.c.actions.length, 0);
    f.c.parentRead = false;
    f.c.signingOut = true;
    save(tree);
    assert.equal(f.c.actions.length, 0);
    f.c.signingOut = false;
    f.c.report = { ...f.c.report, members: [{ ...f.c.report.members[0], status: "inactive" }] };
    f.render();
    button(f.render(), "Assign module").props.onClick();
    assert.equal(moduleSelect(f.render()), undefined);
    f.c.report = {
      ...f.c.report,
      members: [{ ...f.c.report.members[0], status: "active" }],
      assignments: [{ ...f.c.report.assignments[0], due_at: "invalid" }],
    };
    start(f);
    save(f.render());
    assert.equal(f.c.actions.length, 0);
  }));
test("pending signout suppresses late close but releases mounted Save for retry; unmount aborts row signal", () =>
  fixture(async (f) => {
    start(f);
    save(f.render());
    f.c.signingOut = true;
    f.c.actions[0].finish({});
    await tick();
    f.c.signingOut = false;
    assert.ok(moduleSelect(f.render()));
    save(f.render());
    assert.equal(f.c.actions.length, 2);
    f.unmount();
    const writes = f.c.writes;
    assert.equal(f.c.actions[1].intent.signal.aborted, true);
    f.c.actions[1].finish({});
    await tick();
    assert.equal(f.c.writes, writes);
  }));
