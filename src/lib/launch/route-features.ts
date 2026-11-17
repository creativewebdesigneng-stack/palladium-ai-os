import type { FeatureId } from "./feature-registry";

/** Explicit route ownership. Unknown app routes fail closed rather than inheriting access. */
const ROUTE_FEATURES: Record<string, FeatureId> = {
  "/": "landing", "/dashboard": "dashboard", "/billing": "billing",
  "/founding-pilot": "founding_pilot", "/onboarding": "onboarding",
  "/agent-runtime": "agent_runtime", "/agents": "agent_runtime", "/chat": "ai_chat",
  "/mission-control": "mission_control", "/workforce": "workforce",
  "/agent-builder": "agent_builder", "/agent-marketplace": "agent_marketplace",
  "/marketplace": "agent_marketplace", "/agent-workspaces": "agent_workspaces",
  "/ai-hub": "ai_hub", "/ai-model-hub": "ai_models", "/models": "ai_models", "/fast-track": "agent_runtime",
  "/ai-tools": "ai_tools", "/ai-workbench": "ai_tools", "/automation": "automation",
  "/automations": "automation", "/workflows": "automation", "/memory": "memory",
  "/recall-notes": "memory", "/knowledge": "knowledge", "/documents": "knowledge",
  "/files": "files", "/files-analysis": "files", "/file-analysis": "files", "/research": "research",
  "/discovery": "research", "/news-research": "research", "/web-intelligence": "web_intelligence",
  "/search": "web_intelligence", "/web": "web_intelligence", "/integrations": "integrations",
  "/mcp-hub": "integrations", "/skills": "integrations", "/business-automation": "business_hub",
  "/business-intelligence": "business_hub", "/company-hub": "business_hub",
  "/crm": "crm", "/crm-studio": "crm", "/marketing": "marketing",
  "/social-operations": "marketing", "/finance": "finance", "/analytics": "analytics",
  "/product-analytics": "analytics", "/commerce-studio": "commerce", "/retail-hub": "commerce",
  "/dropshipping-hub": "commerce", "/shopify-connect": "shopify",
  "/creator-hub": "creative_studio", "/media-studio": "creative_studio",
  "/cinema-studio": "cinema_studio", "/cinema": "cinema_studio", "/website-studio": "developer_tools",
  "/html-studio": "developer_tools", "/code-explorer": "developer_tools",
  "/developer": "developer_tools", "/developer-workspace": "developer_tools",
  "/developer-portal": "developer_tools", "/voice-studio": "communications",
  "/trusted-social-video": "communications", "/phone-communications": "communications",
  "/security": "security", "/compliance-sentinel": "security", "/legal-hub": "security",
  "/projects": "projects", "/tasks": "projects", "/team": "projects",
  "/notifications": "notifications", "/support": "notifications", "/help": "notifications",
  "/settings": "settings", "/organisation": "settings", "/payment": "billing", "/workspace": "agent_workspaces",
  "/health-fitness": "health_fitness", "/fitness-studio": "health_fitness", "/health": "health_fitness", "/fitness": "health_fitness",
  "/game-foundry": "creative_studio", "/three-d-studio": "creative_studio",
  "/industry-hub": "business_hub", "/construction-industrial-hub": "business_hub",
  "/autonomous-os": "workforce", "/workforce-os": "workforce", "/mission": "mission_control", "/autonomous-goals": "workforce",
};

export function featureForPath(pathname: string): FeatureId | null {
  const match = Object.keys(ROUTE_FEATURES)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(route + "/"));
  return match ? ROUTE_FEATURES[match]! : null;
}
