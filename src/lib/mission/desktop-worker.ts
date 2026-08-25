/**
 * Provider-agnostic desktop automation contract.
 *
 * A desktop provider runs on a machine explicitly paired by the operator.
 * Credentials/passwords are never accepted as model input. Every action is
 * machine-scoped, auditable and revocable by disconnecting the worker.
 */
export type DesktopActionKind =
  | "launch_app"
  | "focus_window"
  | "click"
  | "type"
  | "hotkey"
  | "read_screen"
  | "screenshot"
  | "file_open"
  | "file_save"
  | "wait"
  | "close_app";

export type DesktopAction = {
  kind: DesktopActionKind;
  target?: string;
  text?: string;
  keys?: string[];
  x?: number;
  y?: number;
  path?: string;
  waitMs?: number;
};

export type DesktopWorkerContext = {
  userId: string;
  agentId: string;
  taskId: string | null;
  machineId: string;
  allowedApps: string[];
  allowedPaths: string[];
};

export type DesktopWorkerResult = {
  ok: boolean;
  action: DesktopActionKind;
  machineId: string;
  data?: unknown;
  error?: string;
};

export type DesktopWorkerProvider = {
  id: string;
  label: string;
  health(machineId: string): Promise<{ connected: boolean }>;
  execute(action: DesktopAction, ctx: DesktopWorkerContext): Promise<DesktopWorkerResult>;
};

const providers = new Map<string, DesktopWorkerProvider>();

export function registerDesktopWorkerProvider(provider: DesktopWorkerProvider): void {
  providers.set(provider.id, provider);
}

export function listDesktopWorkerProviders(): string[] {
  return [...providers.keys()];
}

export function getDesktopWorkerProvider(id: string): DesktopWorkerProvider | undefined {
  return providers.get(id);
}

export function desktopActionRisk(action: DesktopAction): "low" | "medium" | "high" {
  switch (action.kind) {
    case "read_screen":
    case "screenshot":
    case "focus_window":
    case "wait":
      return "low";
    case "launch_app":
    case "click":
    case "type":
    case "hotkey":
    case "file_open":
    case "close_app":
      return "medium";
    case "file_save":
      return "high";
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function isDesktopActionAllowed(action: DesktopAction, ctx: DesktopWorkerContext): boolean {
  if (action.kind === "launch_app" || action.kind === "focus_window" || action.kind === "close_app") {
    const target = (action.target ?? "").trim().toLowerCase();
    if (!target) return false;
    return ctx.allowedApps.some((app) => app.trim().toLowerCase() === target);
  }

  if (action.kind === "file_open" || action.kind === "file_save") {
    const requested = normalizePath(action.path ?? "");
    if (!requested) return false;
    return ctx.allowedPaths.some((root) => {
      const allowed = normalizePath(root);
      return requested === allowed || requested.startsWith(`${allowed}/`);
    });
  }

  return true;
}

export async function executeDesktopAction(input: {
  providerId: string;
  action: DesktopAction;
  context: DesktopWorkerContext;
}): Promise<DesktopWorkerResult> {
  const provider = providers.get(input.providerId);
  if (!provider) {
    return {
      ok: false,
      action: input.action.kind,
      machineId: input.context.machineId,
      error: "Desktop worker provider is not configured.",
    };
  }
  if (!isDesktopActionAllowed(input.action, input.context)) {
    return {
      ok: false,
      action: input.action.kind,
      machineId: input.context.machineId,
      error: "Desktop action is outside the machine allow-list.",
    };
  }
  const health = await provider.health(input.context.machineId);
  if (!health.connected) {
    return {
      ok: false,
      action: input.action.kind,
      machineId: input.context.machineId,
      error: "Desktop worker is disconnected or revoked.",
    };
  }
  return provider.execute(input.action, input.context);
}
