import { describe, expect, it, vi } from "vitest";
import {
  assertPublicMcpEndpoint,
  callExternalMcpTool,
  listExternalMcpTools,
  validateExternalMcpEndpoint,
} from "../external-mcp.server";

const publicLookup = async () => [{ address: "203.0.113.10", family: 4 }];

function fakeSb(overrides: Record<string, unknown> = {}) {
  const server = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "user-1",
    org_id: null,
    name: "Docs MCP",
    slug: "docs",
    endpoint_url: "https://mcp.example.com/rpc",
    auth_header_name: null,
    auth_header_ciphertext: null,
    enabled: true,
    requires_approval: true,
    allowed_tool_names: [],
    ...overrides,
  };
  const updates: Record<string, unknown>[] = [];
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    maybeSingle: vi.fn(async () => ({ data: server, error: null })),
    update: vi.fn((value: Record<string, unknown>) => {
      updates.push(value);
      return table;
    }),
  };
  return { sb: { from: vi.fn(() => table) }, updates };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

describe("external MCP endpoint security", () => {
  it("accepts only credential-free HTTPS public host syntax", () => {
    expect(validateExternalMcpEndpoint("https://mcp.example.com/rpc").toString()).toBe(
      "https://mcp.example.com/rpc",
    );
    for (const value of [
      "http://mcp.example.com/rpc",
      "https://localhost/rpc",
      "https://127.0.0.1/rpc",
      "https://10.0.0.2/rpc",
      "https://192.168.1.2/rpc",
      "https://169.254.169.254/latest/meta-data",
      "https://metadata.google.internal/computeMetadata/v1",
      "https://user:pass@mcp.example.com/rpc",
      "https://[::1]/rpc",
    ]) {
      expect(() => validateExternalMcpEndpoint(value), value).toThrow();
    }
  });

  it("rejects DNS answers containing private addresses", async () => {
    const endpoint = validateExternalMcpEndpoint("https://mcp.example.com/rpc");
    await expect(
      assertPublicMcpEndpoint(endpoint, async () => [
        { address: "203.0.113.10", family: 4 },
        { address: "10.0.0.7", family: 4 },
      ]),
    ).rejects.toThrow(/private/);
    await expect(assertPublicMcpEndpoint(endpoint, publicLookup)).resolves.toBeUndefined();
  });
});

describe("external MCP protocol boundary", () => {
  it("initialises, discovers bounded tools, applies the allow-list and updates the cache", async () => {
    const { sb, updates } = fakeSb({ allowed_tool_names: ["search"] });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: {} } },
          { headers: { "mcp-session-id": "session-1" } },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          jsonrpc: "2.0",
          id: 2,
          result: {
            tools: [
              { name: "search", description: "Search docs", inputSchema: { type: "object" } },
              { name: "write", description: "Write docs", inputSchema: { type: "object" } },
            ],
          },
        }),
      );

    const result = await listExternalMcpTools({
      sb: sb as never,
      userId: "user-1",
      serverId: "11111111-1111-4111-8111-111111111111",
      options: { fetchImpl: fetchImpl as never, lookupImpl: publicLookup },
    });

    expect(result.tools.map((tool) => tool.name)).toEqual(["search"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect((fetchImpl.mock.calls[1]?.[1]?.headers as Record<string, string>)["Mcp-Session-Id"]).toBe(
      "session-1",
    );
    expect(updates[0]?.["cached_tools"]).toEqual([
      { name: "search", description: "Search docs", inputSchema: { type: "object" } },
    ]);
  });

  it("fails closed on redirects", async () => {
    const { sb } = fakeSb();
    const fetchImpl = vi.fn(async () => new Response("", { status: 302, headers: { location: "https://127.0.0.1/" } }));
    await expect(
      listExternalMcpTools({
        sb: sb as never,
        userId: "user-1",
        serverId: "11111111-1111-4111-8111-111111111111",
        options: { fetchImpl: fetchImpl as never, lookupImpl: publicLookup },
      }),
    ).rejects.toThrow(/redirect/);
  });

  it("refuses a tool call before network dispatch when approval is required", async () => {
    const { sb } = fakeSb({ requires_approval: true });
    const fetchImpl = vi.fn();
    await expect(
      callExternalMcpTool({
        sb: sb as never,
        userId: "user-1",
        serverId: "11111111-1111-4111-8111-111111111111",
        toolName: "write",
        input: { value: "x" },
        options: { fetchImpl: fetchImpl as never, lookupImpl: publicLookup },
      }),
    ).rejects.toThrow(/approval/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
