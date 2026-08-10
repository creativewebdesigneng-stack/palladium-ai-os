import { FREEMIUM_PLANS, PLANS } from "@/components/site/pricingPlans";

// Subscription-based feature access for PalladiumAI.
//
// Four plans: Free "Explorer" (£0), Pro "Builder" (£20), Business (£1500),
// Enterprise (£3000). Every authenticated user starts on Free; upgrading
// unlocks creation/deployment and advanced capabilities. This map is the
// single source of truth used by the frontend (gating + upgrade modal) and
// mirrors the backend User.subscription_plan. Swap getPlanKey to read purely
// from the backend once billing is live.

export const PLAN_TIER_ORDER = ["free", "pro", "business", "enterprise"];

// Free — view/entry features only. No creation, deployment, or advanced tools.
const FREE_FEATURES = {
  marketplace: true,
  browseAgents: true,
  viewAgents: true,
  viewUpcomingAgents: true,
  viewProfiles: true,
  viewWorkflows: true,
  viewCommunityAgents: true,
  viewAnnouncements: true,
  personalDashboard: true,
  createAgents: false,
  deployAgents: false,
  runTasks: false,
  createWorkflows: false,
  advancedWorkflows: false,
  advancedTools: false,
  privateMarketplace: false,
  memory: false,
  advancedMemory: false,
  integrations: false,
  apiAccess: false,
  agentBuilder: false,
  templates: false,
  analytics: false,
  marketplaceAccess: false,
  teamWorkspace: false,
  advancedSecurity: false,
  customIntegrations: false,
  unlimitedTeams: false,
  priorityInfrastructure: false,
};

// Pro "Builder" — create/deploy agents, basic workflows + memory, analytics.
const PRO_FEATURES = {
  ...FREE_FEATURES,
  createAgents: true,
  deployAgents: true,
  runTasks: true,
  createWorkflows: true,
  memory: true,
  agentBuilder: true,
  templates: true,
  analytics: true,
  marketplaceAccess: true,
  integrations: true,
};

// Business — unlimited agent creation, team workspace, advanced workflows,
// API access, advanced memory, private marketplace.
const BUSINESS_FEATURES = {
  ...PRO_FEATURES,
  advancedWorkflows: true,
  advancedMemory: true,
  advancedTools: true,
  privateMarketplace: true,
  apiAccess: true,
  teamWorkspace: true,
  // Enterprise controls unlocked at £1,500/mo
  auditLogs: true,
  loginTracking: true,
  permissionManagement: true,
  departments: true,
  roleManagement: true,
  multipleTeams: true,
};

// Enterprise — full AI workforce, unlimited teams, advanced security,
// custom integrations, priority infrastructure. £3,000/mo unlocks the
// advanced security suite and priority features.
const ENTERPRISE_FEATURES = {
  ...BUSINESS_FEATURES,
  advancedSecurity: true,
  customIntegrations: true,
  unlimitedTeams: true,
  priorityInfrastructure: true,
  priorityFeatures: true,
  customRoles: true,
  sso: true,
  advancedAuditLogs: true,
  dataResidency: true,
};

export const PLAN_FEATURES = {
  free: FREE_FEATURES,
  pro: PRO_FEATURES,
  business: BUSINESS_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

export const FEATURE_LABELS = {
  createAgents: "Create custom AI agents",
  deployAgents: "Deploy AI agents",
  runTasks: "Run AI workforce tasks",
  createWorkflows: "Create workflows",
  advancedWorkflows: "Advanced workflows",
  advancedTools: "Advanced tools",
  privateMarketplace: "Private marketplace",
  memory: "Agent memory",
  advancedMemory: "Advanced memory",
  integrations: "Integrations",
  apiAccess: "API access",
  agentBuilder: "AI Agent Builder",
  templates: "Agent templates",
  analytics: "Analytics",
  marketplaceAccess: "Marketplace access",
  teamWorkspace: "Team workspace",
  advancedSecurity: "Advanced security",
  customIntegrations: "Custom integrations",
  unlimitedTeams: "Unlimited teams",
  priorityInfrastructure: "Priority infrastructure",
  auditLogs: "Audit logs",
  loginTracking: "Login tracking",
  permissionManagement: "Permission management",
  departments: "Departments",
  roleManagement: "Role management",
  multipleTeams: "Multiple teams",
  priorityFeatures: "Priority features",
  customRoles: "Custom roles",
  sso: "Single sign-on (SSO)",
  advancedAuditLogs: "Advanced audit & retention",
  dataResidency: "Data residency controls",
};

// Hard capacity limits per plan. Higher plans unlock more agents, users,
// usage, teams, departments and advanced controls. `null` = unlimited.
// Business (£1,500) and Enterprise (£3,000) are the enterprise tiers.
export const PLAN_LIMITS = {
  free: {
    agents: 0,
    users: 1,
    monthlyRuns: 0,
    storageGB: 1,
    teams: 0,
    departments: 0,
    apiKeys: 0,
    retentionDays: 0,
  },
  pro: {
    agents: 5,
    users: 1,
    monthlyRuns: 500,
    storageGB: 5,
    teams: 1,
    departments: 0,
    apiKeys: 2,
    retentionDays: 30,
  },
  business: {
    agents: 50,
    users: 25,
    monthlyRuns: 50000,
    storageGB: 100,
    teams: 10,
    departments: 10,
    apiKeys: 25,
    retentionDays: 180,
  },
  enterprise: {
    agents: null,
    users: null,
    monthlyRuns: null,
    storageGB: 500,
    teams: null,
    departments: null,
    apiKeys: null,
    retentionDays: 365,
  },
};

export function getEnterpriseLimits(user) {
  const key = getPlanKey(user);
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}

export function isEnterprisePlan(user) {
  const key = getPlanKey(user);
  return key === "business" || key === "enterprise";
}

// Server plan codes -> frontend tier keys. `explorer` is the free tier and
// `builder` is the paid entry tier in the database `plans` table.
const PLAN_CODE_ALIASES = { explorer: "free", builder: "pro" };

/**
 * Resolves the caller's plan. The value originates entirely from the server
 * (`subscriptions` -> entitlements -> AuthContext). There is no client-side
 * override: an attacker editing local state gains nothing, because every gated
 * action is re-checked server-side by the entitlement engine.
 */
export function getPlanKey(user) {
  const raw = user?.subscription_plan || user?.data?.subscription_plan || "";
  const p = PLAN_CODE_ALIASES[raw] || raw;
  return PLAN_TIER_ORDER.includes(p) ? p : "free";
}

export function isFree(user) {
  return getPlanKey(user) === "free";
}
export function isProPlus(user) {
  return PLAN_TIER_ORDER.indexOf(getPlanKey(user)) >= PLAN_TIER_ORDER.indexOf("pro");
}

export function can(user, feature) {
  const key = getPlanKey(user);
  return !!(PLAN_FEATURES[key] && PLAN_FEATURES[key][feature]);
}

const ALL_PLANS = [...FREEMIUM_PLANS, ...PLANS];
export function planDisplay(key) {
  const p = ALL_PLANS.find((pl) => pl.id === key);
  if (p) return { name: p.name, subtitle: p.subtitle || "", price: p.monthly };
  return { name: "Free", subtitle: "", price: 0 };
}

// Usage limits surfaced on the billing page. `max: null` means unlimited.
export function getUsageLimits(user) {
  const key = getPlanKey(user);
  const map = {
    free: {
      activeAgents: { used: 0, max: 0 },
      monthlyRuns: { used: 0, max: 0 },
      storage: { used: 0.2, max: 1, unit: "GB" },
    },
    pro: {
      activeAgents: { used: 3, max: 5 },
      monthlyRuns: { used: 210, max: 500 },
      storage: { used: 1.8, max: 5, unit: "GB" },
    },
    business: {
      activeAgents: { used: 38, max: 50 },
      monthlyRuns: { used: 41000, max: 50000 },
      storage: { used: 78, max: 100, unit: "GB" },
    },
    enterprise: {
      activeAgents: { used: 86, max: 200 },
      monthlyRuns: { used: 45000, max: 250000 },
      storage: { used: 120, max: 500, unit: "GB" },
    },
  };
  return map[key] || map.free;
}
