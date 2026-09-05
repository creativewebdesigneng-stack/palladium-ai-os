import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260828183000_social_operations.sql", "utf8");
const functions = readFileSync("src/lib/social/social-operations.functions.ts", "utf8");
const externalApprovals = readFileSync("src/lib/mission/external-action-approval.functions.ts", "utf8");
const screen = readFileSync("src/screens/SocialOperations.jsx", "utf8");
const connectors = readFileSync("src/components/social/SocialConnectorPanel.jsx", "utf8");
const route = readFileSync("src/routes/_shell/_app/social-operations.tsx", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");

describe("Social Operations native contract", () => {
  it("persists owner-scoped posts and provider targets without credential columns", () => {
    expect(migration).toContain("create table if not exists public.social_posts");
    expect(migration).toContain("create table if not exists public.social_post_targets");
    expect(migration).toContain("alter table public.social_posts enable row level security");
    expect(migration).toContain("alter table public.social_post_targets enable row level security");
    expect(migration).toContain('create policy "social_posts_owner_select"');
    expect(migration).toContain('create policy "social_post_targets_owner_select"');
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toMatch(/access_token|refresh_token|api_key|client_secret|password\s+text/i);
  });

  it("binds targets only through authenticated live integration capabilities", () => {
    expect(functions).toContain("requireSupabaseAuth");
    expect(functions).toContain("listIntegrationCapabilities");
    expect(functions).toContain("prepareIntegrationAction");
    expect(functions).toContain("SOCIAL_PROVIDERS");
    expect(functions).toContain("Credential-like field");
    expect(functions).toContain('status: prepared.requiresApproval ? "approval_required" : "pending"');
    expect(functions).toContain("SOCIAL_READ_ACTIONS");
    expect(functions).toContain("Read-only social capabilities cannot be attached as publishing destinations");
  });

  it("creates a real immutable Mission Control approval and links it to the social target", () => {
    expect(functions).toContain('.from("approval_requests")');
    expect(functions).toContain('action_type: "nango_dynamic_action"');
    expect(functions).toContain("social_post_target_id: target.id");
    expect(functions).toContain("provider: prepared.provider");
    expect(functions).toContain("action: prepared.action");
    expect(functions).toContain("input: prepared.input");
    expect(functions).toContain("transport: prepared.transport");
    expect(functions).toContain("approval_request_id: approval.id");
    expect(externalApprovals).toContain('if (type === "nango_dynamic_action")');
    expect(externalApprovals).toContain("executeApprovedIntegrationAction(userId, details)");
    expect(externalApprovals).toContain('.eq("status", "pending")');
    expect(externalApprovals).toContain('execution_status: "executing"');
  });

  it("reconciles provider execution and TikTok publish status without a second executor", () => {
    expect(functions).toContain("approval.execution_result");
    expect(functions).toContain("PUBLISH_ID_KEYS");
    expect(functions).toContain('normalizeIntegrationProvider(target.provider) === "tiktok"');
    expect(functions).toContain("readTikTokPublishStatus");
    expect(functions).toContain("fetchTikTokPublishStatus");
    expect(functions).toContain('listIntegrationCapabilities(userId, "tiktok")');
    expect(functions).toContain("tiktokStatusCapability");
    expect(functions).toContain("executeIntegrationAction");
    expect(functions).toContain("provider_post_id: providerPostId");
    expect(functions).toContain("published_at: publishedAt");
    expect(functions).toContain("last_error: lastError");
    expect(functions).toContain("refreshSocialPostTarget");
  });

  it("keeps native provider-specific immutable bindings while approvals own the external mutation", () => {
    expect(functions).toContain('data.provider === "facebook" && data.action === "facebook_page_post"');
    expect(functions).toContain('data.provider === "instagram" && data.action === "instagram_image_post"');
    expect(functions).toContain('data.provider === "pinterest" && data.action === "pinterest_image_pin"');
    expect(functions).toContain('data.provider === "tiktok" && data.action === "tiktok_photo_post"');
    expect(functions).toContain('data.provider === "x" && data.action === "x_text_post"');
    expect(functions).toContain('data.provider === "threads" && data.action === "threads_text_post"');
  });

  it("keeps Social Operations as its own first-class page and navigation destination", () => {
    expect(route).toContain('createFileRoute("/_shell/_app/social-operations")');
    expect(route).toContain('import Screen from "@/screens/SocialOperations"');
    expect(route).toContain('title: "Social Operations — Blackstar"');
    expect(screen).toContain('title="Social Operations"');
    expect(screen).toContain("SocialConnectorPanel");
    expect(screen).toContain("Bind a live destination");
    expect(screen).toContain("Content calendar");
    expect(screen).toContain("listLiveSocialCapabilities");
    expect(screen).toContain("addSocialPostTarget");
    expect(screen).not.toMatch(/placeholder=["'][^"']*(token|secret|api key|password)/i);
    expect(sidebar).toContain("['Social Operations', '/social-operations', CalendarClock]");
  });

  it("connects social accounts through existing OAuth and Nango systems without browser credentials", () => {
    expect(connectors).toContain("listIntegrations");
    expect(connectors).toContain("startIntegrationOAuth");
    expect(connectors).toContain("testIntegrationConnection");
    expect(connectors).toContain("disconnectIntegration");
    expect(connectors).toContain("listNangoConnections");
    expect(connectors).toContain("startNangoConnection");
    expect(connectors).toContain("testNangoConnection");
    expect(connectors).toContain("disconnectNangoConnection");
    expect(connectors).toContain("Connect account");
    expect(connectors).toContain("Test connection");
    expect(connectors).toContain("Credentials remain server-side");
    expect(connectors).not.toMatch(/placeholder=["'][^"']*(token|secret|api key|password)/i);
  });
});
