import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adaptN8nWorkflowDefinition, isN8nWorkflowDefinition } from "@/lib/workflows/n8n-interoperability";

const migration = readFileSync("supabase/migrations/20260828213000_productivity_seo_native.sql", "utf8");
const tools = readFileSync("src/lib/runtime/tools.server.ts", "utf8");
const seoTool = readFileSync("src/lib/seo/seo-agent-tool.server.ts", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");
const tasks = readFileSync("src/screens/Tasks.jsx", "utf8");
const seoRoute = readFileSync("src/routes/_shell/_app/seo-studio.tsx", "utf8");

describe("n8n + Super Productivity + OpenSEO native integration", () => {
  it("adds owner-scoped focus and SEO stores without credential columns", () => {
    expect(migration).toContain("public.task_focus_sessions");
    expect(migration).toContain("public.seo_projects");
    expect(migration).toContain("public.seo_snapshots");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toMatch(/access_token|refresh_token|api_key|client_secret|password\s+text/i);
  });

  it("keeps productivity inside the existing Tasks surface", () => {
    expect(tasks).toContain("TaskFocusPanel");
    expect(tasks).toContain("focus sessions and tracked work time");
  });

  it("exposes SEO as a bounded Harness-routed, owner-scoped agent capability", () => {
    expect(tools).toContain("SEO_TOOL_DEF");
    expect(tools).toContain("runSeoTool");
    expect(tools).toContain('"seo_ops"');
    expect(tools).toContain("assertHarnessToolInput");
    expect(tools).toContain('from("tool_executions")');
    expect(seoTool).toContain('.from("seo_projects").select("id").eq("id", projectId).eq("user_id", ctx.userId).maybeSingle()');
    expect(sidebar).toContain("['SEO Studio', '/seo-studio', Search]");
    expect(seoRoute).toContain('createFileRoute("/_shell/_app/seo-studio")');
  });

  it("translates only supported n8n-style nodes into PalladiumAI workflow kinds", () => {
    const source = {
      name: "Imported automation",
      nodes: [
        { name: "Manual", type: "n8n-nodes-base.manualTrigger", parameters: {} },
        { name: "Wait", type: "n8n-nodes-base.wait", parameters: { amount: 2, unit: "seconds" } },
        { name: "Notify", type: "n8n-nodes-base.slack", parameters: { channel: "ops" } },
      ],
    };
    expect(isN8nWorkflowDefinition(source)).toBe(true);
    const adapted = adaptN8nWorkflowDefinition(source) as any;
    expect(adapted.trigger_type).toBe("manual");
    expect(adapted.steps.map((step: any) => step.kind)).toEqual(["delay", "notification"]);
    expect(adapted.steps[0].config.duration_ms).toBe(2000);
  });

  it("strips secret-like inline n8n parameters during clean-room translation", () => {
    const adapted = adaptN8nWorkflowDefinition({
      name: "Credential-safe import",
      nodes: [
        { name: "Manual", type: "n8n-nodes-base.manualTrigger", parameters: {} },
        {
          name: "Notify",
          type: "n8n-nodes-base.slack",
          parameters: { channel: "ops", apiKey: "must-not-survive", nested: { client_secret: "nope", message: "safe" } },
        },
      ],
    }) as any;
    expect(adapted.steps[0].config.parameters).toEqual({ channel: "ops", nested: { message: "safe" } });
  });

  it("fails closed on n8n nodes that cannot be translated safely", () => {
    expect(() => adaptN8nWorkflowDefinition({
      name: "Unsafe import",
      nodes: [{ name: "Unknown", type: "n8n-nodes-base.someFutureNode", parameters: {} }],
    })).toThrow(/cannot safely translate/i);
  });
});
