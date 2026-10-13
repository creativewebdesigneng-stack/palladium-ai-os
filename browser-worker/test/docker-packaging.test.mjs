import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const worker = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = fs.readFileSync(path.join(worker, "Dockerfile"), "utf8");
function copiedFiles(source) {
  const names = new Set();
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("COPY ")) continue;
    const segments = line.slice(5).trim().split(/\s+/);
    if (segments.length < 2 || segments.some(x => x.startsWith("--"))) continue;
    for (const file of segments.slice(0, -1)) names.add(file.replace(/^\.\//, ""));
  }
  return names;
}
const copied = copiedFiles(dockerfile);
function localImports(file) {
  const content = fs.readFileSync(path.join(worker, file), "utf8");
  const imports = /(?:\bfrom\s*|\bimport\s*\(|^\s*import\s*)["'](\.[^"']+)["']/gm;
  const deps = [];
  let match;
  while ((match = imports.exec(content))) {
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
    assert.ok(!relative.startsWith("../"), "Browser worker must not import files outside its Docker context.");
    deps.push(relative);
  }
  return deps;
}
test("Docker build context includes every transitive local ES module, not just server.mjs", () => {
  const seen = new Set();
  const queue = ["server.mjs"];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    assert.ok(fs.existsSync(path.join(worker, file)), `Missing source: ${file}`);
    assert.ok(copied.has(file), `Dockerfile omits imported module ${file}; container would crash at startup.`);
    queue.push(...localImports(file));
  }
  assert.ok(seen.has("dom-snapshot.mjs"));
  assert.ok(seen.has("qa-inspection.mjs"));
  assert.ok(seen.has("storage-state.mjs"));
});
