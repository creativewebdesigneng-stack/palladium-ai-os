/**
 * Read-only dispatcher for user-connected services.
 *
 * Security invariants:
 *  - The model never supplies a URL, HTTP method, header, OAuth token or GitHub installation id.
 *  - Every provider/action pair is explicitly allow-listed below.
 *  - Inputs are length/bounds checked before an outbound request is built.
 *  - Only read semantics are exposed. Some providers (Notion/Linear) require
 *    POST for search/GraphQL, but the request body is a fixed read-only query.
 *  - OAuth tokens and GitHub App installation tokens are resolved server-side
 *    and are never returned to the model.
 */
import { getIntegrationAccessToken } from "./oauth.server";
import { findProvider } from "./providers";

export type ConnectedServiceInput = {
  provider: string;
  action: string;
  query?: string;
  resource_id?: string;
  repository?: string;
  path?: string;
  ref?: string;
  limit?: number;
};

type RequestSpec = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
};

const MAX_QUERY = 200;
const MAX_RESOURCE_ID = 160;
const MAX_RESPONSE_CHARS = 18_000;
const MIN_LIMIT = 1;
const MAX_LIMIT = 25;

export const CONNECTED_SERVICE_ACTIONS: Record<string, readonly string[]> = {
  google: ["calendar_upcoming", "drive_search"],
  microsoft: ["calendar_upcoming", "onedrive_search", "mail_search"],
  slack: ["channels_list", "channel_history"],
  hubspot: ["contacts_list", "deals_list"],
  notion: ["search"],
  asana: ["workspaces_list", "project_tasks"],
  linear: ["issues_search"],
  github: ["repositories_list", "branches_list", "commits_list", "path_list", "file_read"],
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedLimit(value: unknown): number {
  const parsed = Number(value ?? 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.trunc(parsed)));
}

function requireResourceId(input: ConnectedServiceInput): string {
  const id = clean(input.resource_id, MAX_RESOURCE_ID);
  if (!id) throw new Error(`Action "${input.action}" requires resource_id.`);
  return id;
}

/** Pure request builder for fixed OAuth-provider reads. GitHub App reads use the dedicated server adapter. */
export function buildConnectedServiceRequest(input: ConnectedServiceInput): RequestSpec {
  const provider = clean(input.provider, 40).toLowerCase();
  const action = clean(input.action, 80).toLowerCase();
  const query = clean(input.query, MAX_QUERY);
  const limit = boundedLimit(input.limit);
  if (!provider || !action) throw new Error("provider and action are required.");
  if (!CONNECTED_SERVICE_ACTIONS[provider]?.includes(action)) {
    throw new Error(`Action "${action}" is not available for connected provider "${provider}".`);
  }

  switch (`${provider}:${action}`) {
    case "google:calendar_upcoming": {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", new Date().toISOString());
      url.searchParams.set("maxResults", String(limit));
      if (query) url.searchParams.set("q", query);
      return { url: url.toString() };
    }
    case "google:drive_search": {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("pageSize", String(limit));
      url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken");
      url.searchParams.set("orderBy", "modifiedTime desc");
      if (query) {
        const escaped = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        url.searchParams.set("q", `name contains '${escaped}' and trashed = false`);
      }
      return { url: url.toString() };
    }
    case "microsoft:calendar_upcoming": {
      const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
      url.searchParams.set("startDateTime", new Date().toISOString());
      url.searchParams.set("endDateTime", new Date(Date.now() + 30 * 86_400_000).toISOString());
      url.searchParams.set("$top", String(limit));
      url.searchParams.set("$select", "id,subject,start,end,location,webLink");
      url.searchParams.set("$orderby", "start/dateTime");
      return { url: url.toString(), headers: { Prefer: 'outlook.timezone="UTC"' } };
    }
    case "microsoft:onedrive_search": {
      const safeQuery = (query || "*").replace(/'/g, "''");
      const url = new URL(`https://graph.microsoft.com/v1.0/me/drive/root/search(q='${safeQuery}')`);
      url.searchParams.set("$top", String(limit));
      url.searchParams.set("$select", "id,name,size,lastModifiedDateTime,webUrl,file,folder");
      return { url: url.toString() };
    }
    case "microsoft:mail_search": {
      const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
      url.searchParams.set("$top", String(limit));
      url.searchParams.set("$select", "id,subject,from,receivedDateTime,isRead,webLink");
      url.searchParams.set("$orderby", "receivedDateTime desc");
      if (query) url.searchParams.set("$search", `\"${query.replace(/\"/g, "")}\"`);
      return { url: url.toString(), headers: { ConsistencyLevel: "eventual" } };
    }
    case "slack:channels_list": {
      const url = new URL("https://slack.com/api/conversations.list");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("exclude_archived", "true");
      url.searchParams.set("types", "public_channel,private_channel");
      return { url: url.toString() };
    }
    case "slack:channel_history": {
      const channel = requireResourceId(input);
      const url = new URL("https://slack.com/api/conversations.history");
      url.searchParams.set("channel", channel);
      url.searchParams.set("limit", String(limit));
      return { url: url.toString() };
    }
    case "hubspot:contacts_list": {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("properties", "firstname,lastname,email,company,jobtitle,lastmodifieddate");
      return { url: url.toString() };
    }
    case "hubspot:deals_list": {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/deals");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("properties", "dealname,amount,dealstage,closedate,pipeline,hs_lastmodifieddate");
      return { url: url.toString() };
    }
    case "notion:search":
      return {
        url: "https://api.notion.com/v1/search",
        method: "POST",
        headers: { "Notion-Version": "2026-03-11", "Content-Type": "application/json" },
        body: JSON.stringify({ ...(query ? { query } : {}), page_size: limit, sort: { direction: "descending", timestamp: "last_edited_time" } }),
      };
    case "asana:workspaces_list":
      return { url: "https://app.asana.com/api/1.0/workspaces?opt_fields=gid,name,is_organization" };
    case "asana:project_tasks": {
      const project = requireResourceId(input);
      const url = new URL(`https://app.asana.com/api/1.0/projects/${encodeURIComponent(project)}/tasks`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("opt_fields", "gid,name,completed,due_on,assignee.name,permalink_url");
      return { url: url.toString() };
    }
    case "linear:issues_search": {
      const gql = `query ConnectedIssues($first: Int!, $query: String!) { issues(first: $first, filter: { or: [{ title: { containsIgnoreCase: $query } }, { description: { containsIgnoreCase: $query } }] }, orderBy: updatedAt) { nodes { id identifier title priority state { name } assignee { name } updatedAt url } } }`;
      return {
        url: "https://api.linear.app/graphql",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: gql, variables: { first: limit, query } }),
      };
    }
    default:
      throw new Error("Unsupported connected-service operation.");
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return { text: text.slice(0, MAX_RESPONSE_CHARS) }; }
}

function truncate(value: unknown): unknown {
  const text = JSON.stringify(value ?? null);
  if (text.length <= MAX_RESPONSE_CHARS) return value;
  return { truncated: true, preview: text.slice(0, MAX_RESPONSE_CHARS) };
}

export async function readConnectedService(userId: string, input: ConnectedServiceInput, signal?: AbortSignal): Promise<unknown> {
  const providerId = clean(input.provider, 40).toLowerCase();
  const action = clean(input.action, 80).toLowerCase();

  if (providerId === "github") {
    const { readConnectedGitHubService } = await import("./github-connected-service.server");
    // `resource_id` and `query` remain accepted as compatibility aliases because
    // the current runtime tool schema already exposes those fields. This makes
    // GitHub repository reads usable before clients adopt repository/path/ref.
    const repository = input.repository ?? input.resource_id;
    const path = input.path ?? ((action === "path_list" || action === "file_read") ? input.query : undefined);
    const ref = input.ref ?? (action === "commits_list" ? input.query : undefined);
    return readConnectedGitHubService(userId, {
      action,
      ...(repository === undefined ? {} : { repository }),
      ...(path === undefined ? {} : { path }),
      ...(ref === undefined ? {} : { ref }),
      ...(input.limit === undefined ? {} : { limit: input.limit }),
    });
  }

  const provider = findProvider(providerId);
  if (!provider) return { error: "Unknown integration provider." };
  if (!CONNECTED_SERVICE_ACTIONS[providerId]) return { error: `${provider.name} does not yet expose a read-only agent connector.` };

  let spec: RequestSpec;
  try { spec = buildConnectedServiceRequest({ ...input, provider: providerId }); }
  catch (error) { return { error: (error as Error).message }; }

  const accessToken = await getIntegrationAccessToken(userId, providerId);
  if (!accessToken) return { error: `${provider.name} is not connected, has expired, or needs to be reconnected.` };

  try {
    const response = await fetch(spec.url, {
      method: spec.method ?? "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...spec.headers },
      ...(spec.body ? { body: spec.body } : {}),
      signal: signal ?? AbortSignal.timeout(20_000),
    });
    const text = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
    const payload = safeJson(text);
    if (!response.ok) return { error: `${provider.name} returned ${response.status}.`, status: response.status, details: truncate(payload) };
    return { provider: providerId, action, read_only: true, data: truncate(payload) };
  } catch (error) {
    if ((error as Error).name === "AbortError" || (error as Error).name === "TimeoutError") return { error: `${provider.name} request timed out.` };
    return { error: `${provider.name} could not be reached.` };
  }
}
