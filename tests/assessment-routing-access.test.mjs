import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
const { attemptAccess, readAttempt } = await loadModule("src/lib/assessments/server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
test("authorized adaptive snapshots fail before private serialization; legacy frozen attempts retain access", async () => {
  const f = await supportCheckFixture();
  const id = "11111111-2222-4333-8444-555555555555";
  const attempt = {
    id,
    checkpoint_id: f.checkpoints[0].id,
    form_snapshot: { definition: f.forms[0].definition },
  };
  f.rows.assessment_attempts = [attempt];
  assert.equal((await attemptAccess(f.db, "learner", id)).attempt, attempt);
  attempt.form_snapshot.definition.routing = { schema: 1 };
  await assert.rejects(attemptAccess(f.db, "outsider", id), (error) => error.status === 403);
  await assert.rejects(readAttempt(f.db, "learner", id), (error) => error.status === 503);
  assert.equal(
    f.queries.some((q) => q.table === "assessment_responses"),
    false,
  );
  assert.equal(f.rpcs.length, 0);
});
