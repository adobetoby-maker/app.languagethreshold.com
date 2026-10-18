/** Review inventory only: syntax locations are not runtime trust or authorization proof. */
import ts from "typescript";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
function inspect(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, `Parse before inspection: ${path}`);
  const errors = new Set(["AssessmentAccessError"]);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const item of bindings.elements)
        if ((item.propertyName?.text ?? item.name.text) === "AssessmentAccessError")
          errors.add(item.name.text);
  }
  const rows = [];
  const position = (node) => ({
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
  });
  function visit(node) {
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      errors.has(node.expression.text)
    ) {
      const message = node.arguments?.[0];
      rows.push({
        kind: "typedAssessmentError",
        ...position(node),
        literal: !!message && ts.isStringLiteralLike(message),
        expression: message?.getText(source) ?? null,
        status: node.arguments?.[1]?.getText(source) ?? "403(default)",
      });
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isConditionalExpression(node.right) &&
      ts.isPropertyAccessExpression(node.right.whenTrue) &&
      node.right.whenTrue.name.text === "message"
    ) {
      rows.push({
        kind: "messageAssignment",
        ...position(node),
        destination: node.left.getText(source),
        expression: node.right.getText(source),
      });
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const call = node.expression;
      if (call.name.text === "rpc")
        rows.push({
          kind: "directRpc",
          ...position(node),
          receiver: call.expression.getText(source),
          name: node.arguments[0]?.getText(source) ?? null,
        });
      if (call.expression.getText(source) === "console")
        rows.push({ kind: "console", ...position(node), method: call.name.text });
      if (["localStorage", "sessionStorage", "caches"].includes(call.expression.getText(source)))
        rows.push({
          kind: "browserStorage",
          ...position(node),
          receiver: call.expression.getText(source),
          method: call.name.text,
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return rows;
}
if (process.argv.includes("--self-test")) {
  const rows = inspect(
    "synthetic.ts",
    `import {AssessmentAccessError as Denied} from './errors'; new Denied("Fixed", 409); new Denied(error.message); db.rpc("example", {}); console.error(error); localStorage.setItem('x', 'y'); warning = cause instanceof Error ? cause.message : 'Fixed'; const prose='console.error(error)'; // db.rpc('comment')`,
  );
  assert.deepEqual(
    rows.map((row) => row.kind),
    [
      "typedAssessmentError",
      "typedAssessmentError",
      "directRpc",
      "console",
      "browserStorage",
      "messageAssignment",
    ],
  );
  assert.equal(rows[0].literal, true);
  assert.equal(rows[1].literal, false);
  assert.throws(() => inspect("bad.ts", "new ("));
  console.log(
    JSON.stringify({
      aliases: true,
      literalAndDynamic: true,
      commentsAndStringsExcluded: true,
      malformedSyntaxRejected: true,
      conditionalMessageAssignment: true,
    }),
  );
} else {
  const candidates = execFileSync(
    "rg",
    ["--files", "src/lib/assessments", "src/routes", "scripts"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((path) => /\.(ts|tsx|mjs)$/.test(path));
  const files = candidates
    .filter(
      (path) =>
        path.startsWith("src/lib/assessments/") ||
        /(?:from\s*|import\s*)["'][^"']*assessments\//.test(readFileSync(path, "utf8")),
    )
    .sort();
  const inventory = files.map((path) => {
    const text = readFileSync(path, "utf8");
    return {
      path,
      sha256: createHash("sha256").update(text).digest("hex"),
      sites: inspect(path, text),
    };
  });
  const sites = inventory.flatMap((file) =>
    file.sites.map((site) => ({ path: file.path, ...site })),
  );
  const report = {
    auditedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    scan: {
      files: files.length,
      directRpc: sites.filter((site) => site.kind === "directRpc").length,
      typedAssessmentErrors: sites.filter((site) => site.kind === "typedAssessmentError").length,
      dynamicAssessmentErrors: sites.filter(
        (site) => site.kind === "typedAssessmentError" && !site.literal,
      ).length,
      consoleSites: sites.filter((site) => site.kind === "console").length,
      directBrowserStorageSites: sites.filter((site) => site.kind === "browserStorage").length,
      conditionalMessageAssignments: sites.filter((site) => site.kind === "messageAssignment")
        .length,
    },
    dynamicAssessmentErrors: sites.filter(
      (site) => site.kind === "typedAssessmentError" && !site.literal,
    ),
    directRpc: sites.filter((site) => site.kind === "directRpc"),
    consoleSites: sites.filter((site) => site.kind === "console"),
    messageAssignments: sites.filter((site) => site.kind === "messageAssignment"),
    inventory,
    manualReview: {
      typedDynamicMessages: [
        "prepared-start-server.ts rethrows only the exact typed prepared-source-change text as409",
        "server.ts guidance.message comes from the exact fixed RPC registry; registry tests are recorded separately",
        "server.ts request controls choose between two fixed strings/statuses, not backend diagnostics",
      ],
      rpcScope:
        "Six assessment-library sites: shared wrapper plus five worker sites. Worker resolved errors use fixed local errors/counts; rejected RPCs and subsequent SDK behavior remain separate. Five team RPC sites occur because api.team imports assessment helpers; scoped outer errors do not cover successful warning responses.",
      consoleScope:
        "Nine direct calls are in operator/import/QA scripts: fixed cleanup failure guidance/help, aggregate run/draft/storage reports, audio asset metadata and RPC audit output. No CLI/import/worker was executed. Implicit SDK logs, thrown exceptions and private file destinations remain separate.",
      priorityFinding: {
        path: "src/routes/api.team.ts",
        operations: ["invite", "resend", "assign"],
        mechanism:
          "Historical64f2172 had three cause.message assignments in200 warnings, two persisted diagnostics and GET historical-field serialization. Current route uses fixed contextual warnings and normalizes that GET field.",
        reachableFailureKinds:
          "sendTeamEmail nonOK HTTP currently throws a fixed status message and missing config is typed; rejected fetch or SDK update may throw arbitrary Error.message inside the same try. This is a source finding, not evidence that production exposed actual private data.",
        followupEvidence:
          "Seven controlled actual-route regression groups in tests/team-email-warnings.test.mjs; separate report qa-team-email-warnings-local-2026-10-18.json. Source locations/zero assignments alone are not runtime proof; actual mail/SDK/durable delivery remain separate.",
      },
    },
    limits: [
      "Syntax inventory of assessment library files plus route/script files with direct assessment-path imports. No transitive graph, symbol resolution, shadowing analysis, namespace constructors, computed calls, destructured methods, reexports or appwide coverage.",
      "Dynamic typed messages need manual provenance review; literal syntax alone does not prove safety or correct status/authorization. Direct RPC includes trusted wrapper and unrelated team operations in selected files.",
      "Console/browserStorage counts are direct syntax facts only; not absence of SDK logging, implicit HTTP caches, service workers, indirect persistence or private serialization. No runtime/database/browser/provider/cleanup invocation; no schema/policy/schedule changes.",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-assessment-private-boundary-inventory-2026-10-18.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      scan: report.scan,
      dynamicAssessmentErrors: report.dynamicAssessmentErrors,
      directRpc: report.directRpc,
      consoleSites: report.consoleSites,
      messageAssignments: report.messageAssignments,
    }),
  );
}
