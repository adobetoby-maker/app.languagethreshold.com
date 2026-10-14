import assert from "node:assert/strict";
import { test } from "node:test";
import { createDeferredAuthSync } from "../src/lib/deferred-auth-sync.ts";

const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 10));

test("profile restoration releases the auth lock before calling Supabase again", async () => {
  let authLocked = true;
  let applied = false;
  const sync = createDeferredAuthSync({
    reset() {},
    async load(id) {
      assert.equal(authLocked, false, "querying under the auth lock would deadlock");
      return { id };
    },
    apply(id, profile) {
      assert.equal(id, profile.id);
      applied = true;
    },
  });
  assert.equal(sync.handle({ user: { id: "learner" } }), undefined);
  assert.equal(applied, false);
  authLocked = false;
  await nextTurn();
  assert.equal(applied, true);
  sync.dispose();
});

test("a late profile cannot merge after sign-out or a different account signs in", async () => {
  const pending = new Map();
  const applied = [];
  const sync = createDeferredAuthSync({
    reset() {},
    load: (id) => new Promise((resolve) => pending.set(id, resolve)),
    apply: (id) => applied.push(id),
  });
  sync.handle({ user: { id: "old-user" } });
  await nextTurn();
  sync.handle(null);
  sync.handle({ user: { id: "new-user" } });
  await nextTurn();
  pending.get("old-user")({});
  pending.get("new-user")({});
  await nextTurn();
  assert.deepEqual(applied, ["new-user"]);
  sync.dispose();
});

test("unmount cancels a scheduled profile read", async () => {
  let reads = 0;
  const sync = createDeferredAuthSync({
    reset() {},
    async load() {
      reads++;
    },
    apply() {},
  });
  sync.handle({ user: { id: "learner" } });
  sync.dispose();
  await nextTurn();
  assert.equal(reads, 0);
});
