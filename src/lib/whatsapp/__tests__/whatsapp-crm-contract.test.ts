import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260828190000_whatsapp_crm.sql", "utf8");
const functions = readFileSync("src/lib/whatsapp/whatsapp-crm.functions.ts", "utf8");
const screen = readFileSync("src/screens/WhatsAppCRM.jsx", "utf8");
const route = readFileSync("src/routes/_shell/_app/whatsapp-crm.tsx", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");

describe("WhatsApp CRM native contract", () => {
  it("reuses canonical CRM contacts and adds only WhatsApp-specific persistence", () => {
    expect(migration).toContain("references public.crm_contacts(id)");
    expect(migration).toContain("create table if not exists public.whatsapp_conversations");
    expect(migration).toContain("create table if not exists public.whatsapp_messages");
    expect(migration).toContain("create table if not exists public.whatsapp_broadcasts");
    expect(migration).toContain("create table if not exists public.whatsapp_broadcast_recipients");
    expect(migration).not.toContain("create table if not exists public.whatsapp_contacts");
  });

  it("keeps WhatsApp data owner scoped and credential free", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toMatch(/access_token|refresh_token|api_key|client_secret|password\s+text/i);
    expect(functions).toContain("Credential-like field");
    expect(functions).toContain("requireSupabaseAuth");
  });

  it("discovers live provider capabilities instead of adding a parallel transport", () => {
    expect(functions).toContain("listIntegrationCapabilities");
    expect(functions).toContain("normalizeIntegrationProvider");
    expect(functions).not.toContain("fetch(\"https://graph.facebook.com");
    expect(screen).toContain("External send remains controlled by PalladiumAI integration approvals");
    expect(screen).toContain("Manage connector");
  });

  it("ships a dedicated page and business navigation entry", () => {
    expect(route).toContain('createFileRoute("/_shell/_app/whatsapp-crm")');
    expect(route).toContain('import Screen from "@/screens/WhatsAppCRM"');
    expect(screen).toContain('title="WhatsApp CRM"');
    expect(screen).toContain("Broadcast planner");
    expect(screen).toContain("Inbox");
    expect(sidebar).toContain("['WhatsApp CRM', '/whatsapp-crm', MessageCircle]");
  });
});
