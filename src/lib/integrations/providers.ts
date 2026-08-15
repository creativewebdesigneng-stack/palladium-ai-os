/**
 * Third-party integration provider catalogue.
 *
 * Client-safe: describes what each provider is, which OAuth scopes PalladiumAI
 * asks for, and which agent tools the connection powers. Client IDs, client
 * secrets and tokens never appear here — those live in server secrets and the
 * encrypted credential store.
 *
 * PalladiumAI only ever uses OAuth for third-party accounts. It never asks for,
 * and has no field to store, a password for another service.
 */

export type IntegrationCategory =
  "productivity" | "communication" | "crm" | "project_management" | "calendar" | "email";

export type IntegrationProvider = {
  id: string;
  name: string;
  category: IntegrationCategory;
  summary: string;
  /** Scopes requested at consent — the least needed for the listed tools. */
  scopes: string[];
  /** Agent tools this connection feeds. */
  tools: string[];
  authorizeUrl: string;
  tokenUrl: string;
  /** Env var names holding the OAuth client credentials (server-side only). */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra authorize params (offline access, consent prompts, etc.). */
  authorizeParams?: Record<string, string>;
  /** Provider endpoint used once after consent to label the connected account. */
  identity?: { url: string; labelKeys: string[] };
  docsUrl: string;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "google",
    name: "Google Workspace",
    category: "productivity",
    summary: "Gmail draft creation, Google Calendar reads and read-only Drive document lookup.",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    tools: ["calendar", "email_send", "file_analysis"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "GOOGLE_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    identity: {
      url: "https://openidconnect.googleapis.com/v1/userinfo",
      labelKeys: ["email", "name"],
    },
    docsUrl: "https://developers.google.com/identity/protocols/oauth2",
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    category: "productivity",
    summary: "Outlook draft creation, Microsoft Calendar reads and read-only OneDrive file access.",
    scopes: [
      "offline_access",
      "openid",
      "email",
      "profile",
      "Calendars.Read",
      "Mail.ReadWrite",
      "Files.Read",
    ],
    tools: ["calendar", "email_send", "file_analysis"],
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnv: "MICROSOFT_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { response_mode: "query", prompt: "consent" },
    identity: {
      url: "https://graph.microsoft.com/v1.0/me",
      labelKeys: ["userPrincipalName", "displayName"],
    },
    docsUrl: "https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow",
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    summary: "Read connected channel lists and recent channel history. Posting is not enabled yet.",
    scopes: ["channels:read", "channels:history", "users:read"],
    tools: ["http_request"],
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientIdEnv: "SLACK_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "SLACK_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { user_scope: "" },
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
  },
  {
    id: "discord",
    name: "Discord",
    category: "communication",
    summary: "Connect a Discord identity and guild list. Channel posting is not enabled yet.",
    scopes: ["identify", "guilds"],
    tools: ["http_request"],
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    clientIdEnv: "DISCORD_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "DISCORD_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://discord.com/api/users/@me", labelKeys: ["username", "id"] },
    docsUrl: "https://discord.com/developers/docs/topics/oauth2",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    summary: "Read-only CRM search across contacts and deals available to the connected account.",
    scopes: ["oauth", "crm.objects.contacts.read", "crm.objects.deals.read"],
    tools: ["http_request", "database_query"],
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    clientIdEnv: "HUBSPOT_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://developers.hubspot.com/docs/api/working-with-oauth",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    summary: "Read-only CRM search across Accounts and Opportunities on the connected Salesforce org.",
    scopes: ["api", "refresh_token", "openid"],
    tools: ["http_request", "database_query"],
    authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    clientIdEnv: "SALESFORCE_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "SALESFORCE_INTEGRATION_CLIENT_SECRET",
    docsUrl:
      "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
  },
  {
    id: "notion",
    name: "Notion",
    category: "project_management",
    summary: "Read-only workspace page search and bounded page-content reads, including nested blocks.",
    scopes: [],
    tools: ["http_request", "file_analysis"],
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientIdEnv: "NOTION_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "NOTION_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { owner: "user" },
    docsUrl: "https://developers.notion.com/docs/authorization",
  },
  {
    id: "asana",
    name: "Asana",
    category: "project_management",
    summary: "Read-only workspace, project and project-task access for the connected Asana account.",
    scopes: ["workspaces:read", "projects:read", "tasks:read"],
    tools: ["http_request"],
    authorizeUrl: "https://app.asana.com/-/oauth_authorize",
    tokenUrl: "https://app.asana.com/-/oauth_token",
    clientIdEnv: "ASANA_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "ASANA_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://developers.asana.com/docs/oauth",
  },
  {
    id: "linear",
    name: "Linear",
    category: "project_management",
    summary: "Read-only team listing and bounded issue search for the connected Linear workspace.",
    scopes: ["read"],
    tools: ["http_request"],
    authorizeUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    clientIdEnv: "LINEAR_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "LINEAR_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://developers.linear.app/docs/oauth/authentication",
  },
];

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  productivity: "Productivity",
  communication: "Communication",
  crm: "CRM",
  project_management: "Project management",
  calendar: "Calendar",
  email: "Email",
};

export function findProvider(id: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((p) => p.id === id);
}
