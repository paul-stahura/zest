import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourceDir = path.join(projectRoot, "src");

const sourceFiles = ts.sys.readDirectory(sourceDir, [".ts", ".tsx"], undefined, [
  "dist",
  "node_modules",
]);

const violations = [];

for (const fileName of sourceFiles) {
  const sourceText = fs.readFileSync(fileName, "utf8");
  const scriptKind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind);

  visit(sourceFile, sourceText, sourceFile);
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}:${violation.column} ${violation.message}`);
  }
  console.error(`\n${String(violations.length)} lint violation(s) found.`);
  process.exitCode = 1;
}

function visit(sourceFile, sourceText, node) {
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    if (!hasDisableComment(sourceText, node, "no-type-assertions")) {
      report(sourceFile, node, "Avoid TypeScript type assertions. Prefer validation, narrowing, or typed constructors.");
    }
  }

  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    if (!hasDisableComment(sourceText, node, "no-explicit-any")) {
      report(sourceFile, node, "Avoid explicit any. Prefer unknown plus validation or a narrower type.");
    }
  }

  ts.forEachChild(node, (child) => visit(sourceFile, sourceText, child));
}

function hasDisableComment(sourceText, node, ruleName) {
  const start = node.getFullStart();
  const commentRanges = ts.getLeadingCommentRanges(sourceText, start) ?? [];

  for (const range of commentRanges) {
    const text = sourceText.slice(range.pos, range.end);
    if (text.includes(`eslint-disable-next-line`) && text.includes(ruleName)) {
      return true;
    }
    if (text.includes(`lint-disable-next-line`) && text.includes(ruleName)) {
      return true;
    }
  }

  return false;
}

function report(sourceFile, node, message) {
  const start = node.getStart(sourceFile);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
  violations.push({
    file: path.relative(projectRoot, sourceFile.fileName),
    line: line + 1,
    column: character + 1,
    message,
  });
}
