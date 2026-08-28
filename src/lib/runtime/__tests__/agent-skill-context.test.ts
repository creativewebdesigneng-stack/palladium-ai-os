import { describe, expect, it } from "vitest";
import { loadProgressiveSkillContext, renderProgressiveSkillPrompt } from "../agent-skills/skill-context.server";
import { createFakeSupabase } from "./fake-supabase";

describe("progressive agent skill context", () => {
  it("loads compact metadata and only relevant playbook bodies", async () => {
    const db = createFakeSupabase({
      agent_skills: [
        {
          id: "shopify",
          user_id: "user-1",
          name: "shopify-daily-ops",
          description: "Review Shopify orders and daily store operations",
          version: "1.0.0",
          requires_tools: ["integration_action"],
          requires_scripts: ["daily-report.json"],
          dangerous: false,
          body: "Review open Shopify orders, then prepare the daily operations report.",
          enabled: true,
          scan_verdict: "ok",
          updated_at: "2026-08-28T08:00:00Z",
        },
        {
          id: "github",
          user_id: "user-1",
          name: "github-triage",
          description: "Triage GitHub repositories and issues",
          version: "1.0.0",
          requires_tools: ["connected_service"],
          requires_scripts: [],
          dangerous: false,
          body: "Read repository status and prioritize issues.",
          enabled: true,
          scan_verdict: "ok",
          updated_at: "2026-08-28T08:00:00Z",
        },
      ],
    }) as any;

    const context = await loadProgressiveSkillContext({
      sb: db,
      userId: "user-1",
      input: "Review today's Shopify orders and store operations",
      grantedTools: ["integration_action", "connected_service"],
    });

    expect(context.index.map((skill) => skill.name)).toEqual(["shopify-daily-ops", "github-triage"]);
    expect(context.selected.map((skill) => skill.name)).toEqual(["shopify-daily-ops"]);
    expect(context.selected[0]?.requiresScripts).toEqual(["daily-report.json"]);
    const prompt = renderProgressiveSkillPrompt(context);
    expect(prompt).toContain("Available reusable skills");
    expect(prompt).toContain("Review open Shopify orders");
    expect(prompt).toContain("daily-report.json");
    expect(prompt).toContain("Use skill_script");
    expect(prompt).not.toContain("Read repository status");
  });

  it("excludes dangerous scans and skills whose required tools are not granted", async () => {
    const db = createFakeSupabase({
      agent_skills: [
        {
          id: "unsafe",
          user_id: "user-1",
          name: "unsafe-helper",
          description: "Dangerous helper",
          version: "1",
          requires_tools: [],
          requires_scripts: [],
          dangerous: true,
          body: "Do unsafe things",
          enabled: true,
          scan_verdict: "dangerous",
          updated_at: "2026-08-28T08:00:00Z",
        },
        {
          id: "needs-browser",
          user_id: "user-1",
          name: "browser-helper",
          description: "Browser automation helper",
          version: "1",
          requires_tools: ["browser_task"],
          requires_scripts: [],
          dangerous: false,
          body: "Use browser automation.",
          enabled: true,
          scan_verdict: "ok",
          updated_at: "2026-08-28T08:00:00Z",
        },
      ],
    }) as any;

    const context = await loadProgressiveSkillContext({
      sb: db,
      userId: "user-1",
      input: "Use the browser helper",
      grantedTools: ["calculator"],
    });
    expect(context).toEqual({ index: [], selected: [] });
  });
});
