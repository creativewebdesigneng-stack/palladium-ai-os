import type { BrowserStep, BrowserTool } from "@/lib/mission/browser-agent";
import { isDomainAllowed } from "@/lib/mission/browser-agent";

export const BROWSER_TASK_ACTIONS = [
  "navigate",
  "read",
  "extract",
  "click",
  "type",
  "scroll",
  "wait",
  "screenshot",
  "validate",
] as const;

export type BrowserTaskAction = (typeof BROWSER_TASK_ACTIONS)[number];

type BrowserExtractionField = {
  name: string;
  selector: string;
  required: boolean;
};

type BrowserTaskStep = {
  action: BrowserTaskAction;
  label?: string;
  url?: string;
  selector?: string;
  fallback_selector?: string;
  text?: string;
  expected_text?: string;
  direction?: "up" | "down";
  amount?: number;
  ms?: number;
  fields?: BrowserExtractionField[];
};

export type BrowserTaskResult = {
  ok: boolean;
  completed_steps: number;
  current_url: string | null;
  outputs: Array<Record<string, unknown>>;
  trace?: BrowserStep[];
  error?: string;
  failed_step?: number;
};

const SENSITIVE_BROWSER_TARGET =
  /(password|passwd|passcode|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|private[_-]?key|totp|one[-_ ]?time|otp|card[-_ ]?number|cvv|cvc|iban|ssn)/i;

const text = (value: unknown, max = 4000) =>
  (typeof value === "string" ? value.trim() : "").slice(0, max);

function normalizeFields(value: unknown): BrowserExtractionField[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw new Error("extract fields must contain between 1 and 20 field definitions.");
  }
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`fields[${index}] must be an object.`);
    }
    const row = item as Record<string, unknown>;
    const name = text(row["name"], 80);
    const selector = text(row["selector"], 500);
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(name)) {
      throw new Error(`fields[${index}].name must be a stable identifier.`);
    }
    if (seen.has(name)) throw new Error(`Duplicate extraction field: ${name}.`);
    seen.add(name);
    if (!selector) throw new Error(`fields[${index}].selector is required.`);
    return { name, selector, required: row["required"] === true };
  });
}

function normalizeStep(value: unknown): BrowserTaskStep {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Every browser task step must be an object.");
  }
  const row = value as Record<string, unknown>;
  const action = text(row["action"], 40) as BrowserTaskAction;
  if (!BROWSER_TASK_ACTIONS.includes(action)) {
    throw new Error(`Unsupported browser task action: ${action || "missing"}.`);
  }
  const direction = row["direction"] === "up" ? "up" : row["direction"] === "down" ? "down" : undefined;
  const amount = Number(row["amount"]);
  const ms = Number(row["ms"]);
  const selector = text(row["selector"], 500);
  const fallbackSelector = text(row["fallback_selector"], 500);
  const label = text(row["label"], 120);
  const valueText = text(row["text"], 8000);
  const fields = action === "extract" ? normalizeFields(row["fields"]) : undefined;

  if (
    action === "type" &&
    valueText &&
    SENSITIVE_BROWSER_TARGET.test(`${selector} ${fallbackSelector} ${label}`)
  ) {
    throw new Error(
      "Sensitive browser fields must be populated by a trusted server-side credential integration, not model-controlled browser input.",
    );
  }

  return {
    action,
    ...(label ? { label } : {}),
    ...(text(row["url"], 2000) ? { url: text(row["url"], 2000) } : {}),
    ...(selector ? { selector } : {}),
    ...(fallbackSelector ? { fallback_selector: fallbackSelector } : {}),
    ...(valueText ? { text: valueText } : {}),
    ...(text(row["expected_text"], 1000)
      ? { expected_text: text(row["expected_text"], 1000) }
      : {}),
    ...(direction ? { direction } : {}),
    ...(Number.isFinite(amount) ? { amount } : {}),
    ...(Number.isFinite(ms) ? { ms } : {}),
    ...(fields ? { fields } : {}),
  };
}

function allowedUrl(url: string, allowedDomains: string[]) {
  if (!/^https?:\/\//i.test(url)) return false;
  return isDomainAllowed(url, allowedDomains);
}

function boundedTrace(tool: BrowserTool): BrowserStep[] {
  return tool.steps().slice(-50);
}

async function clickWithFallback(tool: BrowserTool, step: BrowserTaskStep) {
  if (!step.selector) throw new Error("click requires a selector.");
  try {
    const result = await tool.click(step.selector);
    if (result.ok || !step.fallback_selector) {
      return { result, selector: step.selector, fallback_used: false };
    }
  } catch (error) {
    if (!step.fallback_selector) throw error;
  }
  const result = await tool.click(step.fallback_selector!);
  return { result, selector: step.fallback_selector, fallback_used: true };
}

async function typeWithFallback(tool: BrowserTool, step: BrowserTaskStep) {
  if (!step.selector) throw new Error("type requires a selector.");
  if (step.text === undefined) throw new Error("type requires text.");
  try {
    const result = await tool.type(step.selector, step.text);
    if (result.ok || !step.fallback_selector) {
      return { result, selector: step.selector, fallback_used: false };
    }
  } catch (error) {
    if (!step.fallback_selector) throw error;
  }
  const result = await tool.type(step.fallback_selector!, step.text);
  return { result, selector: step.fallback_selector, fallback_used: true };
}

async function extractStructuredFields(
  tool: BrowserTool,
  url: string,
  fields: BrowserExtractionField[],
) {
  const data: Record<string, string> = {};
  for (const field of fields) {
    const extracted = await tool.extract(url, field.selector);
    const value = extracted.text.trim().slice(0, 20_000);
    if (field.required && !value) {
      throw new Error(`Required extraction field "${field.name}" was empty.`);
    }
    data[field.name] = value;
  }
  return { url, fields: data };
}

/**
 * Executes a bounded sequence inside one BrowserTool instance. This gives the
 * model a cohesive browser session without exposing provider credentials or
 * bypassing PalladiumAI's existing domain/tool policy boundary.
 */
export async function runBoundedBrowserTask(
  tool: BrowserTool,
  input: Record<string, unknown>,
  allowedDomains: string[],
): Promise<BrowserTaskResult> {
  const rawSteps = Array.isArray(input["steps"]) ? input["steps"] : [];
  const requestedMax = Number(input["max_steps"] ?? 12);
  const maxSteps = Math.min(
    20,
    Math.max(1, Number.isFinite(requestedMax) ? Math.trunc(requestedMax) : 12),
  );
  if (!rawSteps.length) {
    return {
      ok: false,
      completed_steps: 0,
      current_url: null,
      outputs: [],
      trace: boundedTrace(tool),
      error: "Browser task requires at least one step.",
    };
  }
  if (rawSteps.length > maxSteps) {
    return {
      ok: false,
      completed_steps: 0,
      current_url: null,
      outputs: [],
      trace: boundedTrace(tool),
      error: `Browser task contains ${rawSteps.length} steps but the budget is ${maxSteps}.`,
    };
  }

  let currentUrl = text(input["url"], 2000) || null;
  if (currentUrl && !allowedUrl(currentUrl, allowedDomains)) {
    return {
      ok: false,
      completed_steps: 0,
      current_url: currentUrl,
      outputs: [],
      trace: boundedTrace(tool),
      error: "The starting URL is outside this agent's domain allow-list.",
    };
  }

  const outputs: Array<Record<string, unknown>> = [];
  let completed = 0;

  try {
    if (currentUrl) {
      const start = await tool.navigate(currentUrl);
      if (!start.ok) {
        throw new Error(start.blocked || "Browser task could not navigate to the starting URL.");
      }
      currentUrl = start.url;
      outputs.push({ phase: "start", action: "navigate", url: currentUrl });
    }

    for (let index = 0; index < rawSteps.length; index += 1) {
      const step = normalizeStep(rawSteps[index]);
      const stepUrl = step.url || currentUrl || "";
      let result: unknown;

      switch (step.action) {
        case "navigate": {
          if (!step.url) throw new Error("navigate requires a URL.");
          if (!allowedUrl(step.url, allowedDomains)) {
            throw new Error("Browser task navigation is outside this agent's domain allow-list.");
          }
          const nav = await tool.navigate(step.url);
          if (!nav.ok) throw new Error(nav.blocked || "Browser navigation failed.");
          currentUrl = nav.url;
          result = nav;
          break;
        }
        case "read": {
          if (!stepUrl) throw new Error("read requires a current or explicit URL.");
          if (!allowedUrl(stepUrl, allowedDomains)) {
            throw new Error("Browser task read is outside this agent's domain allow-list.");
          }
          result = await tool.read(stepUrl);
          currentUrl = stepUrl;
          break;
        }
        case "extract": {
          if (!stepUrl) throw new Error("extract requires a current or explicit URL.");
          if (!allowedUrl(stepUrl, allowedDomains)) {
            throw new Error("Browser task extraction is outside this agent's domain allow-list.");
          }
          result = step.fields?.length
            ? await extractStructuredFields(tool, stepUrl, step.fields)
            : await tool.extract(stepUrl, step.selector);
          currentUrl = stepUrl;
          break;
        }
        case "click":
          result = await clickWithFallback(tool, step);
          break;
        case "type":
          result = await typeWithFallback(tool, step);
          break;
        case "scroll":
          result = await tool.scroll(
            step.direction ?? "down",
            Math.min(10, Math.max(1, Math.trunc(step.amount ?? 1))),
          );
          break;
        case "wait":
          result = await tool.wait(
            Math.min(30_000, Math.max(0, Math.trunc(step.ms ?? 1000))),
          );
          break;
        case "screenshot":
          result = await tool.screenshot();
          break;
        case "validate": {
          if (!stepUrl) throw new Error("validate requires a current or explicit URL.");
          if (!step.expected_text) throw new Error("validate requires expected_text.");
          if (!allowedUrl(stepUrl, allowedDomains)) {
            throw new Error("Browser task validation is outside this agent's domain allow-list.");
          }
          const page = await tool.extract(stepUrl, step.selector);
          const matched = page.text.toLowerCase().includes(step.expected_text.toLowerCase());
          result = { matched, expected_text: step.expected_text, url: stepUrl };
          if (!matched) throw new Error("Browser validation failed: expected text was not found.");
          currentUrl = stepUrl;
          break;
        }
      }

      completed += 1;
      outputs.push({
        step: index + 1,
        action: step.action,
        ...(step.label ? { label: step.label } : {}),
        result,
      });
    }

    return {
      ok: true,
      completed_steps: completed,
      current_url: currentUrl,
      outputs,
      trace: boundedTrace(tool),
    };
  } catch (error) {
    return {
      ok: false,
      completed_steps: completed,
      current_url: currentUrl,
      outputs,
      trace: boundedTrace(tool),
      error: error instanceof Error ? error.message : "Browser task failed.",
      failed_step: completed + 1,
    };
  }
}
