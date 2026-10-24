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
  function scan(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.tsx?$/.test(file) && !/\.(test|spec)\./.test(file)) {
        for (const match of readFileSync(file, "utf8").matchAll(/(?:\bto|\bhref)\s*[=:]\s*["'](\/[^"']*)["']/g)) {
          const target = match[1].split(/[?#]/)[0];
          if (!target || target.startsWith("/api/")) continue;
          checked++;
          if (!patterns.some(pattern => pattern.test(target))) broken.push(`${file}: ${target}`);
        }
      }
    }
  }
  scan("src");
  expect(checked).toBeGreaterThan(80);
  expect(broken).toEqual([]);
});
