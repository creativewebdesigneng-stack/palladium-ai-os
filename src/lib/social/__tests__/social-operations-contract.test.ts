import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260828183000_social_operations.sql", "utf8");
const functions = readFileSync("src/lib/social/social-operations.functions.ts", "utf8");
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
  });

  it("keeps Social Operations as its own first-class page and navigation destination", () => {
    expect(route).toContain('createFileRoute("/_shell/_app/social-operations")');
    expect(route).toContain('import Screen from "@/screens/SocialOperations"');
    expect(route).toContain('title: "Social Operations — PalladiumAI"');
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
