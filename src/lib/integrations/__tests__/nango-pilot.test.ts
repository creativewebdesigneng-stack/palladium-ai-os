import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "src/lib/integrations/nango.server.ts"), "utf8");
const functions = fs.readFileSync(path.join(root, "src/lib/integrations/nango.functions.ts"), "utf8");

describe("Nango integration pilot", () => {
  it("keeps the Nango secret server-side and tags connections with the Palladium user", () => {
    expect(server).toContain("process.env.NANGO_SECRET_KEY");
    expect(server).toContain("end_user_id: user.id");
    expect(server).not.toContain("VITE_NANGO_SECRET");
  });

  it("uses a short-lived connect session and an allow-listed GitHub integration", () => {
    expect(server).toContain('nangoFetch("/connect/sessions"');
    expect(server).toContain("allowed_integrations: [NANGO_GITHUB_INTEGRATION]");
  });

  it("proves the credential through Nango proxy rather than exposing a provider token", () => {
    expect(server).toContain('nangoFetch("/proxy/user"');
    expect(server).toContain('"Connection-Id"');
    expect(server).toContain('"Provider-Config-Key"');
    expect(functions).not.toMatch(/access[_-]?token/i);
    expect(functions).not.toMatch(/refresh[_-]?token/i);
  });

  it("requires authenticated Palladium requests for every browser-facing operation", () => {
    expect((functions.match(/middleware\(\[requireSupabaseAuth\]\)/g) ?? []).length).toBe(3);
  });
});
