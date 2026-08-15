import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { searchHubSpotContacts, searchHubSpotDeals } from "./hubspot.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("hubspot-token");
});

describe("HubSpot CRM executor", () => {
  it("searches contacts through the versioned CRM endpoint", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          total: 1,
          results: [
            {
              id: "101",
              createdAt: "2026-08-01T10:00:00Z",
              updatedAt: "2026-08-10T10:00:00Z",
              properties: {
                firstname: "Ada",
                lastname: "Lovelace",
                email: "ada@example.com",
                company: "Analytical Engines Ltd",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await searchHubSpotContacts({
      userId: "user-1",
      query: "Ada",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.contacts[0]).toMatchObject({
      id: "101",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });
    const [url, init] = calls[0]!;
    expect(String(url)).toBe("https://api.hubapi.com/crm/objects/2026-03/contacts/search");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer hubspot-token");
    expect(JSON.parse(String(init?.body)).properties).toContain("email");
  });

  it("normalises deal values without exposing write capability", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          total: 1,
          results: [
            {
              id: "202",
              properties: {
                dealname: "Renewal",
                amount: "12500.50",
                dealstage: "contractsent",
                pipeline: "default",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await searchHubSpotDeals({
      userId: "user-1",
      query: "Renewal",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.deals[0]).toMatchObject({ id: "202", name: "Renewal", amount: 12500.5 });
    const [, init] = calls[0]!;
    expect(init?.method).toBe("POST");
  });

  it("fails closed without a connected HubSpot token", async () => {
    oauth.getIntegrationAccessToken.mockResolvedValue(null);
    await expect(
      searchHubSpotContacts({
        userId: "user-1",
        query: "Ada",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
