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
  const dir = mkdtempSync(resolve("node_modules/.cache/admin-"));
  const saved = ["fetch", "window", "document", "navigator", "setTimeout", "clearTimeout"].map(
    (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)],
  );
  const oldCreate = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  try {
    const source = readFileSync("src/routes/team.tsx", "utf8");
    const start = source.indexOf("function AdminWorkspace("),
      end = source.indexOf(
        '  return (\n    <div className="space-y-6">',
        source.indexOf("  const csv = () =>", start),
      );
    const component =
      source.slice(start, end) +
      `return {copyText,downloadInviteLinks,importRoster,billing,csv,adminSummary,inviteLinks,quote,setInviteLinks,setModuleId,setDelivery,setAddSeats};}`;
    await build({
      stdin: {
        contents: `import {useState,useRef} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {ownedTeamRequest} from '@/lib/team-client';import {assessmentCsv} from '@/lib/assessments/export';import {c} from 'fixture';const TEAM_MIN_SEATS=5;const minutes=n=>String(n/60),getModule=id=>({name:id}),memberModules=(data,id)=>data.assignments.filter(a=>a.user_id===id),describeCore30=()=>({mastered:0,total:30,statusLabel:'synthetic'}),core30Total=()=>30;${source.slice(source.indexOf("function parseCsvLine("), source.indexOf("function TeamPage("))}${component}export const Route={component:()=> <AdminWorkspace data={c.report} busy={c.busy} isBusy={()=>c.busy||c.parentRead} isContextCurrent={()=>c.parentCurrent!==false} setBusy={value=>{c.busy=value;c.busyWrites.push(value)}} setError={value=>c.errors.push(value)} setNotice={value=>c.notices.push(value)} act={async()=>{}} refresh={async()=>{c.refreshes++;if(c.refreshWait)await new Promise(r=>c.refreshWait.push(r))}}/>};export {c};`,
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
      report: report(),
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
test("bulk roster owns original settings, serializes duplicates and retains confirmed links through refresh", () =>
  fixture(async ({ c, render, reply }) => {
    const view = render();
    const done = view.importRoster(file());
    view.importRoster(file());
    view.billing("quote", { addSeats: 1 });
    await tick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(JSON.parse(c.requests[0].init.body), {
      action: "invite",
      orgId: "synthetic-org",
      name: "One",
      email: "one@synthetic.invalid",
      role: "learner",
      moduleId: "roofing",
      requireCertificate: true,
      delivery: "manual",
    });
    await reply(0, link());
    await reply(1, link("two"));
    await done;
    assert.equal(c.refreshes, 1);
    assert.equal(c.busy, false);
    assert.equal(render().inviteLinks.length, 2);
    assert.match(c.notices.at(-1), /2 of 2 invitations confirmed/);
  }));
test("file reading, held SDK credentials and account/team departure cannot start old roster requests", () =>
  fixture(async ({ c, render, reply }) => {
    let finish;
    let view = render();
    const done = view.importRoster({ size: 100, text: () => new Promise((r) => (finish = r)) });
    c.parentCurrent = false;
    finish("One,one@synthetic.invalid");
    await done;
    assert.equal(c.requests.length, 0);
    c.parentCurrent = true;
    c.credentials = [];
    view = render();
    const billing = view.billing("quote", { addSeats: 1 });
    c.actor = "b";
    render();
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await billing;
    assert.equal(c.requests.length, 0);
  }));
test("uncertain row stops the batch, preserves prior/confirmed links and asks for reconciliation before retry", () =>
  fixture(async ({ c, render, reply }) => {
    render().setInviteLinks([
      {
        id: "prior",
        name: "prior",
        email: "prior@synthetic.invalid",
        url: "https://synthetic.invalid/prior",
      },
    ]);
    const view = render();
    const done = view.importRoster(
      file("One,one@synthetic.invalid\nTwo,two@synthetic.invalid\nThree,three@synthetic.invalid"),
    );
    await tick();
    await reply(0, link());
    c.requests[1].reject(new TypeError("synthetic network loss"));
    await done;
    assert.equal(c.requests.length, 2);
    assert.deepEqual(
      render().inviteLinks.map((x) => x.id),
      ["prior", "one"],
    );
    assert.match(c.notices.at(-1), /1 of 3 invitations confirmed/);
    assert.match(c.errors.at(-1), /Import paused.*may have succeeded/);
    assert.equal(c.busy, false);
  }));
test("settings/data changes stop late roster continuation and reject stale billing controls", () =>
  fixture(async ({ c, render, reply }) => {
    let view = render();
    let done = view.importRoster(file("One,one@synthetic.invalid"));
    await tick();
    view.setModuleId("landscaper");
    render();
    await reply(0, link());
    await done;
    assert.equal(render().inviteLinks.length, 0);
    assert.equal(c.refreshes, 0);
    const old = render();
    c.report = report();
    render();
    await old.billing("quote", { addSeats: 1 });
    assert.equal(c.requests.length, 1);
    assert.equal(c.busy, false);
  }));
test("billing uses one original request, refuses mismatched SDK credentials and retries a known current denial", () =>
  fixture(async ({ c, render, reply }) => {
    let view = render();
    c.sdkActor = "b";
    await view.billing("quote", { addSeats: 1 });
    assert.equal(c.requests.length, 0);
    assert.match(c.errors.at(-1), /Sign in/);
    c.sdkActor = "a";
    let done = view.billing("quote", { addSeats: 1 });
    view.billing("portal");
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].init.cache, "no-store");
    await reply(0, { error: "synthetic denial" }, false);
    await done;
    done = render().billing("quote", { addSeats: 1 });
    await tick();
    await reply(1, { estimateCents: 123, newSeatLimit: 11, note: "synthetic quote" });
    await done;
    assert.equal(render().quote.estimateCents, 123);
    assert.equal(c.busy, false);
  }));
test("departed billing result cannot redirect, quote, refresh or show status; current redirect preserves the returned URL", () =>
  fixture(async ({ c, render, reply }) => {
    let view = render();
    let done = view.billing("portal");
    await tick();
    c.parentCurrent = false;
    await reply(0, { url: "https://synthetic.invalid/departed" });
    await done;
    assert.equal(window.location.pathname, "/team");
    assert.equal(c.refreshes, 0);
    c.parentCurrent = true;
    view = render();
    done = view.billing("portal");
    await tick();
    await reply(1, { url: "https://synthetic.invalid/current" });
    await done;
    assert.equal(window.location.pathname, "/current");
  }));
test("shared parent busy and pending signout refuse new work while cleanup can release the mounted lock", () =>
  fixture(async ({ c, render, reply }) => {
    const view = render();
    c.busy = true;
    await view.billing("quote");
    assert.equal(c.credentialReads, 0);
    c.busy = false;
    const done = view.billing("quote");
    await tick();
    c.signingOut = true;
    await reply(0, { estimateCents: 123, newSeatLimit: 11 });
    await done;
    assert.equal(render().quote, null);
    assert.equal(c.busy, false);
    await view.importRoster(file());
    assert.equal(c.requests.length, 1);
  }));
test("clipboard completion belongs to its original view and captured old links cannot be copied again", () =>
  fixture(async ({ c, render }) => {
    let view = render();
    c.copyWait = [];
    const done = view.copyText("synthetic private summary", "copied");
    assert.equal(c.copies.length, 1);
    c.parentCurrent = false;
    c.copyWait[0]();
    await done;
    assert.equal(c.notices.length, 0);
    c.parentCurrent = true;
    view = render();
    view.setInviteLinks([
      {
        id: "other",
        name: "Other",
        email: "other@synthetic.invalid",
        url: "https://synthetic.invalid/other",
      },
    ]);
    render();
    await view.copyText("old synthetic link", "old copied");
    assert.equal(c.copies.length, 1);
  }));
test("progress and invitation CSV use formula-safe bytes and own URLs/timers through departure", () =>
  fixture(async ({ c, render, unmount }) => {
    render().setInviteLinks([
      {
        id: "one",
        name: " \t=synthetic name",
        email: "one@synthetic.invalid",
        url: "https://synthetic.invalid/invite/one",
      },
    ]);
    const view = render();
    view.csv();
    view.downloadInviteLinks();
    assert.equal(c.clicks.length, 2);
    assert.match(await c.urls[0].blob.text(), /'  =synthetic member/);
    assert.match(await c.urls[1].blob.text(), /' \t=synthetic name/);
    assert.equal(c.revoked.length, 0);
    c.report = report();
    render();
    view.csv();
    assert.equal(c.urls.length, 2);
    unmount();
    assert.deepEqual(
      c.revoked,
      c.urls.map((x) => x.url),
    );
    c.timers.forEach((fn) => fn());
    assert.equal(c.revoked.length, 2);
  }));
test("invalid CSV rejects every row before transport and summary does not invent human review", () =>
  fixture(async ({ c, render }) => {
    const view = render();
    await view.importRoster(file("One,one@synthetic.invalid\nTwo,one@synthetic.invalid"));
    assert.equal(c.requests.length, 0);
    assert.match(c.errors.at(-1), /Duplicate email/);
    await view.importRoster({ size: 65537, text: async () => "" });
    assert.equal(c.requests.length, 0);
    assert.match(c.errors.at(-1), /64 KB/);
    assert.doesNotMatch(view.adminSummary(), /reviewed final/);
    assert.match(view.adminSummary(), /not a calibrated proficiency assessment/);
  }));

test("a billing request waiting for SDK credentials cannot transfer its old company to a replacement account", () =>
  fixture(async ({ c, render }) => {
    const view = render();
    c.credentials = [];
    const done = view.billing("quote", { addSeats: 1 });
    c.actor = "b";
    render();
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    await done;
  }));
