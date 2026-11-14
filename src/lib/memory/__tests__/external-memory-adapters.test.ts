import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteAgentMemory,
  deleteOpenVikingMemory,
  externalMemoryServiceStates,
  openVikingMemoryUriAllowed,
  rememberAgentMemory,
  searchAgentMemory,
  searchOpenViking,
} from "../external-memory-adapters";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("external memory adapters", () => {
  it("stays not-connected when env is absent or the URL is unsafe", () => {
    vi.stubEnv("AGENTMEMORY_BASE_URL", "");
    vi.stubEnv("AGENTMEMORY_SECRET", "");
    vi.stubEnv("OPENVKING_BASE_URL", "");
    vi.stubEnv("OPENVKING_API_KEY", "");
    expect(externalMemoryServiceStates()).toEqual({
      agentmemory: { mode: "not-connected", reason: "AgentMemory URL is not configured." },
      openviking: { mode: "not-connected", reason: "OpenViking URL is not configured." },
    });
    vi.stubEnv("AGENTMEMORY_BASE_URL", "http://example.com");
    vi.stubEnv("AGENTMEMORY_SECRET", "synthetic-secret");
    expect(externalMemoryServiceStates().agentmemory.mode).toBe("not-connected");
    vi.stubEnv("OPENVKING_BASE_URL", "https://user:secret@viking.example/api");
    vi.stubEnv("OPENVKING_API_KEY", "user-key");
    expect(externalMemoryServiceStates().openviking.reason).toContain(
      "must not include credentials",
    );
  });

  it("searches AgentMemory inside the caller project and refuses a cross-project delete", async () => {
    vi.stubEnv("AGENTMEMORY_BASE_URL", "http://127.0.0.1:3111");
    vi.stubEnv("AGENTMEMORY_SECRET", "synthetic-secret");
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(init.headers).toMatchObject({ Authorization: "Bearer synthetic-secret" });
      expect(JSON.stringify(init.body ?? "")).not.toContain("other-tenant");
      if (String(url).endsWith("/agentmemory/search")) {
        const body = JSON.parse(String(init.body));
        expect(body.project).toBe("blackstar:tenant-a");
        return new Response(
          JSON.stringify({ memories: [{ id: "mem-1", content: "Owned fact", score: 0.8 }] }),
        );
      }
      if (String(url).includes("/agentmemory/memories/")) {
        return new Response(
          JSON.stringify({ memory: { id: "mem-1", project: "blackstar:tenant-b" } }),
        );
      }
      return new Response("{}");
    });
    vi.stubGlobal("fetch", request);
    await expect(searchAgentMemory({ tenantId: "tenant-a", query: "owned fact" })).resolves.toEqual(
      [{ id: "mem-1", content: "Owned fact", score: 0.8, source: "agentmemory" }],
    );
    await expect(deleteAgentMemory({ tenantId: "tenant-a", memoryId: "mem-1" })).rejects.toThrow(
      /outside this tenant project/,
    );
    expect(
      request.mock.calls.some(
        ([url, init]) =>
          String(url).includes("governance") && (init as RequestInit).method === "DELETE",
      ),
    ).toBe(false);
  });

  it("requires consent before remembering and only deletes an OpenViking home-memory URI", async () => {
    vi.stubEnv("AGENTMEMORY_BASE_URL", "https://memory.example");
    vi.stubEnv("AGENTMEMORY_SECRET", "synthetic-secret");
    vi.stubEnv("OPENVKING_BASE_URL", "https://viking.example");
    vi.stubEnv("OPENVKING_API_KEY", "user-key");
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (String(url).endsWith("/agentmemory/remember")) {
        expect(JSON.parse(String(init.body)).project).toBe("blackstar:tenant-a");
        return new Response(JSON.stringify({ id: "mem-9" }), { status: 201 });
      }
      if (String(url).includes("/api/v1/search/find")) {
        const body = JSON.parse(String(init.body));
        expect(body.target_uri).toBe("viking://~/memories");
        return new Response(
          JSON.stringify({
            status: "ok",
            result: {
              memories: [{ uri: "viking://~/memories/note", abstract: "Home note", score: 0.4 }],
            },
          }),
        );
      }
      const parsed = new URL(String(url));
      expect(parsed.pathname).toBe("/api/v1/fs");
      expect(parsed.searchParams.get("uri")).toBe("viking://~/memories/note");
      return new Response(JSON.stringify({ status: "ok", result: {} }));
    });
    vi.stubGlobal("fetch", request);
    await expect(
      rememberAgentMemory({
        tenantId: "tenant-a",
        content: "A fact",
        consent: false as unknown as true,
      }),
    ).rejects.toThrow(/explicit consent/);
    await expect(
      rememberAgentMemory({ tenantId: "tenant-a", content: "A fact", consent: true }),
    ).resolves.toEqual({ id: "mem-9" });
    await expect(searchOpenViking({ query: "home note" })).resolves.toMatchObject([
      { id: "viking://~/memories/note", source: "openviking" },
    ]);
    expect(openVikingMemoryUriAllowed("viking://user/other/memories/note")).toBe(false);
    await expect(
      deleteOpenVikingMemory({ uri: "viking://user/other/memories/note" }),
    ).rejects.toThrow(/outside viking:\/\/~\/memories/);
    await expect(deleteOpenVikingMemory({ uri: "viking://~/memories/note" })).resolves.toEqual({
      deleted: true,
    });
  });
});
