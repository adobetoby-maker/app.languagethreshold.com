import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const dir = mkdtempSync(resolve("node_modules/.cache/lle-tests/profile-ui-"));
const file = resolve(dir, "ui.mjs");
await build({
  entryPoints: ["src/components/auth/ProfileRecoverySection.tsx"],
  outfile: file,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["react/jsx-runtime"],
  logLevel: "silent",
  plugins: [
    {
      name: "controlled-hooks",
      setup(b) {
        b.onResolve(
          { filter: /^(react|@\/state\/auth-state|@\/state\/profile-recovery-context)$/ },
          () => ({ path: "hooks", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
    export const control=globalThis.__profileUI;export const useAuth=()=>control.auth;export const useProfileRecovery=()=>control.profile;
    export function useState(initial){const n=control.index++;if(!(n in control.slots))control.slots[n]=initial;return [control.slots[n],v=>{control.slots[n]=v;}];}
    export function useEffect(fn,deps){const n=control.index++,prev=control.slots[n];if(!prev||deps.some((v,i)=>v!==prev[i])){control.slots[n]=deps;control.effects.push(fn);}}
  `,
        }));
      },
    },
  ],
});
const control = {};
globalThis.__profileUI = control;
const { ProfileRecoverySection } = await import(file);
rmSync(dir, { recursive: true, force: true });
delete globalThis.__profileUI;
function render() {
  control.index = 0;
  let tree = ProfileRecoverySection({ open: true });
  for (const fn of control.effects.splice(0)) fn();
  control.index = 0;
  return ProfileRecoverySection({ open: true });
}
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (value && typeof value === "object" && "props" in value)
    return [value, ...nodes(value.props.children)];
  return [];
}
function text(value) {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object" && "props" in value) return text(value.props.children);
  return typeof value === "string" ? value : "";
}
function setup(data, profile = { ready: true, recover() {} }) {
  control.index = 0;
  control.slots = [];
  control.effects = [];
  control.auth = { user: { id: "qa-a" } };
  control.profile = profile;
  const values = new Map([["lt.app.v2", JSON.stringify(data)]]);
  globalThis.window = {
    localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
  };
  return () => {
    delete globalThis.window;
  };
}
test("exam routes without a profile context keep their work and offer a separate learning tab", () => {
  const done = setup({}, null);
  try {
    const tree = render(),
      link = nodes(tree).find((n) => n.type === "a");
    assert.equal(link.props.href, "/");
    assert.equal(link.props.target, "_blank");
    assert.match(link.props.rel, /noopener/);
    assert.equal(
      nodes(tree).some((n) => n.type === "button"),
      false,
    );
  } finally {
    done();
  }
});
test("unlabeled vocabulary requires category, ownership and explicit language before recovery", () => {
  const calls = [],
    done = setup(
      {
        userVocab: [{ word: "casa", translation: "house", category: "noun", correctCount: 0 }],
        vocabLang: null,
      },
      { ready: true, recover: (...args) => calls.push(args) },
    );
  try {
    let tree = render();
    const radio = nodes(tree).find((n) => n.props.type === "radio");
    radio.props.onChange();
    tree = render();
    assert.equal(nodes(tree).find((n) => n.type === "button").props.disabled, true);
    nodes(tree)
      .find((n) => n.props.type === "checkbox")
      .props.onChange({ target: { checked: true } });
    tree = render();
    assert.equal(nodes(tree).find((n) => n.type === "button").props.disabled, true);
    nodes(tree)
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: "Spanish" } });
    tree = render();
    const button = nodes(tree).find((n) => n.type === "button");
    assert.equal(!!button.props.disabled, false);
    button.props.onClick();
    assert.deepEqual(calls, [["vocabulary", true, "Spanish"]]);
    tree = render();
    assert.match(text(tree), /does not confirm a cloud backup/);
    assert.equal(calls.length, 1);
  } finally {
    done();
  }
});
test("current-profile restore readiness disables recovery even after ownership confirmation", () => {
  const done = setup(
    { userNotes: [{ id: "n", text: "Private note", createdAt: 1 }] },
    {
      ready: false,
      recover() {
        assert.fail("premature recovery");
      },
    },
  );
  try {
    let tree = render();
    nodes(tree)
      .find((n) => n.props.type === "radio")
      .props.onChange();
    tree = render();
    nodes(tree)
      .find((n) => n.props.type === "checkbox")
      .props.onChange({ target: { checked: true } });
    tree = render();
    assert.equal(nodes(tree).find((n) => n.type === "button").props.disabled, true);
    assert.match(text(tree), /finish restoring/);
    assert.doesNotMatch(text(tree), /Private note/);
  } finally {
    done();
  }
});
test("recover failure is visible and never claims success or reloads the page", () => {
  const done = setup(
    { xp: 4 },
    {
      ready: true,
      recover() {
        throw Error("Current profile storage could not be checked.");
      },
    },
  );
  try {
    let tree = render();
    nodes(tree)
      .find((n) => n.props.type === "radio")
      .props.onChange();
    tree = render();
    nodes(tree)
      .find((n) => n.props.type === "checkbox")
      .props.onChange({ target: { checked: true } });
    tree = render();
    nodes(tree)
      .find((n) => n.type === "button")
      .props.onClick();
    tree = render();
    assert.match(text(tree), /storage could not be checked/);
    assert.equal(
      nodes(tree).some((n) => n.props.role === "alert"),
      true,
    );
    assert.doesNotMatch(text(tree), /Saved to your profile/);
  } finally {
    done();
  }
});
