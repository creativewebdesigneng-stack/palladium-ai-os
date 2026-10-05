export type CapabilityFamily =
  | "ecommerce"
  | "food_delivery"
  | "social_media"
  | "productivity"
  | "communication"
  | "crm"
  | "project_management"
  | "finance"
  | "website_portal"
  | "browser_automation"
  | "desktop_automation"
  | "developer_tools"
  | "storage"
  | "email"
  | "calendar"
  | "creative_design"
  | "media_generation"
  | "three_d"
  | "analytics"
  | "marketing";

export type ExecutionLane =
  | "direct_api"
  | "connector_transport"
  | "browser"
  | "desktop_worker";

export type ProviderCapabilityProfile = {
  id: string;
  name: string;
  families: CapabilityFamily[];
  preferredLanes: ExecutionLane[];
  status: "native" | "connector" | "hybrid" | "planned";
  notes?: string;
};

/**
 * Product capability metadata only. `planned` does not imply that OAuth or
 * provider APIs are configured. Runtime connection state remains authoritative.
 */
export const PROVIDER_CAPABILITY_PROFILES: ProviderCapabilityProfile[] = [
  { id: "shopify", name: "Shopify", families: ["ecommerce"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "hybrid", notes: "Native and bounded connector actions are available when the user has a valid connection." },
  { id: "etsy", name: "Etsy", families: ["ecommerce"], preferredLanes: ["connector_transport", "browser"], status: "connector", notes: "Bounded seller actions are available through an owned connector connection." },
  { id: "woocommerce", name: "WooCommerce", families: ["ecommerce"], preferredLanes: ["connector_transport", "browser"], status: "connector", notes: "REST API v3 product and order actions are bounded through the connector runtime." },
  { id: "amazon_seller", name: "Amazon Seller", families: ["ecommerce"], preferredLanes: ["connector_transport", "browser"], status: "connector", notes: "Execution depends on a connected provider advertising deployed SP-API actions; Blackstar does not emulate Amazon signing." },
  { id: "ebay", name: "eBay", families: ["ecommerce"], preferredLanes: ["connector_transport", "browser"], status: "connector", notes: "Bounded Inventory and Fulfillment actions are available through an owned connector connection." },
  { id: "uber_eats", name: "Uber Eats", families: ["food_delivery"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Capabilities remain gated by approved provider access and live connection state." },
  { id: "deliveroo", name: "Deliveroo", families: ["food_delivery"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Capabilities remain gated by approved provider access and live connection state." },
  { id: "just_eat", name: "Just Eat", families: ["food_delivery"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Capabilities remain gated by approved provider access and live connection state." },
  { id: "doordash", name: "DoorDash", families: ["food_delivery"], preferredLanes: ["direct_api", "connector_transport"], status: "planned" },
  { id: "wolt", name: "Wolt", families: ["food_delivery"], preferredLanes: ["direct_api", "connector_transport"], status: "planned" },
  { id: "instagram", name: "Instagram", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "facebook", name: "Facebook", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "tiktok", name: "TikTok", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "linkedin", name: "LinkedIn", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "youtube", name: "YouTube", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "x", name: "X / Twitter", families: ["social_media"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "google", name: "Google Workspace", families: ["productivity", "email", "calendar", "storage"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "hybrid" },
  { id: "microsoft", name: "Microsoft 365", families: ["productivity", "email", "calendar", "storage"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "slack", name: "Slack", families: ["communication"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "github", name: "GitHub", families: ["developer_tools"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "salesforce", name: "Salesforce", families: ["crm"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "hybrid" },
  { id: "hubspot", name: "HubSpot", families: ["crm"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "hybrid" },
  { id: "asana", name: "Asana", families: ["project_management"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "linear", name: "Linear", families: ["project_management"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "notion", name: "Notion", families: ["project_management", "productivity"], preferredLanes: ["direct_api", "connector_transport", "browser", "desktop_worker"], status: "hybrid" },
  { id: "canva", name: "Canva", families: ["creative_design", "media_generation"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "connector", notes: "Nango-backed connector route for user-owned Canva accounts; typed actions are discovered at runtime and writes remain approval-gated." },
  { id: "huggingface", name: "Hugging Face", families: ["creative_design", "media_generation", "three_d", "developer_tools"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for model, dataset and Space discovery plus approved inference endpoints. Model availability does not imply execution until a provider route is configured." },
  { id: "figma", name: "Figma", families: ["creative_design", "developer_tools"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned", notes: "Target connector for design files, component libraries, tokens and design-to-code handoff." },
  { id: "adobe", name: "Adobe Creative Cloud", families: ["creative_design", "media_generation"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned", notes: "Target connector for image, document and media production under explicit user authorization." },
  { id: "runway", name: "Runway", families: ["media_generation", "creative_design"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for governed video and image generation when a live account/API route is configured." },
  { id: "higgsfield", name: "Higgsfield", families: ["media_generation", "creative_design"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for image, video and branded-content generation when a live provider route is configured." },
  { id: "vercel", name: "Vercel", families: ["developer_tools", "website_portal"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for user-owned projects, deployments and runtime operations. Blackstar's own hosting credentials are never reused as a user connection." },
  { id: "supabase", name: "Supabase", families: ["developer_tools", "storage"], preferredLanes: ["direct_api", "connector_transport"], status: "connector", notes: "Nango-backed connector route for user-owned Supabase organizations/projects; provider credentials remain isolated and consequential writes stay approval-gated." },
  { id: "lovable", name: "Lovable", families: ["website_portal", "developer_tools"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned", notes: "Target connector for user-owned app and website build workflows; execution remains provider- and account-gated." },
  { id: "webflow", name: "Webflow", families: ["website_portal", "creative_design", "developer_tools"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "connector", notes: "Nango-backed connector route for user-owned Webflow sites/CMS; typed actions are discovered at runtime and publishing writes remain approval-gated." },
  { id: "heygen", name: "HeyGen", families: ["media_generation", "creative_design"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for avatar video, speech, lip-sync, clipping and localization. Generation is not implied until a user-owned provider route executes successfully." },
  { id: "semrush", name: "Semrush", families: ["analytics", "marketing"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for SEO, keyword, backlink, traffic, audience and competitive intelligence." },
  { id: "metricool", name: "Metricool", families: ["social_media", "analytics", "marketing"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for social analytics, scheduling and approval-oriented publishing workflows." },
  { id: "airtable", name: "Airtable", families: ["productivity", "project_management", "storage"], preferredLanes: ["direct_api", "connector_transport"], status: "connector", notes: "Nango-backed connector route for user-owned Airtable bases and records; typed actions are discovered at runtime and writes remain approval-gated." },
  { id: "coda", name: "Coda", families: ["productivity", "project_management"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for operating documents that combine pages, tables, formulas, controls and collaboration." },
  { id: "dropbox", name: "Dropbox", families: ["storage", "productivity"], preferredLanes: ["direct_api", "connector_transport"], status: "connector", notes: "Nango-backed connector route for user-owned Dropbox files, sharing and revisions; typed actions are discovered at runtime and writes remain approval-gated." },
  { id: "sharepoint", name: "SharePoint", families: ["storage", "productivity"], preferredLanes: ["direct_api", "connector_transport"], status: "connector", notes: "Nango-backed SharePoint Online connector route with canonical Blackstar provider identity; typed Graph/SharePoint actions are discovered at runtime and writes remain approval-gated." },
  { id: "amplitude", name: "Amplitude", families: ["analytics"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for product metrics, funnels, cohorts, experiments, feature flags and anomaly monitoring." },
  { id: "posthog", name: "PostHog", families: ["analytics", "developer_tools"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for product analytics, experiments, feature flags, error tracking, replay and LLM observability." },
  { id: "datadog", name: "Datadog", families: ["observability", "analytics", "developer_tools"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for user-owned logs, metrics, traces, incidents and monitors. Observability data never implies Blackstar acceptance certification." },
  { id: "vanta", name: "Vanta", families: ["security_compliance"], preferredLanes: ["direct_api", "connector_transport"], status: "planned", notes: "Target connector for user-owned compliance controls, evidence, risks, audits and vendors. Connection or evidence visibility never certifies compliance." },
];

export function capabilityProfile(provider: string): ProviderCapabilityProfile | undefined {
  const normalized = provider.trim().toLowerCase().replace(/^nango_/, "");
  return PROVIDER_CAPABILITY_PROFILES.find((item) => item.id === normalized);
}
