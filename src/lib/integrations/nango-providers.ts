export const NANGO_PROVIDERS = [
  {
    id: "github",
    name: "GitHub",
    category: "developer",
    env: "NANGO_GITHUB_INTEGRATION_ID",
    defaultIntegrationId: "github-getting-started",
    probe: { path: "/user", label: "login", header: ["X-GitHub-Api-Version", "2022-11-28"] },
  },
  {
    id: "google",
    name: "Google Workspace",
    category: "productivity",
    env: "NANGO_GOOGLE_INTEGRATION_ID",
    probe: { path: "/oauth2/v2/userinfo", label: "email" },
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    category: "productivity",
    env: "NANGO_MICROSOFT_INTEGRATION_ID",
    probe: { path: "/v1.0/me", label: "displayName" },
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    env: "NANGO_SLACK_INTEGRATION_ID",
    probe: { path: "/api/auth.test", label: "user" },
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    env: "NANGO_HUBSPOT_INTEGRATION_ID",
    probe: { path: "/crm/v3/owners?limit=1", label: "results.0.email" },
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    env: "NANGO_SALESFORCE_INTEGRATION_ID",
    probe: { path: "/services/data/v61.0/limits", label: "DailyApiRequests" },
  },
  {
    id: "notion",
    name: "Notion",
    category: "productivity",
    env: "NANGO_NOTION_INTEGRATION_ID",
    probe: { path: "/v1/users/me", label: "name", header: ["Notion-Version", "2026-03-11"] },
  },
  {
    id: "asana",
    name: "Asana",
    category: "project_management",
    env: "NANGO_ASANA_INTEGRATION_ID",
    probe: { path: "/api/1.0/users/me", label: "data.name" },
  },
  {
    id: "linear",
    name: "Linear",
    category: "project_management",
    env: "NANGO_LINEAR_INTEGRATION_ID",
    probe: {
      path: "/graphql",
      method: "POST",
      body: '{"query":"query { viewer { name email } }"}',
      label: "data.viewer.name",
      header: ["Content-Type", "application/json"],
    },
  },
] as const;

export type NangoProviderId = (typeof NANGO_PROVIDERS)[number]["id"];
export function findNangoProvider(id: string) {
  return NANGO_PROVIDERS.find((provider) => provider.id === id);
}
export function nangoStorageProvider(id: NangoProviderId) {
  return `nango_${id}`;
}
