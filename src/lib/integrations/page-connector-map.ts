export type PageConnectorState = "native" | "supported" | "target" | "candidate";

export type PageConnectorRecommendation = {
  id: string;
  name: string;
  state: PageConnectorState;
  source: "blackstar" | "chatgpt-catalogue";
  reason: string;
};

type RouteConnectorRule = {
  routes: string[];
  connectors: string[];
};

const CONNECTORS: Record<string, PageConnectorRecommendation> = {
  google: {
    id: "google",
    name: "Google Workspace",
    state: "supported",
    source: "blackstar",
    reason: "Gmail, Calendar and Drive context through Blackstar's governed Google Workspace integration.",
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft 365",
    state: "supported",
    source: "blackstar",
    reason: "Outlook, Calendar and OneDrive through Blackstar's existing Microsoft 365 integration.",
  },
  slack: {
    id: "slack",
    name: "Slack",
    state: "supported",
    source: "blackstar",
    reason: "Channel context and approval-gated posting through the existing communication connector.",
  },
  github: {
    id: "github",
    name: "GitHub",
    state: "supported",
    source: "blackstar",
    reason: "Repository, source and version-control context through Blackstar's existing GitHub integration.",
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    state: "supported",
    source: "blackstar",
    reason: "CRM contacts and deals with bounded, approval-controlled updates.",
  },
  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    state: "supported",
    source: "blackstar",
    reason: "Read-only CRM account and opportunity context through the existing provider route.",
  },
  notion: {
    id: "notion",
    name: "Notion",
    state: "supported",
    source: "blackstar",
    reason: "Workspace knowledge plus approval-gated page creation.",
  },
  asana: {
    id: "asana",
    name: "Asana",
    state: "supported",
    source: "blackstar",
    reason: "Project and task context with governed task updates.",
  },
  linear: {
    id: "linear",
    name: "Linear",
    state: "supported",
    source: "blackstar",
    reason: "Issue and project context with approval-controlled writes.",
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    state: "supported",
    source: "blackstar",
    reason: "Native product, order and inventory workflows with connector fallbacks.",
  },
  meta: {
    id: "meta",
    name: "Meta",
    state: "supported",
    source: "blackstar",
    reason: "Facebook Pages and linked Instagram professional account workflows.",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    state: "supported",
    source: "blackstar",
    reason: "Channel discovery and governed video actions through Google's APIs.",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    state: "supported",
    source: "blackstar",
    reason: "Member identity and governed posting where provider approval permits it.",
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    state: "supported",
    source: "blackstar",
    reason: "Board discovery and governed Pin publishing.",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    state: "supported",
    source: "blackstar",
    reason: "Profile verification and governed Direct Post where TikTok permits it.",
  },
  x: {
    id: "x",
    name: "X",
    state: "supported",
    source: "blackstar",
    reason: "OAuth-backed governed posting through the existing integration runtime.",
  },
  threads: {
    id: "threads",
    name: "Threads",
    state: "supported",
    source: "blackstar",
    reason: "Governed publishing through Meta's Threads API.",
  },
  canva: {
    id: "canva",
    name: "Canva",
    state: "target",
    source: "blackstar",
    reason: "Registered Blackstar creative connector target for layouts, brand assets and design work.",
  },
  figma: {
    id: "figma",
    name: "Figma",
    state: "target",
    source: "blackstar",
    reason: "Registered design-system and design-to-code connector target.",
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face",
    state: "target",
    source: "blackstar",
    reason: "Registered model, dataset, Space discovery and approved inference target.",
  },
  adobe: {
    id: "adobe",
    name: "Adobe",
    state: "target",
    source: "blackstar",
    reason: "Registered Creative Cloud/media connector target under explicit user authorization.",
  },
  runway: {
    id: "runway",
    name: "Runway",
    state: "target",
    source: "blackstar",
    reason: "Registered governed image/video generation target when a live provider route is configured.",
  },
  higgsfield: {
    id: "higgsfield",
    name: "Higgsfield",
    state: "target",
    source: "blackstar",
    reason: "Registered image, video and branded-content generation target.",
  },
  stripe: {
    id: "stripe",
    name: "Stripe",
    state: "native",
    source: "blackstar",
    reason: "Blackstar's existing payments, subscriptions and Marketplace payment infrastructure.",
  },
  vercel: {
    id: "vercel",
    name: "Vercel",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for deployments, project state and runtime operations; Blackstar user connector route is not enabled yet.",
  },
  supabase: {
    id: "supabase",
    name: "Supabase",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for database, Auth and backend operations; Blackstar requires its own provider authorization and credentials.",
  },
  lovable: {
    id: "lovable",
    name: "Lovable",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external app-building integration that matches Blackstar website/app-building surfaces.",
  },
  webflow: {
    id: "webflow",
    name: "Webflow",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external website/CMS integration for page building, publishing, localization, forms, assets and site operations.",
  },
  heygen: {
    id: "heygen",
    name: "HeyGen",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external video integration for avatars, presenter videos, speech, lip-sync, clipping and multilingual localization.",
  },
  atlassian: {
    id: "atlassian",
    name: "Atlassian",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for Jira, Confluence, Bitbucket and Loom; a strong developer/project-management candidate.",
  },
  semrush: {
    id: "semrush",
    name: "Semrush",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for authoritative SEO, traffic, keyword and backlink data.",
  },
  ahrefs: {
    id: "ahrefs",
    name: "Ahrefs",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for SEO, backlinks, rankings and brand visibility.",
  },
  supermetrics: {
    id: "supermetrics",
    name: "Supermetrics",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for cross-channel marketing and analytics data.",
  },
  metricool: {
    id: "metricool",
    name: "Metricool",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for social analytics, schedules and publishing workflows.",
  },
  airtable: {
    id: "airtable",
    name: "Airtable",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for structured operational data and record workflows.",
  },
  coda: {
    id: "coda",
    name: "Coda",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for operating documents that combine narrative, structured tables, formulas, controls and collaboration.",
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for user-owned file search, storage and sharing.",
  },
  box: {
    id: "box",
    name: "Box",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for enterprise content and file metadata.",
  },
  sharepoint: {
    id: "sharepoint",
    name: "SharePoint",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for Microsoft SharePoint content beyond Blackstar's existing OneDrive path.",
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external finance integration; useful for finance context but never a route to unrestricted money movement.",
  },
  datadog: {
    id: "datadog",
    name: "Datadog",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external observability integration for logs, metrics, traces, incidents and monitors.",
  },
  amplitude: {
    id: "amplitude",
    name: "Amplitude",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external product-intelligence integration for metrics, experiments and behavioural analytics.",
  },
  posthog: {
    id: "posthog",
    name: "PostHog",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external product-engineering integration for analytics, experiments, feature flags, error tracking, replay and LLM observability.",
  },
  vanta: {
    id: "vanta",
    name: "Vanta",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external compliance integration for controls, evidence, risks, audits and vendors.",
  },
  ringcentral: {
    id: "ringcentral",
    name: "RingCentral",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external business communications integration for calls, SMS, voicemail and contacts.",
  },
  coros: {
    id: "coros",
    name: "COROS",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external fitness integration for activity, sleep, HRV, recovery and device context.",
  },
  caliber: {
    id: "caliber",
    name: "Caliber",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external fitness integration for workouts, nutrition, body stats and training plans.",
  },
  klaviyo: {
    id: "klaviyo",
    name: "Klaviyo",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external integration for campaign and lifecycle-marketing performance.",
  },
  vidiq: {
    id: "vidiq",
    name: "vidIQ",
    state: "candidate",
    source: "chatgpt-catalogue",
    reason: "Recommended external creator integration for video ideas, channel analytics, keywords and content optimisation.",
  },
};

const ROUTE_RULES: RouteConnectorRule[] = [
  {
    routes: ["/website-studio", "/html-studio"],
    connectors: ["figma", "canva", "adobe", "webflow", "lovable", "github", "semrush", "amplitude"],
  },
  {
    routes: ["/cinema-studio", "/media-studio", "/creator-hub", "/trusted-social-video", "/voice-studio"],
    connectors: ["runway", "adobe", "higgsfield", "heygen", "canva", "huggingface", "figma", "metricool"],
  },
  {
    routes: ["/product-analytics", "/analytics", "/admin/platform-analytics"],
    connectors: ["amplitude", "posthog", "semrush", "metricool", "github", "vercel", "supabase", "datadog"],
  },
  {
    routes: ["/dashboard", "/mission-control", "/outcomes", "/business-intelligence", "/decision-studio", "/business-automation", "/work-os", "/tasks", "/automation", "/automations", "/workflows", "/organisation", "/team", "/company-hub"],
    connectors: ["google", "microsoft", "hubspot", "notion", "airtable", "coda", "linear", "slack", "asana"],
  },
  {
    routes: ["/agents*", "/agent-builder", "/agent-runtime", "/agent-workspaces", "/workforce", "/skills", "/ai-tools", "/ai-workbench", "/ai-builder", "/ai-hub", "/ai-model-hub", "/models", "/model-arena", "/mcp-hub", "/autonomous-os", "/prompts", "/chat", "/tools-framework"],
    connectors: ["github", "huggingface", "google", "slack", "notion", "asana", "linear"],
  },
  {
    routes: ["/developer", "/developer-workspace", "/developer-portal", "/code-explorer", "/version-control", "/deployments", "/terminal", "/browser-preview", "/computer-control", "/builder"],
    connectors: ["github", "figma", "huggingface", "vercel", "supabase", "lovable", "atlassian", "datadog"],
  },
  {
    routes: ["/creator-hub", "/creator-marketplace", "/creators*", "/media-studio", "/cinema-studio", "/three-d-studio", "/game-foundry", "/voice-studio", "/html-studio", "/website-studio", "/templates"],
    connectors: ["canva", "figma", "huggingface", "adobe", "runway", "higgsfield", "heygen", "webflow", "github", "lovable"],
  },
  {
    routes: ["/marketing", "/social-operations", "/trusted-social-video", "/seo-studio", "/product-analytics", "/analytics", "/news-research", "/web-intelligence", "/research", "/web"],
    connectors: ["meta", "youtube", "linkedin", "pinterest", "tiktok", "x", "threads", "canva", "semrush", "ahrefs", "supermetrics", "metricool", "amplitude", "posthog", "heygen", "klaviyo", "vidiq"],
  },
  {
    routes: ["/crm", "/crm-studio", "/whatsapp-crm", "/phone-communications", "/support", "/notifications"],
    connectors: ["hubspot", "salesforce", "slack", "google", "microsoft", "ringcentral"],
  },
  {
    routes: ["/commerce-studio", "/dropshipping-hub", "/retail-hub", "/shopify-connect", "/marketplace", "/agent-marketplace", "/ai-marketplace", "/tool-marketplace", "/admin/marketplace"],
    connectors: ["shopify", "stripe", "hubspot", "google", "meta", "supermetrics", "klaviyo"],
  },
  {
    routes: ["/finance", "/trading-hub", "/quant-studio", "/billing", "/payment", "/admin/subscriptions"],
    connectors: ["stripe", "google", "microsoft", "mercury"],
  },
  {
    routes: ["/files", "/files-analysis", "/documents", "/knowledge", "/memory", "/recall-notes", "/smart-tables", "/shared-intelligence", "/search"],
    connectors: ["google", "microsoft", "notion", "airtable", "coda", "dropbox", "sharepoint", "box"],
  },
  {
    routes: ["/projects*", "/project*", "/developer-workspace"],
    connectors: ["github", "google", "notion", "asana", "linear", "slack", "atlassian"],
  },
  {
    routes: ["/industry-hub", "/construction-industrial-hub", "/legal-hub", "/compliance-sentinel"],
    connectors: ["google", "microsoft", "notion", "slack", "asana", "vanta"],
  },
  {
    routes: ["/health-fitness", "/fitness-studio"],
    connectors: ["coros", "caliber", "google"],
  },
  {
    routes: ["/security", "/admin/security", "/admin/monitoring", "/admin/audit-logs", "/admin/acceptance", "/admin/platform-analytics"],
    connectors: ["github", "vercel", "supabase", "datadog", "amplitude", "posthog", "vanta"],
  },
  {
    routes: ["/integrations", "/sync-center", "/admin/integrations"],
    connectors: ["google", "microsoft", "slack", "github", "hubspot", "shopify", "notion", "asana", "linear"],
  },
  {
    routes: ["/admin", "/admin/users", "/admin/organisations", "/admin/system-settings"],
    connectors: ["google", "microsoft", "slack", "github", "supabase", "vercel"],
  },
  {
    routes: ["/docs", "/discovery", "/fast-track", "/human-frontier", "/settings"],
    connectors: ["google", "notion", "github", "slack"],
  },
];

function routeMatches(pathname: string, pattern: string) {
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === pattern || pathname.startsWith(`${pattern}/`);
}

export function pageConnectorRecommendations(pathname: string, limit = 8) {
  const normalized = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  const ids: string[] = [];

  for (const rule of ROUTE_RULES) {
    if (!rule.routes.some((pattern) => routeMatches(normalized, pattern))) continue;
    for (const id of rule.connectors) if (!ids.includes(id)) ids.push(id);
  }

  return ids
    .map((id) => CONNECTORS[id])
    .filter((value): value is PageConnectorRecommendation => Boolean(value))
    .slice(0, Math.max(1, limit));
}

export const pageConnectorCatalogue = CONNECTORS;
export const pageConnectorRules = ROUTE_RULES;
