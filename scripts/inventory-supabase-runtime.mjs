/** AST import inventory; distinguish erased types from runtime-loading edges. */
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

async function walk(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "test" && entry.name !== "__tests__") files.push(...await walk(name));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(name);
    }
  }
  return files;
}
const records = [];
for (const file of [...await walk("app"), ...await walk("src")]) {
  const source = ts.createSourceFile(file, await fs.readFile(file, "utf8"), ts.ScriptTarget.Latest, true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const matches = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier) && /supabase/i.test(node.moduleSpecifier.text)) {
      const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
      const bindings = clause?.namedBindings;
      const typeOnly = ts.isExportDeclaration(node) ? node.isTypeOnly : !!clause &&
        (clause.isTypeOnly || !clause.name && !!bindings && ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 && bindings.elements.every(item => item.isTypeOnly));
      matches.push({ kind: "static", specifier: node.moduleSpecifier.text, typeOnly });
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0]) && /supabase/i.test(node.arguments[0].text)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) matches.push({ kind: "dynamic", specifier: node.arguments[0].text });
      if (ts.isIdentifier(node.expression) && node.expression.text === "require") matches.push({ kind: "require", specifier: node.arguments[0].text });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (matches.length) records.push({ file, group: file.split("/").slice(0, 2).join("/"), imports: matches });
}
const groups = Object.fromEntries([...new Set(records.map(record => record.group))].sort()
  .map(group => [group, records.filter(record => record.group === group).length]));
console.log(JSON.stringify({ files: records.length,
  staticFiles: records.filter(record => record.imports.some(item => item.kind === "static")).length,
  staticRuntimeFiles: records.filter(record => record.imports.some(item => item.kind === "static" && !item.typeOnly)).length,
  typeOnlyFiles: records.filter(record => record.imports.every(item => item.kind === "static" && item.typeOnly)).length,
  dynamicFiles: records.filter(record => record.imports.some(item => item.kind === "dynamic")).length,
  requireFiles: records.filter(record => record.imports.some(item => item.kind === "require")).length,
  groups, records }, null, 2));
