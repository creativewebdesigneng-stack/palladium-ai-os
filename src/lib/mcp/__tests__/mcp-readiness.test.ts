import { describe, expect, it, vi } from "vitest";
import {
  normalizeMcpProbeOrigin,
  probeBlackstarMcpRemoteIdentity,
} from "../mcp-readiness.server";

describe("Blackstar remote MCP readiness probe", () => {
  it("accepts valid discovery metadata and the stateless POST transport contract", async () => {
    const origin = "https://blackstar.example.com";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return new Response(JSON.stringify({
          resource: `${origin}/mcp`,
          authorization_servers: ["https://piwhiuangitqvwvwwcga.supabase.co/auth/v1"],
          bearer_methods_supported: ["header"],
          resource_name: "Blackstar",
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: { message: "Method not allowed" },
      }), {
        status: 405,
        headers: { allow: "POST, OPTIONS" },
      });
    }) as typeof fetch;

    const result = await probeBlackstarMcpRemoteIdentity({
      origin,
      fetchImpl,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      provider: "blackstar-remote-mcp",
      configured: true,
      reachable: true,
      healthy: true,
      readySignal: true,
      httpStatus: 200,
      error: null,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails closed when metadata points at the wrong issuer", async () => {
    const origin = "https://blackstar.example.com";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return new Response(JSON.stringify({
          resource: `${origin}/mcp`,
          authorization_servers: ["https://wrong.example.com/auth"],
          bearer_methods_supported: ["header"],
          resource_name: "Blackstar",
        }), { status: 200 });
      }
      return new Response("method not allowed", {
        status: 405,
        headers: { allow: "POST, OPTIONS" },
      });
    }) as typeof fetch;

    const result = await probeBlackstarMcpRemoteIdentity({ origin, fetchImpl });

    expect(result.healthy).toBe(false);
    expect(result.readySignal).toBe(false);
    expect(result.error).toContain("metadata did not match");
  });

  it("rejects non-HTTPS and private probe origins", () => {
    expect(() => normalizeMcpProbeOrigin("http://blackstar.example.com")).toThrow(/HTTPS/);
    expect(() => normalizeMcpProbeOrigin("https://127.0.0.1")).toThrow(/private hosts/);
    expect(() => normalizeMcpProbeOrigin("https://localhost")).toThrow(/private hosts/);
  });
});
