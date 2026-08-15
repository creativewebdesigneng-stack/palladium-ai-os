/**
 * Executes an explicit allow-list of external writes after an approval request
 * has been atomically claimed by the authenticated owner.
 *
 * Security invariants:
 * - The model never supplies an arbitrary URL, HTTP method, auth header, token,
 *   SOQL query, or GraphQL document.
 * - Provider/action pairs are fixed below.
 * - OAuth credentials are resolved server-side.
 * - Free text and identifiers are bounded before requests are built.
 * - Email approval creates a provider draft; it never sends mail.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getIntegrationAccessToken } from "./oauth.server";

export type ApprovedActionType =
  | "email_send"
  | "email_draft"
  | "calendar_create"
  | "slack_post"
  | "hubspot_contact_update"
  | "hubspot_deal_update"
  | "asana_task_create"
  | "asana_task_update"
  | "linear_issue_create"
  | "linear_issue_update"
  | "notion_page_create";

export type ApprovedAction = {
  actionType: ApprovedActionType;
  details: Record<string, unknown>;
};

type ApprovedProvider = "google" | "microsoft" | "slack" | "hubspot" | "asana" | "linear" | "notion";

type RequestSpec = {
  provider: ApprovedProvider;
  url: string;
  method: "POST" | "PATCH" | "PUT";
  headers: Record<string, string>;
  body: string;
};

const MAX_EMAIL_BODY = 20_000;
const MAX_SLACK_TEXT = 4_000;
const MAX_CALENDAR_DESCRIPTION = 4_000;
const MAX_NOTES = 8_000;
const MAX_NOTION_CONTENT = 8_000;
const ID = /^[A-Za-z0-9_-]{1,120}$/;
const NOTION_ID = /^[0-9a-fA-F-]{32,36}$/;

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function cleanHeader(value: unknown, max: number): string {
  const out = str(value, max);
  if (/\r|\n/.test(out)) throw new Error("Email headers cannot contain line breaks.");
  return out;
}

function validEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function requireId(value: unknown, label: string): string {
  const id = str(value, 120);
  if (!ID.test(id)) throw new Error(`${label} is invalid.`);
  return id;
}

function requireNotionId(value: unknown, label: string): string {
  const id = str(value, 40);
  if (!NOTION_ID.test(id)) throw new Error(`${label} is invalid.`);
  return id;
}

function asProvider(value: unknown): ApprovedProvider | "auto" {
  const provider = str(value, 20).toLowerCase();
  if (["google", "microsoft", "slack", "hubspot", "asana", "linear", "notion"].includes(provider)) {
    return provider as ApprovedProvider;
  }
  return "auto";
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function iso(value: unknown, label: string): string {
  const raw = str(value, 80);
  const ms = Date.parse(raw);
  if (!raw || Number.isNaN(ms)) throw new Error(`${label} must be a valid ISO date/time.`);
  return new Date(ms).toISOString();
}

function dateOnly(value: unknown, label: string): string | undefined {
  const raw = str(value, 20);
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    throw new Error(`${label} must be YYYY-MM-DD.`);
  }
  return raw;
}

function safeProperties(raw: unknown, allowed: readonly string[], maxValue = 1000): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("properties must be an object.");
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.includes(key)) throw new Error(`Property \"${key}\" is not allowed for this action.`);
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new Error(`Property \"${key}\" must be a scalar value.`);
    }
    out[key] = String(value).slice(0, maxValue);
  }
  if (!Object.keys(out).length) throw new Error("At least one approved property change is required.");
  return out;
}

const HUBSPOT_CONTACT_PROPERTIES = [
  "firstname", "lastname", "email", "phone", "company", "jobtitle", "lifecyclestage",
] as const;
const HUBSPOT_DEAL_PROPERTIES = [
  "dealname", "amount", "dealstage", "closedate", "pipeline",
] as const;

/** Pure provider request builder for unit tests. Tokens are never part of the spec. */
export function buildApprovedActionRequest(action: ApprovedAction, provider: ApprovedProvider): RequestSpec {
  const details = action.details ?? {};

  if (action.actionType === "email_send" || action.actionType === "email_draft") {
    if (provider !== "google" && provider !== "microsoft") {
      throw new Error("Email drafts require Google Workspace or Microsoft 365.");
    }
    const to = cleanHeader(details["to"], 254);
    const subject = cleanHeader(details["subject"], 200);
    const body = str(details["body"], MAX_EMAIL_BODY);
    if (!validEmail(to)) throw new Error("A valid recipient address is required.");
    if (!subject) throw new Error("An email subject is required.");
    if (!body) throw new Error("An email body is required.");

    if (provider === "google") {
      const mime = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: 8bit",
        "",
        body,
      ].join("\r\n");
      return {
        provider,
        method: "POST",
        url: "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw: base64Url(mime) } }),
      };
    }

    return {
      provider,
      method: "POST",
      url: "https://graph.microsoft.com/v1.0/me/messages",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      }),
    };
  }

  if (action.actionType === "calendar_create") {
    if (provider !== "google" && provider !== "microsoft") {
      throw new Error("Calendar events require Google Workspace or Microsoft 365.");
    }
    const title = str(details["title"], 200);
    const start = iso(details["start"], "start");
    const end = iso(details["end"], "end");
    const location = str(details["location"], 200);
    const description = str(details["description"], MAX_CALENDAR_DESCRIPTION);
    if (!title) throw new Error("A calendar title is required.");
    if (Date.parse(end) <= Date.parse(start)) throw new Error("Calendar end must be after start.");

    if (provider === "google") {
      return {
        provider,
        method: "POST",
        url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title,
          ...(description ? { description } : {}),
          ...(location ? { location } : {}),
          start: { dateTime: start },
          end: { dateTime: end },
        }),
      };
    }

    return {
      provider,
      method: "POST",
      url: "https://graph.microsoft.com/v1.0/me/events",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: title,
        ...(description ? { body: { contentType: "Text", content: description } } : {}),
        ...(location ? { location: { displayName: location } } : {}),
        start: { dateTime: start.replace(/Z$/, ""), timeZone: "UTC" },
        end: { dateTime: end.replace(/Z$/, ""), timeZone: "UTC" },
      }),
    };
  }

  if (action.actionType === "slack_post") {
    if (provider !== "slack") throw new Error("Slack posts require a Slack connection.");
    const channel = str(details["channel"], 80);
    const text = str(details["text"], MAX_SLACK_TEXT);
    if (!/^[A-Z0-9]{2,80}$/i.test(channel)) throw new Error("A valid Slack channel ID is required.");
    if (!text) throw new Error("Slack message text is required.");
    return {
      provider,
      method: "POST",
      url: "https://slack.com/api/chat.postMessage",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel, text }),
    };
  }

  if (action.actionType === "hubspot_contact_update" || action.actionType === "hubspot_deal_update") {
    if (provider !== "hubspot") throw new Error("This CRM action requires HubSpot.");
    const objectId = requireId(details["object_id"], "HubSpot object id");
    const objectType = action.actionType === "hubspot_contact_update" ? "contacts" : "deals";
    const properties = safeProperties(
      details["properties"],
      action.actionType === "hubspot_contact_update" ? HUBSPOT_CONTACT_PROPERTIES : HUBSPOT_DEAL_PROPERTIES,
    );
    return {
      provider,
      method: "PATCH",
      url: `https://api.hubapi.com/crm/objects/2026-03/${objectType}/${encodeURIComponent(objectId)}`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    };
  }

  if (action.actionType === "asana_task_create") {
    if (provider !== "asana") throw new Error("This task action requires Asana.");
    const name = str(details["name"], 300);
    const workspace = requireId(details["workspace_gid"], "Asana workspace id");
    const projectRaw = str(details["project_gid"], 120);
    const project = projectRaw ? requireId(projectRaw, "Asana project id") : undefined;
    const notes = str(details["notes"], MAX_NOTES);
    const dueOn = dateOnly(details["due_on"], "Asana due date");
    if (!name) throw new Error("An Asana task name is required.");
    return {
      provider,
      method: "POST",
      url: "https://app.asana.com/api/1.0/tasks",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { name, workspace, ...(project ? { projects: [project] } : {}), ...(notes ? { notes } : {}), ...(dueOn ? { due_on: dueOn } : {}) } }),
    };
  }

  if (action.actionType === "asana_task_update") {
    if (provider !== "asana") throw new Error("This task action requires Asana.");
    const task = requireId(details["task_gid"], "Asana task id");
    const data: Record<string, unknown> = {};
    if (typeof details["name"] === "string") data["name"] = str(details["name"], 300);
    if (typeof details["notes"] === "string") data["notes"] = str(details["notes"], MAX_NOTES);
    if (typeof details["completed"] === "boolean") data["completed"] = details["completed"];
    if (details["due_on"] != null) data["due_on"] = dateOnly(details["due_on"], "Asana due date") ?? null;
    if (!Object.keys(data).length) throw new Error("At least one Asana task field must change.");
    return {
      provider,
      method: "PUT",
      url: `https://app.asana.com/api/1.0/tasks/${encodeURIComponent(task)}`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    };
  }

  if (action.actionType === "linear_issue_create") {
    if (provider !== "linear") throw new Error("This issue action requires Linear.");
    const teamId = requireId(details["team_id"], "Linear team id");
    const title = str(details["title"], 300);
    const description = str(details["description"], MAX_NOTES);
    if (!title) throw new Error("A Linear issue title is required.");
    const query = `mutation ConnectedIssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }`;
    return {
      provider,
      method: "POST",
      url: "https://api.linear.app/graphql",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { input: { teamId, title, ...(description ? { description } : {}) } } }),
    };
  }

  if (action.actionType === "linear_issue_update") {
    if (provider !== "linear") throw new Error("This issue action requires Linear.");
    const issueId = requireId(details["issue_id"], "Linear issue id");
    const input: Record<string, unknown> = {};
    if (typeof details["title"] === "string") input["title"] = str(details["title"], 300);
    if (typeof details["description"] === "string") input["description"] = str(details["description"], MAX_NOTES);
    if (typeof details["priority"] === "number" && Number.isInteger(details["priority"]) && details["priority"] >= 0 && details["priority"] <= 4) input["priority"] = details["priority"];
    if (!Object.keys(input).length) throw new Error("At least one Linear issue field must change.");
    const query = `mutation ConnectedIssueUpdate($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title url } } }`;
    return {
      provider,
      method: "POST",
      url: "https://api.linear.app/graphql",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: issueId, input } }),
    };
  }

  if (action.actionType === "notion_page_create") {
    if (provider !== "notion") throw new Error("This content action requires Notion.");
    const parentPageId = requireNotionId(details["parent_page_id"], "Notion parent page id");
    const title = str(details["title"], 300);
    const content = str(details["content"], MAX_NOTION_CONTENT);
    if (!title) throw new Error("A Notion page title is required.");
    const rich = (text: string) => [{ type: "text", text: { content: text } }];
    return {
      provider,
      method: "POST",
      url: "https://api.notion.com/v1/pages",
      headers: { "Content-Type": "application/json", "Notion-Version": "2026-03-11" },
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        properties: { title: { type: "title", title: rich(title) } },
        ...(content ? { children: [{ object: "block", type: "paragraph", paragraph: { rich_text: rich(content) } }] } : {}),
      }),
    };
  }

  throw new Error(`Approved action "${action.actionType}" is not executable.`);
}

function providersFor(actionType: ApprovedActionType): ApprovedProvider[] {
  if (actionType === "slack_post") return ["slack"];
  if (actionType === "hubspot_contact_update" || actionType === "hubspot_deal_update") return ["hubspot"];
  if (actionType === "asana_task_create" || actionType === "asana_task_update") return ["asana"];
  if (actionType === "linear_issue_create" || actionType === "linear_issue_update") return ["linear"];
  if (actionType === "notion_page_create") return ["notion"];
  return ["google", "microsoft"];
}

async function resolveProvider(userId: string, action: ApprovedAction): Promise<ApprovedProvider | null> {
  const requested = asProvider(action.details["provider"]);
  const candidates = providersFor(action.actionType);
  if (requested !== "auto") {
    if (!candidates.includes(requested)) return null;
    candidates.splice(0, candidates.length, requested);
  }

  const { data } = await supabaseAdmin
    .from("integrations")
    .select("provider,status,connected_at")
    .eq("user_id", userId)
    .in("provider", candidates)
    .eq("status", "connected")
    .order("connected_at", { ascending: false });

  const rows = (data ?? []) as Array<{ provider?: string }>;
  for (const candidate of candidates) {
    if (rows.some((row) => row.provider === candidate)) return candidate;
  }
  return null;
}

function safeProviderResult(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const row = payload as Record<string, any>;
  const nested = row["data"] && typeof row["data"] === "object" ? row["data"] as Record<string, any> : null;
  const linear = nested?.["issueCreate"] ?? nested?.["issueUpdate"];
  return {
    ...(typeof row["id"] === "string" ? { id: row["id"] } : {}),
    ...(typeof nested?.["gid"] === "string" ? { id: nested["gid"] } : {}),
    ...(typeof row["url"] === "string" ? { url: row["url"] } : {}),
    ...(typeof nested?.["permalink_url"] === "string" ? { url: nested["permalink_url"] } : {}),
    ...(typeof row["webLink"] === "string" ? { web_link: row["webLink"] } : {}),
    ...(typeof row["htmlLink"] === "string" ? { web_link: row["htmlLink"] } : {}),
    ...(row["message"] && typeof row["message"]?.["id"] === "string" ? { message_id: row["message"]["id"] } : {}),
    ...(typeof row["ts"] === "string" ? { message_ts: row["ts"] } : {}),
    ...(typeof row["channel"] === "string" ? { channel: row["channel"] } : {}),
    ...(linear?.issue?.id ? { id: linear.issue.id, identifier: linear.issue.identifier, url: linear.issue.url } : {}),
  };
}

export async function executeApprovedAction(
  userId: string,
  action: ApprovedAction,
  signal?: AbortSignal,
): Promise<{ ok: boolean; provider?: string; result?: Record<string, unknown>; error?: string }> {
  const provider = await resolveProvider(userId, action);
  if (!provider) return { ok: false, error: "No compatible connected account is available for this approved action." };

  let spec: RequestSpec;
  try {
    spec = buildApprovedActionRequest(action, provider);
  } catch (error) {
    return { ok: false, provider, error: (error as Error).message };
  }

  const token = await getIntegrationAccessToken(userId, provider);
  if (!token) return { ok: false, provider, error: `${provider} needs to be connected again before this action can run.` };

  try {
    const response = await fetch(spec.url, {
      method: spec.method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...spec.headers },
      body: spec.body,
      signal: signal ?? AbortSignal.timeout(20_000),
    });
    const text = (await response.text()).slice(0, 12_000);
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

    const graphqlError = provider === "linear" && Array.isArray(payload?.errors) && payload.errors.length > 0;
    if (!response.ok || (provider === "slack" && payload?.ok === false) || graphqlError) {
      const providerMessage =
        typeof payload?.error === "string" ? payload.error
          : typeof payload?.message === "string" ? payload.message
            : graphqlError && typeof payload.errors?.[0]?.message === "string" ? payload.errors[0].message
              : `provider returned ${response.status}`;
      const reconnect = response.status === 401 || response.status === 403;
      return {
        ok: false,
        provider,
        error: `${provider} action failed: ${providerMessage}${reconnect ? ". Reconnect the integration if permissions were recently upgraded." : ""}`.slice(0, 500),
      };
    }

    return { ok: true, provider, result: safeProviderResult(payload) };
  } catch (error) {
    return {
      ok: false,
      provider,
      error: (error as Error).name === "AbortError" ? "Approved action was cancelled." : (error as Error).message.slice(0, 500),
    };
  }
}
