import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({
  getIntegrationAccessToken: vi.fn(),
  getIntegrationProviderConfig: vi.fn(),
  normaliseSalesforceInstanceUrl: vi.fn((value: unknown) =>
    typeof value === "string" && value === "https://acme.my.salesforce.com" ? value : null,
  ),
}));
vi.mock("./oauth.server", () => oauth);

import {
  SalesforceIntegrationError,
  searchSalesforceAccounts,
  searchSalesforceOpportunities,
} from "./salesforce.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("sf-token");
  oauth.getIntegrationProviderConfig.mockResolvedValue({
    instance_url: "https://acme.my.salesforce.com",
  });
});

function providerFetch(records: any[]) {
  const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push([input, init]);
    const url = String(input);
    if (url.endsWith("/services/data/")) {
      return new Response(JSON.stringify([{ version: "66.0" }, { version: "67.0" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ records }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

describe("Salesforce CRM executor", () => {
  it("uses the tenant instance URL and latest supported REST version for account search", async () => {
    const { calls, fetchImpl } = providerFetch([
      {
        Id: "001ABC",
        Name: "Acme Ltd",
        Industry: "Technology",
        AnnualRevenue: 1250000,
      },
    ]);

    const accounts = await searchSalesforceAccounts({
      userId: "user-1",
      query: "Acme",
      fetchImpl,
    });

    expect(accounts[0]).toMatchObject({
      id: "001ABC",
      name: "Acme Ltd",
      industry: "Technology",
      annualRevenue: 1250000,
    });
    expect(String(calls[0]![0])).toBe("https://acme.my.salesforce.com/services/data/");
    expect(String(calls[1]![0])).toContain("https://acme.my.salesforce.com/services/data/v67.0/query?q=");
    expect(decodeURIComponent(String(calls[1]![0]))).toContain("FROM Account WHERE Name LIKE '%Acme%'");
    expect((calls[1]![1]?.headers as Record<string, string>)["Authorization"]).toBe("Bearer sf-token");
  });

  it("normalises opportunity results", async () => {
    const { fetchImpl } = providerFetch([
      {
        Id: "006ABC",
        Name: "Enterprise Renewal",
        StageName: "Negotiation/Review",
        Amount: 50000,
        Probability: 70,
        CloseDate: "2026-09-30",
        Account: { Name: "Acme Ltd" },
      },
    ]);

    const opportunities = await searchSalesforceOpportunities({
      userId: "user-1",
      query: "Renewal",
      fetchImpl,
    });
    expect(opportunities[0]).toMatchObject({
      id: "006ABC",
      name: "Enterprise Renewal",
      amount: 50000,
      probability: 70,
      accountName: "Acme Ltd",
    });
  });

  it("sanitises search text rather than accepting arbitrary SOQL", async () => {
    const { calls, fetchImpl } = providerFetch([]);
    await searchSalesforceAccounts({
      userId: "user-1",
      query: "Acme' OR Name LIKE '%'",
      fetchImpl,
    });
    const queryUrl = decodeURIComponent(String(calls[1]![0]));
    expect(queryUrl).not.toContain("OR Name LIKE");
    expect(queryUrl).toContain("Acme OR Name LIKE");
  });

  it("fails closed when tenant API metadata is absent", async () => {
    oauth.getIntegrationProviderConfig.mockResolvedValue({});
    await expect(
      searchSalesforceAccounts({
        userId: "user-1",
        query: "Acme",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SalesforceIntegrationError);
  });
});
