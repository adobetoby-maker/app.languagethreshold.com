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
  return values.join(" ");
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/workspace-"));
  const saved = ["fetch", "window"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  try {
    const source = readFileSync("src/routes/team.tsx", "utf8");
    const component = source.slice(
      source.indexOf("function TeamPage("),
      source.indexOf("function memberModules("),
    );
    await build({
      stdin: {
        contents: `import {useState,useRef,useCallback,useEffect} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';import {c,ThemeToggle,AuthModal,Link} from 'fixture';const button='button',secondary='secondary',card='card',input='input',AdminWorkspace='admin',LearnerWorkspace='learner',TeamExamsPanel='exams',Suspense='suspense',RefreshCw='icon',Plus='icon';${component}export const Route={component:()=> <TeamPage/>};export {c};`,
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
 export const c={actor:'a',token:'synthetic-workspace-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
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
    c.urlWrites = [];
    globalThis.window = {
      location: new URL("https://synthetic.invalid/team?org=synthetic-a"),
      history: {
        replaceState: (_state, _title, url) => {
          c.urlWrites.push(String(url));
          window.location = new URL(String(url));
        },
      },
    };
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
    rmSync(dir, { recursive: true, force: true });
  }
}

const memberships = (ids = ["synthetic-a", "synthetic-b"]) => ({
  organizations: ids.map((id) => ({
    organization_id: id,
    role: "admin",
    team_organizations: {
      id,
      name: "company " + id,
      billing_email: "synthetic@invalid.test",
      onboarding_step: 6,
    },
  })),
});
const detail = (id = "synthetic-a", name = "private company A") => ({
  organization: { id, name, billing_email: "synthetic@invalid.test", onboarding_step: 6 },
  role: "admin",
  entitlement: { seat_limit: 5, status: "manual", term: null, period_end: null },
  enrollmentEnabled: false,
  emailEnabled: false,
  members: [],
  invitations: [],
  assignments: [],
  activity: [],
  activity7: [],
  lessons: [],
  attempts: [],
  certificates: [],
});
const admin = (tree) => nodes(tree).find((n) => n.type === "admin");
const refresh = (tree) =>
  nodes(tree).find((n) => n.type === "button" && n.props["aria-label"] === "Refresh team data");
const companies = (tree) => nodes(tree).find((n) => n.type === "select");
async function load(f) {
  f.render();
  await tick();
  await f.reply(0, memberships());
  await f.reply(1, detail());
  return f.render();
}
test("team detail requires current membership and newest read; superseded list cannot start another detail", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    assert.equal(c.requests[0].init.cache, "no-store");
    assert.match(c.requests[1].url, /org=synthetic-a/);
    const read = refresh(tree).props.onClick;
    read();
    await tick();
    read();
    await tick();
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(3, memberships());
    await reply(4, detail("synthetic-a", "newest company"));
    await reply(2, memberships());
    assert.equal(c.requests.length, 5);
    assert.match(text(render()), /newest company/);
  }));
test("initial SDK credentials and late private reads cannot cross account replacement; guest state is empty", () =>
  fixture(async ({ c, render, reply }) => {
    c.credentials = [];
    render();
    assert.equal(c.credentials.length, 1);
    c.actor = "b";
    render();
    assert.equal(c.credentials.length, 2);
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    c.credentials[1]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    c.credentials = null;
    await tick();
    await reply(0, memberships());
    c.actor = null;
    render();
    await reply(1, detail());
    assert.doesNotMatch(text(render()), /private company A/);
    assert.match(text(render()), /Sign in to set up/);
  }));
test("company selection invalidates old data/actions/setters immediately and loads only the new company", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    const tree = await load(f),
      old = admin(tree).props;
    companies(tree).props.onChange({ target: { value: "synthetic-b" } });
    old.setNotice("departed private notice");
    await old.act({ action: "onboarding", orgId: "synthetic-a", step: 1 }, "departed action");
    let next = render();
    assert.doesNotMatch(text(next), /private company A|departed private notice/);
    await tick();
    assert.equal(c.requests.length, 3);
    await reply(2, memberships());
    await reply(3, detail("synthetic-b", "private company B"));
    next = render();
    assert.match(text(next), /private company B/);
    assert.equal(admin(next).key, "synthetic-b");
  }));
test("unknown membership and mismatched detail fail closed without showing another company", () =>
  fixture(async ({ c, render, reply }) => {
    window.location = new URL("https://synthetic.invalid/team?org=not-a-member");
    render();
    await tick();
    await reply(0, memberships());
    assert.equal(c.requests.length, 1);
    assert.match(text(render()), /does not have access/);
    companies(render()).props.onChange({ target: { value: "synthetic-a" } });
    render();
    await tick();
    await reply(1, memberships());
    await reply(2, detail("synthetic-b", "wrong private company"));
    assert.match(text(render()), /did not match/);
    assert.doesNotMatch(text(render()), /wrong private company/);
  }));
test("generic actions share one flight through their post-write refresh and run only current callbacks", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    let after = 0;
    const act = admin(tree).props.act;
    const body = { action: "onboarding", orgId: "synthetic-a", step: 1 };
    const done = act(body, "synthetic update", () => after++);
    act(body, "duplicate");
    refresh(tree).props.onClick();
    await tick();
    assert.equal(c.requests.length, 3);
    assert.deepEqual(JSON.parse(c.requests[2].init.body), body);
    await reply(2, { warning: "synthetic warning" });
    assert.equal(after, 1);
    assert.equal(c.requests.length, 4);
    await reply(3, memberships());
    await reply(4, detail());
    await done;
    assert.match(text(render()), /synthetic update synthetic warning/);
    assert.equal(admin(render()).props.busy, false);
  }));
test("selecting another company cancels an in-flight action without late notice/callback/refresh", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    const tree = await load(f);
    let after = 0;
    const done = admin(tree).props.act(
      { action: "onboarding", orgId: "synthetic-a", step: 1 },
      "old action",
      () => after++,
    );
    await tick();
    companies(tree).props.onChange({ target: { value: "synthetic-b" } });
    render();
    await tick();
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(2, {});
    await done;
    assert.equal(after, 0);
    assert.equal(c.requests.length, 4);
    assert.doesNotMatch(text(render()), /old action/);
    await reply(3, memberships());
    await reply(4, detail("synthetic-b", "company B"));
    assert.match(text(render()), /company B/);
  }));
test("current known action failure permits retry, while wrong-company body is refused", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    const act = admin(tree).props.act;
    await act({ action: "onboarding", orgId: "synthetic-b", step: 1 }, "wrong");
    assert.equal(c.requests.length, 2);
    let done = act({ action: "onboarding", orgId: "synthetic-a", step: 1 }, "saved");
    await tick();
    await reply(2, { error: "synthetic denial" }, false);
    await done;
    assert.match(text(render()), /synthetic denial/);
    done = admin(render()).props.act(
      { action: "onboarding", orgId: "synthetic-a", step: 1 },
      "saved",
    );
    await tick();
    await reply(3, {});
    await reply(4, memberships());
    await reply(5, detail());
    await done;
    assert.equal(admin(render()).props.busy, false);
  }));
test("checkout verification owns account/company/URL and cleans only the matching return after current refresh", () =>
  fixture(async ({ c, render, reply }) => {
    window.location = new URL(
      "https://synthetic.invalid/team?org=synthetic-a&checkout=success&session_id=synthetic-session",
    );
    render();
    await tick();
    assert.match(c.requests[1].url, /team-billing/);
    await reply(0, memberships());
    await reply(1, { status: "active" });
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(3, memberships());
    await reply(4, detail());
    assert.equal(c.urlWrites.length, 1);
    assert.equal(window.location.search, "?org=synthetic-a");
    assert.match(text(render()), /Payment confirmed/);
    await reply(2, detail("synthetic-a", "departed read"));
    assert.doesNotMatch(text(render()), /departed read/);
  }));
test("departed checkout cannot navigate or display status after URL/account replacement", () =>
  fixture(async ({ c, render, reply }) => {
    window.location = new URL(
      "https://synthetic.invalid/team?org=synthetic-a&checkout=success&session_id=synthetic-session",
    );
    render();
    await tick();
    window.location = new URL("https://synthetic.invalid/team?org=synthetic-b");
    await reply(1, { status: "active" });
    assert.equal(c.urlWrites.length, 0);
    assert.doesNotMatch(text(render()), /Payment confirmed/);
    c.actor = "b";
    render();
    await tick();
    await reply(0, memberships());
    assert.equal(c.requests[0].init.signal.aborted, true);
    assert.equal(c.urlWrites.length, 0);
  }));
test("pending signout suppresses list-to-detail continuation and action writes, then allows refresh retry", () =>
  fixture(async ({ c, render, reply }) => {
    render();
    await tick();
    c.signingOut = true;
    await reply(0, memberships());
    assert.equal(c.requests.length, 1);
    c.signingOut = false;
    refresh(render()).props.onClick();
    await tick();
    await reply(1, memberships());
    await reply(2, detail());
    const props = admin(render()).props;
    props.setBusy(true);
    assert.equal(admin(render()).props.busy, true);
    c.signingOut = true;
    props.setBusy(false);
    assert.equal(admin(render()).props.busy, false);
    await props.act({ action: "onboarding", orgId: "synthetic-a", step: 1 }, "paused");
    assert.equal(c.requests.length, 3);
    c.signingOut = false;
    assert.equal(props.busy, false);
  }));
test("company creation selects the returned company before its next owned read without an old-scope refresh", () =>
  fixture(async ({ c, render, reply }) => {
    window.location = new URL("https://synthetic.invalid/team");
    render();
    await tick();
    await reply(0, memberships([]));
    let tree = render();
    const form = nodes(tree).find((n) => n.type === "form");
    form.props.onSubmit({ preventDefault() {} });
    await tick();
    assert.equal(JSON.parse(c.requests[1].init.body).action, "create");
    await reply(1, { orgId: "synthetic-created" });
    render();
    await tick();
    assert.equal(c.requests.length, 3);
    await reply(2, memberships(["synthetic-created"]));
    await reply(3, detail("synthetic-created", "new synthetic company"));
    assert.match(text(render()), /new synthetic company/);
  }));

test("same-company refresh preserves the mounted admin panel but freezes generic actions until the read settles", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    const tree = await load(f);
    refresh(tree).props.onClick();
    await tick();
    let next = render();
    assert.equal(admin(next).key, admin(tree).key);
    assert.match(text(next), /private company A/);
    await admin(tree).props.act(
      { action: "onboarding", orgId: "synthetic-a", step: 1 },
      "stale action",
    );
    assert.equal(c.requests.length, 3);
    await reply(2, { error: "synthetic access denial" }, false);
    next = render();
    assert.equal(admin(next), undefined);
    assert.doesNotMatch(text(next), /private company A/);
    assert.match(text(next), /synthetic access denial/);
  }));

test("opening the team page without a company URL enters a fresh owned first-company context", () =>
  fixture(async ({ c, render, reply }) => {
    window.location = new URL("https://synthetic.invalid/team");
    render();
    await tick();
    await reply(0, memberships());
    render();
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal(c.requests[0].url, "/api/team");
    assert.equal(c.requests[1].url, "/api/team");
    await reply(1, memberships());
    assert.match(c.requests[2].url, /org=synthetic-a/);
    await reply(2, detail());
    assert.match(text(render()), /private company A/);
    assert.equal(admin(render()).props.busy, false);
  }));
test("row intent cancellation reaches credential lookup and active parent transport without late callback or refresh", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    let after = 0;
    let current = true;
    let controller = new AbortController();
    c.credentials = [];
    let done = admin(tree).props.act(
      {
        action: "assign",
        orgId: "synthetic-a",
        memberId: "synthetic-member",
        moduleId: "roofing",
        requireCertificate: false,
        dueAt: null,
      },
      "row saved",
      () => after++,
      { isCurrent: () => current, signal: controller.signal },
    );
    current = false;
    controller.abort();
    c.credentials[0]({ data: { session: { user: { id: "a" }, access_token: "synthetic-token" } } });
    await done;
    assert.equal(c.requests.length, 2);
    assert.equal(after, 0);
    assert.equal(admin(render()).props.busy, false);
    c.credentials = null;
    current = true;
    controller = new AbortController();
    done = admin(render()).props.act(
      {
        action: "assign",
        orgId: "synthetic-a",
        memberId: "synthetic-member",
        moduleId: "roofing",
        requireCertificate: false,
        dueAt: null,
      },
      "departed row saved",
      () => after++,
      { isCurrent: () => current, signal: controller.signal },
    );
    await tick();
    assert.equal(c.requests.length, 3);
    current = false;
    controller.abort();
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(2, {});
    await done;
    assert.equal(after, 0);
    assert.equal(c.requests.length, 3);
    assert.doesNotMatch(text(render()), /departed row saved/);
    assert.equal(admin(render()).props.busy, false);
  }));
