import {
  createBrowserTool,
  isDomainAllowed,
  resolveBrowserProvider,
} from "./browser-agent";
import type { ToolDef } from "@/lib/runtime/model-gateway.server";

export const PERSONAL_BROWSER_INTERACT = "browser_interact";

export const PERSONAL_BROWSER_INTERACT_DEF: ToolDef = {
  name: PERSONAL_BROWSER_INTERACT,
  description:
    "Prepare a bounded browser interaction on one allow-listed page. This always pauses for operator approval before it navigates, clicks or types. Never use for checkout, payment, purchases or entering payment credentials.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "Absolute allow-listed page URL to open before interacting." },
      steps: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["click", "type"] },
            selector: { type: "string", description: "CSS selector for the target element." },
            text: { type: "string", description: "Text to type. Required only for a type step." },
          },
          required: ["action", "selector"],
        },
      },
    },
    required: ["url", "steps"],
  },
};

type BrowserInteractionStep = {
  action: "click" | "type";
  selector: string;
  text?: string;
};

type Sb = { from: (table: string) => any };

const PAYMENT_LIKE = /(?:checkout|buy(?:[-_\s]?now)?|place[-_\s]?order|pay(?:ment|[-_\s]?now)?|credit[-_\s]?card|debit[-_\s]?card|card[-_\s]?number|cvv|cvc|billing)/i;

function parseInput(input: Record<string, unknown>): {
  url: string;
  steps: BrowserInteractionStep[];
} {
  const url = typeof input["url"] === "string" ? input["url"].trim() : "";
  if (!/^https?:\/\//i.test(url)) throw new Error("Browser interaction requires an absolute http(s) URL.");

  const raw = Array.isArray(input["steps"]) ? input["steps"] : [];
  if (!raw.length || raw.length > 6) throw new Error("Browser interaction must contain between 1 and 6 steps.");

  const steps: BrowserInteractionStep[] = raw.map((item, index): BrowserInteractionStep => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Browser interaction step ${index + 1} is invalid.`);
    }
    const row = item as Record<string, unknown>;
    const action = row["action"] === "click" || row["action"] === "type" ? row["action"] : null;
    const selector = typeof row["selector"] === "string" ? row["selector"].trim().slice(0, 500) : "";
    if (!action || !selector) throw new Error(`Browser interaction step ${index + 1} needs a click/type action and selector.`);
    const text = typeof row["text"] === "string" ? row["text"].slice(0, 2000) : "";
    if (action === "type" && !text) throw new Error(`Browser interaction step ${index + 1} needs text to type.`);
    return action === "type" ? { action, selector, text } : { action, selector };
  });

  const paymentSurface = [url, ...steps.flatMap((step) => [step.selector, step.action === "type" ? step.text ?? "" : ""])].join(" ");
  if (PAYMENT_LIKE.test(paymentSurface)) {
    throw new Error("Checkout, payment and purchase interactions are not available through browser interaction. Use the dedicated purchase approval flow.");
  }

  return { url, steps };
}

function auditInput(url: string, steps: BrowserInteractionStep[]) {
  return {
    url,
    steps: steps.map((step) => ({
      action: step.action,
      selector: step.selector,
      ...(step.action === "type" ? { text_chars: step.text?.length ?? 0 } : {}),
    })),
  };
}

/**
 * Executes one already-approved browser interaction in a single provider session.
 * The exact payload is supplied by the durable approval resume state; this helper
 * never creates approvals and never accepts payment/checkout interactions.
 */
export async function executeApprovedPersonalBrowserInteraction(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  agentId: string | null;
  runId: string;
  input: Record<string, unknown>;
  allowedDomains: string[];
}) {
  const started = Date.now();
  let parsed: ReturnType<typeof parseInput>;
  try {
    parsed = parseInput(args.input);
    if (!isDomainAllowed(parsed.url, args.allowedDomains)) {
      throw new Error("That browser interaction URL is outside this agent's allow-list.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser interaction is invalid.";
    await args.sb.from("tool_executions").insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      agent_task_id: args.runId,
      tool: PERSONAL_BROWSER_INTERACT,
      input: { invalid: true },
      status: "failed",
      duration_ms: Date.now() - started,
      error: message.slice(0, 500),
    });
    return { ok: false, output: { error: message } };
  }

  const tool = createBrowserTool(resolveBrowserProvider(), {
    allowedDomains: args.allowedDomains,
    allowedTools: ["browser"],
    spendCap: null,
  });

  try {
    await tool.navigate(parsed.url);
    for (const step of parsed.steps) {
      if (step.action === "click") await tool.click(step.selector);
      else await tool.type(step.selector, step.text ?? "");
    }
    const output = {
      ok: true,
      provider: tool.provider,
      simulated: tool.kind === "development",
      url: parsed.url,
      steps_completed: parsed.steps.length,
      payment_authorised: false,
    };
    await args.sb.from("tool_executions").insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      agent_task_id: args.runId,
      tool: PERSONAL_BROWSER_INTERACT,
      input: auditInput(parsed.url, parsed.steps),
      status: "succeeded",
      duration_ms: Date.now() - started,
      output,
    });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser interaction failed.";
    await args.sb.from("tool_executions").insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      agent_task_id: args.runId,
      tool: PERSONAL_BROWSER_INTERACT,
      input: auditInput(parsed.url, parsed.steps),
      status: "failed",
      duration_ms: Date.now() - started,
      error: message.slice(0, 500),
    });
    return { ok: false, output: { error: message.slice(0, 300) } };
  } finally {
    await tool.close();
  }
}
