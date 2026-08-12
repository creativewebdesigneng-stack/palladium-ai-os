/**
 * Server-only Mission Control orchestration helpers.
 *
 * Nothing here trusts the client: routing decisions, approval requirements and
 * purchase totals are all derived on the server.
 */
import { createBrowserTool, isDomainAllowed, type BrowserProductOffer } from "./browser-agent";

export type RoutingDecision = {
  category: string;
  title: string;
  requiredTools: string[];
  requiresApproval: boolean;
  involvesMoney: boolean;
  autoCompletable: boolean;
  reason: string;
  budget: number | null;
};

const MONEY_WORDS = /(buy|purchase|order|checkout|pay|book|reserve|subscribe)/i;

const RULES: Array<{ category: string; test: RegExp; tools: string[] }> = [
  {
    category: "shopping",
    test: /(buy|purchase|shop|price|cheap|cheapest|deal|product|chair|laptop|ink|printer|order|gift)/i,
    tools: ["web_search", "shopping_search", "browser"],
  },
  {
    category: "travel",
    test: /(hotel|flight|trip|travel|holiday|airbnb|train|weekend away)/i,
    tools: ["web_search", "browser", "booking"],
  },
  {
    category: "food",
    test: /(meal|recipe|dinner|lunch|grocer|food|cook|menu)/i,
    tools: ["web_search", "documents"],
  },
  {
    category: "health",
    test: /(gym|workout|exercise|sleep|habit|wellness|fitness|hydrat)/i,
    tools: ["web_search", "reminders"],
  },
  {
    category: "finance",
    test: /(budget|insurance|bill|spend|saving|subscription cost)/i,
    tools: ["documents", "reminders"],
  },
  {
    category: "calendar",
    test: /(schedule|calendar|appointment|meeting|book me in|tomorrow|next week)/i,
    tools: ["calendar", "reminders"],
  },
  {
    category: "organisation",
    test: /(organise|organize|remind|to-?do|task list|errand|follow up)/i,
    tools: ["reminders", "documents"],
  },
  {
    category: "research",
    test: /(research|compare|find out|explain|summar|analys)/i,
    tools: ["web_search", "browser", "documents"],
  },
  {
    category: "entertainment",
    test: /(watch|film|movie|series|book to read|game|playlist)/i,
    tools: ["web_search"],
  },
  {
    category: "education",
    test: /(learn|study|course|revise|tutorial)/i,
    tools: ["web_search", "documents"],
  },
  {
    category: "home",
    test: /(home|house|cleaning|maintenance|boiler|garden|supplies)/i,
    tools: ["shopping_search", "reminders"],
  },
];

export function extractBudget(text: string): number | null {
  const match =
    /(?:under|below|max(?:imum)?|up to|less than|around|about)?\s*[£$€]\s?(\d+(?:[.,]\d{1,2})?)/i.exec(
      text,
    );
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", ""));
  return Number.isFinite(value) ? value : null;
}

export function titleFor(request: string): string {
  const clean = request.trim().replace(/\s+/g, " ");
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return first.length > 72 ? `${first.slice(0, 69)}…` : first;
}

export function routeRequest(request: string): RoutingDecision {
  const match = RULES.find((r) => r.test.test(request));
  const category = match?.category ?? "custom";
  const tools = match?.tools ?? ["web_search"];
  const budget = extractBudget(request);
  const money = category === "shopping" || MONEY_WORDS.test(request) || budget !== null;
  const sensitive = money || category === "travel";
  const requiredTools =
    money && !tools.includes("checkout") && category === "shopping"
      ? [...tools, "checkout"]
      : tools;

  return {
    category,
    title: titleFor(request),
    requiredTools,
    requiresApproval: sensitive,
    involvesMoney: money,
    autoCompletable: !sensitive,
    budget,
    reason: sensitive
      ? "This request can involve money or an external commitment, so the agent will prepare it and wait for your approval."
      : "Research and organisation only — the agent can complete this on its own.",
  };
}

export async function runShoppingResearch(params: {
  requirement: string;
  budget: number | null;
  currency: string;
  allowedDomains: string[];
  allowedTools: string[];
  provider?: string;
}): Promise<{ offers: BrowserProductOffer[]; steps: unknown[]; provider: string }> {
  const config = {
    allowedDomains: params.allowedDomains,
    allowedTools: params.allowedTools,
    spendCap: params.budget,
  };
  const tool = createBrowserTool(params.provider ?? "simulated", config);
  const found = await tool.search(params.requirement, {
    budget: params.budget,
    currency: params.currency,
  });
  const cap = params.budget;
  const inBudget = cap ? found.filter((o) => o.price <= cap) : found;
  const ranked = await tool.compare(inBudget.length ? inBudget : found);
  const steps = tool.steps();
  await tool.close();
  return { offers: ranked, steps, provider: tool.provider };
}

export async function prepareCheckoutDraft(params: {
  offer: BrowserProductOffer;
  allowedDomains: string[];
  allowedTools: string[];
  provider?: string;
}) {
  if (!isDomainAllowed(params.offer.url, params.allowedDomains)) {
    throw new Error("Seller domain is not on the allowlist for this agent");
  }
  const tool = createBrowserTool(params.provider ?? "simulated", {
    allowedDomains: params.allowedDomains,
    allowedTools: params.allowedTools,
  });
  const draft = await tool.prepareCheckout(params.offer);
  await tool.close();
  return draft;
}

/** Deterministic fallback briefing; the AI version augments this. */
export function fallbackBriefing(counts: {
  tasks: number;
  approvals: number;
  shopping: number;
  running: number;
  agents: number;
}): string {
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const bits = [
    `You have ${counts.tasks} task${counts.tasks === 1 ? "" : "s"} today`,
    `${counts.approvals} pending approval${counts.approvals === 1 ? "" : "s"}`,
  ];
  if (counts.shopping)
    bits.push(
      `your Shopping Agent found ${counts.shopping} item${counts.shopping === 1 ? "" : "s"} matching your saved requirements`,
    );
  if (counts.running)
    bits.push(`${counts.running} agent run${counts.running === 1 ? "" : "s"} in progress`);
  return `${greeting}. ${bits.join(", ")}. ${counts.agents} agent${counts.agents === 1 ? "" : "s"} on duty.`;
}

export async function aiBriefing(context: string, fallback: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return fallback;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write a short daily briefing (3-5 sentences) for an AI operating system. " +
              "British English, calm and factual. Use ONLY the facts supplied: never invent tasks, " +
              "prices, dates, names or numbers, and say a section is clear when its facts say 'none'. " +
              "Lead with anything awaiting approval, then what is running, then what is upcoming. " +
              "Never give medical or financial advice.",
          },
          { role: "user", content: `Facts for today:\n${context}` },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : fallback;
  } catch {
    return fallback;
  }
}

/** Emits a signed developer webhook. Best effort — never blocks the user flow. */
export async function emitWebhook(userId: string, event: string, payload: Record<string, unknown>) {
  try {
    const { dispatchWebhookEvent } = await import("@/lib/devapi/webhooks.server");
    await dispatchWebhookEvent({ userId, event, payload });
  } catch (error) {
    console.error("[mission] webhook dispatch failed", error);
  }
}
