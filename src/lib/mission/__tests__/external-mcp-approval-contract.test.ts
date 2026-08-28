import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../external-action-approval.functions.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

describe("external MCP approval dispatcher contract", () => {
  it("routes approved MCP actions through the user-scoped executor", () => {
    expect(source).toContain('import { executeApprovedAgentMcpAction } from "@/lib/mcp/approved-agent-mcp-action.server"');
    expect(source).toContain('"external_mcp_action"');
    expect(source).toContain("executeApprovedAgentMcpAction({ sb, userId, details })");
  });

  it("claims approval before dispatch and reuses immutable details for retry", () => {
    const pendingClaim = source.indexOf('.eq("status", "pending")\n      .select("*")');
    const dispatch = source.indexOf("const execution = await executeExternalAction(");
    expect(pendingClaim).toBeGreaterThan(-1);
    expect(dispatch).toBeGreaterThan(pendingClaim);

    expect(source).toContain('.eq("execution_status", "failed")');
    expect(source).toContain("safeDetails(claim.data.details)");
  });
});
