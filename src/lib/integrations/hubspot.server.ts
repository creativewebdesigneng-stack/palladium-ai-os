/**
 * HubSpot CRM provider executor. Server-only and read-only.
 *
 * Uses the encrypted OAuth token store. PalladiumAI currently requests contact
 * and deal read scopes only, so this module intentionally exposes no company
 * access and no CRM writes.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const HUBSPOT = "https://api.hubapi.com";
const CRM_VERSION = "2026-03";

type FetchLike = typeof fetch;

export class HubSpotIntegrationError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "HubSpotIntegrationError";
  }
}

async function hubspotFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const token = await getIntegrationAccessToken(userId, "hubspot");
  if (!token) {
    throw new HubSpotIntegrationError(
      "HubSpot is not connected, or the connection needs to be renewed.",
      401,
    );
  }

  const response = await fetchImpl(`${HUBSPOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (response.ok) return response;

  let reason = "HubSpot CRM request failed.";
  try {
    const payload = (await response.json()) as any;
    reason = String(payload?.message ?? payload?.error?.message ?? payload?.error ?? reason);
  } catch {
    /* provider error body is optional */
  }
  throw new HubSpotIntegrationError(reason.slice(0, 300), response.status);
}

function boundedQuery(value: string): string {
  const query = String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!query) throw new HubSpotIntegrationError("A HubSpot search query is required.");
  return query.slice(0, 1000);
}

function finiteAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export type HubSpotContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function searchHubSpotContacts(args: {
  userId: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ contacts: HubSpotContact[]; total: number; nextAfter: string | null }> {
  const query = boundedQuery(args.query);
  const limit = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);
  const init: RequestInit = {
    method: "POST",
    body: JSON.stringify({
      query,
      limit,
      properties: [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "jobtitle",
        "lifecyclestage",
      ],
    }),
    ...(args.signal ? { signal: args.signal } : {}),
  };
  const response = await hubspotFetch(
    args.userId,
    `/crm/objects/${CRM_VERSION}/contacts/search`,
    init,
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return {
    contacts: results.slice(0, limit).map((row: any) => {
      const p = row?.properties ?? {};
      return {
        id: String(row?.id ?? ""),
        firstName: p.firstname ? String(p.firstname).slice(0, 200) : null,
        lastName: p.lastname ? String(p.lastname).slice(0, 200) : null,
        email: p.email ? String(p.email).slice(0, 320) : null,
        phone: p.phone ? String(p.phone).slice(0, 100) : null,
        company: p.company ? String(p.company).slice(0, 300) : null,
        jobTitle: p.jobtitle ? String(p.jobtitle).slice(0, 300) : null,
        lifecycleStage: p.lifecyclestage ? String(p.lifecyclestage).slice(0, 120) : null,
        createdAt: row?.createdAt ? String(row.createdAt) : null,
        updatedAt: row?.updatedAt ? String(row.updatedAt) : null,
      };
    }),
    total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : results.length,
    nextAfter: payload?.paging?.next?.after ? String(payload.paging.next.after).slice(0, 500) : null,
  };
}

export type HubSpotDeal = {
  id: string;
  name: string | null;
  amount: number | null;
  stage: string | null;
  pipeline: string | null;
  closeDate: string | null;
  type: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function searchHubSpotDeals(args: {
  userId: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ deals: HubSpotDeal[]; total: number; nextAfter: string | null }> {
  const query = boundedQuery(args.query);
  const limit = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);
  const init: RequestInit = {
    method: "POST",
    body: JSON.stringify({
      query,
      limit,
      properties: [
        "dealname",
        "amount",
        "dealstage",
        "pipeline",
        "closedate",
        "dealtype",
        "description",
      ],
    }),
    ...(args.signal ? { signal: args.signal } : {}),
  };
  const response = await hubspotFetch(
    args.userId,
    `/crm/objects/${CRM_VERSION}/deals/search`,
    init,
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return {
    deals: results.slice(0, limit).map((row: any) => {
      const p = row?.properties ?? {};
      return {
        id: String(row?.id ?? ""),
        name: p.dealname ? String(p.dealname).slice(0, 300) : null,
        amount: finiteAmount(p.amount),
        stage: p.dealstage ? String(p.dealstage).slice(0, 200) : null,
        pipeline: p.pipeline ? String(p.pipeline).slice(0, 200) : null,
        closeDate: p.closedate ? String(p.closedate).slice(0, 100) : null,
        type: p.dealtype ? String(p.dealtype).slice(0, 200) : null,
        description: p.description ? String(p.description).slice(0, 2000) : null,
        createdAt: row?.createdAt ? String(row.createdAt) : null,
        updatedAt: row?.updatedAt ? String(row.updatedAt) : null,
      };
    }),
    total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : results.length,
    nextAfter: payload?.paging?.next?.after ? String(payload.paging.next.after).slice(0, 500) : null,
  };
}
