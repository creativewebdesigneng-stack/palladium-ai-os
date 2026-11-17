/**
 * Central Blackstar launch feature registry.
 *
 * Safe defaults are intentionally conservative. Environment overrides use
 * BLACKSTAR_FEATURE_<FEATURE_ID>=live|beta|hidden. Invalid values are ignored.
 */
export type FeatureStatus = "live" | "beta" | "hidden";

export const FEATURE_REGISTRY = {
  landing: { label: "Landing page", route: "/", defaultStatus: "live" },
  authentication: { label: "Authentication", route: "/login", defaultStatus: "live" },
  onboarding: { label: "Onboarding", route: "/onboarding", defaultStatus: "beta" },
  dashboard: { label: "Dashboard", route: "/dashboard", defaultStatus: "live" },
  billing: { label: "Billing", route: "/billing", defaultStatus: "beta" },
  founding_pilot: { label: "Founding Pilot checkout", route: "/founding-pilot", defaultStatus: "beta" },
  agent_runtime: { label: "Agent runtime", route: "/agent-runtime", defaultStatus: "beta" },
  ai_chat: { label: "AI chat", route: "/chat", defaultStatus: "beta" },
  mission_control: { label: "Mission Control", route: "/mission-control", defaultStatus: "hidden" },
  workforce: { label: "Workforce", route: "/workforce", defaultStatus: "hidden" },
  agent_builder: { label: "Agent builder", route: "/agent-builder", defaultStatus: "hidden" },
  agent_marketplace: { label: "Agent marketplace", route: "/agent-marketplace", defaultStatus: "hidden" },
  agent_workspaces: { label: "Agent workspaces", route: "/agent-workspaces", defaultStatus: "hidden" },
  ai_hub: { label: "AI hub", route: "/ai-hub", defaultStatus: "hidden" },
  ai_models: { label: "AI model hub", route: "/ai-model-hub", defaultStatus: "hidden" },
  ai_tools: { label: "AI tools and workbench", route: "/ai-tools", defaultStatus: "hidden" },
  automation: { label: "Automation and workflows", route: "/automation", defaultStatus: "hidden" },
  memory: { label: "Memory and recall", route: "/memory", defaultStatus: "hidden" },
  knowledge: { label: "Knowledge and documents", route: "/knowledge", defaultStatus: "hidden" },
  files: { label: "Files and analysis", route: "/files", defaultStatus: "hidden" },
  research: { label: "Research and discovery", route: "/research", defaultStatus: "hidden" },
  web_intelligence: { label: "Web intelligence", route: "/web-intelligence", defaultStatus: "hidden" },
  integrations: { label: "Integrations and connectors", route: "/integrations", defaultStatus: "hidden" },
  business_hub: { label: "Business hub", route: "/business-automation", defaultStatus: "hidden" },
  crm: { label: "CRM and sales", route: "/crm", defaultStatus: "hidden" },
  marketing: { label: "Marketing and social", route: "/marketing", defaultStatus: "hidden" },
  finance: { label: "Finance", route: "/finance", defaultStatus: "hidden" },
  analytics: { label: "Analytics", route: "/analytics", defaultStatus: "hidden" },
  commerce: { label: "Commerce and retail", route: "/commerce-studio", defaultStatus: "hidden" },
  shopify: { label: "Shopify integration", route: "/shopify-connect", defaultStatus: "hidden" },
  creative_studio: { label: "Creative Studio", route: "/creator-hub", defaultStatus: "hidden" },
  cinema_studio: { label: "Cinema Studio", route: "/cinema-studio", defaultStatus: "hidden" },
  developer_tools: { label: "Website and developer tools", route: "/website-studio", defaultStatus: "hidden" },
  communications: { label: "Voice, video and communications", route: "/voice-studio", defaultStatus: "hidden" },
  security: { label: "Security and compliance", route: "/security", defaultStatus: "hidden" },
  projects: { label: "Projects, tasks and teams", route: "/projects", defaultStatus: "hidden" },
  notifications: { label: "Notifications and support", route: "/notifications", defaultStatus: "beta" },
  settings: { label: "Settings and organisation", route: "/settings", defaultStatus: "beta" },
  health_fitness: { label: "Health and fitness", route: "/health-fitness", defaultStatus: "hidden" },
} as const satisfies Record<string, { label: string; route: string; defaultStatus: FeatureStatus }>;

export type FeatureId = keyof typeof FEATURE_REGISTRY;

const VALID_STATUSES = new Set<FeatureStatus>(["live", "beta", "hidden"]);

export function resolveFeatureStatus(
  featureId: FeatureId,
  env: Record<string, string | undefined> = {},
): FeatureStatus {
  const key = `BLACKSTAR_FEATURE_${featureId.toUpperCase()}`;
  const override = env[key]?.trim().toLowerCase();
  if (override && VALID_STATUSES.has(override as FeatureStatus)) return override as FeatureStatus;
  return FEATURE_REGISTRY[featureId].defaultStatus;
}

export function resolveFeatureStatuses(
  env: Record<string, string | undefined> = {},
): Record<FeatureId, FeatureStatus> {
  return Object.fromEntries(
    (Object.keys(FEATURE_REGISTRY) as FeatureId[]).map((id) => [id, resolveFeatureStatus(id, env)]),
  ) as Record<FeatureId, FeatureStatus>;
}
