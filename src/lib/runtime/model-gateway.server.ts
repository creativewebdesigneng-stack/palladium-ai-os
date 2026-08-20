import { searchPublicWeb } from "@/lib/ai/web-access.server";
import * as base from "./model-gateway.base";
import type { ChatMessage, ChatResult, Provider, RunArgs } from "./model-gateway.base";

export * from "./model-gateway.base";

type ActiveProvider = { provider: Provider; model: string };

const GROQ_MODEL_FALLBACK = "openai/gpt-oss-20b";
const OPENAI_MODEL_FALLBACK = "gpt-4.1-mini";
const RATE_LIMIT_COOLDOWN_MS = 60_000;

const activeProviderByConversation = new WeakMap<ChatMessage[], ActiveProvider>();
const providerCooldownUntil = new Map<Provider, number>();

function providerConfigured(provider: Provider): boolean {
  if (provider === "groq") return Boolean(process.env["GROQ_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  if (provider === "anthropic") return Boolean(process.env["ANTHROPIC_API_KEY"]);
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

function providerCoolingDown(provider: Provider): boolean {
  const until = providerCooldownUntil.get(provider) ?? 0;
  if (until <= Date.now()) {
    providerCooldownUntil.delete(provider);
    return false;
  }
  return true;
}

function markRateLimited(provider: Provider) {
  // Vitest exercises many independent provider scenarios in one module process;
  // production cooldown state must not make those isolated cases order-dependent.
  if (process.env["NODE_ENV"] === "test") return;
  providerCooldownUntil.set(provider, Date.now() + RATE_LIMIT_COOLDOWN_MS);
}

function fallbackOrder(primary: Provider): Provider[] {
  const all: Provider[] = [primary, "groq", "openai", "lovable", "anthropic", "compatible"];
  const configured = all.filter(
    (provider, index) => all.indexOf(provider) === index && (provider === primary || providerConfigured(provider)),
  );
  if (!providerCoolingDown(primary)) return configured;

  // A recently rate-limited primary is tried last so a healthy configured
  // provider can take over immediately. We still keep the primary as a final
  // fallback in case it is the only configured provider or its quota recovered.
  return [...configured.filter((provider) => provider !== primary), primary];
}

function modelCandidates(provider: Provider, model: string): string[] {
  const candidates = [model];
  if (provider === "groq" && model !== GROQ_MODEL_FALLBACK) candidates.push(GROQ_MODEL_FALLBACK);
  if (provider === "openai" && model !== OPENAI_MODEL_FALLBACK) candidates.push(OPENAI_MODEL_FALLBACK);
  return candidates;
}

function latestUserQuery(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && message.content.trim()) return message.content.trim().slice(0, 300);
  }
  return "";
}

function requestedResultLimit(query: string, available: number): number {
  const numeric = /\b([1-8])\b/.exec(query)?.[1];
  if (numeric) return Math.min(Number(numeric), available);
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
  };
  const word = /\b(one|two|three|four|five|six|seven|eight)\b/i.exec(query)?.[1]?.toLowerCase();
  return Math.min(word ? words[word] ?? 5 : 5, available);
}

function liveSearchOnlyResult(
  query: string,
  search: Awaited<ReturnType<typeof searchPublicWeb>>,
  provider: Provider,
): ChatResult {
  const limit = requestedResultLimit(query, search.results.length);
  const items = search.results.slice(0, limit).map((item, index) => {
    const snippet = item.snippet?.trim();
    return `${index + 1}. [${item.title}](${item.url})${snippet ? `\n   ${snippet}` : ""}`;
  });
  return {
    text:
      `### Live discovery results\n\n` +
      `The AI model provider is temporarily unavailable, so PalladiumAI completed this read-only request directly from live web-search evidence. ` +
      `These are search results to compare, not a booking or purchase.\n\n${items.join("\n\n")}`,
    toolCalls: [],
    usage: { input: 0, output: 0 },
    provider,
    model: "live-search-evidence",
  };
}

async function tryProviderModels(args: RunArgs, provider: Provider, model: string) {
  let lastError: unknown;
  for (const candidate of modelCandidates(provider, model)) {
    try {
      return await base.runChat({ ...args, provider, model: candidate });
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
      lastError = error;
      if (error instanceof base.ProviderError && error.status === 429) markRateLimited(provider);
      // Preserve existing Groq behaviour: a provider-level 429 fails over to
      // another provider immediately. For OpenAI, a model-specific 429 gets
      // one bounded alternate-model attempt before cross-provider failover.
      const canTryAnotherModel =
        error instanceof base.ProviderError &&
        error.retryable &&
        (error.status >= 500 || (provider === "openai" && error.status === 429));
      if (!canTryAnotherModel) break;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new base.ProviderError("Model call failed.", 500, false);
}

async function rescueAuthorizedWebSearch(args: RunArgs, primaryProvider: Provider, primaryModel: string) {
  if (!args.tools?.some((tool) => tool.name === "web_search")) return null;
  const query = latestUserQuery(args.messages);
  if (!query) return null;

  let search: Awaited<ReturnType<typeof searchPublicWeb>>;
  try {
    search = await searchPublicWeb(query, 8, args.signal);
  } catch {
    return null;
  }
  if (!search.results.length) return null;

  const evidence = search.results
    .map((item, index) => `${index + 1}. ${item.title}\n${item.url}\n${item.snippet ?? ""}`)
    .join("\n\n")
    .slice(0, 12000);
  const messages: ChatMessage[] = [
    ...args.messages,
    {
      role: "system",
      content:
        `A server-authorised live web search was completed for the operator's request. Use the sources below as evidence. ` +
        `Do not invent prices, availability, ratings, addresses or facts that are not supported by these results. ` +
        `If the results are insufficient, say what could not be verified.\n\n${evidence}`,
    },
  ];

  for (const provider of fallbackOrder(primaryProvider)) {
    const model = provider === primaryProvider ? primaryModel : base.resolveModel(provider, null);
    try {
      const result = await tryProviderModels({ ...args, messages, tools: [] }, provider, model);
      activeProviderByConversation.set(args.messages, {
        provider: result.provider,
        model: result.model,
      });
      return result;
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
    }
  }

  return liveSearchOnlyResult(query, search, primaryProvider);
}

/**
 * Non-streaming model calls get bounded cross-provider failover.
 *
 * Each underlying provider owns its retry/backoff policy. Rate-limited
 * providers are temporarily cooled down. OpenAI gets one bounded alternate-
 * model attempt for a retryable 429; Groq retains its alternate-model retry on
 * retryable 5xx errors. Cancellation is never retried or failed over.
 *
 * If every configured provider rejects an already-authorised `web_search` tool
 * call before it can execute, the gateway performs the same safe public search
 * server-side and retries without tools using the live sources as evidence. If
 * model providers are still unavailable after that search, the gateway returns
 * the live search evidence directly so a read-only discovery task can complete
 * without bypassing tool authorisation or inventing facts.
 */
export async function runChat(args: RunArgs): Promise<ChatResult> {
  const remembered = activeProviderByConversation.get(args.messages);
  const primaryProvider = remembered?.provider ?? args.provider;
  const primaryModel = remembered?.model ?? args.model;
  let lastError: unknown;

  for (const provider of fallbackOrder(primaryProvider)) {
    const model = provider === primaryProvider ? primaryModel : base.resolveModel(provider, null);
    try {
      const result = await tryProviderModels(args, provider, model);
      activeProviderByConversation.set(args.messages, {
        provider: result.provider,
        model: result.model,
      });
      return result;
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
      if (error instanceof base.ProviderError && error.status === 429) markRateLimited(provider);
      lastError = error;
    }
  }

  const rescued = await rescueAuthorizedWebSearch(args, primaryProvider, primaryModel);
  if (rescued) return rescued;

  throw lastError instanceof Error
    ? lastError
    : new base.ProviderError("No configured AI provider could complete the request.", 503, false);
}
