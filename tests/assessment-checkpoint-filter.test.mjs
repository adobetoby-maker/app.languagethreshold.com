import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { listEnrollments } = await loadModule("src/lib/assessments/server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});

test("checkpoint report passes cursor, tenant and activity to the bounded database query", async () => {
  for (const checkpoint of ["entrance", "day45", "day90"]) {
    const calls = [];
    const db = {
      async rpc(name, args) {
        calls.push({ name, args });
        return { data: { enrollments: [], hasMore: false }, error: null };
      },
      from() {
        throw new Error("Empty filtered page must not query private evidence");
      },
    };
    assert.deepEqual(
      await listEnrollments(db, "actor", "team", {
        checkpoint,
        state: "needs_review",
        moduleId: "roofing",
        learnerId: "learner",
        after: "2026-10-16T00:00:00Z",
        afterId: "cursor",
        target: "Spanish",
        native: "English",
      }),
      { enrollments: [], hasMore: false, nextCursor: null, limit: 50 },
    );
    assert.deepEqual(calls, [
      {
        name: "assessment_overview_checkpoint_page",
        args: {
          p_actor: "actor",
          p_org: "team",
          p_checkpoint: checkpoint,
          p_state: "needs_review",
          p_module: "roofing",
          p_learner: "learner",
          p_after: "2026-10-16T00:00:00Z",
          p_after_id: "cursor",
          p_target: "Spanish",
          p_native: "English",
        },
      },
    ]);
  }
});

test("all-checkpoint requests preserve the old RPC and database denials cannot become empty success", async () => {
  const db = {
    async rpc(name, args) {
      assert.equal(name, "assessment_overview_page");
      assert.equal("p_checkpoint" in args, false);
      return { data: null, error: { code: "P0001", message: "Team assessment access required" } };
    },
  };
  await assert.rejects(listEnrollments(db, "outsider", "team"), (error) => error.status === 403);
});
