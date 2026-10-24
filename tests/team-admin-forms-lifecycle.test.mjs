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
  const dir = mkdtempSync(resolve("node_modules/.cache/admin-forms-"));
  const saved = ["fetch", "window", "document", "navigator", "setTimeout", "clearTimeout"].map(
    (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)],
  );
  const oldCreate = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  try {
    const source = readFileSync("src/routes/team.tsx", "utf8");
    const start = source.indexOf("function AdminWorkspace("),
      end = source.indexOf("function core30Total(", start);
    const component = source.slice(start, end);
    await build({
      stdin: {
        contents: `import {useState,useRef} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';const trackEvent=()=>false;import {assessmentCsv} from '@/lib/assessments/export';import {c} from 'fixture';const TEAM_MIN_SEATS=5;const MODULES=[{id:'roofing',name:'Synthetic Roofing'}],teamPeriodCents=()=>100;const card='',input='',button='',secondary='',money=String;const Icon=()=>null,BookOpen=Icon,CheckCircle2=Icon,CreditCard=Icon,FileDown=Icon,Mail=Icon,Plus=Icon,RefreshCw=Icon,Users=Icon,EmployeeRow=Icon,AssignModule=Icon,ReleaseSeat=Icon,TeamExamsPanel=Icon,Suspense=Icon;const minutes=n=>String(n/60),getModule=id=>({name:id}),memberModules=(data,id)=>data.assignments.filter(a=>a.user_id===id),describeCore30=()=>({mastered:0,total:30,statusLabel:'synthetic'}),core30Total=()=>30;${source.slice(source.indexOf("function parseCsvLine("), source.indexOf("function TeamPage("))}${component}export const Route={component:()=> <AdminWorkspace data={c.report} busy={c.busy} isBusy={()=>c.busy||c.parentRead} isContextCurrent={()=>c.parentCurrent!==false} setBusy={value=>{c.busy=value;c.busyWrites.push(value)}} setError={value=>c.errors.push(value)} setNotice={value=>c.notices.push(value)} act={async(body,message,after,intent)=>{if(c.busy)return;c.busy=true;await new Promise(resolve=>c.actions.push({body,message,intent,finish:result=>{after?.(result);c.busy=false;resolve()},fail:()=>{c.busy=false;resolve()}}))}} refresh={async()=>{c.refreshes++;if(c.refreshWait)await new Promise(r=>c.refreshWait.push(r))}}/>};export {c};`,
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

const inputNode = (tree, label) => nodes(tree).find((n) => n.props?.["aria-label"] === label);
const inviteForm = (tree) => nodes(tree).find((n) => n.type === "form");
const send = (tree) => inviteForm(tree).props.onSubmit({ preventDefault() {} });
function fill(f, name = "Synthetic one", email = "one@synthetic.invalid") {
  inputNode(f.render(), "Employee name").props.onChange({ target: { value: name } });
  inputNode(f.render(), "Employee email").props.onChange({ target: { value: email } });
  return f.render();
}
const urls = (tree) =>
  nodes(tree)
    .filter((n) => n.type === "input" && n.props.readOnly)
    .map((n) => n.props.value);
test("manual invite freezes original fields and one parent flight; confirmed links merge instead of replacing earlier links", () =>
  fixture(async (f) => {
    let tree = fill(f);
    send(tree);
    send(tree);
    assert.equal(f.c.actions.length, 1);
    assert.deepEqual(f.c.actions[0].body, {
      action: "invite",
      orgId: "synthetic-org",
      name: "Synthetic one",
      email: "one@synthetic.invalid",
      moduleId: "roofing",
      requireCertificate: true,
      role: "learner",
      delivery: "manual",
    });
    const frozen = f.render();
    assert.equal(inputNode(frozen, "Employee name").props.disabled, true);
    const term = nodes(frozen).find((n) => n.type === "select" && n.props.value === "monthly");
    assert.equal(term.props.disabled, true);
    term.props.onChange({ target: { value: "annual" } });
    assert.equal(
      nodes(f.render()).find((n) => n.type === "select" && n.props.value === "monthly")?.props
        .value,
      "monthly",
    );
    inputNode(frozen, "Employee name").props.onChange({ target: { value: "Newer text" } });
    assert.equal(inputNode(f.render(), "Employee name").props.value, "Synthetic one");
    f.c.actions[0].finish(link("one"));
    await tick();
    assert.equal(inputNode(f.render(), "Employee name").props.value, "");
    tree = fill(f, "Synthetic two", "two@synthetic.invalid");
    send(tree);
    f.c.actions[1].finish(link("two"));
    await tick();
    assert.deepEqual(urls(f.render()), [
      "https://synthetic.invalid/invite/one",
      "https://synthetic.invalid/invite/two",
    ]);
  }));
test("captured form refuses edits before rerender and account/company/data departure", () =>
  fixture(async (f) => {
    const stale = fill(f);
    inputNode(stale, "Employee name").props.onChange({ target: { value: "Changed intent" } });
    send(stale);
    assert.equal(f.c.actions.length, 0);
    inputNode(f.render(), "Employee name").props.onChange({ target: { value: "Synthetic one" } });
    f.render();
    send(stale);
    assert.equal(f.c.actions.length, 0);
    const current = f.render();
    f.c.report = { ...f.c.report };
    f.render();
    send(current);
    assert.equal(f.c.actions.length, 0);
    const old = fill(f);
    f.c.actor = "b";
    f.render();
    send(old);
    assert.equal(f.c.actions.length, 0);
    f.c.actor = null;
    f.render();
    send(old);
    assert.equal(f.c.actions.length, 0);
  }));
test("late invitation acknowledgement cannot populate a replacement account or unmounted form", () =>
  fixture(async (f) => {
    send(fill(f));
    f.c.actor = "b";
    f.render();
    f.c.actions[0].finish(link("departed"));
    await tick();
    assert.deepEqual(urls(f.render()), []);
    send(fill(f));
    f.unmount();
    const writes = f.c.writes;
    f.c.actions[1].finish(link("unmounted"));
    await tick();
    assert.equal(f.c.writes, writes);
  }));
test("resend replaces only the matching link and revoke/email rotation removes only that stale URL", () =>
  fixture(async (f) => {
    send(fill(f));
    f.c.actions[0].finish(link("one"));
    await tick();
    send(fill(f, "Synthetic two", "two@synthetic.invalid"));
    f.c.actions[1].finish(link("two"));
    await tick();
    f.c.report = {
      ...f.c.report,
      invitations: [
        {
          id: "one",
          display_name: "Synthetic one",
          email: "one@synthetic.invalid",
          role: "learner",
          status: "pending",
          module_id: "roofing",
        },
      ],
    };
    button(f.render(), "New link").props.onClick();
    f.c.actions[2].finish({ inviteUrl: "https://synthetic.invalid/invite/one-rotated" });
    await tick();
    assert.deepEqual(urls(f.render()), [
      "https://synthetic.invalid/invite/two",
      "https://synthetic.invalid/invite/one-rotated",
    ]);
    button(f.render(), "Resend email").props.onClick();
    f.c.actions[3].finish({ inviteUrl: null });
    await tick();
    assert.deepEqual(urls(f.render()), ["https://synthetic.invalid/invite/two"]);
    button(f.render(), "New link").props.onClick();
    f.c.actions[4].finish({ inviteUrl: "https://synthetic.invalid/invite/one-again" });
    await tick();
    button(f.render(), "Revoke").props.onClick();
    f.c.actions[5].finish({});
    await tick();
    assert.deepEqual(urls(f.render()), ["https://synthetic.invalid/invite/two"]);
  }));
test("stale row callbacks and pending signout refuse work; failure leaves fields and links intact", () =>
  fixture(async (f) => {
    f.c.report = {
      ...f.c.report,
      invitations: [
        {
          id: "one",
          display_name: "Synthetic one",
          email: "one@synthetic.invalid",
          role: "learner",
          status: "pending",
          module_id: "roofing",
        },
      ],
    };
    const old = button(f.render(), "New link").props.onClick;
    f.c.report = { ...f.c.report, invitations: [] };
    f.render();
    old();
    assert.equal(f.c.actions.length, 0);
    const current = fill(f);
    f.c.signingOut = true;
    send(current);
    assert.equal(f.c.actions.length, 0);
    f.c.signingOut = false;
    send(f.render());
    f.c.actions[0].fail();
    await tick();
    assert.equal(inputNode(f.render(), "Employee name").props.value, "Synthetic one");
  }));
test("walkthrough advances only after current saved acknowledgement; denial retains the same step", () =>
  fixture(async (f) => {
    f.c.report = {
      ...f.c.report,
      organization: { ...f.c.report.organization, onboarding_step: 1 },
    };
    let tree = f.render();
    assert.match(text(tree), /Admin setup · step 1 of 6/);
    const next = button(tree, "Next step").props.onClick;
    next();
    next();
    assert.equal(f.c.actions.length, 1);
    assert.deepEqual(f.c.actions[0].body, {
      action: "onboarding",
      orgId: "synthetic-org",
      step: 2,
    });
    assert.match(text(f.render()), /Admin setup · step 1 of 6/);
    f.c.actions[0].fail();
    await tick();
    assert.match(text(f.render()), /Admin setup · step 1 of 6/);
    button(f.render(), "Next step").props.onClick();
    f.c.actions[1].finish({});
    await tick();
    assert.match(text(f.render()), /Admin setup · step 2 of 6/);
    next();
    assert.equal(f.c.actions.length, 2);
  }));
test("walkthrough back/open/close use monotonic current controls and freeze during another action", () =>
  fixture(async (f) => {
    button(f.render(), "Admin walkthrough").props.onClick();
    const step1 = f.render();
    const oldNext = button(step1, "Next step").props.onClick;
    oldNext();
    assert.match(text(f.render()), /Admin setup · step 2 of 6/);
    button(f.render(), "Back").props.onClick();
    assert.match(text(f.render()), /Admin setup · step 1 of 6/);
    oldNext();
    assert.match(text(f.render()), /Admin setup · step 1 of 6/);
    const close = button(f.render(), "Close walkthrough").props.onClick;
    f.c.busy = true;
    close();
    assert.match(text(f.render()), /Admin setup/);
    f.c.busy = false;
    close();
    assert.doesNotMatch(text(f.render()), /Admin setup · step/);
    oldNext();
    assert.doesNotMatch(text(f.render()), /Admin setup · step/);
    assert.equal(f.c.actions.length, 0);
  }));
test("walkthrough late success cannot change departed account/data or unmounted state", () =>
  fixture(async (f) => {
    f.c.report = {
      ...f.c.report,
      organization: { ...f.c.report.organization, onboarding_step: 2 },
    };
    button(f.render(), "Next step").props.onClick();
    f.c.actor = "b";
    f.render();
    f.c.actions[0].finish({});
    await tick();
    assert.match(text(f.render()), /Admin setup · step 2 of 6/);
    button(f.render(), "Next step").props.onClick();
    f.c.report = { ...f.c.report };
    f.render();
    f.c.actions[1].finish({});
    await tick();
    assert.match(text(f.render()), /Admin setup · step 2 of 6/);
    button(f.render(), "Next step").props.onClick();
    f.unmount();
    const writes = f.c.writes;
    f.c.actions[2].finish({});
    await tick();
    assert.equal(f.c.writes, writes);
  }));
test("walkthrough finish waits for persisted setup and cannot close through failed save or pending signout", () =>
  fixture(async (f) => {
    f.c.report = {
      ...f.c.report,
      organization: { ...f.c.report.organization, onboarding_step: 5 },
    };
    button(f.render(), "Next step").props.onClick();
    f.c.actions[0].finish({});
    await tick();
    assert.match(text(f.render()), /Admin setup · step 6 of 6/);
    button(f.render(), "Finish setup").props.onClick();
    assert.match(text(f.render()), /Admin setup · step 6 of 6/);
    f.c.actions[1].fail();
    await tick();
    assert.match(text(f.render()), /Admin setup · step 6 of 6/);
    f.c.signingOut = true;
    button(f.render(), "Finish setup").props.onClick();
    assert.equal(f.c.actions.length, 2);
    f.c.signingOut = false;
    button(f.render(), "Finish setup").props.onClick();
    f.c.actions[2].finish({});
    await tick();
    assert.doesNotMatch(text(f.render()), /Admin setup · step/);
  }));

test("nested row action passes its original cancellation intent through the actual admin guard", () =>
  fixture(async (f) => {
    const props = nodes(f.render()).find((n) => n.props?.member && n.props?.assignments).props;
    let current = true,
      after = 0;
    const controller = new AbortController();
    const intent = { isCurrent: () => current, signal: controller.signal };
    const done = props.act(
      { action: "assign", orgId: "synthetic-org", memberId: "synthetic-member" },
      "synthetic row",
      () => after++,
      intent,
    );
    assert.equal(f.c.actions[0].intent, intent);
    current = false;
    controller.abort();
    f.c.actions[0].finish({});
    await done;
    assert.equal(after, 0);
    await props.act({}, "aborted", () => after++, intent);
    assert.equal(f.c.actions.length, 1);
  }));
