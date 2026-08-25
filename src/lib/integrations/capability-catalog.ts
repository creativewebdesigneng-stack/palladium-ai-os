export type CapabilityFamily =
  | "ecommerce"
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
  | "calendar";

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
  { id: "shopify", name: "Shopify", families: ["ecommerce"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "etsy", name: "Etsy", families: ["ecommerce"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "woocommerce", name: "WooCommerce", families: ["ecommerce"], preferredLanes: ["direct_api", "browser"], status: "planned" },
  { id: "amazon_seller", name: "Amazon Seller", families: ["ecommerce"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
  { id: "ebay", name: "eBay", families: ["ecommerce"], preferredLanes: ["direct_api", "connector_transport", "browser"], status: "planned" },
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
];

export function capabilityProfile(provider: string): ProviderCapabilityProfile | undefined {
  const normalized = provider.trim().toLowerCase().replace(/^nango_/, "");
  return PROVIDER_CAPABILITY_PROFILES.find((item) => item.id === normalized);
}
