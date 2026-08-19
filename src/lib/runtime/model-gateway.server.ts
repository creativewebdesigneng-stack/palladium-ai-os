import { searchPublicWeb } from "@/lib/ai/web-access.server";
import * as base from "./model-gateway.base";
import type { ChatMessage, ChatResult, Provider, RunArgs } from "./model-gateway.base";

export * from "./model-gateway.base";

type ActiveProvider = { provider: Provider; model: string };

const GROQ_MODEL_FALLBACK = "openai/gpt-oss-20b";

// A single personal/runtime conversation reuses the same messages array across
// tool rounds. Remember a successful fallback for that array so a provider that
// has already failed is not retried on every subsequent model turn.
const activeProviderByConversation = new WeakMap<ChatMessage[], ActiveProvider>();

function providerConfigured(provider: Provider): boolean {
  if (provider === "groq") return Boolean(process.env["GROQ_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  if (provider === "anthropic") return Boolean(process.env["ANTHROPIC_API_KEY"]);
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

function fallbackOrder(primary: Provider): Provider[] {
  const ordered: Provider[] = [primary, "groq", "openai", "lovable", "anthropic", "compatible"];
  return ordered.filter(
    (provider, index) =>
      ordered.indexOf(provider) === index && (provider === primary || providerConfigured(provider)),
  );
}

function modelCandidates(provider: Provider, model: string): string[] {
  if (provider !== "groq") return [model];
  const candidates = [model];
  if (model !== GROQ_MODEL_FALLBACK) candidates.push(GROQ_MODEL_FALLBACK);
  return candidates;
}

function latestUserQuery(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && message.content.trim()) return message.content.trim().slice(0, 300);
  }
  return "";
}

async function tryProviderModels(args: RunArgs, provider: Provider, model: string) {
  let lastError: unknown;
  for (const candidate of modelCandidates(provider, model)) {
    try {
      return await base.runChat({ ...args, provider, model: candidate });
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
      lastError = error;
      if (!(error instanceof base.ProviderError) || !error.retryable || error.status < 500) break;
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
  return null;
}

/**
 * Non-streaming model calls get bounded cross-provider failover.
 *
 * Each underlying provider still owns its normal retry/backoff policy. Only
 * after that provider has definitively failed do we move to another configured
 * provider. Groq additionally gets a bounded model fallback from its configured
 * model to the production GPT-OSS 20B model on retryable 5xx failures.
 * Cancellation is never retried or failed over.
 *
 * If every configured provider rejects an already-authorised `web_search` tool
 * call before it can execute, the gateway performs the same safe public search
 * server-side and retries once without tools using the live sources as evidence.
 * This keeps research useful across provider-specific tool-call incompatibilities
 * without granting any tool that the caller did not already authorise.
 */
export async function runChat(args: RunArgs): Promise<ChatResult> {
  const remembered = activeProviderByConversation.get(args.messages);
  const primaryProvider = remembered?.provider ?? args.provider;
  const primaryModel = remembered?.model ?? args.model;
  let lastError: unknown;

  for (const provider of fallbackOrder(primaryProvider)) {
    const model =
      provider === primaryProvider
        ? primaryModel
        : base.resolveModel(provider, null);
    try {
      const result = await tryProviderModels(args, provider, model);
      activeProviderByConversation.set(args.messages, {
        provider: result.provider,
        model: result.model,
      });
      return result;
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
      lastError = error;
    }
  }

  const rescued = await rescueAuthorizedWebSearch(args, primaryProvider, primaryModel);
  if (rescued) return rescued;

  throw lastError instanceof Error
    ? lastError
    : new base.ProviderError("No configured AI provider could complete the request.", 503, false);
}
