type AnyRecord = Record<string, unknown>;

type ImportedStep = {
  kind: "delay" | "approval" | "notification" | "agent";
  name: string;
  mode: "sequential";
  position: number;
  agent_id?: string | null;
  config: Record<string, unknown>;
};

const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|client[_-]?secret)/i;

function isObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max) : "";
}

function typeName(node: AnyRecord) {
  return cleanString(node["type"], 200).toLowerCase();
}

function scheduleFrom(node: AnyRecord) {
  const parameters = isObject(node["parameters"]) ? node["parameters"] : {};
  if (typeof parameters["cronExpression"] === "string") return parameters["cronExpression"].slice(0, 200);
  if (typeof parameters["rule"] === "string") return parameters["rule"].slice(0, 200);
  return null;
}

function delayMs(node: AnyRecord) {
  const parameters = isObject(node["parameters"]) ? node["parameters"] : {};
  const raw = Number(parameters["amount"] ?? parameters["waitAmount"] ?? 1);
  const unit = cleanString(parameters["unit"] ?? parameters["waitUnit"] ?? "seconds", 30).toLowerCase();
  const multiplier = unit.startsWith("minute") ? 60_000 : unit.startsWith("hour") ? 3_600_000 : 1_000;
  return Math.min(Math.max(Math.round((Number.isFinite(raw) ? raw : 1) * multiplier), 0), 300_000);
}

function jsonSafe(value: unknown, depth = 0): Record<string, unknown> {
  if (!isObject(value) || depth > 4) return {};
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 40)) {
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key) || SECRET_KEY.test(key)) continue;
    if (raw == null || typeof raw === "boolean" || typeof raw === "number") output[key] = raw;
    else if (typeof raw === "string") output[key] = raw.slice(0, 2000);
    else if (Array.isArray(raw)) output[key] = raw.slice(0, 20).filter((item) => typeof item === "string").map(String);
    else if (isObject(raw)) output[key] = jsonSafe(raw, depth + 1);
  }
  return output;
}

export function isN8nWorkflowDefinition(value: unknown) {
  return isObject(value) && Array.isArray(value["nodes"]) && !Array.isArray(value["steps"]);
}

export function adaptN8nWorkflowDefinition(value: unknown) {
  if (!isN8nWorkflowDefinition(value)) return value;
  const definition = value as AnyRecord;
  const rawNodes = definition["nodes"];
  const nodes: AnyRecord[] = Array.isArray(rawNodes) ? rawNodes.filter(isObject).slice(0, 100) : [];
  if (!nodes.length) throw new Error("The n8n workflow contains no nodes.");

  const triggerNode = nodes.find((node) => /manualtrigger|scheduletrigger|cron|webhook/.test(typeName(node)));
  const triggerType = triggerNode && /scheduletrigger|cron/.test(typeName(triggerNode))
    ? "schedule"
    : triggerNode && /webhook/.test(typeName(triggerNode))
      ? "webhook"
      : "manual";
  const schedule = triggerType === "schedule" && triggerNode ? scheduleFrom(triggerNode) : null;

  const unsupported: string[] = [];
  const steps: ImportedStep[] = [];
  const executableNodes = nodes.filter((node) => node !== triggerNode && !/manualtrigger|scheduletrigger|cron|webhook/.test(typeName(node)));

  for (const [index, node] of executableNodes.entries()) {
    const type = typeName(node);
    const name = cleanString(node["name"], 120) || `Imported node ${index + 1}`;
    if (/wait|delay/.test(type)) {
      steps.push({ kind: "delay", name, mode: "sequential", position: index, config: { duration_ms: delayMs(node) } });
      continue;
    }
    if (/approval/.test(type)) {
      steps.push({ kind: "approval", name, mode: "sequential", position: index, config: { source: "n8n-import", parameters: jsonSafe(node["parameters"]) } });
      continue;
    }
    if (/slack|email|gmail|notification|discord|teams/.test(type)) {
      steps.push({ kind: "notification", name, mode: "sequential", position: index, config: { message: `Imported notification node: ${name}`, source_type: type, parameters: jsonSafe(node["parameters"]) } });
      continue;
    }
    if (/agent|openai|anthropic|gemini|langchain/.test(type)) {
      const parameters = isObject(node["parameters"]) ? node["parameters"] : {};
      const agentId = cleanString(parameters["agentId"] ?? parameters["agent_id"], 60);
      steps.push({
        kind: "agent",
        name,
        mode: "sequential",
        position: index,
        agent_id: /^[0-9a-f-]{36}$/i.test(agentId) ? agentId : null,
        config: { source: "n8n-import", node_type: type, parameters: jsonSafe(parameters) },
      });
      continue;
    }
    unsupported.push(`${name} (${type || "unknown"})`);
  }

  if (unsupported.length) {
    throw new Error(`This n8n workflow contains nodes that PalladiumAI cannot safely translate yet: ${unsupported.slice(0, 8).join(", ")}${unsupported.length > 8 ? "…" : ""}. Remove or replace those nodes, then import again.`);
  }
  if (!steps.length) throw new Error("The n8n workflow has no executable nodes that map safely to PalladiumAI.");

  const meta = isObject(definition["meta"]) ? definition["meta"] : {};
  return {
    name: cleanString(definition["name"], 120) || "Imported n8n workflow",
    description: cleanString(definition["description"] ?? meta["description"], 1000),
    trigger_type: triggerType,
    schedule,
    steps,
  };
}
