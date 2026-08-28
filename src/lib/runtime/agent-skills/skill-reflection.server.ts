import { scanAgentSkillFiles } from "./skill-security-scanner";

type Sb = { from: (table: string) => any };

const MAX_BODY = 6_000;

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54)
    .replace(/-+$/g, "");
  return normalized || "verified-procedure";
}

function candidateName(agentName: string, objective: string): string {
  const stem = slug(objective || agentName);
  return `${stem}-playbook`.slice(0, 63).replace(/-+$/g, "");
}

export async function createSkillCandidateFromVerifiedExperience(args: {
  sb: Sb;
  userId: string;
  taskId: string;
}) {
  const { data: task, error: taskError } = await args.sb
    .from("agent_tasks")
    .select("id,user_id,agent_id,org_id,input,status,verification_state")
    .eq("id", args.taskId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (taskError || !task) throw new Error("That verified task is not available to you.");
  if (!["succeeded", "completed"].includes(String(task.status))) {
    throw new Error("Only completed verified tasks can become skill candidates.");
  }
  if (!task.verification_state) throw new Error("The task has no verifier result to reflect from.");

  const { data: memory, error: memoryError } = await args.sb
    .from("agent_memories")
    .select("id,title,content,metadata")
    .eq("user_id", args.userId)
    .eq("task_id", args.taskId)
    .eq("category", "verified_experience")
    .limit(1)
    .maybeSingle();
  if (memoryError || !memory) {
    throw new Error("Verified experience must be captured before creating a reusable skill candidate.");
  }

  const { data: agent } = await args.sb
    .from("personal_agents")
    .select("id,name")
    .eq("id", task.agent_id)
    .eq("user_id", args.userId)
    .maybeSingle();
  const agentName = String(agent?.name ?? "Agent");
  const objective = String(task.input ?? "").trim();
  const name = candidateName(agentName, objective);
  const description = `Reviewable playbook learned from a verified ${agentName} task.`.slice(0, 240);
  const body = String(memory.content ?? "").trim().slice(0, MAX_BODY);
  if (!body) throw new Error("Verified experience did not contain a reusable procedure.");

  const markdown = `---\nname: ${name}\ndescription: ${description}\nversion: 0.1.0\nrequires_tools: []\nrequires_scripts: []\ndangerous: false\n---\n${body}`;
  const scan = scanAgentSkillFiles([{ path: "SKILL.md", content: markdown }]);
  if (scan.verdict === "dangerous") {
    throw new Error("Reflected skill candidate was blocked by the skill security scanner.");
  }

  const { data: existing } = await args.sb
    .from("agent_skills")
    .select("id")
    .eq("user_id", args.userId)
    .eq("source_kind", "reflection")
    .eq("source_ref", args.taskId)
    .maybeSingle();
  if (existing) return existing;

  const { data: skill, error } = await args.sb
    .from("agent_skills")
    .insert({
      user_id: args.userId,
      org_id: task.org_id ?? null,
      name,
      description,
      version: "0.1.0",
      body,
      requires_tools: [],
      requires_scripts: [],
      dangerous: false,
      scan_verdict: scan.verdict,
      scan_findings: scan.findings,
      files: { "SKILL.md": markdown },
      source_kind: "reflection",
      source_ref: args.taskId,
      enabled: false,
    })
    .select("id,name,description,version,dangerous,scan_verdict,scan_findings,source_kind,source_ref,enabled,created_at,updated_at")
    .maybeSingle();
  if (error || !skill) throw new Error("Could not create the reusable skill candidate.");

  await args.sb.from("mission_audit_logs").insert({
    user_id: args.userId,
    action: "agent_skill_reflected",
    target_type: "agent_skill",
    target_id: skill.id,
    status: "success",
    metadata: {
      source_task_id: args.taskId,
      source_memory_id: memory.id,
      enabled: false,
      scan_verdict: scan.verdict,
    },
  });
  return skill;
}
