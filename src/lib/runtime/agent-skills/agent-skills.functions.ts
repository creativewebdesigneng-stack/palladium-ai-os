import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { prepareAgentSkillPackage } from "./skill-package";
import { createSkillCandidateFromVerifiedExperience } from "./skill-reflection.server";

type Sb = { from: (table: string) => any };

type SkillFileInput = { path: string; content: string };

const SAFE_COLUMNS = "id,name,description,version,requires_tools,requires_scripts,dangerous,scan_verdict,scan_findings,source_kind,source_ref,enabled,created_at,updated_at";

export const listAgentSkills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from("agent_skills").select(SAFE_COLUMNS).order("updated_at", { ascending: false });
    if (error) throw new Error("Could not load agent skills.");
    return { skills: data ?? [] };
  });

export const getAgentSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("agent_skills")
      .select(`${SAFE_COLUMNS},body`)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("That skill is not available to you.");
    return { skill: row };
  });

export const installAgentSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      files: SkillFileInput[];
      acknowledgeRisk?: boolean;
      sourceKind?: "upload" | "github" | "reflection" | "builtin";
      sourceRef?: string | null;
      orgId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const prepared = prepareAgentSkillPackage(
      data.files,
      data.acknowledgeRisk === undefined ? {} : { acknowledgeRisk: data.acknowledgeRisk },
    );

    const row = {
      user_id: userId,
      org_id: data.orgId ?? null,
      name: prepared.name,
      description: prepared.description,
      version: prepared.version,
      body: prepared.body,
      requires_tools: prepared.requiresTools,
      requires_scripts: prepared.requiresScripts,
      dangerous: prepared.dangerous,
      scan_verdict: prepared.scan.verdict,
      scan_findings: prepared.scan.findings,
      files: prepared.files,
      source_kind: data.sourceKind ?? "upload",
      source_ref: data.sourceRef?.trim().slice(0, 500) || null,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await sb
      .from("agent_skills")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", prepared.name)
      .maybeSingle();

    const result = existing
      ? await sb.from("agent_skills").update(row).eq("id", existing.id).eq("user_id", userId).select(SAFE_COLUMNS).maybeSingle()
      : await sb.from("agent_skills").insert(row).select(SAFE_COLUMNS).maybeSingle();
    if (result.error || !result.data) throw new Error("Could not install that agent skill.");

    await sb.from("mission_audit_logs").insert({
      user_id: userId,
      action: existing ? "agent_skill_updated" : "agent_skill_installed",
      target_type: "agent_skill",
      target_id: result.data.id,
      status: "success",
      metadata: {
        name: prepared.name,
        version: prepared.version,
        scan_verdict: prepared.scan.verdict,
        dangerous: prepared.dangerous,
        source_kind: row.source_kind,
      },
    });

    return { skill: result.data };
  });

export const reflectVerifiedExperienceToSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data, context }) => {
    const skill = await createSkillCandidateFromVerifiedExperience({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      taskId: data.taskId,
    });
    return { skill };
  });

export const setAgentSkillEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled: boolean }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const result = await sb
      .from("agent_skills")
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select(SAFE_COLUMNS)
      .maybeSingle();
    if (result.error || !result.data) throw new Error("That skill is not available to you.");
    await sb.from("mission_audit_logs").insert({
      user_id: userId,
      action: data.enabled ? "agent_skill_enabled" : "agent_skill_disabled",
      target_type: "agent_skill",
      target_id: data.id,
      status: "success",
      metadata: { enabled: data.enabled },
    });
    return { skill: result.data };
  });

export const deleteAgentSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const { data: row } = await sb.from("agent_skills").select("id,name").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!row) throw new Error("That skill is not available to you.");
    const deleted = await sb.from("agent_skills").delete().eq("id", data.id).eq("user_id", userId);
    if (deleted.error) throw new Error("Could not delete that agent skill.");
    await sb.from("mission_audit_logs").insert({
      user_id: userId,
      action: "agent_skill_deleted",
      target_type: "agent_skill",
      target_id: data.id,
      status: "success",
      metadata: { name: row.name },
    });
    return { ok: true };
  });
