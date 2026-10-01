import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const ALLOWED_WRITER = "src/lib/platform/audit.server.ts";
const SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx)$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : SOURCE_EXTENSIONS.test(entry.name)
        ? [path]
        : [];
  });
}

function hasDirectAuditMutation(source: string): boolean {
  let cursor = 0;
  const needle = "mission_audit_logs";
  while ((cursor = source.indexOf(needle, cursor)) !== -1) {
    const window = source.slice(Math.max(0, cursor - 180), cursor + 1200);
    if (/\.from\(\s*["']mission_audit_logs["']\s*\)[\s\S]{0,1000}?\.(?:insert|upsert|update|delete)\s*\(/.test(window)) {
      return true;
    }
    cursor += needle.length;
  }
  return false;
}

describe("mission audit write boundary", () => {
  it("routes all audit-log mutations through the server-only audit writer", () => {
    const offenders = sourceFiles(ROOT)
      .map((path) => ({
        path: relative(process.cwd(), path).replaceAll("\\", "/"),
        source: readFileSync(path, "utf8"),
      }))
      .filter(({ path }) => path !== ALLOWED_WRITER)
      .filter(({ source }) => hasDirectAuditMutation(source))
      .map(({ path }) => path)
      .sort();

    expect(offenders).toEqual([]);
  });
});
