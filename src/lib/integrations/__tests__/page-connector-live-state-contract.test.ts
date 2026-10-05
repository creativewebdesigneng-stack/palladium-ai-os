import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("page connector live-state contract", () => {
  const integrationSource = fs.readFileSync(
    path.resolve("src/lib/integrations/integrations.functions.ts"),
    "utf8",
  );
  const guideSource = fs.readFileSync(
    path.resolve("src/components/integrations/PageConnectorGuide.jsx"),
    "utf8",
  );

  it("uses the existing integration health policy before showing a direct provider as connected", () => {
    expect(integrationSource).toContain("assessIntegrationHealth({");
    expect(integrationSource).toContain("directHealth?.healthy === true");
    expect(integrationSource).toContain("githubInstallationValid");
  });

  it("requires a persisted Nango connection id before showing a Nango provider as connected", () => {
    expect(integrationSource).toContain('nangoRow?.status === "connected"');
    expect(integrationSource).toContain("Boolean(nangoRow?.config?.connection_id)");
  });

  it("returns safe connection metadata without returning credential material", () => {
    const responseBlock = integrationSource.slice(
      integrationSource.indexOf("export const getPageConnectorConnectionState"),
      integrationSource.indexOf("export const testIntegrationConnection"),
    );
    expect(responseBlock).toContain("accountLabel");
    expect(responseBlock).toContain("transport");
    expect(responseBlock).not.toMatch(/accessToken|refreshTokenCiphertext|clientSecret|privateKey/);
  });

  it("derives runtime action counts from the existing provider-neutral agent integration runtime", () => {
    expect(integrationSource).toContain('import("./agent-integration-runtime.server")');
    expect(integrationSource).toContain("listIntegrationCapabilities(");
    expect(integrationSource).toContain("capabilityCount");
    expect(integrationSource).toContain("deployedCapabilityCount");
    expect(integrationSource).toContain("approvalCapabilityCount");
    expect(integrationSource).toContain('capabilityState: "unavailable"');
  });

  it("renders connected as an overlay state and preserves target/candidate fallback", () => {
    expect(guideSource).toContain('connected: "Connected"');
    expect(guideSource).toContain('connection?.connected ? "connected" : connector.state');
    expect(guideSource).toContain("runtimeActionCount");
    expect(guideSource).toContain("runtime action(s) discovered");
    expect(guideSource).toContain("Candidate means the provider is a recommended external integration");
  });
});
