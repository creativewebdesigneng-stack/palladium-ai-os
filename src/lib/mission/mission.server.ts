/**
 * Server-only Mission Control orchestration helpers.
 *
 * Nothing here trusts the client: routing decisions, approval requirements and
 * purchase totals are all derived on the server.
 */
import {
  createBrowserTool,
  isDomainAllowed,
  resolveBrowserProvider,
  type BrowserProductOffer,
} from "./browser-agent";
import {
  createGoogleGmailDraft,
  listGoogleCalendarEvents,
} from "@/lib/integrations/google-workspace.server";
import {
  createMicrosoftOutlookDraft,
  listMicrosoftCalendarEvents,
} from "@/lib/integrations/microsoft365.server";
import {
  normaliseProvider,
  resolveModel,
  runChat,
  type ChatMessage,
} from "@/lib/runtime/model-gateway.server";
import {
  googleShoppingConfigured,
  searchGoogleShopping,
} from "@/lib/shopping/google-shopping.server";

type RoutingPreferenceValue = string | number | boolean | null;
type RoutingPreferences = Record<string, RoutingPreferenceValue>;

export type RoutingDecision = {
  category: string;
  title: string;
  requiredTools: string[];
  requiresApproval: boolean;
  involvesMoney: boolean;
  commitmentRequested: boolean;
  autoCompletable: boolean;
  reason: string;
  budget: number | null;
  estimatedCost: number | null;
  priority: string;
  dueAt: string | null;
  intent: string;
  searchQuery: string | null;
  preferences: RoutingPreferences;
};

export type WorkspaceProvider = "google" | "microsoft";

const COMMITMENT_WORDS = /\b(buy|purchase|order|checkout|pay|book|booking|reserve|subscribe|confirm purchase|place (?:the )?order|complete (?:the )?purchase)\b/i;
const DISCOVERY_WORDS = /\b(find|search|show|compare|recommend|research|look for|look up|price check|prices|deals?)\b/i;
const SHOPPING_DISCOVERY_WORDS = /\b(product|item|chair|laptop|computer|pc|ink|printer|gift|t-?shirt|shirt|clothes?|clothing|shoes?|trainers?|phone|tablet|tv|television|monitor|headphones?|earbuds?|furniture|sofa|table|watch|bag|handbag|jacket|coat|dress|jeans|console|camera|appliance)\b/i;
const CONNECTED_SERVICE_WORDS = /\b(nango|github|gitlab|linear|notion|slack|discord|salesforce|hubspot|posthog|shopify|stripe|airtable|jira|trello|asana|connected (?:account|app|service|integration))\b/i;

const RULES: Array<{ category: string; test: RegExp; tools: string[] }> = [
  {
    category: "integration",
    test: CONNECTED_SERVICE_WORDS,
    tools: ["connected_service", "nango_capabilities", "nango_action"],
  },
  { category: "travel", test: /(hotel|flight|trip|travel|holiday|airbnb|train|weekend away)/i, tools: ["web_search", "browser", "booking"] },
  { category: "shopping", test: /(buy|purchase|shop|price|cheap|cheapest|deal|product|item|chair|laptop|computer|pc|ink|printer|order|gift|t-?shirt|shirt|clothes?|clothing|shoes?|trainers?|phone|tablet|tv|television|monitor|headphones?|earbuds?|furniture|sofa|table|watch|bag|handbag|jacket|coat|dress|jeans|console|camera|appliance)/i, tools: ["web_search", "shopping_search", "browser"] },
  { category: "food", test: /(meal|recipe|dinner|lunch|grocer|food|cook|menu)/i, tools: ["web_search", "documents"] },
  { category: "health", test: /(gym|workout|exercise|sleep|habit|wellness|fitness|hydrat)/i, tools: ["web_search", "reminders"] },
  { category: "finance", test: /(budget|insurance|bill|spend|saving|subscription cost)/i, tools: ["documents", "reminders"] },
  { category: "calendar", test: /(schedule|calendar|appointment|meeting|book me in|tomorrow|next week)/i, tools: ["calendar", "reminders"] },
  { category: "organisation", test: /(organise|organize|remind|to-?do|task list|errand|follow up)/i, tools: ["reminders", "documents"] },
  { category: "research", test: /(research|compare|find out|explain|summar|analys)/i, tools: ["web_search", "browser", "documents"] },
  { category: "entertainment", test: /(watch|film|movie|series|book to read|game|playlist)/i, tools: ["web_search"] },
  { category: "education", test: /(learn|study|course|revise|tutorial)/i, tools: ["web_search", "documents"] },
  { category: "home", test: /(home|house|cleaning|maintenance|boiler|garden|supplies)/i, tools: ["shopping_search", "reminders"] },
];

export function extractBudget(text: string): number | null {
  const match = /(?:under|below|max(?:imum)?|up to|less than|around|about)?\s*[£$€]\s?(\d+(?:[.,]\d{1,2})?)/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", ""));
  return Number.isFinite(value) ? value : null;
}

export function titleFor(request: string): string {
  const clean = request.trim().replace(/\s+/g, " ");
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return first.length > 72 ? `${first.slice(0, 69)}…` : first;
}

function serializablePreferences(value: unknown): RoutingPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: RoutingPreferences = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      result[key.slice(0, 100)] = typeof item === "string" ? item.slice(0, 1000) : item;
    }
  }
  return result;
}

export function routeRequest(
  request: string,
  agent?: { preferences?: unknown } | null,
): RoutingDecision {
  const match = RULES.find((r) => r.test.test(request));
  let category = match?.category ?? "custom";
  let tools = match?.tools ?? ["web_search"];
  const budget = extractBudget(request);
  const commitmentRequested = COMMITMENT_WORDS.test(request);

  if (
    category === "custom" &&
    DISCOVERY_WORDS.test(request) &&
    (SHOPPING_DISCOVERY_WORDS.test(request) || budget !== null)
  ) {
    category = "shopping";
    tools = ["web_search", "shopping_search", "browser"];
  }

  const involvesMoney = commitmentRequested;
  const sensitive = commitmentRequested;

  if (category === "shopping") {
    tools = tools.filter((tool) => tool !== "checkout");
    if (commitmentRequested) tools = [...tools, "checkout"];
  }
  if (category === "travel" && !commitmentRequested) {
    tools = tools.filter((tool) => tool !== "booking");
  }

  return {
    category,
    title: titleFor(request),
    requiredTools: tools,
    requiresApproval: sensitive,
    involvesMoney,
    commitmentRequested,
    autoCompletable: !sensitive,
    budget,
    estimatedCost: commitmentRequested ? budget : null,
    priority: "normal",
    dueAt: null,
    intent: category,
    searchQuery: category === "shopping" ? request : null,
    preferences: serializablePreferences(agent?.preferences),
    reason: commitmentRequested
      ? "This request asks the agent to make an external commitment. The agent can research and prepare it, but must wait for your approval before purchase, booking or payment."
      : category === "shopping" || category === "travel"
        ? "Live discovery only — the agent can search and compare results now. A budget is treated as a filter, not permission to spend money."
        : "Research and organisation only — the agent can complete this on its own.",
  };
}

type ShoppingResearchParams = {
  requirement: string;
  budget: number | null;
  currency: string;
  allowedDomains: string[];
  allowedTools: string[];
  provider?: string;
};

type ShoppingResearchResult = {
  offers: BrowserProductOffer[];
  steps: unknown[];
  provider: string;
  simulated: boolean;
};

export function runShoppingResearch(params: ShoppingResearchParams): Promise<ShoppingResearchResult>;
export function runShoppingResearch(requirement: string, budget: number | null, currency: string, allowedDomains: string[], allowedTools: string[]): Promise<BrowserProductOffer[]>;
export async function runShoppingResearch(
  paramsOrRequirement: ShoppingResearchParams | string,
  legacyBudget: number | null = null,
  legacyCurrency = "GBP",
  legacyAllowedDomains: string[] = [],
  legacyAllowedTools: string[] = [],
): Promise<ShoppingResearchResult | BrowserProductOffer[]> {
  const legacy = typeof paramsOrRequirement === "string";
  const params: ShoppingResearchParams = legacy
    ? { requirement: paramsOrRequirement, budget: legacyBudget, currency: legacyCurrency, allowedDomains: legacyAllowedDomains, allowedTools: legacyAllowedTools }
    : paramsOrRequirement;

  if (googleShoppingConfigured()) {
    try {
      const googleOffers = await searchGoogleShopping({
        query: params.requirement,
        budget: params.budget,
        currency: params.currency,
        location: process.env["GOOGLE_SHOPPING_LOCATION"]?.trim() || "United Kingdom",
      });
      if (googleOffers.length) {
        const result: ShoppingResearchResult = {
          offers: googleOffers,
          steps: [{ kind: "search", target: "Google Shopping", detail: `${googleOffers.length} live Google Shopping results`, at: new Date().toISOString(), simulated: false }],
          provider: "google-shopping",
          simulated: false,
        };
        return legacy ? result.offers : result;
      }
    } catch (error) {
      console.warn("[mission] Google Shopping provider failed; falling back to browser", error);
    }
  }

  const tool = createBrowserTool(resolveBrowserProvider(params.provider ?? null), {
    allowedDomains: params.allowedDomains,
    allowedTools: params.allowedTools,
    spendCap: params.budget,
  });
  try {
    const found = await tool.search(params.requirement, { budget: params.budget, currency: params.currency });
    const inBudget = params.budget ? found.filter((o) => o.price <= params.budget!) : found;
    const ranked = await tool.compare(inBudget.length ? inBudget : found);
    const result: ShoppingResearchResult = { offers: ranked, steps: tool.steps(), provider: tool.provider, simulated: tool.kind === "development" };
    return legacy ? result.offers : result;
  } finally {
    await tool.close();
  }
}

export async function prepareCheckoutDraft(params: { offer: BrowserProductOffer; allowedDomains: string[]; allowedTools: string[]; provider?: string }) {
  if (!isDomainAllowed(params.offer.url, params.allowedDomains)) throw new Error("Seller domain is not on the allowlist for this agent");
  const tool = createBrowserTool(resolveBrowserProvider(params.provider ?? null), { allowedDomains: params.allowedDomains, allowedTools: params.allowedTools });
  try {
    return await tool.prepareCheckout(params.offer);
  } finally {
    await tool.close();
  }
}

export async function listMissionCalendar(params: { userId: string; provider?: WorkspaceProvider; from?: string | null; to?: string | null; limit?: number; signal?: AbortSignal }) {
  const provider = params.provider ?? "google";
  const common = {
    userId: params.userId,
    ...(params.from !== undefined ? { from: params.from } : {}),
    ...(params.to !== undefined ? { to: params.to } : {}),
    ...(params.limit !== undefined ? { limit: params.limit } : {}),
    ...(params.signal ? { signal: params.signal } : {}),
  };
  if (provider === "microsoft") return { provider, events: await listMicrosoftCalendarEvents(common) };
  return { provider, events: await listGoogleCalendarEvents(common) };
}

export async function createApprovedMissionEmailDraft(params: { userId: string; provider?: WorkspaceProvider; to: string; subject: string; body: string; cc?: string | null; signal?: AbortSignal }) {
  const provider = params.provider ?? "google";
  const common = {
    userId: params.userId,
    to: params.to,
    subject: params.subject,
    body: params.body,
    ...(params.cc !== undefined ? { cc: params.cc } : {}),
    ...(params.signal ? { signal: params.signal } : {}),
  };
  if (provider === "microsoft") {
    const draft = await createMicrosoftOutlookDraft(common);
    return { provider, status: "draft_created", ...draft } as const;
  }
  const draft = await createGoogleGmailDraft(common);
  return { provider, status: "draft_created", ...draft } as const;
}

export function fallbackBriefing(counts: { tasks: number; approvals: number; shopping: number; running: number; agents: number }): string {
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const bits = [`You have ${counts.tasks} task${counts.tasks === 1 ? "" : "s"} today`, `${counts.approvals} pending approval${counts.approvals === 1 ? "" : "s"}`];
  if (counts.shopping) bits.push(`your Shopping Agent found ${counts.shopping} item${counts.shopping === 1 ? "" : "s"} matching your saved requirements`);
  if (counts.running) bits.push(`${counts.running} agent run${counts.running === 1 ? "" : "s"} in progress`);
  return `${greeting}. ${bits.join(", ")}. ${counts.agents} active agent${counts.agents === 1 ? "" : "s"}.`;
}

export async function aiBriefing(context: string, fallback: string): Promise<string> {
  const configuredProvider = process.env["ASSISTANT_PROVIDER"]?.trim() || null;
  const primaryProvider = normaliseProvider(configuredProvider);
  const primaryModel = resolveModel(
    primaryProvider,
    configuredProvider ? (process.env["ASSISTANT_MODEL"]?.trim() || null) : null,
  );
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You write a short daily briefing (3-5 sentences) for an AI operating system. British English, calm and factual. Use ONLY the facts supplied: never invent tasks, prices, dates, names or numbers, and say a section is clear when its facts say 'none'. Lead with anything awaiting approval, then what is running, then what is upcoming. Never give medical or financial advice.",
    },
    { role: "user", content: `Facts for today:\n${context}` },
  ];

  try {
    const result = await runChat({
      provider: primaryProvider,
      model: primaryModel,
      messages,
      maxTokens: 320,
    });
    const text = result.text.trim();
    if (text) return text;
  } catch (error) {
    console.warn("[mission] primary briefing provider failed", primaryProvider, error);
  }

  if (primaryProvider !== "groq" && process.env["GROQ_API_KEY"]) {
    try {
      const result = await runChat({
        provider: "groq",
        model: resolveModel("groq", null),
        messages,
        maxTokens: 320,
      });
      const text = result.text.trim();
      if (text) return text;
    } catch (error) {
      console.warn("[mission] Groq briefing fallback failed", error);
    }
  }

  return fallback;
}

export async function emitWebhook(userId: string, event: string, payload: Record<string, unknown>) {
  try {
    const { dispatchWebhookEvent } = await import("@/lib/devapi/webhooks.server");
    await dispatchWebhookEvent({ userId, event, payload });
  } catch (error) {
    console.error("[mission] webhook dispatch failed", error);
  }
}
