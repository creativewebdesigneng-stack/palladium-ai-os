import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "src/lib/integrations/nango.server.ts"), "utf8");
const functions = fs.readFileSync(
  path.join(root, "src/lib/integrations/nango.functions.ts"),
  "utf8",
);
const integrationsScreen = fs.readFileSync(path.join(root, "src/screens/Integrations.jsx"), "utf8");

describe("Nango integration pilot", () => {
  it("keeps the Nango secret server-side and tags connections with the Palladium user", () => {
    expect(server).toContain('process.env["NANGO_SECRET_KEY"]');
    expect(server).toContain("end_user_id: user.id");
    expect(server).not.toContain("VITE_NANGO_SECRET");
  });

  it("uses a short-lived connect session and an allow-listed GitHub integration", () => {
    expect(server).toContain(
      'storedConnectionId ? "/connect/sessions/reconnect" : "/connect/sessions"',
    );
    expect(server).toContain("allowed_integrations: [NANGO_GITHUB_INTEGRATION]");
    expect(server).toContain("result?.data?.token");
    expect(server).not.toContain("connect_link");
  });

  it("proves the credential through Nango proxy rather than exposing a provider token", () => {
    expect(server).toContain('"tags[end_user_id]": userId');
    expect(server).toContain('nangoFetch("/proxy/user"');
    expect(server).toContain('"Connection-Id"');
    expect(server).toContain('"Provider-Config-Key"');
    expect(functions).not.toMatch(/access[_-]?token/i);
    expect(functions).not.toMatch(/refresh[_-]?token/i);
  });

  it("requires authenticated Palladium requests for every browser-facing operation", () => {
    expect((functions.match(/middleware\(\[requireSupabaseAuth\]\)/g) ?? []).length).toBe(4);
  });

  it("exposes the Nango pilot without replacing the native GitHub integration", () => {
    expect(integrationsScreen).toContain("getGitHubConnection");
    expect(integrationsScreen).toContain("getNangoGitHubConnection");
    expect(integrationsScreen).toContain("GitHub via Nango");
    expect(integrationsScreen).toContain("openConnectUI");
    expect(integrationsScreen).toContain("setSessionToken(result.sessionToken)");
  });

  it("supports owner-scoped reconnect and disconnect without accepting a browser connection id", () => {
    expect(server).toContain('"/connect/sessions/reconnect"');
    expect(server).toContain("disconnectOwnedNangoGitHubConnection(userId: string)");
    expect(server).toContain("provider_config_key: integrationId");
    expect(functions).toContain("disconnectNangoGitHubConnection");
    expect(functions).not.toMatch(/connectionId.*inputValidator/s);
    expect(integrationsScreen).toContain("await disconnectNangoGitHubConnection()");
  });
});
