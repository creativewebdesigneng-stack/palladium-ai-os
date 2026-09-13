import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  defaultModelFor,
  isProviderConfigured,
  resolveAssistantModelPreference,
} from "@/lib/ai/ai-preferences.server";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";
import { writeAudit } from "@/lib/platform/audit.server";
import { recordUsage } from "@/lib/platform/entitlements.server";

type Sb = { from: (table: string) => any };

export const TRADING_AI_ROLES = [
  "market-analyst",
  "macro-analyst",
  "fundamental-analyst",
  "news-analyst",
  "risk-controller",
  "portfolio-analyst",
] as const;

export type TradingAiRole = typeof TRADING_AI_ROLES[number];

type TradingDeskResult = {
  report: string;
  provider: Provider;
  model: string;
  sources: WebSource[];
  roles: TradingAiRole[];
  fallbackFrom?: Provider;
};

const ROLE_LABELS: Record<TradingAiRole, string> = {
  "market-analyst": "Market structure and price-context analyst",
  "macro-analyst": "Macro and rates analyst",
  "fundamental-analyst": "Fundamental and issuer analyst",
  "news-analyst": "News, catalysts and sentiment analyst",
  "risk-controller": "Independent risk controller",
  "portfolio-analyst": "Portfolio exposure and scenario analyst",
};

const SYSTEM_PROMPT = [
  "You are Blackstar Trading Intelligence, a governed research desk.",
  "Use only the supplied LIVE WEB SOURCES as evidence for current factual claims.",
  "Never invent market prices, returns, earnings figures, dates, filings, quotes, ratings, analyst targets, sources or URLs.",
  "Do not claim certainty, guaranteed returns, or that an asset must be bought or sold.",
  "Do not place or imply that you placed an order. Research and risk analysis are separate from execution.",
  "Treat the selected specialist roles as independent lenses: highlight disagreements rather than forcing consensus.",
  "For every material thesis include evidence, bull case, bear case, invalidation conditions, downside risks, confidence and missing data.",
  "Cite current factual claims with Markdown links using only URLs supplied in the evidence block.",
  "State clearly when evidence is stale, incomplete, contradictory or insufficient.",
  "This is general research, not personalised investment advice.",
].join(" ");

function buildEvidence(args: { query: string; symbol?: string; roles: TradingAiRole[]; sources: WebSource[] }) {
  return [
    `Research objective: ${args.query}`,
    args.symbol ? `Instrument / symbol supplied by user: ${args.symbol}` : "Instrument / symbol: not specified",
    `Specialist lenses: ${args.roles.map((role) => ROLE_LABELS[role]).join("; ")}`,
    "Required output: executive summary; specialist views; evidence; bull case; bear case; invalidation; key risks; confidence; missing/required data; next research checks.",
    "LIVE WEB SOURCES:",
    ...args.sources.map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet ?? ""}`),
  ].join("\n\n");
}

async function runDeskModel(args: { provider: Provider; model: string; messages: ChatMessage[] }) {
  try {
    const result = await runChat({ provider: args.provider, model: args.model, messages: args.messages, maxTokens: 2200 });
    if (!result.text.trim()) throw new ProviderError("The model returned an empty trading research report.", 502, true);
    return { report: result.text.trim(), provider: result.provider, model: result.model };
  } catch (primaryError) {
    if (args.provider === "groq" || !isProviderConfigured("groq")) throw primaryError;
    const fallbackModel = defaultModelFor("groq");
    const fallback = await runChat({ provider: "groq", model: fallbackModel, messages: args.messages, maxTokens: 2200 });
    if (!fallback.text.trim()) throw new ProviderError("The fallback model returned an empty trading research report.", 502, true);
    return {
      report: fallback.text.trim(),
      provider: fallback.provider,
      model: fallback.model,
      fallbackFrom: args.provider,
    };
  }
}

export const runTradingIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; symbol?: string; roles?: string[] }) => {
    const query = String(input?.query ?? "").trim();
    if (query.length < 5) throw new Error("Describe the trading research question in a little more detail.");
    const symbol = String(input?.symbol ?? "").trim().toUpperCase().slice(0, 30);
    const allowed = new Set<string>(TRADING_AI_ROLES);
    const roles = Array.isArray(input?.roles)
      ? [...new Set(input.roles.map(String).filter((role) => allowed.has(role)))].slice(0, 6) as TradingAiRole[]
      : [];
    return {
      query: query.slice(0, 700),
      symbol,
      roles: roles.length ? roles : ["market-analyst", "risk-controller"] as TradingAiRole[],
    };
  })
  .handler(async ({ data, context }): Promise<TradingDeskResult> => {
    const sb = context.supabase as unknown as Sb;
    let preference: { default_provider?: unknown; default_model?: unknown } | null = null;
    try {
      const pref = await sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id", context.userId).maybeSingle();
      if (!pref.error) preference = pref.data;
    } catch {
      // Deployment defaults remain valid when no preference row is available.
    }

    const { provider, model, source: preferenceSource } = resolveAssistantModelPreference(preference);
    const searchQuery = [data.symbol, data.query, "market trading finance latest filing macro risk"].filter(Boolean).join(" ");
    const search = await searchPublicWeb(searchQuery, 10);
    if (!search.results.length) throw new Error("No live public sources were found for this trading research question.");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildEvidence({ ...data, sources: search.results }) },
    ];

    try {
      const result = await runDeskModel({ provider, model, messages });
      await recordUsage({
        userId: context.userId,
        metric: "assistant_message",
        quantity: 1,
        metadata: {
          surface: "trading_ai_desk",
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          fallback_from: result.fallbackFrom ?? null,
          role_count: data.roles.length,
          source_count: search.results.length,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "trading.ai_research.run",
        targetType: "trading_research",
        status: "success",
        metadata: {
          symbol: data.symbol || null,
          roles: data.roles,
          provider: result.provider,
          model: result.model,
          sourceCount: search.results.length,
        },
      });
      return { ...result, sources: search.results, roles: data.roles };
    } catch (error) {
      await writeAudit({
        userId: context.userId,
        action: "trading.ai_research.run",
        targetType: "trading_research",
        status: "failed",
        metadata: {
          symbol: data.symbol || null,
          roles: data.roles,
          provider,
          model,
          error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
        },
      });
      if (error instanceof ProviderError && error.status === 503) throw new Error("AI provider is not configured.");
      throw new Error(error instanceof Error ? error.message : "Trading AI research is temporarily unavailable.");
    }
  });
