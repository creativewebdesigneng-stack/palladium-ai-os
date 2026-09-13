import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const matters = readFileSync(new URL("./legal-matters.functions.ts", import.meta.url), "utf8");
const workbench = readFileSync(
  new URL("../../components/legal/LegalResearchWorkbench.jsx", import.meta.url),
  "utf8",
);

describe("legal research pack workflow", () => {
  it("adds explicit owner scoping to matter and research-run reads and mutations", () => {
    expect(matters.match(/\.eq\("user_id",context\.userId\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(matters).toContain('from("legal_research_matters").select("*").eq("user_id",context.userId)');
    expect(matters).toContain('.update(row).eq("id",data.id).eq("user_id",context.userId)');
    expect(matters).toContain('.eq("matter_id",data.matter_id).eq("user_id",context.userId)');
    expect(matters).toContain('.select("id").eq("id",data.matter_id).eq("user_id",context.userId)');
  });

  it("persists research provenance only after verifying the owner-scoped matter exists", () => {
    const verifyIndex = matters.indexOf('.select("id").eq("id",data.matter_id).eq("user_id",context.userId)');
    const insertIndex = matters.indexOf('from("legal_research_runs").insert({...data,user_id:context.userId})');
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(verifyIndex);
    expect(matters).toContain("query:z.string().min(3).max(600)");
    expect(matters).toContain("jurisdiction:z.string().min(1).max(120)");
    expect(matters).toContain("provider:z.string().max(80).optional()");
    expect(matters).toContain("model:z.string().max(180).optional()");
    expect(matters).toContain("sources:z.array");
  });

  it("connects live legal research to matching open or review matters", () => {
    expect(workbench).toContain("listLegalMatters");
    expect(workbench).toContain("saveLegalResearchRun");
    expect(workbench).toContain("m.jurisdiction===jurisdiction&&m.status!=='closed'");
    expect(workbench).toContain("Save research run");
    expect(workbench).toContain("Saved to ${matter?.title||'legal matter'} research history.");
  });

  it("saves the evidence-backed result and model provenance rather than a detached summary", () => {
    expect(workbench).toContain("query:q,jurisdiction,topic,report:result.report");
    expect(workbench).toContain("provider:result.provider,model:result.model");
    expect(workbench).toContain("sources:result.sources.map");
  });

  it("keeps coverage depth and official-source labels informational", () => {
    expect(workbench).toContain("Coverage describes curated research entry points, not completeness or legal applicability.");
    expect(workbench).toContain("isOfficialLegalUrl(s.url)");
    expect(workbench).toContain("official");
  });
});
