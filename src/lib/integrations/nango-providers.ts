export const NANGO_PROVIDERS = [
  {
    id: "gocardless-bank-account-data",
    nangoProviderId: "gocardless-bank-account-data",
    name: "GoCardless Bank Account Data",
    category: "banking",
    env: "NANGO_GOCARDLESS_BANKING_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-gocardless-banking",
    probe: { path: "/api/v2/institutions/?country=gb", label: "0.name" },
  },
  {
    id: "github",
    nangoProviderId: "github",
    name: "GitHub",
    category: "developer",
    env: "NANGO_GITHUB_INTEGRATION_ID",
    defaultIntegrationId: "github-getting-started",
    probe: { path: "/user", label: "login", header: ["X-GitHub-Api-Version", "2022-11-28"] },
  },
  {
    id: "google",
    nangoProviderId: "google",
    name: "Google Workspace",
    category: "productivity",
    env: "NANGO_GOOGLE_INTEGRATION_ID",
    defaultIntegrationId: "palladium-google",
    probe: { path: "/oauth2/v2/userinfo", label: "email" },
  },
  {
    id: "microsoft",
    nangoProviderId: "microsoft",
    name: "Microsoft 365",
    category: "productivity",
    env: "NANGO_MICROSOFT_INTEGRATION_ID",
    defaultIntegrationId: "palladium-microsoft",
    probe: { path: "/v1.0/me", label: "displayName" },
  },
  {
    id: "slack",
    nangoProviderId: "slack",
    name: "Slack",
    category: "communication",
    env: "NANGO_SLACK_INTEGRATION_ID",
    defaultIntegrationId: "palladium-slack",
    probe: { path: "/api/auth.test", label: "user" },
  },
  {
    id: "hubspot",
    nangoProviderId: "hubspot",
    name: "HubSpot",
    category: "crm",
    env: "NANGO_HUBSPOT_INTEGRATION_ID",
    defaultIntegrationId: "palladium-hubspot",
    probe: { path: "/crm/v3/owners?limit=1", label: "results.0.email" },
  },
  {
    id: "salesforce",
    nangoProviderId: "salesforce",
    name: "Salesforce",
    category: "crm",
    env: "NANGO_SALESFORCE_INTEGRATION_ID",
    defaultIntegrationId: "palladium-salesforce",
    probe: { path: "/services/data/v61.0/limits", label: "DailyApiRequests" },
  },
  {
    id: "notion",
    nangoProviderId: "notion",
    name: "Notion",
    category: "productivity",
    env: "NANGO_NOTION_INTEGRATION_ID",
    defaultIntegrationId: "palladium-notion",
    probe: { path: "/v1/users/me", label: "name", header: ["Notion-Version", "2026-03-11"] },
  },
  {
    id: "asana",
    nangoProviderId: "asana",
    name: "Asana",
    category: "project_management",
    env: "NANGO_ASANA_INTEGRATION_ID",
    defaultIntegrationId: "palladium-asana",
    probe: { path: "/api/1.0/users/me", label: "data.name" },
  },
  {
    id: "linear",
    nangoProviderId: "linear",
    name: "Linear",
    category: "project_management",
    env: "NANGO_LINEAR_INTEGRATION_ID",
    defaultIntegrationId: "palladium-linear",
    probe: {
      path: "/graphql",
      method: "POST",
      body: '{"query":"query { viewer { name email } }"}',
      label: "data.viewer.name",
      header: ["Content-Type", "application/json"],
    },
  },
  {
    id: "airtable",
    nangoProviderId: "airtable",
    name: "Airtable",
    category: "productivity",
    env: "NANGO_AIRTABLE_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-airtable",
    probe: { path: "/v0/meta/bases?pageSize=1", label: "bases.0.name" },
  },
  {
    id: "dropbox",
    nangoProviderId: "dropbox",
    name: "Dropbox",
    category: "storage",
    env: "NANGO_DROPBOX_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-dropbox",
    probe: {
      path: "/2/users/get_current_account",
      method: "POST",
      body: "null",
      label: "name.display_name",
      header: ["Content-Type", "application/json"],
    },
  },
  {
    id: "webflow",
    nangoProviderId: "webflow",
    name: "Webflow",
    category: "developer",
    env: "NANGO_WEBFLOW_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-webflow",
    probe: { path: "/v2/sites?limit=1", label: "sites.0.displayName" },
  },
  {
    id: "canva",
    nangoProviderId: "canva",
    name: "Canva",
    category: "design",
    env: "NANGO_CANVA_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-canva",
    probe: { path: "/rest/v1/users/me/profile", label: "profile.display_name" },
  },
  {
    id: "supabase",
    nangoProviderId: "supabase",
    name: "Supabase",
    category: "developer",
    env: "NANGO_SUPABASE_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-supabase",
    probe: { path: "/v1/organizations", label: "0.name" },
  },
  {
    id: "sharepoint",
    nangoProviderId: "sharepoint-online",
    name: "SharePoint Online",
    category: "storage",
    env: "NANGO_SHAREPOINT_INTEGRATION_ID",
    defaultIntegrationId: "blackstar-sharepoint",
    probe: { path: "/v1.0/sites/root", label: "displayName" },
  },
] as const;

export type CuratedNangoProviderId = (typeof NANGO_PROVIDERS)[number]["id"];
export type NangoProviderId = string;

const SAFE_NANGO_PROVIDER_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/;

export function isSafeNangoProviderId(id: string) {
  return SAFE_NANGO_PROVIDER_ID.test(id);
}

export function findNangoProvider(id: string) {
  return NANGO_PROVIDERS.find((provider) => provider.id === id);
}
export function findNangoProviderByExternalId(id: string) {
  return NANGO_PROVIDERS.find((provider) => provider.nangoProviderId === id);
}
export function nangoExternalProviderId(id: string) {
  return findNangoProvider(id)?.nangoProviderId ?? id;
}
export function nangoStorageProvider(id: NangoProviderId) {
  return `nango_${id}`;
}
