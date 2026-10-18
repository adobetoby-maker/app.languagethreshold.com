import { loadModule } from "./bundle.mjs";
const { lessonReviewSnapshot, lessonReviewFingerprint, serializeLessonReviewSnapshot } =
  await loadModule("src/lib/lesson-review.ts");

/** Deliberately fictional review state, never inserted into the hosted project. */
export async function supportCheckFixture() {
  const snapshot = lessonReviewSnapshot("roofing", "Spanish", "English"),
    fingerprint = await lessonReviewFingerprint(snapshot);
  const enrollment = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "learner",
    organization_id: null,
    scope: "personal",
    release_id: "controlled-release",
    module_id: "roofing",
    target_language: "Spanish",
    instruction_language: "English",
    status: "active",
    role: "support",
    program_scope: "support_units",
    support_capability_id: "controlled-cap",
  };
  const cap = {
    id: "controlled-cap",
    release_id: enrollment.release_id,
    status: "verified",
    version: "v1",
    assignment_mode: "units",
    lesson_ids: ["roofing.lesson.1", "roofing.lesson.2"],
    before_form_id: "controlled-before",
    after_form_id: "controlled-after",
  };
  const assignment = {
    support_enrollment_id: enrollment.id,
    user_id: enrollment.user_id,
    organization_id: null,
    mode: "units",
    status: "active",
    capability_snapshot: {
      capabilityId: cap.id,
      version: cap.version,
      releaseId: cap.release_id,
      moduleId: "roofing",
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      lessonIds: ["roofing.lesson.1", "roofing.lesson.2"],
    },
  };
  const forms = ["entrance", "day90"].map((checkpoint, i) => ({
    id: i ? cap.after_form_id : cap.before_form_id,
    release_id: cap.release_id,
    checkpoint,
    status: "verified",
    calibrated: true,
    purpose: "support",
    support_capability_id: cap.id,
    definition: {
      items: cap.lesson_ids.map((objectiveId) => ({
        objectiveId,
        prompt: "CONTROLLED_PRIVATE_PROMPT",
        acceptedAnswers: ["CONTROLLED_PRIVATE_ANSWER"],
      })),
    },
  }));
  const checkpoints = ["entrance", "day45", "day90"].map((checkpoint, i) => ({
    id: `22222222-2222-4222-8222-22222222222${i}`,
    enrollment_id: enrollment.id,
    checkpoint,
    status: "scheduled",
    due_date: "2026-10-16",
  }));
  const rows = {
    assessment_enrollments: [enrollment],
    assessment_support_capabilities: [cap],
    assessment_support_assignments: [assignment],
    assessment_forms: forms,
    assessment_releases: [
      {
        id: cap.release_id,
        module_id: "roofing",
        target_language: "Spanish",
        instruction_language: "English",
        status: "verified",
        lesson_manifest: { reviewed: true, lessonSnapshotFingerprint: fingerprint },
      },
    ],
    assessment_lesson_snapshots: [
      {
        release_id: cap.release_id,
        fingerprint,
        snapshot_text: serializeLessonReviewSnapshot(snapshot),
      },
    ],
    assessment_checkpoints: checkpoints,
    profiles: [{ id: enrollment.user_id, data: {} }],
  };
  const errors = {},
    queries = [],
    rpcs = [];
  const page = {
    enrollments: [enrollment],
    checkpoints,
    attempts: [],
    hasMore: false,
    nextCursor: null,
  };
  const db = {
    async rpc(name, args) {
      rpcs.push({ name, args });
      if (name.startsWith("assessment_overview")) {
        if (args.p_actor !== enrollment.user_id)
          return {
            data: null,
            error: { code: "P0001", message: "Personal assessment access required" },
          };
        return { data: page, error: null };
      }
      return {
        data: ["assessment_start_attempt", "assessment_start_prepared_attempt"].includes(name)
          ? "controlled-attempt"
          : [],
        error: null,
      };
    },
    from(table) {
      const filters = [],
        nullPaths = [],
        predicates = [],
        q = { table, columns: "*", filters, maximum: Infinity };
      queries.push(q);
      const result = () => ({
        data: (rows[table] ?? [])
          .filter((row) =>
            filters.every(([column, values]) =>
              values.includes(
                column.includes("->>")
                  ? row[column.split("->>")[0]]?.[column.split("->>")[1]]
                  : row[column],
              ),
            ),
          )
          .filter((row) => predicates.every((predicate) => predicate(row)))
          .filter((row) =>
            nullPaths.every((path) => {
              const keys = path.split("->");
              let value = row;
              for (const key of keys) {
                if (value == null || !Object.prototype.hasOwnProperty.call(value, key)) return true;
                value = value[key];
              }
              return keys.length === 1 ? value === null : false;
            }),
          )
          .slice(0, q.maximum)
          .map((row) =>
            q.columns === "*"
              ? row
              : Object.fromEntries(q.columns.split(",").map((column) => [column, row[column]])),
          ),
        error: errors[table] ?? null,
      });
      const query = {
        select(columns) {
          q.columns = columns;
          return query;
        },
        is(column, value) {
          if (value !== null) throw new Error("Fixture supports SQL NULL predicates only.");
          nullPaths.push(column);
          return query;
        },
        eq(column, value) {
          filters.push([column, [value]]);
          return query;
        },
        in(column, values) {
          filters.push([column, values]);
          return query;
        },
        lt(column, value) {
          predicates.push((row) => row[column] < value);
          return query;
        },
        not(column, operator, value) {
          if (operator !== "is" || value !== null)
            throw new Error("Fixture supports IS NOT NULL only.");
          predicates.push((row) => {
            if (!column.includes("->")) return row[column] != null;
            let current = row;
            for (const key of column.split(/->>?/)) {
              if (current == null || !Object.prototype.hasOwnProperty.call(current, key))
                return false;
              current = current[key];
            }
            // A present JSON null is distinct from SQL NULL on a JSON-path select.
            return true;
          });
          return query;
        },
        abortSignal(signal) {
          q.signal = signal;
          return query;
        },
        limit(maximum) {
          q.maximum = maximum;
          return query;
        },
        order() {
          return query;
        },
        async single() {
          const r = result();
          return { ...r, data: r.data[0] ?? null };
        },
        retry(enabled) { if (enabled !== false) throw new Error("Expected selected retry disabled"); return this; },
        async maybeSingle() {
          const r = result();
          return { ...r, data: r.data[0] ?? null };
        },
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, rows, errors, queries, rpcs, page, enrollment, cap, assignment, forms, checkpoints };
}
