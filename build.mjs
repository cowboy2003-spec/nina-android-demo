import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const source = "demo";
const output = "dist";
const assets = ["index.html", "demo.css", "icon.svg", "_headers"];
const modules = ["demo.ts", "main.ts"];
const forbidden = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "navigator", "cookie", "localStorage", "sessionStorage", "indexedDB", "caches", "Notification", "MediaRecorder", "Audio", "speechSynthesis", "RTCPeerConnection", "Worker", "SharedWorker", "eval", "Function"]);
function compile(name, content) {
  const tree = ts.createSourceFile(name, content, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  function inspect(node) {
    if ((ts.isIdentifier(node) && forbidden.has(node.text)) || ts.isImportEqualsDeclaration(node) ||
      (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) ||
      (ts.isExportDeclaration(node) && node.moduleSpecifier)) throw Error("DEMO_CAPABILITY_REJECTED");
    if (ts.isImportDeclaration(node) && (name !== "main.ts" || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== "./demo.js")) throw Error("DEMO_IMPORT_REJECTED");
    ts.forEachChild(node, inspect);
  }
  inspect(tree);
  const result = ts.transpileModule(content, { fileName: name, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, sourceMap: false, removeComments: true } });
  if (result.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error)) throw Error("DEMO_COMPILE_FAILED");
  return result.outputText;
}
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const name of assets) await writeFile(join(output, name), await readFile(join(source, name)));
for (const name of modules) {
  const content = await readFile(join(source, name), "utf8");
  await writeFile(join(output, name.replace(/\.ts$/, ".js")), compile(name, content));
}
console.log("DEMO estática isolada: exatamente seis ficheiros em dist/.");
