/** Static source inventory only: no runtime SDK, credentials or network. */
import ts from "typescript";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const target = "@/lib/team-server";
const functions = ["teamError", "scopedTeamError"];
function inventory(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, `Parse source before inventory: ${file}`);
  const imports = new Map();
  const namespaces = new Set();
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== target) continue;
    const binding = node.importClause?.namedBindings;
    if (binding && ts.isNamedImports(binding)) {
      for (const spec of binding.elements)
        imports.set(spec.name.text, spec.propertyName?.text ?? spec.name.text);
    } else if (binding && ts.isNamespaceImport(binding)) namespaces.add(binding.name.text);
  }
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const context = (node) => {
    let handler = null,
      catchVariable = null;
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (!catchVariable && ts.isCatchClause(parent))
        catchVariable = parent.variableDeclaration?.name.getText(source) ?? null;
      if (
        !handler &&
        ts.isPropertyAssignment(parent) &&
        /^(GET|POST|PUT|PATCH|DELETE)$/.test(parent.name.getText(source))
      )
        handler = parent.name.getText(source);
    }
    return { handler, catchVariable };
  };
  const calls = [],
    requestJson = [],
    throws = [],
    namespaceReferences = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const imported = imports.get(node.expression.text);
        if (functions.includes(imported))
          calls.push({
            helper: imported,
            localName: node.expression.text,
            line: line(node),
            ...context(node),
            argumentKind: node.arguments[0] ? ts.SyntaxKind[node.arguments[0].kind] : "absent",
          });
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const expr = node.expression;
        if (
          ts.isIdentifier(expr.expression) &&
          namespaces.has(expr.expression.text) &&
          functions.includes(expr.name.text)
        )
          namespaceReferences.push({ helper: expr.name.text, line: line(node), ...context(node) });
        if (expr.name.text === "json" && expr.expression.getText(source) === "request")
          requestJson.push({ line: line(node), ...context(node) });
      }
    }
    if (ts.isThrowStatement(node)) {
      const expr = node.expression;
      const construction = expr && ts.isNewExpression(expr) ? expr : null;
      const arg = construction?.arguments?.[0];
      throws.push({
        line: line(node),
        ...context(node),
        kind: construction ? construction.expression.getText(source) : "rethrow-or-expression",
        literalMessage: !!arg && ts.isStringLiteral(arg),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { file, calls, namespaceReferences, directRequestJsonCalls: requestJson, throws };
}
if (process.argv.includes("--self-test")) {
  const item = inventory(
    "synthetic.ts",
    `import {teamError as legacy, scopedTeamError as scoped} from '@/lib/team-server';import * as team from '@/lib/team-server';const a={POST:async({request})=>{try{await request.json();throw new Error('fixed')}catch(e){return legacy(e)}}};const b={GET:()=>{try{}catch(error){return scoped(error)}}};team.teamError(new Error('synthetic'));other.teamError('unrelated');`,
  );
  assert.deepEqual(
    item.calls.map((x) => [x.helper, x.handler, x.catchVariable]),
    [
      ["teamError", "POST", "e"],
      ["scopedTeamError", "GET", "error"],
    ],
  );
  assert.equal(item.namespaceReferences.length, 1);
  assert.equal(item.directRequestJsonCalls.length, 1);
  assert.equal(item.throws[0].literalMessage, true);
  const unrelated = inventory(
    "unrelated.ts",
    `import {teamError} from 'other';teamError('not target');`,
  );
  assert.equal(unrelated.calls.length, 0);
  console.log(
    JSON.stringify({
      syntheticChecksPassed: true,
      namedAliasAndCatchContext: true,
      namespaceSeparated: true,
      unrelatedImportExcluded: true,
    }),
  );
} else {
  const paths = execFileSync("rg", ["--files", "src", "-g", "*.ts", "-g", "*.tsx"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .sort();
  const routes = paths
    .map((file) => inventory(file, readFileSync(file, "utf8")))
    .filter((x) => x.calls.length || x.namespaceReferences.length);
  const helperSource = readFileSync("src/lib/team-server.ts", "utf8");
  const source = ts.createSourceFile("team-server.ts", helperSource, ts.ScriptTarget.Latest, true);
  const compatibility = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((node) => [...node.declarationList.declarations])
    .find((node) => node.name.getText(source) === "teamError");
  assert.equal(compatibility?.initializer?.getText(source), "scopedTeamError");
  const helperDeclarations = source.statements
    .filter((n) => ts.isFunctionDeclaration(n) && functions.includes(n.name?.text))
    .map((n) => ({
      name: n.name.text,
      line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1,
    }));
  const legacy = routes.filter((x) => x.calls.some((c) => c.helper === "teamError"));
  const scoped = routes.filter((x) => x.calls.some((c) => c.helper === "scopedTeamError"));
  const report = {
    auditedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    scan: {
      typescriptSourceFiles: paths.length,
      legacyFiles: legacy.length,
      legacyDirectCalls: legacy.flatMap((x) => x.calls.filter((c) => c.helper === "teamError"))
        .length,
      scopedFiles: scoped.length,
      scopedDirectCalls: scoped.flatMap((x) =>
        x.calls.filter((c) => c.helper === "scopedTeamError"),
      ).length,
      namespaceCalls: routes.flatMap((x) => x.namespaceReferences).length,
    },
    helperDeclarations,
    legacyCompatibilityAlias: {
      target: "scopedTeamError",
      line: source.getLineAndCharacterOfPosition(compatibility.getStart(source)).line + 1,
    },
    routes,
    findings: [
      "Historical legacy teamError has been replaced by a scoped compatibility alias. No direct route callers remain. The compatibility teamError export now aliases scopedTeamError; eight routes use twelve direct scoped calls.",
      "Legacy surfaces include certificate metadata, entitlement, billing, company/invitations, custom module requests and platform administration. Request JSON and throw records are structural locations, not confirmation of authorization/input limits or actual error reachability.",
      "Scoped callbacks expose typed fixed guidance and fixed schema/syntax failures, suppressing unexpected backend text. This direct-import inventory does not prove all workflow behavior, diagnostics, alternate response paths or side-effect reconciliation.",
    ],
    limits: [
      "Read-only TypeScript AST inventory of direct named imports from the exact module path across rg-visible tracked/untracked src TS/TSX files. Aliased named calls are recognized; namespace references counted separately. No symbol resolution, re-export/alias chains, dynamic calls, runtime coverage or appwide safety proof.",
      "Handler/catch context is syntactic ancestry. Request.json matches direct request identifier only; wrappers, other variable names, body streams and other parsing APIs may be missed. Throw facts do not prove which catch receives the error.",
      "No runtime source/deploy/schema/grant/role/policy/schedule change, credentials, database/network/provider/email/payment/invitation/certificate/browser action. Prior exact Preview checks retained and not rerun for this audit-only follow-up.",
      "All human/content/calibration/reviewer/pilot/retention/deletion/scheduler/platform and actual session/device/process-restart gates remain open. No main push, production promotion or accepted-hostname advance.",
    ],
  };
  assert.equal(report.scan.legacyDirectCalls, 0);
  assert.equal(report.scan.legacyFiles, 0);
  assert.equal(report.scan.scopedDirectCalls, 12);
  assert.equal(report.scan.namespaceCalls, 0);
  writeFileSync(
    "docs/reviews/qa-team-error-boundary-inventory-2026-10-18.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report.scan));
}
