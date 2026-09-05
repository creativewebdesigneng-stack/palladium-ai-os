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
  "productivity" | "communication" | "crm" | "project_management" | "calendar" | "email" | "ecommerce" | "social";

export type IntegrationProvider = {
  id: string;
  name: string;
  category: IntegrationCategory;
  summary: string;
  scopes: string[];
  tools: string[];
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  connectMode?: "standard_oauth" | "shopify_store";
  authorizeParams?: Record<string, string>;
  identity?: { url: string; labelKeys: string[] };
  docsUrl: string;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "shopify",
    name: "Shopify",
    category: "ecommerce",
    summary: "Operate products, orders and inventory through Shopify's native Admin API, with connector transports available as fallbacks.",
    scopes: ["write_products", "read_orders", "write_inventory", "read_locations"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://admin.shopify.com/",
    tokenUrl: "https://shopify.dev/",
    clientIdEnv: "SHOPIFY_CLIENT_ID",
    clientSecretEnv: "SHOPIFY_CLIENT_SECRET",
    connectMode: "shopify_store",
    docsUrl: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant",
  },
  {
    id: "meta",
    name: "Meta",
    category: "social",
    summary: "Connect Facebook Pages and linked Instagram professional accounts through Meta's native OAuth and Graph API, with connector transports retained as fallbacks.",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://www.facebook.com/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/oauth/access_token",
    clientIdEnv: "META_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "META_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://graph.facebook.com/me?fields=id,name", labelKeys: ["name", "id"] },
    docsUrl: "https://developers.facebook.com/docs/facebook-login/",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "social",
    summary: "Connect a YouTube channel directly through Google's OAuth 2.0 and YouTube Data API. Native channel actions are preferred; connector transports remain optional fallbacks.",
    scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "GOOGLE_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    identity: { url: "https://openidconnect.googleapis.com/v1/userinfo", labelKeys: ["email", "name"] },
    docsUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "social",
    summary: "Connect a LinkedIn member through native OAuth/OIDC. Blackstar can validate the member connection directly; posting is enabled only when LinkedIn exposes a legitimate author URN for the app's approved products.",
    scopes: ["openid", "profile", "email", "w_member_social"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientIdEnv: "LINKEDIN_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://api.linkedin.com/v2/userinfo", labelKeys: ["name", "email", "sub"] },
    docsUrl: "https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    category: "social",
    summary: "Connect Pinterest directly through the v5 OAuth API for board discovery and governed Pin publishing, with connector transports retained only as optional fallbacks.",
    scopes: ["user_accounts:read", "boards:read", "boards:write", "pins:read", "pins:write"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    clientIdEnv: "PINTEREST_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "PINTEREST_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://api.pinterest.com/v5/user_account", labelKeys: ["username", "business_name"] },
    docsUrl: "https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "social",
    summary: "Connect TikTok directly through Login Kit and the current v2 APIs. Native profile verification is available immediately; Direct Post is enabled only through TikTok's required creator-info and privacy controls.",
    scopes: ["user.info.basic", "video.publish"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    clientIdEnv: "TIKTOK_INTEGRATION_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://developers.tiktok.com/docs/en/login-kit-overview",
  },
  {
    id: "x",
    name: "X",
    category: "social",
    summary: "Connect an X account directly through OAuth 2.0 with PKCE for governed native posting. Connector transports remain optional fallbacks when a native action is unavailable.",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    clientIdEnv: "X_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "X_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://api.x.com/2/users/me", labelKeys: ["username", "name", "id"] },
    docsUrl: "https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code",
  },
  {
    id: "threads",
    name: "Threads",
    category: "social",
    summary: "Connect a Threads account directly through Meta's Threads OAuth flow for governed native publishing. Connector transports remain optional fallbacks.",
    scopes: ["threads_basic", "threads_content_publish"],
    tools: ["integration_capabilities", "integration_action"],
    authorizeUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    clientIdEnv: "THREADS_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "THREADS_INTEGRATION_CLIENT_SECRET",
    identity: { url: "https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url", labelKeys: ["username", "id"] },
    docsUrl: "https://developers.facebook.com/docs/threads/",
  },
  {
    id: "google",
    name: "Google Workspace",
    category: "productivity",
    summary: "Gmail drafting/sending, Google Calendar availability/event creation and Drive document lookup.",
    scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/drive.readonly"],
    tools: ["connected_service", "email_draft", "email_send", "calendar"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "GOOGLE_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    identity: { url: "https://openidconnect.googleapis.com/v1/userinfo", labelKeys: ["email", "name"] },
    docsUrl: "https://developers.google.com/identity/protocols/oauth2",
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    category: "productivity",
    summary: "Outlook drafting/sending, Microsoft Calendar reads/event creation and OneDrive file reading.",
    scopes: ["offline_access", "openid", "email", "profile", "Calendars.ReadWrite", "Mail.ReadWrite", "Mail.Send", "Files.Read"],
    tools: ["connected_service", "email_draft", "email_send", "calendar"],
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnv: "MICROSOFT_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { response_mode: "query", prompt: "consent" },
    identity: { url: "https://graph.microsoft.com/v1.0/me", labelKeys: ["userPrincipalName", "displayName"] },
    docsUrl: "https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow",
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    summary: "Read channel context and post agent updates once explicitly approved.",
    scopes: ["channels:read", "channels:history", "chat:write", "users:read"],
    tools: ["connected_service", "slack_post"],
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientIdEnv: "SLACK_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "SLACK_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { scope: "channels:read,channels:history,chat:write,users:read", user_scope: "" },
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
  },
  {
    id: "discord",
    name: "Discord",
    category: "communication",
    summary: "Connect a Discord identity and guild list. This connection is account-only today; agent channel actions are not enabled yet.",
    scopes: ["identify", "guilds"],
    tools: [],
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
    summary: "Read contacts/deals and update an allow-listed set of fields after explicit approval.",
    scopes: ["oauth", "crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read", "crm.objects.deals.write"],
    tools: ["connected_service", "connected_service_write"],
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v3/token",
    clientIdEnv: "HUBSPOT_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/oauth-quickstart-guide",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    summary: "Read-only CRM search across Accounts and Opportunities on the connected Salesforce org.",
    scopes: ["api", "refresh_token", "id"],
    tools: ["connected_service"],
    authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    clientIdEnv: "SALESFORCE_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "SALESFORCE_INTEGRATION_CLIENT_SECRET",
    docsUrl: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
  },
  {
    id: "notion",
    name: "Notion",
    category: "project_management",
    summary: "Read workspace pages and create child pages after explicit approval when Insert Content is enabled.",
    scopes: [],
    tools: ["connected_service", "connected_service_write"],
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
    summary: "Read projects/tasks and create or update tasks after explicit approval.",
    scopes: ["workspaces:read", "projects:read", "tasks:read", "tasks:write"],
    tools: ["connected_service", "connected_service_write"],
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
    summary: "Read issues and create or update issues after explicit approval.",
    scopes: ["read", "write"],
    tools: ["connected_service", "connected_service_write"],
    authorizeUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    clientIdEnv: "LINEAR_INTEGRATION_CLIENT_ID",
    clientSecretEnv: "LINEAR_INTEGRATION_CLIENT_SECRET",
    authorizeParams: { scope: "read,write" },
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
  ecommerce: "E-commerce",
  social: "Social",
};

export function findProvider(id: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((p) => p.id === id);
}
