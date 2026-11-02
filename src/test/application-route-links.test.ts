import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

it("keeps literal internal navigation targets connected to registered application routes", () => {
  const app = ts.createSourceFile("App.tsx", readFileSync("src/App.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const routes: string[] = [];
  function visit(node: ts.Node, prefix = "") {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      if (opening.tagName.getText(app) === "Route") {
        const attribute = opening.attributes.properties.find((entry): entry is ts.JsxAttribute => ts.isJsxAttribute(entry) && entry.name.getText(app) === "path");
        const value = attribute?.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : "";
        const next = value.startsWith("/") ? value : `${prefix}/${value}`.replace(/\/+/g, "/");
        if (value && value !== "*") routes.push(next);
        if (ts.isJsxElement(node)) node.children.forEach(child => visit(child, next));
        return;
      }
    }
    ts.forEachChild(node, child => visit(child, prefix));
  }
  visit(app);
  expect(routes.length).toBeGreaterThan(40);
  const patterns = routes.map(route => new RegExp(`^${route.replace(/:[^/]+/g, "[^/]+")}/?$`));
  const broken: string[] = [];
  let checked = 0;
  let expressionTargets = 0;
  const checkTarget = (raw: string, file: string) => {
    const target = raw.split(/[?#]/)[0];
    if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/api/")) return;
    checked++;
    // Dynamic values can select an existing segment, never invent a route shape.
    const segments = target.replace(/\/$/, "").split("/");
    const matchesDynamicShape = target.includes("__dynamic__") && routes.some(route => {
      const registered = route.replace(/\/$/, "").split("/");
      return registered.length === segments.length && registered.every((segment, index) =>
        segment.startsWith(":") || segments[index] === "__dynamic__" || segment === segments[index]);
    });
    if (!patterns.some(pattern => pattern.test(target)) && !matchesDynamicShape) broken.push(`${file}: ${target}`);
  };
  const targets = (node: ts.Expression): string[] => {
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map(span => `__dynamic__${span.literal.text}`).join("")];
    if (ts.isConditionalExpression(node)) return [...targets(node.whenTrue), ...targets(node.whenFalse)];
    return [];
  };
  function scan(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.tsx?$/.test(file) && !/\.(test|spec)\./.test(file)) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/(?:\bto|\bhref)\s*[=:]\s*["'](\/[^"']*)["']/g)) checkTarget(match[1], file);
        const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        function checkExpressions(node: ts.Node) {
          let expression: ts.Expression | undefined;
          if (ts.isJsxAttribute(node) && ["to", "href"].includes(node.name.getText(tree)) && node.initializer && ts.isJsxExpression(node.initializer)) expression = node.initializer.expression;
          if (ts.isCallExpression(node) && node.expression.getText(tree) === "navigate") expression = node.arguments[0];
          if (expression) for (const target of targets(expression)) { expressionTargets++; checkTarget(target, file); }
          ts.forEachChild(node, checkExpressions);
        }
        checkExpressions(tree);
      }
    }
  }
  scan("src");
  expect(checked).toBeGreaterThan(80);
  expect(expressionTargets).toBeGreaterThan(40);
  expect(broken).toEqual([]);
});
