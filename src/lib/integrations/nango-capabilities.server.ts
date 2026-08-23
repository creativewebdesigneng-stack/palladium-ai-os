import { isSafeNangoProviderId, type NangoProviderId } from "./nango-providers";
import {
  deployNangoActionTemplate,
  getOwnedNangoConnection,
  listNangoIntegrationActions,
  listNangoProviderActionTemplates,
  listPersistedNangoConnections,
  nangoIntegrationId,
  NangoHttpError,
  triggerOwnedNangoAction,
  type NangoActionFunction,
} from "./nango.server";

export type NangoActionRisk = "low" | "medium" | "high";

export type NangoAgentCapability = {
  provider: string;
  action: string;
  description: string;
  risk: NangoActionRisk;
  requiresApproval: boolean;
  deployed: boolean;
  inputSchema: Record<string, unknown>;
};

const HIGH_RISK = new Set([
  "delete",
  "remove",
  "archive",
  "revoke",
  "cancel",
  "close",
  "terminate",
  "refund",
  "void",
  "purge",
  "destroy",
  "deactivate",
  "disable",
]);
const WRITE_RISK = new Set([
  "create",
  "update",
  "add",
  "send",
  "post",
  "publish",
  "upload",
  "invite",
  "assign",
  "move",
  "rename",
  "edit",
  "set",
  "trigger",
  "start",
  "stop",
  "execute",
  "run",
  "merge",
  "approve",
  "reject",
  "write",
  "reply",
  "comment",
  "share",
  "schedule",
]);
const READ_RISK = new Set([
  "get",
  "list",
  "search",
  "fetch",
  "find",
  "read",
  "query",
  "check",
  "lookup",
  "retrieve",
  "count",
  "analyse",
  "analyze",
  "export",
  "download",
  "preview",
  "verify",
  "view",
]);
const CREDENTIAL_KEY =
  /(token|secret|password|passwd|api.?key|authorization|cookie|private.?key|access.?key)/i;

function words(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function classifyNangoActionRisk(name: string, description = ""): NangoActionRisk {
  const terms = new Set([...words(name), ...words(description)]);
  if ([...terms].some((term) => HIGH_RISK.has(term))) return "high";
  if ([...terms].some((term) => WRITE_RISK.has(term))) return "medium";
  if ([...terms].some((term) => READ_RISK.has(term))) return "low";
  return "medium";
}

function safeInputSchema(action: NangoActionFunction): Record<string, unknown> {
  const schema = action.json_schema;
  const definitions =
    schema?.["definitions"] && typeof schema["definitions"] === "object"
      ? (schema["definitions"] as Record<string, unknown>)
      : null;
  const input = action.input && definitions ? definitions[action.input] : null;
  if (input && typeof input === "object" && !Array.isArray(input))
    return input as Record<string, unknown>;
  if (schema?.["type"] === "object") return schema;
  return { type: "object", properties: {}, additionalProperties: true };
}

export function assertSafeNangoActionInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Nango action input must be a JSON object.");
  const serialized = JSON.stringify(value);
  if (serialized.length > 32_000) throw new Error("Nango action input exceeds the 32 KB limit.");
  let keys = 0;
  const visit = (item: unknown, depth: number) => {
    if (depth > 8) throw new Error("Nango action input is nested too deeply.");
    if (Array.isArray(item)) {
      if (item.length > 200) throw new Error("Nango action input contains too many array items.");
      for (const child of item) visit(child, depth + 1);
      return;
    }
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as Record<string, unknown>)) {
      keys += 1;
      if (keys > 200) throw new Error("Nango action input contains too many fields.");
      if (CREDENTIAL_KEY.test(key))
        throw new Error(
          "Credentials cannot be supplied by an agent. Use the server-side Nango connection instead.",
        );
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
}

export function sanitizeNangoActionOutput(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (typeof value === "string")
    return value.length > 8_000 ? `${value.slice(0, 8_000)}…[truncated]` : value;
  if (Array.isArray(value))
    return value.slice(0, 200).map((item) => sanitizeNangoActionOutput(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 200)
      .map(([key, item]) => [
        key,
        CREDENTIAL_KEY.test(key) ? "[redacted]" : sanitizeNangoActionOutput(item, depth + 1),
      ]),
  );
}

async function discoverProviderActions(providerId: NangoProviderId) {
  const integrationId = nangoIntegrationId(providerId);
  if (!integrationId) return [];
  const [templates, deployed] = await Promise.all([
    listNangoProviderActionTemplates(providerId).catch(() => []),
    listNangoIntegrationActions(integrationId).catch(() => []),
  ]);
  const deployedNames = new Set(deployed.map((action: NangoActionFunction) => action.name));
  const merged = new Map<string, NangoActionFunction>();
  for (const action of templates) merged.set(action.name, action);
  for (const action of deployed) merged.set(action.name, action);
  return [...merged.values()].map((action) => ({
    action,
    deployed: deployedNames.has(action.name) || Boolean(action.deployed?.enabled),
  }));
}

export async function listNangoAgentCapabilities(userId: string, provider?: string) {
  const connected = (await listPersistedNangoConnections(userId)).filter(
    (connection) => connection.status === "connected" && connection.config.connection_id,
  );
  const selected = provider
    ? connected.filter((connection) => connection.providerId === provider)
    : connected;
  if (provider && !isSafeNangoProviderId(provider)) throw new Error("Unsupported Nango provider.");
  const groups = await Promise.all(
    selected.map(async (connection) => {
      const actions = await discoverProviderActions(connection.providerId);
      return actions.map(({ action, deployed }): NangoAgentCapability => {
        const risk = classifyNangoActionRisk(action.name, action.description);
        return {
          provider: connection.providerId,
          action: action.name,
          description: action.description || `Run ${action.name} through Nango.`,
          risk,
          requiresApproval: risk !== "low",
          deployed,
          inputSchema: safeInputSchema(action),
        };
      });
    }),
  );
  return groups
    .flat()
    .sort((left, right) =>
      left.provider === right.provider
        ? left.action.localeCompare(right.action)
        : left.provider.localeCompare(right.provider),
    );
}

async function resolveOwnedAction(userId: string, provider: string, actionName: string) {
  if (!isSafeNangoProviderId(provider)) throw new Error("Unsupported Nango provider.");
  if (!actionName || actionName.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(actionName))
    throw new Error("Invalid Nango action name.");
  const owned = await getOwnedNangoConnection(userId, provider);
  if (!owned || (owned.persisted && owned.persisted.status !== "connected"))
    throw new Error(`${provider} is not connected through Nango.`);
  const actions = await discoverProviderActions(provider);
  const match = actions.find(({ action }) => action.name === actionName);
  if (!match) throw new Error(`Nango does not advertise the ${actionName} action for ${provider}.`);
  return { provider, ...match };
}

async function ensureActionDeployed(provider: NangoProviderId, action: NangoActionFunction) {
  const integrationId = nangoIntegrationId(provider);
  if (!integrationId) throw new Error(`No Nango integration is configured for ${provider}.`);
  try {
    await deployNangoActionTemplate(integrationId, action.name);
  } catch (error) {
    if (error instanceof NangoHttpError && error.status === 403)
      throw new Error(
        "The Nango API key needs environment:deploy to activate this action automatically.",
      );
    throw error;
  }
}

export async function executeNangoAgentAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  assertSafeNangoActionInput(input.actionInput);
  const resolved = await resolveOwnedAction(input.userId, input.provider, input.action);
  if (!resolved.deployed) await ensureActionDeployed(resolved.provider, resolved.action);
  try {
    const result = await triggerOwnedNangoAction(
      input.userId,
      resolved.provider,
      resolved.action.name,
      input.actionInput,
      input.signal,
    );
    return {
      ok: true as const,
      provider: resolved.provider,
      result: sanitizeNangoActionOutput(result),
    };
  } catch (error) {
    const message =
      error instanceof NangoHttpError && error.status === 403
        ? "The Nango API key needs environment:actions:execute to run this action."
        : error instanceof Error
          ? error.message
          : "Nango action execution failed.";
    return { ok: false as const, provider: resolved.provider, error: message };
  }
}

export async function prepareNangoAgentAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  assertSafeNangoActionInput(input.actionInput);
  const resolved = await resolveOwnedAction(input.userId, input.provider, input.action);
  const risk = classifyNangoActionRisk(resolved.action.name, resolved.action.description);
  return {
    provider: resolved.provider,
    action: resolved.action.name,
    description: resolved.action.description || `Run ${resolved.action.name} through Nango.`,
    risk,
    requiresApproval: risk !== "low",
    input: input.actionInput,
  };
}
