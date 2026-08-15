import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aggregateIntegrationRows } from "../admin-integrations.functions";

describe("admin integration overview", () => {
  it("aggregates persisted connection states per provider", () => {
    const rows = [
      { id: "1", user_id: "u1", provider: "google", status: "connected" },
      { id: "2", user_id: "u2", provider: "google", status: "error" },
      { id: "3", user_id: "u3", provider: "google", status: "pending" },
      { id: "4", user_id: "u4", provider: "slack", status: "disconnected" },
    ];
    const result = aggregateIntegrationRows(rows);
    expect(result.get("google")).toEqual({ total: 3, connected: 1, errors: 1, pending: 1, disconnected: 0 });
    expect(result.get("slack")).toEqual({ total: 1, connected: 0, errors: 0, pending: 0, disconnected: 1 });
  });

  it("does not select or expose OAuth credential fields", () => {
    const source = readFileSync("src/lib/admin/admin-integrations.functions.ts", "utf8");
    expect(source).not.toContain("access_token_ciphertext");
    expect(source).not.toContain("refresh_token_ciphertext");
    expect(source).not.toContain("client_secret");
    expect(source).not.toContain("integration_credentials");
  });

  it("replaces the placeholder admin integrations screen", () => {
    const screen = readFileSync("src/screens/AdminIntegrations.jsx", "utf8");
    expect(screen).toContain("listAdminIntegrationOverview");
    expect(screen).not.toContain("Not configured yet");
    expect(screen).not.toContain("not yet wired to a backend");
  });
});
