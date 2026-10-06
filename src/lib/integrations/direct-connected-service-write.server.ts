import { hasDirectConnectedService } from "./direct-connected-service.server";

export type DirectConnectedServiceWriteCapability = {
  provider: "hubspot" | "notion" | "asana" | "linear";
  action: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const CAPABILITIES: DirectConnectedServiceWriteCapability[] = [
  {
    provider: "hubspot",
    action: "contact_update",
    description: "Update an allow-listed set of fields on an existing HubSpot contact after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["contact_id", "properties"],
      properties: {
        contact_id: { type: "string", pattern: "^\\d{1,30}$" },
        properties: {
          type: "object",
          properties: {
            firstname: { type: ["string", "number", "boolean"] },
            lastname: { type: ["string", "number", "boolean"] },
            email: { type: ["string", "number", "boolean"] },
            phone: { type: ["string", "number", "boolean"] },
            company: { type: ["string", "number", "boolean"] },
            jobtitle: { type: ["string", "number", "boolean"] },
            lifecyclestage: { type: ["string", "number", "boolean"] },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "hubspot",
    action: "deal_update",
    description: "Update an allow-listed set of fields on an existing HubSpot deal after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["deal_id", "properties"],
      properties: {
        deal_id: { type: "string", pattern: "^\\d{1,30}$" },
        properties: {
          type: "object",
          properties: {
            dealname: { type: ["string", "number", "boolean"] },
            amount: { type: ["string", "number", "boolean"] },
            dealstage: { type: ["string", "number", "boolean"] },
            pipeline: { type: ["string", "number", "boolean"] },
            closedate: { type: ["string", "number", "boolean"] },
            dealtype: { type: ["string", "number", "boolean"] },
            description: { type: ["string", "number", "boolean"] },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "notion",
    action: "child_page_create",
    description: "Create a bounded child page beneath an existing Notion page after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["parent_page_id", "title"],
      properties: {
        parent_page_id: { type: "string", maxLength: 36 },
        title: { type: "string", minLength: 1, maxLength: 500 },
        content: { type: "string", maxLength: 5000 },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "asana",
    action: "task_create",
    description: "Create an Asana task in a connected workspace, optionally adding it to one project, after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["workspace_id", "name"],
      properties: {
        workspace_id: { type: "string", pattern: "^\\d{1,30}$" },
        project_id: { type: "string", pattern: "^\\d{1,30}$" },
        name: { type: "string", minLength: 1, maxLength: 500 },
        notes: { type: "string", maxLength: 5000 },
        due_on: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "asana",
    action: "task_update",
    description: "Update bounded fields on an existing Asana task after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["task_id"],
      properties: {
        task_id: { type: "string", pattern: "^\\d{1,30}$" },
        name: { type: "string", maxLength: 500 },
        notes: { type: "string", maxLength: 5000 },
        completed: { type: "boolean" },
        due_on: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "linear",
    action: "issue_create",
    description: "Create a Linear issue with a bounded title and description after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["team_id", "title"],
      properties: {
        team_id: { type: "string", maxLength: 36 },
        title: { type: "string", minLength: 1, maxLength: 500 },
        description: { type: "string", maxLength: 10000 },
      },
      additionalProperties: false,
    },
  },
  {
    provider: "linear",
    action: "issue_update",
    description: "Update the title or description of an existing Linear issue after explicit approval.",
    inputSchema: {
      type: "object",
      required: ["issue_id"],
      properties: {
        issue_id: { type: "string", maxLength: 36 },
        title: { type: "string", maxLength: 500 },
        description: { type: "string", maxLength: 10000 },
      },
      additionalProperties: false,
    },
  },
];

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function allowedKeys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const allow = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allow.has(key));
  if (unknown.length) throw new Error(`${label} contains unsupported field "${unknown[0]}".`);
}

function id(value: unknown, pattern: RegExp, label: string): string {
  const result = String(value ?? "").trim();
  if (!pattern.test(result)) throw new Error(`A valid ${label} is required.`);
  return result;
}

function text(value: unknown, max: number, label: string, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${label} is required.`);
    return undefined;
  }
  const result = String(value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (required && !result) throw new Error(`${label} is required.`);
  return result;
}

function scalarProperties(
  value: unknown,
  allowed: readonly string[],
): Record<string, string | number | boolean> {
  const row = object(value, "properties");
  allowedKeys(row, allowed, "properties");
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(row)) {
    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
      throw new Error(`Property "${key}" must be a scalar value.`);
    }
    result[key] = typeof item === "string" ? item.slice(0, key === "description" ? 5000 : 1000) : item;
  }
  if (!Object.keys(result).length) throw new Error("At least one property is required.");
  return result;
}

function dueOn(value: unknown): string | undefined {
  const result = text(value, 10, "due_on");
  if (result === undefined || result === "") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new Error("due_on must use YYYY-MM-DD.");
  }
  return result;
}

const CONTACT_FIELDS = ["firstname", "lastname", "email", "phone", "company", "jobtitle", "lifecyclestage"] as const;
const DEAL_FIELDS = ["dealname", "amount", "dealstage", "pipeline", "closedate", "dealtype", "description"] as const;
const UUIDISH = /^[0-9a-fA-F-]{32,36}$/;
const GID = /^\d{1,30}$/;

export function directConnectedServiceWriteCapabilities(provider: string) {
  return CAPABILITIES.filter((capability) => capability.provider === provider);
}

export function isDirectConnectedServiceWriteAction(provider: string, action: string) {
  return CAPABILITIES.some((capability) => capability.provider === provider && capability.action === action);
}

export function validateDirectConnectedServiceWriteInput(
  provider: string,
  action: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const row = object(input, "action input");

  if (provider === "hubspot" && action === "contact_update") {
    allowedKeys(row, ["contact_id", "properties"], "HubSpot contact update");
    return {
      contact_id: id(row.contact_id, GID, "HubSpot contact ID"),
      properties: scalarProperties(row.properties, CONTACT_FIELDS),
    };
  }
  if (provider === "hubspot" && action === "deal_update") {
    allowedKeys(row, ["deal_id", "properties"], "HubSpot deal update");
    return {
      deal_id: id(row.deal_id, GID, "HubSpot deal ID"),
      properties: scalarProperties(row.properties, DEAL_FIELDS),
    };
  }
  if (provider === "notion" && action === "child_page_create") {
    allowedKeys(row, ["parent_page_id", "title", "content"], "Notion child page");
    return {
      parent_page_id: id(row.parent_page_id, UUIDISH, "Notion parent page ID"),
      title: text(row.title, 500, "Notion title", true)!,
      ...(row.content !== undefined ? { content: text(row.content, 5000, "Notion content") ?? "" } : {}),
    };
  }
  if (provider === "asana" && action === "task_create") {
    allowedKeys(row, ["workspace_id", "project_id", "name", "notes", "due_on"], "Asana task create");
    return {
      workspace_id: id(row.workspace_id, GID, "Asana workspace GID"),
      name: text(row.name, 500, "Asana task name", true)!,
      ...(row.project_id !== undefined ? { project_id: id(row.project_id, GID, "Asana project GID") } : {}),
      ...(row.notes !== undefined ? { notes: text(row.notes, 5000, "Asana task notes") ?? "" } : {}),
      ...(row.due_on !== undefined ? { due_on: dueOn(row.due_on) } : {}),
    };
  }
  if (provider === "asana" && action === "task_update") {
    allowedKeys(row, ["task_id", "name", "notes", "completed", "due_on"], "Asana task update");
    const result: Record<string, unknown> = {
      task_id: id(row.task_id, GID, "Asana task GID"),
      ...(row.name !== undefined ? { name: text(row.name, 500, "Asana task name") ?? "" } : {}),
      ...(row.notes !== undefined ? { notes: text(row.notes, 5000, "Asana task notes") ?? "" } : {}),
      ...(typeof row.completed === "boolean" ? { completed: row.completed } : {}),
      ...(row.due_on !== undefined ? { due_on: dueOn(row.due_on) } : {}),
    };
    if (Object.keys(result).length === 1) throw new Error("At least one Asana task field is required.");
    return result;
  }
  if (provider === "linear" && action === "issue_create") {
    allowedKeys(row, ["team_id", "title", "description"], "Linear issue create");
    return {
      team_id: id(row.team_id, UUIDISH, "Linear team ID"),
      title: text(row.title, 500, "Linear issue title", true)!,
      ...(row.description !== undefined ? { description: text(row.description, 10000, "Linear issue description") ?? "" } : {}),
    };
  }
  if (provider === "linear" && action === "issue_update") {
    allowedKeys(row, ["issue_id", "title", "description"], "Linear issue update");
    const result: Record<string, unknown> = {
      issue_id: id(row.issue_id, UUIDISH, "Linear issue ID"),
      ...(row.title !== undefined ? { title: text(row.title, 500, "Linear issue title") ?? "" } : {}),
      ...(row.description !== undefined ? { description: text(row.description, 10000, "Linear issue description") ?? "" } : {}),
    };
    if (Object.keys(result).length === 1) throw new Error("At least one Linear issue field is required.");
    return result;
  }

  throw new Error(`No direct governed write action is registered for ${provider}:${action}.`);
}

export async function prepareDirectConnectedServiceWrite(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  if (!isDirectConnectedServiceWriteAction(input.provider, input.action)) {
    throw new Error(`No direct governed write action is registered for ${input.provider}:${input.action}.`);
  }
  if (!(await hasDirectConnectedService(input.userId, input.provider))) {
    throw new Error(`${input.provider} is not connected through its native OAuth integration.`);
  }
  const capability = CAPABILITIES.find((item) => item.provider === input.provider && item.action === input.action)!;
  return {
    provider: input.provider,
    action: input.action,
    description: capability.description,
    risk: "medium" as const,
    requiresApproval: true,
    input: validateDirectConnectedServiceWriteInput(input.provider, input.action, input.actionInput),
  };
}

export async function executeDirectConnectedServiceWrite(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const data = validateDirectConnectedServiceWriteInput(input.provider, input.action, input.actionInput);

  if (input.provider === "hubspot" && input.action === "contact_update") {
    const { updateHubSpotContact } = await import("./hubspot.server");
    return updateHubSpotContact({
      userId: input.userId,
      contactId: String(data.contact_id),
      properties: data.properties as Record<string, unknown>,
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "hubspot" && input.action === "deal_update") {
    const { updateHubSpotDeal } = await import("./hubspot.server");
    return updateHubSpotDeal({
      userId: input.userId,
      dealId: String(data.deal_id),
      properties: data.properties as Record<string, unknown>,
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "notion" && input.action === "child_page_create") {
    const { createNotionChildPage } = await import("./notion.server");
    return createNotionChildPage({
      userId: input.userId,
      parentPageId: String(data.parent_page_id),
      title: String(data.title),
      ...(typeof data.content === "string" ? { content: data.content } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "asana" && input.action === "task_create") {
    const { createAsanaTask } = await import("./asana.server");
    return createAsanaTask({
      userId: input.userId,
      workspaceId: String(data.workspace_id),
      name: String(data.name),
      ...(typeof data.project_id === "string" ? { projectId: data.project_id } : {}),
      ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
      ...(typeof data.due_on === "string" ? { dueOn: data.due_on } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "asana" && input.action === "task_update") {
    const { updateAsanaTask } = await import("./asana.server");
    return updateAsanaTask({
      userId: input.userId,
      taskId: String(data.task_id),
      ...(typeof data.name === "string" ? { name: data.name } : {}),
      ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
      ...(typeof data.completed === "boolean" ? { completed: data.completed } : {}),
      ...(typeof data.due_on === "string" ? { dueOn: data.due_on } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "linear" && input.action === "issue_create") {
    const { createLinearIssue } = await import("./linear.server");
    return createLinearIssue({
      userId: input.userId,
      teamId: String(data.team_id),
      title: String(data.title),
      ...(typeof data.description === "string" ? { description: data.description } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (input.provider === "linear" && input.action === "issue_update") {
    const { updateLinearIssue } = await import("./linear.server");
    return updateLinearIssue({
      userId: input.userId,
      issueId: String(data.issue_id),
      ...(typeof data.title === "string" ? { title: data.title } : {}),
      ...(typeof data.description === "string" ? { description: data.description } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }

  throw new Error(`No direct governed write executor is registered for ${input.provider}:${input.action}.`);
}
